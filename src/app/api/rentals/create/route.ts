import { NextResponse } from "next/server";
import { supabase, verifyUserNotSuspended } from "@/lib/supabaseClient";
import { stripe } from "@/lib/stripe";
import { paynote } from "@/lib/paynote";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Token absent." },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Session invalide." },
        { status: 401 }
      );
    }

    // Check user suspension status
    const isNotSuspended = await verifyUserNotSuspended(user.id);
    if (!isNotSuspended) {
      return NextResponse.json(
        { success: false, message: "Votre compte a été suspendu par l’administrateur." },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      artwork_id,
      duration_months,
      shipping_address,
      payment_method,
      mobile_money_provider,
      mobile_money_phone,
      exhibition_id,
    } = body;

    // Validate params
    if (!artwork_id || !duration_months || !shipping_address) {
      return NextResponse.json(
        { success: false, message: "Paramètres requis manquants." },
        { status: 400 }
      );
    }

    if (![1, 3, 6].includes(Number(duration_months))) {
      return NextResponse.json(
        { success: false, message: "Durée de location invalide (doit être 1, 3 ou 6 mois)." },
        { status: 400 }
      );
    }

    // 3. Fetch artwork and check eligibility
    const { data: artwork, error: artworkError } = await supabase
      .from("artworks")
      .select("*")
      .eq("id", artwork_id)
      .single();

    if (artworkError || !artwork) {
      return NextResponse.json(
        { success: false, message: "Œuvre d’art introuvable." },
        { status: 404 }
      );
    }

    if (artwork.status !== "published") {
      return NextResponse.json(
        { success: false, message: "Cette œuvre n'est pas disponible pour le moment." },
        { status: 400 }
      );
    }

    if (!artwork.is_rental_available) {
      return NextResponse.json(
        { success: false, message: "Cette œuvre n'est pas disponible à la location." },
        { status: 400 }
      );
    }

    // Calculate rate
    const monthlyRate = artwork.rental_price_per_month 
      ? Number(artwork.rental_price_per_month) 
      : Math.round(Number(artwork.price) * 0.08);

    // Shipping fee
    const shippingFee = (shipping_address.city === "Douala" || shipping_address.city === "Yaoundé") ? 5000 : 15000;
    const firstMonthTotal = monthlyRate + shippingFee;

    // 4. Create Rental Contract
    const startDate = new Date();
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .insert({
        buyer_id: user.id,
        artwork_id: artwork_id,
        start_date: startDate.toISOString(),
        duration_months: Number(duration_months),
        monthly_rate: monthlyRate,
        status: "active",
        exhibition_id: exhibition_id || null,
      })
      .select()
      .single();

    if (rentalError || !rental) {
      throw new Error(`Erreur lors de la création du contrat : ${rentalError?.message}`);
    }

    // 5. Generate Payment Schedule (First month payment is pending until webhook confirmation)
    const paymentSchedules = [];
    for (let i = 0; i < Number(duration_months); i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i);

      paymentSchedules.push({
        rental_id: rental.id,
        amount: monthlyRate,
        due_date: dueDate.toISOString(),
        payment_status: "pending",
        paid_at: null,
      });
    }

    const { error: paymentsError } = await supabase
      .from("rental_payments")
      .insert(paymentSchedules);

    if (paymentsError) {
      throw new Error(`Erreur de génération des échéances : ${paymentsError.message}`);
    }

    // Update Artwork Status to sold immediately to lock it
    await supabase
      .from("artworks")
      .update({ status: "sold" })
      .eq("id", artwork_id);

    let checkoutUrl: string | null = null;
    let paynoteRef: string | null = null;

    // 6. Handle Payment Integration
    if (payment_method === "card") {
      const origin = request.headers.get("origin") || "http://localhost:3000";

      if (stripe) {
        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "xof",
                product_data: {
                  name: `Location (1er loyer) - ${artwork.title}`,
                  description: `Location d'œuvre d'art unique sur SANKOFA (Durée: ${duration_months} mois)`,
                  images: artwork.photos?.[0] ? [artwork.photos[0]] : [],
                },
                unit_amount: firstMonthTotal,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${origin}/checkout/success?rentalId=${rental.id}`,
          cancel_url: `${origin}/checkout?cancelled=true`,
          metadata: {
            rental_id: rental.id,
          },
        });
        checkoutUrl = session.url;
      } else {
        // Mock Stripe Checkout URL
        checkoutUrl = `/checkout/stripe-mock?rentalId=${rental.id}`;
      }
    } else if (payment_method === "mobile_money") {
      // Initiate Paynote Mobile Money Payment
      const paynoteRes = await paynote.initiatePayment({
        amount: firstMonthTotal,
        phone: mobile_money_phone || "",
        provider: mobile_money_provider || "orange",
        description: `1er loyer location: ${artwork.title}`,
        orderId: rental.id,
      });

      paynoteRef = paynoteRes.transaction_ref;
    }

    // 7. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: "RENTAL_CREATED",
      details: {
        rental_id: rental.id,
        artwork_id: artwork_id,
        duration_months: duration_months,
        monthly_rate: monthlyRate,
        payment_method,
        paynote_ref: paynoteRef,
      },
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: payment_method === "card"
        ? "Session de paiement par carte initialisée."
        : "Requête Mobile Money de débit initiée. Veuillez valider le Push sur votre téléphone.",
      rental,
      checkoutUrl,
      paynoteRef,
    });
  } catch (error: any) {
    console.error("Error creating rental:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

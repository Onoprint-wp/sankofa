import { NextResponse } from "next/server";
import { supabase, verifyUserNotSuspended } from "@/lib/supabaseClient";
import { checkoutSchema } from "@/lib/validations";
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

    // 2. Validate request body
    const body = await request.json();
    const parseResult = checkoutSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Données de commande invalides", 
          errors: parseResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { artwork_id, shipping_address, payment_method, mobile_money_provider, mobile_money_phone, exhibition_id } = parseResult.data;

    // 3. Fetch artwork and check availability
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
        { success: false, message: "Cette œuvre n'est pas disponible à la vente." },
        { status: 400 }
      );
    }

    // 4. Calculate shipping fee and total amount
    const shippingFee = (shipping_address.city === "Douala" || shipping_address.city === "Yaoundé") ? 5000 : 15000;
    const totalAmount = Number(artwork.price) + shippingFee;

    // 5. Create Order with escrow_status = 'none' (pending payment)
    const addressWithShipping = {
      ...shipping_address,
      shipping_fee: shippingFee,
      payment_method,
      mobile_money_provider: mobile_money_provider || null,
      mobile_money_phone: mobile_money_phone || null,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        artwork_id: artwork_id,
        amount: totalAmount,
        escrow_status: "none", // 'none' represents pending payment in our flow
        delivery_status: "pending",
        shipping_address: addressWithShipping,
        exhibition_id: exhibition_id || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw orderError || new Error("Impossible de créer la commande.");
    }

    // Set artwork status to sold immediately to lock it
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
                  name: artwork.title,
                  description: `Acquisition d'œuvre d'art unique sur SANKOFA`,
                  images: artwork.photos?.[0] ? [artwork.photos[0]] : [],
                },
                unit_amount: totalAmount,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${origin}/checkout/success?orderId=${order.id}`,
          cancel_url: `${origin}/checkout?cancelled=true`,
          metadata: {
            order_id: order.id,
          },
        });
        checkoutUrl = session.url;
      } else {
        // Mock Stripe Checkout URL
        checkoutUrl = `/checkout/stripe-mock?orderId=${order.id}`;
      }
    } else if (payment_method === "mobile_money") {
      // Initiate Paynote Mobile Money Payment
      const paynoteRes = await paynote.initiatePayment({
        amount: totalAmount,
        phone: mobile_money_phone || "",
        provider: mobile_money_provider || "orange",
        description: `Achat oeuvre: ${artwork.title}`,
        orderId: order.id,
      });

      paynoteRef = paynoteRes.transaction_ref;
    }

    // 7. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: "ORDER_CREATED",
      details: {
        order_id: order.id,
        artwork_id,
        amount: totalAmount,
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
      order,
      checkoutUrl,
      paynoteRef,
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

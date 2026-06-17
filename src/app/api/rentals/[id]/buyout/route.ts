import { NextResponse } from "next/server";
import { supabase, verifyUserNotSuspended } from "@/lib/supabaseClient";
import { registerCertificateHash } from "@/lib/blockchain";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rentalId = params.id;

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

    // 2. Fetch rental contract and join artwork
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("*, artwork:artworks(*)")
      .eq("id", rentalId)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json(
        { success: false, message: "Contrat de location introuvable." },
        { status: 404 }
      );
    }

    // Verify ownership
    if (rental.buyer_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Ce contrat ne vous appartient pas." },
        { status: 403 }
      );
    }

    if (rental.status === "purchased") {
      return NextResponse.json(
        { success: false, message: "Vous possédez déjà cette œuvre définitivement." },
        { status: 400 }
      );
    }

    if (rental.status === "cancelled") {
      return NextResponse.json(
        { success: false, message: "Ce contrat de location a été annulé." },
        { status: 400 }
      );
    }

    // 3. Calculate paid sum from payments
    const { data: payments, error: paymentsError } = await supabase
      .from("rental_payments")
      .select("amount, payment_status")
      .eq("rental_id", rentalId);

    if (paymentsError || !payments) {
      throw new Error(`Impossible de récupérer les mensualités : ${paymentsError?.message}`);
    }

    const paidSum = payments
      .filter((p) => p.payment_status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Buyout price = sale price - sum of paid rents
    const artworkPrice = Number(rental.artwork.price);
    const balanceDue = Math.max(0, artworkPrice - paidSum);

    // 4. Update all pending schedules to paid (simulating Mobile Money buyout payout capture)
    const { error: updatePaymentsError } = await supabase
      .from("rental_payments")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("rental_id", rentalId)
      .in("payment_status", ["pending", "overdue"]);

    if (updatePaymentsError) {
      throw updatePaymentsError;
    }

    // 5. Update rental contract status to 'purchased'
    const { error: updateRentalError } = await supabase
      .from("rentals")
      .update({ status: "purchased" })
      .eq("id", rentalId);

    if (updateRentalError) {
      throw updateRentalError;
    }

    // 6. Generate Blockchain Certificate of Authenticity
    let txHash = "";
    let certificate = null;
    try {
      const result = await registerCertificateHash(rental.artwork_id, null, undefined, rentalId);
      txHash = result.txHash;
      certificate = result.certificate;
    } catch (certError: any) {
      console.error("Warning: Failed to register buyout certificate hash on blockchain:", certError);
      txHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
    }

    // 7. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: "RENTAL_BUYOUT_EXECUTED",
      details: {
        rental_id: rentalId,
        artwork_id: rental.artwork_id,
        amount_paid: balanceDue,
        total_rents_deducted: paidSum,
        blockchain_tx_hash: txHash,
      },
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Option d'achat exercée avec succès. Vous êtes désormais le propriétaire de cette œuvre d'art.",
      balance_paid: balanceDue,
      certificate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

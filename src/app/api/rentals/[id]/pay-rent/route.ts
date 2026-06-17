import { NextResponse } from "next/server";
import { supabase, verifyUserNotSuspended } from "@/lib/supabaseClient";

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

    // 2. Parse body for payment_id
    const body = await request.json();
    const { payment_id } = body;

    if (!payment_id) {
      return NextResponse.json(
        { success: false, message: "Identifiant du paiement requis." },
        { status: 400 }
      );
    }

    // 3. Fetch rental payment and check auth
    const { data: payment, error: paymentError } = await supabase
      .from("rental_payments")
      .select("*, rentals(*)")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, message: "Échéance introuvable." },
        { status: 404 }
      );
    }

    // Verify ownership
    const rentalData = payment.rentals;
    if (!rentalData || rentalData.buyer_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Ce contrat ne vous appartient pas." },
        { status: 403 }
      );
    }

    if (payment.payment_status === "paid") {
      return NextResponse.json(
        { success: false, message: "Cette échéance a déjà été réglée." },
        { status: 400 }
      );
    }

    // 4. Update payment status to paid
    const { data: updatedPayment, error: updateError } = await supabase
      .from("rental_payments")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 5. Check if all payments are now paid, if so, update rental status to completed
    const { data: allPayments, error: countError } = await supabase
      .from("rental_payments")
      .select("payment_status")
      .eq("rental_id", rentalId);

    if (!countError && allPayments) {
      const hasPending = allPayments.some(p => p.payment_status === "pending" || p.payment_status === "overdue");
      if (!hasPending) {
        await supabase
          .from("rentals")
          .update({ status: "completed" })
          .eq("id", rentalId);
      }
    }

    // 6. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: "RENTAL_PAYMENT_PAID",
      details: {
        rental_id: rentalId,
        payment_id: payment_id,
        amount: payment.amount,
      },
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Mensualité réglée avec succès.",
      payment: updatedPayment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

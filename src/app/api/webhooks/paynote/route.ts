import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const event = payload.event || payload.eventType;
    const data = payload.data || payload;

    console.log(`[Paynote Webhook] Received event: ${event}`, data);

    // Validate token/secret if configured in environment
    const paynoteSecret = process.env.PAYNOTE_WEBHOOK_SECRET;
    if (paynoteSecret) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${paynoteSecret}`) {
        return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
      }
    }

    if (event === "transaction.success" || data.status === "success") {
      const reference = data.external_reference; // order_id or rental_id
      const transRef = data.transaction_ref || data.id || "PN-UNKNOWN";

      if (!reference) {
        return NextResponse.json({ success: false, message: "Missing external_reference" }, { status: 400 });
      }

      // Check if reference is an order ID
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("id", reference)
        .maybeSingle();

      if (order) {
        console.log(`[Paynote Webhook] Fulfilling order payment: ${order.id}`);

        // Update order status to paid (funds held in escrow)
        const { error: orderErr } = await supabase
          .from("orders")
          .update({ escrow_status: "held" })
          .eq("id", order.id);

        if (orderErr) {
          console.error("[Paynote Webhook Error] Failed to update order status:", orderErr.message);
        }

        // Mark artwork as sold
        await supabase
          .from("artworks")
          .update({ status: "sold" })
          .eq("id", order.artwork_id);

        // Insert Escrow Transaction
        const { error: escrowErr } = await supabase
          .from("escrow_transactions")
          .insert({
            order_id: order.id,
            amount: order.amount,
            status: "held",
            paynote_ref: transRef,
          });

        if (escrowErr) {
          console.error("[Paynote Webhook Error] Failed to insert escrow transaction:", escrowErr.message);
        }

        // Write Audit Log
        await supabase.from("audit_logs").insert({
          action: "PAYMENT_CONFIRMED_PAYNOTE",
          details: { order_id: order.id, paynote_ref: transRef, amount: order.amount },
          ip_address: "127.0.0.1",
        });

      } else {
        // Check if reference is a rental ID
        const { data: rental } = await supabase
          .from("rentals")
          .select("*")
          .eq("id", reference)
          .maybeSingle();

        if (rental) {
          console.log(`[Paynote Webhook] Fulfilling rental payment: ${rental.id}`);

          // Update rental status to active
          await supabase
            .from("rentals")
            .update({ status: "active" })
            .eq("id", rental.id);

          // Mark artwork as sold
          await supabase
            .from("artworks")
            .update({ status: "sold" })
            .eq("id", rental.artwork_id);

          // Mark the first month payment as paid
          const { error: paymentErr } = await supabase
            .from("rental_payments")
            .update({
              payment_status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("rental_id", rental.id)
            .eq("payment_status", "pending")
            .limit(1);

          if (paymentErr) {
            console.error("[Paynote Webhook Error] Failed to update rental payment:", paymentErr.message);
          }

          // Write Audit Log
          await supabase.from("audit_logs").insert({
            action: "RENTAL_CONFIRMED_PAYNOTE",
            details: { rental_id: rental.id, paynote_ref: transRef },
            ip_address: "127.0.0.1",
          });
        } else {
          console.warn(`[Paynote Webhook Warning] Reference ${reference} does not match any order or rental.`);
          return NextResponse.json({ success: false, message: "Reference not found" }, { status: 404 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Paynote webhook execution failed:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

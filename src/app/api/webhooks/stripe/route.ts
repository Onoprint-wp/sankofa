import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") || "";

  let event: any;

  // 1. Verify Stripe Webhook Signature (if webhook secret is set)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (stripe && webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`[Stripe Webhook Error] Signature verification failed: ${err.message}`);
      return NextResponse.json({ success: false, message: `Webhook Error: ${err.message}` }, { status: 400 });
    }
  } else {
    // Sandbox / Mock fallback mode
    try {
      console.log("[Stripe Webhook Sandbox] Unverified raw webhook request received.");
      event = JSON.parse(body);
    } catch (err: any) {
      return NextResponse.json({ success: false, message: "Invalid JSON payload" }, { status: 400 });
    }
  }

  // 2. Handle relevant event types
  const eventType = event.type || event.eventType;
  const session = event.data?.object || event;

  console.log(`[Stripe Webhook] Processing event type: ${eventType}`);

  if (eventType === "checkout.session.completed" || eventType === "payment_intent.succeeded") {
    // Extract metadata
    const metadata = session.metadata || {};
    const orderId = metadata.order_id;
    const rentalId = metadata.rental_id;

    if (orderId) {
      console.log(`[Stripe Webhook] Fulfilling order payment: ${orderId}`);
      
      // Update Order escrow_status to 'held'
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .update({ escrow_status: "held" })
        .eq("id", orderId)
        .select()
        .single();

      if (orderErr || !order) {
        console.error(`[Stripe Webhook Error] Failed to update order status: ${orderErr?.message}`);
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }

      // Mark artwork as sold
      await supabase
        .from("artworks")
        .update({ status: "sold" })
        .eq("id", order.artwork_id);

      // Create Escrow Transaction record
      const payref = session.id || session.payment_intent || `ST-MOCK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { error: escrowErr } = await supabase
        .from("escrow_transactions")
        .insert({
          order_id: orderId,
          amount: order.amount,
          status: "held",
          paynote_ref: payref,
        });

      if (escrowErr) {
        console.error(`[Stripe Webhook Error] Failed to create escrow transaction: ${escrowErr.message}`);
      }

      // Write Audit Log
      await supabase.from("audit_logs").insert({
        action: "PAYMENT_CONFIRMED_STRIPE",
        details: { order_id: orderId, session_id: payref, amount: order.amount },
        ip_address: "127.0.0.1",
      });
      
    } else if (rentalId) {
      console.log(`[Stripe Webhook] Fulfilling rental buyout/payment: ${rentalId}`);
      
      // Update rental status to active
      const { data: rental, error: rentalErr } = await supabase
        .from("rentals")
        .update({ status: "active" })
        .eq("id", rentalId)
        .select()
        .single();

      if (rentalErr || !rental) {
        console.error(`[Stripe Webhook Error] Failed to update rental: ${rentalErr?.message}`);
        return NextResponse.json({ success: false, message: "Rental not found" }, { status: 404 });
      }

      // Mark artwork as sold
      await supabase
        .from("artworks")
        .update({ status: "sold" })
        .eq("id", rental.artwork_id);

      // Mark first month payment as paid
      const { error: paymentErr } = await supabase
        .from("rental_payments")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("rental_id", rentalId)
        .eq("payment_status", "pending")
        .limit(1); // the first month payment

      if (paymentErr) {
        console.error(`[Stripe Webhook Error] Failed to update first rental payment: ${paymentErr.message}`);
      }

      // Write Audit Log
      await supabase.from("audit_logs").insert({
        action: "RENTAL_CONFIRMED_STRIPE",
        details: { rental_id: rentalId },
        ip_address: "127.0.0.1",
      });
    } else {
      console.warn("[Stripe Webhook Warning] No metadata order_id or rental_id found in event.");
    }
  }

  return NextResponse.json({ success: true, received: true });
}

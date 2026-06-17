import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    const rentalId = url.searchParams.get("rentalId");

    const mockSessionId = `cs_test_${Math.random().toString(36).substring(2, 10)}`;

    // Build mock Stripe event payload
    const payload = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: mockSessionId,
          payment_intent: `pi_test_${Math.random().toString(36).substring(2, 10)}`,
          metadata: {
            order_id: orderId || undefined,
            rental_id: rentalId || undefined,
          },
        },
      },
    };

    // Call local webhook route
    const localUrl = `${url.protocol}//${url.host}/api/webhooks/stripe`;
    const response = await fetch(localUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No Stripe-signature here since we are in sandbox/simulation mode
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "La simulation de webhook Stripe a échoué.");
    }

    return NextResponse.json({
      success: true,
      message: "Simulation de webhook Stripe déclenchée avec succès.",
      payload,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

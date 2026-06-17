import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    const rentalId = url.searchParams.get("rentalId");
    const provider = url.searchParams.get("provider") || "orange";
    const phone = url.searchParams.get("phone") || "+237677000000";

    const reference = orderId || rentalId;
    if (!reference) {
      return NextResponse.json({ success: false, message: "orderId ou rentalId manquant." }, { status: 400 });
    }

    const mockTransId = `PN-TX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Build Mock Paynote Webhook Payload
    const payload = {
      event: "transaction.success",
      data: {
        id: mockTransId,
        transaction_ref: mockTransId,
        external_reference: reference,
        amount: 250000, // mock amount
        status: "success",
        phone,
        provider,
      },
    };

    // Call local paynote webhook route
    const localUrl = `${url.protocol}//${url.host}/api/webhooks/paynote`;
    const response = await fetch(localUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Bypassing Authorization bearer header checks for simulation
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "La simulation de webhook Paynote a échoué.");
    }

    return NextResponse.json({
      success: true,
      message: "Simulation de webhook Paynote déclenchée avec succès.",
      payload,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

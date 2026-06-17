import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

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

    // 2. Authorize: check if user is an admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.id)
      .single();

    if (profile?.is_suspended) {
      return NextResponse.json(
        { success: false, message: "Votre compte a été suspendu par l’administrateur." },
        { status: 403 }
      );
    }

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Privilèges d'administration requis." },
        { status: 403 }
      );
    }

    // 3. Parse and validate body parameters
    const body = await request.json();
    const { litigation_id, resolution } = body; // resolution: 'refund' or 'payout'

    if (!litigation_id || !["refund", "payout"].includes(resolution)) {
      return NextResponse.json(
        { success: false, message: "Paramètres 'litigation_id' et 'resolution' ('refund' ou 'payout') invalides." },
        { status: 400 }
      );
    }

    // 4. Fetch litigation details
    const { data: litigation, error: litigationError } = await supabase
      .from("litigations")
      .select("*")
      .eq("id", litigation_id)
      .single();

    if (litigationError || !litigation) {
      return NextResponse.json(
        { success: false, message: "Litige introuvable." },
        { status: 404 }
      );
    }

    if (litigation.status === "resolved" || litigation.status === "closed") {
      return NextResponse.json(
        { success: false, message: "Ce litige a déjà été résolu ou clôturé." },
        { status: 400 }
      );
    }

    const orderId = litigation.order_id;
    const nowStr = new Date().toISOString();

    if (resolution === "refund") {
      // 5. Refund Buyer: escrow_status = 'refunded', delivery_status = 'returned'
      const { error: orderUpdateErr } = await supabase
        .from("orders")
        .update({ escrow_status: "refunded", delivery_status: "returned" })
        .eq("id", orderId);

      if (orderUpdateErr) throw orderUpdateErr;

      const { error: escrowUpdateErr } = await supabase
        .from("escrow_transactions")
        .update({ status: "refunded", refunded_at: nowStr })
        .eq("order_id", orderId);

      if (escrowUpdateErr) console.error("Warning: Failed to update escrow txn:", escrowUpdateErr);
    } else {
      // 6. Payout Artist: escrow_status = 'released', delivery_status = 'delivered'
      const { error: orderUpdateErr } = await supabase
        .from("orders")
        .update({ escrow_status: "released", delivery_status: "delivered" })
        .eq("id", orderId);

      if (orderUpdateErr) throw orderUpdateErr;

      const { error: escrowUpdateErr } = await supabase
        .from("escrow_transactions")
        .update({ status: "released", released_at: nowStr })
        .eq("order_id", orderId);

      if (escrowUpdateErr) console.error("Warning: Failed to update escrow txn:", escrowUpdateErr);
    }

    // 7. Update litigation status
    const { error: litigationUpdateErr } = await supabase
      .from("litigations")
      .update({
        status: "resolved",
        resolution,
        resolved_at: nowStr,
      })
      .eq("id", litigation_id);

    if (litigationUpdateErr) throw litigationUpdateErr;

    // 8. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: `LITIGATION_RESOLVED_${resolution.toUpperCase()}`,
      details: { litigation_id, order_id: orderId, resolution },
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `Le litige a été résolu. Arbitrage rendu : ${resolution === "refund" ? "Remboursement de l'acheteur" : "Paiement de l'artiste"}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

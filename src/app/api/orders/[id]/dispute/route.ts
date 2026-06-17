import { NextResponse } from "next/server";
import { supabase, verifyUserNotSuspended } from "@/lib/supabaseClient";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

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

    // 2. Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: "Commande introuvable." },
        { status: 404 }
      );
    }

    // 3. Authorize: check if user is the buyer
    if (order.buyer_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Vous n'êtes pas l'acheteur de cette commande." },
        { status: 403 }
      );
    }

    if (order.delivery_status === "disputed") {
      return NextResponse.json(
        { success: false, message: "Un litige est déjà ouvert pour cette commande." },
        { status: 400 }
      );
    }

    // 4. Validate body
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, message: "Le motif du litige est requis et doit contenir au moins 10 caractères." },
        { status: 400 }
      );
    }

    // 5. Update order: delivery_status = 'disputed'
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ delivery_status: "disputed" })
      .eq("id", orderId);

    if (updateOrderError) {
      throw updateOrderError;
    }

    // 6. Create Litigation in database
    const { error: litigationError } = await supabase
      .from("litigations")
      .insert({
        order_id: orderId,
        requester_id: user.id,
        reason: reason.trim(),
        status: "opened",
      });

    if (litigationError) {
      throw litigationError;
    }

    // 7. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: "ORDER_DISPUTE_OPENED",
      details: { order_id: orderId, reason: reason.trim() },
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Litige signalé avec succès. Les fonds sous séquestre restent bloqués et notre équipe de support va analyser votre demande sous 24h.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

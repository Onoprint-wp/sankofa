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

    // 2. Fetch order and join artwork details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, artworks(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: "Commande introuvable." },
        { status: 404 }
      );
    }

    // 3. Authorize: check if user is the artist who created the artwork
    // The artworks table has artist_id
    const artwork = order.artworks;
    if (!artwork || artwork.artist_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Vous n'êtes pas le créateur de cette œuvre." },
        { status: 403 }
      );
    }

    if (order.delivery_status !== "pending") {
      return NextResponse.json(
        { success: false, message: `Impossible d'expédier une commande dont le statut est '${order.delivery_status}'.` },
        { status: 400 }
      );
    }

    // 4. Validate body parameters (carrier tracking details)
    const body = await request.json();
    const { carrier, tracking_number } = body;

    if (!carrier || !tracking_number) {
      return NextResponse.json(
        { success: false, message: "Le transporteur et le numéro de suivi sont requis." },
        { status: 400 }
      );
    }

    // 5. Update order delivery status and tracking metadata
    const updatedAddress = {
      ...(order.shipping_address as object),
      carrier,
      tracking_number,
      shipped_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        delivery_status: "shipped",
        shipping_address: updatedAddress,
      })
      .eq("id", orderId);

    if (updateError) {
      throw updateError;
    }

    // 6. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: "ORDER_SHIPPED",
      details: { order_id: orderId, carrier, tracking_number },
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Expédition confirmée avec succès. L'acheteur a été notifié.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { carrierUpdateSchema } from "@/lib/validations";

export const revalidate = 0;

const CARRIER_SECRET_KEY = process.env.CARRIER_SECRET_KEY || "carrier-secret-key-123";

export async function POST(request: Request) {
  try {
    // 1. Authenticate (Session token OR Carrier Secret API Key)
    let isAuthorized = false;
    let userId: string | null = null;

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (token) {
      if (token === CARRIER_SECRET_KEY) {
        isAuthorized = true;
      } else {
        // Check if token is a valid Supabase user token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          userId = user.id;
          // Check user role
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (profile?.role === "admin" || profile?.role === "curator") {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Clé d’API ou session invalide." },
        { status: 401 }
      );
    }

    // 2. Validate payload
    const body = await request.json();
    const parseResult = carrierUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données de mise à jour invalides.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { tracking_number, status, location, description } = parseResult.data;

    // 3. Find order by tracking number inside shipping_address JSONB
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("shipping_address->>tracking_number", tracking_number)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: `Commande avec le numéro de suivi '${tracking_number}' introuvable.` },
        { status: 404 }
      );
    }

    // 4. Insert milestone
    const { error: milestoneError } = await supabase
      .from("delivery_milestones")
      .insert({
        order_id: order.id,
        status,
        location,
        description,
      });

    if (milestoneError) {
      throw milestoneError;
    }

    // 5. Update order delivery status
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({ delivery_status: status })
      .eq("id", order.id);

    if (orderUpdateError) {
      throw orderUpdateError;
    }

    // 6. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: userId, // Will be null if carrier updated via webhook API key
      action: "SHIPPING_TRANSIT_UPDATE",
      details: {
        order_id: order.id,
        tracking_number,
        status,
        location,
        description,
      },
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Jalon de livraison enregistré et statut de commande mis à jour avec succès.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

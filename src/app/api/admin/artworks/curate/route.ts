import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { artworkReviewSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user from the Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Token absent." },
        { status: 401 }
      );
    }

    // Set auth session on supabase client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Session invalide." },
        { status: 401 }
      );
    }

    // 2. Authorize: check if user is admin or curator
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

    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "curator")) {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Privilèges insuffisants." },
        { status: 403 }
      );
    }

    // 3. Validate body
    const body = await request.json();
    const parseResult = artworkReviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Données de validation incorrectes", 
          errors: parseResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { artwork_id, status, rejection_reason } = parseResult.data;

    // 4. Update artwork record
    const { error: updateError } = await supabase
      .from("artworks")
      .update({
        status: status,
        rejection_reason: status === "refused" ? rejection_reason : null,
      })
      .eq("id", artwork_id);

    if (updateError) {
      throw updateError;
    }

    // 5. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const { error: logError } = await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: `CURATE_ARTWORK_${status.toUpperCase()}`,
      details: { artwork_id, rejection_reason: status === "refused" ? rejection_reason : null },
      ip_address: ipAddress,
    });

    if (logError) {
      console.error("Error writing audit log:", logError);
    }

    return NextResponse.json({
      success: true,
      message: `L’œuvre a été ${status === "published" ? "publiée" : "refusée"} avec succès.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

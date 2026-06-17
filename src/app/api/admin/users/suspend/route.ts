import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { userSuspensionSchema } from "@/lib/validations";

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Session invalide." },
        { status: 401 }
      );
    }

    // 2. Authorize: check if user is admin and not suspended
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Privilèges de l’administrateur requis." },
        { status: 403 }
      );
    }

    if (profile.is_suspended) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Compte suspendu." },
        { status: 403 }
      );
    }

    // 3. Validate body
    const body = await request.json();
    const parseResult = userSuspensionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Données de suspension incorrectes", 
          errors: parseResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { user_id, is_suspended } = parseResult.data;

    // 4. Prevent admin from self-suspension
    if (user_id === user.id) {
      return NextResponse.json(
        { success: false, message: "Vous ne pouvez pas suspendre votre propre compte." },
        { status: 400 }
      );
    }

    // Fetch details of target user
    const { data: targetUser, error: targetError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user_id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { success: false, message: "Utilisateur cible introuvable." },
        { status: 404 }
      );
    }

    // 5. Update user profile suspension status
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_suspended })
      .eq("id", user_id);

    if (updateError) {
      throw updateError;
    }

    // 6. If target is an artist and is suspended, depublish their artworks to draft
    if (is_suspended && targetUser.role === "artist") {
      const { error: artworksError } = await supabase
        .from("artworks")
        .update({ status: "draft" })
        .eq("artist_id", user_id)
        .in("status", ["published", "pending_curation"]);

      if (artworksError) {
        console.error("Error reverting artworks to draft for suspended artist:", artworksError);
      }
    }

    // 7. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const { error: logError } = await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: is_suspended ? "SUSPEND_USER" : "UNSUSPEND_USER",
      details: { target_user_id: user_id, target_role: targetUser.role },
      ip_address: ipAddress,
    });

    if (logError) {
      console.error("Error writing audit log:", logError);
    }

    return NextResponse.json({
      success: true,
      message: `L’utilisateur a été ${is_suspended ? "suspendu" : "réactivé"} avec succès.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

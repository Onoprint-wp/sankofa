import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { exhibitionSchema } from "@/lib/validations";

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

    // 2. Fetch profile to check role
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

    if (profileError || !profile || !["admin", "curator"].includes(profile.role)) {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Seuls les curateurs et les administrateurs peuvent créer des expositions." },
        { status: 403 }
      );
    }

    // 3. Parse and validate body
    const body = await request.json();
    const parseResult = exhibitionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données de l’exposition invalides.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, description, cover_url, artwork_ids } = parseResult.data;

    // 4. Create exhibition
    const { data: exhibition, error: insertError } = await supabase
      .from("exhibitions")
      .insert({
        curator_id: user.id,
        title,
        description,
        cover_url,
      })
      .select()
      .single();

    if (insertError || !exhibition) {
      throw insertError || new Error("Impossible de créer l’exposition.");
    }

    // 5. Create exhibition artworks relationships
    const junctionRecords = artwork_ids.map((artworkId: string) => ({
      exhibition_id: exhibition.id,
      artwork_id: artworkId,
    }));

    const { error: junctionError } = await supabase
      .from("exhibition_artworks")
      .insert(junctionRecords);

    if (junctionError) {
      // Clean up exhibition if junction insert fails
      await supabase.from("exhibitions").delete().eq("id", exhibition.id);
      throw junctionError;
    }

    // 6. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: "EXHIBITION_CREATED",
      details: { exhibition_id: exhibition.id, title, artwork_count: artwork_ids.length },
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Exposition virtuelle créée avec succès.",
      exhibition,
    });
  } catch (error: any) {
    console.error("Error creating exhibition:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

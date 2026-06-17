import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Identifiant du certificat manquant." },
        { status: 400 }
      );
    }

    // Query the certificate using its ID or the associated order ID
    // We fetch details from related artworks, artists, profiles, and orders
    const { data: certificate, error: certError } = await supabase
      .from("certificates")
      .select(`
        *,
        artworks (
          *,
          artists (
            *,
            profiles (*)
          )
        ),
        orders (
          *,
          buyer:profiles (*)
        )
      `)
      .or(`id.eq.${id},order_id.eq.${id}`)
      .maybeSingle();

    if (certError) {
      return NextResponse.json(
        { success: false, message: certError.message },
        { status: 500 }
      );
    }

    if (!certificate) {
      return NextResponse.json(
        { success: false, message: "Certificat d'authenticité introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      certificate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

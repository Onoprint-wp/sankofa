import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { academyQuizSchema } from "@/lib/validations";

const CORRECT_ANSWERS = {
  q1: "C",
  q2: "B",
  q3: "C",
  q4: "B",
  q5: "B"
};

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

    // 2. Authorize: check if user is an artist
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

    if (profileError || !profile || profile.role !== "artist") {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Cette action est réservée aux artistes." },
        { status: 403 }
      );
    }

    // 3. Parse and validate body
    const body = await request.json();
    const parseResult = academyQuizSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Format des réponses invalide.", 
          errors: parseResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const submissions = parseResult.data;

    // 4. Calculate score
    let score = 0;
    if (submissions.q1 === CORRECT_ANSWERS.q1) score++;
    if (submissions.q2 === CORRECT_ANSWERS.q2) score++;
    if (submissions.q3 === CORRECT_ANSWERS.q3) score++;
    if (submissions.q4 === CORRECT_ANSWERS.q4) score++;
    if (submissions.q5 === CORRECT_ANSWERS.q5) score++;

    const isPassed = score >= 4;

    // 5. Update database and write audit logs if passed
    if (isPassed) {
      const { error: updateError } = await supabase
        .from("artists")
        .update({ academy_completed: true })
        .eq("id", user.id);

      if (updateError) {
        throw new Error(`Erreur lors de la validation de la certification : ${updateError.message}`);
      }

      // Write Audit Log
      const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
      await supabase.from("audit_logs").insert({
        admin_id: user.id,
        action: "ARTIST_ACADEMY_CERTIFIED",
        details: { score, passed: true },
        ip_address: ipAddress,
      });

      return NextResponse.json({
        success: true,
        score,
        certified: true,
        message: "Félicitations ! Vous avez réussi le quiz et êtes désormais certifié SANKOFA.",
      });
    } else {
      // Failed - do not update DB but log it
      const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
      await supabase.from("audit_logs").insert({
        admin_id: user.id,
        action: "ARTIST_ACADEMY_FAILED",
        details: { score, passed: false },
        ip_address: ipAddress,
      });

      return NextResponse.json({
        success: false,
        score,
        certified: false,
        message: "Vous n’avez pas obtenu la note minimale requise de 4/5. Veuillez revoir les modules et retenter.",
      });
    }
  } catch (error: any) {
    console.error("Error submitting academy quiz:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabase, verifyUserNotSuspended } from "@/lib/supabaseClient";
import { reviewSchema } from "@/lib/validations";
import { deepseek } from "@/lib/deepseek";

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

    // Check user suspension status
    const isNotSuspended = await verifyUserNotSuspended(user.id);
    if (!isNotSuspended) {
      return NextResponse.json(
        { success: false, message: "Votre compte a été suspendu par l’administrateur." },
        { status: 403 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const parseResult = reviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Format des données de l’avis invalide.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { order_id, rating, comment } = parseResult.data;

    // 3. Fetch order to verify eligibility
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("buyer_id, artwork_id, delivery_status, artworks(artist_id)")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: "Commande introuvable." },
        { status: 404 }
      );
    }

    // 4. Authorize: Check if the user is the buyer of the order
    if (order.buyer_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Vous n’êtes pas l’acheteur de cette commande." },
        { status: 403 }
      );
    }

    // 5. Check order status
    if (order.delivery_status !== "delivered") {
      return NextResponse.json(
        { success: false, message: "Impossible de laisser un avis pour une commande non livrée." },
        { status: 400 }
      );
    }

    // 6. Check if a review already exists for this order
    const { data: existingReview, error: existingReviewError } = await supabase
      .from("reviews")
      .select("id")
      .eq("order_id", order_id)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { success: false, message: "Vous avez déjà soumis un avis pour cette commande." },
        { status: 400 }
      );
    }

    // Extract artist_id from artwork relations
    const artistId = (order.artworks as any)?.artist_id;
    if (!artistId) {
      return NextResponse.json(
        { success: false, message: "Artiste associé introuvable pour cette œuvre." },
        { status: 400 }
      );
    }

    // Moderate review comment
    if (comment) {
      const moderationResult = await deepseek.moderateContent(comment);
      if (moderationResult.isFlagged) {
        return NextResponse.json(
          { success: false, message: `Votre avis contient du contenu inapproprié : ${moderationResult.reason || "modération automatique."}` },
          { status: 400 }
        );
      }
    }

    // 7. Insert the review
    const { error: insertError } = await supabase.from("reviews").insert({
      order_id,
      buyer_id: user.id,
      artist_id: artistId,
      rating,
      comment: comment || null,
      is_approved: false,
    });

    if (insertError) {
      throw insertError;
    }

    // 8. Write Audit Log
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: "REVIEW_SUBMITTED",
      details: { order_id, rating, artist_id: artistId },
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Votre avis a été soumis avec succès et est en cours de modération.",
    });
  } catch (error: any) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

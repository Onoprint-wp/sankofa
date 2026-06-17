import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { reviewModerationSchema } from "@/lib/validations";

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

    // 2. Authorize: Check if the user is an admin or curator
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

    // 3. Parse and validate body
    const body = await request.json();
    const parseResult = reviewModerationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données de modération invalides.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { review_id, action } = parseResult.data;

    // 4. Fetch the review to get artist_id and details
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", review_id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { success: false, message: "Avis introuvable." },
        { status: 404 }
      );
    }

    const artistId = review.artist_id;

    // 5. Apply moderation action
    if (action === "approve") {
      // Approve review
      const { error: approveError } = await supabase
        .from("reviews")
        .update({ is_approved: true })
        .eq("id", review_id);

      if (approveError) {
        throw approveError;
      }

      // Recalculate artist rating average
      await updateArtistAverageRating(artistId);

      // Audit Log
      const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
      await supabase.from("audit_logs").insert({
        admin_id: user.id,
        action: "REVIEW_APPROVED",
        details: { review_id, artist_id: artistId, rating: review.rating },
        ip_address: ipAddress,
      });

      return NextResponse.json({
        success: true,
        message: "L’avis a été approuvé avec succès et est désormais public.",
      });
    } else {
      // Reject (delete review)
      const { error: deleteError } = await supabase
        .from("reviews")
        .delete()
        .eq("id", review_id);

      if (deleteError) {
        throw deleteError;
      }

      // Recalculate artist rating average (in case it was previously approved)
      await updateArtistAverageRating(artistId);

      // Audit Log
      const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
      await supabase.from("audit_logs").insert({
        admin_id: user.id,
        action: "REVIEW_REJECTED",
        details: { review_id, artist_id: artistId },
        ip_address: ipAddress,
      });

      return NextResponse.json({
        success: true,
        message: "L’avis a été rejeté et supprimé de la base de données.",
      });
    }
  } catch (error: any) {
    console.error("Error moderating review:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

/**
 * Recalculates and updates the artist's average rating in the artists table.
 */
async function updateArtistAverageRating(artistId: string) {
  // Fetch all approved reviews for the artist
  const { data: reviews, error: fetchError } = await supabase
    .from("reviews")
    .select("rating")
    .eq("artist_id", artistId)
    .eq("is_approved", true);

  if (fetchError) {
    throw new Error(`Failed to fetch reviews for average calculation: ${fetchError.message}`);
  }

  let ratingAvg = 0.0;
  if (reviews && reviews.length > 0) {
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    ratingAvg = parseFloat((sum / reviews.length).toFixed(2));
  }

  // Update artist record
  const { error: updateError } = await supabase
    .from("artists")
    .update({ rating_avg: ratingAvg })
    .eq("id", artistId);

  if (updateError) {
    throw new Error(`Failed to update artist rating average: ${updateError.message}`);
  }
}

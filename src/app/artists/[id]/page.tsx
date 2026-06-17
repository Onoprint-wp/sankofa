"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabaseClient";
import { 
  Award, 
  Star, 
  MapPin, 
  Image as ImageIcon, 
  MessageSquare, 
  Loader2, 
  ArrowLeft,
  Calendar
} from "lucide-react";
import MarketLayout from "@/components/layout/MarketLayout";

export default function ArtistProfile() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const id = params.id as string;

  const [artist, setArtist] = useState<any>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"artworks" | "reviews">("artworks");

  const loadArtistData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch artist and profile
      const { data: artistData, error: artistError } = await supabase
        .from("artists")
        .select("*, profiles(*)")
        .eq("id", id)
        .single();

      if (artistError) throw artistError;
      setArtist(artistData);

      // 2. Fetch artworks
      const { data: artworksData, error: artworksError } = await supabase
        .from("artworks")
        .select("*")
        .eq("artist_id", id)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (artworksError) throw artworksError;
      setArtworks(artworksData || []);

      // 3. Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*, profiles(first_name, last_name)")
        .eq("artist_id", id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

    } catch (err: any) {
      console.error("Error loading artist data:", err);
      setError(err.message || "Impossible de charger les informations de l'artiste.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadArtistData();
  }, [loadArtistData]);

  const handleBuy = (artwork: any) => {
    const artistName = `${artist?.profiles?.first_name || ""} ${artist?.profiles?.last_name || ""}`.trim() || "Artiste SANKOFA";
    addToCart({
      id: artwork.id,
      title: artwork.title,
      artist_id: artwork.artist_id,
      artist_name: artistName,
      price: Number(artwork.price),
      rental_price_per_month: artwork.rental_price_per_month ? Number(artwork.rental_price_per_month) : undefined,
      is_rental_available: artwork.is_rental_available,
      photos: artwork.photos && artwork.photos.length > 0 ? artwork.photos : ["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5"],
    });
    router.push("/checkout");
  };

  if (loading) {
    return (
      <MarketLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-neutral text-sm font-medium">Chargement du profil de l’artiste...</p>
        </div>
      </MarketLayout>
    );
  }

  if (error || !artist) {
    return (
      <MarketLayout>
        <div className="max-w-md mx-auto my-20 text-center p-8 bg-card border border-border rounded-xl shadow-sm">
          <span className="font-serif text-3xl italic text-neutral block mb-4">Oups !</span>
          <p className="text-neutral text-sm leading-relaxed mb-6 font-medium">
            {error || "L’artiste demandé est introuvable ou n’est plus actif sur la plateforme."}
          </p>
          <Link href="/" className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-2.5 px-6 rounded transition-all shadow-sm">
            Retour au catalogue
          </Link>
        </div>
      </MarketLayout>
    );
  }

  const artistName = `${artist.profiles?.first_name || ""} ${artist.profiles?.last_name || ""}`.trim() || "Artiste SANKOFA";
  const initials = `${artist.profiles?.first_name?.[0] || ""}${artist.profiles?.last_name?.[0] || ""}`.toUpperCase() || "A";

  return (
    <MarketLayout>
      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-neutral hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour au Catalogue
        </Link>
      </div>

      {/* Artist Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-8 items-start">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
          
          {/* Left: Avatar/Initials */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-3xl sm:text-4xl font-serif italic shadow-md shrink-0 border-4 border-card">
            {initials}
          </div>

          {/* Right: Bio & Info */}
          <div className="flex-grow space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-dark flex items-center gap-2.5 flex-wrap">
                  {artistName}
                  {artist.academy_completed && (
                    <span className="inline-flex items-center gap-1 bg-[#d9a13b]/10 text-[#d9a13b] text-xs font-extrabold px-2.5 py-1 rounded border border-[#d9a13b]/25 shadow-sm" title="Artiste Certifié SANKOFA">
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      <span>Certifié</span>
                    </span>
                  )}
                </h1>
                
                <p className="text-neutral text-xs font-medium flex items-center gap-1.5 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{artist.city}, {artist.country}</span>
                  {artist.rating_avg > 0 && (
                    <>
                      <span className="text-neutral/45">•</span>
                      <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold" title={`Note de l’artiste : ${artist.rating_avg}/5`}>
                        <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span>{artist.rating_avg} ({reviews.length} avis)</span>
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral">À propos de l’artiste</h3>
              <p className="text-neutral text-sm leading-relaxed font-medium whitespace-pre-line">
                {artist.bio || "Cet artiste n’a pas encore rédigé sa biographie."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs & Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/60 mb-10 gap-6">
          <button
            onClick={() => setActiveTab("artworks")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === "artworks"
                ? "border-primary text-primary"
                : "border-transparent text-neutral hover:text-dark"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Œuvres ({artworks.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === "reviews"
                ? "border-primary text-primary"
                : "border-transparent text-neutral hover:text-dark"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Avis clients ({reviews.length})</span>
          </button>
        </div>

        {/* Tab Panel: Artworks */}
        {activeTab === "artworks" && (
          <div>
            {artworks.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border/60 rounded-xl max-w-md mx-auto p-6 shadow-sm">
                <span className="font-serif text-2xl italic text-neutral block mb-2">Aucune œuvre</span>
                <p className="text-neutral text-xs font-medium">
                  Cet artiste n’a pas encore publié d’œuvres d’art sur SANKOFA.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {artworks.map((artwork) => {
                  const formattedPrice = Number(artwork.price).toLocaleString("fr-FR") + " FCFA";
                  const formattedRentalPrice = artwork.rental_price_per_month 
                    ? Number(artwork.rental_price_per_month).toLocaleString("fr-FR") + " FCFA" 
                    : null;

                  return (
                    <div key={artwork.id} className="bg-card border border-border rounded overflow-hidden shadow-card hover:shadow-hover transition-all duration-300 flex flex-col group">
                      {/* Image Container */}
                      <div className="aspect-square w-full bg-gradient-to-tr from-amber-600 to-orange-800 relative flex items-center justify-center overflow-hidden bg-secondary/20">
                        {artwork.photos?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={artwork.photos[0]} 
                            alt={artwork.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <span className="text-white/45 font-serif text-xl italic">{artwork.category}</span>
                        )}
                        
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {artwork.is_certified && (
                            <span className="bg-accent text-dark text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                              Certifié Blockchain
                            </span>
                          )}
                          {artwork.is_rental_available && (
                            <span className="bg-primary/95 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                              Location dispo.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-serif text-lg font-bold mb-1 group-hover:text-primary transition-colors">
                            {artwork.title}
                          </h3>
                          <p className="text-neutral text-xs mb-3">
                            {artwork.category}
                          </p>
                        </div>
                        <div>
                          <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-neutral uppercase tracking-widest block">Prix de Vente</span>
                              <span className="text-base font-bold text-dark">{formattedPrice}</span>
                            </div>
                            {artwork.is_rental_available && formattedRentalPrice && (
                              <div className="text-right">
                                <span className="text-[10px] text-neutral uppercase tracking-widest block">Location / mois</span>
                                <span className="text-sm font-semibold text-primary">{formattedRentalPrice}</span>
                              </div>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => handleBuy(artwork)}
                            className="w-full mt-4 bg-secondary/30 hover:bg-primary hover:text-white text-dark hover:text-white text-xs font-semibold py-3.5 rounded transition-all h-11"
                          >
                            Découvrir & Acheter
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Panel: Reviews */}
        {activeTab === "reviews" && (
          <div className="max-w-3xl mx-auto space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border/60 rounded-xl p-6 shadow-sm">
                <span className="font-serif text-2xl italic text-neutral block mb-2">Aucun avis</span>
                <p className="text-neutral text-xs font-medium">
                  Cet artiste n’a pas encore reçu d’avis clients.
                </p>
              </div>
            ) : (
              reviews.map((review) => {
                const reviewerName = `${review.profiles?.first_name || ""} ${review.profiles?.last_name || ""}`.trim() || "Acheteur Anonyme";
                const reviewDate = new Date(review.created_at).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

                return (
                  <div key={review.id} className="bg-card border border-border/80 rounded-xl p-6 shadow-sm flex flex-col gap-4 animate-fadeIn">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-dark text-sm block">{reviewerName}</span>
                        <span className="text-neutral text-[10px] font-medium flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-primary shrink-0" />
                          <span>{reviewDate}</span>
                        </span>
                      </div>
                      
                      <div className="flex gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? "fill-current" : "text-neutral/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {review.comment && (
                      <p className="text-neutral text-sm leading-relaxed font-medium whitespace-pre-line italic">
                        « {review.comment} »
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </MarketLayout>
  );
}

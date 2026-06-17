"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShoppingCart, 
  Sparkles, 
  User, 
  Tag, 
  Info,
  Calendar,
  Layers,
  ShoppingBag,
  Loader2
} from "lucide-react";
import TransactionalLayout from "@/components/layout/TransactionalLayout";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";

export default function PublicExhibitionPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const id = params?.id as string;

  const [exhibition, setExhibition] = useState<any | null>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchExhibitionDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch exhibition details with curator profiles
        const { data: exhibData, error: exhibError } = await supabase
          .from("exhibitions")
          .select(`
            *,
            curator:curator_id(first_name, last_name, email)
          `)
          .eq("id", id)
          .single();

        if (exhibError || !exhibData) {
          throw exhibError || new Error("Exposition introuvable.");
        }

        setExhibition(exhibData);

        // 2. Fetch artworks associated with this exhibition
        const { data: artworksData, error: artworksError } = await supabase
          .from("exhibition_artworks")
          .select(`
            artwork:artwork_id(
              id,
              title,
              description,
              price,
              rental_price_per_month,
              category,
              photos,
              status,
              is_rental_available,
              artists(
                profiles(
                  first_name,
                  last_name
                )
              )
            )
          `)
          .eq("exhibition_id", id);

        if (artworksError) {
          throw artworksError;
        }

        if (artworksData) {
          // Filter to only display active/published/sold artworks (don't show drafts)
          const list = artworksData
            .map((item: any) => item.artwork)
            .filter((artwork: any) => artwork !== null);
          setArtworks(list);
        }

      } catch (err: any) {
        console.error("Error loading exhibition details:", err);
        setError(err.message || "Impossible de charger les détails de l’exposition.");
      } finally {
        setLoading(false);
      }
    };

    fetchExhibitionDetails();
  }, [id]);

  const handleAddToCart = (artwork: any, mode: "buy" | "rent") => {
    const artistName = `${artwork.artists?.profiles?.first_name || ""} ${artwork.artists?.profiles?.last_name || ""}`;
    
    addToCart({
      id: artwork.id,
      title: artwork.title,
      artist_id: artwork.artist_id || "",
      artist_name: artistName.trim() || "Artiste SANKOFA",
      price: Number(artwork.price),
      rental_price_per_month: artwork.rental_price_per_month ? Number(artwork.rental_price_per_month) : undefined,
      is_rental_available: artwork.is_rental_available,
      photos: artwork.photos || [],
      exhibition_id: exhibition.id, // Track referral!
      mode: mode,
      rental_duration_months: 1,
    });

    router.push("/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral text-sm">Chargement de l’exposition virtuelle...</p>
        </div>
      </div>
    );
  }

  if (error || !exhibition) {
    return (
      <TransactionalLayout backHref="/" backLabel="Retourner au Catalogue">
        <main className="flex-grow max-w-md w-full mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <Info className="w-16 h-16 text-red-500 mb-6 animate-pulse" />
          <h1 className="font-serif text-2xl font-bold mb-3">Exposition introuvable</h1>
          <p className="text-neutral text-sm mb-8">
            {error || "L’exposition que vous tentez de visiter n’existe pas ou a été retirée."}
          </p>
          <Link
            href="/"
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 flex items-center justify-center text-sm"
          >
            Retourner au Catalogue
          </Link>
        </main>
      </TransactionalLayout>
    );
  }

  const curatorName = `${exhibition.curator?.first_name || ""} ${exhibition.curator?.last_name || ""}`.trim();

  return (
    <TransactionalLayout backHref="/" backLabel="Retour au Catalogue">

      {/* Main Content */}
      <main className="flex-grow pb-16">
        
        {/* Hero Banner Section */}
        <div className="relative w-full h-[50vh] min-h-[300px] overflow-hidden bg-dark">
          <img 
            src={exhibition.cover_url} 
            alt={exhibition.title} 
            className="w-full h-full object-cover opacity-60 filter blur-[1px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark/95 via-dark/65 to-transparent flex items-end">
            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-10 text-white">
              
              <div className="inline-flex items-center gap-1.5 bg-primary/95 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Exposition Virtuelle
              </div>
              
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-wide max-w-4xl">
                {exhibition.title}
              </h1>

              <div className="flex items-center gap-3 text-sm text-gray-300 font-medium">
                <div className="bg-primary/20 p-1.5 rounded-full text-primary">
                  <User className="w-4 h-4" />
                </div>
                <span>Curation par <strong className="text-white font-semibold">{curatorName || "Curateur SANKOFA"}</strong></span>
                <span className="text-gray-500">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 shrink-0" />
                  Publiée le {new Date(exhibition.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Curation Description / Bio */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-card border border-border rounded-lg p-6 sm:p-8 shadow-sm max-w-3xl leading-relaxed">
            <h2 className="font-serif text-lg font-bold mb-3 flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5 shrink-0" />
              Note d’intention curatoriale
            </h2>
            <p className="text-neutral text-sm whitespace-pre-line leading-relaxed">
              {exhibition.description}
            </p>
          </div>
        </section>

        {/* Artworks Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-xl font-bold mb-6 border-b border-border pb-3">
            Sélection des œuvres de l’exposition
          </h2>

          {artworks.length === 0 ? (
            <div className="text-center py-12 text-neutral text-sm">
              Aucune œuvre d’art n’est actuellement publiée dans cette exposition.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {artworks.map((artwork) => {
                const artistName = `${artwork.artists?.profiles?.first_name || ""} ${artwork.artists?.profiles?.last_name || ""}`.trim();
                const isSold = artwork.status === "sold";
                
                return (
                  <div 
                    key={artwork.id} 
                    className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Preview Container */}
                      <div className="relative h-64 bg-neutral/10">
                        <img 
                          src={artwork.photos?.[0] || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5"} 
                          alt={artwork.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 bg-card/90 text-dark px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-border">
                          {artwork.category}
                        </div>
                        {isSold && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-primary text-white font-serif px-5 py-2 rounded text-sm font-bold uppercase tracking-wider shadow">
                              Vendue / Louée
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info Container */}
                      <div className="p-5 space-y-2">
                        <h3 className="font-serif text-base font-bold text-dark truncate">{artwork.title}</h3>
                        <p className="text-xs text-neutral">
                          Par <Link href={`/artists/${artwork.artist_id}`} className="text-dark font-semibold hover:text-primary transition-colors hover:underline decoration-dotted">{artistName || "Artiste SANKOFA"}</Link>
                        </p>
                        <p className="text-xs text-neutral/85 line-clamp-2 leading-relaxed pt-1">
                          {artwork.description}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Buy/Rent Trigger Actions */}
                    <div className="p-5 pt-0 border-t border-secondary/10 space-y-4">
                      
                      {/* Financial rates summary */}
                      <div className="flex justify-between items-center pt-4">
                        <div>
                          <p className="text-[10px] text-neutral uppercase font-bold tracking-wider">Prix d’acquisition</p>
                          <p className="font-serif text-base font-bold text-dark">
                            {Number(artwork.price).toLocaleString("fr-FR")} FCFA
                          </p>
                        </div>
                        
                        {artwork.is_rental_available && (
                          <div className="text-right">
                            <p className="text-[10px] text-neutral uppercase font-bold tracking-wider">Option Location</p>
                            <p className="font-serif text-sm font-bold text-primary">
                              {Number(artwork.rental_price_per_month).toLocaleString("fr-FR")} FCFA/mois
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Interactive Buttons */}
                      <div className="flex gap-2 w-full pt-1">
                        {artwork.is_rental_available ? (
                          <>
                            <button
                              disabled={isSold}
                              onClick={() => handleAddToCart(artwork, "rent")}
                              className="flex-1 border border-primary text-primary hover:bg-primary/5 disabled:opacity-40 font-semibold rounded text-xs transition-all flex items-center justify-center gap-1.5"
                              style={{ minHeight: "44px" }}
                            >
                              <Layers className="w-4 h-4 shrink-0" />
                              Louer
                            </button>
                            <button
                              disabled={isSold}
                              onClick={() => handleAddToCart(artwork, "buy")}
                              className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white font-semibold rounded text-xs transition-all flex items-center justify-center gap-1.5"
                              style={{ minHeight: "44px" }}
                            >
                              <ShoppingBag className="w-4 h-4 shrink-0" />
                              Acheter
                            </button>
                          </>
                        ) : (
                          <button
                            disabled={isSold}
                            onClick={() => handleAddToCart(artwork, "buy")}
                            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-40 text-white font-semibold rounded text-xs transition-all flex items-center justify-center gap-2"
                            style={{ minHeight: "44px" }}
                          >
                            <ShoppingBag className="w-4 h-4 shrink-0" />
                            Acheter l’œuvre d’art
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

    </TransactionalLayout>
  );
}

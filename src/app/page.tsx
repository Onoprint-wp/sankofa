"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Award, Star, Search, Loader2, SlidersHorizontal } from "lucide-react";
import MarketLayout from "@/components/layout/MarketLayout";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const { addToCart } = useCart();

  const [artworksList, setArtworksList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [selectedCountry, setSelectedCountry] = useState("Tous");
  const [sortBy, setSortBy] = useState("recent");

  const categories = ["Toutes", "Peinture", "Sculpture", "Art Numérique", "Photographie", "Location disponible"];

  const loadArtworks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("artworks")
        .select(`
          *,
          artist:artists (
            rating_avg,
            academy_completed,
            country,
            profile:profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArtworksList(data || []);
    } catch (err) {
      console.error("Erreur chargement œuvres :", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArtworks();
  }, [loadArtworks]);

  const handleBuy = (artwork: any) => {
    addToCart({
      id: artwork.id,
      title: artwork.title,
      artist_id: artwork.artist_id,
      artist_name: `${artwork.artist?.profile?.first_name || ""} ${artwork.artist?.profile?.last_name || ""}`.trim() || "Artiste SANKOFA",
      price: Number(artwork.price),
      rental_price_per_month: artwork.rental_price_per_month ? Number(artwork.rental_price_per_month) : undefined,
      is_rental_available: artwork.is_rental_available,
      photos: artwork.photos && artwork.photos.length > 0 ? artwork.photos : ["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5"],
    });
    router.push("/checkout");
  };

  let filtered = artworksList.filter((artwork) => {
    const artistName = `${artwork.artist?.profile?.first_name || ""} ${artwork.artist?.profile?.last_name || ""}`.toLowerCase();
    const title = (artwork.title || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    
    // Search filter
    const matchesSearch = title.includes(query) || artistName.includes(query);
    
    // Category filter
    let matchesCategory = true;
    if (selectedCategory === "Location disponible") {
      matchesCategory = artwork.is_rental_available;
    } else if (selectedCategory !== "Toutes") {
      matchesCategory = artwork.category === selectedCategory;
    }

    // Min Price filter
    const matchesMinPrice = minPrice === "" || Number(artwork.price) >= minPrice;

    // Max Price filter
    const matchesMaxPrice = maxPrice === "" || Number(artwork.price) <= maxPrice;

    // Country filter
    const artistCountry = (artwork.artist?.country || "Autre").toLowerCase();
    const matchesCountry = selectedCountry === "Tous" || artistCountry === selectedCountry.toLowerCase();

    return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesCountry;
  });

  // Sorting
  if (sortBy === "price-asc") {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortBy === "price-desc") {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortBy === "rating") {
    filtered.sort((a, b) => Number(b.artist?.rating_avg || 0) - Number(a.artist?.rating_avg || 0));
  } else {
    // Default: recent (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const filteredArtworks = filtered;

  return (
    <MarketLayout>

      {/* Hero Section */}
      <section className="relative bg-secondary/35 py-20 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-primary font-semibold text-sm uppercase tracking-widest block mb-3">
              L’Art Africain à portée de main
            </span>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Découvrez, collectionnez & louez l’art africain original
            </h1>
            <p className="text-neutral text-lg mb-8 max-w-lg">
              La première marketplace panafricaine d’œuvres d’art authentiques, certifiées sur la blockchain Polygon et livrées chez vous en toute sécurité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#catalogue" className="bg-primary hover:bg-primary-dark text-white text-center font-medium px-8 py-3.5 rounded transition-all shadow-sm">
                Explorer le Catalogue
              </a>
              <Link href="/become-artist" className="border border-primary text-primary hover:bg-primary/5 text-center font-medium px-8 py-3.5 rounded transition-all">
                Vendre vos Œuvres
              </Link>
            </div>
          </div>
          <div className="relative h-96 w-full rounded-2xl bg-gradient-to-tr from-primary to-accent overflow-hidden shadow-hover flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative text-center text-white z-10">
              <span className="font-serif text-3xl md:text-4xl italic font-light block mb-4">« SANKOFA »</span>
              <p className="text-xs uppercase tracking-widest max-w-xs mx-auto">Retourner à ses racines pour construire l’avenir.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Artworks Grid */}
      <main id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1">
        
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 pb-6 border-b border-border/40">
          <div>
            <h2 className="font-serif text-3xl font-bold mb-1">Œuvres en vedette</h2>
            <p className="text-neutral text-xs">Sélectionnées par notre comité éditorial</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-grow sm:max-w-xs">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-4 py-2 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm h-10"
              />
              <Search className="absolute left-3 top-3 text-neutral w-4 h-4 shrink-0" />
            </div>

            {/* Toggle Advanced Filters Button */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-1.5 px-4 h-10 rounded-lg text-xs font-semibold border transition-all shrink-0 ${
                showAdvanced || minPrice !== "" || maxPrice !== "" || selectedCountry !== "Tous" || sortBy !== "recent"
                  ? "bg-primary/5 border-primary text-primary"
                  : "bg-card border-border text-neutral hover:bg-secondary/15"
              }`}
              style={{ minHeight: "40px" }}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>Filtres</span>
              {(minPrice !== "" || maxPrice !== "" || selectedCountry !== "Tous" || sortBy !== "recent") && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
              )}
            </button>

            {/* Category Buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[11px] font-semibold px-4.5 py-2 rounded-full shrink-0 transition-all border ${
                    selectedCategory === cat
                      ? "bg-primary border-primary text-white shadow-sm"
                      : "bg-card border-border hover:bg-secondary/15 text-neutral"
                  }`}
                  style={{ minHeight: "36px" }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="bg-card border border-border/80 rounded-xl p-5 mb-8 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            {/* Price Min */}
            <div>
              <label htmlFor="min-price" className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5">
                Prix Min (FCFA)
              </label>
              <input
                id="min-price"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ex: 50000"
                className="w-full bg-[#FCFAF5] border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-9"
              />
            </div>

            {/* Price Max */}
            <div>
              <label htmlFor="max-price" className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5">
                Prix Max (FCFA)
              </label>
              <input
                id="max-price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ex: 500000"
                className="w-full bg-[#FCFAF5] border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-9"
              />
            </div>

            {/* Country filter */}
            <div>
              <label htmlFor="country-filter" className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5">
                Origine de l&apos;artiste
              </label>
              <select
                id="country-filter"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-[#FCFAF5] border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="Tous">Tous les pays</option>
                <option value="Cameroun">Cameroun</option>
                <option value="Sénégal">Sénégal</option>
                <option value="Nigeria">Nigeria</option>
                <option value="Afrique du Sud">Afrique du Sud</option>
                <option value="Côte d'Ivoire">Côte d&apos;Ivoire</option>
              </select>
            </div>

            {/* Sort filter */}
            <div>
              <label htmlFor="sort-by" className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5">
                Trier par
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-[#FCFAF5] border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-9"
              >
                <option value="recent">Plus récent</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="rating">Mieux notés</option>
              </select>
            </div>
            
            {/* Reset Advanced Filters */}
            <div className="sm:col-span-2 md:col-span-4 flex justify-end">
              <button
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  setSelectedCountry("Tous");
                  setSortBy("recent");
                }}
                className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors min-h-[32px] px-3 border border-primary/20 rounded bg-primary/5 hover:bg-primary/10"
              >
                Réinitialiser les filtres avancés
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-neutral text-sm font-medium">Chargement des œuvres d’art africaines...</p>
          </div>
          ) : filteredArtworks.length === 0 ? (
            /* Empty State */
            <div className="text-center py-20 bg-card border border-border/60 rounded-xl max-w-md mx-auto p-8 shadow-sm">
              <span className="font-serif text-3xl italic text-neutral block mb-4">Oups !</span>
              <p className="text-neutral text-sm leading-relaxed mb-6 font-medium">
                Aucune œuvre ne correspond à votre recherche ou à vos filtres pour le moment.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Toutes");
                  setMinPrice("");
                  setMaxPrice("");
                  setSelectedCountry("Tous");
                  setSortBy("recent");
                }}
                className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-2.5 px-6 rounded transition-all shadow-sm"
              >
                Réinitialiser les filtres
              </button>
            </div>
        ) : (
          /* Artworks Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredArtworks.map((artwork) => {
              const artistName = `${artwork.artist?.profile?.first_name || ""} ${artwork.artist?.profile?.last_name || ""}`.trim() || "Artiste SANKOFA";
              const formattedPrice = Number(artwork.price).toLocaleString("fr-FR") + " FCFA";
              const formattedRentalPrice = artwork.rental_price_per_month 
                ? Number(artwork.rental_price_per_month).toLocaleString("fr-FR") + " FCFA" 
                : null;

              return (
                <div key={artwork.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 transition-all duration-500 flex flex-col group">
                  {/* Image Container */}
                  <div className="aspect-square w-full bg-gradient-to-tr from-amber-600 to-orange-800 relative flex items-center justify-center overflow-hidden bg-secondary/20">
                    {artwork.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={artwork.photos[0]} 
                        alt={artwork.title} 
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out" 
                      />
                    ) : (
                      <span className="text-white/45 font-serif text-xl italic">{artwork.category}</span>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                      {artwork.is_certified && (
                        <span className="bg-accent text-dark text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-accent/20">
                          Certifié Blockchain
                        </span>
                      )}
                      {artwork.is_rental_available && (
                        <span className="bg-primary/95 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-primary/20">
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
                      <p className="text-neutral text-xs mb-3 flex items-center gap-1.5 flex-wrap">
                        <Link href={`/artists/${artwork.artist_id}`} className="hover:text-primary transition-colors hover:underline decoration-dotted font-medium">{artistName}</Link>
                        {artwork.artist?.academy_completed && (
                          <span className="inline-flex items-center gap-0.5 bg-[#d9a13b]/10 text-[#d9a13b] text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-[#d9a13b]/25 shadow-sm" title="Artiste Certifié SANKOFA">
                            <Award className="w-2.5 h-2.5 shrink-0" />
                            <span>Certifié</span>
                          </span>
                        )}
                        {artwork.artist?.rating_avg > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold" title={`Note de l’artiste : ${artwork.artist.rating_avg}/5`}>
                            <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                            <span>{artwork.artist.rating_avg}</span>
                          </span>
                        )}
                        {artwork.artist?.country && (
                          <span>• {artwork.artist.country}</span>
                        )}
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
      </main>
    </MarketLayout>
  );
}

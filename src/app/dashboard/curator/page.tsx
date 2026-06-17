"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FolderHeart, 
  Plus, 
  Sparkles, 
  Coins, 
  Eye, 
  ShoppingBag, 
  ChevronRight, 
  PlusCircle, 
  X, 
  Check, 
  Loader2, 
  Calendar,
  Layers,
  Image as ImageIcon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import TransactionalLayout from "@/components/layout/TransactionalLayout";

export default function CuratorDashboard() {
  const { session, profile, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"exhibitions" | "earnings">("exhibitions");
  const [exhibitions, setExhibitions] = useState<any[]>([]);
  const [publishedArtworks, setPublishedArtworks] = useState<any[]>([]);
  const [referredOrders, setReferredOrders] = useState<any[]>([]);
  const [referredRentals, setReferredRentals] = useState<any[]>([]);
  
  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<string | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Exhibition Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([]);

  // Payout states
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<"momo" | "bank">("momo");
  const [momoOperator, setMomoOperator] = useState<"orange" | "mtn">("orange");
  const [momoPhone, setMomoPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [withdrawnAmount, setWithdrawnAmount] = useState(0);

  // Default beautiful Unsplash cover images options
  const defaultCovers = [
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1547891654-e66ed7edd96c?auto=format&fit=crop&w=800&q=80"
  ];

  // Redirect to login if not authenticated or not authorized
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login?redirect=/dashboard/curator");
      } else if (profile && !["admin", "curator"].includes(profile.role)) {
        router.push("/");
      }
    }
  }, [loading, isAuthenticated, profile, router]);

  const loadData = useCallback(async () => {
    if (!session?.access_token || !profile) return;
    setLoadingData(true);
    try {
      // 1. Fetch Curator's Exhibitions
      const { data: exhibData, error: exhibError } = await supabase
        .from("exhibitions")
        .select(`
          *,
          exhibition_artworks(
            artwork_id,
            artworks(
              id,
              title,
              price,
              photos
            )
          )
        `)
        .eq("curator_id", profile.id)
        .order("created_at", { ascending: false });

      if (!exhibError && exhibData) {
        setExhibitions(exhibData);
      }

      // 2. Fetch Published Artworks for selection
      const { data: artworksData, error: artworksError } = await supabase
        .from("artworks")
        .select("id, title, price, photos, category, artist_id, artists(profiles(first_name, last_name))")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!artworksError && artworksData) {
        setPublishedArtworks(artworksData);
      }

      // 3. Fetch Referred Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          amount,
          created_at,
          exhibition_id,
          buyer:buyer_id(first_name, last_name),
          artwork:artwork_id(title, price, photos, artist:artist_id(profiles(first_name, last_name))),
          exhibitions!inner(curator_id)
        `)
        .eq("exhibitions.curator_id", profile.id)
        .order("created_at", { ascending: false });

      if (!ordersError && ordersData) {
        setReferredOrders(ordersData);
      }

      // 4. Fetch Referred Rentals
      const { data: rentalsData, error: rentalsError } = await supabase
        .from("rentals")
        .select(`
          id,
          monthly_rate,
          duration_months,
          status,
          created_at,
          exhibition_id,
          buyer:buyer_id(first_name, last_name),
          artwork:artwork_id(title, price, photos, artist:artist_id(profiles(first_name, last_name))),
          exhibitions!inner(curator_id)
        `)
        .eq("exhibitions.curator_id", profile.id)
        .order("created_at", { ascending: false });

      if (!rentalsError && rentalsData) {
        setReferredRentals(rentalsData);
      }

    } catch (err) {
      console.error("Error loading curator dashboard data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [session, profile]);

  useEffect(() => {
    if (profile && session) {
      loadData();
    }
  }, [profile, session, loadData]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral text-sm">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // Calculate referred metrics
  const totalOrdersCount = referredOrders.length;
  const totalRentalsCount = referredRentals.length;
  
  // Commission calculations: 5% on sales and 5% on monthly rents
  const salesGmv = referredOrders.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const salesCommission = salesGmv * 0.05;

  const rentalsGmv = referredRentals.reduce((acc, curr) => acc + (Number(curr.monthly_rate) * Number(curr.duration_months)), 0);
  const rentalsCommission = rentalsGmv * 0.05;

  const totalCommissions = Math.max(0, salesCommission + rentalsCommission - withdrawnAmount);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccessMsg(null);

    const amountToWithdraw = totalCommissions;
    if (amountToWithdraw <= 0) {
      setPayoutError("Vous n'avez pas de commissions disponibles pour un virement.");
      return;
    }

    if (payoutMethod === "momo") {
      if (!momoPhone || momoPhone.trim().length < 8) {
        setPayoutError("Veuillez saisir un numéro de téléphone valide pour le Mobile Money.");
        return;
      }
    } else {
      if (!bankName || !bankName.trim() || !bankIban || bankIban.trim().length < 10) {
        setPayoutError("Veuillez saisir le nom de la banque et un code IBAN valide.");
        return;
      }
    }

    setPayoutLoading(true);
    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const randomTxId = "TX-CUR-" + Math.floor(100000 + Math.random() * 900000);
      setWithdrawnAmount(prev => prev + amountToWithdraw);
      setPayoutSuccessMsg(`Votre demande de virement de ${amountToWithdraw.toLocaleString("fr-FR")} FCFA a été acceptée avec succès ! ID transaction : ${randomTxId}. Les fonds seront crédités sous 24h.`);
      
      // Clear input fields
      setMomoPhone("");
      setBankName("");
      setBankIban("");
    } catch (err) {
      setPayoutError("Une erreur inattendue est survenue lors de la transaction.");
    } finally {
      setPayoutLoading(false);
    }
  };

  // Toggle artwork selection
  const handleToggleArtwork = (artworkId: string) => {
    setSelectedArtworkIds(prev => 
      prev.includes(artworkId) 
        ? prev.filter(id => id !== artworkId) 
        : [...prev, artworkId]
    );
  };

  // Create Exhibition Submit handler
  const handleCreateExhibition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !coverUrl || selectedArtworkIds.length === 0) {
      setCreationError("Veuillez remplir tous les champs obligatoires et sélectionner au moins une œuvre.");
      return;
    }

    setIsCreating(true);
    setCreationError(null);
    setCreationSuccess(null);

    try {
      const response = await fetch("/api/exhibitions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title,
          description,
          cover_url: coverUrl,
          artwork_ids: selectedArtworkIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Impossible de créer l’exposition.");
      }

      setCreationSuccess("L’exposition virtuelle a été créée avec succès.");
      
      // Reset form
      setTitle("");
      setDescription("");
      setCoverUrl("");
      setSelectedArtworkIds([]);
      setShowCreateModal(false);
      
      // Reload dashboard data
      loadData();
    } catch (err: any) {
      setCreationError(err.message || "Une erreur est survenue lors de la création.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <TransactionalLayout backHref="/" backLabel="Retour au catalogue" titleBadge="CURATION">

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-border/40 pb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-wide flex items-center gap-2">
              <FolderHeart className="w-8 h-8 text-primary shrink-0" />
              Espace Curateur & Curation
            </h1>
            <p className="text-sm text-neutral mt-1">Créez des expositions et pilotez votre commission de 5 %</p>
          </div>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            {profile?.role === "admin" ? "Administrateur" : "Curateur"}
          </span>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-8 overflow-x-auto bg-card rounded-t shadow-sm">
          <button
            onClick={() => setActiveTab("exhibitions")}
            className={`flex-1 py-4 px-6 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "exhibitions"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-neutral hover:text-dark hover:bg-secondary/10"
            }`}
            style={{ minHeight: "48px" }}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            Mes Expositions Virtuelles
          </button>
          <button
            onClick={() => setActiveTab("earnings")}
            className={`flex-1 py-4 px-6 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === "earnings"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-neutral hover:text-dark hover:bg-secondary/10"
            }`}
            style={{ minHeight: "48px" }}
          >
            <Coins className="w-4 h-4 shrink-0" />
            Mes Commissions & Ventes
          </button>
        </div>

        {/* Tab content 1: Exhibitions */}
        {activeTab === "exhibitions" && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className="font-serif text-lg font-bold">Vos Expositions</h2>
                <p className="text-xs text-neutral">Organisez des collections thématiques pour inspirer les acheteurs</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary hover:bg-primary-dark text-white font-medium px-5 py-2.5 rounded shadow-sm hover:shadow transition-all flex items-center gap-2 text-sm"
                style={{ minHeight: "44px" }}
              >
                <Plus className="w-5 h-5 shrink-0" />
                Créer une Exposition
              </button>
            </div>

            {exhibitions.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center max-w-lg mx-auto shadow-sm">
                <Sparkles className="w-12 h-12 text-primary/40 mx-auto mb-4" />
                <h3 className="font-serif text-lg font-bold mb-2">Aucune exposition créée</h3>
                <p className="text-neutral text-sm mb-6">
                  Commencez à valoriser les œuvres de la plateforme en créant votre première exposition virtuelle thématique.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary hover:bg-primary-dark text-white font-medium px-5 py-2.5 rounded shadow-sm hover:shadow transition-all text-sm mx-auto flex items-center gap-2"
                  style={{ minHeight: "44px" }}
                >
                  <PlusCircle className="w-4 h-4" />
                  Créer une Exposition
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exhibitions.map((exhib) => (
                  <div key={exhib.id} className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="relative h-44 bg-neutral/10">
                        <img 
                          src={exhib.cover_url} 
                          alt={exhib.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3 bg-dark/80 text-white px-2 py-1 rounded text-[10px] font-bold">
                          {exhib.exhibition_artworks?.length || 0} œuvre{exhib.exhibition_artworks?.length > 1 ? "s" : ""}
                        </div>
                      </div>
                      
                      <div className="p-5">
                        <h3 className="font-serif text-base font-bold mb-2 line-clamp-1">{exhib.title}</h3>
                        <p className="text-neutral text-xs mb-4 line-clamp-3 leading-relaxed">{exhib.description}</p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-secondary/10 flex items-center justify-between">
                      <span className="text-[10px] text-neutral">
                        Créé le {new Date(exhib.created_at).toLocaleDateString("fr-FR")}
                      </span>
                      <Link 
                        href={`/exhibitions/${exhib.id}`}
                        target="_blank"
                        className="text-primary hover:text-primary-dark font-medium text-xs flex items-center gap-1"
                        style={{ minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center" }}
                      >
                        Voir la Page
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab content 2: Earnings & Sales Tracking */}
        {activeTab === "earnings" && (
          <div>
            <h2 className="font-serif text-lg font-bold mb-1">Suivi de vos Commissions & Performances</h2>
            <p className="text-xs text-neutral mb-8">Les commissions de 5 % sont calculées sur toutes les transactions référencées</p>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              
              <div className="bg-card border border-border rounded-lg p-5 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full text-primary">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-neutral text-[10px] uppercase font-bold tracking-wider block">Commissions acquises</span>
                    <h3 className="text-lg font-bold font-serif text-primary">
                      {totalCommissions.toLocaleString("fr-FR")} FCFA
                    </h3>
                  </div>
                </div>
                {totalCommissions > 0 && (
                  <button
                    onClick={() => {
                      setPayoutSuccessMsg(null);
                      setPayoutError(null);
                      setShowPayoutModal(true);
                    }}
                    className="w-full bg-primary hover:bg-primary-dark text-white text-[11px] font-semibold py-2 px-3 rounded transition-all shadow-sm text-center min-h-[44px]"
                  >
                    Demander un virement
                  </button>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-5 shadow-sm flex items-center gap-4">
                <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-500">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-neutral text-[10px] uppercase font-bold tracking-wider">Volume de Ventes (GMV)</span>
                  <h3 className="text-lg font-bold font-serif">
                    {salesGmv.toLocaleString("fr-FR")} FCFA
                  </h3>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-5 shadow-sm flex items-center gap-4">
                <div className="bg-purple-500/10 p-3 rounded-full text-purple-500">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-neutral text-[10px] uppercase font-bold tracking-wider">Volume Locations</span>
                  <h3 className="text-lg font-bold font-serif">
                    {rentalsGmv.toLocaleString("fr-FR")} FCFA
                  </h3>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-5 shadow-sm flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-full text-blue-500">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-neutral text-[10px] uppercase font-bold tracking-wider">Transactions Parrainées</span>
                  <h3 className="text-lg font-bold font-serif">
                    {totalOrdersCount + totalRentalsCount} transaction{totalOrdersCount + totalRentalsCount > 1 ? "s" : ""}
                  </h3>
                </div>
              </div>

            </div>

            {/* List of Referred Orders */}
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden mb-8">
              <div className="p-5 border-b border-border bg-secondary/5 flex items-center justify-between">
                <h3 className="font-serif text-sm font-bold">Ventes directes (Commandes)</h3>
                <span className="text-xs text-neutral font-medium">{totalOrdersCount} vente{totalOrdersCount > 1 ? "s" : ""}</span>
              </div>
              
              {referredOrders.length === 0 ? (
                <div className="p-8 text-center text-neutral text-xs">
                  Aucune vente d’œuvre n’a été parrainée par vos expositions pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-secondary/5 border-b border-border text-neutral text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4 font-semibold">Œuvre</th>
                        <th className="p-4 font-semibold">Acheteur</th>
                        <th className="p-4 font-semibold">Prix de vente</th>
                        <th className="p-4 font-semibold text-primary">Commission (5 %)</th>
                        <th className="p-4 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/10">
                      {referredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-secondary/5 transition-colors">
                          <td className="p-4 font-medium flex items-center gap-3">
                            <div className="w-10 h-10 bg-neutral/15 rounded overflow-hidden shrink-0">
                              <img 
                                src={order.artwork?.photos?.[0] || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5"} 
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-dark">{order.artwork?.title || "Œuvre inconnue"}</p>
                              <p className="text-[10px] text-neutral">
                                Artiste: {order.artwork?.artist?.profiles?.first_name || ""} {order.artwork?.artist?.profiles?.last_name || ""}
                              </p>
                            </div>
                          </td>
                          <td className="p-4 text-neutral font-medium">
                            {order.buyer?.first_name || ""} {order.buyer?.last_name || ""}
                          </td>
                          <td className="p-4 font-semibold">
                            {Number(order.amount).toLocaleString("fr-FR")} FCFA
                          </td>
                          <td className="p-4 font-bold text-primary">
                            {(Number(order.amount) * 0.05).toLocaleString("fr-FR")} FCFA
                          </td>
                          <td className="p-4 text-neutral">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              {new Date(order.created_at).toLocaleDateString("fr-FR")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* List of Referred Rentals */}
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border bg-secondary/5 flex items-center justify-between">
                <h3 className="font-serif text-sm font-bold">Locations (Artothèque)</h3>
                <span className="text-xs text-neutral font-medium">{totalRentalsCount} location{totalRentalsCount > 1 ? "s" : ""}</span>
              </div>
              
              {referredRentals.length === 0 ? (
                <div className="p-8 text-center text-neutral text-xs">
                  Aucune location d’œuvre n’a été parrainée par vos expositions pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-secondary/5 border-b border-border text-neutral text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4 font-semibold">Œuvre</th>
                        <th className="p-4 font-semibold">Acheteur</th>
                        <th className="p-4 font-semibold">Loyer Mensuel</th>
                        <th className="p-4 font-semibold">Durée contractée</th>
                        <th className="p-4 font-semibold text-primary">Commission Totale (5 %)</th>
                        <th className="p-4 font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/10">
                      {referredRentals.map((rental) => (
                        <tr key={rental.id} className="hover:bg-secondary/5 transition-colors">
                          <td className="p-4 font-medium flex items-center gap-3">
                            <div className="w-10 h-10 bg-neutral/15 rounded overflow-hidden shrink-0">
                              <img 
                                src={rental.artwork?.photos?.[0] || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5"} 
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-dark">{rental.artwork?.title || "Œuvre inconnue"}</p>
                              <p className="text-[10px] text-neutral">
                                Artiste: {rental.artwork?.artist?.profiles?.first_name || ""} {rental.artwork?.artist?.profiles?.last_name || ""}
                              </p>
                            </div>
                          </td>
                          <td className="p-4 text-neutral font-medium">
                            {rental.buyer?.first_name || ""} {rental.buyer?.last_name || ""}
                          </td>
                          <td className="p-4 font-semibold">
                            {Number(rental.monthly_rate).toLocaleString("fr-FR")} FCFA/mois
                          </td>
                          <td className="p-4 font-medium">
                            {rental.duration_months} mois
                          </td>
                          <td className="p-4 font-bold text-primary">
                            {(Number(rental.monthly_rate) * Number(rental.duration_months) * 0.05).toLocaleString("fr-FR")} FCFA
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              rental.status === "active" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-neutral/20 text-neutral"
                            }`}>
                              {rental.status === "active" ? "Actif" : rental.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>



      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-lg shadow-xl overflow-hidden border border-border">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/5">
              <h3 className="font-serif text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                Créer une nouvelle Exposition
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-neutral hover:text-dark p-2 hover:bg-secondary/15 rounded h-10 w-10 flex items-center justify-center"
                style={{ minHeight: "44px", minWidth: "44px" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateExhibition}>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                
                {creationError && (
                  <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded border border-red-200">
                    {creationError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="modal-title" className="text-xs font-bold uppercase tracking-wider text-neutral">Titre de l’exposition *</label>
                  <input
                    id="modal-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Reflets d’Afrique moderne"
                    className="w-full border border-border bg-background rounded px-3 py-2 text-sm h-11 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-desc" className="text-xs font-bold uppercase tracking-wider text-neutral">Texte de présentation / Description *</label>
                  <textarea
                    id="modal-desc"
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Présentez le thème artistique, l’intention de curation et l’émotion que dégage cette collection..."
                    className="w-full border border-border bg-background rounded px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral block">Image de couverture *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {defaultCovers.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCoverUrl(url)}
                        className={`relative h-20 rounded-md overflow-hidden border-2 transition-all ${
                          coverUrl === url ? "border-primary scale-[1.03] shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                        style={{ minHeight: "44px" }}
                      >
                        <img src={url} alt={`Option ${idx + 1}`} className="w-full h-full object-cover" />
                        {coverUrl === url && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-white p-1 rounded-full">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <ImageIcon className="w-4 h-4 text-neutral shrink-0" />
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="Ou collez un lien URL d'image personnalisée"
                      className="w-full border border-border bg-background rounded px-3 py-1.5 text-xs h-9 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Artworks multi-select list */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral block">Sélectionner les œuvres d’art *</label>
                  <p className="text-[10px] text-neutral">Sélectionnez les œuvres publiées à intégrer dans cette exposition virtuelle.</p>
                  
                  {publishedArtworks.length === 0 ? (
                    <div className="p-4 border border-dashed border-border rounded text-center text-xs text-neutral">
                      Aucune œuvre publiée n’est disponible à la sélection sur la plateforme.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1">
                      {publishedArtworks.map((artwork) => {
                        const isSelected = selectedArtworkIds.includes(artwork.id);
                        return (
                          <button
                            key={artwork.id}
                            type="button"
                            onClick={() => handleToggleArtwork(artwork.id)}
                            className={`p-2.5 border rounded-lg text-left flex items-center gap-3 transition-all ${
                              isSelected 
                                ? "border-primary bg-primary/5 ring-1 ring-primary" 
                                : "border-border hover:border-neutral/45 hover:bg-secondary/5"
                            }`}
                            style={{ minHeight: "44px" }}
                          >
                            <div className="w-10 h-10 bg-neutral/15 rounded overflow-hidden shrink-0">
                              <img 
                                src={artwork.photos?.[0] || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5"} 
                                alt="" 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className="font-semibold text-xs text-dark truncate">{artwork.title}</p>
                              <p className="text-[10px] text-neutral truncate">
                                Par: {artwork.artists?.profiles?.first_name || ""} {artwork.artists?.profiles?.last_name || ""}
                              </p>
                              <p className="text-[10px] font-bold text-neutral">
                                {Number(artwork.price).toLocaleString("fr-FR")} FCFA
                              </p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                              isSelected ? "bg-primary border-primary text-white" : "border-border"
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-border bg-secondary/5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border rounded font-semibold text-xs hover:bg-secondary/15 transition-all text-neutral"
                  style={{ minHeight: "44px" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded shadow-sm hover:shadow transition-all text-xs flex items-center gap-2"
                  style={{ minHeight: "44px" }}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Créer l’Exposition"
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden animate-slideUp">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
            
            {/* Modal Header */}
            <div className="p-6 border-b border-border/60 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-dark">Demander un virement</h3>
              <button 
                onClick={() => setShowPayoutModal(false)}
                className="text-neutral hover:text-dark p-1.5 rounded-lg hover:bg-neutral/5 transition-all min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestPayout}>
              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {payoutError && (
                  <div className="bg-red-50 border border-red-200 text-error p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0" />
                    <span>{payoutError}</span>
                  </div>
                )}

                {payoutSuccessMsg ? (
                  <div className="bg-green-50 border border-green-200 text-success p-4 rounded-lg text-xs leading-relaxed font-semibold flex flex-col items-center text-center gap-3">
                    <Check className="w-10 h-10 text-success bg-white rounded-full p-2 border border-green-200" />
                    <span>{payoutSuccessMsg}</span>
                  </div>
                ) : (
                  <>
                    <div className="bg-[#FCFAF5] p-4 border border-border/50 rounded-xl mb-4">
                      <span className="text-[10px] text-neutral uppercase tracking-wider block font-bold">Montant à transférer</span>
                      <span className="text-xl font-bold text-primary font-serif">
                        {totalCommissions.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>

                    {/* Method Selector */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-2">Méthode de virement</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPayoutMethod("momo");
                            setPayoutError(null);
                          }}
                          className={`py-3 px-4 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 min-h-[48px] ${
                            payoutMethod === "momo"
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-neutral hover:bg-neutral/5"
                          }`}
                        >
                          Mobile Money
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPayoutMethod("bank");
                            setPayoutError(null);
                          }}
                          className={`py-3 px-4 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 min-h-[48px] ${
                            payoutMethod === "bank"
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-neutral hover:bg-neutral/5"
                          }`}
                        >
                          Virement Bancaire
                        </button>
                      </div>
                    </div>

                    {/* Conditional inputs */}
                    {payoutMethod === "momo" ? (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label htmlFor="momo-operator" className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5">Opérateur</label>
                          <select
                            id="momo-operator"
                            value={momoOperator}
                            onChange={(e) => setMomoOperator(e.target.value as any)}
                            className="w-full bg-[#FCFAF5] border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-11"
                          >
                            <option value="orange">Orange Money</option>
                            <option value="mtn">MTN MoMo</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="momo-phone" className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5">Numéro de téléphone</label>
                          <input
                            id="momo-phone"
                            type="tel"
                            value={momoPhone}
                            onChange={(e) => setMomoPhone(e.target.value)}
                            placeholder="Ex: 677889900"
                            className="w-full bg-[#FCFAF5] border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-11"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label htmlFor="bank-name" className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5">Nom de la banque</label>
                          <input
                            id="bank-name"
                            type="text"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="Ex: Afriland First Bank, SG"
                            className="w-full bg-[#FCFAF5] border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-11"
                          />
                        </div>
                        <div>
                          <label htmlFor="bank-iban" className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5">Code IBAN / RIB</label>
                          <input
                            id="bank-iban"
                            type="text"
                            value={bankIban}
                            onChange={(e) => setBankIban(e.target.value)}
                            placeholder="Ex: CM21 10005 00010..."
                            className="w-full bg-[#FCFAF5] border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary h-11"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-border bg-secondary/5 flex items-center justify-end gap-3">
                {payoutSuccessMsg ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPayoutModal(false);
                      setPayoutSuccessMsg(null);
                    }}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-xs h-11 flex items-center justify-center"
                  >
                    Fermer
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowPayoutModal(false)}
                      className="px-4 py-2 border border-border rounded-xl font-semibold text-xs hover:bg-secondary/15 transition-all text-neutral h-11"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={payoutLoading}
                      className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all text-xs h-11 flex items-center justify-center gap-2"
                    >
                      {payoutLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        "Confirmer le virement"
                      )}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </TransactionalLayout>
  );
}

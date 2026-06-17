"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  Package, Clock, ShieldAlert, BadgeHelp, 
  CheckCircle, Loader2, Truck, Eye, RefreshCw, AlertCircle, Calendar, ShieldCheck,
  Star
} from "lucide-react";
import TransactionalLayout from "@/components/layout/TransactionalLayout";

interface Order {
  id: string;
  buyer_id: string;
  artwork_id: string;
  amount: number;
  escrow_status: "none" | "held" | "released" | "refunded";
  delivery_status: "pending" | "shipped" | "delivered" | "disputed" | "returned";
  shipping_address: any;
  created_at: string;
  artworks: {
    id: string;
    title: string;
    artist_id: string;
    category: string;
    photos: string[];
    price: number;
  };
}

export default function OrdersDashboard() {
  const { user, session, profile, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"purchases" | "sales" | "rentals">("purchases");
  
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // holds orderId/rentalId being processed
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states
  const [showShipModal, setShowShipModal] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const [showDisputeModal, setShowDisputeModal] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  // Rental simulator states
  const [showPayRentModal, setShowPayRentModal] = useState<any>(null); // holds payment object
  const [showBuyoutModal, setShowBuyoutModal] = useState<any>(null); // holds rental object
  const [rentPinCode, setRentPinCode] = useState("");
  const [rentSimulationStep, setRentSimulationStep] = useState<"push" | "pin" | "success" | "error">("push");
  const [rentServerError, setRentServerError] = useState<string | null>(null);
  const [rentActionLoading, setRentActionLoading] = useState(false);

  // Review states
  const [buyerReviews, setBuyerReviews] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewErrorMsg, setReviewErrorMsg] = useState<string | null>(null);

  const handleCloseReviewModal = () => {
    setShowReviewModal(null);
    setReviewRating(5);
    setReviewComment("");
    setReviewErrorMsg(null);
  };

  const handleReviewSubmit = async () => {
    if (!showReviewModal || !session?.access_token) return;
    setReviewSubmitting(true);
    setReviewErrorMsg(null);
    try {
      const response = await fetch("/api/reviews/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          order_id: showReviewModal.id,
          rating: reviewRating,
          comment: reviewComment || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Erreur lors de la soumission de l’avis.");
      }

      handleCloseReviewModal();
      loadOrders();
    } catch (err: any) {
      setReviewErrorMsg(err.message || "Une erreur est survenue.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const loadOrders = async () => {
    if (!user) return;
    setLoadingData(true);
    setErrorMsg(null);
    try {
      // 1. Load purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("orders")
        .select("*, artworks(*)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (purchasesError) throw purchasesError;
      setPurchases(purchasesData as Order[]);

      // 1.5 Load reviews left by this buyer
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("id, order_id, rating, comment, is_approved")
        .eq("buyer_id", user.id);
      
      if (!reviewsError && reviewsData) {
        setBuyerReviews(reviewsData);
      }

      // 2. Load sales if user is an artist
      if (profile?.role === "artist") {
        const { data: salesData, error: salesError } = await supabase
          .from("orders")
          .select("*, artworks!inner(*)")
          .eq("artworks.artist_id", user.id)
          .order("created_at", { ascending: false });

        if (salesError) throw salesError;
        setSales(salesData as Order[]);
      }

      // 3. Load rentals
      if (profile?.role === "artist") {
        const { data: artistRentals, error: artistRentalsError } = await supabase
          .from("rentals")
          .select("*, artworks!inner(*), rental_payments(*)")
          .eq("artworks.artist_id", user.id)
          .order("created_at", { ascending: false });

        const { data: buyerRentals, error: buyerRentalsError } = await supabase
          .from("rentals")
          .select("*, artworks(*), rental_payments(*)")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

        if (artistRentalsError) throw artistRentalsError;
        if (buyerRentalsError) throw buyerRentalsError;

        const merged = [...(buyerRentals || [])];
        (artistRentals || []).forEach((r: any) => {
          if (!merged.some((m) => m.id === r.id)) {
            merged.push(r);
          }
        });
        setRentals(merged);
      } else {
        const { data: buyerRentals, error: buyerRentalsError } = await supabase
          .from("rentals")
          .select("*, artworks(*), rental_payments(*)")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

        if (buyerRentalsError) throw buyerRentalsError;
        setRentals(buyerRentals || []);
      }
    } catch (err: any) {
      console.error("Error loading orders:", err);
      setErrorMsg(err.message || "Erreur de chargement des commandes.");
    } finally {
      setLoadingData(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      loadOrders();
    }
  }, [authLoading, isAuthenticated, user, profile]);

  const handleConfirmShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showShipModal || !carrier || !trackingNumber || !session?.access_token) return;
    setActionLoading(showShipModal.id);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/orders/${showShipModal.id}/ship`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ carrier, tracking_number: trackingNumber }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Erreur de mise à jour.");
      }

      setShowShipModal(null);
      setCarrier("");
      setTrackingNumber("");
      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadLabel = async (orderId: string) => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`/api/orders/${orderId}/label`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Erreur de téléchargement de l’étiquette.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shipping_label_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de la génération du PDF.");
    }
  };

  const handleConfirmReceipt = async (orderId: string) => {
    if (!session?.access_token) return;
    setActionLoading(orderId);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Erreur de validation de réception.");
      }

      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDisputeModal || disputeReason.trim().length < 10 || !session?.access_token) return;
    setActionLoading(showDisputeModal.id);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/orders/${showDisputeModal.id}/dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: disputeReason }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Erreur de signalement du litige.");
      }

      setShowDisputeModal(null);
      setDisputeReason("");
      loadOrders();
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue.");
    } finally {
      setActionLoading(null);
    }
  };

  // Pay rent action flow
  const handlePayRentSubmit = async () => {
    if (!showPayRentModal || !session?.access_token) return;
    setRentActionLoading(true);
    setRentServerError(null);
    try {
      const response = await fetch(`/api/rentals/${showPayRentModal.rental_id}/pay-rent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ payment_id: showPayRentModal.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Erreur lors du règlement du loyer.");
      }

      setRentSimulationStep("success");
      setTimeout(() => {
        setShowPayRentModal(null);
        setRentPinCode("");
        loadOrders();
      }, 1500);
    } catch (err: any) {
      setRentServerError(err.message);
      setRentSimulationStep("error");
    } finally {
      setRentActionLoading(false);
    }
  };

  // Buyout option action flow
  const handleBuyoutSubmit = async () => {
    if (!showBuyoutModal || !session?.access_token) return;
    setRentActionLoading(true);
    setRentServerError(null);
    try {
      const response = await fetch(`/api/rentals/${showBuyoutModal.id}/buyout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Erreur lors de la levée de l'option d'achat.");
      }

      setRentSimulationStep("success");
      setTimeout(() => {
        setShowBuyoutModal(null);
        setRentPinCode("");
        loadOrders();
      }, 1500);
    } catch (err: any) {
      setRentServerError(err.message);
      setRentSimulationStep("error");
    } finally {
      setRentActionLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral text-sm">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <TransactionalLayout backHref="/" backLabel="Retour au Catalogue">
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <ShieldAlert className="w-16 h-16 text-neutral/45 mb-6" />
          <h1 className="font-serif text-2xl font-bold mb-3">Connexion requise</h1>
          <p className="text-neutral text-sm mb-8">
            Vous devez être connecté pour accéder à votre tableau de bord de suivi de commandes et locations.
          </p>
          <Link
            href="/login?redirect=/dashboard/orders"
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 flex items-center justify-center text-sm"
          >
            Se Connecter
          </Link>
        </main>
      </TransactionalLayout>
    );
  }

  return (
    <TransactionalLayout backHref="/" backLabel="Retour au Catalogue">

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-dark">Suivi des commandes & locations</h1>
            <p className="text-neutral text-xs mt-1">Gérez vos achats, expéditions d’œuvres et locations avec option d’achat.</p>
          </div>
          <button
            onClick={loadOrders}
            className="flex items-center gap-1.5 border border-border bg-card hover:bg-secondary/5 text-xs font-semibold py-2 px-3 rounded shadow-sm cursor-pointer"
            style={{ minHeight: "44px" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rafraîchir
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-error p-4 rounded-lg flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-8 gap-6 text-sm font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab("purchases")}
            className={`pb-3 relative transition-all cursor-pointer h-10 shrink-0 ${
              activeTab === "purchases" ? "text-primary border-b-2 border-primary" : "text-neutral hover:text-dark"
            }`}
          >
            Mes Achats ({purchases.length})
          </button>
          {profile?.role === "artist" && (
            <button
              onClick={() => setActiveTab("sales")}
              className={`pb-3 relative transition-all cursor-pointer h-10 shrink-0 ${
                activeTab === "sales" ? "text-primary border-b-2 border-primary" : "text-neutral hover:text-dark"
              }`}
            >
              Mes Ventes ({sales.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab("rentals")}
            className={`pb-3 relative transition-all cursor-pointer h-10 shrink-0 ${
              activeTab === "rentals" ? "text-primary border-b-2 border-primary" : "text-neutral hover:text-dark"
            }`}
          >
            Mes Locations ({rentals.length})
          </button>
        </div>

        {/* Display List */}
        {loadingData ? (
          <div className="text-center py-20 bg-card border border-border rounded-xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-neutral text-sm">Chargement des données...</p>
          </div>
        ) : (
          <div>
            {/* 1. PURCHASES VIEW */}
            {activeTab === "purchases" && (
              purchases.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-xl">
                  <Package className="w-12 h-12 text-neutral/40 mx-auto mb-4" />
                  <p className="text-neutral font-medium mb-1">Aucun achat enregistré</p>
                  <p className="text-neutral text-xs mb-6">Vous n’avez pas encore effectué d’achat.</p>
                  <Link href="/" className="bg-primary text-white text-xs font-semibold py-2 px-4 rounded hover:bg-primary-dark shadow">
                    Découvrir des œuvres
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {purchases.map((order) => (
                    <div key={order.id} className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                      {/* Top Bar */}
                      <div className="bg-secondary/10 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center border-b border-border/60 gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs text-neutral">Commande du {new Date(order.created_at).toLocaleDateString("fr-FR")}</p>
                          <p className="text-xs font-mono text-neutral/80">ID: {order.id}</p>
                        </div>
                        <div className="flex gap-2">
                          <DeliveryBadge status={order.delivery_status} />
                          <EscrowBadge status={order.escrow_status} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-gradient-to-tr from-amber-600 to-orange-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-white/50 text-[10px] italic">
                            {order.artworks?.photos?.[0] ? (
                              <img src={order.artworks.photos[0]} alt={order.artworks.title} className="w-full h-full object-cover" />
                            ) : (
                              <span>No Photo</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-serif font-bold text-dark text-base">{order.artworks?.title}</h4>
                            <p className="text-xs text-neutral">Catégorie: {order.artworks?.category}</p>
                            <p className="text-sm font-bold text-primary">{Number(order.amount).toLocaleString()} FCFA</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-border/60 w-full md:w-auto">
                          {order.delivery_status !== "pending" && (
                            <Link
                              href={`/orders/${order.id}/track`}
                              className="border border-[#b89754] text-[#b89754] hover:bg-[#faf6ed] text-xs font-semibold py-2.5 px-4 rounded transition-all flex items-center justify-center gap-1.5 h-10 min-w-44 text-center cursor-pointer font-bold"
                              style={{ minHeight: "44px" }}
                            >
                              <Truck className="w-4 h-4" />
                              Suivre le colis
                            </Link>
                          )}

                          {order.delivery_status === "shipped" && (
                            <button
                              onClick={() => handleConfirmReceipt(order.id)}
                              disabled={actionLoading === order.id}
                              className="bg-success hover:bg-success-dark text-white text-xs font-semibold py-2.5 px-4 rounded transition-all shadow flex items-center justify-center gap-1.5 h-10 min-w-44 cursor-pointer"
                              style={{ minHeight: "44px" }}
                            >
                              {actionLoading === order.id ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Réception conforme
                            </button>
                          )}

                          {(order.delivery_status === "shipped" || order.delivery_status === "delivered") && (
                            <button
                              onClick={() => setShowDisputeModal(order)}
                              disabled={actionLoading === order.id}
                              className="border border-error text-error hover:bg-red-50 text-xs font-semibold py-2.5 px-4 rounded transition-all flex items-center justify-center gap-1.5 h-10 min-w-44 disabled:opacity-50 cursor-pointer"
                            >
                              <ShieldAlert className="w-4 h-4" />
                              Signaler un litige
                            </button>
                          )}
                          
                          {order.delivery_status === "disputed" && (
                            <div className="text-xs bg-red-50 border border-red-200 text-error p-3 rounded max-w-[200px] flex items-start gap-1.5 font-medium leading-relaxed">
                              <ShieldAlert className="w-4 h-4 text-error shrink-0" />
                              <span>Litige en cours. L’administration analyse les pièces justificatives.</span>
                            </div>
                          )}

                          {order.delivery_status === "delivered" && order.escrow_status === "released" && (
                             <div className="flex flex-col gap-2">
                               <div className="text-xs bg-green-50 border border-green-200 text-success p-3 rounded max-w-[200px] flex items-start gap-1.5 font-medium leading-relaxed">
                                 <CheckCircle className="w-4 h-4 text-success shrink-0" />
                                 <span>Vente finalisée. Certificat blockchain enregistré.</span>
                               </div>
                               <Link
                                 href={`/certificates/${order.id}`}
                                 className="text-xs font-semibold bg-[#b89754] text-white hover:bg-[#a38344] py-2 px-3 rounded shadow transition-all flex items-center justify-center gap-1.5 h-10 w-full min-w-44 text-center cursor-pointer font-bold"
                                 style={{ minHeight: "44px" }}
                               >
                                 Voir le Certificat
                               </Link>

                                {(() => {
                                  const review = buyerReviews.find((r) => r.order_id === order.id);
                                  if (!review) {
                                    return (
                                      <button
                                        onClick={() => setShowReviewModal(order)}
                                        className="text-xs font-semibold bg-primary hover:bg-primary-dark text-white py-2.5 px-3 rounded shadow transition-all flex items-center justify-center gap-1.5 h-10 w-full min-w-44 text-center cursor-pointer"
                                        style={{ minHeight: "44px" }}
                                      >
                                        <Star className="w-4 h-4" />
                                        Laisser un avis
                                      </button>
                                    );
                                  } else if (review.is_approved) {
                                    return (
                                      <div className="text-xs bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded max-w-[200px] flex items-start gap-1.5 font-medium leading-relaxed">
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                                        <span>Avis publié ({review.rating}/5★)</span>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded max-w-[200px] flex items-start gap-1.5 font-medium leading-relaxed">
                                        <Star className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>Avis en attente de modération</span>
                                      </div>
                                    );
                                  }
                                })()}
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* 2. SALES VIEW (Artists only) */}
            {activeTab === "sales" && profile?.role === "artist" && (
              sales.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-xl">
                  <Package className="w-12 h-12 text-neutral/40 mx-auto mb-4" />
                  <p className="text-neutral font-medium mb-1">Aucune vente enregistrée</p>
                  <p className="text-neutral text-xs">Vos créations apparaîtront ici dès qu’un acheteur passera commande.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sales.map((order) => (
                    <div key={order.id} className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                      {/* Top Bar */}
                      <div className="bg-secondary/10 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center border-b border-border/60 gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs text-neutral">Commande du {new Date(order.created_at).toLocaleDateString("fr-FR")}</p>
                          <p className="text-xs font-mono text-neutral/80">ID: {order.id}</p>
                        </div>
                        <div className="flex gap-2">
                          <DeliveryBadge status={order.delivery_status} />
                          <EscrowBadge status={order.escrow_status} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-gradient-to-tr from-amber-600 to-orange-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-white/50 text-[10px] italic">
                            {order.artworks?.photos?.[0] ? (
                              <img src={order.artworks.photos[0]} alt={order.artworks.title} className="w-full h-full object-cover" />
                            ) : (
                              <span>No Photo</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-serif font-bold text-dark text-base">{order.artworks?.title}</h4>
                            <p className="text-xs text-neutral">Catégorie: {order.artworks?.category}</p>
                            <p className="text-sm font-bold text-primary">{Number(order.amount).toLocaleString()} FCFA</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-border/60">
                          {order.delivery_status === "pending" && (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => setShowShipModal(order)}
                                disabled={actionLoading === order.id}
                                className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-2.5 px-4 rounded transition-all shadow flex items-center justify-center gap-1.5 h-10 min-w-44 cursor-pointer"
                                style={{ minHeight: "44px" }}
                              >
                                <Truck className="w-4 h-4" />
                                Confirmer l’expédition
                              </button>
                              <button
                                onClick={() => handleDownloadLabel(order.id)}
                                className="border border-[#b89754] text-[#b89754] hover:bg-[#faf6ed] text-xs font-semibold py-2 px-4 rounded transition-all flex items-center justify-center gap-1.5 h-10 min-w-44 cursor-pointer"
                                style={{ minHeight: "44px" }}
                              >
                                <Package className="w-4 h-4" />
                                Télécharger l’étiquette
                              </button>
                            </div>
                          )}

                          {order.delivery_status === "shipped" && (
                            <div className="text-xs bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded max-w-[200px] flex items-start gap-1.5 font-medium leading-relaxed">
                              <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                              <span>En attente de réception et de validation par l’acheteur.</span>
                            </div>
                          )}

                           {order.delivery_status === "delivered" && (
                             <div className="flex flex-col gap-2">
                               <div className="text-xs bg-green-50 border border-green-200 text-success p-3 rounded max-w-[200px] flex items-start gap-1.5 font-medium leading-relaxed">
                                 <CheckCircle className="w-4 h-4 text-success shrink-0" />
                                 <span>Revenu transféré sur votre compte Mobile Money.</span>
                               </div>
                               <Link
                                 href={`/certificates/${order.id}`}
                                 className="text-xs font-semibold border border-[#b89754] text-[#b89754] hover:bg-[#faf6ed] py-2 px-3 rounded transition-all flex items-center justify-center gap-1.5 h-10 w-full min-w-44 text-center cursor-pointer font-bold"
                                 style={{ minHeight: "44px" }}
                               >
                                 Voir le Certificat
                               </Link>
                             </div>
                           )}

                          {order.delivery_status === "disputed" && (
                            <div className="text-xs bg-red-50 border border-red-200 text-error p-3 rounded max-w-[200px] flex items-start gap-1.5 font-medium leading-relaxed">
                              <ShieldAlert className="w-4 h-4 text-error shrink-0" />
                              <span>Litige en cours. L’administration étudie la contestation de l’acheteur.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* 3. RENTALS VIEW */}
            {activeTab === "rentals" && (
              rentals.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-xl">
                  <Calendar className="w-12 h-12 text-neutral/40 mx-auto mb-4" />
                  <p className="text-neutral font-medium mb-1">Aucune location enregistrée</p>
                  <p className="text-neutral text-xs mb-6">Vous n’avez aucun contrat de location actif.</p>
                  <Link href="/" className="bg-primary text-white text-xs font-semibold py-2 px-4 rounded hover:bg-primary-dark shadow">
                    Louer une œuvre
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {rentals.map((rental) => {
                    const isBuyer = rental.buyer_id === user?.id;
                    const payments = rental.rental_payments || [];
                    
                    // Find next pending payment
                    const sortedPayments = [...payments].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                    const nextPending = sortedPayments.find(p => p.payment_status === "pending" || p.payment_status === "overdue");
                    
                    // Calculate paid sum and buyout price
                    const totalPaid = payments
                      .filter((p: any) => p.payment_status === "paid")
                      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                    const artworkPrice = Number(rental.artworks?.price || 0);
                    const buyoutPrice = Math.max(0, artworkPrice - totalPaid);

                    return (
                      <div key={rental.id} className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
                        {/* Top Bar */}
                        <div className="bg-secondary/10 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center border-b border-border/60 gap-2">
                          <div className="space-y-0.5">
                            <p className="text-xs text-neutral">
                              Contrat initié le {new Date(rental.start_date).toLocaleDateString("fr-FR")} ({rental.duration_months} mois)
                            </p>
                            <p className="text-xs font-mono text-neutral/80">ID Contrat: {rental.id}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              rental.status === "active" ? "bg-blue-50 border-blue-200 text-blue-800" :
                              rental.status === "completed" ? "bg-neutral-100 border-neutral-300 text-neutral-800" :
                              rental.status === "purchased" ? "bg-green-50 border-green-200 text-green-800" :
                              "bg-red-50 border-red-200 text-red-800"
                            }`}>
                              {rental.status === "active" ? "Location Active" :
                               rental.status === "completed" ? "Terminée" :
                               rental.status === "purchased" ? "Achetée définitivement" :
                               "Annulée"}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-800">
                              Loyer: {Number(rental.monthly_rate).toLocaleString()} FCFA / mois
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                          <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center pb-6 border-b border-border/40">
                            <div className="flex gap-4">
                              <div className="w-20 h-20 bg-gradient-to-tr from-amber-600 to-orange-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-white/50 text-[10px] italic">
                                {rental.artworks?.photos?.[0] ? (
                                  <img src={rental.artworks.photos[0]} alt={rental.artworks.title} className="w-full h-full object-cover" />
                                ) : (
                                  <span>No Photo</span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-serif font-bold text-dark text-base">{rental.artworks?.title}</h4>
                                <p className="text-xs text-neutral">Artiste: {rental.artworks?.artist_name || "Créateur Sankofa"}</p>
                                <p className="text-xs text-neutral">Valeur marchande originale: {artworkPrice.toLocaleString()} FCFA</p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                              {isBuyer && rental.status === "purchased" && (
                                <Link
                                  href={`/certificates/${rental.id}`}
                                  className="text-xs font-semibold bg-[#b89754] text-white hover:bg-[#a38344] py-2.5 px-4 rounded shadow transition-all flex items-center justify-center gap-1.5 h-10 min-w-44 text-center cursor-pointer font-bold"
                                  style={{ minHeight: "44px" }}
                                >
                                  Voir le Certificat
                                </Link>
                              )}

                              {isBuyer && (rental.status === "active" || rental.status === "completed") && (
                                <>
                                  {nextPending && (
                                    <button
                                      onClick={() => {
                                        setShowPayRentModal(nextPending);
                                        setRentSimulationStep("push");
                                      }}
                                      className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-2.5 px-4 rounded transition-all shadow flex items-center justify-center gap-1.5 h-10 min-w-44 cursor-pointer"
                                    >
                                      Payer le loyer suivant ({Number(nextPending.amount).toLocaleString()} FCFA)
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setShowBuyoutModal(rental);
                                      setRentSimulationStep("push");
                                    }}
                                    className="bg-[#b89754] hover:bg-[#a38344] text-white text-xs font-semibold py-2.5 px-4 rounded transition-all shadow flex items-center justify-center gap-1.5 h-10 min-w-44 cursor-pointer"
                                  >
                                    Lever l’option d’achat ({buyoutPrice.toLocaleString()} FCFA)
                                  </button>
                                </>
                              )}

                              {!isBuyer && (
                                <div className="text-xs bg-secondary/20 text-neutral p-3 rounded max-w-[200px] leading-relaxed font-medium">
                                  {rental.status === "purchased" 
                                    ? "L'œuvre a été acquise définitivement par le locataire."
                                    : "Vous percevez les loyers mensuels de cette location."
                                  }
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Payments Timeline */}
                          <div className="space-y-3">
                            <span className="text-[10px] uppercase tracking-wider text-neutral font-semibold block">Échéancier des loyers</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {sortedPayments.map((p: any, idx) => (
                                <div key={p.id} className="border border-border/60 rounded-lg p-3 flex justify-between items-center bg-card shadow-sm text-xs">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-neutral">Échéance {idx + 1}</p>
                                    <p className="text-[10px] text-neutral/85">Dû le {new Date(p.due_date).toLocaleDateString("fr-FR")}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-dark">{Number(p.amount).toLocaleString()} FCFA</p>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border inline-block mt-1 ${
                                      p.payment_status === "paid" ? "bg-green-50 border-green-200 text-success" :
                                      p.payment_status === "overdue" ? "bg-red-50 border-red-200 text-error" :
                                      "bg-amber-50 border-amber-200 text-amber-700"
                                    }`}>
                                      {p.payment_status === "paid" ? "Payé" : p.payment_status === "overdue" ? "En retard" : "En attente"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* Pay Rent Simulator Overlay */}
      {showPayRentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-hover max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="bg-primary text-white p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Paynote Sandbox</span>
              <h3 className="font-serif text-lg font-bold">Règlement du loyer mensuel</h3>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {rentSimulationStep === "push" && (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <h4 className="font-bold text-dark">Lancement de la simulation...</h4>
                  <p className="text-neutral text-xs">
                    Demande de débit push Mobile Money initiée pour le règlement de la mensualité de <span className="font-bold text-dark">{Number(showPayRentModal.amount).toLocaleString()} FCFA</span>.
                  </p>
                  <button
                    onClick={() => setRentSimulationStep("pin")}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 cursor-pointer"
                  >
                    Saisir le code PIN USSD
                  </button>
                </div>
              )}

              {rentSimulationStep === "pin" && (
                <div className="space-y-4 text-center">
                  <h4 className="font-bold text-dark">Saisie du code PIN Mobile Money</h4>
                  <p className="text-neutral text-xs leading-relaxed">
                    Saisissez votre code secret à 4 chiffres pour autoriser le paiement de <span className="font-bold text-dark">{Number(showPayRentModal.amount).toLocaleString()} FCFA</span>.
                  </p>
                  <div className="flex justify-center">
                    <input
                      type="password"
                      maxLength={4}
                      value={rentPinCode}
                      onChange={(e) => setRentPinCode(e.target.value.replace(/\D/g, ""))}
                      className="border-2 border-border focus:border-primary rounded-md w-36 h-12 text-center text-xl font-bold tracking-widest focus:outline-none"
                      placeholder="••••"
                    />
                  </div>
                  <button
                    onClick={handlePayRentSubmit}
                    disabled={rentPinCode.length < 4 || rentActionLoading}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {rentActionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Valider le paiement
                  </button>
                </div>
              )}

              {rentSimulationStep === "success" && (
                <div className="text-center space-y-3 py-4">
                  <div className="w-12 h-12 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <h4 className="font-bold text-success-dark">Paiement Reçu</h4>
                  <p className="text-neutral text-xs">La mensualité a été réglée avec succès.</p>
                </div>
              )}

              {rentSimulationStep === "error" && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-12 h-12 bg-error/15 text-error rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    !
                  </div>
                  <h4 className="font-bold text-error-dark">Échec du paiement</h4>
                  <p className="text-neutral text-xs">{rentServerError || "La transaction a échoué."}</p>
                  <button
                    onClick={() => setShowPayRentModal(null)}
                    className="w-full border border-border text-dark text-xs py-2.5 rounded hover:bg-secondary/5 font-semibold cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Buyout Simulator Overlay */}
      {showBuyoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-hover max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="bg-[#b89754] text-white p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Paynote Sandbox</span>
              <h3 className="font-serif text-lg font-bold">Option d’achat (Acquisition)</h3>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {rentSimulationStep === "push" && (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <h4 className="font-bold text-dark">Lancement de la simulation...</h4>
                  <p className="text-neutral text-xs">
                    Demande de débit push Mobile Money initiée pour le règlement du solde restant d’acquisition.
                  </p>
                  <button
                    onClick={() => setRentSimulationStep("pin")}
                    className="w-full bg-[#b89754] hover:bg-[#a38344] text-white font-medium py-3 rounded shadow transition-all h-11 cursor-pointer"
                  >
                    Saisir le code PIN USSD
                  </button>
                </div>
              )}

              {rentSimulationStep === "pin" && (
                <div className="space-y-4 text-center">
                  <h4 className="font-bold text-dark">Saisie du code PIN Mobile Money</h4>
                  <p className="text-neutral text-xs leading-relaxed">
                    Saisissez votre code secret à 4 chiffres pour confirmer l’achat définitif de l’œuvre.
                  </p>
                  <div className="flex justify-center">
                    <input
                      type="password"
                      maxLength={4}
                      value={rentPinCode}
                      onChange={(e) => setRentPinCode(e.target.value.replace(/\D/g, ""))}
                      className="border-2 border-border focus:border-primary rounded-md w-36 h-12 text-center text-xl font-bold tracking-widest focus:outline-none"
                      placeholder="••••"
                    />
                  </div>
                  <button
                    onClick={handleBuyoutSubmit}
                    disabled={rentPinCode.length < 4 || rentActionLoading}
                    className="w-full bg-[#b89754] hover:bg-[#a38344] text-white font-medium py-3 rounded shadow transition-all h-11 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {rentActionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Valider le paiement de solde
                  </button>
                </div>
              )}

              {rentSimulationStep === "success" && (
                <div className="text-center space-y-3 py-4">
                  <div className="w-12 h-12 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <h4 className="font-bold text-success-dark">Achat Confirmé !</h4>
                  <p className="text-neutral text-xs">Félicitations, vous êtes le propriétaire légal de cette œuvre. Le certificat blockchain a été émis.</p>
                </div>
              )}

              {rentSimulationStep === "error" && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-12 h-12 bg-error/15 text-error rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    !
                  </div>
                  <h4 className="font-bold text-error-dark">Échec de la transaction</h4>
                  <p className="text-neutral text-xs">{rentServerError || "La transaction a échoué."}</p>
                  <button
                    onClick={() => setShowBuyoutModal(null)}
                    className="w-full border border-border text-dark text-xs py-2.5 rounded hover:bg-secondary/5 font-semibold cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal Overlay */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-hover max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="bg-primary text-white p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Avis & Évaluation</span>
              <h3 className="font-serif text-lg font-bold">Laisser un avis sur l’artiste</h3>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <p className="text-xs text-neutral">Vous évaluez l’artiste pour l’œuvre :</p>
                <h4 className="font-serif font-bold text-dark text-base">
                  {showReviewModal.artworks?.title}
                </h4>
              </div>

              {/* Rating selection (stars) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral block text-center">Note de l’artiste</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 focus:outline-none hover:scale-110 transition-transform cursor-pointer"
                      style={{ minWidth: "44px", minHeight: "44px" }}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= reviewRating ? "text-amber-500 fill-amber-500" : "text-neutral/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral block">
                  Votre commentaire (optionnel)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full border border-border focus:border-primary rounded-md p-3 text-sm focus:outline-none bg-card"
                  rows={4}
                  placeholder="Partagez votre expérience avec cet artiste..."
                  maxLength={1000}
                />
              </div>

              {/* Error message */}
              {reviewErrorMsg && (
                <div className="bg-red-50 border border-red-200 text-error p-3 rounded text-xs">
                  {reviewErrorMsg}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseReviewModal}
                  className="flex-1 border border-border text-dark text-xs py-2.5 rounded hover:bg-secondary/5 font-semibold h-11 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  disabled={reviewSubmitting}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-2.5 rounded transition-all shadow flex items-center justify-center gap-1.5 h-11 cursor-pointer"
                >
                  {reviewSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Soumettre l’avis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Confirmation Modal Overlay */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-hover max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="bg-primary text-white p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Logistique Sankofa</span>
              <h3 className="font-serif text-lg font-bold">Confirmer l’expédition</h3>
            </div>

            <form onSubmit={handleConfirmShipping} className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-1">
                <p className="text-xs text-neutral">Vous expédiez l’œuvre :</p>
                <h4 className="font-serif font-bold text-dark text-base">{showShipModal.artworks?.title}</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral block">Transporteur partenaire</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    required
                    className="w-full border border-border focus:border-primary rounded-md p-3 text-sm focus:outline-none bg-card"
                    style={{ minHeight: "44px" }}
                  >
                    <option value="">Sélectionnez un transporteur...</option>
                    <option value="DHL">DHL Express</option>
                    <option value="Creseada">Creseada Logistics</option>
                    <option value="Sankofa Express Hub">SANKOFA Express Hub</option>
                    <option value="Colis Express">Colis Express Partners</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral block">Numéro de suivi du colis</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Ex: SKF-123456789"
                    required
                    className="w-full border border-border focus:border-primary rounded-md p-3 text-sm focus:outline-none bg-card"
                    style={{ minHeight: "44px" }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowShipModal(null);
                    setCarrier("");
                    setTrackingNumber("");
                  }}
                  className="flex-1 border border-border text-dark text-xs py-2.5 rounded hover:bg-secondary/5 font-semibold h-11 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === showShipModal.id}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-2.5 rounded transition-all shadow flex items-center justify-center gap-1.5 h-11 cursor-pointer"
                >
                  {actionLoading === showShipModal.id && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                  Expédier le colis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Modal Overlay */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-red-600 text-white p-5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Médiation & Litiges</span>
            <h3 className="font-serif text-lg font-bold">Signaler un litige</h3>
          </div>

          <form
            onSubmit={handleOpenDispute}
            className="p-6 sm:p-8 space-y-6"
          >
            <div className="text-center space-y-1">
              <p className="text-xs text-neutral">Contestation concernant la commande :</p>
              <h4 className="font-serif font-bold text-dark text-base">{showDisputeModal.artworks?.title}</h4>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral block">Motif détaillé du litige</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                required
                rows={4}
                placeholder="Décrivez précisément le problème rencontré (ex: œuvre cassée, non conforme...) - Minimum 10 caractères."
                className="w-full border border-border focus:border-primary rounded-md p-3 text-sm focus:outline-none bg-card"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDisputeModal(null);
                  setDisputeReason("");
                }}
                className="flex-1 border border-border text-dark text-xs py-2.5 rounded hover:bg-secondary/5 font-semibold h-11 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={disputeReason.trim().length < 10 || actionLoading === showDisputeModal.id}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2.5 rounded transition-all shadow flex items-center justify-center gap-1.5 h-11 cursor-pointer"
              >
                {actionLoading === showDisputeModal.id && <Loader2 className="w-4 h-4 animate-spin" />}
                Lancer la procédure
              </button>
            </div>
          </form>
        </div>
      )}

    </TransactionalLayout>
  );
}

// Helpers badging components
function DeliveryBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "En attente",
    shipped: "Expédié",
    delivered: "Livré",
    disputed: "Litige",
    returned: "Retourné",
  };
  const colors: Record<string, string> = {
    pending: "bg-amber-50 border-amber-200 text-amber-800",
    shipped: "bg-blue-50 border-blue-200 text-blue-800",
    delivered: "bg-green-50 border-green-200 text-green-800",
    disputed: "bg-red-50 border-red-200 text-error",
    returned: "bg-purple-50 border-purple-200 text-purple-800",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${colors[status] || "bg-neutral-50"}`}>
      {labels[status] || status}
    </span>
  );
}

function EscrowBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    none: "Sans séquestre",
    held: "Fonds séquestrés",
    released: "Libéré",
    refunded: "Remboursé",
  };
  const colors: Record<string, string> = {
    none: "bg-neutral-50 border-neutral-200 text-neutral-500",
    held: "bg-amber-50 border-amber-200 text-amber-800",
    released: "bg-green-50 border-green-200 text-green-800",
    refunded: "bg-red-50 border-red-200 text-error",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${colors[status] || "bg-neutral-50"}`}>
      {labels[status] || status}
    </span>
  );
}

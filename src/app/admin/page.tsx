"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  UserCheck, 
  Sparkles, 
  Activity, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  ExternalLink,
  Loader2,
  Scale,
  DollarSign,
  Gavel,
  RefreshCw,
  Star,
  Download,
  Calendar,
  Search,
  Ban
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import TransactionalLayout from "@/components/layout/TransactionalLayout";

export default function AdminDashboard() {
  const { session, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"kyc" | "curation" | "audit" | "kpis" | "litigations" | "reviews" | "utilisateurs">("kpis");
  
  // States for database entities
  const [pendingArtists, setPendingArtists] = useState<any[]>([]);
  const [pendingArtworks, setPendingArtworks] = useState<any[]>([]);
  const [litigations, setLitigations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  
  // New States for Step 11
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState("");
  const [filterUserRole, setFilterUserRole] = useState<"all" | "buyer" | "artist" | "admin" | "curator">("all");
  const [filterUserStatus, setFilterUserStatus] = useState<"all" | "active" | "suspended">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [kpis, setKpis] = useState({
    gmv: 0,
    averageBasket: 0,
    disputeRate: 0,
    artistsCount: 0,
  });

  const [loadingData, setLoadingData] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection modals state
  const [rejectType, setRejectType] = useState<"kyc" | "artwork" | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Initialize dates: first day of month and today
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    setStartDate(formatDate(firstDay));
    setEndDate(formatDate(today));
  }, []);

  // Recalculate KPIs based on date filters and orders
  useEffect(() => {
    if (allOrders.length === 0) {
      setKpis(prev => ({ ...prev, gmv: 0, averageBasket: 0, disputeRate: 0 }));
      return;
    }

    const filtered = allOrders.filter(o => {
      const orderDate = new Date(o.created_at);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
      return true;
    });

    const activeOrders = filtered.filter(o => ["held", "released"].includes(o.escrow_status));
    const totalGmv = activeOrders.reduce((sum, o) => sum + Number(o.amount), 0);
    const avgBasket = activeOrders.length > 0 ? totalGmv / activeOrders.length : 0;

    const filteredLitigations = litigations.filter(l => {
      const litDate = new Date(l.created_at);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (litDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (litDate > end) return false;
      }
      return true;
    });

    const filteredTotalOrders = filtered.length;
    const disputeRateVal = filteredTotalOrders > 0 && filteredLitigations.length > 0
      ? (filteredLitigations.length / filteredTotalOrders) * 100
      : 0;

    setKpis(prev => ({
      ...prev,
      gmv: totalGmv,
      averageBasket: avgBasket,
      disputeRate: disputeRateVal,
    }));
  }, [allOrders, startDate, endDate, litigations]);

  // CSV Exporter for activity reports
  const exportKpisToCsv = () => {
    const filtered = allOrders.filter(o => {
      const orderDate = new Date(o.created_at);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      alert("Aucune donnée à exporter pour la période sélectionnée.");
      return;
    }

    const headers = [
      "Date",
      "ID Commande",
      "Montant (FCFA)",
      "Commission (FCFA)",
      "Ville de livraison",
      "Statut de livraison"
    ];

    const rows = filtered.map(o => {
      const commission = (Number(o.amount) * 0.10).toFixed(2);
      const deliveryCity = o.shipping_address?.city || "Autre";
      return [
        new Date(o.created_at).toLocaleDateString("fr-FR"),
        o.id,
        o.amount,
        commission,
        deliveryCity,
        o.delivery_status
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sankofa_rapport_activite_${startDate || "debut"}_a_${endDate || "fin"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUserSuspension = async (targetUserId: string, isSuspended: boolean) => {
    if (!session?.access_token) return;
    
    const confirmMsg = isSuspended
      ? "Êtes-vous sûr de vouloir suspendre cet utilisateur ? Ses œuvres publiées seront automatiquement dépubliées."
      : "Êtes-vous sûr de vouloir réactiver cet utilisateur ?";
      
    if (!window.confirm(confirmMsg)) return;

    setIsActionSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch("/api/admin/users/suspend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: targetUserId,
          is_suspended: isSuspended,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Une erreur est survenue lors de la suspension.");
      }

      setActionSuccess(
        isSuspended
          ? "L’utilisateur a été suspendu et ses œuvres ont été dépubliées."
          : "L’utilisateur a été réactivé avec succès."
      );
      loadAdminData();
    } catch (err: any) {
      setActionError(err.message || "Une erreur est survenue.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleReviewModerate = async (reviewId: string, action: "approve" | "reject") => {
    if (!session?.access_token) return;
    setIsActionSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch("/api/admin/reviews/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          review_id: reviewId,
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erreur de modération.");
      }

      setActionSuccess(
        action === "approve"
          ? "L’avis a été approuvé avec succès."
          : "L’avis a été rejeté et supprimé."
      );
      loadAdminData();
    } catch (err: any) {
      setActionError(err.message || "Une erreur est survenue.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const loadAdminData = async () => {
    if (!session?.access_token) return;
    setLoadingData(true);
    setActionError(null);
    try {
      // 1. Fetch pending artists
      const { data: artists, error: errArtists } = await supabase
        .from("artists")
        .select("*, profiles(*)")
        .eq("kyc_status", "pending");
      
      if (!errArtists && artists) {
        const mappedArtists = await Promise.all(artists.map(async (a: any) => {
          let cniUrl = a.cni_url;
          let selfieUrl = a.selfie_url;

          if (cniUrl && !cniUrl.startsWith("http")) {
            const { data: cniData } = await supabase.storage
              .from("kyc-documents")
              .createSignedUrl(cniUrl, 3600);
            if (cniData?.signedUrl) cniUrl = cniData.signedUrl;
          }

          if (selfieUrl && !selfieUrl.startsWith("http")) {
            const { data: selfieData } = await supabase.storage
              .from("kyc-documents")
              .createSignedUrl(selfieUrl, 3600);
            if (selfieData?.signedUrl) selfieUrl = selfieData.signedUrl;
          }

          return {
            id: a.id,
            first_name: a.profiles?.first_name || "",
            last_name: a.profiles?.last_name || "",
            email: a.profiles?.email || "",
            country: a.country,
            city: a.city,
            cni_url: cniUrl,
            selfie_url: selfieUrl,
          };
        }));
        setPendingArtists(mappedArtists);
      }

      // 2. Fetch pending artworks
      const { data: artworksData, error: errArtworks } = await supabase
        .from("artworks")
        .select("*, artists(profiles(*))")
        .eq("status", "pending_curation");

      if (!errArtworks && artworksData) {
        setPendingArtworks(artworksData.map((w: any) => ({
          id: w.id,
          artist_name: `${w.artists?.profiles?.first_name || ""} ${w.artists?.profiles?.last_name || ""}`,
          title: w.title,
          category: w.category,
          price: Number(w.price),
          dimensions: w.dimensions,
          materials: w.materials,
          photos: w.photos,
        })));
      }

      // 3. Fetch litigations
      const { data: litigationsData, error: errLitigations } = await supabase
        .from("litigations")
        .select("*, orders(*, artworks(*))")
        .order("created_at", { ascending: false });

      if (!errLitigations && litigationsData) {
        setLitigations(litigationsData);
      }

      // 4. Fetch All Orders (for filtering and KPIs)
      const { data: orders, error: errOrders } = await supabase
        .from("orders")
        .select("*, artworks(*)")
        .order("created_at", { ascending: false });
      
      if (!errOrders && orders) {
        setAllOrders(orders);
      }

      const { count: activeArtistsCount } = await supabase
        .from("artists")
        .select("*", { count: "exact", head: true })
        .eq("kyc_status", "approved");

      setKpis(prev => ({
        ...prev,
        artistsCount: activeArtistsCount || 0,
      }));

      // Fetch pending reviews
      const { data: reviews, error: errReviews } = await supabase
        .from("reviews")
        .select("*, profiles:buyer_id(first_name, last_name, email), artists:artist_id(profiles(first_name, last_name)), orders(artworks(title))")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });

      if (!errReviews && reviews) {
        setPendingReviews(reviews);
      }

      // 5. Fetch all users for admin
      if (profile?.role === "admin") {
        const { data: usersData, error: errUsers } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (!errUsers && usersData) {
          setAllUsers(usersData);
        }
      }

    } catch (err: any) {
      console.error("Error loading admin data:", err);
      setActionError("Une erreur est survenue lors de la récupération des données.");
    } finally {
      setLoadingData(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!loading && profile && (profile.role === "admin" || profile.role === "curator")) {
      loadAdminData();
    }
  }, [loading, profile]);

  // Fetch real database logs on tab switch
  useEffect(() => {
    if (activeTab === "audit" && session?.access_token) {
      setLoadingLogs(true);
      supabase
        .from("audit_logs")
        .select("*, profiles(first_name, last_name, email)")
        .order("created_at", { ascending: false })
        .limit(30)
        .then(({ data, error }) => {
          if (!error && data) {
            setAuditLogs(data);
          }
          setLoadingLogs(false);
        });
    }
  }, [activeTab, session]);

  const handleKycVerify = async (artistId: string, status: "approved" | "rejected", reason?: string) => {
    if (!session?.access_token) return;
    setIsActionSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch("/api/admin/artists/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          artist_id: artistId,
          status,
          rejection_reason: reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Une erreur est survenue lors de l’opération.");
      }

      setActionSuccess(result.message);
      // Remove from pending UI list
      setPendingArtists(prev => prev.filter(a => a.id !== artistId));
      setRejectType(null);
      setRejectionReason("");
      loadAdminData();
    } catch (err: any) {
      setActionError(err.message || "Une erreur réseau s’est produite.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleArtworkCurate = async (artworkId: string, status: "published" | "refused", reason?: string) => {
    if (!session?.access_token) return;
    setIsActionSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch("/api/admin/artworks/curate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          artwork_id: artworkId,
          status,
          rejection_reason: reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Une erreur est survenue lors de l’opération.");
      }

      setActionSuccess(result.message);
      // Remove from pending UI list
      setPendingArtworks(prev => prev.filter(w => w.id !== artworkId));
      setRejectType(null);
      setRejectionReason("");
      loadAdminData();
    } catch (err: any) {
      setActionError(err.message || "Une erreur réseau s’est produite.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Resolve Litigation Action
  const handleResolveLitigation = async (litigationId: string, resolution: "refund" | "payout") => {
    if (!confirm(`Confirmez-vous la résolution de ce litige par : ${resolution === "refund" ? "Remboursement de l'acheteur" : "Paiement de l'artiste"} ?`)) {
      return;
    }
    setIsActionSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch("/api/admin/litigations/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          litigation_id: litigationId,
          resolution,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Impossible de résoudre le litige.");
      }

      setActionSuccess(result.message);
      await loadAdminData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const openRejectionModal = (type: "kyc" | "artwork", id: string) => {
    setRejectType(type);
    setActiveItemId(id);
    setRejectionReason("");
    setActionError(null);
    setActionSuccess(null);
  };

  // 1. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/15 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-neutral text-sm">Vérification de l’accès administrateur...</p>
        </div>
      </div>
    );
  }

  // 2. Forbidden state
  const hasAccess = profile && (profile.role === "admin" || profile.role === "curator");
  if (!hasAccess) {
    return (
      <TransactionalLayout backHref="/" backLabel="Retour">
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-20">
          <div className="bg-card border border-border rounded-xl p-8 text-center relative overflow-hidden shadow-card">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
            <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
            <h1 className="font-serif text-2xl font-bold mb-3">Accès Interdit</h1>
            <p className="text-neutral text-sm leading-relaxed mb-6">
              Cet espace est strictement réservé aux curateurs et administrateurs du projet SANKOFA.
            </p>
            <Link href="/" className="block w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all flex items-center justify-center h-11">
              Retour au Catalogue
            </Link>
          </div>
        </main>
      </TransactionalLayout>
    );
  }

  return (
    <TransactionalLayout backHref="/" backLabel="Quitter le back-office" titleBadge={profile.role === "admin" ? "Admin" : "Curator"}>

      {/* Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">Back-Office</h1>
            <p className="text-neutral text-sm">Gérer les artistes, curer le catalogue, et surveiller les métriques de la plateforme.</p>
          </div>
          <button 
            onClick={loadAdminData}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-all border border-primary/20 hover:border-primary px-3 py-1.5 bg-white rounded shadow-sm h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
            Actualiser les dossiers
          </button>
        </div>

        {/* Action alerts */}
        {actionSuccess && (
          <div className="bg-green-50 border border-green-200 text-success p-4 rounded-lg flex items-center gap-3 mb-6 animate-fadeIn">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{actionSuccess}</p>
          </div>
        )}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-error p-4 rounded-lg flex items-center gap-3 mb-6 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{actionError}</p>
          </div>
        )}

        {/* Tabs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Menu Sidebar */}
          <div className="space-y-2 lg:col-span-1">
            <button
              onClick={() => setActiveTab("kpis")}
              className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                activeTab === "kpis" ? "bg-primary text-white shadow-sm" : "bg-card hover:bg-secondary/10 border border-border"
              }`}
            >
              <Activity className="w-4 h-4" />
              Vue d’ensemble & KPIs
            </button>
            <button
              onClick={() => setActiveTab("kyc")}
              className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                activeTab === "kyc" ? "bg-primary text-white shadow-sm" : "bg-card hover:bg-secondary/10 border border-border"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Validation Artistes ({pendingArtists.length})
            </button>
            <button
              onClick={() => setActiveTab("curation")}
              className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                activeTab === "curation" ? "bg-primary text-white shadow-sm" : "bg-card hover:bg-secondary/10 border border-border"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Curation Œuvres ({pendingArtworks.length})
            </button>
            {profile.role === "admin" && (
              <>
                <button
                  onClick={() => setActiveTab("litigations")}
                  className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                    activeTab === "litigations" ? "bg-primary text-white shadow-sm" : "bg-card hover:bg-secondary/10 border border-border"
                  }`}
                >
                  <Gavel className="w-4 h-4" />
                  Curation Litiges ({litigations.filter(l => l.status === "opened").length})
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                    activeTab === "reviews" ? "bg-primary text-white shadow-sm" : "bg-card hover:bg-secondary/10 border border-border"
                  }`}
                >
                  <Star className="w-4 h-4" />
                  Modération des Avis ({pendingReviews.length})
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                    activeTab === "audit" ? "bg-primary text-white shadow-sm" : "bg-card hover:bg-secondary/10 border border-border"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Journal d’Audit
                </button>
                <button
                  onClick={() => setActiveTab("utilisateurs")}
                  className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                    activeTab === "utilisateurs" ? "bg-primary text-white shadow-sm" : "bg-card hover:bg-secondary/10 border border-border"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Gestion Utilisateurs
                </button>
              </>
            )}
          </div>

          {/* Main workspace panels */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Loading animation for tabs if loading */}
            {loadingData && activeTab !== "audit" ? (
              <div className="text-center py-20 bg-card border border-border rounded-xl">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-neutral text-sm">Chargement des données...</p>
              </div>
            ) : (
              <>
                {/* KPI PANEL */}
                {activeTab === "kpis" && (
                  <div className="space-y-6">
                    {/* Date range filters and export button */}
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" /> Date de début
                          </label>
                          <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-secondary/5 border border-border rounded-lg px-3.5 h-11 text-xs font-semibold text-dark focus:border-primary outline-none transition-all w-48"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" /> Date de fin
                          </label>
                          <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-secondary/5 border border-border rounded-lg px-3.5 h-11 text-xs font-semibold text-dark focus:border-primary outline-none transition-all w-48"
                          />
                        </div>
                      </div>
                      <button
                        onClick={exportKpisToCsv}
                        className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-5 rounded shadow-sm hover:shadow transition-all h-11 flex items-center justify-center gap-2 self-end md:self-auto shrink-0"
                      >
                        <Download className="w-4 h-4" /> Exporter en CSV
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* GMV */}
                      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-5">
                        <div className="bg-green-100 text-green-700 p-3 rounded-full"><TrendingUp className="w-6 h-6" /></div>
                        <div>
                          <span className="text-neutral text-xs font-semibold uppercase tracking-wider block mb-1">Volume de Ventes (GMV)</span>
                          <span className="text-2xl font-bold font-sans">{kpis.gmv.toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      {/* Average basket */}
                      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-5">
                        <div className="bg-orange-100 text-primary p-3 rounded-full"><ShoppingBag className="w-6 h-6" /></div>
                        <div>
                          <span className="text-neutral text-xs font-semibold uppercase tracking-wider block mb-1">Panier Moyen</span>
                          <span className="text-2xl font-bold font-sans">{Math.round(kpis.averageBasket).toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      {/* Dispute Rate */}
                      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-5">
                        <div className="bg-red-100 text-error p-3 rounded-full"><AlertTriangle className="w-6 h-6" /></div>
                        <div>
                          <span className="text-neutral text-xs font-semibold uppercase tracking-wider block mb-1">Taux de Litiges</span>
                          <span className="text-2xl font-bold font-sans">{kpis.disputeRate.toFixed(1)} %</span>
                        </div>
                      </div>

                      {/* Active Artists */}
                      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-5">
                        <div className="bg-blue-100 text-blue-700 p-3 rounded-full"><Users className="w-6 h-6" /></div>
                        <div>
                          <span className="text-neutral text-xs font-semibold uppercase tracking-wider block mb-1">Créateurs Actifs</span>
                          <span className="text-2xl font-bold font-sans">{kpis.artistsCount} artistes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* KYC PANEL */}
                {activeTab === "kyc" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold font-serif">Artistes en attente de vérification KYC</h2>
                    {pendingArtists.length === 0 ? (
                      <div className="bg-card border border-border rounded-xl p-8 text-center text-neutral text-sm">
                        Aucun artiste en attente de vérification pour le moment.
                      </div>
                    ) : (
                      pendingArtists.map(artistItem => (
                        <div key={artistItem.id} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div>
                              <h3 className="font-serif text-lg font-bold">{artistItem.first_name} {artistItem.last_name}</h3>
                              <p className="text-xs text-neutral">{artistItem.email} • {artistItem.city}, {artistItem.country}</p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleKycVerify(artistItem.id, "approved")}
                                disabled={isActionSubmitting}
                                className="flex-1 sm:flex-none bg-success hover:bg-success-dark text-white text-xs font-semibold px-4 py-2.5 rounded transition-all h-10"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => openRejectionModal("kyc", artistItem.id)}
                                disabled={isActionSubmitting}
                                className="flex-1 sm:flex-none border border-error text-error hover:bg-red-50 text-xs font-semibold px-4 py-2.5 rounded transition-all h-10"
                              >
                                Rejeter
                              </button>
                            </div>
                          </div>

                          {/* Documents display */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* CNI Link */}
                            <div className="border border-border/80 rounded-lg p-3 space-y-2 bg-secondary/5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral block">Pièce d’identité (CNI/Passeport)</span>
                              {artistItem.cni_url ? (
                                <a href={artistItem.cni_url} target="_blank" rel="noreferrer" className="aspect-video relative rounded overflow-hidden bg-neutral/15 block group border border-border">
                                  <img src={artistItem.cni_url} alt="CNI" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity gap-2">
                                    Agrandir <ExternalLink className="w-4 h-4" />
                                  </div>
                                </a>
                              ) : (
                                <div className="aspect-video flex items-center justify-center text-xs text-neutral border border-dashed rounded bg-white">CNI non fournie</div>
                              )}
                            </div>

                            {/* Selfie Link */}
                            <div className="border border-border/80 rounded-lg p-3 space-y-2 bg-secondary/5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral block">Selfie de l’artiste avec son œuvre</span>
                              {artistItem.selfie_url ? (
                                <a href={artistItem.selfie_url} target="_blank" rel="noreferrer" className="aspect-video relative rounded overflow-hidden bg-neutral/15 block group border border-border">
                                  <img src={artistItem.selfie_url} alt="Selfie" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity gap-2">
                                    Agrandir <ExternalLink className="w-4 h-4" />
                                  </div>
                                </a>
                              ) : (
                                <div className="aspect-video flex items-center justify-center text-xs text-neutral border border-dashed rounded bg-white">Selfie non fourni</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* CURATION PANEL */}
                {activeTab === "curation" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold font-serif">Œuvres en attente de curation éditoriale</h2>
                    {pendingArtworks.length === 0 ? (
                      <div className="bg-card border border-border rounded-xl p-8 text-center text-neutral text-sm">
                        Aucune œuvre en attente de curation pour le moment.
                      </div>
                    ) : (
                      pendingArtworks.map(artwork => (
                        <div key={artwork.id} className="bg-card border border-border rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Photo */}
                          <div className="md:col-span-1 aspect-square rounded-lg bg-neutral/15 overflow-hidden relative border border-border flex items-center justify-center text-xs text-neutral">
                            {artwork.photos && artwork.photos[0] ? (
                              <img src={artwork.photos[0]} alt={artwork.title} className="object-cover w-full h-full" />
                            ) : (
                              <span>Aucune photo</span>
                            )}
                          </div>

                          {/* Info & details */}
                          <div className="md:col-span-2 flex flex-col justify-between space-y-4">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h3 className="font-serif text-lg font-bold">{artwork.title}</h3>
                                  <p className="text-xs text-neutral">Créateur : {artwork.artist_name}</p>
                                </div>
                                <span className="bg-accent/15 text-accent-dark text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {artwork.category}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                                <p><span className="font-medium text-neutral">Prix de vente :</span> {artwork.price.toLocaleString("fr-FR")} FCFA</p>
                                <p><span className="font-medium text-neutral">Poids :</span> {artwork.dimensions?.weight || "?"} kg</p>
                                <p><span className="font-medium text-neutral">Taille :</span> {artwork.dimensions?.height || "?"}x{artwork.dimensions?.width || "?"}x{artwork.dimensions?.depth || 0} cm</p>
                                <p>
                                  <span className="font-medium text-neutral">Matériaux :</span> {artwork.materials?.join(", ") || "Aucun"}
                                </p>
                              </div>
                            </div>

                            {/* Actions buttons */}
                            <div className="flex gap-2 border-t border-border/60 pt-4">
                              <button
                                onClick={() => handleArtworkCurate(artwork.id, "published")}
                                disabled={isActionSubmitting}
                                className="flex-1 bg-success hover:bg-success-dark text-white text-xs font-semibold px-4 py-2.5 rounded transition-all h-10"
                              >
                                Publier au catalogue
                              </button>
                              <button
                                onClick={() => openRejectionModal("artwork", artwork.id)}
                                disabled={isActionSubmitting}
                                className="flex-1 border border-error text-error hover:bg-red-50 text-xs font-semibold px-4 py-2.5 rounded transition-all h-10"
                              >
                                Refuser l’œuvre
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* LITIGATIONS PANEL */}
                {activeTab === "litigations" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold font-serif">Gestion et Arbitrage des Litiges</h2>
                    
                    {litigations.length === 0 ? (
                      <div className="bg-card border border-border rounded-xl p-8 text-center text-neutral text-sm">
                        Aucun litige signalé pour le moment.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {litigations.map(litigation => {
                          const order = litigation.orders;
                          const artwork = order?.artworks;
                          return (
                            <div key={litigation.id} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-border/40 pb-3 gap-2">
                                <div className="space-y-0.5">
                                  <span className="text-xs text-neutral">Ouvert le {new Date(litigation.created_at).toLocaleDateString("fr-FR")}</span>
                                  <p className="text-xs font-mono text-neutral/80">ID Litige: {litigation.id}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {litigation.status === "opened" ? (
                                    <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 rounded">Ouvert / En arbitrage</span>
                                  ) : (
                                    <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded">
                                      Résolu ({litigation.resolution === "refund" ? "Remboursé" : "Transféré à l'artiste"})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                {/* Dispute description */}
                                <div className="space-y-2">
                                  <p className="font-bold text-dark flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4 text-error shrink-0" />
                                    Motif invoqué par l’acheteur :
                                  </p>
                                  <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 text-xs leading-relaxed text-gray-700 italic">
                                    « {litigation.reason} »
                                  </div>
                                </div>

                                {/* Order details */}
                                <div className="space-y-2 text-xs">
                                  <p className="font-bold text-dark">Informations Commande :</p>
                                  <div className="bg-secondary/5 border border-border/50 rounded-lg p-4 space-y-1 text-neutral">
                                    <p><span className="font-medium text-dark">Œuvre :</span> {artwork?.title || "N/A"} ({artwork?.category || "N/A"})</p>
                                    <p><span className="font-medium text-dark">Montant séquestré :</span> {order?.amount?.toLocaleString() || "0"} FCFA</p>
                                    <p><span className="font-medium text-dark">Acheteur ID :</span> {order?.buyer_id || "N/A"}</p>
                                    <p><span className="font-medium text-dark">Destinataire :</span> {order?.shipping_address?.full_name} ({order?.shipping_address?.phone})</p>
                                    <p><span className="font-medium text-dark">Expédition :</span> {order?.shipping_address?.carrier || "Non renseigné"} (Code : {order?.shipping_address?.tracking_number || "N/A"})</p>
                                  </div>
                                </div>
                              </div>

                              {/* Admin Decisions */}
                              {litigation.status === "opened" && (
                                <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border/40">
                                  <button
                                    onClick={() => handleResolveLitigation(litigation.id, "refund")}
                                    disabled={isActionSubmitting}
                                    className="flex-1 bg-error hover:bg-error-dark text-white text-xs font-semibold py-2.5 px-4 rounded h-11 flex items-center justify-center gap-1.5 shadow"
                                  >
                                    <Scale className="w-4.5 h-4.5" />
                                    Rembourser l’Acheteur (Buyer Refund)
                                  </button>
                                  <button
                                    onClick={() => handleResolveLitigation(litigation.id, "payout")}
                                    disabled={isActionSubmitting}
                                    className="flex-1 bg-success hover:bg-success-dark text-white text-xs font-semibold py-2.5 px-4 rounded h-11 flex items-center justify-center gap-1.5 shadow"
                                  >
                                    <DollarSign className="w-4.5 h-4.5" />
                                    Payer l’Artiste (Artist Payout)
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* REVIEWS MODERATION PANEL */}
                {activeTab === "reviews" && (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold font-serif mb-4">Modération des Avis & Commentaires</h2>
                    <p className="text-xs text-neutral mb-6">
                      Validez ou rejetez les commentaires déposés par les acheteurs. L’approbation recalcule la moyenne de l’artiste.
                    </p>

                    {pendingReviews.length === 0 ? (
                      <div className="text-center py-12 text-neutral text-xs">
                        Aucun avis en attente de modération.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {pendingReviews.map((review) => {
                          const buyerName = review.profiles
                            ? `${review.profiles.first_name || ""} ${review.profiles.last_name || ""}`.trim() || review.profiles.email
                            : "Acheteur inconnu";
                          const artistName = review.artists?.profiles
                            ? `${review.artists.profiles.first_name || ""} ${review.artists.profiles.last_name || ""}`.trim()
                            : "Artiste inconnu";
                          const artworkTitle = review.orders?.artworks?.title || "Œuvre inconnue";

                          return (
                            <div key={review.id} className="border border-border/80 rounded-lg p-5 bg-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                  <span className="font-semibold text-dark">Acheteur : {buyerName}</span>
                                  <span className="text-neutral">•</span>
                                  <span className="font-semibold text-primary">Artiste : {artistName}</span>
                                  <span className="text-neutral">•</span>
                                  <span className="italic text-neutral/90">Œuvre : {artworkTitle}</span>
                                </div>
                                <div className="flex items-center gap-1 my-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= review.rating ? "text-amber-500 fill-amber-500" : "text-neutral/20"
                                      }`}
                                    />
                                  ))}
                                  <span className="text-xs font-bold text-dark ml-1">{review.rating}/5</span>
                                </div>
                                {review.comment ? (
                                  <p className="text-xs text-neutral leading-relaxed bg-secondary/10 p-3 rounded italic">
                                    « {review.comment} »
                                  </p>
                                ) : (
                                  <p className="text-xs text-neutral/65 italic">Aucun commentaire textuel déposé.</p>
                                )}
                                <p className="text-[10px] text-neutral/70">
                                  Soumis le {new Date(review.created_at).toLocaleDateString("fr-FR")}
                                </p>
                              </div>
                              <div className="flex gap-2 w-full md:w-auto shrink-0">
                                <button
                                  onClick={() => handleReviewModerate(review.id, "reject")}
                                  disabled={isActionSubmitting}
                                  className="flex-1 md:flex-initial text-xs border border-error text-error hover:bg-red-50 font-semibold py-2.5 px-4 rounded transition-all flex items-center justify-center gap-1 h-10 cursor-pointer disabled:opacity-50"
                                  style={{ minHeight: "44px" }}
                                >
                                  <XCircle className="w-4 h-4" />
                                  Rejeter
                                </button>
                                <button
                                  onClick={() => handleReviewModerate(review.id, "approve")}
                                  disabled={isActionSubmitting}
                                  className="flex-1 md:flex-initial text-xs bg-success hover:bg-success-dark text-white font-semibold py-2.5 px-4 rounded transition-all flex items-center justify-center gap-1 h-10 cursor-pointer disabled:opacity-50"
                                  style={{ minHeight: "44px" }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Approuver
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* AUDIT LOGS PANEL */}
                {activeTab === "audit" && (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold font-serif mb-4">Journal d’Audit d’Administration</h2>
                    
                    {loadingLogs ? (
                      <div className="text-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-xs text-neutral">Chargement du journal...</p>
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <div className="text-center py-10 text-neutral text-xs">
                        Aucun log d’audit enregistré. Les actions de modération apparaîtront ici.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-border/80 text-neutral">
                              <th className="py-2.5 font-semibold">Date</th>
                              <th className="py-2.5 font-semibold">Admin</th>
                              <th className="py-2.5 font-semibold">Action</th>
                              <th className="py-2.5 font-semibold">Détails</th>
                              <th className="py-2.5 font-semibold">IP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-secondary/5">
                                <td className="py-3 text-neutral font-medium">{new Date(log.created_at).toLocaleString("fr-FR")}</td>
                                <td className="py-3 font-semibold text-dark">
                                  {log.profiles?.first_name} {log.profiles?.last_name}
                                  <span className="block text-[10px] text-neutral font-normal">{log.profiles?.email}</span>
                                </td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] ${
                                    log.action.includes("APPROVED") || log.action.includes("PUBLISHED") || log.action.includes("COMPLETED")
                                      ? "bg-green-50 text-success"
                                      : "bg-red-50 text-error"
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="py-3 max-w-xs truncate" title={JSON.stringify(log.details)}>
                                  {JSON.stringify(log.details)}
                                </td>
                                <td className="py-3 text-neutral">{log.ip_address}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* USER MANAGEMENT PANEL */}
                {activeTab === "utilisateurs" && profile.role === "admin" && (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-xl font-bold font-serif">Gestion des Utilisateurs</h2>
                        <p className="text-neutral text-xs">Suspendre ou réactiver les acheteurs et artistes de la plateforme.</p>
                      </div>
                    </div>

                    {/* Filters bar */}
                    <div className="bg-secondary/5 border border-border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center">
                      <div className="relative w-full md:flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral" />
                        <input
                          type="text"
                          value={searchUser}
                          onChange={(e) => setSearchUser(e.target.value)}
                          placeholder="Rechercher par nom, prénom ou email..."
                          className="w-full pl-10 pr-4 h-11 border border-border rounded-lg bg-white text-xs font-semibold focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div className="flex w-full md:w-auto gap-4 flex-wrap">
                        <select
                          value={filterUserRole}
                          onChange={(e: any) => setFilterUserRole(e.target.value)}
                          className="bg-white border border-border rounded-lg px-3 h-11 text-xs font-semibold outline-none focus:border-primary shrink-0 w-full sm:w-36"
                        >
                          <option value="all">Tous les rôles</option>
                          <option value="buyer">Acheteur</option>
                          <option value="artist">Artiste</option>
                          <option value="curator">Curateur</option>
                          <option value="admin">Admin</option>
                        </select>
                        <select
                          value={filterUserStatus}
                          onChange={(e: any) => setFilterUserStatus(e.target.value)}
                          className="bg-white border border-border rounded-lg px-3 h-11 text-xs font-semibold outline-none focus:border-primary shrink-0 w-full sm:w-36"
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="active">Actif</option>
                          <option value="suspended">Suspendu</option>
                        </select>
                      </div>
                    </div>

                    {/* Users list */}
                    {allUsers.length === 0 ? (
                      <div className="text-center py-10 text-neutral text-xs">
                        Aucun utilisateur trouvé.
                      </div>
                    ) : (() => {
                      const filteredUsers = allUsers.filter(u => {
                        const search = searchUser.toLowerCase().trim();
                        const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
                        const matchesSearch = !search || 
                          fullName.includes(search) || 
                          (u.email || "").toLowerCase().includes(search) ||
                          (u.phone || "").includes(search);
                        
                        const matchesRole = filterUserRole === "all" || u.role === filterUserRole;
                        const matchesStatus = filterUserStatus === "all" || 
                          (filterUserStatus === "suspended" ? u.is_suspended : !u.is_suspended);
                        
                        return matchesSearch && matchesRole && matchesStatus;
                      });

                      if (filteredUsers.length === 0) {
                        return (
                          <div className="text-center py-10 text-neutral text-xs">
                            Aucun utilisateur ne correspond à vos filtres.
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto border border-border/80 rounded-lg">
                          <table className="w-full text-left text-xs bg-card">
                            <thead>
                              <tr className="border-b border-border/80 text-neutral bg-secondary/5">
                                <th className="p-3.5 font-semibold">Nom complet</th>
                                <th className="p-3.5 font-semibold">Email / Téléphone</th>
                                <th className="p-3.5 font-semibold">Rôle</th>
                                <th className="p-3.5 font-semibold">Statut</th>
                                <th className="p-3.5 font-semibold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {filteredUsers.map((u) => {
                                const isSelf = u.id === session?.user?.id;
                                return (
                                  <tr key={u.id} className="hover:bg-secondary/5">
                                    <td className="p-3.5 font-semibold text-dark">
                                      {u.first_name} {u.last_name}
                                    </td>
                                    <td className="p-3.5 text-neutral font-medium">
                                      {u.email}
                                      {u.phone && <span className="block text-[10px] text-neutral/80">{u.phone}</span>}
                                    </td>
                                    <td className="p-3.5 uppercase text-[10px] font-bold text-neutral">
                                      {u.role === "admin" ? "Administrateur" : 
                                       u.role === "curator" ? "Curateur" : 
                                       u.role === "artist" ? "Artiste" : "Acheteur"}
                                    </td>
                                    <td className="p-3.5">
                                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] ${
                                        u.is_suspended
                                          ? "bg-red-50 text-error"
                                          : "bg-green-50 text-success"
                                      }`}>
                                        {u.is_suspended ? "Suspendu" : "Actif"}
                                      </span>
                                    </td>
                                    <td className="p-3.5 text-right">
                                      {isSelf ? (
                                        <span className="text-[10px] text-neutral italic">Vous (Connecté)</span>
                                      ) : (
                                        <button
                                          onClick={() => handleUserSuspension(u.id, !u.is_suspended)}
                                          disabled={isActionSubmitting}
                                          className={`text-xs font-semibold py-2.5 px-4 rounded transition-all inline-flex items-center gap-1.5 h-11 shrink-0 ${
                                            u.is_suspended
                                              ? "bg-success text-white hover:bg-success-dark hover:shadow-sm"
                                              : "border border-error text-error hover:bg-red-50"
                                          }`}
                                          style={{ minHeight: "44px" }}
                                        >
                                          {u.is_suspended ? (
                                            <>Réactiver</>
                                          ) : (
                                            <>
                                              <Ban className="w-3.5 h-3.5" />
                                              Suspendre
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* REJECTION MODAL */}
      {rejectType && activeItemId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-hover max-w-md w-full p-6 animate-scaleUp relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-error" />
            <h3 className="font-serif text-xl font-bold mb-3 flex items-center gap-2 text-error-dark">
              <XCircle className="w-5 h-5" />
              {rejectType === "kyc" ? "Rejeter la demande KYC" : "Refuser l’œuvre"}
            </h3>
            
            <p className="text-neutral text-xs leading-relaxed mb-4">
              Veuillez motiver cette décision. L’artiste recevra cette explication par notification.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-[10px] font-bold uppercase tracking-wider text-neutral mb-2">
                  Motif de refus (min 5 caractères) <span className="text-primary">*</span>
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-error/25 focus:border-error"
                  placeholder="Ex: Les documents d'identité sont flous ou expirés..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    if (rejectType === "kyc") {
                      handleKycVerify(activeItemId, "rejected", rejectionReason);
                    } else {
                      handleArtworkCurate(activeItemId, "refused", rejectionReason);
                    }
                  }}
                  disabled={isActionSubmitting || rejectionReason.trim().length < 5}
                  className="flex-1 bg-error hover:bg-error-dark text-white font-semibold py-2.5 rounded text-xs transition-all h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActionSubmitting ? "Envoi..." : "Confirmer le Refus"}
                </button>
                <button
                  onClick={() => setRejectType(null)}
                  disabled={isActionSubmitting}
                  className="flex-1 border border-border hover:bg-secondary/15 font-semibold py-2.5 rounded text-xs transition-all h-10"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </TransactionalLayout>
  );
}

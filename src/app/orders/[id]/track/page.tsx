"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { RefreshCw, Truck, MapPin, Calendar, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import TransactionalLayout from "@/components/layout/TransactionalLayout";

interface Milestone {
  id: string;
  status: string;
  location: string;
  description: string;
  created_at: string;
}

interface OrderDetails {
  id: string;
  amount: number;
  delivery_status: "pending" | "shipped" | "delivered" | "disputed" | "returned";
  shipping_address: any;
  created_at: string;
  artworks: {
    title: string;
    photos: string[];
    artist_id: string;
  };
}

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const orderId = params.id;
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [artistName, setArtistName] = useState("Artiste Sankofa");
  const [artistCity, setArtistCity] = useState("Douala");

  const loadTrackingData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*, artworks(*)")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        throw new Error("Commande introuvable.");
      }

      setOrder(orderData as OrderDetails);

      // 2. Fetch artist profile
      if (orderData.artworks?.artist_id) {
        const { data: artistProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", orderData.artworks.artist_id)
          .single();
        
        const { data: artistDetails } = await supabase
          .from("artists")
          .select("city")
          .eq("id", orderData.artworks.artist_id)
          .single();

        if (artistProfile) {
          setArtistName(`${artistProfile.first_name || ""} ${artistProfile.last_name || ""}`.trim());
        }
        if (artistDetails?.city) {
          setArtistCity(artistDetails.city);
        }
      }

      // 3. Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from("delivery_milestones")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (milestonesError) {
        throw milestonesError;
      }

      setMilestones(milestonesData as Milestone[]);
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex flex-col justify-center items-center p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-[#70604c] text-sm font-semibold">Récupération des informations de suivi...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex flex-col justify-center items-center p-4">
        <AlertCircle className="w-12 h-12 text-error mb-3" />
        <h3 className="font-serif text-lg font-bold text-dark mb-1">Erreur de suivi</h3>
        <p className="text-neutral text-xs mb-6">{errorMsg || "Cette commande n’existe pas."}</p>
        <Link
          href="/dashboard/orders"
          className="bg-primary text-white text-xs font-semibold py-2.5 px-5 rounded shadow hover:bg-primary-dark transition-all h-11 flex items-center justify-center"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  // Calculate coordinates and dynamic position along path
  // Source: Artist City (e.g. Douala). Destination: Buyer City (e.g. Yaoundé)
  const sourceCity = artistCity || "Douala";
  const destinationCity = order.shipping_address?.city || "Yaoundé";

  // Determine progress percentage (0 to 100)
  let progressPercent = 0;
  if (order.delivery_status === "shipped") {
    if (milestones.length === 0) {
      progressPercent = 25; // Shipped, just left source
    } else {
      // Scale progress based on milestones
      const lastMilestone = milestones[milestones.length - 1];
      if (lastMilestone.status === "transit") {
        progressPercent = 65; // In transit
      } else {
        progressPercent = 45; // Picked up/collected
      }
    }
  } else if (order.delivery_status === "delivered") {
    progressPercent = 100; // Arrived
  } else if (order.delivery_status === "disputed" || order.delivery_status === "returned") {
    progressPercent = 50; // Stopped midway due to dispute/return
  }

  // Define SVG path: curve between Douala and Yaoundé
  const startX = 60;
  const startY = 120;
  const endX = 340;
  const endY = 120;
  
  // Calculate marker position on quadratic bezier curve: B(t) = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
  // P0 = (60, 120), P1 = (200, 50) (control point), P2 = (340, 120)
  const t = progressPercent / 100;
  const controlX = 200;
  const controlY = 40;
  const markerX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
  const markerY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;

  return (
    <TransactionalLayout backHref="/dashboard/orders" backLabel="Retour aux commandes" titleBadge="SUIVI">

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-scaleUp">
        <div className="flex justify-end mb-4">
          <button
            onClick={loadTrackingData}
            className="flex items-center gap-1.5 border border-border bg-card hover:bg-secondary/5 text-xs font-semibold py-2 px-3 rounded shadow-sm cursor-pointer"
            style={{ minHeight: "44px" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
        {/* Main Status Card */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-amber-600 to-orange-800 text-white flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Suivi de livraison</span>
              <h1 className="font-serif text-2xl font-bold mt-1">Colis #{order.shipping_address?.tracking_number || "Non assigné"}</h1>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
              <Truck className="w-5 h-5 text-amber-200" />
              <span className="text-sm font-bold uppercase tracking-wider">
                {order.delivery_status === "pending" ? "En préparation" :
                 order.delivery_status === "shipped" ? "En transit" :
                 order.delivery_status === "delivered" ? "Livré" :
                 order.delivery_status === "disputed" ? "Litige" : "Retourné"}
              </span>
            </div>
          </div>

          <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-border/60">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-600 to-orange-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-white/50 text-[10px] italic">
                {order.artworks?.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.artworks.photos[0]} alt={order.artworks.title} className="w-full h-full object-cover" />
                ) : (
                  <span>Pas d’image</span>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-dark text-base">{order.artworks?.title}</h3>
                <p className="text-xs text-neutral">Créateur : {artistName}</p>
                <p className="text-xs text-neutral">Expédié via : <span className="font-bold text-dark">{order.shipping_address?.carrier || "Non renseigné"}</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral">Valeur assurée</p>
              <p className="text-lg font-bold text-primary">{Number(order.amount).toLocaleString()} FCFA</p>
            </div>
          </div>

          {/* Interactive SVG Transit Route Map */}
          <div className="p-6 bg-[#faf9f6] border-b border-border/60">
            <h4 className="text-xs font-semibold text-neutral uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              Localisation approximative du colis
            </h4>
            <div className="relative border border-border/40 rounded-xl bg-card p-4 shadow-sm">
              <svg viewBox="0 0 400 200" className="w-full h-auto">
                <defs>
                  {/* Gradients */}
                  <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#b89754" />
                  </linearGradient>
                  <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
                  </filter>
                </defs>

                {/* Background Grid */}
                <g stroke="#eae6dd" strokeWidth="0.5" opacity="0.3">
                  <line x1="50" y1="0" x2="50" y2="200" />
                  <line x1="150" y1="0" x2="150" y2="200" />
                  <line x1="250" y1="0" x2="250" y2="200" />
                  <line x1="350" y1="0" x2="350" y2="200" />
                  <line x1="0" y1="50" x2="400" y2="50" />
                  <line x1="0" y1="100" x2="400" y2="100" />
                  <line x1="0" y1="150" x2="400" y2="150" />
                </g>

                {/* Route Path (Curve) */}
                <path
                  d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                  fill="none"
                  stroke="#eae6dd"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* Completed Route Highlight */}
                {progressPercent > 0 && (
                  <path
                    d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                    fill="none"
                    stroke="url(#routeGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="400"
                    strokeDashoffset={400 - (400 * progressPercent) / 100}
                    className="transition-all duration-1000 ease-out"
                  />
                )}

                {/* Source Node (Douala / Artist Location) */}
                <circle cx={startX} cy={startY} r="8" fill="#d97706" stroke="white" strokeWidth="2" filter="url(#shadow)" />
                <text x={startX} y={startY + 24} textAnchor="middle" className="text-[10px] font-bold fill-dark">
                  {sourceCity}
                </text>
                <text x={startX} y={startY + 36} textAnchor="middle" className="text-[8px] fill-neutral">
                  Artiste
                </text>

                {/* Destination Node (Yaoundé / Buyer Location) */}
                <circle cx={endX} cy={endY} r="8" fill="#b89754" stroke="white" strokeWidth="2" filter="url(#shadow)" />
                <text x={endX} y={endY + 24} textAnchor="middle" className="text-[10px] font-bold fill-dark">
                  {destinationCity}
                </text>
                <text x={endX} y={endY + 36} textAnchor="middle" className="text-[8px] fill-neutral">
                  Acheteur
                </text>

                {/* Animated Delivery Truck Marker */}
                {progressPercent > 0 && (
                  <g transform={`translate(${markerX - 12}, ${markerY - 12})`} filter="url(#shadow)" className="transition-all duration-1000 ease-out">
                    <circle cx="12" cy="12" r="14" fill="#2c2620" />
                    <Truck className="w-4 h-4 text-white absolute" style={{ transform: "translate(4px, 4px)" }} />
                  </g>
                )}
              </svg>

              {/* Legend overlay */}
              <div className="mt-3 flex justify-between text-[10px] font-medium text-neutral">
                <span>Statut : {progressPercent}% achevé</span>
                <span>Trajet terrestre simulé</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper & Chronological Milestones */}
        <div className="bg-card border border-border rounded-xl shadow-card p-6 sm:p-8 space-y-8">
          <h2 className="font-serif text-xl font-bold text-dark border-b border-border/60 pb-3">Étapes de livraison</h2>

          <div className="relative border-l-2 border-border/60 ml-3.5 space-y-8">
            {/* 1. Milestone Created */}
            <div className="relative pl-8">
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-success border-2 border-white flex items-center justify-center" />
              <div className="space-y-1">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-sm font-bold text-dark">Commande enregistrée et sécurisée</h4>
                  <span className="text-[10px] text-neutral font-medium shrink-0 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <p className="text-xs text-neutral">Lieu : {sourceCity}</p>
                <p className="text-xs text-neutral leading-relaxed">
                  Le paiement de l’acheteur a été validé et les fonds sont consignés dans le séquestre sécurisé. L’artiste prépare l’œuvre.
                </p>
              </div>
            </div>

            {/* Dynamic Milestones */}
            {milestones.map((m, idx) => (
              <div key={m.id} className="relative pl-8 animate-scaleUp" style={{ animationDelay: `${idx * 150}ms` }}>
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-success border-2 border-white flex items-center justify-center" />
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-sm font-bold text-dark capitalize">
                      {m.status === "shipped" ? "Colis collecté" :
                       m.status === "delivered" ? "Colis livré" :
                       m.status === "transit" ? "En transit" : m.status}
                    </h4>
                    <span className="text-[10px] text-neutral font-medium shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-neutral">Lieu : {m.location || "Non renseigné"}</p>
                  <p className="text-xs text-neutral leading-relaxed">{m.description}</p>
                </div>
              </div>
            ))}

            {/* Future steps placeholders if not yet completed */}
            {order.delivery_status === "pending" && (
              <>
                <div className="relative pl-8 opacity-45">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-neutral-300 border-2 border-white" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-neutral">Collecte par le transporteur</h4>
                    <p className="text-xs text-neutral">En attente de remise du colis par le créateur.</p>
                  </div>
                </div>
                <div className="relative pl-8 opacity-45">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-neutral-300 border-2 border-white" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-neutral">Acheminement & Transit</h4>
                    <p className="text-xs text-neutral">Étapes de transit vers le centre de distribution local.</p>
                  </div>
                </div>
                <div className="relative pl-8 opacity-45">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-neutral-300 border-2 border-white" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-neutral">Livraison finale</h4>
                    <p className="text-xs text-neutral">Remise en main propre et signature électronique.</p>
                  </div>
                </div>
              </>
            )}

            {order.delivery_status === "shipped" && milestones.length === 0 && (
              <>
                <div className="relative pl-8">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-success border-2 border-white" />
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-sm font-bold text-dark">Colis collecté</h4>
                      {order.shipping_address?.shipped_at && (
                        <span className="text-[10px] text-neutral font-medium shrink-0 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.shipping_address.shipped_at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral">Lieu : {sourceCity}</p>
                    <p className="text-xs text-neutral leading-relaxed">
                      L’expédition a été initiée. Le transporteur ({order.shipping_address?.carrier}) a pris en charge le colis et prépare son transit.
                    </p>
                  </div>
                </div>
                <div className="relative pl-8 opacity-45">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-neutral-300 border-2 border-white" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-neutral">Acheminement & Transit</h4>
                    <p className="text-xs text-neutral">Le colis quitte le hub de collecte.</p>
                  </div>
                </div>
                <div className="relative pl-8 opacity-45">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-neutral-300 border-2 border-white" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-neutral">Livraison finale</h4>
                    <p className="text-xs text-neutral">Remise en main propre et inspection.</p>
                  </div>
                </div>
              </>
            )}

            {order.delivery_status === "shipped" && milestones.length > 0 && !milestones.some(m => m.status === "delivered") && (
              <div className="relative pl-8 opacity-45">
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-neutral-300 border-2 border-white" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-neutral">Livraison finale</h4>
                  <p className="text-xs text-neutral">Le colis sera remis en main propre par le transporteur local.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security / Escrow Info banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4 shadow-sm">
          <ShieldCheck className="w-6 h-6 text-success shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-success-dark">Garantie séquestre SANKOFA active</h4>
            <p className="text-xs text-success/90 leading-relaxed">
              Vos fonds de <span className="font-bold">{Number(order.amount).toLocaleString()} FCFA</span> restent bloqués en séquestre sécurisé. Ils ne seront transférés à l’artiste qu’après votre confirmation de réception conforme, ou automatiquement après 48h de silence suite à la livraison effective constatée par le transporteur.
            </p>
          </div>
        </div>
      </main>
    </TransactionalLayout>
  );
}

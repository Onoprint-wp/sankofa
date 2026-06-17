"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheck, CreditCard, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

function StripeMockForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderId = searchParams.get("orderId");
  const rentalId = searchParams.get("rentalId");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [artworkInfo, setArtworkInfo] = useState<{
    title: string;
    artist: string;
    amount: number;
    image?: string;
  } | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholder, setCardholder] = useState("");

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        if (orderId) {
          const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("*, artwork:artworks(*)")
            .eq("id", orderId)
            .single();

          if (orderError || !order) {
            throw new Error("Commande introuvable.");
          }

          setArtworkInfo({
            title: order.artwork.title,
            artist: "Artiste Sankofa",
            amount: order.amount,
            image: order.artwork.photos?.[0],
          });
        } else if (rentalId) {
          const { data: rental, error: rentalError } = await supabase
            .from("rentals")
            .select("*, artwork:artworks(*)")
            .eq("id", rentalId)
            .single();

          if (rentalError || !rental) {
            throw new Error("Contrat de location introuvable.");
          }

          // Fetch the first rental payment to get amount to pay
          const { data: payments } = await supabase
            .from("rental_payments")
            .select("amount")
            .eq("rental_id", rentalId);
          
          const firstMonthRate = payments?.[0]?.amount || rental.monthly_rate;
          // Add shipping fee (assumed 5000 in general)
          const totalAmount = firstMonthRate + 5000;

          setArtworkInfo({
            title: rental.artwork.title,
            artist: "Artiste Sankofa",
            amount: totalAmount,
            image: rental.artwork.photos?.[0],
          });
        } else {
          throw new Error("Paramètre orderId ou rentalId manquant.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [orderId, rentalId]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvc || !cardholder) {
      setError("Veuillez remplir tous les champs de la carte bancaire.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Simulate webhook call to confirm payment asynchronously
      const simulationEndpoint = orderId
        ? `/api/webhooks/stripe/simulate?orderId=${orderId}`
        : `/api/webhooks/stripe/simulate?rentalId=${rentalId}`;

      const res = await fetch(simulationEndpoint, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "La simulation de paiement a échoué.");
      }

      setSuccess(true);
      setTimeout(() => {
        if (orderId) {
          router.push(`/checkout/success?orderId=${orderId}`);
        } else {
          router.push(`/checkout/success?rentalId=${rentalId}`);
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const fillTestCard = () => {
    setCardNumber("4242 4242 4242 4242");
    setExpiry("12/28");
    setCvc("424");
    setCardholder("Styve Mvondo");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#C75C3A] mx-auto mb-4" />
          <p className="text-[#1E1B1A]/70 text-sm">Initialisation de la passerelle Stripe...</p>
        </div>
      </div>
    );
  }

  if (error && !artworkInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7] p-4">
        <div className="bg-white border border-[#B33C2E]/20 rounded-xl p-8 max-w-md w-full text-center shadow-card">
          <AlertCircle className="w-12 h-12 text-[#B33C2E] mx-auto mb-4" />
          <h1 className="font-serif text-xl font-bold mb-2">Erreur de Paiement</h1>
          <p className="text-[#1E1B1A]/70 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push("/checkout")}
            className="w-full bg-[#C75C3A] hover:bg-[#C75C3A]/90 text-white font-medium py-3 rounded-lg transition-all h-11 text-sm cursor-pointer"
          >
            Retourner au panier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#1E1B1A] flex flex-col md:flex-row">
      
      {/* Left panel: Order Summary */}
      <div className="w-full md:w-1/2 bg-white md:bg-[#fcfbf9] p-8 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E8D9C6]/60">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <span className="font-serif text-[#C75C3A] text-2xl font-bold tracking-widest">SANKOFA</span>
            <span className="text-xs bg-[#E8D9C6] text-[#1E1B1A] font-bold px-2 py-0.5 rounded tracking-wider">SANDBOX</span>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-600 to-orange-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-white/50 text-xs italic relative">
                {artworkInfo?.image ? (
                  <img src={artworkInfo.image} alt={artworkInfo.title} className="w-full h-full object-cover" />
                ) : (
                  <span>Photos</span>
                )}
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold leading-tight text-[#1E1B1A]">{artworkInfo?.title}</h2>
                <p className="text-[#1E1B1A]/60 text-sm mt-1">{artworkInfo?.artist}</p>
                <span className="inline-block text-xs bg-[#D9A13B]/20 text-[#D9A13B] font-bold px-2 py-0.5 rounded uppercase tracking-wider text-[9px] mt-2">
                  Pièce Unique Certifiée
                </span>
              </div>
            </div>

            <div className="border-t border-[#E8D9C6]/50 pt-6 space-y-3">
              <div className="flex justify-between text-[#1E1B1A]/70 text-sm">
                <span>Sous-total</span>
                <span>{(artworkInfo?.amount || 0).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-[#1E1B1A]/70 text-sm">
                <span>Frais de transaction</span>
                <span className="text-[#2A7A3E] font-medium">Gratuit</span>
              </div>
              <div className="border-t border-[#E8D9C6]/50 pt-3 flex justify-between font-bold text-lg text-[#1E1B1A]">
                <span>Total à régler</span>
                <span>{(artworkInfo?.amount || 0).toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-xs text-[#1E1B1A]/50 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Propulsé par Stripe Sandbox. Aucun montant réel ne sera débité.</span>
        </div>
      </div>

      {/* Right panel: Payment form */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex items-center justify-center">
        <div className="max-w-md w-full">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-[#2A7A3E]/10 text-[#2A7A3E] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-[#1E1B1A]">Paiement Réussi !</h1>
              <p className="text-[#1E1B1A]/70 text-sm">
                Votre paiement a été traité avec succès. Nous transmettons votre commande au réseau sécurisé SANKOFA. Redirection...
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h1 className="font-serif text-2xl font-bold mb-2">Paiement par carte</h1>
                <p className="text-[#1E1B1A]/60 text-sm">Saisissez les informations de votre carte bancaire de test.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-[#B33C2E]/20 text-[#B33C2E] p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                {/* Cardholder Name */}
                <div>
                  <label htmlFor="cardholder" className="block text-xs font-semibold uppercase tracking-wider text-[#1E1B1A]/70 mb-2">
                    Nom du titulaire
                  </label>
                  <input
                    id="cardholder"
                    type="text"
                    required
                    value={cardholder}
                    onChange={(e) => setCardholder(e.target.value)}
                    className="w-full border border-[#E8D9C6] bg-white rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C75C3A]/20 h-11"
                    placeholder="Styve Mvondo"
                  />
                </div>

                {/* Card Number */}
                <div>
                  <label htmlFor="cardNumber" className="block text-xs font-semibold uppercase tracking-wider text-[#1E1B1A]/70 mb-2">
                    Numéro de carte
                  </label>
                  <div className="relative">
                    <input
                      id="cardNumber"
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, "").replace(/(\d{4})/g, "$1 ").trim().substring(0, 19))}
                      className="w-full border border-[#E8D9C6] bg-white rounded pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C75C3A]/20 h-11 font-mono tracking-wider"
                      placeholder="4242 4242 4242 4242"
                    />
                    <CreditCard className="w-5 h-5 text-[#1E1B1A]/40 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Expiry */}
                  <div>
                    <label htmlFor="expiry" className="block text-xs font-semibold uppercase tracking-wider text-[#1E1B1A]/70 mb-2">
                      Date d’expiration
                    </label>
                    <input
                      id="expiry"
                      type="text"
                      required
                      value={expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length > 2) {
                          val = val.substring(0, 2) + "/" + val.substring(2, 4);
                        }
                        setExpiry(val.substring(0, 5));
                      }}
                      className="w-full border border-[#E8D9C6] bg-white rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C75C3A]/20 h-11 text-center"
                      placeholder="MM/AA"
                    />
                  </div>

                  {/* CVC */}
                  <div>
                    <label htmlFor="cvc" className="block text-xs font-semibold uppercase tracking-wider text-[#1E1B1A]/70 mb-2">
                      Code CVC
                    </label>
                    <input
                      id="cvc"
                      type="password"
                      required
                      maxLength={3}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
                      className="w-full border border-[#E8D9C6] bg-white rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C75C3A]/20 h-11 text-center"
                      placeholder="123"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-[#C75C3A] hover:bg-[#C75C3A]/90 text-white font-semibold py-3.5 rounded transition-all shadow-md disabled:opacity-75 disabled:cursor-not-allowed h-12 flex items-center justify-center text-sm cursor-pointer mt-6"
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Traitement sécurisé...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 justify-center">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Régler {(artworkInfo?.amount || 0).toLocaleString()} FCFA</span>
                    </div>
                  )}
                </button>
              </form>

              <div className="border border-dashed border-[#E8D9C6] rounded-lg p-4 bg-[#fbfaf8] flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xs text-[#1E1B1A]/70 font-medium text-center sm:text-left">
                  Besoin de données de test ?
                </span>
                <button
                  type="button"
                  onClick={fillTestCard}
                  className="text-xs bg-[#E8D9C6] hover:bg-[#E8D9C6]/85 text-[#1E1B1A] font-bold px-3 py-1.5 rounded transition-all cursor-pointer h-8"
                >
                  Remplir la carte de test
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StripeMockPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#C75C3A] mx-auto mb-4" />
          <p className="text-[#1E1B1A]/70 text-sm">Chargement de la session de paiement...</p>
        </div>
      </div>
    }>
      <StripeMockForm />
    </Suspense>
  );
}

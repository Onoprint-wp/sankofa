"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Truck, CreditCard, ShieldCheck, AlertCircle, Loader2, Calendar } from "lucide-react";
import TransactionalLayout from "@/components/layout/TransactionalLayout";

export default function CheckoutPage() {
  const { cartItem, clearCart, updateCartItemMode, updateCartItemDuration } = useCart();
  const { user, session, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [shippingFee, setShippingFee] = useState(5000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Simulation states
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulationStep, setSimulationStep] = useState<"push" | "pin" | "success" | "error">("push");
  const [pinCode, setPinCode] = useState("");
  const [createdTransaction, setCreatedTransaction] = useState<{ orderId?: string; rentalId?: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      artwork_id: cartItem?.id || "",
      shipping_address: {
        full_name: "",
        phone: "",
        address_line: "",
        city: "Douala",
      },
      payment_method: "mobile_money",
      mobile_money_provider: "orange",
      mobile_money_phone: "",
      exhibition_id: cartItem?.exhibition_id || null,
    },
  });

  const city = watch("shipping_address.city");
  const paymentMethod = watch("payment_method");
  const mmProvider = watch("mobile_money_provider");
  const mmPhone = watch("mobile_money_phone");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/checkout`);
    }
  }, [authLoading, isAuthenticated, router]);

  // Update shipping fee based on city selection
  useEffect(() => {
    if (city === "Douala" || city === "Yaoundé") {
      setShippingFee(5000);
    } else {
      setShippingFee(15000);
    }
  }, [city]);

  // Sync artwork_id when cartItem loads
  useEffect(() => {
    if (cartItem) {
      setValue("artwork_id", cartItem.id);
      setValue("exhibition_id", cartItem.exhibition_id || null);
    }
  }, [cartItem, setValue]);

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
    return null; // Redirecting...
  }

  if (!cartItem) {
    return (
      <TransactionalLayout backHref="/" backLabel="Retourner au Catalogue">
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <ShoppingBag className="w-16 h-16 text-neutral/45 mb-6" />
          <h1 className="font-serif text-2xl font-bold mb-3">Votre panier est vide</h1>
          <p className="text-neutral text-sm mb-8">
            Vous n’avez sélectionné aucune œuvre pour le moment. Explorez notre catalogue pour trouver votre coup de cœur.
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

  const isRentalMode = cartItem.mode === "rent";
  const monthlyRate = cartItem.rental_price_per_month || Math.round(cartItem.price * 0.08);
  const duration = cartItem.rental_duration_months || 1;

  // Calcul du montant à payer immédiatement
  // Achat : Prix œuvre + Livraison
  // Location : 1er Loyer + Livraison
  const amountToPayNow = isRentalMode ? monthlyRate + shippingFee : cartItem.price + shippingFee;

  const handleCheckoutSubmit = async (data: CheckoutInput) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const endpoint = isRentalMode ? "/api/rentals/create" : "/api/orders/create";
      const payload = isRentalMode 
        ? { ...data, duration_months: duration } 
        : data;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Une erreur est survenue lors de l'initialisation de la commande.");
      }

      if (data.payment_method === "card") {
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          throw new Error("URL de paiement Stripe manquante dans la réponse.");
        }
      } else if (data.payment_method === "mobile_money") {
        setCreatedTransaction({
          orderId: result.order?.id,
          rentalId: result.rental?.id,
        });
        setShowSimulator(true);
        setSimulationStep("push");
      }
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPinSimulation = () => {
    setSimulationStep("pin");
  };

  const confirmPinSimulation = async () => {
    if (pinCode.length < 4 || !createdTransaction) return;
    
    setIsSubmitting(true);
    setServerError(null);
    try {
      const { orderId, rentalId } = createdTransaction;
      const simulateUrl = orderId
        ? `/api/webhooks/paynote/simulate?orderId=${orderId}&provider=${watch("mobile_money_provider")}&phone=${encodeURIComponent(watch("mobile_money_phone") || "")}`
        : `/api/webhooks/paynote/simulate?rentalId=${rentalId}&provider=${watch("mobile_money_provider")}&phone=${encodeURIComponent(watch("mobile_money_phone") || "")}`;

      const response = await fetch(simulateUrl, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "La confirmation de paiement a échoué.");
      }

      setSimulationStep("success");
      clearCart();
      setTimeout(() => {
        if (rentalId) {
          router.push(`/checkout/success?rentalId=${rentalId}`);
        } else if (orderId) {
          router.push(`/checkout/success?orderId=${orderId}`);
        }
      }, 1500);
    } catch (error: any) {
      setServerError(error.message);
      setSimulationStep("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TransactionalLayout backHref="/" backLabel="Retour au Catalogue">

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-serif text-3xl font-bold mb-8 text-center sm:text-left">Finaliser votre commande</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Checkout Form */}
          <div className="lg:col-span-7 bg-card border border-border/80 rounded-xl shadow-card p-6 sm:p-8 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

            {/* Mode Switcher if rental available */}
            {cartItem.is_rental_available && (
              <div className="space-y-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-neutral">Formule de transaction</span>
                <div className="flex bg-secondary/20 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => updateCartItemMode("buy")}
                    className={`flex-1 text-center py-2 text-sm font-semibold rounded-md transition-all cursor-pointer h-10 ${
                      !isRentalMode ? "bg-white text-dark shadow-sm" : "text-neutral hover:text-dark"
                    }`}
                  >
                    Achat Direct
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCartItemMode("rent")}
                    className={`flex-1 text-center py-2 text-sm font-semibold rounded-md transition-all cursor-pointer h-10 ${
                      isRentalMode ? "bg-white text-dark shadow-sm" : "text-neutral hover:text-dark"
                    }`}
                  >
                    Location Temporaire
                  </button>
                </div>
              </div>
            )}

            {/* Rental Duration Options */}
            {isRentalMode && (
              <div className="space-y-3 animate-slideDown">
                <span className="block text-xs font-semibold uppercase tracking-wider text-neutral flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  Durée de la location (Option d’achat déductible)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 3, 6].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateCartItemDuration(m as any)}
                      className={`border rounded-lg p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center h-16 ${
                        duration === m
                          ? "border-primary bg-primary/5 ring-1 ring-primary font-bold text-primary"
                          : "border-border hover:bg-secondary/5 text-dark"
                      }`}
                    >
                      <span className="text-sm">{m} Mois</span>
                      <span className="text-[9px] opacity-80 mt-1 font-normal">{(monthlyRate * m).toLocaleString()} FCFA total</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#8a765d] leading-relaxed italic">
                  Chaque loyer payé réduit le prix d’acquisition final de l’œuvre si vous décidez de l’acheter plus tard.
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit(handleCheckoutSubmit)} className="space-y-8">
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-error p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{serverError}</p>
                </div>
              )}

              {/* Shipping Address */}
              <div className="space-y-4">
                <h2 className="text-base font-bold text-dark flex items-center gap-2 pb-2 border-b border-border/60">
                  <Truck className="w-5 h-5 text-primary" />
                  Adresse de livraison
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                      Nom complet <span className="text-primary">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      {...register("shipping_address.full_name")}
                      className={`w-full border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 h-11 ${
                        errors.shipping_address?.full_name ? "border-error focus:ring-error/20" : "border-border focus:ring-primary/20"
                      }`}
                      placeholder="Ex: Styve Mvondo"
                    />
                    {errors.shipping_address?.full_name && (
                      <p className="text-error text-xs mt-1.5">{errors.shipping_address.full_name.message}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="shippingPhone" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                      Téléphone de contact <span className="text-primary">*</span>
                    </label>
                    <input
                      id="shippingPhone"
                      type="text"
                      {...register("shipping_address.phone")}
                      className={`w-full border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 h-11 ${
                        errors.shipping_address?.phone ? "border-error focus:ring-error/20" : "border-border focus:ring-primary/20"
                      }`}
                      placeholder="Ex: +237699000000"
                    />
                    {errors.shipping_address?.phone && (
                      <p className="text-error text-xs mt-1.5">{errors.shipping_address.phone.message}</p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label htmlFor="shippingCity" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                      Ville de livraison <span className="text-primary">*</span>
                    </label>
                    <select
                      id="shippingCity"
                      {...register("shipping_address.city")}
                      className="w-full border border-border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white h-11"
                    >
                      <option value="Douala">Douala (5 000 FCFA)</option>
                      <option value="Yaoundé">Yaoundé (5 000 FCFA)</option>
                      <option value="Autre">Autre Ville (15 000 FCFA)</option>
                    </select>
                  </div>

                  {/* Address Line */}
                  <div className="sm:col-span-2">
                    <label htmlFor="addressLine" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                      Adresse de livraison <span className="text-primary">*</span>
                    </label>
                    <input
                      id="addressLine"
                      type="text"
                      {...register("shipping_address.address_line")}
                      className={`w-full border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 h-11 ${
                        errors.shipping_address?.address_line ? "border-error focus:ring-error/20" : "border-border focus:ring-primary/20"
                      }`}
                      placeholder="Ex: Rue 1.450, Bastos, face pharmacie"
                    />
                    {errors.shipping_address?.address_line && (
                      <p className="text-error text-xs mt-1.5">{errors.shipping_address.address_line.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <h2 className="text-base font-bold text-dark flex items-center gap-2 pb-2 border-b border-border/60">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Mode de paiement
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {/* Mobile Money Selector */}
                  <label className={`border rounded-lg p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                    paymentMethod === "mobile_money" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-secondary/5"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-dark">Mobile Money</span>
                      <input
                        type="radio"
                        value="mobile_money"
                        {...register("payment_method")}
                        className="w-4 h-4 text-primary"
                      />
                    </div>
                    <span className="text-[10px] text-neutral uppercase tracking-widest">Orange / MTN</span>
                  </label>

                  {/* Card Selector */}
                  <label className={`border rounded-lg p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                    paymentMethod === "card" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-secondary/5"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-dark">Carte Bancaire</span>
                      <input
                        type="radio"
                        value="card"
                        {...register("payment_method")}
                        className="w-4 h-4 text-primary"
                      />
                    </div>
                    <span className="text-[10px] text-neutral uppercase tracking-widest">Visa / Mastercard</span>
                  </label>
                </div>

                {/* Conditional Mobile Money fields */}
                {paymentMethod === "mobile_money" && (
                  <div className="border border-border/60 rounded-lg p-4 bg-secondary/5 space-y-4 animate-slideDown">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral block">Opérateur & Numéro</span>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Orange */}
                      <label className={`border rounded p-3 flex items-center justify-between cursor-pointer bg-white transition-all ${
                        mmProvider === "orange" ? "border-primary ring-1 ring-primary" : "border-border"
                      }`}>
                        <span className="text-xs font-semibold">Orange</span>
                        <input
                          type="radio"
                          value="orange"
                          {...register("mobile_money_provider")}
                          className="w-3.5 h-3.5 text-primary"
                        />
                      </label>

                      {/* MTN */}
                      <label className={`border rounded p-3 flex items-center justify-between cursor-pointer bg-white transition-all ${
                        mmProvider === "mtn" ? "border-primary ring-1 ring-primary" : "border-border"
                      }`}>
                        <span className="text-xs font-semibold">MTN</span>
                        <input
                          type="radio"
                          value="mtn"
                          {...register("mobile_money_provider")}
                          className="w-3.5 h-3.5 text-primary"
                        />
                      </label>

                      {/* Moov */}
                      <label className={`border rounded p-3 flex items-center justify-between cursor-pointer bg-white transition-all ${
                        mmProvider === "moov" ? "border-primary ring-1 ring-primary" : "border-border"
                      }`}>
                        <span className="text-xs font-semibold">Moov</span>
                        <input
                          type="radio"
                          value="moov"
                          {...register("mobile_money_provider")}
                          className="w-3.5 h-3.5 text-primary"
                        />
                      </label>

                      {/* Airtel */}
                      <label className={`border rounded p-3 flex items-center justify-between cursor-pointer bg-white transition-all ${
                        mmProvider === "airtel" ? "border-primary ring-1 ring-primary" : "border-border"
                      }`}>
                        <span className="text-xs font-semibold">Airtel</span>
                        <input
                          type="radio"
                          value="airtel"
                          {...register("mobile_money_provider")}
                          className="w-3.5 h-3.5 text-primary"
                        />
                      </label>
                    </div>

                    {/* Mobile Money Phone */}
                    <div>
                      <label htmlFor="mmPhone" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                        Numéro de téléphone de débit Mobile Money <span className="text-primary">*</span>
                      </label>
                      <input
                        id="mmPhone"
                        type="text"
                        {...register("mobile_money_phone")}
                        className={`w-full border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 h-11 bg-white ${
                          errors.mobile_money_phone ? "border-error focus:ring-error/20" : "border-border focus:ring-primary/20"
                        }`}
                        placeholder="Ex: +237699000000"
                      />
                      {errors.mobile_money_phone && (
                        <p className="text-error text-xs mt-1.5">{errors.mobile_money_phone.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Conditional Card notice */}
                {paymentMethod === "card" && (
                  <div className="border border-border/60 rounded-lg p-4 bg-secondary/5 text-sm text-neutral/80 flex items-start gap-2.5 animate-slideDown">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p>
                      Vos données bancaires sont entièrement sécurisées et chiffrées de bout en bout. Nous acceptons les cartes Visa et Mastercard. Les fonds seront séquestrés jusqu’à votre confirmation de livraison.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed h-12 flex items-center justify-center text-sm cursor-pointer"
              >
                {isRentalMode 
                  ? `Régler le 1er loyer • ${amountToPayNow.toLocaleString()} FCFA`
                  : `Passer commande • ${amountToPayNow.toLocaleString()} FCFA`
                }
              </button>
            </form>
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-5 bg-card border border-border/80 rounded-xl shadow-card p-6 space-y-6">
            <h2 className="text-base font-bold text-dark pb-2 border-b border-border/60">
              {isRentalMode ? "Résumé de la location" : "Résumé de l’achat"}
            </h2>
            
            <div className="flex gap-4">
              {/* Image Container */}
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-600 to-orange-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-white/50 text-xs italic relative">
                {cartItem.photos && cartItem.photos[0] ? (
                  <img src={cartItem.photos[0]} alt={cartItem.title} className="w-full h-full object-cover" />
                ) : (
                  <span>Photos</span>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-dark mb-1 leading-tight">{cartItem.title}</h3>
                  <p className="text-neutral text-xs">{cartItem.artist_name}</p>
                </div>
                <div>
                  <span className="text-xs bg-accent/25 text-dark font-bold px-2 py-0.5 rounded uppercase tracking-wider text-[9px]">
                    Pièce Unique
                  </span>
                </div>
              </div>
            </div>

            {/* Price Details */}
            <div className="border-t border-border/60 pt-4 space-y-3 text-sm">
              {!isRentalMode ? (
                <>
                  <div className="flex justify-between text-neutral">
                    <span>Prix de l’œuvre</span>
                    <span className="font-medium text-dark">{cartItem.price.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-neutral">
                    <span>Frais de livraison ({city === "Autre" ? "Autre Ville" : city})</span>
                    <span className="font-medium text-dark">{shippingFee.toLocaleString()} FCFA</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-neutral">
                    <span>Loyer mensuel ({duration} mois)</span>
                    <span className="font-medium text-dark">{monthlyRate.toLocaleString()} FCFA / mois</span>
                  </div>
                  <div className="flex justify-between text-neutral">
                    <span>Frais de livraison initial</span>
                    <span className="font-medium text-dark">{shippingFee.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-neutral border-b border-dashed border-border/40 pb-2">
                    <span>Loyers restants ({duration - 1} mois)</span>
                    <span className="font-medium text-neutral">
                      {duration > 1 ? `${((duration - 1) * monthlyRate).toLocaleString()} FCFA` : "Aucun"}
                    </span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between text-neutral">
                <span>Frais de séquestre (Garantie SANKOFA)</span>
                <span className="text-success font-medium">Gratuit</span>
              </div>
              <div className="border-t border-border/60 pt-3 flex justify-between font-bold text-base text-dark">
                <span>{isRentalMode ? "À payer maintenant" : "Total à régler"}</span>
                <span>{amountToPayNow.toLocaleString()} FCFA</span>
              </div>
            </div>

            {/* Escrow Guarantee Text */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-xs space-y-2">
              <span className="font-bold text-success-dark flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-success" />
                Garantie de Séquestre SANKOFA
              </span>
              <p className="text-gray-700 leading-relaxed">
                {isRentalMode
                  ? "Vos loyers sont versés de manière sécurisée. Si vous décidez d'acheter l'œuvre ultérieurement, la totalité des mensualités déjà payées sera déduite du prix d'achat final."
                  : "Vos fonds sont conservés sur un compte technique sécurisé. L’artiste ne sera payé qu’après votre validation de la livraison (ou après un délai automatique de 48h sans signalement). Vous disposez de 48h après réception pour ouvrir un litige."
                }
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Money Simulator Modal Overlay */}
      {showSimulator && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-hover max-w-md w-full overflow-hidden animate-scaleUp">
            {/* Simulator Header */}
            <div className="bg-primary text-white p-5 text-center relative">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Paynote Sandbox</span>
              <h3 className="font-serif text-lg font-bold">Simulateur Mobile Money</h3>
            </div>

            {/* Simulator Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {simulationStep === "push" && (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <h4 className="font-bold text-dark">Envoi de la requête de débit...</h4>
                  <p className="text-neutral text-xs leading-relaxed">
                    Une notification Push USSD a été simulée vers le numéro <span className="font-bold text-dark">{mmPhone}</span> ({mmProvider?.toUpperCase()}).
                  </p>
                  <div className="bg-secondary/15 rounded-lg p-4 text-left border border-border/40 text-xs text-neutral leading-relaxed">
                    <p className="font-semibold text-dark mb-1">Détails de la transaction simulée :</p>
                    <p>• Marchand : SANKOFA Art Ltd</p>
                    <p>• Montant : {amountToPayNow.toLocaleString()} FCFA</p>
                    <p>• Moyen : {mmProvider?.toUpperCase()} Money</p>
                  </div>
                  <button
                    onClick={startPinSimulation}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 cursor-pointer"
                  >
                    Afficher l’écran de validation PIN
                  </button>
                </div>
              )}

              {simulationStep === "pin" && (
                <div className="space-y-4">
                  <h4 className="font-bold text-dark text-center">Saisie du code secret PIN</h4>
                  <p className="text-neutral text-xs text-center leading-relaxed">
                    Pour autoriser le débit de <span className="font-bold text-dark">{amountToPayNow.toLocaleString()} FCFA</span>, saisissez votre code secret à 4 chiffres (sandbox).
                  </p>

                  <div className="flex justify-center gap-2">
                    <input
                      type="password"
                      maxLength={4}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                      className="border-2 border-border focus:border-primary rounded-md w-36 h-12 text-center text-xl font-bold tracking-widest focus:outline-none"
                      placeholder="••••"
                    />
                  </div>

                  <button
                    onClick={confirmPinSimulation}
                    disabled={pinCode.length < 4 || isSubmitting}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmer le paiement
                  </button>
                </div>
              )}

              {simulationStep === "success" && (
                <div className="text-center space-y-3 py-4">
                  <div className="w-12 h-12 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <h4 className="font-bold text-success-dark">Débit Autorisé</h4>
                  <p className="text-neutral text-xs">
                    Le paiement a été confirmé. Les fonds sont maintenant séquestrés. Redirection en cours...
                  </p>
                </div>
              )}

              {simulationStep === "error" && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-12 h-12 bg-error/15 text-error rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    !
                  </div>
                  <h4 className="font-bold text-error-dark">Échec de la transaction</h4>
                  <p className="text-neutral text-xs">
                    {serverError || "La transaction a été rejetée ou a expiré."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSimulator(false)}
                      className="flex-1 border border-border text-dark text-xs py-2.5 rounded hover:bg-secondary/5 font-semibold cursor-pointer"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => {
                        setSimulationStep("push");
                        setPinCode("");
                      }}
                      className="flex-1 bg-primary text-white text-xs py-2.5 rounded hover:bg-primary-dark font-semibold cursor-pointer"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </TransactionalLayout>
  );
}

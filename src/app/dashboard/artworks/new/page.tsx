"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, AlertCircle, FileText, Lock, Award, Loader2, Sparkles } from "lucide-react";
import { artworkSchema, type ArtworkInput } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import TransactionalLayout from "@/components/layout/TransactionalLayout";
import FileUpload from "@/components/ui/FileUpload";

export default function NewArtwork() {
  const { user, profile, artist, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionAiError, setDescriptionAiError] = useState<string | null>(null);

  const generateDescriptionWithAI = async () => {
    const titleVal = watch("title");
    const categoryVal = watch("category");
    const materialsVal = watch("materials") || [];

    if (!titleVal || !titleVal.trim()) {
      setDescriptionAiError("Veuillez saisir un titre avant de générer la description.");
      return;
    }

    setIsGeneratingDescription(true);
    setDescriptionAiError(null);

    try {
      const response = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleVal,
          category: categoryVal,
          materials: materialsVal,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erreur de génération.");
      }

      if (result.description) {
        setValue("description", result.description, { shouldValidate: true });
      }
    } catch (err: any) {
      console.error(err);
      setDescriptionAiError(err.message || "Une erreur est survenue pendant la génération.");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Initialize form with Zod schema
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ArtworkInput>({
    resolver: zodResolver(artworkSchema),
    defaultValues: {
      title: "",
      description: "",
      price: undefined,
      category: "Peinture",
      height: undefined,
      width: undefined,
      depth: 0,
      weight: undefined,
      materials: [],
      photos: [], // default to empty for mandatory file upload
      is_rental_available: false,
      rental_price_per_month: undefined,
    },
  });

  const isRentalAvailable = watch("is_rental_available");
  const photos = watch("photos") || [];
  const mainPhoto = photos[0] || "";

  const onSubmit = async (data: ArtworkInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setSuccessData(null);

    // Format materials array from comma-separated string if it's sent as a single string
    // Handled below in form submission (register returns string, we transform it)
    try {
      const response = await fetch("/api/artworks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Une erreur est survenue lors de la création de l'œuvre.");
      }

      setSuccessData(result);
    } catch (err: any) {
      setServerError(err.message || "Une erreur réseau s'est produite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-secondary/15 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral text-sm">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== "artist") {
    return (
      <div className="min-h-screen bg-secondary/15 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-error" />
          <Lock className="w-14 h-14 text-error mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-3">Accès interdit</h1>
          <p className="text-neutral text-sm leading-relaxed mb-6 font-medium">
            Cette page est strictement réservée aux artistes de la plateforme SANKOFA.
          </p>
          <Link href="/" className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-3 px-6 rounded shadow transition-all block h-11 flex items-center justify-center">
            Retour au Catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (artist?.kyc_status !== "approved") {
    return (
      <div className="min-h-screen bg-secondary/15 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-accent" />
          <AlertCircle className="w-14 h-14 text-accent mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-3">KYC requis</h1>
          <p className="text-neutral text-sm leading-relaxed mb-6 font-medium">
            Vos documents d’identité doivent être approuvés par nos administrateurs avant d’ajouter des œuvres.
          </p>
          <Link href="/become-artist" className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-3 px-6 rounded shadow transition-all block h-11 flex items-center justify-center">
            Vérifier le statut KYC
          </Link>
        </div>
      </div>
    );
  }

  if (!artist?.academy_completed) {
    return (
      <div className="min-h-screen bg-secondary/15 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#d9a13b]" />
          <Award className="w-14 h-14 text-[#d9a13b] mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-3">Certification requise</h1>
          <p className="text-neutral text-sm leading-relaxed mb-6 font-medium">
            Pour garantir le sérieux et le professionnalisme sur SANKOFA, vous devez valider la formation obligatoire de l’Académie avant d’ajouter votre première œuvre.
          </p>
          <Link href="/dashboard/academy" className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-3 px-6 rounded shadow transition-all block h-11 flex items-center justify-center">
            Commencer la formation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TransactionalLayout backHref="/" backLabel="Retour au Tableau de bord">

      {/* Main container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12">
        <div className="bg-card border border-border/80 rounded-xl shadow-card p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
          
          <div className="mb-8 text-center sm:text-left">
            <h1 className="font-serif text-3xl font-bold mb-3">Déposer une nouvelle œuvre</h1>
            <p className="text-neutral text-sm leading-relaxed">
              Renseignez les détails de votre œuvre originale. Elle sera soumise à notre comité de curation éditoriale avant publication.
            </p>
          </div>

          {successData ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fadeIn">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold text-success-dark mb-3">Œuvre Déposée !</h2>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                {successData.message}
              </p>
              <div className="bg-white border border-gray-100 rounded-md p-4 text-left mb-6 shadow-sm">
                <p className="text-xs text-neutral font-semibold uppercase tracking-wider mb-2">Détails enregistrés :</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Titre :</span> {successData.artwork.title}</p>
                  <p><span className="font-medium">Catégorie :</span> {successData.artwork.category}</p>
                  <p><span className="font-medium">Prix de vente :</span> {successData.artwork.price} FCFA</p>
                  {successData.artwork.is_rental_available && (
                    <p><span className="font-medium">Tarif location :</span> {successData.artwork.rental_price_per_month} FCFA / mois</p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 flex items-center justify-center"
                >
                  Déposer une autre œuvre
                </button>
                <Link
                  href="/"
                  className="block w-full border border-primary text-primary hover:bg-primary/5 font-medium py-3 rounded transition-all h-11 flex items-center justify-center"
                >
                  Retour au Catalogue
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-error p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{serverError}</p>
                </div>
              )}

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                  Titre de l’œuvre <span className="text-primary">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register("title")}
                  className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 h-11 ${
                    errors.title
                      ? "border-error focus:ring-error/25"
                      : "border-border focus:ring-primary/25 focus:border-primary"
                  }`}
                  placeholder="Ex: L'Ombre du Baobab"
                />
                {errors.title && (
                  <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-neutral">
                    Description / Histoire de l’œuvre <span className="text-primary">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateDescriptionWithAI}
                    disabled={isGeneratingDescription}
                    className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors flex items-center gap-1.5 min-h-[44px] px-3 border border-primary/20 rounded-lg bg-primary/5 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingDescription ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Générer avec l&apos;IA
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="description"
                  {...register("description")}
                  rows={4}
                  className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.description
                      ? "border-error focus:ring-error/25"
                      : "border-border focus:ring-primary/25 focus:border-primary"
                  }`}
                  placeholder="Racontez l'histoire derrière l'œuvre, les émotions capturées, les techniques africaines traditionnelles ou futuristes employées..."
                />
                {errors.description && (
                  <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {errors.description.message}
                  </p>
                )}
                {descriptionAiError && (
                  <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {descriptionAiError}
                  </p>
                )}
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                    Catégorie <span className="text-primary">*</span>
                  </label>
                  <select
                    id="category"
                    {...register("category")}
                    className="w-full border border-border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary bg-white h-11"
                  >
                    <option value="Peinture">Peinture</option>
                    <option value="Sculpture">Sculpture</option>
                    <option value="Art Numérique">Art Numérique</option>
                    <option value="Photographie">Photographie</option>
                    <option value="Autre">Autre</option>
                  </select>
                  {errors.category && (
                    <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {errors.category.message}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label htmlFor="price" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                    Prix de vente (FCFA) <span className="text-primary">*</span>
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="500"
                    {...register("price", { valueAsNumber: true })}
                    className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 h-11 ${
                      errors.price
                        ? "border-error focus:ring-error/25"
                        : "border-border focus:ring-primary/25 focus:border-primary"
                    }`}
                    placeholder="Ex: 250000"
                  />
                  {errors.price && (
                    <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {errors.price.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Dimensions: H x W x D + Weight */}
              <div className="border border-border/60 rounded-lg p-4 bg-secondary/5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral block">Dimensions & Poids</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="height" className="block text-[10px] font-semibold text-neutral mb-1">Hauteur (cm)</label>
                    <input
                      id="height"
                      type="number"
                      {...register("height", { valueAsNumber: true })}
                      className="w-full border border-border rounded px-3 py-2 text-xs focus:outline-none h-9"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label htmlFor="width" className="block text-[10px] font-semibold text-neutral mb-1">Largeur (cm)</label>
                    <input
                      id="width"
                      type="number"
                      {...register("width", { valueAsNumber: true })}
                      className="w-full border border-border rounded px-3 py-2 text-xs focus:outline-none h-9"
                      placeholder="80"
                    />
                  </div>
                  <div>
                    <label htmlFor="depth" className="block text-[10px] font-semibold text-neutral mb-1">Profondeur (cm)</label>
                    <input
                      id="depth"
                      type="number"
                      {...register("depth", { valueAsNumber: true })}
                      className="w-full border border-border rounded px-3 py-2 text-xs focus:outline-none h-9"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label htmlFor="weight" className="block text-[10px] font-semibold text-neutral mb-1">Poids (kg)</label>
                    <input
                      id="weight"
                      type="number"
                      step="0.1"
                      {...register("weight", { valueAsNumber: true })}
                      className="w-full border border-border rounded px-3 py-2 text-xs focus:outline-none h-9"
                      placeholder="2.5"
                    />
                  </div>
                </div>
                
                {(errors.height || errors.width || errors.depth || errors.weight) && (
                  <p className="text-error text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Dimensions et poids valides requis (supérieurs à 0).
                  </p>
                )}
              </div>

              {/* Materials & Photo URL mockup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Materials input (mocked to array conversion on submit) */}
                <div>
                  <label htmlFor="materials-raw" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                    Matériaux (séparés par des virgules) <span className="text-primary">*</span>
                  </label>
                  <input
                    id="materials-raw"
                    type="text"
                    onChange={(e) => {
                      const vals = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                      setValue("materials", vals, { shouldValidate: true });
                    }}
                    className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 h-11 ${
                      errors.materials
                        ? "border-error focus:ring-error/25"
                        : "border-border focus:ring-primary/25"
                    }`}
                    placeholder="Bois, Bronze, Acrylique..."
                  />
                  {errors.materials && (
                    <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {errors.materials.message}
                    </p>
                  )}
                </div>

                {/* Photos upload */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                    Photo principale de l’œuvre <span className="text-primary">*</span>
                  </label>
                  <FileUpload
                    bucket="artwork-images"
                    value={mainPhoto}
                    onChange={(val) => setValue("photos", val ? [val] : [], { shouldValidate: true })}
                    label="Téléverser la photo de l’œuvre"
                    accept="image/jpeg,image/png,image/webp"
                    maxSizeMB={20}
                  />
                  {errors.photos && (
                    <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {errors.photos.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Rental Availability Option */}
              <div className="border border-border/60 rounded-lg p-5 bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="is_rental_available" className="text-sm font-bold text-dark block cursor-pointer">
                      Proposer l’œuvre à la location (Artothèque)
                    </label>
                    <p className="text-xs text-neutral">Les acheteurs pourront louer cette œuvre sur 1, 3 ou 6 mois.</p>
                  </div>
                  <input
                    id="is_rental_available"
                    type="checkbox"
                    {...register("is_rental_available")}
                    className="w-5 h-5 text-primary border-border focus:ring-primary focus:ring-offset-2 rounded cursor-pointer"
                  />
                </div>

                {/* Conditional monthly rate input */}
                {isRentalAvailable && (
                  <div className="pt-3 border-t border-border/40 animate-slideDown">
                    <label htmlFor="rental_price_per_month" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                      Loyer mensuel proposé (FCFA / mois) <span className="text-primary">*</span>
                    </label>
                    <input
                      id="rental_price_per_month"
                      type="number"
                      step="100"
                      {...register("rental_price_per_month", { valueAsNumber: true })}
                      className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 h-11 ${
                        errors.rental_price_per_month
                          ? "border-error focus:ring-error/25"
                          : "border-border focus:ring-primary/25 focus:border-primary"
                      }`}
                      placeholder="Ex: 15000"
                    />
                    {errors.rental_price_per_month && (
                      <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {errors.rental_price_per_month.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed h-12 flex items-center justify-center text-sm"
              >
                {isSubmitting ? "Enregistrement..." : "Soumettre à la validation"}
              </button>
            </form>
          )}
        </div>
      </main>

    </TransactionalLayout>
  );
}

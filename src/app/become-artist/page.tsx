"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Upload, 
  AlertCircle, 
  Lock, 
  Clock, 
  XCircle 
} from "lucide-react";
import { kycSchema, type KycInput } from "@/lib/validations";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import TransactionalLayout from "@/components/layout/TransactionalLayout";
import FileUpload from "@/components/ui/FileUpload";

export default function BecomeArtist() {
  const { user, profile, artist, loading, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<KycInput>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      cni_url: "",
      selfie_url: "",
    },
  });

  const cniUrl = watch("cni_url");
  const selfieUrl = watch("selfie_url");

  const onSubmit = async (data: KycInput) => {
    if (!user) return;
    setIsSubmitting(true);
    setServerError(null);
    setSuccess(false);

    try {
      // Update artist KYC details in public.artists
      const { error: updateError } = await supabase
        .from("artists")
        .update({
          cni_url: data.cni_url,
          selfie_url: data.selfie_url,
          kyc_status: "pending",
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      await refreshProfile();
    } catch (err: any) {
      setServerError(err.message || "Une erreur est survenue lors de l’envoi des documents.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/15 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral text-sm">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  // 2. Not Authenticated State
  if (!user || !profile) {
    return (
      <TransactionalLayout backHref="/" backLabel="Retour">
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-20">
          <div className="bg-card border border-border rounded-xl p-8 text-center relative overflow-hidden shadow-card">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
            <Lock className="w-16 h-16 text-neutral mx-auto mb-4" />
            <h1 className="font-serif text-2xl font-bold mb-3">Accès restreint</h1>
            <p className="text-neutral text-sm leading-relaxed mb-6">
              Vous devez créer un compte artiste ou vous connecter pour soumettre vos pièces justificatives KYC.
            </p>
            <div className="space-y-3">
              <Link href="/signup" className="block w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all flex items-center justify-center h-11">
                Créer un compte Artiste
              </Link>
              <Link href="/login" className="block w-full border border-primary text-primary hover:bg-primary/5 font-medium py-3 rounded transition-all flex items-center justify-center h-11">
                Se connecter
              </Link>
            </div>
          </div>
        </main>
      </TransactionalLayout>
    );
  }

  // 3. Logged in but not an Artist (e.g. Buyer wanting to become artist)
  if (profile.role !== "artist") {
    return (
      <TransactionalLayout backHref="/" backLabel="Retour">
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-20">
          <div className="bg-card border border-border rounded-xl p-8 text-center relative overflow-hidden shadow-card">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
            <AlertTriangle className="w-16 h-16 text-accent mx-auto mb-4" />
            <h1 className="font-serif text-2xl font-bold mb-3">Rôle incorrect</h1>
            <p className="text-neutral text-sm leading-relaxed mb-6">
              Votre compte est actuellement configuré comme **Acheteur**. Pour vendre des œuvres, veuillez créer un nouveau profil artiste ou contacter le support pour migrer votre rôle.
            </p>
            <Link href="/" className="block w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all flex items-center justify-center h-11">
              Retour au Catalogue
            </Link>
          </div>
        </main>
      </TransactionalLayout>
    );
  }

  // Determine current KYC status display
  const kycStatus = artist?.kyc_status || "unsubmitted";

  return (
    <TransactionalLayout backHref="/" backLabel="Retour au Tableau de bord">

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12">
        <div className="bg-card border border-border/80 rounded-xl shadow-card p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />

          {/* SUCCESS STATE (Just Submitted) */}
          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fadeIn">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold text-success-dark mb-3">Documents Envoyés !</h2>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                Vos documents d’identité ont été soumis avec succès. Notre équipe va examiner votre demande sous 24 à 48 heures.
              </p>
              <Link href="/" className="block w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 flex items-center justify-center">
                Retour à l’accueil
              </Link>
            </div>
          ) : kycStatus === "approved" ? (
            /* APPROVED STATE */
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold text-success-dark mb-3">Identité Vérifiée</h2>
              {artist?.academy_completed ? (
                <>
                  <p className="text-gray-700 text-sm leading-relaxed mb-6 font-medium">
                    Félicitations ! Votre profil artiste a été approuvé et vous êtes certifié SANKOFA. Vous pouvez maintenant publier vos œuvres.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/dashboard/artworks/new" className="bg-primary hover:bg-primary-dark text-white font-medium py-3 px-6 rounded shadow transition-all h-11 flex items-center justify-center">
                      Déposer une œuvre
                    </Link>
                    <Link href="/dashboard/academy" className="border border-primary text-primary hover:bg-primary/5 font-medium py-3 px-6 rounded transition-all h-11 flex items-center justify-center">
                      Revoir les formations
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-700 text-sm leading-relaxed mb-6 font-medium">
                    Votre identité a été approuvée ! Pour finaliser votre inscription et pouvoir publier vos œuvres, veuillez compléter la formation obligatoire de l’Académie SANKOFA.
                  </p>
                  <Link href="/dashboard/academy" className="block w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 flex items-center justify-center">
                    Accéder à l’Académie
                  </Link>
                </>
              )}
            </div>
          ) : kycStatus === "pending" ? (
            /* PENDING REVIEW STATE */
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-xl font-bold text-blue-800 mb-3">Vérification en cours</h2>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                Vos justificatifs (CNI et Selfie) sont en attente de vérification par nos administrateurs. Vous recevrez une notification par email dès confirmation.
              </p>
              <Link href="/" className="block w-full border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-3 rounded transition-all h-11 flex items-center justify-center">
                Retour à l’accueil
              </Link>
            </div>
          ) : (
            /* UNSUBMITTED / REJECTED FORM STATE */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="mb-4">
                <h1 className="font-serif text-3xl font-bold mb-3">Vérification d’identité</h1>
                <p className="text-neutral text-sm leading-relaxed">
                  Pour des raisons de lutte contre la contrefaçon, veuillez renseigner les liens de vos pièces justificatives.
                </p>
              </div>

              {kycStatus === "rejected" && (
                <div className="bg-red-50 border border-red-200 text-error p-4 rounded-lg flex items-start gap-3">
                  <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">Vérification Rejetée</p>
                    <p className="text-xs mt-1">Motif : {artist?.rejection_reason || "Documents non lisibles."}</p>
                    <p className="text-xs mt-1">Veuillez renvoyer des liens valides.</p>
                  </div>
                </div>
              )}

              {serverError && (
                <div className="bg-red-50 border border-red-200 text-error p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{serverError}</p>
                </div>
              )}

              {/* CNI Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                  Photo de la CNI / Passeport <span className="text-primary">*</span>
                </label>
                <input type="hidden" {...register("cni_url")} />
                <FileUpload
                  bucket="kyc-documents"
                  value={cniUrl}
                  onChange={(val) => setValue("cni_url", val, { shouldValidate: true })}
                  label="Téléverser votre CNI / Passeport"
                  accept="image/jpeg,image/png,application/pdf"
                  maxSizeMB={10}
                />
                {errors.cni_url && (
                  <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {errors.cni_url.message}
                  </p>
                )}
              </div>

              {/* Selfie Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                  Photo de votre Selfie avec l’œuvre <span className="text-primary">*</span>
                </label>
                <input type="hidden" {...register("selfie_url")} />
                <FileUpload
                  bucket="kyc-documents"
                  value={selfieUrl}
                  onChange={(val) => setValue("selfie_url", val, { shouldValidate: true })}
                  label="Téléverser un Selfie avec l’œuvre"
                  accept="image/jpeg,image/png"
                  maxSizeMB={10}
                />
                <p className="text-[11px] text-neutral mt-2">
                  Le selfie doit montrer clairement votre visage à côté d’une de vos œuvres d’art.
                </p>
                {errors.selfie_url && (
                  <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {errors.selfie_url.message}
                  </p>
                )}
              </div>

              <div className="bg-accent/10 border border-accent/25 rounded-lg p-4 text-xs text-dark leading-relaxed flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  Vos documents de vérification d’identité sont stockés de manière confidentielle et cryptée. Ils ne seront jamais partagés publiquement.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed h-12 flex items-center justify-center text-sm"
              >
                {isSubmitting ? "Envoi des justificatifs..." : "Soumettre pour Vérification"}
              </button>
            </form>
          )}
        </div>
      </main>

    </TransactionalLayout>
  );
}

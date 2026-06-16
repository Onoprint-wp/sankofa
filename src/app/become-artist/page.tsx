"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Upload, AlertCircle } from "lucide-react";
import { signUpSchema, type SignUpInput } from "@/lib/validations";

export default function BecomeArtist() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Initialize React Hook Form with Zod validation resolver
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      role: "artist", // Pre-selected
    },
  });

  const onSubmit = async (data: SignUpInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setSuccessData(null);
    
    try {
      const response = await fetch("/api/artists/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Une erreur est survenue lors de l'inscription.");
      }

      setSuccessData(result);
    } catch (err: any) {
      setServerError(err.message || "Une erreur réseau s'est produite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/15 text-dark flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-bold tracking-wider text-primary">
            SANKOFA
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors h-11">
            <ArrowLeft className="w-4 h-4" />
            Retour à l’accueil
          </Link>
        </div>
      </header>

      {/* Main container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12">
        <div className="bg-card border border-border/80 rounded-xl shadow-card p-6 sm:p-10 relative overflow-hidden">
          {/* Terracotta colored accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
          
          <div className="mb-8 text-center sm:text-left">
            <h1 className="font-serif text-3xl font-bold mb-3">Devenir Artiste SANKOFA</h1>
            <p className="text-neutral text-sm leading-relaxed">
              Rejoignez notre galerie panafricaine d’œuvres d’art. Proposez vos créations à la vente et à la location en toute sécurité.
            </p>
          </div>

          {successData ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fadeIn">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold text-success-dark mb-3">Inscription Reçue !</h2>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                {successData.message}
              </p>
              <div className="bg-white border border-gray-100 rounded-md p-4 text-left mb-6 shadow-sm">
                <p className="text-xs text-neutral font-semibold uppercase tracking-wider mb-2">Récapitulatif de votre compte :</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Artiste :</span> {successData.user.first_name} {successData.user.last_name}</p>
                  <p><span className="font-medium">Email :</span> {successData.user.email}</p>
                  <p><span className="font-medium">Téléphone :</span> {successData.user.phone}</p>
                </div>
              </div>
              <div className="space-y-3">
                <Link
                  href="/dashboard/artworks/new"
                  className="block w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 flex items-center justify-center"
                >
                  Ajouter ma première œuvre
                </Link>
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

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label htmlFor="first_name" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                    Prénom <span className="text-primary">*</span>
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    {...register("first_name")}
                    className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 h-11 ${
                      errors.first_name
                        ? "border-error focus:ring-error/25"
                        : "border-border focus:ring-primary/25 focus:border-primary"
                    }`}
                    placeholder="Ex: Styve"
                  />
                  {errors.first_name && (
                    <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {errors.first_name.message}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="last_name" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                    Nom de famille <span className="text-primary">*</span>
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    {...register("last_name")}
                    className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 h-11 ${
                      errors.last_name
                        ? "border-error focus:ring-error/25"
                        : "border-border focus:ring-primary/25 focus:border-primary"
                    }`}
                    placeholder="Ex: Mvondo"
                  />
                  {errors.last_name && (
                    <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                  Adresse email <span className="text-primary">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 h-11 ${
                    errors.email
                      ? "border-error focus:ring-error/25"
                      : "border-border focus:ring-primary/25 focus:border-primary"
                  }`}
                  placeholder="nom@exemple.com"
                />
                {errors.email && (
                  <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                  Numéro de téléphone (avec indicatif) <span className="text-primary">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 h-11 ${
                    errors.phone
                      ? "border-error focus:ring-error/25"
                      : "border-border focus:ring-primary/25 focus:border-primary"
                  }`}
                  placeholder="Ex: +237699000000"
                />
                <p className="text-[11px] text-neutral mt-1">Recommandé pour l’envoi de notifications WhatsApp et OTP.</p>
                {errors.phone && (
                  <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                  Mot de passe <span className="text-primary">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  {...register("password")}
                  className={`w-full border rounded px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 h-11 ${
                    errors.password
                      ? "border-error focus:ring-error/25"
                      : "border-border focus:ring-primary/25 focus:border-primary"
                  }`}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-error text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Hidden Role */}
              <input type="hidden" value="artist" {...register("role")} />

              {/* KYC Information Note */}
              <div className="bg-accent/10 border border-accent/25 rounded-lg p-4 text-xs text-dark leading-relaxed flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-accent-dark block mb-1">Processus de Curation et de Sécurité</span>
                  Suite à cette inscription, vous pourrez uploader votre pièce d’identité (CNI ou Passeport) ainsi qu’un selfie pour valider votre compte. Votre profil restera <span className="italic font-medium">« En attente de validation »</span> jusqu’à l’approbation de nos curateurs.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed h-12 flex items-center justify-center text-sm"
              >
                {isSubmitting ? "Création du compte..." : "Créer mon compte Artiste"}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-dark text-white py-6 border-t border-neutral/25 text-center text-xs text-gray-500">
        <p>© 2026 SANKOFA. Tous droits réservés.</p>
      </footer>
    </div>
  );
}

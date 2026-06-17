"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, AlertCircle, User, Palette } from "lucide-react";
import { signUpSchema, type SignUpInput } from "@/lib/validations";
import { supabase } from "@/lib/supabaseClient";
import TransactionalLayout from "@/components/layout/TransactionalLayout";

export default function SignUp() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
      role: "buyer",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: SignUpInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setSuccess(false);

    try {
      // Call Supabase Auth sign up
      // We pass role, first_name, and last_name in options.data metadata so that 
      // the handle_new_user trigger in Postgres can copy them to public.profiles.
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        phone: data.phone,
        options: {
          data: {
            role: data.role,
            first_name: data.first_name,
            last_name: data.last_name,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess(true);
    } catch (err: any) {
      setServerError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TransactionalLayout backHref="/" backLabel="Retour à l’accueil">
      {/* Main container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12">
        <div className="bg-card border border-border/80 rounded-xl shadow-card p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
          
          <div className="mb-8 text-center sm:text-left">
            <h1 className="font-serif text-3xl font-bold mb-3">Créer votre compte SANKOFA</h1>
            <p className="text-neutral text-sm leading-relaxed">
              Rejoignez notre communauté d’art africain contemporain. Achetez, louez ou exposez vos œuvres originales.
            </p>
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fadeIn">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold text-success-dark mb-3">Inscription réussie !</h2>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">
                Votre compte a été créé. Veuillez vérifier vos emails (ou votre boîte de spams) pour confirmer votre inscription avant de vous connecter.
              </p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded shadow transition-all h-11 flex items-center justify-center"
                >
                  Se connecter
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

              {/* Role Selection */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-3">
                  Je souhaite m’inscrire en tant que :
                </span>
                <div className="grid grid-cols-2 gap-4">
                  {/* Buyer Option */}
                  <label
                    className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      selectedRole === "buyer"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-neutral/30 text-neutral"
                    }`}
                  >
                    <input
                      type="radio"
                      value="buyer"
                      {...register("role")}
                      className="sr-only"
                    />
                    <User className="w-6 h-6 mb-2" />
                    <span className="font-bold text-sm">Acheteur</span>
                    <span className="text-[10px] text-center mt-1 hidden sm:inline">Pour acheter ou louer des œuvres</span>
                  </label>

                  {/* Artist Option */}
                  <label
                    className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      selectedRole === "artist"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-neutral/30 text-neutral"
                    }`}
                  >
                    <input
                      type="radio"
                      value="artist"
                      {...register("role")}
                      className="sr-only"
                    />
                    <Palette className="w-6 h-6 mb-2" />
                    <span className="font-bold text-sm">Artiste</span>
                    <span className="text-[10px] text-center mt-1 hidden sm:inline">Pour vendre et proposer mes œuvres</span>
                  </label>
                </div>
              </div>

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
                  Numéro de téléphone <span className="text-primary">*</span>
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed h-12 flex items-center justify-center text-sm"
              >
                {isSubmitting ? "Création du compte..." : "Créer mon compte"}
              </button>

              <div className="text-center text-xs text-neutral mt-4">
                Déjà inscrit ?{" "}
                <Link href="/login" className="text-primary font-bold hover:underline">
                  Se connecter
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

    </TransactionalLayout>
  );
}

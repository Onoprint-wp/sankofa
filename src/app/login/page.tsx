"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Key, Mail, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<"password" | "magic">("password");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to homepage or user space
      router.push("/");
    } catch (err: any) {
      setServerError(err.message || "Erreur de connexion. Vérifiez vos identifiants.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setServerError(null);
    setMagicLinkSent(false);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
    } catch (err: any) {
      setServerError(err.message || "Impossible d'envoyer le lien magique.");
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
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12">
        <div className="bg-card border border-border/80 rounded-xl shadow-card p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />

          <div className="mb-8 text-center">
            <h1 className="font-serif text-3xl font-bold mb-3">Connexion</h1>
            <p className="text-neutral text-sm">
              Accédez à votre espace sécurisé SANKOFA
            </p>
          </div>

          {/* Toggle login method */}
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => {
                setLoginMethod("password");
                setServerError(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${
                loginMethod === "password"
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral hover:text-dark"
              }`}
            >
              Mot de passe
            </button>
            <button
              onClick={() => {
                setLoginMethod("magic");
                setServerError(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${
                loginMethod === "magic"
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral hover:text-dark"
              }`}
            >
              Lien magique
            </button>
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-error p-4 rounded-lg flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{serverError}</p>
            </div>
          )}

          {magicLinkSent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fadeIn">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold text-success-dark mb-3">Lien envoyé !</h2>
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                Un lien de connexion à usage unique a été envoyé à l’adresse <span className="font-semibold">{email}</span>.
              </p>
              <p className="text-xs text-neutral">
                Cliquez sur le lien dans l’email pour vous connecter automatiquement.
              </p>
            </div>
          ) : loginMethod === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral/85" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-border rounded pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary h-11"
                    placeholder="nom@exemple.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-neutral">
                    Mot de passe
                  </label>
                  <Link href="#" className="text-xs text-primary font-bold hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral/85" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-border rounded pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary h-11"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded transition-all shadow-md h-12 flex items-center justify-center text-sm disabled:opacity-75"
              >
                {isSubmitting ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLinkLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email-magic" className="block text-xs font-semibold uppercase tracking-wider text-neutral mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral/85" />
                  <input
                    id="email-magic"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-border rounded pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary h-11"
                    placeholder="nom@exemple.com"
                  />
                </div>
                <p className="text-[11px] text-neutral mt-2">
                  Nous vous enverrons un lien d’accès direct sans mot de passe.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded transition-all shadow-md h-12 flex items-center justify-center text-sm disabled:opacity-75"
              >
                {isSubmitting ? "Envoi du lien..." : "Recevoir le lien magique"}
              </button>
            </form>
          )}

          <div className="text-center text-xs text-neutral mt-6">
            Pas encore inscrit ?{" "}
            <Link href="/signup" className="text-primary font-bold hover:underline">
              Créer un compte
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-dark text-white py-6 border-t border-neutral/25 text-center text-xs text-gray-500">
        <p>© 2026 SANKOFA. Tous droits réservés.</p>
      </footer>
    </div>
  );
}

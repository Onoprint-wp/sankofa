"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ShieldCheck, ArrowRight, Home, Loader2 } from "lucide-react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen bg-secondary/15 text-dark flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-bold tracking-wider text-primary">
            SANKOFA
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-16 flex flex-col justify-center">
        <div className="bg-card border border-border/80 rounded-xl shadow-card p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-success" />
          
          <CheckCircle2 className="w-20 h-20 text-success mx-auto mb-6" />
          
          <h1 className="font-serif text-3xl font-bold mb-3 text-dark">Paiement Réussi !</h1>
          <p className="text-neutral text-sm leading-relaxed mb-6">
            Votre transaction a été traitée avec succès. L’œuvre a été réservée et l’artiste en a été informé.
          </p>

          {orderId && (
            <div className="bg-secondary/10 border border-border/40 rounded-lg p-4 mb-8 text-left">
              <span className="text-[10px] text-neutral font-bold uppercase tracking-wider block mb-1">
                Numéro de Commande
              </span>
              <span className="font-mono text-sm text-dark select-all font-semibold block">
                {orderId}
              </span>
            </div>
          )}

          {/* Escrow banner */}
          <div className="bg-green-50 border border-green-200 text-left p-5 mb-8 space-y-2 rounded-lg">
            <span className="font-bold text-success-dark flex items-center gap-1.5 uppercase tracking-wide text-xs">
              <ShieldCheck className="w-4.5 h-4.5 text-success" />
              Séquestre Activé
            </span>
            <p className="text-gray-700 text-xs leading-relaxed">
              Vos fonds ont été placés en séquestre. L’artiste prépare actuellement l’expédition de l’œuvre. Une fois expédiée, vous pourrez suivre son transit. Les fonds ne lui seront reversés qu’après votre confirmation de réception conforme.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Link
              href="/dashboard/orders"
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 rounded shadow transition-all h-12 flex items-center justify-center text-sm gap-2"
            >
              Suivre ma commande
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link
              href="/"
              className="block w-full border border-primary text-primary hover:bg-primary/5 font-semibold py-3.5 rounded transition-all h-12 flex items-center justify-center text-sm gap-2"
            >
              <Home className="w-4 h-4" />
              Retourner à l’accueil
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

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral text-sm">Chargement des détails de la commande...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

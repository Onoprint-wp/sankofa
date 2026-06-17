"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface TransactionalLayoutProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  titleBadge?: string;
}

export default function TransactionalLayout({
  children,
  backHref = "/",
  backLabel = "Retour à l’accueil",
  titleBadge,
}: TransactionalLayoutProps) {
  return (
    <div className="min-h-screen bg-secondary/15 text-dark flex flex-col justify-between font-sans relative">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-serif text-2xl font-bold tracking-wider text-primary">
              SANKOFA
            </Link>
            {titleBadge && (
              <span className="text-xs bg-[#d9a13b]/10 text-[#d9a13b] font-bold px-2 py-0.5 rounded border border-[#d9a13b]/20">
                {titleBadge}
              </span>
            )}
          </div>
          <Link href={backHref} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors h-11">
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        </div>
      </header>

      {children}

      <footer className="bg-dark text-white py-6 border-t border-neutral/25 text-center text-xs text-gray-500">
        <p>© 2026 SANKOFA. Tous droits réservés.</p>
      </footer>
    </div>
  );
}

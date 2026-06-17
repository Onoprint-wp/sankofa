"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-dark text-white py-12 border-t border-neutral/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-serif text-xl font-bold text-primary mb-4">SANKOFA</h3>
          <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
            Valoriser la création artistique africaine en créant des ponts de confiance, d’authenticité et de simplicité logistique.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-4">Pour les Acheteurs</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/" className="hover:text-white transition-colors">Parcourir le catalogue</Link></li>
            <li><Link href="/dashboard/orders" className="hover:text-white transition-colors">Suivre mes commandes</Link></li>
            <li><Link href="/checkout" className="hover:text-white transition-colors">Paiement Séquestre</Link></li>
            <li><Link href="/help" className="hover:text-white transition-colors">Centre d&apos;aide &amp; Chatbot</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-4">Pour les Artistes</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/become-artist" className="hover:text-white transition-colors">Créer un profil artiste</Link></li>
            <li><Link href="/dashboard/academy" className="hover:text-white transition-colors">Académie SANKOFA</Link></li>
            <li><Link href="/dashboard/artworks/new" className="hover:text-white transition-colors">Déposer une œuvre</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-4">Sécurité</h4>
          <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-2">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <span>Garantie de paiement séquestre certifié.</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-neutral/20 mt-12 pt-8 text-center text-xs text-gray-500">
        <p>© 2026 SANKOFA. Tous droits réservés.</p>
      </div>
    </footer>
  );
}

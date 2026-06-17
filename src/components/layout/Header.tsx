"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { ShoppingCart, LogOut, Award } from "lucide-react";

export default function Header() {
  const { cartItem } = useCart();
  const { isAuthenticated, profile, signOut } = useAuth();

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <Link href="/" className="font-serif text-2xl font-bold tracking-wider text-primary">
          SANKOFA
        </Link>
        
        <nav className="hidden md:flex space-x-8 text-sm font-medium">
          <Link href="/" className="hover:text-primary transition-colors text-primary">Catalogue</Link>
          <Link href="/dashboard/orders" className="hover:text-primary transition-colors text-dark">Mes Commandes</Link>
          <Link href="/become-artist" className="hover:text-primary transition-colors text-dark">Espace Artiste</Link>
          <Link href="/help" className="hover:text-primary transition-colors text-dark">Centre d&apos;aide</Link>
          {profile?.role === "artist" && (
            <Link href="/dashboard/academy" className="hover:text-[#d9a13b] transition-colors text-[#d9a13b] font-bold flex items-center gap-1">
              <Award className="w-4 h-4 shrink-0" />
              Académie SANKOFA
            </Link>
          )}
          {(profile?.role === "admin" || profile?.role === "curator") && (
            <>
              <Link href="/dashboard/curator" className="hover:text-primary transition-colors text-amber-600 font-bold">
                Dashboard Curateur
              </Link>
              <Link href="/admin" className="hover:text-primary transition-colors text-amber-600 font-bold">
                Back-office Admin
              </Link>
            </>
          )}
        </nav>
        
        <div className="flex items-center space-x-4">
          {cartItem && (
            <Link href="/checkout" className="relative p-2 text-dark hover:text-primary transition-colors">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                1
              </span>
            </Link>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-neutral hidden sm:inline">
                Bonjour, {profile?.first_name}
              </span>
              <button
                onClick={signOut}
                className="p-2 hover:text-primary transition-colors flex items-center gap-1.5 text-xs font-medium text-dark"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-xs font-semibold hover:text-primary transition-colors py-2 px-3 text-dark">
                Connexion
              </Link>
              <Link 
                href="/become-artist" 
                className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-4 py-2.5 rounded transition-all shadow-sm"
              >
                Devenir Artiste
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

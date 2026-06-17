import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "SANKOFA - Marketplace d'Art Contemporain Africain",
  description: "Découvrez, louez et achetez des œuvres d'art africaines originales certifiées sur la blockchain Polygon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans bg-background text-dark antialiased">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

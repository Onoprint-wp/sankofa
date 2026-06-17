import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ShieldCheck, ArrowLeft, ExternalLink, Scale } from "lucide-react";

export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
  };
}

export default async function CertificatePage({ params }: PageProps) {
  const { id } = params;

  // Fetch certificate details joining artwork, artist and order information
  const { data: certificate, error } = await supabase
    .from("certificates")
    .select(`
      *,
      artwork:artworks (
        *,
        artist:artists (
          *,
          profile:profiles (*)
        )
      ),
      order:orders (
        *,
        buyer:profiles (*)
      )
    `)
    .or(`id.eq.${id},order_id.eq.${id}`)
    .maybeSingle();

  if (error || !certificate) {
    notFound();
  }

  // Extract variables
  const artwork = certificate.artwork;
  const artist = artwork?.artist;
  const artistProfile = artist?.profile;
  const order = certificate.order;
  const buyer = order?.buyer;

  const artistName = artistProfile
    ? `${artistProfile.first_name || ""} ${artistProfile.last_name || ""}`.trim()
    : "Artiste Sankofa";

  const buyerName = buyer
    ? `${buyer.first_name || ""} ${buyer.last_name || ""}`.trim()
    : "Acquéreur Sankofa";

  const creationDate = new Date(artwork?.created_at || Date.now()).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
  });

  const acquisitionDate = new Date(order?.created_at || Date.now()).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedPrice = artwork
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(artwork.price)
    : "N/A";

  const dimensionsString = artwork?.dimensions
    ? `${artwork.dimensions.height} x ${artwork.dimensions.width}${artwork.dimensions.depth ? ` x ${artwork.dimensions.depth}` : ""} cm`
    : "Dimensions non spécifiées";

  const verificationUrl = `https://sankofa.art/verify/${order?.id || id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verificationUrl)}`;

  // Polygonscan links (for Mumbai/Amoy testnet or Polygon Mainnet)
  const polygonscanUrl = `https://amoy.polygonscan.com/tx/${certificate.blockchain_tx_hash}`;

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#2c2620] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Action Bar (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
        <Link
          href="/dashboard/orders"
          className="flex items-center gap-2 text-sm text-[#70604c] hover:text-[#2c2620] transition-colors py-2 px-3 hover:bg-[#eae6dd] rounded-md"
          style={{ minHeight: "44px", minWidth: "44px" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 bg-[#b89754] hover:bg-[#a38344] text-white font-medium py-2 px-5 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          style={{ minHeight: "44px", minWidth: "44px" }}
        >
          <Printer className="w-5 h-5" />
          Imprimer / Télécharger le certificat
        </button>
      </div>

      {/* Main Certificate Container */}
      <div className="max-w-4xl mx-auto bg-[#fcfbf9] border-[16px] border-double border-[#d4c5a3] shadow-2xl relative overflow-hidden cert-container p-8 sm:p-12 md:p-16">
        
        {/* Decorative Corner Ornaments */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#b89754]" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-[#b89754]" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-[#b89754]" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#b89754]" />

        {/* Large faint watermark background (Filigrane SANKOFA) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none no-print">
          <span className="font-serif font-bold text-[18vw] tracking-wider text-[#b89754]">
            SANKOFA
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="flex justify-center mb-2">
            <span className="font-serif text-[#b89754] text-3xl tracking-[0.3em] font-bold">SANKOFA</span>
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#70604c] mb-6">Art Contemporain & Authentification Blockchain</p>
          
          <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-[#b89754] to-transparent mx-auto mb-1" />
          <div className="flex justify-center items-center gap-2 text-[#b89754] my-2">
            <span className="text-xs">♦</span>
            <span className="text-xs">♦</span>
            <span className="text-xs">♦</span>
          </div>
          <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-[#b89754] to-transparent mx-auto mt-1" />
          
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide mt-6 text-[#1c1814]">
            Certificat d’Authenticité
          </h1>
          <p className="text-sm italic text-[#8a765d] mt-2">Passeport Numérique de l’Œuvre d’Art</p>
        </div>

        {/* Introduction Text */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm sm:text-base leading-relaxed text-[#4a3e31]">
            Ce document officiel atteste que l’œuvre d’art décrite ci-dessous est une création originale
            certifiée, enregistrée de manière immuable sur la blockchain Polygon sous le protocole SANKOFA.
          </p>
        </div>

        {/* Details section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 my-8 pb-8 border-b border-[#e2dac8] relative">
          
          {/* Artwork specs */}
          <div className="md:col-span-8 space-y-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Titre de l’œuvre</span>
              <span className="font-serif text-2xl font-semibold text-[#1c1814]">{artwork?.title}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Artiste Créateur</span>
                <span className="font-medium text-[#2c2620]">{artistName}</span>
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Dimensions</span>
                <span className="text-[#2c2620]">{dimensionsString}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Techniques & Matériaux</span>
                <span className="text-sm text-[#2c2620]">
                  {artwork?.materials && artwork.materials.length > 0 
                    ? artwork.materials.join(", ") 
                    : "Non spécifiés"}
                </span>
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Catégorie</span>
                <span className="text-[#2c2620]">{artwork?.category}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Date de Création</span>
                <span className="text-[#2c2620]">{creationDate}</span>
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Date d’Acquisition</span>
                <span className="text-[#2c2620]">{acquisitionDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Titulaire des Droits</span>
                <span className="font-medium text-[#2c2620]">{buyerName}</span>
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Valeur Certifiée</span>
                <span className="font-semibold text-[#b89754]">{formattedPrice}</span>
              </div>
            </div>
          </div>

          {/* Verification Box & QR Code */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#f7f5f0] border border-[#e2dac8] rounded-lg text-center">
            <img 
              src={qrCodeUrl} 
              alt="Code QR de vérification" 
              className="w-32 h-32 mb-3 border-2 border-white shadow-sm"
            />
            <span className="text-[10px] uppercase tracking-wider text-[#8a765d] font-bold block mb-1">
              Scannez pour Vérifier
            </span>
            <span className="text-[9px] text-[#70604c] max-w-[150px] leading-tight">
              Vérifiez instantanément l’authenticité de cette œuvre en ligne.
            </span>
          </div>
        </div>

        {/* Blockchain proof section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 text-[#b89754] border-b border-dashed border-[#e2dac8] pb-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-serif text-base font-semibold tracking-wide uppercase">Preuve Immuable Blockchain</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <span className="text-[#8a765d] block mb-1 uppercase tracking-wider text-[10px]">Identifiant Unique du Certificat</span>
              <code className="bg-[#f3edd9] px-2 py-1 rounded text-[#4a3e31] font-mono break-all text-[11px] block border border-[#e8dfc5]">
                {certificate.id}
              </code>
            </div>
            <div>
              <span className="text-[#8a765d] block mb-1 uppercase tracking-wider text-[10px]">Protocole Réseau</span>
              <span className="font-medium text-[#2c2620] flex items-center gap-1">
                Polygon POS Blockchain
              </span>
            </div>
          </div>

          <div>
            <span className="text-[#8a765d] block mb-1 uppercase tracking-wider text-[10px]">Hash de Transaction de Certification</span>
            <div className="flex items-center gap-2">
              <code className="bg-[#f3edd9] px-2 py-1 rounded text-[#4a3e31] font-mono break-all text-[11px] block border border-[#e8dfc5] flex-grow">
                {certificate.blockchain_tx_hash}
              </code>
              <a
                href={polygonscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#b89754] hover:text-[#9e7f40] transition-colors text-xs font-semibold no-print flex-shrink-0"
                style={{ minHeight: "44px", minWidth: "44px" }}
              >
                Inspecter <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Seal and Signature Area */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-8 mt-12 pt-8 border-t border-[#e2dac8]">
          
          {/* Golden Guarantee Seal */}
          <div className="flex items-center gap-3 relative">
            <div className="w-16 h-16 bg-gradient-to-br from-[#f3e7c9] via-[#d7be82] to-[#b39549] rounded-full flex items-center justify-center shadow-lg border-2 border-[#fdfbf7] relative">
              <div className="w-13 h-13 border border-dashed border-white/60 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-white drop-shadow-md" />
              </div>
              {/* Ribbon tails */}
              <div className="absolute -bottom-3 left-3 w-3 h-6 bg-[#b89754] clip-ribbon transform rotate-12" />
              <div className="absolute -bottom-3 right-3 w-3 h-6 bg-[#b89754] clip-ribbon transform -rotate-12" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#8a765d] block">Garantie Sankofa</span>
              <span className="font-serif text-sm font-semibold text-[#2c2620]">Protocole Sécurisé</span>
            </div>
          </div>

          {/* Platform Signature */}
          <div className="text-center sm:text-right">
            <p className="text-xs text-[#8a765d] uppercase tracking-wider mb-3">Signé au nom de la plateforme</p>
            <p className="font-serif italic text-lg text-[#3a3024] font-bold">L’Équipe Sankofa</p>
            <div className="w-36 h-[1px] bg-[#d4c5a3] ml-auto mt-2" />
          </div>
        </div>

      </div>

      {/* Tailwind Ribbon helper styles (Only needed in style block if using clip-ribbon) */}
      <style dangerouslySetInnerHTML={{__html: `
        .clip-ribbon {
          clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%);
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .cert-container {
            border: 12px double #b89754 !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #fcfbf9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

    </div>
  );
}

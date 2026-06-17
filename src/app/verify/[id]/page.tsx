import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, CheckCircle2, ExternalLink, Calendar, User, Eye, ArrowLeft, ArrowUpRight } from "lucide-react";

export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
  };
}

export default async function VerifyPage({ params }: PageProps) {
  const { id } = params;

  // Query certificate by ID or associated order ID
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
    // If not found, show a beautiful "Certificate Invalid" page rather than generic 404
    return (
      <div className="min-h-screen bg-[#faf9f6] text-[#2c2620] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-[#ebdcc1] shadow-xl rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1c1814] mb-2">Certificat Non Reconnu</h1>
          <p className="text-sm text-[#70604c] mb-6 leading-relaxed">
            Nous n’avons trouvé aucun certificat d’authenticité correspondant à cette référence dans notre registre sécurisé ni sur la blockchain Polygon.
          </p>
          <div className="w-full bg-[#fdfaf7] border border-[#ebdcc1] rounded-lg p-4 mb-6 text-left">
            <span className="text-[10px] uppercase tracking-wider text-[#8a765d] block mb-1">Identifiant recherché</span>
            <code className="text-xs font-mono break-all text-[#2c2620]">{id}</code>
          </div>
          <Link
            href="/"
            className="inline-flex justify-center items-center w-full bg-[#b89754] hover:bg-[#a38344] text-white font-medium py-3 px-4 rounded-xl transition-all cursor-pointer"
            style={{ minHeight: "44px" }}
          >
            Retourner à l’accueil
          </Link>
        </div>
      </div>
    );
  }

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

  const polygonscanUrl = `https://amoy.polygonscan.com/tx/${certificate.blockchain_tx_hash}`;
  const certificateUrl = `/certificates/${order?.id || id}`;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2c2620] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Header Logo */}
      <div className="max-w-3xl mx-auto text-center mb-8">
        <Link href="/" className="font-serif text-[#b89754] text-2xl tracking-[0.2em] font-bold block mb-1">
          SANKOFA
        </Link>
        <span className="text-[10px] uppercase tracking-widest text-[#8a765d] block">
          Portail Public de Vérification d’Authenticité
        </span>
      </div>

      <div className="max-w-3xl mx-auto bg-white border border-[#ebdcc1] shadow-xl rounded-2xl overflow-hidden relative">
        
        {/* Verification Success Banner */}
        <div className="bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] text-white p-6 sm:p-8 text-center relative overflow-hidden">
          {/* Subtle design element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-10 -translate-y-10" />
          
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#52b788]" />
          </div>
          
          <span className="inline-block bg-[#52b788]/20 border border-[#52b788]/40 text-[#52b788] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
            Certificat Authentifié et Sécurisé
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-wide">
            Authenticité Validée
          </h2>
          <p className="text-xs text-[#a3b19b] mt-1 max-w-lg mx-auto">
            Les données ci-dessous correspondent exactement à l’empreinte cryptographique enregistrée sur la blockchain Polygon.
          </p>
        </div>

        {/* Comparison Details Grid */}
        <div className="p-6 sm:p-10 space-y-8">
          
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#8a765d] font-bold border-b border-[#f0e6d5] pb-2 mb-4">
              1. Informations sur l’œuvre physique
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#fdfbf7] p-5 border border-[#ebdcc1] rounded-xl">
              
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-[#8a765d] block">Titre</span>
                  <span className="font-serif text-lg font-semibold text-[#1c1814]">{artwork?.title}</span>
                </div>
                <div>
                  <span className="text-xs text-[#8a765d] block">Artiste</span>
                  <span className="text-sm font-medium text-[#2c2620]">{artistName}</span>
                </div>
                <div>
                  <span className="text-xs text-[#8a765d] block">Catégorie</span>
                  <span className="text-sm text-[#2c2620]">{artwork?.category}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-[#8a765d] block">Dimensions</span>
                  <span className="text-sm text-[#2c2620]">{dimensionsString}</span>
                </div>
                <div>
                  <span className="text-xs text-[#8a765d] block">Matériaux & Techniques</span>
                  <span className="text-sm text-[#2c2620]">
                    {artwork?.materials && artwork.materials.length > 0 
                      ? artwork.materials.join(", ") 
                      : "Non spécifiés"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#8a765d] block">Date de création</span>
                  <span className="text-sm text-[#2c2620]">{creationDate}</span>
                </div>
              </div>

            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#8a765d] font-bold border-b border-[#f0e6d5] pb-2 mb-4">
              2. Informations sur la transaction
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#fdfbf7] p-5 border border-[#ebdcc1] rounded-xl">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#70604c]">Titulaire actuel :</span>
                  <span className="font-medium text-[#2c2620]">{buyerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#70604c]">Date d’acquisition :</span>
                  <span className="text-[#2c2620]">{acquisitionDate}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#70604c]">Valeur certifiée :</span>
                  <span className="font-bold text-[#b89754]">{formattedPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#70604c]">Statut de la transaction :</span>
                  <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    Complétée & Archivée
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Proof Verification */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#8a765d] font-bold border-b border-[#f0e6d5] pb-2 mb-4">
              3. Validation cryptographique blockchain
            </h3>
            
            <div className="bg-[#f0ece1] border border-[#d4cbb8] rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs">
                <div>
                  <span className="text-[#8a765d] block uppercase tracking-wider text-[9px] font-bold mb-1">
                    Identifiant du Certificat
                  </span>
                  <code className="bg-white/60 px-2 py-1 rounded text-[#2c2620] font-mono break-all text-[11px] block border border-[#e2d5bd]">
                    {certificate.id}
                  </code>
                </div>
                <div className="flex-shrink-0 min-w-[120px]">
                  <span className="text-[#8a765d] block uppercase tracking-wider text-[9px] font-bold mb-1">
                    Réseau Blockchain
                  </span>
                  <span className="font-medium text-[#2c2620] flex items-center gap-1 mt-1">
                    Polygon POS (Testnet)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[#8a765d] block uppercase tracking-wider text-[9px] font-bold mb-1">
                  Hash de Transaction de Certification
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <code className="bg-white/60 px-2 py-1 rounded text-[#2c2620] font-mono break-all text-[11px] block border border-[#e2d5bd] flex-grow">
                    {certificate.blockchain_tx_hash}
                  </code>
                  <a
                    href={polygonscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-1 bg-white hover:bg-neutral-50 text-[#b89754] border border-[#ebdcc1] font-semibold text-xs px-3 rounded-lg transition-colors flex-shrink-0 hover:shadow-sm"
                    style={{ minHeight: "44px", minWidth: "100px" }}
                  >
                    Vérifier sur Polygonscan <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <Link
              href={certificateUrl}
              className="flex-1 inline-flex justify-center items-center gap-2 bg-[#b89754] hover:bg-[#a38344] text-white font-medium py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer text-center"
              style={{ minHeight: "44px" }}
            >
              <Eye className="w-5 h-5" />
              Consulter le Certificat Imprimable
            </Link>
            <Link
              href="/"
              className="sm:w-1/3 inline-flex justify-center items-center gap-2 bg-white hover:bg-neutral-50 text-[#70604c] border border-[#ebdcc1] font-medium py-3 px-4 rounded-xl transition-all cursor-pointer text-center"
              style={{ minHeight: "44px" }}
            >
              Retourner sur Sankofa
            </Link>
          </div>

        </div>

      </div>

      <div className="max-w-3xl mx-auto text-center mt-8 text-xs text-[#8a765d]">
        <p>© {new Date().getFullYear()} Sankofa Art. Authentification immuable protégée par Polygon Blockchain.</p>
      </div>

    </div>
  );
}

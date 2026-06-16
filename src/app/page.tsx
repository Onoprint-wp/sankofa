import Link from "next/link";

const artworks = [
  {
    id: 1,
    title: "L'Ombre du Baobab",
    artist: "Styve Mvondo",
    country: "Cameroun",
    price: "250 000 FCFA",
    rentalPrice: "15 000 FCFA",
    category: "Peinture",
    certified: true,
    rental: true,
    imageColor: "from-amber-600 to-orange-800",
  },
  {
    id: 2,
    title: "Masque Sacré du Wouri",
    artist: "Amadou Diallo",
    country: "Sénégal",
    price: "450 000 FCFA",
    category: "Sculpture",
    certified: true,
    rental: false,
    imageColor: "from-yellow-700 to-amber-950",
  },
  {
    id: 3,
    title: "Rythmes d'Afrique",
    artist: "Amina Yusuf",
    country: "Nigeria",
    price: "180 000 FCFA",
    category: "Art Numérique",
    certified: false,
    rental: false,
    imageColor: "from-red-700 to-rose-900",
  },
  {
    id: 4,
    title: "Le Silence du Sahel",
    artist: "Fatou Diop",
    country: "Côte d'Ivoire",
    price: "120 000 FCFA",
    rentalPrice: "8 000 FCFA",
    category: "Photographie",
    certified: true,
    rental: true,
    imageColor: "from-orange-400 to-yellow-600",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-dark">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-bold tracking-wider text-primary">
            SANKOFA
          </Link>
          <nav className="hidden md:flex space-x-8 text-sm font-medium">
            <Link href="#" className="hover:text-primary transition-colors">Catalogue</Link>
            <Link href="#" className="hover:text-primary transition-colors">Comment ça marche ?</Link>
            <Link href="#" className="hover:text-primary transition-colors">Artothèque (Location)</Link>
            <Link href="#" className="hover:text-primary transition-colors">Académie</Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Connexion</Link>
            <Link href="#" className="bg-primary hover:bg-primary-dark text-white text-sm font-medium px-5 py-2.5 rounded transition-all shadow-sm">
              Devenir Artiste
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-secondary/35 py-20 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-primary font-semibold text-sm uppercase tracking-widest block mb-3">L’Art Africain à portée de main</span>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Découvrez, collectionnez & louez l’art africain original
            </h1>
            <p className="text-neutral text-lg mb-8 max-w-lg">
              La première marketplace panafricaine d’œuvres d’art authentiques, certifiées sur la blockchain Polygon et livrées chez vous en toute sécurité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="#" className="bg-primary hover:bg-primary-dark text-white text-center font-medium px-8 py-3.5 rounded transition-all shadow-sm">
                Explorer le Catalogue
              </Link>
              <Link href="#" className="border border-primary text-primary hover:bg-primary/5 text-center font-medium px-8 py-3.5 rounded transition-all">
                Louer une Œuvre
              </Link>
            </div>
          </div>
          <div className="relative h-96 w-full rounded-2xl bg-gradient-to-tr from-primary to-accent overflow-hidden shadow-hover flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative text-center text-white z-10">
              <span className="font-serif text-3xl md:text-4xl italic font-light block mb-4">« SANKOFA »</span>
              <p className="text-sm uppercase tracking-widest max-w-xs mx-auto">Retourner à ses racines pour construire l’avenir.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Artworks Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="font-serif text-3xl font-bold mb-3">Œuvres en vedette</h2>
            <p className="text-neutral">Sélectionnées par notre comité éditorial</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            {/* Filter buttons mockup */}
            <button className="bg-primary text-white text-xs font-medium px-4 py-2 rounded-full">Toutes</button>
            <button className="bg-card border border-border hover:bg-secondary/10 text-xs font-medium px-4 py-2 rounded-full transition-all">Peinture</button>
            <button className="bg-card border border-border hover:bg-secondary/10 text-xs font-medium px-4 py-2 rounded-full transition-all">Sculpture</button>
            <button className="bg-card border border-border hover:bg-secondary/10 text-xs font-medium px-4 py-2 rounded-full transition-all">Disponible à la location</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {artworks.map((artwork) => (
            <div key={artwork.id} className="bg-card border border-border rounded overflow-hidden shadow-card hover:shadow-hover transition-all duration-300 flex flex-col group">
              {/* Image Container */}
              <div className={`aspect-square w-full bg-gradient-to-tr ${artwork.imageColor} relative flex items-center justify-center overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10 group-hover:scale-105 transition-transform duration-500" />
                <span className="text-white/45 font-serif text-xl italic">{artwork.category}</span>
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {artwork.certified && (
                    <span className="bg-accent text-dark text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      Certifié Blockchain
                    </span>
                  )}
                  {artwork.rental && (
                    <span className="bg-primary/95 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      Location dispo.
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold mb-1 group-hover:text-primary transition-colors">{artwork.title}</h3>
                  <p className="text-neutral text-xs mb-3">{artwork.artist} • {artwork.country}</p>
                </div>
                <div>
                  <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral uppercase tracking-widest block">Prix de Vente</span>
                      <span className="text-base font-bold text-dark">{artwork.price}</span>
                    </div>
                    {artwork.rental && artwork.rentalPrice && (
                      <div className="text-right">
                        <span className="text-[10px] text-neutral uppercase tracking-widest block">Location / mois</span>
                        <span className="text-sm font-semibold text-primary">{artwork.rentalPrice}</span>
                      </div>
                    )}
                  </div>
                  <button className="w-full mt-4 bg-secondary/30 hover:bg-primary hover:text-white text-dark text-xs font-semibold py-3 rounded transition-all">
                    Découvrir l’œuvre
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
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
              <li><Link href="#" className="hover:text-white transition-colors">Parcourir le catalogue</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Louer avec option d’achat</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Paiement Séquestre</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Vérification de certificat</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-4">Pour les Artistes</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors">Créer un profil artiste</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Académie SANKOFA</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Hub logistique</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Fonds de garantie</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-4">Mentions Légales</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Conditions Générales (CGU)</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Mentions légales</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-neutral/20 mt-12 pt-8 text-center text-xs text-gray-500">
          <p>© 2026 SANKOFA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { 
  BookOpen, Camera, FileText, Box, 
  Award, AlertCircle, CheckCircle2, Play, Loader2, 
  Lock, RefreshCw, Check, HelpCircle
} from "lucide-react";
import TransactionalLayout from "@/components/layout/TransactionalLayout";

export default function AcademyPage() {
  const { user, session, profile, artist, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  // Tabs: "modules" | "quiz"
  const [activeTab, setActiveTab] = useState<"m1" | "m2" | "m3" | "quiz">("m1");
  
  // Progress tracking
  const [m1Completed, setM1Completed] = useState(false);
  const [m2Completed, setM2Completed] = useState(false);
  const [m3Completed, setM3Completed] = useState(false);

  // Video playback simulation
  const [isVideo1Playing, setIsVideo1Playing] = useState(false);
  const [isVideo3Playing, setIsVideo3Playing] = useState(false);
  const [video1Progress, setVideo1Progress] = useState(0);
  const [video3Progress, setVideo3Progress] = useState(0);

  // Quiz state
  const [answers, setAnswers] = useState<Record<string, string>>({
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    q5: "",
  });
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    success: boolean;
    score: number;
    message: string;
  } | null>(null);

  const allModulesCompleted = m1Completed && m2Completed && m3Completed;

  const handleStartVideo1 = () => {
    setIsVideo1Playing(true);
    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setVideo1Progress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setM1Completed(true);
        setIsVideo1Playing(false);
      }
    }, 500);
  };

  const handleStartVideo3 = () => {
    setIsVideo3Playing(true);
    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setVideo3Progress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setM3Completed(true);
        setIsVideo3Playing(false);
      }
    }, 500);
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;
    
    // Validate that all questions are answered
    if (Object.values(answers).some((ans) => !ans)) {
      alert("Veuillez répondre à toutes les questions du quiz.");
      return;
    }

    setQuizSubmitting(true);
    setQuizResult(null);

    try {
      const response = await fetch("/api/academy/submit-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(answers),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setQuizResult({
          success: true,
          score: result.score,
          message: result.message,
        });
        await refreshProfile();
      } else {
        setQuizResult({
          success: false,
          score: result.score || 0,
          message: result.message || "Vous n’avez pas obtenu la note requise.",
        });
      }
    } catch (err: any) {
      console.error("Quiz submission error:", err);
      setQuizResult({
        success: false,
        score: 0,
        message: "Une erreur réseau s’est produite lors de la soumission.",
      });
    } finally {
      setQuizSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setAnswers({ q1: "", q2: "", q3: "", q4: "", q5: "" });
    setQuizResult(null);
  };

  // 1. Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-secondary/15 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral text-sm">Chargement de l’Académie...</p>
        </div>
      </div>
    );
  }

  // 2. Auth restriction: Artist only
  if (!user || profile?.role !== "artist") {
    return (
      <div className="min-h-screen bg-secondary/15 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-error" />
          <Lock className="w-14 h-14 text-error mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-3">Accès interdit</h1>
          <p className="text-neutral text-sm leading-relaxed mb-6">
            Cette page est strictement réservée aux artistes de la plateforme SANKOFA.
          </p>
          <Link href="/" className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-3 px-6 rounded shadow transition-all block h-11 flex items-center justify-center">
            Retour au Catalogue
          </Link>
        </div>
      </div>
    );
  }

  // 3. KYC restriction
  if (artist?.kyc_status !== "approved") {
    return (
      <div className="min-h-screen bg-secondary/15 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-accent" />
          <AlertCircle className="w-14 h-14 text-accent mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-3">KYC requis</h1>
          <p className="text-neutral text-sm leading-relaxed mb-6">
            Vos documents d’identité doivent être approuvés par nos administrateurs avant d’accéder à l’Académie et de commencer la formation.
          </p>
          <Link href="/become-artist" className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-3 px-6 rounded shadow transition-all block h-11 flex items-center justify-center">
            Vérifier le statut KYC
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TransactionalLayout backHref="/" backLabel="Retour à l’accueil" titleBadge="ACADÉMIE">

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column: Menu */}
        <div className="space-y-4">
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Votre Parcours
            </h3>
            <p className="text-neutral text-xs leading-relaxed">
              Complétez les 3 modules de formation pour débloquer le quiz de certification.
            </p>

            <nav className="space-y-2 pt-2">
              <button
                onClick={() => setActiveTab("m1")}
                className={`w-full text-left p-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === "m1"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border hover:bg-secondary/5 text-neutral"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  1. Photographie d’œuvre
                </span>
                {m1Completed && <CheckCircle2 className="w-4 h-4 text-success" />}
              </button>

              <button
                onClick={() => setActiveTab("m2")}
                className={`w-full text-left p-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === "m2"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border hover:bg-secondary/5 text-neutral"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  2. Description Captivante
                </span>
                {m2Completed && <CheckCircle2 className="w-4 h-4 text-success" />}
              </button>

              <button
                onClick={() => setActiveTab("m3")}
                className={`w-full text-left p-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                  activeTab === "m3"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border hover:bg-secondary/5 text-neutral"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  3. Emballage de Colis
                </span>
                {m3Completed && <CheckCircle2 className="w-4 h-4 text-success" />}
              </button>

              <button
                onClick={() => {
                  if (allModulesCompleted || artist?.academy_completed) {
                    setActiveTab("quiz");
                  }
                }}
                disabled={!allModulesCompleted && !artist?.academy_completed}
                className={`w-full text-left p-3 rounded-lg border text-xs font-bold flex items-center justify-between transition-all ${
                  activeTab === "quiz"
                    ? "border-[#d9a13b] bg-[#d9a13b]/5 text-[#d9a13b] ring-1 ring-[#d9a13b]"
                    : allModulesCompleted || artist?.academy_completed
                    ? "border-border hover:border-[#d9a13b]/50 hover:bg-[#d9a13b]/5 text-[#d9a13b]"
                    : "border-border opacity-50 cursor-not-allowed text-neutral"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Quiz de Certification
                </span>
                {artist?.academy_completed ? (
                  <span className="bg-success text-white text-[9px] px-1.5 py-0.5 rounded-full">Certifié</span>
                ) : (
                  !allModulesCompleted && <Lock className="w-3.5 h-3.5" />
                )}
              </button>
            </nav>
          </div>

          {artist?.academy_completed && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-3 shadow-sm">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center text-success mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-success-dark">Artiste Certifié</h4>
              <p className="text-[11px] text-neutral leading-relaxed">
                Félicitations, vous avez validé votre formation et le badge est actif sur votre profil.
              </p>
              <Link href="/dashboard/artworks/new" className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-2 px-4 rounded shadow transition-all block h-9 flex items-center justify-center">
                Déposer une œuvre
              </Link>
            </div>
          )}
        </div>

        {/* Right columns: Content Area */}
        <div className="md:col-span-2">
          
          {/* TAB 1: PHOTOGRAPHY */}
          {activeTab === "m1" && (
            <div className="bg-card border border-border/80 rounded-xl shadow-sm p-6 sm:p-8 space-y-6 animate-fadeIn">
              <div>
                <span className="text-primary text-[10px] font-bold uppercase tracking-wider block mb-1">Module 1</span>
                <h2 className="font-serif text-2xl font-bold mb-2">Photographie Professionnelle d’œuvres</h2>
                <p className="text-neutral text-xs leading-relaxed">
                  Apprenez à prendre de superbes clichés clairs et précis de vos créations. Des photos de haute qualité rassurent les acheteurs et multiplient les ventes par 3.
                </p>
              </div>

              {/* Video Mock Player */}
              <div className="relative aspect-video w-full rounded-xl bg-gradient-to-tr from-neutral to-dark overflow-hidden shadow-inner flex items-center justify-center border border-border/50">
                {isVideo1Playing ? (
                  <div className="text-center text-white space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-xs font-medium">Lecture du cours... {video1Progress}%</p>
                    <div className="w-36 h-1 bg-white/20 rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${video1Progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative text-center z-10 text-white space-y-2 p-4">
                      <button
                        onClick={handleStartVideo1}
                        className="w-14 h-14 bg-primary hover:bg-primary-dark rounded-full flex items-center justify-center text-white mx-auto shadow-hover transition-all hover:scale-105 cursor-pointer"
                      >
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </button>
                      <h4 className="font-serif text-sm font-bold">Photographier vos peintures et sculptures</h4>
                      <p className="text-[10px] opacity-75">Durée de la session : 1 min (Démo accélérée)</p>
                    </div>
                  </>
                )}
              </div>

              {/* Best practices checklist */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#d9a13b]">Checklist de Curation :</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Lumière naturelle indirecte (éviter le flash direct).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Prise de vue bien droite et parallèle à l’œuvre.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Arrière-plan neutre ou mur blanc uniquement.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Résolution minimale requise de 2048 x 2048 pixels.</span>
                  </li>
                </ul>
              </div>

              <div className="border-t border-border pt-6 flex justify-between items-center">
                <span className="text-[10px] text-neutral italic">Suivez la vidéo jusqu’au bout pour valider.</span>
                <button
                  onClick={() => setM1Completed(true)}
                  className={`px-5 py-2.5 rounded text-xs font-semibold cursor-pointer h-10 transition-all ${
                    m1Completed
                      ? "bg-success/10 text-success border border-success/20 font-bold"
                      : "bg-primary text-white hover:bg-primary-dark shadow"
                  }`}
                >
                  {m1Completed ? "✓ Module complété" : "Marquer comme complété"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DESCRIPTION */}
          {activeTab === "m2" && (
            <div className="bg-card border border-border/80 rounded-xl shadow-sm p-6 sm:p-8 space-y-6 animate-fadeIn">
              <div>
                <span className="text-primary text-[10px] font-bold uppercase tracking-wider block mb-1">Module 2</span>
                <h2 className="font-serif text-2xl font-bold mb-2">Rédiger une description captivante</h2>
                <p className="text-neutral text-xs leading-relaxed">
                  L’histoire derrière votre œuvre est ce qui déclenche le coup de cœur de l’acheteur. Apprenez à décrire l’inspiration culturelle, les émotions et les détails de texture.
                </p>
              </div>

              {/* Template framework */}
              <div className="border border-border rounded-xl p-5 bg-secondary/10 space-y-4 text-xs">
                <h4 className="font-bold text-dark flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Structure éditoriale recommandée :
                </h4>
                
                <div className="space-y-3 divide-y divide-border/60">
                  <div className="pb-3">
                    <span className="font-semibold text-primary block mb-1">1. L’Inspiration (Raconter l’Histoire)</span>
                    <p className="text-neutral italic">« Inspirée du fleuve Chari à la tombée de la nuit, cette toile capture les teintes ocres du couchant... »</p>
                  </div>
                  <div className="py-3">
                    <span className="font-semibold text-primary block mb-1">2. Les Matériaux & Gestes</span>
                    <p className="text-neutral italic">« Peint avec de l’acrylique épaisse travaillée au couteau pour créer un relief palpable... »</p>
                  </div>
                  <div className="pt-3">
                    <span className="font-semibold text-primary block mb-1">3. Conseils d’Exposition</span>
                    <p className="text-neutral italic">« Idéal dans un salon lumineux, livré avec son châssis en bois noble ciré prêt à accrocher. »</p>
                  </div>
                </div>
              </div>

              {/* Description guidelines */}
              <div className="space-y-2 text-xs leading-relaxed">
                <h4 className="font-bold text-dark">Règles fondamentales :</h4>
                <ul className="list-disc pl-5 space-y-1 text-neutral">
                  <li>Minimum de 20 caractères par description (validé par Zod).</li>
                  <li>Ne mentionnez jamais vos coordonnées personnelles (e-mail, téléphone) dans les descriptions.</li>
                  <li>Précisez si l’œuvre nécessite un encadrement ou est livrée prête à exposer.</li>
                </ul>
              </div>

              <div className="border-t border-border pt-6 flex justify-between items-center">
                <span className="text-[10px] text-neutral italic">Lisez la structure recommandée pour valider.</span>
                <button
                  onClick={() => setM2Completed(true)}
                  className={`px-5 py-2.5 rounded text-xs font-semibold cursor-pointer h-10 transition-all ${
                    m2Completed
                      ? "bg-success/10 text-success border border-success/20 font-bold"
                      : "bg-primary text-white hover:bg-primary-dark shadow"
                  }`}
                >
                  {m2Completed ? "✓ Module complété" : "Marquer comme complété"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PACKAGING */}
          {activeTab === "m3" && (
            <div className="bg-card border border-border/80 rounded-xl shadow-sm p-6 sm:p-8 space-y-6 animate-fadeIn">
              <div>
                <span className="text-primary text-[10px] font-bold uppercase tracking-wider block mb-1">Module 3</span>
                <h2 className="font-serif text-2xl font-bold mb-2">Emballage professionnel de transport</h2>
                <p className="text-neutral text-xs leading-relaxed">
                  L’art voyage par transporteur et doit être blindé contre les chocs. Un emballage négligé entraîne des détériorations, des retours et le blocage de vos fonds séquestres.
                </p>
              </div>

              {/* Video Mock Player */}
              <div className="relative aspect-video w-full rounded-xl bg-gradient-to-tr from-neutral to-dark overflow-hidden shadow-inner flex items-center justify-center border border-border/50">
                {isVideo3Playing ? (
                  <div className="text-center text-white space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-xs font-medium">Lecture du cours... {video3Progress}%</p>
                    <div className="w-36 h-1 bg-white/20 rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${video3Progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative text-center z-10 text-white space-y-2 p-4">
                      <button
                        onClick={handleStartVideo3}
                        className="w-14 h-14 bg-primary hover:bg-primary-dark rounded-full flex items-center justify-center text-white mx-auto shadow-hover transition-all hover:scale-105 cursor-pointer"
                      >
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </button>
                      <h4 className="font-serif text-sm font-bold">Tutoriel : Emballer une toile et un masque</h4>
                      <p className="text-[10px] opacity-75">Durée de la session : 1 min (Démo accélérée)</p>
                    </div>
                  </>
                )}
              </div>

              {/* Packing guide */}
              <div className="space-y-3 pt-2 text-xs leading-relaxed">
                <h4 className="font-bold text-dark uppercase tracking-wider text-[#d9a13b]">La méthode SANKOFA en 4 étapes :</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-secondary/10 p-3 rounded border border-border/50">
                    <span className="font-bold text-primary block mb-1">1. Protection Directe</span>
                    <span>Papier de soie non acide ou papier glassine (pas de papier bulle directement sur la peinture fraîche).</span>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded border border-border/50">
                    <span className="font-bold text-primary block mb-1">2. Amortissement</span>
                    <span>Enrouler généreusement l’œuvre dans 2 à 3 couches de papier bulle pour former un cocon protecteur.</span>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded border border-border/50">
                    <span className="font-bold text-primary block mb-1">3. Renforcement</span>
                    <span>Placer des cornières de protection en carton ou mousse sur les 4 angles des peintures et cadres.</span>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded border border-border/50">
                    <span className="font-bold text-primary block mb-1">4. Boîte Rigide</span>
                    <span>Insérer dans un carton double cannelure solide, en remplissant les vides avec des chips de polystyrène.</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6 flex justify-between items-center">
                <span className="text-[10px] text-neutral italic">Suivez la vidéo tutoriel pour valider.</span>
                <button
                  onClick={() => setM3Completed(true)}
                  className={`px-5 py-2.5 rounded text-xs font-semibold cursor-pointer h-10 transition-all ${
                    m3Completed
                      ? "bg-success/10 text-success border border-success/20 font-bold"
                      : "bg-primary text-white hover:bg-primary-dark shadow"
                  }`}
                >
                  {m3Completed ? "✓ Module complété" : "Marquer comme complété"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: QUIZ */}
          {activeTab === "quiz" && (
            <div className="bg-card border border-border/80 rounded-xl shadow-sm p-6 sm:p-8 space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d9a13b]/15 rounded-full flex items-center justify-center text-[#d9a13b] shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[#d9a13b] text-[10px] font-bold uppercase tracking-wider block">Évaluation Finale</span>
                  <h2 className="font-serif text-2xl font-bold text-dark">Quiz de Certification SANKOFA</h2>
                </div>
              </div>

              {quizResult ? (
                /* QUIZ RESULT STATE */
                <div className="p-6 text-center space-y-4 border rounded-xl animate-scaleUp bg-card shadow-sm">
                  {quizResult.success ? (
                    <>
                      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center text-success mx-auto">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-bold text-success-dark">Examen Réussi ! ({quizResult.score}/5)</h3>
                      <p className="text-neutral text-xs leading-relaxed max-w-sm mx-auto">
                        {quizResult.message} Vous pouvez maintenant déposer vos premières créations artistiques.
                      </p>
                      <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/dashboard/artworks/new" className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-6 rounded transition-all text-xs h-10 shadow flex items-center justify-center">
                          Déposer une œuvre
                        </Link>
                        <button
                          onClick={resetQuiz}
                          className="border border-border hover:bg-secondary/5 font-semibold py-2.5 px-6 rounded transition-all text-xs text-dark h-10 cursor-pointer"
                        >
                          Revoir le Quiz
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center text-error mx-auto">
                        <AlertCircle className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-bold text-error-dark">Échec du Quiz ({quizResult.score}/5)</h3>
                      <p className="text-neutral text-xs leading-relaxed max-w-sm mx-auto">
                        {quizResult.message} Vous devez obtenir au moins 4 bonnes réponses pour valider votre certification.
                      </p>
                      <div className="pt-4">
                        <button
                          onClick={resetQuiz}
                          className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-6 rounded transition-all text-xs h-10 shadow cursor-pointer"
                        >
                          Recommencer l’évaluation
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* ACTIVE QUIZ FORM */
                <form onSubmit={handleQuizSubmit} className="space-y-6">
                  
                  {/* Q1 */}
                  <div className="space-y-3 p-4 border border-border/60 rounded-lg bg-card">
                    <span className="font-semibold text-xs text-primary block flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      Question 1 (Photographie)
                    </span>
                    <p className="text-xs font-medium text-dark leading-relaxed">
                      Quel est le meilleur éclairage recommandé pour photographier vos toiles ?
                    </p>
                    <div className="space-y-2 text-xs">
                      {[
                        { key: "A", val: "Lumière directe du soleil à midi." },
                        { key: "B", val: "Le flash direct de l’appareil photo." },
                        { key: "C", val: "La lumière naturelle indirecte ou un éclairage diffus de studio." },
                        { key: "D", val: "Une seule lampe de bureau jaune posée sur le côté." },
                      ].map((opt) => (
                        <label key={opt.key} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/5 cursor-pointer">
                          <input
                            type="radio"
                            name="q1"
                            value={opt.key}
                            checked={answers.q1 === opt.key}
                            onChange={(e) => setAnswers({ ...answers, q1: e.target.value })}
                            className="text-primary focus:ring-primary"
                          />
                          <span>{opt.key}) {opt.val}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q2 */}
                  <div className="space-y-3 p-4 border border-border/60 rounded-lg bg-card">
                    <span className="font-semibold text-xs text-primary block flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      Question 2 (Description)
                    </span>
                    <p className="text-xs font-medium text-dark leading-relaxed">
                      Quel élément de narration est crucial dans la description de votre œuvre ?
                    </p>
                    <div className="space-y-2 text-xs">
                      {[
                        { key: "A", val: "Le coût de revient détaillé de vos pigments et du bois." },
                        { key: "B", val: "L’histoire de création, l’inspiration culturelle et la démarche émotionnelle." },
                        { key: "C", val: "Votre numéro de téléphone et votre adresse complète." },
                        { key: "D", val: "La liste nominative de vos acheteurs passés." },
                      ].map((opt) => (
                        <label key={opt.key} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/5 cursor-pointer">
                          <input
                            type="radio"
                            name="q2"
                            value={opt.key}
                            checked={answers.q2 === opt.key}
                            onChange={(e) => setAnswers({ ...answers, q2: e.target.value })}
                            className="text-primary focus:ring-primary"
                          />
                          <span>{opt.key}) {opt.val}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q3 */}
                  <div className="space-y-3 p-4 border border-border/60 rounded-lg bg-card">
                    <span className="font-semibold text-xs text-primary block flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      Question 3 (Emballage)
                    </span>
                    <p className="text-xs font-medium text-dark leading-relaxed">
                      Pour emballer une toile peinte, quelle est la première couche de contact à appliquer ?
                    </p>
                    <div className="space-y-2 text-xs">
                      {[
                        { key: "A", val: "Du papier bulle directement sur la toile." },
                        { key: "B", val: "Du papier journal légèrement humide pour conserver l’éclat." },
                        { key: "C", val: "Du papier de soie sans acide ou papier sulfurisé protecteur (glassine)." },
                        { key: "D", val: "Un film plastique étirable de cuisine collé contre la toile." },
                      ].map((opt) => (
                        <label key={opt.key} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/5 cursor-pointer">
                          <input
                            type="radio"
                            name="q3"
                            value={opt.key}
                            checked={answers.q3 === opt.key}
                            onChange={(e) => setAnswers({ ...answers, q3: e.target.value })}
                            className="text-primary focus:ring-primary"
                          />
                          <span>{opt.key}) {opt.val}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q4 */}
                  <div className="space-y-3 p-4 border border-border/60 rounded-lg bg-card">
                    <span className="font-semibold text-xs text-primary block flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      Question 4 (Emballage)
                    </span>
                    <p className="text-xs font-medium text-dark leading-relaxed">
                      Quelle méthode garantit l’expédition sécurisée d’un masque en bois ou d’une sculpture ?
                    </p>
                    <div className="space-y-2 text-xs">
                      {[
                        { key: "A", val: "Un simple sac d’expédition souple sans calage." },
                        { key: "B", val: "Un cocon de papier bulle placé dans un carton rigide rempli de chips de calage." },
                        { key: "C", val: "Une serviette de bain nouée avec de la ficelle dans une enveloppe bulle." },
                        { key: "D", val: "Aucun colis, la confier nue directement aux mains du transporteur." },
                      ].map((opt) => (
                        <label key={opt.key} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/5 cursor-pointer">
                          <input
                            type="radio"
                            name="q4"
                            value={opt.key}
                            checked={answers.q4 === opt.key}
                            onChange={(e) => setAnswers({ ...answers, q4: e.target.value })}
                            className="text-primary focus:ring-primary"
                          />
                          <span>{opt.key}) {opt.val}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q5 */}
                  <div className="space-y-3 p-4 border border-border/60 rounded-lg bg-card">
                    <span className="font-semibold text-xs text-primary block flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      Question 5 (Réglementation)
                    </span>
                    <p className="text-xs font-medium text-dark leading-relaxed">
                      Quel est le délai accordé à l’acheteur pour signaler un litige ou une non-conformité après livraison ?
                    </p>
                    <div className="space-y-2 text-xs">
                      {[
                        { key: "A", val: "12 heures seulement après la signature du bon." },
                        { key: "B", val: "48 heures après la réception effective." },
                        { key: "C", val: "14 jours ouvrés en vertu des accords régionaux." },
                        { key: "D", val: "Il n’y a aucun délai possible, l’achat est irrévocable." },
                      ].map((opt) => (
                        <label key={opt.key} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/5 cursor-pointer">
                          <input
                            type="radio"
                            name="q5"
                            value={opt.key}
                            checked={answers.q5 === opt.key}
                            onChange={(e) => setAnswers({ ...answers, q5: e.target.value })}
                            className="text-primary focus:ring-primary"
                          />
                          <span>{opt.key}) {opt.val}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="text-[10px] text-neutral flex items-center gap-1">
                      <Award className="w-4 h-4 text-accent" />
                      Note minimale de 80% (4/5) requise.
                    </span>
                    <button
                      type="submit"
                      disabled={quizSubmitting || Object.values(answers).some((v) => !v)}
                      className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded shadow flex items-center gap-2 text-xs cursor-pointer h-11"
                    >
                      {quizSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Correction...</span>
                        </>
                      ) : (
                        <span>Soumettre l’Évaluation</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </main>

    </TransactionalLayout>
  );
}

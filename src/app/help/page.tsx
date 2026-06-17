"use client";

import React, { useState, useEffect, useRef } from "react";
import MarketLayout from "@/components/layout/MarketLayout";
import { 
  MessageSquare, 
  Send, 
  ChevronDown, 
  Loader2, 
  ShieldCheck, 
  Truck, 
  Clock, 
  CreditCard, 
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function HelpPage() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Bonjour ! Je suis l'assistant intelligent de SANKOFA. Je suis là pour vous aider à comprendre notre système de séquestre sécurisé, nos options de livraison assurée, nos contrats de location d'œuvres d'art, ou à ouvrir un litige en cas de problème. Quelle est votre question ?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Focus input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    if (!textToSend) {
      setInput("");
    }

    const newMessages = [...messages, { role: "user", content: text } as Message];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setMessages(prev => [
          ...prev, 
          { 
            role: "assistant", 
            content: "Désolé, je rencontre des difficultés pour me connecter au serveur. Veuillez réessayer plus tard." 
          }
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: "Une erreur est survenue lors de l'envoi de votre message. Veuillez vérifier votre connexion." 
        }
      ]);
    } finally {
      setIsLoading(false);
      // Refocus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "Comment fonctionne la Garantie de Séquestre SANKOFA ?",
      icon: <ShieldCheck className="w-5 h-5 text-success shrink-0" />,
      answer: "La Garantie de Séquestre SANKOFA sécurise vos achats. Lorsque vous payez, l'argent est conservé sur un compte tiers bloqué. L'artiste ne perçoit ses fonds qu'après votre validation de conformité lors de la réception, ou automatiquement après 48h sans signalement de problème."
    },
    {
      question: "Quels sont les frais et délais de livraison au Cameroun ?",
      icon: <Truck className="w-5 h-5 text-primary shrink-0" />,
      answer: "Chez SANKOFA, les œuvres d'art sont préparées par l'artiste (selon nos critères stricts d'emballage) et expédiées directement. La livraison est facturée 5 000 FCFA à Douala et Yaoundé, et 15 000 FCFA pour le reste du pays. Chaque colis est entièrement assuré contre la casse ou le vol durant le transport."
    },
    {
      question: "Comment fonctionne la formule de location d'œuvres d'art ?",
      icon: <Clock className="w-5 h-5 text-accent shrink-0" />,
      answer: "Notre formule de location vous permet de profiter d'œuvres chez vous pour 1, 3 ou 6 mois. Les loyers payés sont déductibles de la valeur de l'œuvre : si vous décidez d'acquérir l'œuvre définitivement en cours de contrat, la totalité des loyers déjà versés sera déduite du prix d'achat final !"
    },
    {
      question: "Que faire en cas de litige ou d'œuvre non conforme ?",
      icon: <AlertCircle className="w-5 h-5 text-error shrink-0" />,
      answer: "En cas d'œuvre reçue cassée ou non conforme, vous disposez de 48 heures après la livraison pour cliquer sur 'Signaler un problème' depuis votre espace de suivi. Les fonds resteront bloqués sur le séquestre pendant que notre service de médiation examine vos photos pour organiser le retour et votre remboursement intégral."
    },
    {
      question: "Quels sont les moyens de paiement acceptés ?",
      icon: <CreditCard className="w-5 h-5 text-info shrink-0" />,
      answer: "SANKOFA propose deux modes de paiement sécurisés : le Mobile Money (Orange Money, MTN MoMo, Moov, Airtel) via l'intégrateur Paynote, et les cartes bancaires internationales (Visa, Mastercard) via Stripe. Vos transactions sont entièrement chiffrées de bout en bout."
    }
  ];

  const suggestions = [
    "Comment fonctionne le séquestre ?",
    "Quels sont les frais de livraison ?",
    "Comment louer une œuvre ?",
    "Déclarer un litige"
  ];

  return (
    <MarketLayout>
      <div className="bg-gradient-to-br from-[#FCFAF5] via-[#FCFAF5] to-[#E8D9C6]/30 flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header section */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-dark mb-4">
              Centre d&apos;Aide &amp; Support
            </h1>
            <p className="text-neutral text-base sm:text-lg max-w-2xl mx-auto">
              Retrouvez toutes les réponses à vos questions sur les paiements sécurisés, la logistique d&apos;art et notre système de séquestre, ou échangez directement avec notre assistant intelligent.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* FAQ Accordion (Left Column - 5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <HelpCircle className="w-6 h-6 text-primary" />
                <h2 className="font-serif text-2xl font-bold text-dark">Foire Aux Questions</h2>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div 
                      key={idx} 
                      className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm transition-all hover:border-border"
                    >
                      <button
                        onClick={() => toggleFaq(idx)}
                        className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-semibold text-dark hover:bg-neutral/5 transition-colors focus:outline-none min-h-[48px]"
                        aria-expanded={isOpen}
                      >
                        <div className="flex items-center gap-3">
                          {faq.icon}
                          <span className="text-sm sm:text-base pr-4">{faq.question}</span>
                        </div>
                        <ChevronDown 
                          className={`w-5 h-5 text-neutral shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
                        />
                      </button>
                      
                      <div 
                        className={`transition-all duration-300 ease-in-out ${isOpen ? "max-h-[300px] border-t border-border/40 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
                      >
                        <div className="p-4 sm:p-5 text-neutral text-sm sm:text-base leading-relaxed bg-[#FCFAF5]/50">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chatbot Interface (Right Column - 7 cols) */}
            <div className="lg:col-span-7">
              <div className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[580px]">
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-primary to-[#D9A13B] p-4 sm:p-5 text-white flex items-center gap-3 shrink-0 shadow-md">
                  <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold">Assistant Sankofa</h3>
                    <p className="text-[11px] sm:text-xs text-white/85 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse"></span>
                      IA de support connectée • Sandbox & API Deepseek
                    </p>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FCFAF5]/30">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === "user";
                    return (
                      <div 
                        key={index}
                        className={`flex ${isUser ? "justify-end" : "justify-start"} transition-all animate-fadeIn`}
                      >
                        <div 
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm sm:text-base shadow-sm leading-relaxed ${
                            isUser 
                              ? "bg-primary text-white rounded-br-none" 
                              : "bg-[#FFFFFF] border border-border/40 text-dark rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#FFFFFF] border border-border/40 text-dark rounded-2xl rounded-bl-none px-4 py-3 text-sm sm:text-base shadow-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-neutral text-xs sm:text-sm animate-pulse">L&apos;assistant réfléchit...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggestions List */}
                <div className="px-4 sm:px-6 py-2 bg-card border-t border-border/30 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
                  {suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(sug)}
                      disabled={isLoading}
                      className="bg-[#FCFAF5] hover:bg-secondary/40 border border-border/50 text-neutral hover:text-dark text-xs font-semibold px-3 py-1.5 rounded-full transition-all shrink-0 min-h-[32px] disabled:opacity-50"
                    >
                      {sug}
                    </button>
                  ))}
                </div>

                {/* Message Input Form */}
                <div className="p-4 sm:p-5 bg-card border-t border-border/50 shrink-0 flex items-center gap-2.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Écrivez votre message..."
                    disabled={isLoading}
                    className="flex-1 bg-[#FCFAF5] border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm sm:text-base text-dark placeholder:text-neutral/60 focus:outline-none min-h-[48px] disabled:opacity-60 transition-all"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !input.trim()}
                    className="bg-primary hover:bg-primary-dark disabled:bg-neutral/30 text-white p-3 rounded-xl transition-all shadow-md flex items-center justify-center min-w-[48px] min-h-[48px]"
                    aria-label="Envoyer le message"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 translate-x-[1px] -translate-y-[1px]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketLayout>
  );
}

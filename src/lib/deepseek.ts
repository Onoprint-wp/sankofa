const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class DeepseekClient {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generates a premium and immersive description of an artwork based on its metadata.
   */
  async generateArtworkDescription(
    title: string,
    category: string,
    materials: string[]
  ): Promise<string> {
    const materialsStr = materials && materials.length > 0 ? materials.join(", ") : "matériaux bruts";
    
    if (!this.apiKey) {
      console.log("[Deepseek Sandbox] Generating mock artwork description.");
      // Premium mock description matching African art theme
      return `Cette œuvre d'art captivante intitulée « ${title} » est une création originale s'inscrivant dans la catégorie ${category}. Façonnée à partir de : ${materialsStr}, elle témoigne de la rencontre harmonieuse entre techniques artisanales ancestrales et expressions contemporaines africaines. L'artiste y insuffle une texture riche et des contrastes vibrants pour explorer les thèmes de l'identité, de l'enracinement et de la transmission culturelle. Une pièce de collection unique, chargée d'histoire et de poésie visuelle, qui invite à la contemplation et au dialogue.`;
    }

    try {
      const systemPrompt = `Tu es un historien de l'art et critique d'art africain réputé. Rédige une description poétique, immersive et captivante (d'environ 100 à 150 mots) pour une œuvre d'art en français.`;
      const userPrompt = `Titre de l'œuvre : "${title}". Catégorie : "${category}". Matériaux/Techniques : "${materialsStr}". Rédige une critique d'art inspirante pour cette œuvre. Ne mets pas d'introduction ou de conclusion inutile, écris directement la description.`;

      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Erreur de l'API Deepseek");
      }

      return data.choices[0].message.content.trim();
    } catch (err: any) {
      console.error("[Deepseek Error] generateArtworkDescription failed, falling back to mock:", err.message);
      return `Cette œuvre d'art captivante intitulée « ${title} » est une création originale s'inscrivant dans la catégorie ${category}. Façonnée à partir de : ${materialsStr}, elle témoigne de la rencontre harmonieuse entre techniques artisanales ancestrales et expressions contemporaines africaines. L'artiste y insuffle une texture riche et des contrastes vibrants pour explorer les thèmes de l'identité, de l'enracinement et de la transmission culturelle. Une pièce de collection unique, chargée d'histoire et de poésie visuelle, qui invite à la contemplation et au dialogue.`;
    }
  }

  /**
   * Responds to user support queries about SANKOFA policies (escrow, delivery, rentals, disputes)
   */
  async chatWithSupport(messages: ChatMessage[]): Promise<string> {
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
    
    if (!this.apiKey) {
      console.log("[Deepseek Sandbox] Chat support mock response generation.");
      const query = lastUserMessage.toLowerCase();
      
      // Keyword semantic matching fallback
      if (query.includes("livraison") || query.includes("transport") || query.includes("expédier") || query.includes("délai")) {
        return "Chez SANKOFA, les œuvres d'art sont préparées par l'artiste (selon nos critères stricts d'emballage) et expédiées directement. La livraison est facturée 5 000 FCFA à Douala et Yaoundé, et 15 000 FCFA pour le reste du pays. Chaque colis est entièrement assuré contre la casse ou le vol durant le transport.";
      }
      
      if (query.includes("paiement") || query.includes("payer") || query.includes("momo") || query.includes("orange") || query.includes("mtn") || query.includes("carte") || query.includes("stripe")) {
        return "SANKOFA propose deux modes de paiement sécurisés : le Mobile Money (Orange Money, MTN MoMo, Moov, Airtel) via l'intégrateur Paynote, et les cartes bancaires internationales (Visa, Mastercard) via Stripe. Vos transactions sont entièrement chiffrées de bout en bout.";
      }
      
      if (query.includes("séquestre") || query.includes("bloqu") || query.includes("garantie") || query.includes("escrow")) {
        return "La Garantie de Séquestre SANKOFA sécurise vos achats. Lorsque vous payez, l'argent est conservé sur un compte tiers bloqué. L'artiste ne perçoit ses fonds qu'après votre validation de conformité lors de la réception, ou automatiquement après 48h sans signalement de problème.";
      }

      if (query.includes("location") || query.includes("louer") || query.includes("mensuel") || query.includes("loyer")) {
        return "Notre formule de location vous permet de profiter d'œuvres chez vous pour 1, 3 ou 6 mois. Les loyers payés sont déductibles de la valeur de l'œuvre : si vous décidez d'acquérir l'œuvre définitivement en cours de contrat, la totalité des loyers déjà versés sera déduite du prix d'achat final !";
      }

      if (query.includes("litige") || query.includes("problème") || query.includes("endommagé") || query.includes("rembours")) {
        return "En cas d'œuvre reçue cassée ou non conforme, vous disposez de 48 heures après la livraison pour cliquer sur 'Signaler un problème' depuis votre espace de suivi. Les fonds resteront bloqués sur le séquestre pendant que notre service de médiation examine vos photos pour organiser le retour et votre remboursement intégral.";
      }

      if (query.includes("bonjour") || query.includes("salut") || query.includes("hello")) {
        return "Bonjour ! Je suis l'assistant intelligent de SANKOFA. Je suis là pour vous aider à comprendre notre système de séquestre sécurisé, nos options de livraison assurée, nos contrats de location d'œuvres d'art, ou à ouvrir un litige en cas de problème. Quelle est votre question ?";
      }

      return "Je comprends votre question. En tant qu'assistant de la galerie d'art SANKOFA, je vous confirme que nos transactions sont protégées par séquestre et nos livraisons assurées par des professionnels. Pour des questions spécifiques sur un artiste ou une œuvre, n'hésitez pas à consulter leur profil public ou à me demander plus d'informations.";
    }

    try {
      const systemPrompt = `Tu es l'assistant de support de la plateforme d'art contemporain africain SANKOFA. 
Ton rôle est d'informer chaleureusement les acheteurs et artistes sur :
1. Les frais de livraison (5000 FCFA Douala/Yaoundé, 15000 FCFA autres villes) et l'assurance transport.
2. Le paiement sécurisé par Mobile Money (Paynote) et Cartes (Stripe).
3. Le système de séquestre : l'argent de l'acheteur est bloqué pendant 48h après la livraison pour lui permettre d'inspecter l'œuvre. L'artiste est payé après validation ou 48h d'inactivité.
4. La location d'œuvres (1, 3 ou 6 mois) avec option d'achat déductible (les loyers payés réduisent le prix final).
5. Les litiges : l'acheteur peut signaler un problème sous 48h de livraison pour bloquer les fonds et solliciter la médiation.
Sois concis, clair, et garde un ton professionnel et culturellement valorisant.`;

      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages
          ],
          temperature: 0.5,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Erreur de l'API Deepseek");
      }

      return data.choices[0].message.content.trim();
    } catch (err: any) {
      console.error("[Deepseek Error] chatWithSupport failed, using mock semantic parser:", err.message);
      return "Désolé, j'ai rencontré une petite perturbation réseau. Pour rappel, SANKOFA propose un paiement par Mobile Money ou carte bancaire entièrement sécurisé par séquestre, et des livraisons assurées au Cameroun (5 000 FCFA localement, 15 000 FCFA en province). Que puis-je préciser ?";
    }
  }

  /**
   * Moderates user input, checking for offensive or inappropriate content.
   */
  async moderateContent(text: string): Promise<{ isFlagged: boolean; reason?: string }> {
    const bannedWords = ["merde", "connard", "salope", "putain", "cul", "bâtard", "arnaque", "escroc", "fake", "fraud", "shitty", "fuck", "bitch"];
    
    // Check local banned words first
    const lowerText = text.toLowerCase();
    for (const word of bannedWords) {
      if (word === "cul") {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(text)) {
          return { isFlagged: true, reason: `Le mot inapproprié '${word}' a été détecté par nos filtres locaux.` };
        }
      } else {
        if (lowerText.includes(word)) {
          return { isFlagged: true, reason: `Le mot inapproprié '${word}' a été détecté par nos filtres locaux.` };
        }
      }
    }

    if (!this.apiKey) {
      console.log("[Deepseek Sandbox] Content moderation completed (passed local rules).");
      return { isFlagged: false };
    }

    try {
      const systemPrompt = `Tu es un outil de modération de contenu pour la plateforme d'art SANKOFA. Évalue si le texte soumis contient des insultes, des propos haineux, des grossièretés ou de la fraude. Réponds STRICTEMENT en format JSON: {"isFlagged": boolean, "reason": "string ou null"}`;
      
      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Texte à analyser: "${text}"` }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error("Erreur modération API");
      }

      const result = JSON.parse(data.choices[0].message.content);
      return {
        isFlagged: !!result.isFlagged,
        reason: result.reason || undefined,
      };
    } catch (err: any) {
      console.error("[Deepseek Error] Content moderation failed, using local rules result (passed).");
      return { isFlagged: false };
    }
  }
}

export const deepseek = new DeepseekClient();

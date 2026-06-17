const PAYNOTE_API_BASE = "https://api.paynote.africa/v1";

export interface PaynotePaymentResponse {
  success: boolean;
  transaction_ref: string;
  message: string;
  status: "pending" | "success" | "failed";
}

export class PaynoteClient {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.PAYNOTE_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async initiatePayment(params: {
    amount: number;
    phone: string;
    provider: string;
    description: string;
    orderId: string;
  }): Promise<PaynotePaymentResponse> {
    const mockRef = `PN-MOCK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    if (!this.apiKey) {
      console.log(`[Paynote Sandbox] Simulated payment initiation:
        - Amount: ${params.amount} FCFA
        - Phone: ${params.phone}
        - Provider: ${params.provider}
        - Order ID: ${params.orderId}
        - Generated Ref: ${mockRef}`);
      
      return {
        success: true,
        transaction_ref: mockRef,
        message: "Paiement simulé initié.",
        status: "pending",
      };
    }

    try {
      const response = await fetch(`${PAYNOTE_API_BASE}/collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: "XOF",
          phone: params.phone,
          provider: params.provider,
          description: params.description,
          external_reference: params.orderId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erreur Paynote lors de la collecte.");
      }

      return {
        success: true,
        transaction_ref: data.transaction_ref || data.id,
        message: data.message || "Collecte initiée avec succès.",
        status: data.status || "pending",
      };
    } catch (err: any) {
      console.error("Paynote payment initiation failed:", err);
      throw err;
    }
  }

  async triggerPayout(params: {
    amount: number;
    phone: string;
    provider: string;
    description: string;
    referenceId: string;
  }): Promise<{ success: boolean; payout_ref: string; message: string }> {
    const mockRef = `PN-OUT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    if (!this.apiKey) {
      console.log(`[Paynote Sandbox] Simulated payout to artist:
        - Amount: ${params.amount} FCFA
        - Phone: ${params.phone}
        - Provider: ${params.provider}
        - Reference: ${params.referenceId}
        - Generated Payout Ref: ${mockRef}`);

      return {
        success: true,
        payout_ref: mockRef,
        message: "Virement simulé effectué.",
      };
    }

    try {
      const response = await fetch(`${PAYNOTE_API_BASE}/payout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: "XOF",
          phone: params.phone,
          provider: params.provider,
          description: params.description,
          external_reference: params.referenceId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erreur Paynote lors du virement.");
      }

      return {
        success: true,
        payout_ref: data.payout_ref || data.id,
        message: data.message || "Virement exécuté avec succès.",
      };
    } catch (err: any) {
      console.error("Paynote payout failed:", err);
      throw err;
    }
  }
}

export const paynote = new PaynoteClient();

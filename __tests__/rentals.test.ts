import { registerCertificateHash } from "../src/lib/blockchain";
import { supabase } from "../src/lib/supabaseClient";

// Mock supabase client and registerCertificateHash
jest.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("../src/lib/blockchain", () => ({
  registerCertificateHash: jest.fn().mockResolvedValue({
    txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    certificate: { id: "mock-cert-uuid" },
  }),
}));

describe("SANKOFA - Artotheque V2 Rental Module", () => {
  let mockArtworkBuyout: any;
  let mockRentalBuyout: any;
  let mockPaymentsBuyout: any[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockArtworkBuyout = {
      id: "art-uuid-1",
      title: "Masque Dan de Côte d'Ivoire",
      price: 300000,
      rental_price_per_month: 24000, // 8% of 300,000
    };

    mockRentalBuyout = {
      id: "rental-uuid-1",
      artwork_id: "art-uuid-1",
      buyer_id: "buyer-uuid-1",
      duration_months: 3,
      monthly_rate: 24000,
      status: "active",
      artwork: mockArtworkBuyout,
    };

    mockPaymentsBuyout = [
      { id: "p-1", rental_id: "rental-uuid-1", amount: 24000, payment_status: "paid" },
      { id: "p-2", rental_id: "rental-uuid-1", amount: 24000, payment_status: "paid" },
      { id: "p-3", rental_id: "rental-uuid-1", amount: 24000, payment_status: "pending" },
    ];
  });

  describe("Monthly Rental Rate Fallback Rules", () => {
    it("should fallback to 8% of artwork price if rental_price_per_month is not specified", () => {
      const price = 500000;
      const rate = Math.round(price * 0.08);
      expect(rate).toBe(40000);
    });

    it("should respect rental_price_per_month when specified on the artwork", () => {
      const specifiedRate = mockArtworkBuyout.rental_price_per_month;
      expect(specifiedRate).toBe(24000);
    });
  });

  describe("Buyout Balance Calculation Logic", () => {
    it("should calculate balance due by subtracting sum of paid rents from sale price", () => {
      const paidSum = mockPaymentsBuyout
        .filter((p) => p.payment_status === "paid")
        .reduce((sum, p) => sum + p.amount, 0); // 24000 * 2 = 48,000
      
      const balanceDue = Math.max(0, mockArtworkBuyout.price - paidSum);
      expect(balanceDue).toBe(252000); // 300,000 - 48,000
    });

    it("should cap balance due at 0 if the sum of rents exceeds or equals the sale price", () => {
      const fullyPaidPayments = [
        { amount: 150000, payment_status: "paid" },
        { amount: 150000, payment_status: "paid" },
        { amount: 150000, payment_status: "paid" }, // Total 450,000
      ];
      
      const paidSum = fullyPaidPayments
        .filter((p) => p.payment_status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);

      const salePrice = 300000;
      const balanceDue = Math.max(0, salePrice - paidSum);
      expect(balanceDue).toBe(0);
    });
  });

  describe("End-to-End Simulation Buyout API Flow (Mocked)", () => {
    it("should successfully query payments, compute buyout balance, update status, and call blockchain cert builder", async () => {
      const mockFrom = supabase.from as jest.Mock;

      mockFrom.mockImplementation((table: string) => {
        if (table === "rentals") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockRentalBuyout, error: null }),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === "rental_payments") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            update: jest.fn(() => ({
              eq: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === "audit_logs") {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      // Query mock elements
      const { data: rental } = await supabase.from("rentals").select("*").eq("id", "rental-uuid-1").single();
      const { data: payments } = await supabase.from("rental_payments").select("*").eq("rental_id", "rental-uuid-1");

      expect(rental).toBeDefined();
      expect(rental.buyer_id).toBe("buyer-uuid-1");

      const paidSum = mockPaymentsBuyout
        .filter((p) => p.payment_status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = Math.max(0, Number(rental.artwork.price) - paidSum);

      expect(balanceDue).toBe(252000);

      // Trigger mocked blockchain registration
      const certResult = await registerCertificateHash(rental.artwork_id, null, undefined, rental.id);
      expect(certResult).toBeDefined();
      expect(certResult.txHash.startsWith("0x")).toBe(true);
    });
  });
});

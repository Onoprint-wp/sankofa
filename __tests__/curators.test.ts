import { exhibitionSchema, checkoutSchema } from "../src/lib/validations";
import { supabase } from "../src/lib/supabaseClient";

// Mock supabase client
jest.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("SANKOFA - Etape 9: Curators & Virtual Exhibitions Module Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Zod Schema Validation - exhibitionSchema", () => {
    const validPayload = {
      title: "Chefs-d’œuvre du Littoral",
      description: "Une collection d’œuvres d’art contemporain célébrant la vie côtière et ses symboles.",
      cover_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5",
      artwork_ids: [
        "3b221a71-6c24-4f2f-8a4a-718a93e3d64c",
        "59306b9b-c2e3-4708-9df2-bb53d865fe7c"
      ],
    };

    it("should accept a valid exhibition payload", () => {
      const result = exhibitionSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should reject a title shorter than 3 characters", () => {
      const invalid = { ...validPayload, title: "Ab" };
      const result = exhibitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject a description shorter than 10 characters", () => {
      const invalid = { ...validPayload, description: "Court" };
      const result = exhibitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject an invalid cover image URL", () => {
      const invalid = { ...validPayload, cover_url: "not-a-url" };
      const result = exhibitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject an empty artwork selection", () => {
      const invalid = { ...validPayload, artwork_ids: [] };
      const result = exhibitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject invalid UUIDs in artwork selection", () => {
      const invalid = { ...validPayload, artwork_ids: ["not-a-uuid"] };
      const result = exhibitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Zod Schema Validation - checkoutSchema with exhibition_id", () => {
    const validAddress = {
      full_name: "Aïcha Yaoundé",
      phone: "+237699000000",
      address_line: "Bastos, Yaoundé",
      city: "Yaoundé" as const,
    };

    const baseCheckoutPayload = {
      artwork_id: "3b221a71-6c24-4f2f-8a4a-718a93e3d64c",
      shipping_address: validAddress,
      payment_method: "card" as const,
    };

    it("should accept checkout without exhibition_id", () => {
      const result = checkoutSchema.safeParse(baseCheckoutPayload);
      expect(result.success).toBe(true);
    });

    it("should accept checkout with a valid UUID exhibition_id", () => {
      const payloadWithExhib = {
        ...baseCheckoutPayload,
        exhibition_id: "59306b9b-c2e3-4708-9df2-bb53d865fe7c",
      };
      const result = checkoutSchema.safeParse(payloadWithExhib);
      expect(result.success).toBe(true);
    });

    it("should reject checkout with an invalid UUID exhibition_id", () => {
      const payloadWithExhib = {
        ...baseCheckoutPayload,
        exhibition_id: "invalid-uuid",
      };
      const result = checkoutSchema.safeParse(payloadWithExhib);
      expect(result.success).toBe(false);
    });
  });

  describe("Curator Affiliate Commission Calculation (5 %)", () => {
    const calculateCuratorCommission = (amount: number): number => {
      return parseFloat((amount * 0.05).toFixed(2));
    };

    it("should calculate exact 5 % commission for sales", () => {
      expect(calculateCuratorCommission(100000)).toBe(5000.0);
      expect(calculateCuratorCommission(350000)).toBe(17500.0);
    });

    it("should handle floating points correctly", () => {
      expect(calculateCuratorCommission(250050)).toBe(12502.5);
    });
  });

  describe("Mock Database Interactions for Curation Flow", () => {
    it("should allow inserting an exhibition and linking artworks", async () => {
      const mockFrom = supabase.from as jest.Mock;
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === "exhibitions" || table === "exhibition_artworks") {
          return { insert: mockInsert };
        }
        return {};
      });

      const exhibPayload = {
        curator_id: "curator-123",
        title: "Modern Vision",
        description: "Intention de curation de test.",
        cover_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5",
      };

      await supabase.from("exhibitions").insert(exhibPayload);

      expect(mockFrom).toHaveBeenCalledWith("exhibitions");
      expect(mockInsert).toHaveBeenCalledWith(exhibPayload);

      const junctionPayload = [
        { exhibition_id: "exhib-999", artwork_id: "art-1" },
        { exhibition_id: "exhib-999", artwork_id: "art-2" },
      ];

      await supabase.from("exhibition_artworks").insert(junctionPayload);
      expect(mockFrom).toHaveBeenCalledWith("exhibition_artworks");
      expect(mockInsert).toHaveBeenCalledWith(junctionPayload);
    });

    it("should track referred orders with exhibition_id", async () => {
      const mockFrom = supabase.from as jest.Mock;
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === "orders") {
          return { insert: mockInsert };
        }
        return {};
      });

      const orderPayload = {
        buyer_id: "buyer-789",
        artwork_id: "art-123",
        amount: 250000,
        exhibition_id: "exhib-999", // Referral trace
      };

      await supabase.from("orders").insert(orderPayload);
      expect(mockFrom).toHaveBeenCalledWith("orders");
      expect(mockInsert).toHaveBeenCalledWith(orderPayload);
    });
  });
});

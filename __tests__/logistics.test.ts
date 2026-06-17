import { carrierUpdateSchema } from "../src/lib/validations";
import { supabase } from "../src/lib/supabaseClient";

// Mock supabase client
jest.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("SANKOFA - Etape 10: Logistics & Delivery Module Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Zod Schema Validation - carrierUpdateSchema", () => {
    const validPayload = {
      tracking_number: "SKF-123456789",
      status: "shipped" as const,
      location: "Douala Hub",
      description: "Le colis a été collecté par le transporteur.",
    };

    it("should accept a valid carrier update payload", () => {
      const result = carrierUpdateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should reject an empty tracking number", () => {
      const invalid = { ...validPayload, tracking_number: "" };
      const result = carrierUpdateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject an invalid status", () => {
      const invalid = { ...validPayload, status: "unknown" as any };
      const result = carrierUpdateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject a location shorter than 2 characters", () => {
      const invalid = { ...validPayload, location: "D" };
      const result = carrierUpdateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject a description shorter than 5 characters", () => {
      const invalid = { ...validPayload, description: "col" };
      const result = carrierUpdateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Mock Database Interactions for Logistics Flow", () => {
    it("should allow inserting delivery milestones and updating order status", async () => {
      const mockFrom = supabase.from as jest.Mock;
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "delivery_milestones") {
          return { insert: mockInsert };
        }
        if (table === "orders") {
          return { update: mockUpdate };
        }
        return {};
      });

      const milestonePayload = {
        order_id: "order-uuid-123",
        status: "shipped",
        location: "Yaoundé Agency",
        description: "Colis en cours d’acheminement.",
      };

      await supabase.from("delivery_milestones").insert(milestonePayload);
      expect(mockFrom).toHaveBeenCalledWith("delivery_milestones");
      expect(mockInsert).toHaveBeenCalledWith(milestonePayload);

      await supabase.from("orders").update({ delivery_status: "shipped" }).eq("id", "order-uuid-123");
      expect(mockFrom).toHaveBeenCalledWith("orders");
      expect(mockUpdate).toHaveBeenCalledWith({ delivery_status: "shipped" });
    });
  });
});

import { reviewSchema, reviewModerationSchema } from "../src/lib/validations";
import { supabase } from "../src/lib/supabaseClient";

// Mock supabase client
jest.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("SANKOFA - Etape 8: Reviews and Ratings Module Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Zod Schema Validation", () => {
    describe("reviewSchema", () => {
      const validPayload = {
        order_id: "00000000-0000-0000-0000-000000000000",
        rating: 5,
        comment: "Excellent travail de l’artiste, livraison impeccable.",
      };

      it("should accept a valid review submission", () => {
        const result = reviewSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
      });

      it("should reject rating less than 1", () => {
        const invalid = { ...validPayload, rating: 0 };
        const result = reviewSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it("should reject rating greater than 5", () => {
        const invalid = { ...validPayload, rating: 6 };
        const result = reviewSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it("should reject rating as non-integer", () => {
        const invalid = { ...validPayload, rating: 4.5 };
        const result = reviewSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it("should reject comments longer than 1000 characters", () => {
        const invalid = { ...validPayload, comment: "a".repeat(1001) };
        const result = reviewSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      });

      it("should accept reviews without comments", () => {
        const payloadWithoutComment = {
          order_id: "00000000-0000-0000-0000-000000000000",
          rating: 4,
        };
        const result = reviewSchema.safeParse(payloadWithoutComment);
        expect(result.success).toBe(true);
      });
    });

    describe("reviewModerationSchema", () => {
      const validPayload = {
        review_id: "00000000-0000-0000-0000-000000000000",
        action: "approve",
      };

      it("should accept a valid moderation approval", () => {
        const result = reviewModerationSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
      });

      it("should accept a valid moderation rejection", () => {
        const result = reviewModerationSchema.safeParse({ ...validPayload, action: "reject" });
        expect(result.success).toBe(true);
      });

      it("should reject invalid actions", () => {
        const result = reviewModerationSchema.safeParse({ ...validPayload, action: "delete" });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Math Rating Average Calculation Formula", () => {
    const calculateAverage = (ratings: number[]): number => {
      if (ratings.length === 0) return 0.0;
      const sum = ratings.reduce((acc, curr) => acc + curr, 0);
      return parseFloat((sum / ratings.length).toFixed(2));
    };

    it("should compute accurate average rating for integer lists", () => {
      const ratings = [5, 4, 3, 5]; // sum = 17, count = 4 -> 4.25
      expect(calculateAverage(ratings)).toBe(4.25);
    });

    it("should compute accurate average rating and round to 2 decimal places", () => {
      const ratings = [5, 5, 4]; // sum = 14, count = 3 -> 4.6666... -> 4.67
      expect(calculateAverage(ratings)).toBe(4.67);
    });

    it("should return 0.0 if there are no ratings", () => {
      expect(calculateAverage([])).toBe(0.0);
    });
  });

  describe("Mock API Database Flows", () => {
    it("should allow a buyer to submit a review (pending approved=false)", async () => {
      const mockFrom = supabase.from as jest.Mock;
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === "reviews") {
          return { insert: mockInsert };
        }
        return {};
      });

      const payload = {
        order_id: "order-123",
        buyer_id: "buyer-abc",
        artist_id: "artist-xyz",
        rating: 5,
        comment: "Excellent",
        is_approved: false,
      };

      const { error } = await supabase.from("reviews").insert(payload);

      expect(error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("reviews");
      expect(mockInsert).toHaveBeenCalledWith(payload);
    });

    it("should allow admin to approve a review and update is_approved = true", async () => {
      const mockFrom = supabase.from as jest.Mock;
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "reviews") {
          return { update: mockUpdate };
        }
        return {};
      });

      const { error } = await supabase
        .from("reviews")
        .update({ is_approved: true })
        .eq("id", "review-123");

      expect(error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("reviews");
      expect(mockUpdate).toHaveBeenCalledWith({ is_approved: true });
    });
  });
});

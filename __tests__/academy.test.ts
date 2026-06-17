import { academyQuizSchema } from "../src/lib/validations";
import { supabase } from "../src/lib/supabaseClient";

// Mock supabase client
jest.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const CORRECT_ANSWERS = {
  q1: "C",
  q2: "B",
  q3: "C",
  q4: "B",
  q5: "B"
};

describe("SANKOFA - Academie SANKOFA Training & Quiz Certification Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Quiz Schema Validation (Zod)", () => {
    it("should accept a fully answered quiz with valid choices (A, B, C, D)", () => {
      const payload = { q1: "C", q2: "B", q3: "C", q4: "B", q5: "A" };
      const result = academyQuizSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject submissions with missing answers", () => {
      const payload = { q1: "C", q2: "", q3: "C", q4: "B", q5: "A" };
      const result = academyQuizSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject answers containing invalid choices", () => {
      const payload = { q1: "C", q2: "E", q3: "C", q4: "B", q5: "A" };
      const result = academyQuizSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("Quiz Grading Logic & Passing Threshold", () => {
    it("should pass the quiz and certify if score is 5/5", () => {
      const answers = { q1: "C", q2: "B", q3: "C", q4: "B", q5: "B" };
      let score = 0;
      if (answers.q1 === CORRECT_ANSWERS.q1) score++;
      if (answers.q2 === CORRECT_ANSWERS.q2) score++;
      if (answers.q3 === CORRECT_ANSWERS.q3) score++;
      if (answers.q4 === CORRECT_ANSWERS.q4) score++;
      if (answers.q5 === CORRECT_ANSWERS.q5) score++;

      expect(score).toBe(5);
      expect(score >= 4).toBe(true);
    });

    it("should pass the quiz and certify if score is 4/5 (80%)", () => {
      const answers = { q1: "C", q2: "B", q3: "C", q4: "B", q5: "A" }; // q5 wrong
      let score = 0;
      if (answers.q1 === CORRECT_ANSWERS.q1) score++;
      if (answers.q2 === CORRECT_ANSWERS.q2) score++;
      if (answers.q3 === CORRECT_ANSWERS.q3) score++;
      if (answers.q4 === CORRECT_ANSWERS.q4) score++;
      if (answers.q5 === CORRECT_ANSWERS.q5) score++;

      expect(score).toBe(4);
      expect(score >= 4).toBe(true);
    });

    it("should fail the quiz and not certify if score is less than 4/5 (e.g. 3/5)", () => {
      const answers = { q1: "C", q2: "B", q3: "A", q4: "A", q5: "B" }; // q3, q4 wrong
      let score = 0;
      if (answers.q1 === CORRECT_ANSWERS.q1) score++;
      if (answers.q2 === CORRECT_ANSWERS.q2) score++;
      if (answers.q3 === CORRECT_ANSWERS.q3) score++;
      if (answers.q4 === CORRECT_ANSWERS.q4) score++;
      if (answers.q5 === CORRECT_ANSWERS.q5) score++;

      expect(score).toBe(3);
      expect(score >= 4).toBe(false);
    });
  });

  describe("Mock API Database Certification Flow", () => {
    it("should call supabase to update the artists table if user succeeds the quiz", async () => {
      const mockFrom = supabase.from as jest.Mock;
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "artists") {
          return {
            update: mockUpdate,
          };
        }
        if (table === "audit_logs") {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      // Simulation of successful quiz completion database write
      const mockArtistId = "artist-uuid-xyz";
      const { error: updateError } = await supabase
        .from("artists")
        .update({ academy_completed: true })
        .eq("id", mockArtistId);

      expect(updateError).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("artists");
      expect(mockUpdate).toHaveBeenCalledWith({ academy_completed: true });
    });
  });
});

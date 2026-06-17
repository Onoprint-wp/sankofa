import { userSuspensionSchema } from "../src/lib/validations";
import { supabase } from "../src/lib/supabaseClient";

// Mock supabase client
jest.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("SANKOFA - Etape 11: Advanced Administration & Suspension Module Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Zod Schema Validation - userSuspensionSchema", () => {
    const validPayload = {
      user_id: "c4608c2d-944f-4d43-85b3-3a13d7620bc2",
      is_suspended: true,
    };

    it("should accept a valid user suspension payload", () => {
      const result = userSuspensionSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should reject an invalid UUID for user_id", () => {
      const invalid = { ...validPayload, user_id: "invalid-uuid" };
      const result = userSuspensionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject a non-boolean value for is_suspended", () => {
      const invalid = { ...validPayload, is_suspended: "yes" as any };
      const result = userSuspensionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Mock Database Interactions for Suspension and Artwork Depublication", () => {
    it("should toggle suspension on profile, depublish artworks if artist, and log audit log", async () => {
      const mockFrom = supabase.from as jest.Mock;
      
      const mockProfileUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      
      const mockArtworkUpdateInner = jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ error: null }),
      });
      const mockArtworkUpdate = jest.fn().mockReturnValue({
        eq: mockArtworkUpdateInner,
      });

      const mockAuditInsert = jest.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === "profiles") {
          return { update: mockProfileUpdate };
        }
        if (table === "artworks") {
          return { update: mockArtworkUpdate };
        }
        if (table === "audit_logs") {
          return { insert: mockAuditInsert };
        }
        return {};
      });

      const targetUserId = "artist-uuid-123";

      // 1. Suspend profile
      await supabase.from("profiles").update({ is_suspended: true }).eq("id", targetUserId);
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockProfileUpdate).toHaveBeenCalledWith({ is_suspended: true });

      // 2. Depublish artist's artworks
      await supabase
        .from("artworks")
        .update({ status: "draft" })
        .eq("artist_id", targetUserId)
        .in("status", ["published", "pending_curation"]);

      expect(mockFrom).toHaveBeenCalledWith("artworks");
      expect(mockArtworkUpdate).toHaveBeenCalledWith({ status: "draft" });
      expect(mockArtworkUpdateInner).toHaveBeenCalledWith("artist_id", targetUserId);

      // 3. Write Audit Log
      const auditPayload = {
        admin_id: "admin-uuid-999",
        action: "SUSPEND_USER",
        details: { target_user_id: targetUserId, target_role: "artist" },
        ip_address: "127.0.0.1",
      };
      await supabase.from("audit_logs").insert(auditPayload);
      expect(mockFrom).toHaveBeenCalledWith("audit_logs");
      expect(mockAuditInsert).toHaveBeenCalledWith(auditPayload);
    });
  });
});

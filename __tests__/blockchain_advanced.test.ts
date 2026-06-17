import { registerCertificateHash } from "../src/lib/blockchain";
import { supabase } from "../src/lib/supabaseClient";

jest.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("SANKOFA - Blockchain Advanced & Fallback Tests", () => {
  let mockSingleArtwork: any;
  let mockSingleArtistProfile: any;
  let mockSingleOrder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSingleArtwork = {
      id: "artwork-uuid-5678",
      title: "Génie de la brousse",
      artist_id: "artist-uuid-5678",
      price: 180000,
      dimensions: { height: 90, width: 70, depth: 3, weight: 1.8 },
      materials: ["Bronze"],
      category: "Sculpture",
      created_at: "2026-02-01T12:00:00Z",
    };

    mockSingleArtistProfile = {
      id: "artist-uuid-5678",
      first_name: "Ousmane",
      last_name: "Sow",
      email: "ousmane@example.com",
    };

    mockSingleOrder = {
      id: "order-uuid-5678",
      buyer_id: "buyer-uuid-5678",
      artwork_id: "artwork-uuid-5678",
      amount: 180000,
      created_at: "2026-06-16T19:00:00Z",
      buyer: {
        first_name: "Fatou",
        last_name: "Binet",
        email: "fatou@example.com",
      },
    };
  });

  it("should generate deterministic transaction hashes in sandbox mode", async () => {
    const mockFrom = supabase.from as jest.Mock;

    mockFrom.mockImplementation((table: string) => {
      if (table === "artworks") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSingleArtwork, error: null }),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null })
          })),
        };
      }
      if (table === "profiles") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSingleArtistProfile, error: null }),
        };
      }
      if (table === "orders") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSingleOrder, error: null }),
        };
      }
      if (table === "certificates") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          insert: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: "cert-uuid-7777",
              artwork_id: "artwork-uuid-5678",
              order_id: "order-uuid-5678",
              blockchain_tx_hash: "0xMockHash",
            },
            error: null,
          }),
        };
      }
      return {};
    });

    // Run first registration
    const result1 = await registerCertificateHash("artwork-uuid-5678", "order-uuid-5678");
    
    // Reset mock data resolving to same structure
    jest.clearAllMocks();
    
    // Run second registration
    const result2 = await registerCertificateHash("artwork-uuid-5678", "order-uuid-5678");

    // Expect deterministic hash fallbacks to be identical
    expect(result1.txHash).toEqual(result2.txHash);
    expect(result1.metadataHash).toEqual(result2.metadataHash);
  });
});

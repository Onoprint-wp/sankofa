import { registerCertificateHash } from "../src/lib/blockchain";
import { supabase } from "../src/lib/supabaseClient";

jest.mock("../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("SANKOFA - Certificates & Blockchain Module", () => {
  let mockSingleArtwork: any;
  let mockSingleArtistProfile: any;
  let mockSingleOrder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSingleArtwork = {
      id: "artwork-uuid-1234",
      title: "Coucher de soleil sur le Chari",
      artist_id: "artist-uuid-1234",
      price: 250000,
      dimensions: { height: 100, width: 80, depth: 5, weight: 2.5 },
      materials: ["Acrylique sur toile"],
      category: "Peinture",
      created_at: "2026-01-01T12:00:00Z",
    };

    mockSingleArtistProfile = {
      id: "artist-uuid-1234",
      first_name: "Salif",
      last_name: "Keita",
      email: "salif@example.com",
    };

    mockSingleOrder = {
      id: "order-uuid-1234",
      buyer_id: "buyer-uuid-1234",
      artwork_id: "artwork-uuid-1234",
      amount: 250000,
      created_at: "2026-06-16T18:00:00Z",
      buyer: {
        first_name: "Awa",
        last_name: "Diop",
        email: "awa@example.com",
      },
    };
  });

  it("should successfully compute SHA-256 certificate metadata hash and register mock Polygon transaction", async () => {
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
              id: "cert-uuid-9999",
              artwork_id: "artwork-uuid-1234",
              order_id: "order-uuid-1234",
              blockchain_tx_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            },
            error: null,
          }),
        };
      }
      return {};
    });

    const result = await registerCertificateHash("artwork-uuid-1234", "order-uuid-1234");

    // 1. Verify result contains expected metadata
    expect(result).toBeDefined();
    expect(result.metadata.artwork_title).toBe("Coucher de soleil sur le Chari");
    expect(result.metadata.artist_name).toBe("Salif Keita");
    expect(result.metadata.buyer_name).toBe("Awa Diop");
    
    // 2. Verify cryptographically valid transaction hash is generated (0x + 64 hex chars)
    expect(result.txHash).toBeDefined();
    expect(result.txHash.startsWith("0x")).toBe(true);
    expect(result.txHash.length).toBe(66);
    
    // 3. Verify metadata hash is SHA-256 (64 hex characters)
    expect(result.metadataHash).toBeDefined();
    expect(result.metadataHash.length).toBe(64);
  });
});

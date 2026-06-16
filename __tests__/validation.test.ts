import { signUpSchema, artworkSchema } from "../src/lib/validations";

describe("Validation Schemas - SANKOFA", () => {
  describe("Sign Up Schema (signUpSchema)", () => {
    const validBuyer = {
      first_name: "Styve",
      last_name: "Mvondo",
      email: "styve@example.com",
      phone: "+237699000000",
      password: "Password123",
      role: "buyer",
    };

    const validArtist = {
      first_name: "Amina",
      last_name: "Yusuf",
      email: "amina@example.com",
      phone: "+2348030000000",
      password: "Password123",
      role: "artist",
    };

    it("should accept a valid buyer registration", () => {
      const result = signUpSchema.safeParse(validBuyer);
      expect(result.success).toBe(true);
    });

    it("should accept a valid artist registration", () => {
      const result = signUpSchema.safeParse(validArtist);
      expect(result.success).toBe(true);
    });

    it("should reject a registration with an invalid email", () => {
      const invalid = { ...validBuyer, email: "not-an-email" };
      const result = signUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toContain("Adresse email invalide");
      }
    });

    it("should reject a registration with an invalid phone format", () => {
      const invalid = { ...validBuyer, phone: "12345" }; // Too short, no country prefix rules met
      const result = signUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.phone).toContain("Le numéro de téléphone est invalide (ex: +237699000000)");
      }
    });

    it("should reject a registration with a weak password (no capital letter)", () => {
      const invalid = { ...validBuyer, password: "password123" };
      const result = signUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toContain(
          "Le mot de passe doit contenir au moins une lettre majuscule"
        );
      }
    });

    it("should reject a registration with a weak password (no number)", () => {
      const invalid = { ...validBuyer, password: "Password" };
      const result = signUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toContain(
          "Le mot de passe doit contenir au moins un chiffre"
        );
      }
    });

    it("should reject a registration with a short first name", () => {
      const invalid = { ...validBuyer, first_name: "A" };
      const result = signUpSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.first_name).toContain(
          "Le prénom doit contenir au moins 2 caractères"
        );
      }
    });
  });

  describe("Artwork Submission Schema (artworkSchema)", () => {
    const validArtwork = {
      title: "L'Ombre du Baobab",
      description: "Une peinture magnifique représentant la silhouette d'un baobab millénaire au coucher du soleil africain.",
      price: 250000,
      category: "Peinture",
      height: 100,
      width: 80,
      depth: 5,
      weight: 2.5,
      materials: ["Bois", "Acrylique"],
      photos: ["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5"],
      is_rental_available: false,
    };

    it("should accept a valid artwork creation payload", () => {
      const result = artworkSchema.safeParse(validArtwork);
      expect(result.success).toBe(true);
    });

    it("should reject string values for price", () => {
      const artworkWithStringNumbers = {
        ...validArtwork,
        price: "250000",
      };
      const result = artworkSchema.safeParse(artworkWithStringNumbers);
      expect(result.success).toBe(false);
    });

    it("should reject a description that is too short (< 20 chars)", () => {
      const invalid = { ...validArtwork, description: "Trop court" };
      const result = artworkSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.description).toContain(
          "La description doit contenir au moins 20 caractères pour valoriser votre œuvre"
        );
      }
    });

    it("should reject a negative price", () => {
      const invalid = { ...validArtwork, price: -50 };
      const result = artworkSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject an invalid category", () => {
      const invalid = { ...validArtwork, category: "Automobile" };
      const result = artworkSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should enforce conditional rental price when rental option is active", () => {
      const invalidRental = {
        ...validArtwork,
        is_rental_available: true,
        rental_price_per_month: undefined, // Missing rental price
      };

      const result = artworkSchema.safeParse(invalidRental);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.rental_price_per_month).toContain(
          "Le tarif de location mensuel est requis et doit être supérieur à 0 si l'œuvre est disponible à la location"
        );
      }
    });

    it("should accept artwork when rental option is active and rental price is valid", () => {
      const validRental = {
        ...validArtwork,
        is_rental_available: true,
        rental_price_per_month: 15000,
      };

      const result = artworkSchema.safeParse(validRental);
      expect(result.success).toBe(true);
    });
  });
});

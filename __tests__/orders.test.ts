import { shippingAddressSchema, checkoutSchema, litigationSchema } from "../src/lib/validations";

describe("SANKOFA - Orders and Escrow Validation Schemas", () => {
  const validAddress = {
    full_name: "Styve Mvondo",
    phone: "+237699000000",
    address_line: "Rue 1.450, Bastos",
    city: "Yaoundé",
  };

  const validCheckoutCard = {
    artwork_id: "3b221a71-6c24-4f2f-8a4a-718a93e3d64c",
    shipping_address: validAddress,
    payment_method: "card",
  };

  const validCheckoutMM = {
    artwork_id: "59306b9b-c2e3-4708-9df2-bb53d865fe7c",
    shipping_address: validAddress,
    payment_method: "mobile_money",
    mobile_money_provider: "orange",
    mobile_money_phone: "+237677000000",
  };

  describe("Shipping Address Schema (shippingAddressSchema)", () => {
    it("should accept a valid shipping address", () => {
      const result = shippingAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it("should reject a shipping address with a short name", () => {
      const invalid = { ...validAddress, full_name: "S" };
      const result = shippingAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.full_name).toContain("Le nom complet doit contenir au moins 2 caractères");
      }
    });

    it("should reject an invalid phone format", () => {
      const invalid = { ...validAddress, phone: "invalid-phone" };
      const result = shippingAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.phone).toContain("Le numéro de téléphone est invalide (ex: +237699000000)");
      }
    });

    it("should reject a short address line", () => {
      const invalid = { ...validAddress, address_line: "Rue" };
      const result = shippingAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.address_line).toContain("L'adresse doit contenir au moins 5 caractères");
      }
    });

    it("should reject an invalid city choice", () => {
      const invalid = { ...validAddress, city: "Paris" };
      const result = shippingAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Checkout Schema (checkoutSchema)", () => {
    it("should accept card checkout without mobile money options", () => {
      const result = checkoutSchema.safeParse(validCheckoutCard);
      expect(result.success).toBe(true);
    });

    it("should accept mobile money checkout when provider and phone are valid", () => {
      const result = checkoutSchema.safeParse(validCheckoutMM);
      expect(result.success).toBe(true);
    });

    it("should reject mobile money checkout without provider", () => {
      const invalid = {
        artwork_id: "59306b9b-c2e3-4708-9df2-bb53d865fe7c",
        shipping_address: validAddress,
        payment_method: "mobile_money",
        mobile_money_phone: "+237677000000",
      };
      const result = checkoutSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject mobile money checkout with invalid phone format", () => {
      const invalid = {
        ...validCheckoutMM,
        mobile_money_phone: "002376", // too short / incorrect format
      };
      const result = checkoutSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject checkout with an invalid artwork ID", () => {
      const invalid = {
        ...validCheckoutCard,
        artwork_id: "not-a-uuid",
      };
      const result = checkoutSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Litigation Schema (litigationSchema)", () => {
    const validLitigation = {
      order_id: "d58a5e81-cf49-411a-85d7-be2cb62110c7",
      reason: "L'œuvre reçue ne correspond pas aux couleurs des photos présentées sur le catalogue.",
    };

    it("should accept a valid litigation report", () => {
      const result = litigationSchema.safeParse(validLitigation);
      expect(result.success).toBe(true);
    });

    it("should reject a litigation report with a short reason", () => {
      const invalid = {
        ...validLitigation,
        reason: "Court",
      };
      const result = litigationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.reason).toContain("Le motif du litige doit contenir au moins 10 caractères");
      }
    });
  });
});

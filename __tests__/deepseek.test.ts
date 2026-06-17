import { deepseek } from "../src/lib/deepseek";

describe("SANKOFA - Deepseek Client Sandbox Mode", () => {
  describe("Artwork Description Generation", () => {
    it("should generate a premium artwork description in sandbox mode", async () => {
      const title = "Aurore sur le fleuve Niger";
      const category = "Peinture";
      const materials = ["Toile", "Acrylique", "Feuille d'or"];

      const description = await deepseek.generateArtworkDescription(title, category, materials);

      expect(description).toBeDefined();
      expect(description).toContain(title);
      expect(description).toContain(category);
      expect(description).toContain("Toile, Acrylique, Feuille d'or");
      expect(description).toContain("africaines");
    });
  });

  describe("Support Chatbot policy answers", () => {
    it("should respond to delivery queries with standard fees (5000 / 15000 FCFA)", async () => {
      const response = await deepseek.chatWithSupport([
        { role: "user", content: "Quels sont les frais de livraison pour Yaoundé ?" }
      ]);
      expect(response).toContain("5 000 FCFA");
      expect(response).toContain("Yaoundé");
    });

    it("should respond to escrow queries explaining the 48h guarantee", async () => {
      const response = await deepseek.chatWithSupport([
        { role: "user", content: "Comment marche la garantie de séquestre ?" }
      ]);
      expect(response.toLowerCase()).toContain("séquestre");
      expect(response).toContain("bloqué");
    });

    it("should respond to rental queries explaining rent deduction option", async () => {
      const response = await deepseek.chatWithSupport([
        { role: "user", content: "Puis-je louer une œuvre avant de l'acheter ?" }
      ]);
      expect(response).toContain("location");
      expect(response).toContain("déduite");
    });
  });

  describe("Content Moderation", () => {
    it("should flag inappropriate content containing banned words", async () => {
      const text = "Cette œuvre est une grosse arnaque de merde.";
      const result = await deepseek.moderateContent(text);
      expect(result.isFlagged).toBe(true);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("merde");
    });

    it("should not flag clean, positive content", async () => {
      const text = "Une peinture magnifique représentant la culture mandingue.";
      const result = await deepseek.moderateContent(text);
      expect(result.isFlagged).toBe(false);
      expect(result.reason).toBeUndefined();
    });
  });
});

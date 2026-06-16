import { z } from "zod";

// Phone validation regex (E.164 format: e.g., +237699999999 or +33612345678)
const phoneRegex = /^\+?[1-9]\d{7,14}$/;

// 1. User Sign Up Schema (Buyer or Artist)
export const signUpSchema = z.object({
  first_name: z
    .string()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(50, "Le prénom est trop long"),
  last_name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom est trop long"),
  email: z
    .string()
    .email("Adresse email invalide")
    .min(5, "L'email est requis"),
  phone: z
    .string()
    .regex(phoneRegex, "Le numéro de téléphone est invalide (ex: +237699000000)"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  role: z.enum(["buyer", "artist"], {
    message: "Le rôle est requis",
  }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// 2. Artist KYC Verification Schema (Upload file references)
export const kycSchema = z.object({
  cni_url: z.string().url("Le document CNI doit être un lien valide"),
  selfie_url: z.string().url("Le selfie doit être un lien valide"),
});

export type KycInput = z.infer<typeof kycSchema>;

// 3. Artwork Creation Schema
export const artworkSchema = z
  .object({
    title: z
      .string()
      .min(3, "Le titre doit contenir au moins 3 caractères")
      .max(100, "Le titre ne doit pas dépasser 100 caractères"),
    description: z
      .string()
      .min(20, "La description doit contenir au moins 20 caractères pour valoriser votre œuvre")
      .max(2000, "La description ne doit pas dépasser 2000 caractères"),
    price: z
      .number({ message: "Le prix de vente doit être un nombre" })
      .positive("Le prix de vente doit être supérieur à 0"),
    category: z.enum(["Peinture", "Sculpture", "Art Numérique", "Photographie", "Autre"], {
      message: "Catégorie d'art invalide",
    }),
    height: z
      .number({ message: "La hauteur doit être un nombre" })
      .positive("La hauteur doit être supérieure à 0"),
    width: z
      .number({ message: "La largeur doit être un nombre" })
      .positive("La largeur doit être supérieure à 0"),
    depth: z
      .number({ message: "La profondeur doit être un nombre" })
      .nonnegative("La profondeur doit être positive ou nulle")
      .optional(),
    weight: z
      .number({ message: "Le poids doit être un nombre" })
      .positive("Le poids doit être supérieur à 0"),
    materials: z
      .array(z.string().min(1, "Nom du matériau invalide"))
      .min(1, "Veuillez spécifier au moins un matériau"),
    photos: z
      .array(z.string().url("Lien photo invalide"))
      .min(1, "Veuillez ajouter au moins une photo de l'œuvre"),
    is_rental_available: z.boolean(),
    rental_price_per_month: z
      .number({ message: "Le loyer doit être un nombre" })
      .positive("Le loyer doit être supérieur à 0")
      .optional(),
  })
  .refine(
    (data) => {
      // If rental is available, monthly rental price is mandatory and must be > 0
      if (data.is_rental_available) {
        return (
          data.rental_price_per_month !== undefined &&
          data.rental_price_per_month > 0
        );
      }
      return true;
    },
    {
      message: "Le tarif de location mensuel est requis et doit être supérieur à 0 si l'œuvre est disponible à la location",
      path: ["rental_price_per_month"],
    }
  );

export type ArtworkInput = z.infer<typeof artworkSchema>;

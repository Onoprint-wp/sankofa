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
  cni_url: z.string().min(1, "Le document CNI est requis"),
  selfie_url: z.string().min(1, "Le selfie est requis"),
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

// 4. KYC Document Review Schema (Admin)
export const kycReviewSchema = z
  .object({
    artist_id: z.string().uuid("ID de l’artiste invalide"),
    status: z.enum(["approved", "rejected"], {
      message: "Le statut de vérification doit être 'approved' ou 'rejected'",
    }),
    rejection_reason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "rejected") {
        return data.rejection_reason !== undefined && data.rejection_reason.trim().length >= 5;
      }
      return true;
    },
    {
      message: "Le motif de rejet est requis et doit faire au moins 5 caractères en cas de refus",
      path: ["rejection_reason"],
    }
  );

export type KycReviewInput = z.infer<typeof kycReviewSchema>;

// 5. Artwork Curation Review Schema (Admin/Curator)
export const artworkReviewSchema = z
  .object({
    artwork_id: z.string().uuid("ID de l’œuvre invalide"),
    status: z.enum(["published", "refused"], {
      message: "Le statut de curation doit être 'published' ou 'refused'",
    }),
    rejection_reason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "refused") {
        return data.rejection_reason !== undefined && data.rejection_reason.trim().length >= 5;
      }
      return true;
    },
    {
      message: "Le motif de refus est requis et doit faire au moins 5 caractères en cas de rejet",
      path: ["rejection_reason"],
    }
  );

export type ArtworkReviewInput = z.infer<typeof artworkReviewSchema>;

// 6. Shipping Address Schema
export const shippingAddressSchema = z.object({
  full_name: z
    .string()
    .min(2, "Le nom complet doit contenir au moins 2 caractères")
    .max(100, "Le nom complet est trop long"),
  phone: z
    .string()
    .regex(phoneRegex, "Le numéro de téléphone est invalide (ex: +237699000000)"),
  address_line: z
    .string()
    .min(5, "L'adresse doit contenir au moins 5 caractères")
    .max(200, "L'adresse est trop longue"),
  city: z.enum(["Douala", "Yaoundé", "Autre"], {
    message: "La ville de livraison doit être Douala, Yaoundé ou Autre",
  }),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

// 7. Checkout Schema
export const checkoutSchema = z
  .object({
    artwork_id: z.string().uuid("ID de l’œuvre invalide"),
    shipping_address: shippingAddressSchema,
    payment_method: z.enum(["mobile_money", "card"], {
      message: "Le moyen de paiement doit être 'mobile_money' ou 'card'",
    }),
    mobile_money_provider: z.enum(["orange", "mtn", "moov", "airtel"]).optional(),
    mobile_money_phone: z.string().optional(),
    exhibition_id: z.string().uuid("ID de l’exposition invalide").optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.payment_method === "mobile_money") {
        return data.mobile_money_provider !== undefined;
      }
      return true;
    },
    {
      message: "L'opérateur Mobile Money est requis pour ce mode de paiement",
      path: ["mobile_money_provider"],
    }
  )
  .refine(
    (data) => {
      if (data.payment_method === "mobile_money") {
        return data.mobile_money_phone !== undefined && phoneRegex.test(data.mobile_money_phone);
      }
      return true;
    },
    {
      message: "Un numéro de téléphone Mobile Money valide est requis",
      path: ["mobile_money_phone"],
    }
  );

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// 8. Litigation Schema
export const litigationSchema = z.object({
  order_id: z.string().uuid("ID de la commande invalide"),
  reason: z
    .string()
    .min(10, "Le motif du litige doit contenir au moins 10 caractères")
    .max(1000, "Le motif ne doit pas dépasser 1000 caractères"),
});

export type LitigationInput = z.infer<typeof litigationSchema>;

// 9. Academy Quiz Schema
export const academyQuizSchema = z.object({
  q1: z.enum(["A", "B", "C", "D"], { message: "La réponse 1 est obligatoire" }),
  q2: z.enum(["A", "B", "C", "D"], { message: "La réponse 2 est obligatoire" }),
  q3: z.enum(["A", "B", "C", "D"], { message: "La réponse 3 est obligatoire" }),
  q4: z.enum(["A", "B", "C", "D"], { message: "La réponse 4 est obligatoire" }),
  q5: z.enum(["A", "B", "C", "D"], { message: "La réponse 5 est obligatoire" }),
});

export type AcademyQuizInput = z.infer<typeof academyQuizSchema>;

// 10. Review Submission Schema
export const reviewSchema = z.object({
  order_id: z.string().uuid("ID de la commande invalide"),
  rating: z
    .number()
    .int()
    .min(1, "La note doit être comprise entre 1 et 5")
    .max(5, "La note doit être comprise entre 1 et 5"),
  comment: z
    .string()
    .max(1000, "Le commentaire ne doit pas dépasser 1000 caractères")
    .optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

// 11. Review Moderation Schema (Admin)
export const reviewModerationSchema = z.object({
  review_id: z.string().uuid("ID de l’avis invalide"),
  action: z.enum(["approve", "reject"], {
    message: "L’action de modération doit être 'approve' ou 'reject'",
  }),
});

export type ReviewModerationInput = z.infer<typeof reviewModerationSchema>;

// 12. Exhibition Creation Schema
export const exhibitionSchema = z.object({
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(100, "Le titre ne doit pas dépasser 100 caractères"),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(2000, "La description ne doit pas dépasser 2000 caractères"),
  cover_url: z
    .string()
    .url("Le lien de la photo de couverture est invalide"),
  artwork_ids: z
    .array(z.string().uuid("ID de l’œuvre invalide"))
    .min(1, "Veuillez sélectionner au moins une œuvre d’art pour l’exposition"),
});

export type ExhibitionInput = z.infer<typeof exhibitionSchema>;

// 13. Carrier Update Schema
export const carrierUpdateSchema = z.object({
  tracking_number: z.string().min(3, "Le numéro de suivi est requis"),
  status: z.enum(["pending", "shipped", "delivered", "disputed", "returned"]),
  location: z.string().min(2, "La localisation est requise"),
  description: z.string().min(5, "La description doit contenir au moins 5 caractères"),
});

export type CarrierUpdateInput = z.infer<typeof carrierUpdateSchema>;

// 14. User Suspension Schema (Admin)
export const userSuspensionSchema = z.object({
  user_id: z.string().uuid("ID de l’utilisateur invalide"),
  is_suspended: z.boolean({ message: "Le statut de suspension est obligatoire" }),
});

export type UserSuspensionInput = z.infer<typeof userSuspensionSchema>;




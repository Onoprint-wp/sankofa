import { NextResponse } from "next/server";
import { artworkSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body against artworkSchema
    const parseResult = artworkSchema.safeParse(body);
    
    if (!parseResult.success) {
      // Extract and format validation errors
      const formattedErrors = parseResult.error.flatten().fieldErrors;
      return NextResponse.json(
        { 
          success: false, 
          message: "Erreur de validation de l'œuvre", 
          errors: formattedErrors 
        },
        { status: 400 }
      );
    }

    const artworkData = parseResult.data;

    // Simulate saving to database
    // In actual production code, you would call:
    // const { data, error } = await supabase.from('artworks').insert([artworkData])
    
    return NextResponse.json(
      {
        success: true,
        message: `L'œuvre "${artworkData.title}" a été créée avec succès et est en attente de validation curatoriale.`,
        artwork: {
          ...artworkData,
          id: "simulated-uuid-12345",
          status: "pending_curation",
          created_at: new Date().toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur lors de la création de l'œuvre" },
      { status: 500 }
    );
  }
}

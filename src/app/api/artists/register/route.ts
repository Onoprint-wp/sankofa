import { NextResponse } from "next/server";
import { signUpSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body against signUpSchema
    const parseResult = signUpSchema.safeParse(body);
    
    if (!parseResult.success) {
      // Extract and format validation errors
      const formattedErrors = parseResult.error.flatten().fieldErrors;
      return NextResponse.json(
        { 
          success: false, 
          message: "Erreur de validation des données", 
          errors: formattedErrors 
        },
        { status: 400 }
      );
    }

    const { first_name, last_name, email, phone, role } = parseResult.data;

    // Simulate saving to database (auth sign up + database triggers)
    // In actual production code, you would call:
    // const { data, error } = await supabase.auth.signUp(...)
    
    return NextResponse.json(
      {
        success: true,
        message: `Inscription de l'artiste ${first_name} ${last_name} réussie. Un code OTP a été envoyé à ${phone}.`,
        user: { first_name, last_name, email, phone, role }
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur lors de l'inscription" },
      { status: 500 }
    );
  }
}

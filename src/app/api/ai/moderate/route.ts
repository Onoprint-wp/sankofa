import { NextResponse } from "next/server";
import { deepseek } from "@/lib/deepseek";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Le texte est requis pour la modération." },
        { status: 400 }
      );
    }

    const result = await deepseek.moderateContent(text);

    return NextResponse.json({
      success: true,
      isFlagged: result.isFlagged,
      reason: result.reason || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Erreur lors de la modération." },
      { status: 500 }
    );
  }
}

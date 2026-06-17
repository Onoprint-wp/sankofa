import { NextResponse } from "next/server";
import { deepseek } from "@/lib/deepseek";

export async function POST(request: Request) {
  try {
    const { title, category, materials } = await request.json();

    if (!title || !category) {
      return NextResponse.json(
        { success: false, message: "Le titre et la catégorie sont requis." },
        { status: 400 }
      );
    }

    const description = await deepseek.generateArtworkDescription(
      title,
      category,
      materials || []
    );

    return NextResponse.json({
      success: true,
      description,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Erreur lors de la génération de la description." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { deepseek } from "@/lib/deepseek";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, message: "Le tableau de messages est requis." },
        { status: 400 }
      );
    }

    const responseText = await deepseek.chatWithSupport(messages);

    return NextResponse.json({
      success: true,
      response: responseText,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Erreur de communication avec le chatbot." },
      { status: 500 }
    );
  }
}

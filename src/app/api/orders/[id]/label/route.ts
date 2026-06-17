import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    // 1. Authenticate user from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Token absent." },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Session invalide." },
        { status: 401 }
      );
    }

    // 2. Fetch order with artwork details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, artworks(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: "Commande introuvable." },
        { status: 404 }
      );
    }

    const artwork = order.artworks;
    if (!artwork) {
      return NextResponse.json(
        { success: false, message: "Œuvre d’art introuvable." },
        { status: 404 }
      );
    }

    // 3. Authorize: check if user is the artist who created the artwork OR an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.id)
      .single();

    if (profile?.is_suspended) {
      return NextResponse.json(
        { success: false, message: "Votre compte a été suspendu par l’administrateur." },
        { status: 403 }
      );
    }

    const isAdmin = profile?.role === "admin";
    const isArtist = artwork.artist_id === user.id;

    if (!isArtist && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Accès interdit. Vous n’êtes pas le créateur de cette œuvre." },
        { status: 403 }
      );
    }

    // 4. Fetch Artist details (from profiles & artists table)
    const { data: artistProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", artwork.artist_id)
      .single();

    const { data: artist } = await supabase
      .from("artists")
      .select("*")
      .eq("id", artwork.artist_id)
      .single();

    // 5. Extract variables and fallback
    const buyerAddress = order.shipping_address || {};
    const buyerName = buyerAddress.full_name || "N/A";
    const buyerPhone = buyerAddress.phone || "N/A";
    const buyerAddressLine = buyerAddress.address_line || "N/A";
    const buyerCity = buyerAddress.city || "N/A";

    const artistName = artistProfile ? `${artistProfile.first_name || ""} ${artistProfile.last_name || ""}`.trim() : "Artiste Sankofa";
    const artistPhone = artistProfile?.phone || "N/A";
    const artistCity = artist?.city || "Douala";
    const artistCountry = artist?.country || "Cameroun";

    const carrier = buyerAddress.carrier || "SANKOFA Express";
    const trackingNumber = buyerAddress.tracking_number || "SKF-PENDING";

    // Escape parenthesis for PDF string safety
    const escapePDF = (str: string) => {
      return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    };

    const escBuyerName = escapePDF(buyerName);
    const escBuyerPhone = escapePDF(buyerPhone);
    const escBuyerAddress = escapePDF(buyerAddressLine);
    const escBuyerCity = escapePDF(buyerCity);

    const escArtistName = escapePDF(artistName);
    const escArtistPhone = escapePDF(artistPhone);
    const escArtistCity = escapePDF(`${artistCity}, ${artistCountry}`);

    const escCarrier = escapePDF(carrier);
    const escTrackingNumber = escapePDF(trackingNumber);
    const escArtworkTitle = escapePDF(artwork.title || "Artwork");

    // 6. Generate barcode drawing commands
    let barcodeCommands = "";
    const patternStr = trackingNumber + "12345678";
    let x = 40;
    for (let i = 0; i < Math.min(patternStr.length, 15); i++) {
      const charCode = patternStr.charCodeAt(i);
      for (let bit = 0; bit < 8; bit++) {
        const isBlack = (charCode & (1 << bit)) !== 0;
        const width = isBlack ? 3 : 1;
        barcodeCommands += `${x} 60 ${width} 50 re f\n`;
        x += width + 2;
      }
    }

    // 7. Assemble PDF binary data
    const streamContent = `
10 10 380 580 re S
10 490 m 390 490 l S
10 330 m 390 330 l S
10 170 m 390 170 l S

BT
/F1 16 Tf
30 550 Td
(SANKOFA SHIPPING LABEL) Tj
ET

BT
/F2 9 Tf
30 530 Td
(INTEGRATED LOGISTICS SYSTEM - WEB APP MVP) Tj
ET

BT
/F2 8 Tf
30 510 Td
(Date: ${new Date().toLocaleDateString("fr-FR")}) Tj
ET

BT
/F1 12 Tf
30 460 Td
(FROM:) Tj
ET
BT
/F2 10 Tf
30 440 Td
(${escArtistName}) Tj
ET
BT
/F2 10 Tf
30 420 Td
(Phone: ${escArtistPhone}) Tj
ET
BT
/F2 10 Tf
30 400 Td
(Address: ${escArtistCity}) Tj
ET

BT
/F1 14 Tf
30 290 Td
(TO:) Tj
ET
BT
/F2 11 Tf
30 270 Td
(${escBuyerName}) Tj
ET
BT
/F2 11 Tf
30 250 Td
(Phone: ${escBuyerPhone}) Tj
ET
BT
/F2 11 Tf
30 230 Td
(Address: ${escBuyerAddress}) Tj
ET
BT
/F2 11 Tf
30 210 Td
(City: ${escBuyerCity}) Tj
ET

BT
/F1 11 Tf
30 145 Td
(CARRIER: ${escCarrier}) Tj
ET
BT
/F1 11 Tf
30 130 Td
(TRACKING #: ${escTrackingNumber}) Tj
ET
BT
/F2 8 Tf
30 115 Td
(Content: ${escArtworkTitle}) Tj
ET

${barcodeCommands}
`;

    const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /MediaBox [0 0 400 600] /Contents 5 0 R >>\nendobj\n`;
    const obj4 = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;
    const obj6 = `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

    const streamHeader = `5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n`;
    const streamFooter = `\nendstream\nendobj\n`;
    const obj5 = streamHeader + streamContent.trim() + streamFooter;

    const header = `%PDF-1.4\n`;
    const body = obj1 + obj2 + obj3 + obj4 + obj6 + obj5;
    const pdfData = header + body + `xref\n0 7\n0000000000 65535 f\n` + `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${(header + body).length}\n%%EOF\n`;

    const buffer = Buffer.from(pdfData, "binary");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="shipping_label_${orderId}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

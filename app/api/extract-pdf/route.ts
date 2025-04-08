import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("🔍 Iniciando procesamiento de PDF");
  try {
    console.log("🔍 Obteniendo formData");
    const formData = await req.formData();
    console.log("🔍 Obteniendo archivo PDF del formData");
    const pdfFile = formData.get("pdf") as File;

    if (!pdfFile) {
      console.log("❌ No se proporcionó archivo PDF");
      return NextResponse.json(
        { error: "No se ha proporcionado un archivo PDF" },
        { status: 400 }
      );
    }

    console.log(
      `🔍 Archivo recibido: ${pdfFile.name}, tamaño: ${pdfFile.size} bytes, tipo: ${pdfFile.type}`
    );

    // Convertir el archivo a un ArrayBuffer
    console.log("🔍 Convirtiendo a ArrayBuffer");
    const arrayBuffer = await pdfFile.arrayBuffer();
    console.log(
      `🔍 ArrayBuffer creado, tamaño: ${arrayBuffer.byteLength} bytes`
    );

    try {
      // Usar pdf-parse para extraer el texto
      console.log("🔍 Extrayendo texto con pdf-parse");
      const data = await pdfParse(Buffer.from(arrayBuffer));
      const text = data.text;

      console.log("✅ Extracción completada");
      console.log(
        `🔍 Texto extraído (primeros 100 caracteres): ${text.substring(
          0,
          100
        )}...`
      );

      return NextResponse.json({ text });
    } catch (parseError) {
      console.error("❌ Error al extraer texto con pdf-parse:", parseError);
      return NextResponse.json(
        {
          error:
            "No se pudo extraer el texto del PDF. Asegúrate de que es un PDF válido.",
        },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error("❌ Error general al procesar el PDF:", error);
    return NextResponse.json(
      { error: "Error al procesar el PDF" },
      { status: 500 }
    );
  }
}

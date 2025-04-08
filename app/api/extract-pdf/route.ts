import { exec } from "child_process";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

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

    // Crear un archivo temporal
    const tempFileName = `temp-${randomUUID()}.pdf`;
    const tempFilePath = join("/tmp", tempFileName);
    console.log(`🔍 Guardando archivo temporal en ${tempFilePath}`);
    await writeFile(tempFilePath, new Uint8Array(arrayBuffer));

    // Extraer texto usando pdftotext (si está disponible en el sistema)
    console.log("🔍 Intentando extraer texto con método alternativo");

    try {
      const text = await new Promise<string>((resolve, reject) => {
        // Intentar usar pdftotext si está disponible
        exec(
          `pdftotext -layout "${tempFilePath}" -`,
          (error, stdout, stderr) => {
            if (error) {
              console.log("❌ Error al ejecutar pdftotext:", error);
              reject(new Error("No se pudo extraer el texto del PDF"));
              return;
            }
            resolve(stdout);
          }
        );
      });

      console.log("✅ Extracción completada");
      console.log(
        `🔍 Texto extraído (primeros 100 caracteres): ${text.substring(
          0,
          100
        )}...`
      );

      return NextResponse.json({ text });
    } catch (execError) {
      console.error("❌ Error al extraer texto:", execError);
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

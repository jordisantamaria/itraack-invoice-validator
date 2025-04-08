import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { NextRequest, NextResponse } from "next/server";

// Nombre del bucket S3
const S3_BUCKET_NAME = "itraack-invoice-api-invoicebucket-pmw3pdqs01qn";
const S3_REGION = "eu-south-2";

// Credenciales de AWS (usar variables de entorno en producción)
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || "";
const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

export async function POST(request: NextRequest) {
  try {
    // Verificar que la solicitud sea multipart/form-data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Verificar que el archivo sea un PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "El archivo debe ser un PDF" },
        { status: 400 }
      );
    }

    // Crear cliente S3
    const s3Client = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    });

    // Generar un nombre único para el archivo en S3
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const s3Key = `uploads/${timestamp}-${randomString}-${file.name}`;

    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir archivo a S3
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
      },
    });

    // Esperar a que se complete la subida
    await upload.done();

    // Devolver la clave S3
    return NextResponse.json({ s3Key });
  } catch (error) {
    console.error("Error al subir archivo:", error);
    return NextResponse.json(
      { error: "Error al subir el archivo" },
      { status: 500 }
    );
  }
}

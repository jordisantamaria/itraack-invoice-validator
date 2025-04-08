"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Upload } from "lucide-react";
import { useState } from "react";

// Definimos la interfaz para los datos de la factura
interface InvoiceData {
  numeroFactura: string;
  fecha: string;
  cliente: string;
  importeTotal: number;
  moneda: string;
  expediciones: {
    expedicion: string;
    fecha: string;
    remitente: string;
    destinatario: string;
    bultos: number;
    peso: number;
    volumen: number;
  }[];
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [facturaData, setFacturaData] = useState<InvoiceData | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setFacturaData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un archivo PDF",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== "application/pdf") {
      toast({
        title: "Error",
        description: "El archivo debe ser un PDF",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Crear un FormData para enviar el archivo
      const formData = new FormData();
      formData.append("pdf", file);

      // Enviar el archivo al servidor
      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al procesar el PDF");
      }

      const data = await response.json();
      setResult(data.text);

      // Ahora procesamos el texto para extraer los datos estructurados
      const invoiceResponse = await fetch("/api/extract-invoice-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.text,
        }),
      });

      if (!invoiceResponse.ok) {
        throw new Error("Error al extraer los datos de la factura");
      }

      const invoiceData = await invoiceResponse.json();
      setFacturaData(invoiceData);

      toast({
        title: "Éxito",
        description: "Factura procesada correctamente",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar el PDF",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Itraack Invoice Processor</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Procesador de Facturas</CardTitle>
              <CardDescription>
                Sube un PDF de una factura para extraer su información y datos
                estructurados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pdf">Archivo PDF</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="pdf"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !file}>
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>Procesando...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Procesar
                        </>
                      )}
                    </Button>
                  </div>
                  {file && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {file.name}
                    </p>
                  )}
                </div>
              </form>

              {facturaData && (
                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    Datos extraídos de la factura (JSON):
                  </h3>
                  <div className="p-4 bg-muted rounded-lg max-h-[500px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(facturaData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {result && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Contenido extraído:
                  </h3>
                  <div className="p-4 bg-muted rounded-lg max-h-[300px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{result}</pre>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                Soporta archivos PDF de facturas estándar
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}

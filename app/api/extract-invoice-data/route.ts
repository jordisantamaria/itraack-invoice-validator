import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

// Definimos el runtime como edge para mejor rendimiento
export const runtime = "edge";

// Prompt especializado para extracción de datos de facturas
const invoiceSystemPrompt = `
Eres un asistente especializado en extraer información de facturas en formato PDF.
Tu tarea es analizar el texto de la factura y extraer los datos clave en un formato JSON estructurado.

Debes seguir estas reglas estrictamente:
1. Extrae SOLO los datos solicitados
2. Devuelve ÚNICAMENTE un objeto JSON válido, sin explicaciones adicionales
3. Si no puedes encontrar un valor específico, usa null para ese campo
4. Asegúrate de que los tipos de datos sean correctos (números para importes, strings para texto)
5. Para los campos de fecha, usa el formato DD/MM/YYYY
6. Si el PDF contiene múltiples facturas (identificables por tener el mismo número de factura pero diferentes páginas), 
   combina todas las expediciones en una sola factura
7. Incluye TODAS las expediciones que encuentres en el documento, sin límite

Ejemplo de factura con múltiples expediciones:
---
SCHENKER LOGISTICS, S.A.U.
43120 Constanti (Tarragona) - Pol.Ind. Constanti C/Francia, 10
Tel: 977270200 Fax: 977524043 email: atencioncliente.land2@dbschenker.com;
C.I.F. A08363541
   ** FACTURA **

                                                                                  WANZL EQUIPAMIENTO COMERCIAL S.L.
 Factura Nº:             Fecha:            Cliente:         Página:               AVENIDA VIA AUGUSTA 85-87 3AB
 F43289956               29/11/2024          375986        1/2                    08174 SANT CUGAT DEL VALLES
                                                                                  BARCELONA
       Cond.Pago: 30 DIAS PAGO DIA 10

                                                                                  C.I.F. ES B61604807

                                                                                                                                          NACIONAL
 Expedición Fecha Su referencia       Remitente o Destinatario                         Bultos Peso Volumen     Portes          Reexp.   Seguro    Otros

 43/4262436/4 15/11 853581913736072 D JISO ILUMINACION, S. 46940 MANISES                  2     340    2,880     54,01                            23,57
 43/4280450/4 15/11 853562453718029 D LUPA 192             26002 LOGRONO                  1     100    0,640     29,16                             8,06
 ...
---

Ejemplo de respuesta esperada:
{
  "numeroFactura": "F43289956",
  "fecha": "29/11/2024",
  "cliente": "375986",
  "importeTotal": 2980.07,
  "moneda": "EUR",
  "expediciones": [
    {
      "expedicion": "43/4262436/4",
      "fecha": "15/11/2024",
      "remitente": null,
      "destinatario": "JISO ILUMINACION, S.",
      "bultos": 2,
      "peso": 340,
      "volumen": 2.880
    },
    {
      "expedicion": "43/4280450/4",
      "fecha": "15/11/2024",
      "remitente": null,
      "destinatario": "LUPA 192",
      "bultos": 1,
      "peso": 100,
      "volumen": 0.640
    },
    ... (todas las expediciones)
  ]
}
`;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "No se ha proporcionado el texto de la factura" },
        { status: 400 }
      );
    }

    // Llamada a la API de OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.1, // Temperatura baja para respuestas más precisas
      messages: [
        { role: "system", content: invoiceSystemPrompt },
        { role: "user", content: text },
      ],
    });

    // Extraer la respuesta
    const content = response.choices[0].message.content;

    try {
      // Intentar parsear el JSON
      const jsonData = JSON.parse(content || "{}");
      return NextResponse.json(jsonData);
    } catch (parseError) {
      console.error("Error al parsear la respuesta JSON:", parseError);
      return NextResponse.json(
        {
          error: "Error al parsear los datos de la factura",
          rawContent: content,
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error("Error al procesar la factura:", error);

    let errorMessage = "Error al procesar la factura";
    if (error.status === 429) {
      errorMessage = "Rate limit exceeded or quota depleted on OpenAI API";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

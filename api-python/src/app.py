import json
import base64
import logging
import os
import sys
import boto3
from utils.pdf_extractor import extract_text_from_pdf
from utils.openai_client import extract_invoice_data
from dotenv import load_dotenv
import time
import random

# Cargar variables de entorno
load_dotenv()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Inicializar cliente S3
s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('BUCKET_NAME')

def lambda_handler(event, context):
    """
    Función handler para AWS Lambda.
    Maneja solicitudes para procesar facturas.
    """
    logger.info("Recibiendo solicitud Lambda")
    
    # Manejar solicitudes OPTIONS (preflight CORS)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Max-Age': '86400'  # 24 horas en segundos
            },
            'body': ''
        }
    
    # Procesar la factura
    return handle_invoice_processing(event)

def handle_invoice_processing(event):
    """
    Maneja solicitudes para procesar facturas
    """
    try:
        # Verificar si la API key de OpenAI está configurada
        if not os.environ.get('OPENAI_API_KEY'):
            logger.error("OPENAI_API_KEY no está configurada")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'OPENAI_API_KEY no está configurada en el servidor'
                })
            }
        
        # Registrar el evento para depuración
        logger.info(f"Evento recibido: {json.dumps(event, default=str)}")
        
        # Obtener el cuerpo de la solicitud
        if 'body' not in event:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'No se proporcionó el cuerpo de la solicitud'
                })
            }
        
        # Parsear el cuerpo JSON
        body = event['body']
        if isinstance(body, str):
            body = json.loads(body)
        else:
            # Si está codificado en base64, decodificar y parsear
            is_base64_encoded = event.get('isBase64Encoded', False)
            if is_base64_encoded:
                body = json.loads(base64.b64decode(body).decode('utf-8'))
        
        # Obtener la clave S3 del cuerpo
        if 's3Key' not in body:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'No se proporcionó la clave S3 del archivo'
                })
            }
        
        s3_key = body['s3Key']
        logger.info(f"Procesando archivo S3: {s3_key}")
        
        # Descargar el archivo de S3
        try:
            response = s3_client.get_object(Bucket=BUCKET_NAME, Key=s3_key)
            pdf_bytes = response['Body'].read()
            logger.info(f"Archivo descargado de S3, tamaño: {len(pdf_bytes)} bytes")
        except Exception as e:
            logger.error(f"Error al descargar archivo de S3: {str(e)}")
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': f'No se pudo descargar el archivo de S3: {str(e)}'
                })
            }
        
        # Extraer texto del PDF
        logger.info("Extrayendo texto del PDF")
        pdf_text = extract_text_from_pdf(pdf_bytes)
        
        if not pdf_text:
            logger.error("No se pudo extraer texto del PDF")
            return {
                'statusCode': 422,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'No se pudo extraer texto del PDF'
                })
            }
        
        # Analizar la factura con OpenAI
        logger.info("Analizando factura con OpenAI")
        invoice_data = extract_invoice_data(pdf_text)
        
        # Devolver los resultados
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'text': pdf_text,
                'invoice': invoice_data
            })
        }
        
    except Exception as e:
        logger.error(f"Error en el procesamiento: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'Error interno del servidor: {str(e)}'
            })
        }

# Código para ejecución local (solo se ejecuta si se llama directamente)
if __name__ == "__main__":
    # Configuración para pruebas locales
    test_event = {
        'body': json.dumps({
            's3Key': 'uploads/1744151197067-q7o8tbb0-shenker0.pdf'  # Clave de prueba
        })
    }
    
    # Verificar si la API key de OpenAI está configurada
    if not os.environ.get('OPENAI_API_KEY'):
        print("ERROR: OPENAI_API_KEY no está configurada. Configure esta variable de entorno antes de usar la aplicación.")
        sys.exit(1)
    
    # Verificar si se proporcionó un archivo PDF como argumento
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        if os.path.exists(pdf_path):
            print(f"\nProcesando archivo local: {pdf_path}\n")
            
            # Leer el archivo PDF
            with open(pdf_path, 'rb') as file:
                pdf_bytes = file.read()
            
            # Extraer texto del PDF
            pdf_text = extract_text_from_pdf(pdf_bytes)
            
            if pdf_text:
                # Analizar la factura con OpenAI
                invoice_data = extract_invoice_data(pdf_text)
                
                print("\n===== TEXTO EXTRAÍDO =====\n")
                print(pdf_text[:500] + "..." if len(pdf_text) > 500 else pdf_text)
                
                print("\n===== DATOS DE LA FACTURA =====\n")
                print(json.dumps(invoice_data, indent=2, ensure_ascii=False))
            else:
                print("No se pudo extraer texto del PDF")
        else:
            print(f"El archivo {pdf_path} no existe")
    else:
        # Llamar al lambda_handler con el evento de prueba
        result = lambda_handler(test_event, None)
        
        # Mostrar los resultados
        print("\n===== RESPUESTA DEL LAMBDA HANDLER =====\n")
        print(f"Status Code: {result['statusCode']}")
        print("\nHeaders:")
        for key, value in result['headers'].items():
            print(f"  {key}: {value}")
        
        print("\nBody:")
        print(result['body'])

import os
import json
import logging
from openai import OpenAI
from prompts.invoice_prompt import INVOICE_SYSTEM_PROMPT
from dotenv import load_dotenv

# Cargar variables de entorno desde .env si existe
load_dotenv()

logger = logging.getLogger(__name__)

# Inicializar el cliente de OpenAI con configuración mínima
api_key = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

def extract_invoice_data(text):
    """
    Utiliza la API de OpenAI para extraer datos estructurados de una factura.
    
    Args:
        text (str): Texto extraído del PDF de la factura
        
    Returns:
        dict: Datos estructurados de la factura
    """
    if not text:
        logger.error("No se proporcionó texto para analizar")
        return None
    
    try:
        logger.info("Llamando a la API de OpenAI")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            temperature=0.1,  # Temperatura baja para respuestas más precisas
            messages=[
                {"role": "system", "content": INVOICE_SYSTEM_PROMPT},
                {"role": "user", "content": text}
            ]
        )
        
        # Extraer la respuesta
        content = response.choices[0].message.content
        
        try:
            # Intentar parsear el JSON
            json_data = json.loads(content)
            logger.info("Datos de factura extraídos correctamente")
            return json_data
        except json.JSONDecodeError as e:
            logger.error(f"Error al parsear la respuesta JSON: {str(e)}")
            return {
                "error": "Error al parsear los datos de la factura",
                "rawContent": content
            }
    except Exception as e:
        logger.error(f"Error al procesar la factura con OpenAI: {str(e)}")
        error_message = "Error al procesar la factura"
        
        # Manejar errores específicos
        if hasattr(e, 'status') and e.status == 429:
            error_message = "Rate limit exceeded or quota depleted on OpenAI API"
        elif hasattr(e, 'message'):
            error_message = e.message
            
        return {"error": error_message}
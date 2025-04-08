import io
import logging
from PyPDF2 import PdfReader
from pdfminer.high_level import extract_text as pdfminer_extract_text

logger = logging.getLogger()

def extract_text_from_pdf(pdf_bytes):
    """
    Extrae texto de un PDF utilizando múltiples métodos para mayor robustez.
    
    Args:
        pdf_bytes: Bytes del archivo PDF
        
    Returns:
        str: Texto extraído del PDF
    """
    if not pdf_bytes:
        logger.error("No se proporcionaron bytes del PDF")
        return None
    
    pdf_io = io.BytesIO(pdf_bytes)
    
    # Intentar con PyPDF2 primero
    try:
        logger.info("Intentando extraer texto con PyPDF2")
        text = extract_with_pypdf2(pdf_io)
        if text and len(text.strip()) > 100:  # Verificar que haya suficiente texto
            logger.info(f"Texto extraído con PyPDF2: {len(text)} caracteres")
            return text
    except Exception as e:
        logger.warning(f"Error al extraer con PyPDF2: {str(e)}")
    
    # Si PyPDF2 falla o devuelve poco texto, intentar con pdfminer
    pdf_io.seek(0)  # Reiniciar el puntero del archivo
    try:
        logger.info("Intentando extraer texto con pdfminer")
        text = extract_with_pdfminer(pdf_io)
        if text and len(text.strip()) > 0:
            logger.info(f"Texto extraído con pdfminer: {len(text)} caracteres")
            return text
    except Exception as e:
        logger.warning(f"Error al extraer con pdfminer: {str(e)}")
    
    logger.error("No se pudo extraer texto con ningún método")
    return None

def extract_with_pypdf2(pdf_io):
    """Extrae texto usando PyPDF2"""
    text = ""
    pdf = PdfReader(pdf_io)
    for page in pdf.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n\n"
    return text

def extract_with_pdfminer(pdf_io):
    """Extrae texto usando pdfminer"""
    return pdfminer_extract_text(pdf_io)
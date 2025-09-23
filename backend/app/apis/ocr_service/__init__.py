from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import pytesseract
from PIL import Image, ImageDraw, ImageFont
import io
import os
from app.env import Mode, mode # For Databutton fallback logic # Added for secrets
from google.cloud import vision # Added for GCV
from google.api_core.client_options import ClientOptions # Importar ClientOptions

router = APIRouter(
    prefix="/ocr",
    tags=["OCR Service"],
)

class OCRResponse(BaseModel):
    raw_text: str
    # We will add more structured fields later: merchant_name, date, total_amount etc.

@router.get("/test-tesseract")
async def test_tesseract_ocr():
    """Tests if pytesseract can successfully perform OCR.
    Creates a simple image with text and tries to extract it.
    """
    try:
        # Create a simple in-memory image with text
        img = Image.new('RGB', (400, 100), color = (255, 255, 255))
        d = ImageDraw.Draw(img)
        try:
            # Try to use a common font, fallback if not available
            font = ImageFont.truetype("arial.ttf", 40)
        except IOError:
            font = ImageFont.load_default()
        
        text_to_draw = "Hello World"
        d.text((10,10), text_to_draw, fill=(0,0,0), font=font)
        
        # Save image to a bytes buffer
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        # Perform OCR using pytesseract
        extracted_text = pytesseract.image_to_string(Image.open(img_byte_arr))
        
        # Clean up extracted text
        extracted_text = extracted_text.strip()
        
        if text_to_draw in extracted_text:
            return {"status": "success", "message": "Tesseract OCR is working!", "extracted_text": extracted_text}
        else:
            return {"status": "failure", "message": "Tesseract OCR processed image but did not find expected text.", "extracted_text": extracted_text}

    except pytesseract.TesseractNotFoundError:
        raise HTTPException(status_code=500, detail="Tesseract is not installed or not in your PATH.") from None
    except Exception as e:
        # Log the full error for debugging
        print(f"An unexpected error occurred during Tesseract test: {str(e)}")
        # import traceback
        # print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}") from e

@router.post("/process-receipt-gcv", response_model=OCRResponse)
async def process_receipt_google_cloud_vision(file: UploadFile = File(...)):
    """Processes an uploaded receipt image using Google Cloud Vision API."""
    try:
        api_key_value = os.environ.get("GOOGLE_VISION_API_KEY")
        if mode == Mode.DEV and not api_key_value:
            try:
                import databutton as db
                api_key_value = db.secrets.get("GOOGLE_VISION_API_KEY")
                if api_key_value: print("INFO: GOOGLE_VISION_API_KEY loaded from db.secrets (fallback).")
            except ImportError:
                pass # Databutton SDK not available
        if not api_key_value:
            raise HTTPException(status_code=500, detail="GOOGLE_VISION_API_KEY secret not found.")
        
        # Forzar el uso de la API Key obtenida
        client_options = ClientOptions(api_key=api_key_value)
        client = vision.ImageAnnotatorClient(client_options=client_options)

        content = await file.read()
        image = vision.Image(content=content)

        # Use DOCUMENT_TEXT_DETECTION for better results on dense text like receipts
        response = client.document_text_detection(image=image)
        
        if response.error.message:
            # Imprimir el error detallado de Google para más información
            print(f"Google Cloud Vision API Error Details: {response.error}")
            raise HTTPException(status_code=500, 
                                detail=f'Google Cloud Vision API error: {response.error.message}')

        if response.full_text_annotation:
            return OCRResponse(raw_text=response.full_text_annotation.text)
        else:
            return OCRResponse(raw_text="") # No text found
            
    except HTTPException as e: # Re-raise HTTPExceptions
        raise e
    except Exception as e:
        print(f"Error processing receipt with GCV: {str(e)}")
        # import traceback
        # print(traceback.format_exc()) # Descomentar para más detalles en caso de error inesperado
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred processing the receipt: {str(e)}") from e

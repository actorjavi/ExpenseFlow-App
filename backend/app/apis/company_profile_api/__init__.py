from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends
import databutton as db
from pydantic import BaseModel # Added pydantic import
# import magic # Removed magic dependency

router = APIRouter(prefix="/company-profile", tags=["Company Profile"])

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"]
LOGO_STORAGE_KEY = "company_logo_image"

class LogoUploadResponse(BaseModel): # Changed from db.Pydantic to BaseModel
    message: str
    filename: str
    content_type: str
    storage_key: str

# Define a dependency for the file to address ruff B008
def get_file_upload(file: UploadFile = File(...)):
    return file

@router.post("/logo", response_model=LogoUploadResponse)
async def upload_company_logo(file: UploadFile = Depends(get_file_upload)):
    """
    Uploads a company logo. The logo will be stored in db.storage.binary
    with the key 'company_logo_image'.
    Replaces the existing logo if one is already present.
    """
    if not file.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content type is missing.",
        )

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {file.content_type}. Allowed types are {', '.join(ALLOWED_MIME_TYPES)}.",
        )

    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )
        
        db.storage.binary.put(LOGO_STORAGE_KEY, image_bytes)
        
        print(f"Company logo '{file.filename}' uploaded successfully. Content-Type: {file.content_type}. Stored as '{LOGO_STORAGE_KEY}'.")
        return LogoUploadResponse(
            message="Logo uploaded successfully",
            filename=file.filename or "N/A", # file.filename can be None
            content_type=file.content_type,
            storage_key=LOGO_STORAGE_KEY,
        )
    except HTTPException: # Re-raise HTTPExceptions
        raise
    except Exception as e:
        print(f"Error uploading company logo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while uploading the logo: {str(e)}",
        )

# Example of how to potentially add a GET endpoint later for fetching the logo
# This would require careful consideration of how to serve binary data or a URL.
# For now, the export service will fetch it directly from db.storage.

# @router.get("/logo")
# async def get_company_logo():
#     logo_bytes = db.storage.binary.get(LOGO_STORAGE_KEY, default=None)
#     if not logo_bytes:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company logo not found.")
#     # Determine content type, e.g. by storing it alongside the image or by using magic
#     # For simplicity, assume png if not stored, but this is not robust
#     content_type = magic.from_buffer(logo_bytes, mime=True)
#     if content_type not in ALLOWED_MIME_TYPES: # Failsafe
        # content_type = "image/png" 
#     return Response(content=logo_bytes, media_type=content_type)


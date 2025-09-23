import databutton as db
from fastapi import APIRouter, UploadFile, HTTPException, Query
from pydantic import BaseModel
import uuid
import io
import json
from datetime import datetime

from google.oauth2.credentials import Credentials
import os
from app.env import Mode, mode # For Databutton fallback logic
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload # Reverted to MediaFileUpload
from googleapiclient.errors import HttpError
import tempfile # Added for temporary file handling
import os # Added for os.remove

from app.auth import AuthorizedUser # Añadido para autenticación de Firebase

import re # For sanitization

router = APIRouter(prefix="/image_upload", tags=["Image Upload"])

# --- Configuration for Google Drive ---
APP_DRIVE_ROOT_FOLDER_NAME = "ExpenseFlow Receipts"

class GoogleDriveUploadResponse(BaseModel):
    google_file_id: str
    file_name: str # Final name of the file in Drive
    web_view_link: str | None = None
    web_content_link: str | None = None


def sanitize_for_filename(name_part: str) -> str:
    """Sanitizes a string to be safe for use in a filename or folder name."""
    if not name_part:
        return ""
    # Remove or replace characters that are problematic for filenames/folder names
    # This is a basic example; Google Drive might be more permissive or have specific rules.
    name_part = re.sub(r'[/\\:*?"<>|]', '-', name_part) # Replace common illegal chars with hyphen
    name_part = name_part.strip() # Remove leading/trailing whitespace
    return name_part

async def _get_next_available_filename(service, parent_id: str, base_name: str, extension: str) -> str:
    """Finds the next available filename in a Drive folder, appending _NNN if necessary."""
    # Check if the original name (base_name.extension) exists
    original_filename_query = f"name = '{base_name}.{extension}' and '{parent_id}' in parents and trashed=false"
    response = service.files().list(q=original_filename_query, spaces='drive', fields='files(id)').execute()
    if not response.get('files', []):
        return f"{base_name}.{extension}"

    # If original exists, start checking for _NNN versions
    i = 1
    while True:
        numbered_filename = f"{base_name}_{i:03d}.{extension}"
        query = f"name = '{numbered_filename}' and '{parent_id}' in parents and trashed=false"
        response = service.files().list(q=query, spaces='drive', fields='files(id)').execute()
        if not response.get('files', []):
            return numbered_filename
        i += 1


async def _get_or_create_drive_folder(service, folder_name: str, parent_id: str | None = None) -> str:
    """
    Gets the ID of a folder in Google Drive, creating it if it doesn't exist.
    The folder_name is sanitized before use.
    """
    sanitized_folder_name = sanitize_for_filename(folder_name)
    if not sanitized_folder_name:
        # Fallback if sanitization results in an empty string, though this should be handled by caller
        sanitized_folder_name = "default-folder-name"
        print(f"[DRIVE_UPLOAD_API] Warning: Sanitized folder name was empty. Using '{sanitized_folder_name}'. Original: '{folder_name}'")

    query = f"mimeType='application/vnd.google-apps.folder' and name='{sanitized_folder_name}' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"
    else:
        pass # Searches in root or context implicitly

    try:
        response = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        folders = response.get('files', [])
        
        if folders:
            print(f"[DRIVE_UPLOAD_API] Found folder '{sanitized_folder_name}' with ID: {folders[0].get('id')}")
            return folders[0].get('id')
        else:
            print(f"[DRIVE_UPLOAD_API] Folder '{sanitized_folder_name}' not found. Creating...")
            file_metadata = {
                'name': sanitized_folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            if parent_id:
                file_metadata['parents'] = [parent_id]
            
            folder = service.files().create(body=file_metadata, fields='id').execute()
            print(f"[DRIVE_UPLOAD_API] Created folder '{sanitized_folder_name}' with ID: {folder.get('id')}")
            return folder.get('id')
    except HttpError as error:
        print(f"[DRIVE_UPLOAD_API] An error occurred with Drive API while finding/creating folder '{sanitized_folder_name}': {error}")
        # Adding more context to the error detail
        error_content = getattr(error, 'content', b'').decode('utf-8')
        raise HTTPException(status_code=500, detail=f"Google Drive API error (folder '{sanitized_folder_name}'): {str(error)} - {error_content}")


@router.post("/upload-receipt-image", response_model=GoogleDriveUploadResponse)
async def upload_receipt_image_to_drive(
    file: UploadFile, 
    user: AuthorizedUser,
    sheet_name: str = Query(..., description="Name of the expense sheet for folder creation."),
    expense_date_str: str = Query(..., description="Date of the expense (YYYY-MM-DD) for filename."),
    project_name: str | None = Query(None, description="Project name for filename (optional)."),
    company_name: str | None = Query(None, description="Company name for filename (optional).")
):
    print(f"[DRIVE_UPLOAD_API] /upload-receipt-image called by user {user.sub}. File: {file.filename}, Sheet: {sheet_name}, Date: {expense_date_str}, Proj: {project_name}, Comp: {company_name}")
    
    token_storage_key = f"google_tokens_{user.sub}"  # Corrected key
    token_info = db.storage.json.get(token_storage_key)
    
    if not token_info or not token_info.get("refresh_token"):
        print(f"[DRIVE_UPLOAD_API] Refresh token not found in stored tokens for user {user.sub} with key {token_storage_key}")
        # Log the content of token_info if it exists but doesn't contain refresh_token
        if token_info:
            print(f"[DRIVE_UPLOAD_API] Content of {token_storage_key}: {token_info}")
        raise HTTPException(status_code=401, detail="Google Drive refresh token not found for user. Please re-authenticate.")

    user_refresh_token = token_info.get("refresh_token")
    
    # Get client_id and client_secret from environment variables
    google_client_id = os.environ.get("GOOGLE_CLIENT_ID")
    google_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")

    if mode == Mode.DEV:
        try:
            # db is already imported at the module level
            if not google_client_id:
                google_client_id = db.secrets.get("GOOGLE_CLIENT_ID")
                if google_client_id: print("INFO: GOOGLE_CLIENT_ID (image_upload) loaded from db.secrets (fallback).")
            if not google_client_secret:
                google_client_secret = db.secrets.get("GOOGLE_CLIENT_SECRET")
                if google_client_secret: print("INFO: GOOGLE_CLIENT_SECRET (image_upload) loaded from db.secrets (fallback).")
        except ImportError:
            pass # Databutton SDK not available


    if not google_client_id or not google_client_secret:
        print("[DRIVE_UPLOAD_API] Google client ID or secret not configured in secrets.")
        raise HTTPException(status_code=500, detail="Server configuration error for Google authentication.")

    try:
        credentials = Credentials(
            token=None, # No initial access token, will be fetched using refresh_token
            refresh_token=user_refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=google_client_id,
            client_secret=google_client_secret,
            scopes=["https://www.googleapis.com/auth/drive.file"] # Ensure correct scope
        )
        
        # Refresh the credentials to get a new access token
        credentials.refresh(Request())
        print(f"[DRIVE_UPLOAD_API] Credentials refreshed successfully for user {user.sub}")

    except Exception as cred_err:
        print(f"[DRIVE_UPLOAD_API] Failed to refresh credentials for user {user.sub}: {cred_err}")
        raise HTTPException(status_code=401, detail=f"Failed to obtain Google Drive access: {str(cred_err)}")

    # La lógica de subida permanece mayormente igual, usando las 'credentials' obtenidas
    try:
        drive_service = build('drive', 'v3', credentials=credentials)
        
        # Determine file extension
        content_type = file.content_type
        if content_type == "image/jpeg":
            file_extension = "jpg"
        elif content_type == "image/png":
            file_extension = "png"
        elif content_type == "application/pdf": # Allow PDF
            file_extension = "pdf"
        else:
            await file.close()
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}. Allowed types: JPEG, PNG, PDF.")

        # --- Get target folder ID ---
        root_folder_id = await _get_or_create_drive_folder(drive_service, APP_DRIVE_ROOT_FOLDER_NAME)
        
        # Use sanitized sheet_name for the subfolder
        sanitized_sheet_name = sanitize_for_filename(sheet_name)
        if not sanitized_sheet_name:
            # This case should ideally be prevented by frontend validation or a robust default sheet name
            print(f"[DRIVE_UPLOAD_API] Warning: Sheet name '{sheet_name}' sanitized to empty. Using default folder name.")
            sanitized_sheet_name = f"gastos-hoja-{uuid.uuid4().hex[:8]}" # Fallback folder name

        target_folder_id = await _get_or_create_drive_folder(drive_service, sanitized_sheet_name, parent_id=root_folder_id)
        
        # --- Determine filename ---
        try:
            # Parse expense_date_str
            expense_dt = datetime.strptime(expense_date_str, "%Y-%m-%d")
            formatted_expense_date = expense_dt.strftime("%Y-%m-%d")
        except ValueError:
            await file.close()
            raise HTTPException(status_code=400, detail="Invalid expense_date_str format. Expected YYYY-MM-DD.")

        base_filename_parts = [formatted_expense_date]
        if project_name:
            base_filename_parts.append(sanitize_for_filename(project_name))
        if company_name:
            base_filename_parts.append(sanitize_for_filename(company_name))
        
        base_name_for_drive = "_".join(filter(None, base_filename_parts)) # Filter out empty strings from optional parts
        if not base_name_for_drive: # Should not happen if date is always present
            base_name_for_drive = f"receipt_{uuid.uuid4().hex[:8]}" 

        drive_filename = await _get_next_available_filename(drive_service, target_folder_id, base_name_for_drive, file_extension)
        
        await file.seek(0)
        file_contents_bytes = await file.read()
        
        temp_file_path = None 
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file_obj:
                temp_file_obj.write(file_contents_bytes)
                temp_file_path = temp_file_obj.name
            
            print(f"[DRIVE_UPLOAD_API] Temporary file created at: {temp_file_path}")

            media = MediaFileUpload(
                temp_file_path,
                mimetype=content_type, 
                resumable=True
            )
            
            file_metadata = {
                'name': drive_filename,
                'parents': [target_folder_id]
            }
            
            print(f"[DRIVE_UPLOAD_API] Attempting to upload '{drive_filename}' to Drive folder ID '{target_folder_id}'.")
            uploaded_file = drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name, webViewLink, webContentLink'
            ).execute()
            
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path) # Clean up the temporary file
                    print(f"[DRIVE_UPLOAD_API] Temporary file {temp_file_path} removed.")
                except OSError as e:
                    print(f"[DRIVE_UPLOAD_API] Error removing temporary file {temp_file_path}: {e}")
            # No need to close file (FastAPI UploadFile) here as it's handled by the framework or in the outermost finally.

        file_id = uploaded_file.get('id')
        file_name_in_drive = uploaded_file.get('name')
        web_view_link = uploaded_file.get('webViewLink')
        web_content_link = uploaded_file.get('webContentLink') # This is key for direct image display

        print(f"[DRIVE_UPLOAD_API] File uploaded to Drive. ID: {file_id}, Name: {file_name_in_drive}")
        print(f"[DRIVE_UPLOAD_API] webViewLink: {web_view_link}, webContentLink: {web_content_link}")

        return GoogleDriveUploadResponse(
            google_file_id=file_id,
            file_name=file_name_in_drive,
            web_view_link=web_view_link,
            web_content_link=web_content_link
        )

    except HttpError as error:
        print(f"[DRIVE_UPLOAD_API] Google Drive API error during file upload: {error}")
        # The error object from googleapiclient might contain more details
        error_details = error.resp.get('content', '{}')
        try:
            error_json = json.loads(error_details)
            detail_message = error_json.get('error', {}).get('message', str(error))
        except json.JSONDecodeError:
            detail_message = str(error) # Fallback to string representation of error
        raise HTTPException(status_code=error.resp.status, detail=f"Google Drive API error: {detail_message}")
    except HTTPException: # Re-raise HTTPExceptions from _get_google_credentials or type check
        raise
    except Exception as e:
        print(f"[DRIVE_UPLOAD_API] Unexpected error during file upload processing: {e}")
        raise HTTPException(status_code=500, detail=f"Could not upload file to Google Drive: {str(e)}")
    finally:
        if file:
            await file.close()

# Remove or comment out old Databutton storage based upload logic
# (The old get_project_id_from_api_url and ImageUploadResponse can be removed if no longer used)
# For now, I will leave them commented out in case of quick rollback needs.

# def get_project_id_from_api_url(api_url_str: str) -> str | None:
#     """
#     Parses the Project ID from a Databutton API URL.
#     Example URL: https://api.databutton.com/_projects/YOUR_PROJECT_ID/dbtn/...
#     """
#     # ... (implementation from previous version) ...
#     pass

# class ImageUploadResponse(BaseModel): # Old response model
#     file_url: str
#     file_key: str

# @router.post("/upload-receipt-image-old-db-storage", response_model=ImageUploadResponse) # Renamed old endpoint
# async def upload_receipt_image_to_db_storage(file: UploadFile):
    # ... (implementation from previous version that saves to db.storage.binary) ...
    # pass

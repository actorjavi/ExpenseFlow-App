
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse, HTMLResponse # Added HTMLResponse
from pydantic import BaseModel
import databutton as db
import uuid
import os
import json # Added import for json module
from app.env import Mode, mode # For Databutton fallback logic

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
# Firebase Admin SDK will be initialized locally
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth_admin

import requests # Necesario para llamar al endpoint de userinfo

# --- BEGIN Embedded Firebase Initialization Logic for auth_service ---
FIREBASE_ADMIN_INITIALIZED = False
DB_FIRESTORE_ADMIN_CLIENT = None # Local Firestore client instance

def initialize_firebase_admin_once():
    global FIREBASE_ADMIN_INITIALIZED, DB_FIRESTORE_ADMIN_CLIENT
    
    if firebase_admin._apps:
        print("INFO (auth_service): Firebase Admin SDK already initialized.")
        if not DB_FIRESTORE_ADMIN_CLIENT and hasattr(firestore, "client"):
            try:
                DB_FIRESTORE_ADMIN_CLIENT = firestore.client()
            except Exception as e_firestore_client:
                 print(f"ERROR (auth_service): Failed to get firestore client even if app initialized: {e_firestore_client}")
        FIREBASE_ADMIN_INITIALIZED = True
        return

    try:
        firebase_sdk_config_json_str = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
        cred_object_dict = None

        if firebase_sdk_config_json_str:
            try:
                cred_object_dict = json.loads(firebase_sdk_config_json_str)
                print("INFO (auth_service): FIREBASE_SERVICE_ACCOUNT_KEY loaded and parsed from environment variable.")
            except json.JSONDecodeError as e:
                print(f"WARNING (auth_service): Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from env var: {e}. Attempting fallback.")
        
        if cred_object_dict is None and mode == Mode.DEV:
            try:
                # import databutton as db # db is already imported globally in this file
                print("INFO (auth_service): Attempting to load FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets as a fallback...")
                db_secret_value = db.secrets.get("FIREBASE_SERVICE_ACCOUNT_KEY")
                if isinstance(db_secret_value, dict):
                    cred_object_dict = db_secret_value
                    print("INFO (auth_service): FIREBASE_SERVICE_ACCOUNT_KEY loaded from db.secrets (already a dict).")
                elif isinstance(db_secret_value, str):
                    try:
                        cred_object_dict = json.loads(db_secret_value)
                        print("INFO (auth_service): FIREBASE_SERVICE_ACCOUNT_KEY loaded and parsed from db.secrets (string).")
                    except json.JSONDecodeError as e_db:
                        print(f"CRITICAL (auth_service): Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets string: {e_db}")
                        return 
                elif db_secret_value is not None:
                    print("CRITICAL (auth_service): FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets is not a dict or string.")
                    return
                else: # db_secret_value is None
                    print("INFO (auth_service): FIREBASE_SERVICE_ACCOUNT_KEY not found in db.secrets either.")
            except ImportError: # Should not happen as db is imported globally
                print("INFO (auth_service): Databutton SDK not available for db.secrets fallback (unexpected).")
        
        if cred_object_dict:
            cred = credentials.Certificate(cred_object_dict)
            firebase_admin.initialize_app(cred)
            if hasattr(firestore, "client"):
                DB_FIRESTORE_ADMIN_CLIENT = firestore.client()
            FIREBASE_ADMIN_INITIALIZED = True
            print("INFO (auth_service): Firebase Admin SDK initialized successfully by auth_service.")
        else:
            print("CRITICAL (auth_service): FIREBASE_SERVICE_ACCOUNT_KEY not found. Firebase Admin SDK NOT initialized by auth_service.")

    except Exception as e:
        print(f"CRITICAL (auth_service): Unexpected error during Firebase Admin SDK initialization: {e}")

initialize_firebase_admin_once()

def get_firestore_client_local():
    global FIREBASE_ADMIN_INITIALIZED, DB_FIRESTORE_ADMIN_CLIENT
    if not FIREBASE_ADMIN_INITIALIZED:
        print("WARN (auth_service): Firestore client requested but Firebase Admin not initialized. Attempting late initialization.")
        initialize_firebase_admin_once() # Attempt to initialize if not already
        if not FIREBASE_ADMIN_INITIALIZED:
            print("ERROR (auth_service): Late Firebase Admin initialization also failed. Firestore client is unavailable.")
            return None # Explicitly return None if still not initialized

    if not DB_FIRESTORE_ADMIN_CLIENT and FIREBASE_ADMIN_INITIALIZED and hasattr(firestore, "client"):
        print("WARN (auth_service): DB_FIRESTORE_ADMIN_CLIENT is None even after initialization. Attempting to get client again.")
        try:
            DB_FIRESTORE_ADMIN_CLIENT = firestore.client()
            if DB_FIRESTORE_ADMIN_CLIENT is None: # Check if client() itself returned None
                 print("ERROR (auth_service): firestore.client() returned None on late attempt.")
        except Exception as e:
            print(f"ERROR (auth_service): Failed to get firestore client on late attempt: {e}")
            return None # Return None if client acquisition fails
            
    return DB_FIRESTORE_ADMIN_CLIENT
# --- END Embedded Firebase Initialization Logic for auth_service ---


# --- Configuration ---
# Ensure these are set as environment variables
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

# Fallback for Databutton development environment for Google OAuth secrets
if mode == Mode.DEV:
    # db is already imported globally
    if not GOOGLE_CLIENT_ID:
        GOOGLE_CLIENT_ID = db.secrets.get("GOOGLE_CLIENT_ID")
        if GOOGLE_CLIENT_ID: print("INFO (auth_service): GOOGLE_CLIENT_ID loaded from db.secrets (fallback).")
    if not GOOGLE_CLIENT_SECRET:
        GOOGLE_CLIENT_SECRET = db.secrets.get("GOOGLE_CLIENT_SECRET")
        if GOOGLE_CLIENT_SECRET: print("INFO (auth_service): GOOGLE_CLIENT_SECRET loaded from db.secrets (fallback).")

# Firebase Admin SDK is now initialized locally above
# We can directly use firebase_auth_admin and the local DB_FIRESTORE_ADMIN_CLIENT (via get_firestore_client_local).
# Removing the old comment block that refers to firebase_setup.py
pass # Firebase Admin SDK initialization is handled locally now

if not GOOGLE_CLIENT_ID:
    print("CRITICAL: GOOGLE_CLIENT_ID environment variable not set.")
    # Optionally raise an exception
if not GOOGLE_CLIENT_SECRET:
    print("CRITICAL: GOOGLE_CLIENT_SECRET environment variable not set.")
    # Optionally raise an exception

# This should be the full URL to your callback endpoint
# Make sure it's added to your Google Cloud Console authorized redirect URIs
# For development with Databutton, it will be like:
# https://api.databutton.com/_projects/YOUR_PROJECT_ID/dbtn/devx/app/routes/auth/google/callback
# We need to construct this dynamically or get it from app.env if possible
# For now, let's try to build it. This is a common challenge in such environments.

# Attempt to get API base URL from environment to construct REDIRECT_URI
# API_BASE_URL = None
# try:
#     from app.env import API_URL # This is the full path to /routes
#     if API_URL:
#         API_BASE_URL = API_URL 
#         print(f"[AUTH_API] Derived API_BASE_URL: {API_BASE_URL}")
# except ImportError:
#     print("[AUTH_API] Warning: app.env.API_URL could not be imported. REDIRECT_URI might be incorrect.")

# # If API_BASE_URL is successfully derived, append the callback path
# REDIRECT_URI = f"{API_BASE_URL}/auth/google/callback" if API_BASE_URL else None

# Statically set REDIRECT_URI for Databutton dev environment
REDIRECT_URI = "https://api.databutton.com/_projects/0be2c8bb-9069-4a83-9cc5-4e205f2f6d79/dbtn/devx/app/routes/auth/google/callback"
print(f"[AUTH_API] Using static REDIRECT_URI: {REDIRECT_URI}")


# If by any chance GOOGLE_CLIENT_ID or SECRET is None, raise an error early
if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    print("[AUTH_API] CRITICAL ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set.")
    # This won't stop the app from loading but endpoints will fail.
    # Consider raising an exception here to make it more visible if preferred, but that might stop server.

SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive'  # Changed from drive.file to drive for broader access
]

router = APIRouter(prefix="/auth/google", tags=["Authentication"])

def get_flow():
    if not REDIRECT_URI:
        # This is a critical configuration error. If this happens, auth will not work.
        print("[AUTH_API] CRITICAL: REDIRECT_URI is not set. Google OAuth flow cannot be initialized.")
        raise HTTPException(status_code=500, detail="Server configuration error: REDIRECT_URI not set.")

    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI], # Must match what's in Google Cloud Console
        }
    }
    return Flow.from_client_config(
        client_config=client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )

@router.get("/login")
async def login_with_google():
    print(f"[AUTH_API] /login called. REDIRECT_URI: {REDIRECT_URI}")
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not REDIRECT_URI:
        raise HTTPException(status_code=500, detail="OAuth2 client not configured correctly on server.")
    
    try:
        flow = get_flow()
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            prompt='consent', # Ensures refresh token is issued, good for long-term access
            include_granted_scopes='true'
        )
        # Store state in session or db to prevent CSRF, for simplicity now we skip full CSRF state validation in callback
        # but in a production app, state should be stored (e.g., in a short-lived db entry or httpOnly cookie)
        # and verified in the callback.
        print(f"[AUTH_API] Generated authorization_url: {authorization_url}")
        # For now, we will store the state in a temporary db.storage.json entry with a short TTL if possible
        # or rely on FastAPI's session cookie if we set one up later.
        # As a very simple non-production mechanism, we might just proceed without state validation for now and add later.
        return RedirectResponse(authorization_url)
    except Exception as e:
        print(f"[AUTH_API] Error in /login: {e}")
        raise HTTPException(status_code=500, detail=f"Error initiating OAuth flow: {str(e)}") from e

@router.get("/callback")
async def auth_google_callback(code: str, state: str | None = None):
    print(f"[AUTH_API] /callback called. Code: {code}, State: {state}")
    # Here you should validate the 'state' parameter against the one stored before redirection to prevent CSRF.
    # For this initial version, we'll skip comprehensive state validation for brevity.
    
    if not REDIRECT_URI:
         raise HTTPException(status_code=500, detail="Server configuration error: REDIRECT_URI not set for callback.")

    try:
        flow = get_flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Store credentials securely
        # For simplicity in this example, store in db.storage.json with a session ID.
        # In a production app, consider more robust session management (e.g., encrypted cookies, server-side sessions).
        session_id = str(uuid.uuid4())
        db_key = f"google_auth_session_{session_id}.json"
        
        # Guardar el diccionario de credenciales en db.storage.json
        db.storage.json.put(db_key, json.loads(credentials.to_json()))
        print(f"[AUTH_API] Stored credentials dictionary for session {session_id} in {db_key}")

        # Construct the full redirect URL to the Databutton dev UI environment
        # This URL is specific to your project's development UI in Databutton.
        ui_dev_project_url = "https://databutton.com/_projects/0be2c8bb-9069-4a83-9cc5-4e205f2f6d79/dbtn/devx/ui/"
        final_redirect_url_for_frontend = f"{ui_dev_project_url}?google_session_id={session_id}"
        
        html_content = f'''
        <html>
            <head>
                <title>Redirigiendo...</title>
                <script>
                    window.onload = function() {{
                        console.log("Redirecting to: {final_redirect_url_for_frontend}");
                        window.location.href = "{final_redirect_url_for_frontend}";
                    }};
                </script>
            </head>
            <body>
                <p>Un momento, por favor. Redirigiendo a la aplicación...</p>
            </body>
        </html>
        '''
        print(f"[AUTH_API] Returning HTML to redirect to: {final_redirect_url_for_frontend}")
        return HTMLResponse(content=html_content)

    except Exception as e:
        print(f"[AUTH_API] Error in /callback: {e}")
        # It's good to redirect to an error page on the frontend rather than just raising HTTPException here
        # if the error is related to token exchange, as user is already in browser flow.
        # For now, a generic error.
        raise HTTPException(status_code=500, detail=f"Could not exchange token: {str(e)}") from e

class UserInfo(BaseModel):
    email: str | None = None
    name: str | None = None
    picture: str | None = None
    is_authenticated: bool = False

@router.get("/me", response_model=UserInfo)
async def get_current_user_info(session_id: str | None = None): # Expect session_id from query or header
    print(f"[AUTH_API] /me called. session_id: {session_id}")
    if not session_id:
        return UserInfo(is_authenticated=False)

    db_key = f"google_auth_session_{session_id}.json"
    try:
        creds_info_dict = db.storage.json.get(db_key) # db.storage.json.get() devuelve un dict
        
        # Si la clave no existe o el JSON está vacío, get() con default=dict() (implícito o explícito) devolvería {}.
        # Necesitamos una comprobación más robusta para un diccionario de credenciales vacío o inválido.
        if not creds_info_dict or not creds_info_dict.get("token"): # Chequeo básico si hay al menos un token.
            print(f"[AUTH_API] /me: Session data not found, empty, or invalid for {db_key}.")
            return UserInfo(is_authenticated=False)
        
        # creds_info_dict ya es un diccionario, no se necesita json.loads() aquí.
        credentials = Credentials.from_authorized_user_info(creds_info_dict)

        if credentials and credentials.valid:
            if credentials.expired and credentials.refresh_token:
                try:
                    credentials.refresh(Request())
                    # Guardar el diccionario de credenciales refrescadas
                    db.storage.json.put(db_key, json.loads(credentials.to_json())) 
                    print(f"[AUTH_API] /me: Token refreshed and dictionary stored for session {session_id}")
                except Exception as refresh_err:
                    print(f"[AUTH_API] /me: Error refreshing token for session {session_id}: {refresh_err}")
                    db.storage.json.delete(db_key) # Eliminar sesión si el refresco falla
                    return UserInfo(is_authenticated=False)
            
            # Llamar al endpoint de userinfo de Google
            userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
            headers = {"Authorization": f"Bearer {credentials.token}"} # Usar el token de acceso
            
            try:
                response = requests.get(userinfo_url, headers=headers)
                response.raise_for_status() # Lanza una excepción para errores HTTP (4xx o 5xx)
                user_data = response.json()
                
                user_email = user_data.get("email")
                user_name = user_data.get("name")
                user_picture = user_data.get("picture")
                
                print(f"[AUTH_API] /me: User info fetched for session {session_id}. Email: {user_email}, Name: {user_name}, Picture: {user_picture}")
                return UserInfo(email=user_email, name=user_name, picture=user_picture, is_authenticated=True)
                
            except requests.exceptions.RequestException as e:
                print(f"[AUTH_API] /me: Error fetching userinfo for session {session_id}: {e}")
                # Aún autenticado, pero no pudimos obtener la info del perfil.
                # Devolver is_authenticated=True pero sin datos de usuario para que la app sepa que hay una sesión válida.
                return UserInfo(is_authenticated=True, email=None, name=None, picture=None)

        else:
            # Credenciales no válidas (o expiradas sin token de refresco)
            print(f"[AUTH_API] /me: Credentials not valid for session {session_id}. Deleting session.")
            db.storage.json.delete(db_key) # Clean up invalid session
            return UserInfo(is_authenticated=False)
            
    except FileNotFoundError: # Esto no debería ocurrir si db.storage.json.get usa un default
        print(f"[AUTH_API] /me: Session file not found for {db_key} (should not happen with default dict).")
        return UserInfo(is_authenticated=False)
    except json.JSONDecodeError as e: # Esto no debería ocurrir si db.storage.json.get deserializa
        print(f"[AUTH_API] /me: Error decoding session JSON for {db_key} (should not happen with db.storage.json.get): {e}")
        # Si creds_info_dict era el culpable, podría ser útil loguearlo si no es demasiado grande.
        # db.storage.json.delete(db_key) # Eliminar datos corruptos si esto fuera posible
        return UserInfo(is_authenticated=False)
    except Exception as e:
        print(f"[AUTH_API] /me: Generic error for session {session_id} in file {db_key}. Error: {e}")
        # Podríamos querer eliminar la sesión aquí también si es un error inesperado.
        # Por ahora, simplemente marcamos como no autenticado.
        return UserInfo(is_authenticated=False)


class AuthUrlResponse(BaseModel):
    authorization_url: str

@router.get("/get-auth-url", response_model=AuthUrlResponse)
async def get_google_auth_url():
    print(f"[AUTH_API] /get-auth-url called. REDIRECT_URI: {REDIRECT_URI}")
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not REDIRECT_URI:
        raise HTTPException(status_code=500, detail="OAuth2 client not configured correctly on server.")
    
    try:
        flow = get_flow()
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            prompt='consent',
            include_granted_scopes='true'
        )
        # Note: State should ideally be stored and verified in callback for CSRF protection.
        # For this flow, since callback handles token exchange directly, risk is somewhat mitigated
        # but full CSRF protection would involve frontend sending state to callback for verification.
        print(f"[AUTH_API] Generated authorization_url for frontend: {authorization_url}")
        return AuthUrlResponse(authorization_url=authorization_url)
    except Exception as e:
        print(f"[AUTH_API] Error in /get-auth-url: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating OAuth authorization URL: {str(e)}") from e


# Placeholder for logout
@router.post("/logout")
async def logout_google(session_id: str | None = None):
    print(f"[AUTH_API] /logout called. session_id: {session_id}")
    if session_id:
        db_key = f"google_auth_session_{session_id}.json"
        try:
            # Optionally, revoke token with Google
            # creds_json = db.storage.json.get(db_key)
            # if creds_json:
            #     credentials = Credentials.from_authorized_user_info(json.loads(creds_json))
            #     if credentials and credentials.token:
            #         # Revoke token
            #         revoke_url = 'https://oauth2.googleapis.com/revoke?token=' + credentials.token
            #         # header = {'content-type': 'application/x-www-form-urlencoded'}
            #         # requests.post(revoke_url, headers=header) # Using requests or httpx
            #         print(f"[AUTH_API] Token for session {session_id} would be revoked here.")

            db.storage.json.delete(db_key)
            print(f"[AUTH_API] Deleted session {session_id} from storage.")
            return {"message": "Logged out successfully"}
        except FileNotFoundError:
            return {"message": "Session not found or already logged out"}
        except Exception as e:
            print(f"[AUTH_API] Error in /logout for session {session_id}: {e}")
            raise HTTPException(status_code=500, detail="Error during logout") from e
    return {"message": "No session to log out"}


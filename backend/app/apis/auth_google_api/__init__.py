from fastapi import APIRouter, HTTPException, Depends, Request # Añadir Request
from fastapi.responses import RedirectResponse, HTMLResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token_verifier # Nueva importación
from google.auth.transport import requests as google_auth_requests # Nueva importación
import os
from app.env import Mode, mode # For Databutton fallback logic
import os # Ensure os is imported if not already explicitly above
import json
import firebase_admin
from firebase_admin import credentials
# No longer importing from app.libs.firebase_setup
from firebase_admin import auth as firebase_auth_admin

# --- BEGIN Embedded Firebase Initialization Logic for auth_google_api ---
FIREBASE_ADMIN_INITIALIZED = False

def initialize_firebase_admin_once():
    global FIREBASE_ADMIN_INITIALIZED
    
    # Check if Firebase Admin is already initialized (most robust way)
    if firebase_admin._apps:
        print("INFO (auth_google_api): Firebase Admin SDK already initialized.")
        FIREBASE_ADMIN_INITIALIZED = True
        return

    try:
        firebase_sdk_config_json_str = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
        cred_object_dict = None

        if firebase_sdk_config_json_str:
            try:
                cred_object_dict = json.loads(firebase_sdk_config_json_str)
                print("INFO (auth_google_api): FIREBASE_SERVICE_ACCOUNT_KEY loaded and parsed from environment variable.")
            except json.JSONDecodeError as e:
                print(f"WARNING (auth_google_api): Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from env var: {e}. Attempting fallback.")
        
        if cred_object_dict is None and mode == Mode.DEV:
            try:
                import databutton as db # Local import for fallback
                print("INFO (auth_google_api): Attempting to load FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets as a fallback...")
                db_secret_value = db.secrets.get("FIREBASE_SERVICE_ACCOUNT_KEY")
                if isinstance(db_secret_value, dict):
                    cred_object_dict = db_secret_value
                    print("INFO (auth_google_api): FIREBASE_SERVICE_ACCOUNT_KEY loaded from db.secrets (already a dict).")
                elif isinstance(db_secret_value, str):
                    try:
                        cred_object_dict = json.loads(db_secret_value)
                        print("INFO (auth_google_api): FIREBASE_SERVICE_ACCOUNT_KEY loaded and parsed from db.secrets (string).")
                    except json.JSONDecodeError as e_db:
                        print(f"CRITICAL (auth_google_api): Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets string: {e_db}")
                        return 
                elif db_secret_value is not None:
                    print("CRITICAL (auth_google_api): FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets is not a dict or string.")
                    return
                else: # db_secret_value is None
                    print("INFO (auth_google_api): FIREBASE_SERVICE_ACCOUNT_KEY not found in db.secrets either.")
            except ImportError:
                print("INFO (auth_google_api): Databutton SDK not available, cannot use db.secrets fallback for Firebase key.")
        
        if cred_object_dict:
            cred = credentials.Certificate(cred_object_dict)
            firebase_admin.initialize_app(cred)
            FIREBASE_ADMIN_INITIALIZED = True
            print("INFO (auth_google_api): Firebase Admin SDK initialized successfully by auth_google_api.")
        else:
            print("CRITICAL (auth_google_api): FIREBASE_SERVICE_ACCOUNT_KEY not found. Firebase Admin SDK NOT initialized by auth_google_api.")

    except Exception as e:
        print(f"CRITICAL (auth_google_api): Unexpected error during Firebase Admin SDK initialization: {e}")

# Call initialization when this module is imported
initialize_firebase_admin_once()
# --- END Embedded Firebase Initialization Logic for auth_google_api ---
 

# Configuración
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

if mode == Mode.DEV:
    try:
        import databutton as db
        if not GOOGLE_CLIENT_ID:
            GOOGLE_CLIENT_ID = db.secrets.get("GOOGLE_CLIENT_ID")
            if GOOGLE_CLIENT_ID: print("INFO: GOOGLE_CLIENT_ID (auth_google_api) loaded from db.secrets (fallback).")
        if not GOOGLE_CLIENT_SECRET:
            GOOGLE_CLIENT_SECRET = db.secrets.get("GOOGLE_CLIENT_SECRET")
            if GOOGLE_CLIENT_SECRET: print("INFO: GOOGLE_CLIENT_SECRET (auth_google_api) loaded from db.secrets (fallback).")
    except ImportError:
        pass # Databutton SDK not available

if not GOOGLE_CLIENT_ID:
    print("CRITICAL: GOOGLE_CLIENT_ID (auth_google_api) environment variable not set.")
if not GOOGLE_CLIENT_SECRET:
    print("CRITICAL: GOOGLE_CLIENT_SECRET (auth_google_api) environment variable not set.")

router = APIRouter(prefix="/auth-google-api", tags=["Authentication"])

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/drive.file"
]

SESSION_STATE_KEY_PREFIX = "google_oauth_state_"
SESSION_FLOW_REDIRECT_URI = "google_flow_redirect_uri_"

# El PROJECT_ID específico de este proyecto en Databutton. 
# Es importante que esta redirect_uri coincida EXACTAMENTE con la configurada en Google Cloud Console.
PROJECT_ID_SPECIFIC = "0be2c8bb-9069-4a83-9cc5-4e205f2f6d79" # Tu Project ID
DEV_REDIRECT_URI = f"https://api.databutton.com/_projects/{PROJECT_ID_SPECIFIC}/dbtn/devx/app/routes/auth-google-api/callback"
# Para producción, necesitarás configurar la URL correcta si es diferente
PROD_REDIRECT_URI_PLACEHOLDER = f"https://api.databutton.com/_projects/{PROJECT_ID_SPECIFIC}/dbtn/prodx/app/routes/auth-google-api/callback" # Ajustar para prod

def get_google_flow():
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        }
    }

    current_redirect_uri = ""
    if mode == Mode.DEV:
        current_redirect_uri = DEV_REDIRECT_URI
    elif mode == Mode.PROD:
        # IMPORTANTE: Verifica que esta sea la URI correcta para tu entorno de producción.
        # Si tu app de producción usa un dominio personalizado, esta URI cambiará.
        # Por ahora, asumimos que la estructura es similar a la de desarrollo pero con 'prodx'.
        current_redirect_uri = PROD_REDIRECT_URI_PLACEHOLDER 
        # Si este proyecto específico tiene una URL de producción diferente o fija:
        if PROJECT_ID_SPECIFIC == "0be2c8bb-9069-4a83-9cc5-4e205f2f6d79":
            # Para este proyecto en particular, si sabes que la URL de prod es igual a la de dev o específica:
            # current_redirect_uri = DEV_REDIRECT_URI # O la URL de prod correcta y fija
            pass # Mantener el PROD_REDIRECT_URI_PLACEHOLDER por ahora
    else: 
        print(f"ADVERTENCIA: Entorno desconocido '{mode}'. Usando redirect_uri de desarrollo por defecto.")
        current_redirect_uri = DEV_REDIRECT_URI

    print(f"DEBUG: get_google_flow: Using redirect_uri: {current_redirect_uri} for mode: {mode}")

    flow = Flow.from_client_config(
        client_config=client_config, 
        scopes=SCOPES
    )
    flow.redirect_uri = current_redirect_uri
    return flow

@router.get("/login")
async def login(request: Request):
    flow = get_google_flow()
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent select_account'
    )
    db.storage.text.put(f"{SESSION_STATE_KEY_PREFIX}{state}", "valid")
    db.storage.text.put(f"{SESSION_FLOW_REDIRECT_URI}{state}", flow.redirect_uri) 

    print(f"DEBUG: ExpenseFlow Google OAuth: Generated authorization_url for client-side redirect = {authorization_url}")
    print(f"DEBUG: Saved state {state} with redirect_uri {flow.redirect_uri}")

    html_content = f"""
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Redirigiendo a Google...</title><style>
    body {{ font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f4f4f4; color: #333; text-align: center; }}
    .container {{ padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
    a {{ color: #007bff; text-decoration: none; }} a:hover {{ text-decoration: underline; }}
    </style><script type="text/javascript">
    try {{ window.location.href = "{authorization_url}"; }} catch (e) {{ console.error("Error durante la redirección automática:", e); document.getElementById("error-message").innerText = "Error al redirigir: " + e.message; }}
    </script></head><body><div class="container"><h1>Redirigiendo a Google</h1>
    <p>Estás siendo redirigido a Google para iniciar sesión de forma segura.</p>
    <p>Si la redirección no ocurre automáticamente en unos segundos, por favor <a href="{authorization_url}">haz clic aquí para continuar</a>.</p>
    <p id="error-message" style="color:red;"></p></div></body></html>
    """
    return HTMLResponse(content=html_content)

@router.get("/callback")
async def callback(request: Request): # <--- request es de FastAPI, no de google.auth.transport
    print("DEBUG: /auth-google-api/callback invoked.")
    # URL base para redirecciones de error/éxito en el frontend
    if mode == Mode.DEV:
        base_ui_url = f"https://databutton.com/_projects/{PROJECT_ID_SPECIFIC}/dbtn/devx/ui/"
    elif mode == Mode.PROD:
        # Esto necesitará la URL de la UI de producción real cuando se despliegue.
        # Ajustar según sea necesario. Si usa un dominio personalizado, esta será diferente.
        base_ui_url = f"https://{PROJECT_ID_SPECIFIC}.app.databutton.com/" # Placeholder, podría necesitar ajuste
        print(f"ADVERTENCIA: Usando URL base de UI de producción placeholder: {base_ui_url}. Verificar si es correcta.")
    else: # Fallback, aunque mode debería ser DEV o PROD
        print(f"ADVERTENCIA: Entorno desconocido '{mode}'. Usando redirect_uri de UI de desarrollo por defecto.")
        base_ui_url = f"https://databutton.com/_projects/{PROJECT_ID_SPECIFIC}/dbtn/devx/ui/"

    try: # <--- TRY GENERAL ENVOLVIENDO TODA LA FUNCIÓN
        returned_state = request.query_params.get("state")
        if not returned_state:
            print("ERROR: Missing state parameter from Google callback.")
            raise HTTPException(status_code=400, detail="Missing state parameter.")

        print(f"DEBUG: Returned state from Google: {returned_state}")

        stored_state_validity = db.storage.text.get(f"{SESSION_STATE_KEY_PREFIX}{returned_state}", default=None)
        if stored_state_validity != "valid":
            print(f"ERROR: Invalid or expired state. Returned: {returned_state}, Stored: {stored_state_validity}")
            raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")

        db.storage.text.delete(f"{SESSION_STATE_KEY_PREFIX}{returned_state}")
        # Es buena idea eliminar el redirect_uri guardado si ya no se usa directamente para reconstruir el flow aquí
        db.storage.text.delete(f"{SESSION_FLOW_REDIRECT_URI}{returned_state}")
        print(f"DEBUG: State {returned_state} validated and associated data deleted from storage.")

        flow = get_google_flow() # Obtenemos el flow para tener la config del cliente

        full_authorization_response_url = str(request.url)

        if full_authorization_response_url.startswith("http://"):
            full_authorization_response_url = "https://" + full_authorization_response_url[len("http://"):]
            print(f"DEBUG: Forced HTTPS for authorization_response_url: {full_authorization_response_url}")

        print(f"DEBUG: Attempting flow.fetch_token with full_authorization_response_url: {full_authorization_response_url}")

        try:
            flow.fetch_token(authorization_response=full_authorization_response_url)
            print("DEBUG: flow.fetch_token successful.")
        except Exception as e_fetch:
            print(f"CRITICAL_ERROR: flow.fetch_token FAILED: {str(e_fetch)}")
            # import traceback
            # print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error exchanging Google code for tokens: {str(e_fetch)}") from e_fetch

        credentials_google = flow.credentials
        if not credentials_google or not credentials_google.id_token:
            print("CRITICAL_ERROR: Failed to obtain credentials or id_token from Google after fetch_token.")
            raise HTTPException(status_code=500, detail="Could not retrieve ID token from Google.")

        try:
            if isinstance(credentials_google.id_token, str):
                print("DEBUG: credentials_google.id_token is a string. Verifying and decoding...")
                id_info = google_id_token_verifier.verify_oauth2_token(
                    credentials_google.id_token,
                    google_auth_requests.Request(),
                    GOOGLE_CLIENT_ID
                )
                print(f"DEBUG: id_token decodificado: {id_info}")
            elif isinstance(credentials_google.id_token, dict):
                print("DEBUG: credentials_google.id_token ya es un dict.")
                id_info = credentials_google.id_token
            else:
                print(f"CRITICAL_ERROR: credentials_google.id_token no es ni string ni dict: {type(credentials_google.id_token)}")
                raise ValueError("Formato de id_token inesperado.")

            user_id = id_info.get('sub')
            user_email = id_info.get('email') 
            if not user_id:
                print(f"CRITICAL_ERROR: No se pudo obtener el user_id (sub) del id_token decodificado: {id_info}")
                raise HTTPException(status_code=500, detail="No se pudo obtener el ID de usuario de Google del token.")
            print(f"DEBUG: Google User ID (sub): {user_id}, Email: {user_email}")

        except ValueError as ve: 
            print(f"CRITICAL_ERROR: Google id_token validation/decoding error: {ve}, id_token_value: {credentials_google.id_token if isinstance(credentials_google.id_token, str) else 'No es string'}")
            raise HTTPException(status_code=500, detail=f"Google ID token validation error: {ve}") from ve
        except Exception as e_id_token:
            print(f"CRITICAL_ERROR: General error processing Google id_token: {e_id_token}, id_token_value: {credentials_google.id_token if isinstance(credentials_google.id_token, str) else 'No es string'}")
            raise HTTPException(status_code=500, detail=f"Error processing Google user info: {e_id_token}") from e_id_token

        google_tokens_data = {
            'access_token': credentials_google.token,
            'refresh_token': credentials_google.refresh_token,
            'token_uri': credentials_google.token_uri,
            'client_id': credentials_google.client_id,
            'client_secret': credentials_google.client_secret, 
            'scopes': credentials_google.scopes
        }
        db.storage.json.put(f"google_tokens_{user_id}", google_tokens_data)
        if credentials_google.refresh_token:
            print(f"DEBUG: Google refresh_token for user {user_id} CAPTURED and stored.")
        else:
            print(f"ADVERTENCIA: NO Google refresh_token obtained for user {user_id} in this flow. (prompt=consent debería darlo la primera vez)")

        try:
            if not FIREBASE_ADMIN_INITIALIZED: # Check local flag
                print("CRITICAL_ERROR (auth_google_api): Firebase Admin SDK was not initialized by this module's attempt. Custom token creation will likely fail.")
                # Allow to proceed; firebase_auth_admin.create_custom_token will raise an error if not initialized,
                # which will be caught by the existing try-except block for e_fb_token.
            
            firebase_custom_token_bytes = firebase_auth_admin.create_custom_token(user_id)
            firebase_custom_token_str = firebase_custom_token_bytes.decode('utf-8') # DECODIFICAR A STRING
            print(f"DEBUG: Firebase custom_token (decoded string) created for user_id: {user_id}")
        except Exception as e_fb_token:
            print(f"CRITICAL_ERROR: Firebase custom_token creation failed: {e_fb_token}")
            raise HTTPException(status_code=500, detail=f"Firebase custom token creation error: {e_fb_token}") from e_fb_token

        firebase_signin_url = f"{base_ui_url}firebase-sign-in-page?token={firebase_custom_token_str}" # Actualizado el path
        print(f"DEBUG: SUCCESS! Redirecting to FirebaseSignInPage via HTML/JS: {firebase_signin_url}")

        # Revertir a HTMLResponse con JavaScript para la redirección, ya que RedirectResponse parece tener problemas
        # con el proxy/infraestructura cuando se redirige a un dominio/basepath diferente (UI desde API).
        html_content_success = f"""
        <!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Completando inicio de sesión...</title>
        <script type=\"text/javascript\">window.location.href = \"{firebase_signin_url}\";</script></head><body>
        <p>Estás siendo redirigido para completar tu inicio de sesión...</p>
        <p>Si la redirección no ocurre automáticamente, por favor <a href=\"{firebase_signin_url}\">haz clic aquí</a>.</p></body></html>
        """
        return HTMLResponse(content=html_content_success)

    except HTTPException as http_exc: 
        print(f"DEBUG: Callback handled HTTPException: {http_exc.status_code} - {http_exc.detail}")
        raise http_exc 
    except Exception as e_global: 
        print(f"CRITICAL_ERROR_UNHANDLED: Unhandled exception in /auth-google-api/callback: {str(e_global)}")
        # import traceback
        # print(traceback.format_exc())

        error_page_url = f"{base_ui_url}login?error=oauth_callback_failed&detail=InternalServerError"
        error_html_content = f"""
        <!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Error</title>
        <script type=\"text/javascript\">window.location.href = \"{error_page_url}\";</script></head><body>
        <p>Ocurrió un error inesperado durante el proceso de inicio de sesión. Serás redirigido a la página de login.</p>
        <p>Si la redirección no ocurre, <a href=\"{error_page_url}\">haz clic aquí</a>.</p></body></html>
        """
        return HTMLResponse(content=error_html_content, status_code=500)
    returned_state = request.query_params.get("state")
    if not returned_state:
        raise HTTPException(status_code=400, detail="Missing state parameter from Google callback.") from None

    stored_state_validity = db.storage.text.get(f"{SESSION_STATE_KEY_PREFIX}{returned_state}", default=None)
    if stored_state_validity != "valid":
        print(f"ERROR: Invalid or expired state. Returned: {returned_state}.")
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state. Please try logging in again.") from None



    credentials_google = flow.credentials
    try:
        # --- INICIO DEL CAMBIO ---
        if isinstance(credentials_google.id_token, str):
            print("DEBUG: credentials_google.id_token es un string. Verificando y decodificando...")
            # Verificar y decodificar el id_token (string JWT)
            id_info = google_id_token_verifier.verify_oauth2_token(
                credentials_google.id_token,
                google_auth_requests.Request(), # Request de transporte de google.auth
                GOOGLE_CLIENT_ID # La audiencia es nuestro client_id
            )
            print(f"DEBUG: id_token decodificado: {id_info}")
        elif isinstance(credentials_google.id_token, dict):
            # Si ya fuera un dict (poco probable según el error, pero por seguridad)
            print("DEBUG: credentials_google.id_token ya es un dict.")
            id_info = credentials_google.id_token
        else:
            print(f"CRITICAL_ERROR: credentials_google.id_token no es ni string ni dict: {type(credentials_google.id_token)}")
            raise ValueError("Formato de id_token inesperado.")
        # --- FIN DEL CAMBIO ---

        user_id = id_info.get('sub')
        user_email = id_info.get('email')
        if not user_id:
            print(f"CRITICAL_ERROR: No se pudo obtener el user_id (sub) del id_token decodificado: {id_info}")
            raise HTTPException(status_code=500, detail="No se pudo obtener el ID de usuario de Google del token.")
        print(f"DEBUG: Google User ID (sub): {user_id}, Email: {user_email}")
    except ValueError as ve: # Específicamente para errores de verify_oauth2_token
        print(f"CRITICAL_ERROR: Error de validación/decodificación del id_token de Google: {ve}, id_token_value: {credentials_google.id_token if isinstance(credentials_google.id_token, str) else 'No es string'}")
        raise HTTPException(status_code=500, detail=f"Error al validar el token de identidad de Google: {ve}") from ve
    except Exception as e: # Otras excepciones
        print(f"CRITICAL_ERROR: Error general al procesar id_token de Google: {e}, id_token_value: {credentials_google.id_token if isinstance(credentials_google.id_token, str) else 'No es string'}")
        raise HTTPException(status_code=500, detail="Error al procesar la información del usuario de Google.") from e

    google_tokens_data = {
        'access_token': credentials_google.token,
        'refresh_token': credentials_google.refresh_token,
        'token_uri': credentials_google.token_uri,
        'client_id': credentials_google.client_id,
        'client_secret': credentials_google.client_secret,
        'scopes': credentials_google.scopes
    }
    db.storage.json.put(f"google_tokens_{user_id}", google_tokens_data)
    if credentials_google.refresh_token:
        print(f"DEBUG: Refresh token for user {user_id} CAPTURADO y guardado.")
    else:
        print(f"ADVERTENCIA: NO se obtuvo refresh token para user {user_id} en este flujo.")




# Los siguientes endpoints son ejemplos y necesitarían ser adaptados/implementados correctamente.
@router.get("/get-user-info") 
async def get_user_info_placeholder(request: Request):
    # Esta es una implementación placeholder muy básica.
    # En una app real, usarías app.auth.AuthorizedUser o una dependencia similar.
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # token = auth_header.split("Bearer ")[1] # F841: Local variable `token` is assigned to but never used
        try:
            # Aquí deberías validar el token de Firebase
            # decoded_token = firebase_auth_admin.verify_id_token(token, check_revoked=True)
            # return {"user_id": decoded_token.get("uid"), "email": decoded_token.get("email")}
            return {"user_id": "placeholder_user", "email": "placeholder_email@example.com", "message": "Placeholder: Token no validado"}
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid or expired Firebase token (placeholder): {e}") from e
    raise HTTPException(status_code=401, detail="Not authenticated (placeholder)") from None

@router.post("/list-drive-files")
async def list_drive_files_placeholder(user_id: str): 
    try:
        tokens_data = db.storage.json.get(f"google_tokens_{user_id}")
        if not tokens_data:
            raise HTTPException(status_code=404, detail="Google tokens not found for user.")
        # ... (lógica de refresco y uso de credenciales como antes) ...
        return {"message": "Función de listar archivos de Drive no implementada completamente, pero las credenciales se cargarían."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al acceder a Google Drive (placeholder): {str(e)}") from e


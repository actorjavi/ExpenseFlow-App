from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
import os
import json # Added for Firebase init block consistency
from app.env import Mode, mode # For Databutton fallback logic

# Firebase Admin SDK will be initialized locally
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth_admin # auth might not be used but good for consistency

# --- BEGIN Embedded Firebase Initialization Logic for user_api ---
FIREBASE_ADMIN_INITIALIZED = False
DB_FIRESTORE_ADMIN_CLIENT = None # Local Firestore client instance

def initialize_firebase_admin_once():
    global FIREBASE_ADMIN_INITIALIZED, DB_FIRESTORE_ADMIN_CLIENT
    
    if firebase_admin._apps:
        print("INFO (user_api): Firebase Admin SDK already initialized.")
        if not DB_FIRESTORE_ADMIN_CLIENT and hasattr(firestore, "client"):
            try:
                DB_FIRESTORE_ADMIN_CLIENT = firestore.client()
            except Exception as e_firestore_client:
                 print(f"ERROR (user_api): Failed to get firestore client even if app initialized: {e_firestore_client}")
        FIREBASE_ADMIN_INITIALIZED = True
        return

    try:
        firebase_sdk_config_json_str = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
        cred_object_dict = None

        if firebase_sdk_config_json_str:
            try:
                cred_object_dict = json.loads(firebase_sdk_config_json_str)
                print("INFO (user_api): FIREBASE_SERVICE_ACCOUNT_KEY loaded and parsed from environment variable.")
            except json.JSONDecodeError as e:
                print(f"WARNING (user_api): Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from env var: {e}. Attempting fallback.")
        
        if cred_object_dict is None and mode == Mode.DEV:
            try:
                import databutton as db # Local import for fallback
                print("INFO (user_api): Attempting to load FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets as a fallback...")
                db_secret_value = db.secrets.get("FIREBASE_SERVICE_ACCOUNT_KEY")
                if isinstance(db_secret_value, dict):
                    cred_object_dict = db_secret_value
                    print("INFO (user_api): FIREBASE_SERVICE_ACCOUNT_KEY loaded from db.secrets (already a dict).")
                elif isinstance(db_secret_value, str):
                    try:
                        cred_object_dict = json.loads(db_secret_value)
                        print("INFO (user_api): FIREBASE_SERVICE_ACCOUNT_KEY loaded and parsed from db.secrets (string).")
                    except json.JSONDecodeError as e_db:
                        print(f"CRITICAL (user_api): Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets string: {e_db}")
                        return 
                elif db_secret_value is not None:
                    print("CRITICAL (user_api): FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets is not a dict or string.")
                    return
                else: # db_secret_value is None
                    print("INFO (user_api): FIREBASE_SERVICE_ACCOUNT_KEY not found in db.secrets either.")
            except ImportError:
                print("INFO (user_api): Databutton SDK not available for db.secrets fallback.")
        
        if cred_object_dict:
            cred = credentials.Certificate(cred_object_dict)
            firebase_admin.initialize_app(cred)
            if hasattr(firestore, "client"):
                DB_FIRESTORE_ADMIN_CLIENT = firestore.client()
            FIREBASE_ADMIN_INITIALIZED = True
            print("INFO (user_api): Firebase Admin SDK initialized successfully by user_api.")
        else:
            print("CRITICAL (user_api): FIREBASE_SERVICE_ACCOUNT_KEY not found. Firebase Admin SDK NOT initialized by user_api.")

    except Exception as e:
        print(f"CRITICAL (user_api): Unexpected error during Firebase Admin SDK initialization: {e}")

initialize_firebase_admin_once()

def get_firestore_client_local():
    global FIREBASE_ADMIN_INITIALIZED, DB_FIRESTORE_ADMIN_CLIENT
    if not FIREBASE_ADMIN_INITIALIZED:
        print("WARN (user_api): Firestore client requested but Firebase Admin not initialized. Attempting late initialization.")
        initialize_firebase_admin_once()
        if not FIREBASE_ADMIN_INITIALIZED:
            print("ERROR (user_api): Late Firebase Admin initialization also failed. Firestore client is unavailable.")
            return None

    if not DB_FIRESTORE_ADMIN_CLIENT and FIREBASE_ADMIN_INITIALIZED and hasattr(firestore, "client"):
        print("WARN (user_api): DB_FIRESTORE_ADMIN_CLIENT is None even after initialization. Attempting to get client again.")
        try:
            DB_FIRESTORE_ADMIN_CLIENT = firestore.client()
            if DB_FIRESTORE_ADMIN_CLIENT is None:
                 print("ERROR (user_api): firestore.client() returned None on late attempt.")
        except Exception as e:
            print(f"ERROR (user_api): Failed to get firestore client on late attempt: {e}")
            return None
            
    return DB_FIRESTORE_ADMIN_CLIENT
# --- END Embedded Firebase Initialization Logic for user_api ---

# Firebase Admin SDK is now initialized locally by the block above
firebase_db_admin = get_firestore_client_local() # Use the local getter
if firebase_db_admin:
    print("INFO (user_api): Firestore client obtained locally.")
else:
    print("ERROR (user_api): Failed to obtain Firestore client locally. API will not function correctly.")

router = APIRouter(prefix="/users", tags=["Users"])

class UserProfileResponse(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None # Keep email as it's in Firestore, might be useful

@router.get("/{user_id}/profile", response_model=UserProfileResponse)
async def get_user_profile_by_id(user_id: str):
    if not firebase_db_admin:
        print("Firestore client is not available. Cannot fetch user profile.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase service is not configured or unavailable."
        )

    try:
        profile_doc_ref = firebase_db_admin.collection("user_profiles").document(user_id)
        profile_doc = await profile_doc_ref.get() # Use await for async operation

        if profile_doc.exists:
            profile_data = profile_doc.to_dict()
            return UserProfileResponse(
                firstName=profile_data.get("firstName"),
                lastName=profile_data.get("lastName"),
                email=profile_data.get("email") # Include email as it's part of the stored profile
            )
        else:
            # Fallback: Try to get user from Firebase Auth directly if needed in future,
            # but for now, if not in user_profiles, it's a 404 for this endpoint.
            # This assumes 'user_profiles' is the source of truth for names.
            print(f"User profile not found in Firestore for user_id: {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User profile for user ID {user_id} not found.")
    except Exception as e:
        print(f"Error fetching user profile for {user_id} from Firestore: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching the user profile: {str(e)}"
        )

# To include this router in the main FastAPI app, ensure it's added in src/main.py
# (Databutton's framework usually handles this automatically if placed in app/apis)


from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel 
from app.auth import AuthorizedUser 
import os
import datetime
import json # For Firebase init block consistency
from app.env import Mode, mode
# Firebase Admin SDK will be initialized locally
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_admin_auth 

# --- BEGIN Embedded Firebase Initialization Logic for user_deletion_service ---
FIREBASE_ADMIN_INITIALIZED = False # Global for this module
DB_FIRESTORE_ADMIN_CLIENT = None # Local Firestore client instance, global for this module

def initialize_firebase_admin_once():
    global FIREBASE_ADMIN_INITIALIZED, DB_FIRESTORE_ADMIN_CLIENT
    
    if firebase_admin._apps:
        print("INFO (user_deletion_service): Firebase Admin SDK already initialized.")
        if not DB_FIRESTORE_ADMIN_CLIENT and hasattr(firestore, "client"):
            try:
                DB_FIRESTORE_ADMIN_CLIENT = firestore.client()
            except Exception as e_firestore_client:
                 print(f"ERROR (user_deletion_service): Failed to get firestore client even if app initialized: {e_firestore_client}")
        FIREBASE_ADMIN_INITIALIZED = True
        return

    try:
        firebase_sdk_config_json_str = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
        cred_object_dict = None

        if firebase_sdk_config_json_str:
            try:
                cred_object_dict = json.loads(firebase_sdk_config_json_str)
                print("INFO (user_deletion_service): FIREBASE_SERVICE_ACCOUNT_KEY loaded from env var.")
            except json.JSONDecodeError as e:
                print(f"WARNING (user_deletion_service): Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from env var: {e}. Fallback.")
        
        if cred_object_dict is None and mode == Mode.DEV:
            try:
                import databutton as db # Local import for fallback
                print("INFO (user_deletion_service): Attempting to load FIREBASE_SERVICE_ACCOUNT_KEY from db.secrets...")
                db_secret_value = db.secrets.get("FIREBASE_SERVICE_ACCOUNT_KEY")
                if isinstance(db_secret_value, dict):
                    cred_object_dict = db_secret_value
                    print("INFO (user_deletion_service): FIREBASE_SERVICE_ACCOUNT_KEY loaded from db.secrets (dict).")
                elif isinstance(db_secret_value, str):
                    try:
                        cred_object_dict = json.loads(db_secret_value)
                        print("INFO (user_deletion_service): FIREBASE_SERVICE_ACCOUNT_KEY loaded from db.secrets (string).")
                    except json.JSONDecodeError as e_db:
                        print(f"CRITICAL (user_deletion_service): Failed to parse from db.secrets string: {e_db}")
                        return 
                elif db_secret_value is not None:
                    print("CRITICAL (user_deletion_service): Key from db.secrets is not dict/string.")
                    return
                else: 
                    print("INFO (user_deletion_service): Key not found in db.secrets.")
            except ImportError:
                print("INFO (user_deletion_service): Databutton SDK not available for fallback.")
        
        if cred_object_dict:
            cred = credentials.Certificate(cred_object_dict)
            firebase_admin.initialize_app(cred)
            if hasattr(firestore, "client"):
                DB_FIRESTORE_ADMIN_CLIENT = firestore.client()
            FIREBASE_ADMIN_INITIALIZED = True
            print("INFO (user_deletion_service): Firebase Admin SDK initialized by user_deletion_service.")
        else:
            print("CRITICAL (user_deletion_service): Key not found. Firebase NOT initialized.")

    except Exception as e:
        print(f"CRITICAL (user_deletion_service): Firebase Admin SDK initialization error: {e}")

initialize_firebase_admin_once()

def get_firestore_client_local():
    global FIREBASE_ADMIN_INITIALIZED, DB_FIRESTORE_ADMIN_CLIENT
    if not FIREBASE_ADMIN_INITIALIZED:
        print("WARN (user_deletion_service): Firestore client requested but Firebase not initialized. Late attempt...")
        initialize_firebase_admin_once()
        if not FIREBASE_ADMIN_INITIALIZED:
            print("ERROR (user_deletion_service): Late Firebase init failed. Firestore client unavailable.")
            return None

    if not DB_FIRESTORE_ADMIN_CLIENT and FIREBASE_ADMIN_INITIALIZED and hasattr(firestore, "client"):
        print("WARN (user_deletion_service): DB_FIRESTORE_ADMIN_CLIENT is None. Getting client again...")
        try:
            DB_FIRESTORE_ADMIN_CLIENT = firestore.client()
            if DB_FIRESTORE_ADMIN_CLIENT is None:
                 print("ERROR (user_deletion_service): firestore.client() returned None on late attempt.")
        except Exception as e:
            print(f"ERROR (user_deletion_service): Failed to get firestore client on late attempt: {e}")
            return None
            
    return DB_FIRESTORE_ADMIN_CLIENT
# --- END Embedded Firebase Initialization Logic for user_deletion_service ---

# Update global variables for this module based on the embedded initialization
db_firestore_admin_client = get_firestore_client_local() # Use the local getter
# FIREBASE_ADMIN_INITIALIZED is already set by the init block and is global to this module

if db_firestore_admin_client and FIREBASE_ADMIN_INITIALIZED:
    print("INFO (user_deletion_service): Firestore client obtained locally and Firebase Admin is initialized.")
else:
    print("ERROR (user_deletion_service): Failed to obtain Firestore client locally or Firebase not initialized.")

router = APIRouter(
    prefix="/user-deletion", 
    tags=["User Deletion"],
)

class AccountDeletionResponse(BaseModel): 
    message: str
    email: str | None = None

@router.post("/request-deletion", response_model=AccountDeletionResponse)
async def request_account_deletion(current_user: AuthorizedUser):
    # Use the global FIREBASE_ADMIN_INITIALIZED from the init block
    if not FIREBASE_ADMIN_INITIALIZED or not db_firestore_admin_client:
        print("CRITICAL: User deletion endpoint called but Firebase Admin SDK is not initialized.")
        raise HTTPException(
            status_code=503, # Service Unavailable
            detail="Server configuration error: User deletion service is currently unavailable. Please contact support."
        )

    user_uid = current_user.sub
    user_email = current_user.email 

    if not user_email:
        print(f"Attempted account deletion for UID {user_uid} but email was missing in AuthorizedUser.")
        raise HTTPException(status_code=400, detail="User email not available in token.")

    print(f"Initiating account deletion process for UID: {user_uid}, Email: {user_email}")

    try:
        deleted_user_log_ref = db_firestore_admin_client.collection("deleted_user_logs").document(user_uid)
        log_data = {
            "email": user_email,
            "deletedAt": datetime.datetime.now(datetime.timezone.utc),
            "dataDeletionStatus": "PENDING_ADMIN_ACTION", 
            "userId": user_uid
        }
        deleted_user_log_ref.set(log_data)
        print(f"Deletion request logged for {user_email} (UID: {user_uid}). Status: PENDING_ADMIN_ACTION")

        user_profile_ref = db_firestore_admin_client.collection("user_profiles").document(user_uid)
        if user_profile_ref.get().exists:
            user_profile_ref.delete()
            print(f"User profile deleted from Firestore for UID: {user_uid}")
        else:
            print(f"User profile for UID: {user_uid} not found in Firestore, skipping deletion.")

        try:
            firebase_admin_auth.delete_user(user_uid)
            print(f"User UID: {user_uid} deleted from Firebase Authentication.")
        except firebase_admin_auth.UserNotFoundError:
            print(f"User UID: {user_uid} not found in Firebase Authentication. Might have been already deleted.")
        
        return AccountDeletionResponse(
            message="Account deletion process initiated. Your access will be revoked shortly.",
            email=user_email
        )

    except Exception as e:
        print(f"CRITICAL: Unexpected error during account deletion for UID {user_uid}, Email {user_email}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing your account deletion request. Please contact support."
        )

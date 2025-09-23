from pydantic import BaseModel, Field, model_validator

DEFAULT_KM_RATE = 0.14
from typing import List, Literal, Optional
import uuid
import datetime
import re  # Added for sanitize_storage_key
import databutton as db  # Added for Databutton SDK
from fastapi import APIRouter, HTTPException, status  # Added status for HTTP status codes
import json  # Added for loading JSON strings
from app.auth import AuthorizedUser  # Ensure AuthorizedUser is imported at the top
# Attempt to import Firestore client and initialization status from user_deletion_service
# This is not ideal, but it's where the initialization currently resides.
# A better approach would be to have a central firebase_setup module.
try:
    from app.apis.user_deletion_service import db_firestore_admin_client, firebase_admin_initialized
except ImportError:
    # Fallback if the import fails, to prevent crashing the whole API module if user_deletion_service is changed/moved
    print("WARNING: Could not import db_firestore_admin_client or firebase_admin_initialized from user_deletion_service. Firestore lookups for user_name will be skipped.")
    db_firestore_admin_client = None
    firebase_admin_initialized = False


# Define allowed statuses for ExpenseSheet
ExpenseSheetStatus = Literal["pending_validation", "validated", "rejected"]

# --- Helper function for storage keys ---
def sanitize_storage_key(key: str) -> str:
    """Sanitize storage key to only allow alphanumeric and ._- symbols"""
    return re.sub(r'[^a-zA-Z0-9._-]', '', key)

def get_expense_sheet_storage_key(sheet_id: str) -> str:
    """Returns the db.storage key for an expense sheet."""
    return sanitize_storage_key(f"expense_sheet_{sheet_id}.json")

class ExpenseEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    expense_sheet_id: str # This will be the ID of the parent ExpenseSheet
    
    # Fields for new structure
    entry_date: Optional[datetime.date] = None # Made optional to handle old data gracefully
    merchant_name: Optional[str] = None 
    payment_method: Optional[str] = None # Should ideally be required, but for old data might be missing if structure changed drastically
    
    project: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    
    receipt_google_drive_id: Optional[str] = None
    receipt_google_drive_web_view_link: Optional[str] = None 
    receipt_google_drive_web_content_link: Optional[str] = None
    receipt_google_drive_file_name: Optional[str] = None # MYA-31: Add field for file name

    # Category specific amounts - default to None if not present in old data
    parking_amount: Optional[float] = Field(default=None, description="Parking cost")
    taxi_amount: Optional[float] = Field(default=None, description="Taxi cost")
    transport_amount: Optional[float] = Field(default=None, description="Cost for flight/train/car rental")
    hotel_amount: Optional[float] = Field(default=None, description="Hotel room cost")
    lunch_amount: Optional[float] = Field(default=None, description="Lunch cost")
    dinner_amount: Optional[float] = Field(default=None, description="Dinner cost")
    miscellaneous_amount: Optional[float] = Field(default=None, description="Miscellaneous costs")
    
    # Kilometrage - default to None
    kilometers: Optional[float] = Field(default=None, description="Kilometers driven")
    km_rate: Optional[float] = Field(default=None, description="Rate per kilometer for this entry, defaults to DEFAULT_KM_RATE if not provided")
    
    # Calculated fields - default to None
    km_amount: Optional[float] = Field(default=None, description="Calculated: kilometers * km_rate")
    daily_total: Optional[float] = Field(default=None, description="Calculated: sum of all category amounts + km_amount")
    
    # For backward compatibility with old data that used purchase_date
    purchase_date: Optional[datetime.date] = None 

    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    @model_validator(mode='before')
    def _handle_date_compatibility(cls, data):
        if isinstance(data, dict):
            if 'entry_date' not in data and 'purchase_date' in data:
                data['entry_date'] = data['purchase_date']
            # Ensure essential fields for calculation have defaults if completely missing, Pydantic handles Optional for most
            # For example, if payment_method was critical and missing, you could default it here:
            # if 'payment_method' not in data or data['payment_method'] is None:
            #     data['payment_method'] = "unknown" # Or some sensible default
        return data

class ExpenseEntryUpdateRequest(BaseModel):
    """Request model for updating an expense entry. All fields are optional."""
    new_sheet_id: Optional[str] = Field(default=None, description="If provided and different from current sheet_id, the entry will be moved to this new sheet.") # MYA-32: Allow moving entry
    merchant_name: Optional[str] = None
    entry_date: Optional[datetime.date] = None # Changed from purchase_date
    payment_method: Optional[str] = None
    
    project: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    
    receipt_google_drive_id: Optional[str] = None
    receipt_google_drive_web_view_link: Optional[str] = None 
    receipt_google_drive_web_content_link: Optional[str] = None
    receipt_google_drive_file_name: Optional[str] = None # MYA-31: Add field for file name

    parking_amount: Optional[float] = None
    taxi_amount: Optional[float] = None
    transport_amount: Optional[float] = None
    hotel_amount: Optional[float] = None
    lunch_amount: Optional[float] = None
    dinner_amount: Optional[float] = None
    miscellaneous_amount: Optional[float] = None
    
    kilometers: Optional[float] = None
    km_rate: Optional[float] = None 
    # Calculated fields (km_amount, daily_total) are not part of update request, they are derived.

class ExpenseSheetCreateRequest(BaseModel):
    """Request model for creating an expense sheet."""
    name: str
    month: int # e.g., 5
    year: int # e.g., 2025
    currency: str # e.g., "EUR", "USD"
    payment_method_filter: Literal["TARJETA", "EFECTIVO"] # Made mandatory
    user_name: Optional[str] = None  # MYA-31: Add user name
    anticipo: Optional[float] = Field(default=0.0) # MYA-31: Add advance payment

class ExpenseEntryCreateRequest(BaseModel):
    """Request model for creating an expense entry."""
    merchant_name: Optional[str] = None # Kept for potential future OCR use
    entry_date: datetime.date # Changed from purchase_date
    payment_method: str
    
    project: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    
    receipt_google_drive_id: Optional[str] = None
    receipt_google_drive_web_view_link: Optional[str] = None 
    receipt_google_drive_web_content_link: Optional[str] = None
    receipt_google_drive_file_name: Optional[str] = None # MYA-31: Add field for file name

    parking_amount: Optional[float] = None
    taxi_amount: Optional[float] = None
    transport_amount: Optional[float] = None
    hotel_amount: Optional[float] = None
    lunch_amount: Optional[float] = None
    dinner_amount: Optional[float] = None
    miscellaneous_amount: Optional[float] = None
    
    kilometers: Optional[float] = None
    km_rate: Optional[float] = None # If not provided by client, DEFAULT_KM_RATE will be used for calculation
    # Calculated fields (km_amount, daily_total) are not part of create request, they are derived.

class ExpenseSheetUpdateRequest(BaseModel):
    """Request model for updating an expense sheet. Fields are optional for partial updates,
       but if payment_method_filter is provided, it must conform to the Literal.
    """
    name: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None
    currency: Optional[str] = None
    # If payment_method_filter is part of the update, it must be TARJETA or EFECTIVO.
    # If it's not part of the payload, it won't be updated.
    # This maintains PATCH-like behavior for this specific field if we want to allow changing it.
    # If the requirement is that once set, it can't be unset or only changed to the other valid literal,
    # then the endpoint logic needs to enforce that. For now, making it Optional[Literal[...]]
    # means if you provide it, it's validated, if you don't, it's not touched.
    payment_method_filter: Optional[Literal["TARJETA", "EFECTIVO"]] = None 
    status: Optional[ExpenseSheetStatus] = None
    comments: Optional[str] = None
    user_name: Optional[str] = None  # MYA-31: Add user name for update
    anticipo: Optional[float] = None   # MYA-31: Add advance payment for update

class ExpenseSheet(BaseModel):
    creator_first_name: Optional[str] = None # MYA-37.1: Store creator's first name
    creator_last_name: Optional[str] = None  # MYA-37.1: Store creator's last name
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    month: int # e.g., 5
    year: int # e.g., 2025
    currency: str # e.g., "EUR", "USD"
    payment_method_filter: Optional[str] = None # Reverted to Optional[str] for loading old data
    status: ExpenseSheetStatus = "pending_validation"
    comments: Optional[str] = None # For validation feedback, rejection reasons
    user_name: Optional[str] = None # MYA-31: Add user name to main model
    anticipo: float = Field(default=0.0) # MYA-31: Add advance payment to main model
    user_id: Optional[str] = None # To store the Firebase UID of the creator. IMPORTANT: This will be populated.
    total_amount: float = 0.0 # Calculated sum of its entries
    entries: List[ExpenseEntry] = [] # Holds the actual expense entries
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

router = APIRouter(
    prefix="/expense-management",
    tags=["Expense Management"]
)

@router.post("/expense-sheets", response_model=ExpenseSheet, status_code=status.HTTP_201_CREATED)
def create_expense_sheet(sheet_data: ExpenseSheetCreateRequest, user: AuthorizedUser) -> ExpenseSheet:
    """Creates a new expense sheet."""
    user_id = user.sub  # UID del usuario autenticado

    # The user_name is no longer stored in the ExpenseSheet.
    # It will be fetched dynamically when needed (e.g., for display or export)
    # using the user_id.

    final_creator_first_name: Optional[str] = None
    final_creator_last_name: Optional[str] = None

    if firebase_admin_initialized and db_firestore_admin_client:
        try:
            profile_ref = db_firestore_admin_client.collection("user_profiles").document(user_id)
            profile_doc = profile_ref.get()
            if profile_doc.exists:
                profile_data = profile_doc.to_dict()
                final_creator_first_name = profile_data.get("firstName")
                final_creator_last_name = profile_data.get("lastName")
                print(f"Fetched profile for {user_id}: First Name: {final_creator_first_name}, Last Name: {final_creator_last_name}")
            else:
                print(f"Profile document not found for user_id: {user_id} in 'profiles' collection.")
        except Exception as e:
            print(f"Error fetching user profile from Firestore for user_id {user_id}: {e}")
            # Not raising an error, will proceed with None for names

    new_sheet_id = str(uuid.uuid4())
    expense_sheet = ExpenseSheet(
        id=new_sheet_id,
        name=sheet_data.name,
        month=sheet_data.month,
        year=sheet_data.year,
        currency=sheet_data.currency,
        payment_method_filter=sheet_data.payment_method_filter,
        user_id=user_id,  # Storing the authenticated user's ID
        creator_first_name=final_creator_first_name, # MYA-37.1
        creator_last_name=final_creator_last_name,   # MYA-37.1
        anticipo=sheet_data.anticipo if sheet_data.anticipo is not None else 0.0,
        # user_name is effectively removed from active population
    )
    storage_key = get_expense_sheet_storage_key(expense_sheet.id)
    try:
        db.storage.json.put(storage_key, expense_sheet.model_dump(mode='json'))
        print(f"Expense sheet {expense_sheet.id} created and saved to {storage_key}")
        return expense_sheet
    except Exception as e:
        print(f"Error saving expense sheet {expense_sheet.id} to {storage_key}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create expense sheet: {str(e)}") from e

@router.get("/expense-sheets", response_model=List[ExpenseSheet])
def list_expense_sheets() -> List[ExpenseSheet]:
    """Lists all expense sheets."""
    expense_sheets: List[ExpenseSheet] = []
    try:
        sheet_files = db.storage.json.list()
        for sheet_file in sheet_files:
            # Basic filtering to ensure we only process expected expense sheet files
            if sheet_file.name.startswith("expense_sheet_") and sheet_file.name.endswith(".json"):
                try:
                    sheet_file_data_raw = db.storage.json.get(sheet_file.name)
                    if sheet_file_data_raw:
                        if isinstance(sheet_file_data_raw, str):
                            # Data is a JSON string, needs parsing
                            sheet_data_dict = json.loads(sheet_file_data_raw)
                        elif isinstance(sheet_file_data_raw, dict):
                            # Data is already a dictionary
                            sheet_data_dict = sheet_file_data_raw
                        else:
                            # Unexpected data type
                            print(f"Warning: Unexpected data type for {sheet_file.name}: {type(sheet_file_data_raw)}")
                            continue # Skip this file
                        expense_sheets.append(ExpenseSheet(**sheet_data_dict))
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON for {sheet_file.name}: {e}. Content was: {sheet_file_data_raw[:500]}") # Log part of the content
                except Exception as e:
                    # Log other errors for this specific file but continue with others
                    print(f"Error processing expense sheet file {sheet_file.name}: {e}")
        return expense_sheets
    except Exception as e:
        print(f"Error listing expense sheets: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to list expense sheets: {str(e)}") from e

@router.get("/expense-sheets/{sheet_id}", response_model=ExpenseSheet)
def get_expense_sheet_by_id(sheet_id: str) -> ExpenseSheet:
    """Retrieves a specific expense sheet by its ID. 
    If the stored total_amount is inconsistent with the sum of its entries' daily_totals,
    it recalculates, saves, and returns the updated sheet.
    """
    storage_key = get_expense_sheet_storage_key(sheet_id)
    try:
        sheet_data_raw = db.storage.json.get(storage_key)
        if not sheet_data_raw:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.")
        
        sheet_data_dict: dict
        if isinstance(sheet_data_raw, str):
            try:
                sheet_data_dict = json.loads(sheet_data_raw)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON for sheet {sheet_id}: {e}. Content: {sheet_data_raw[:500]}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid JSON format for sheet {sheet_id}.") from e
        elif isinstance(sheet_data_raw, dict):
            sheet_data_dict = sheet_data_raw
        else:
            print(f"Warning: Unexpected data type for sheet {sheet_id}: {type(sheet_data_raw)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected data type for sheet {sheet_id}.")

        sheet = ExpenseSheet(**sheet_data_dict)
        
        # Check for inconsistency: if any entry has daily_total=None but sheet.total_amount is not 0,
        # or if the sum of daily_totals doesn't match sheet.total_amount.
        # This handles old sheets that haven't had their totals recalculated since daily_total was introduced.
        expected_total = sum(entry.daily_total for entry in sheet.entries if entry.daily_total is not None)
        
        # Trigger recalculation and save if: 
        # 1. The stored total_amount is different from the expected_total.
        # 2. A more subtle case: if all entries have daily_total=None (so expected_total is 0), 
        #    but the sheet.total_amount is still some old non-zero value.
        needs_recalculation_and_save = False
        if sheet.total_amount != expected_total:
            needs_recalculation_and_save = True
        elif expected_total == 0 and sheet.total_amount != 0 and any(entry.daily_total is None for entry in sheet.entries):
            # This specifically catches old sheets with non-zero totals where all entries now effectively have zero daily_total
            needs_recalculation_and_save = True

        if needs_recalculation_and_save:
            print(f"Recalculating total for sheet {sheet_id}. Old total: {sheet.total_amount}, New expected: {expected_total}")
            _recalculate_sheet_total(sheet) # This updates sheet.total_amount in memory
            sheet.updated_at = datetime.datetime.utcnow() # Update timestamp as data changed
            db.storage.json.put(storage_key, sheet.model_dump(mode='json')) # Save the corrected sheet
            print(f"Sheet {sheet_id} updated with new total: {sheet.total_amount}")
            
        return sheet

    except FileNotFoundError: 
        print(f"File not found for expense sheet {sheet_id} at {storage_key} - this should ideally be caught by the check above.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.") from None
    except Exception as e:
        print(f"Error retrieving expense sheet {sheet_id} from {storage_key}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve expense sheet: {str(e)}") from e

@router.put("/expense-sheets/{sheet_id}", response_model=ExpenseSheet)
def update_expense_sheet(sheet_id: str, sheet_update_data: ExpenseSheetUpdateRequest, user: AuthorizedUser) -> ExpenseSheet:
    """Updates an existing expense sheet."""
    storage_key = get_expense_sheet_storage_key(sheet_id)
    try:
        current_sheet_data_raw = db.storage.json.get(storage_key)
        if not current_sheet_data_raw:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found for update.")
        
        current_sheet_dict: dict
        if isinstance(current_sheet_data_raw, str):
            try:
                current_sheet_dict = json.loads(current_sheet_data_raw)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON for sheet {sheet_id} during update: {e}. Content: {current_sheet_data_raw[:500]}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid JSON format for sheet {sheet_id}.") from e
        elif isinstance(current_sheet_data_raw, dict):
            current_sheet_dict = current_sheet_data_raw
        else:
            print(f"Warning: Unexpected data type for sheet {sheet_id} during update: {type(current_sheet_data_raw)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected data type for sheet {sheet_id}.")

        updated_sheet = ExpenseSheet(**current_sheet_dict)
        update_data = sheet_update_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "user_name":
                # For now, allow explicit update of user_name via payload if provided
                # This will be refined once Firestore integration is in place
                setattr(updated_sheet, key, value if value else f"Usuario (payload update, UID: {user.sub[:8]}...)")
            elif hasattr(updated_sheet, key):
                setattr(updated_sheet, key, value)
        
        updated_sheet.updated_at = datetime.datetime.utcnow()
        
        db.storage.json.put(storage_key, updated_sheet.model_dump(mode='json'))
        print(f"Expense sheet {updated_sheet.id} updated and saved to {storage_key}")
        return updated_sheet
    except FileNotFoundError: 
        print(f"File not found for expense sheet {sheet_id} at {storage_key} during update - this should be caught by the check above.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.") from None
    except Exception as e:
        print(f"Error updating expense sheet {sheet_id} at {storage_key}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update expense sheet: {str(e)}") from e

@router.delete("/expense-sheets/{sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense_sheet(sheet_id: str):
    """Deletes an expense sheet by its ID."""
    storage_key = get_expense_sheet_storage_key(sheet_id)
    try:
        # Check if sheet exists before attempting delete
        sheet_data_raw = db.storage.json.get(storage_key, default=None)
        if not sheet_data_raw:
            print(f"Expense sheet {sheet_id} not found for deletion at {storage_key}.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.")

        # At this point, we know the file exists, so we can proceed to delete.
        # No need to parse its content fully if we're just deleting.
        db.storage.json.delete(storage_key)
        print(f"Expense sheet {sheet_id} deleted from {storage_key}")
        return # For 204 No Content, FastAPI expects no return body
    except FileNotFoundError: # Defensive, as get should catch it.
        print(f"Expense sheet {sheet_id} not found (FileNotFound) at {storage_key} during delete.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.") from None
    except Exception as e:
        print(f"Error deleting expense sheet {sheet_id} from {storage_key}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete expense sheet: {str(e)}") from e

# --- Helper function to recalculate total ---
def _recalculate_sheet_total(sheet: ExpenseSheet) -> None:
    """Recalculates the total_amount of an expense sheet based on its entries."""
    sheet.total_amount = sum(entry.daily_total for entry in sheet.entries if entry.daily_total is not None)

# --- Endpoints for Expense Entries ---
@router.post("/expense-sheets/{sheet_id}/entries", response_model=ExpenseSheet, status_code=status.HTTP_201_CREATED)
def add_expense_entry_to_sheet(sheet_id: str, entry_data: ExpenseEntryCreateRequest) -> ExpenseSheet:
    """Adds a new expense entry to a specific expense sheet."""
    storage_key = get_expense_sheet_storage_key(sheet_id)
    try:
        current_sheet_data_raw = db.storage.json.get(storage_key)
        if not current_sheet_data_raw:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.")
        
        current_sheet_dict: dict
        if isinstance(current_sheet_data_raw, str):
            try:
                current_sheet_dict = json.loads(current_sheet_data_raw)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON for sheet {sheet_id} when adding entry: {e}. Content: {current_sheet_data_raw[:500]}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid JSON format for sheet {sheet_id}.") from e
        elif isinstance(current_sheet_data_raw, dict):
            current_sheet_dict = current_sheet_data_raw
        else:
            print(f"Warning: Unexpected data type for sheet {sheet_id} when adding entry: {type(current_sheet_data_raw)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected data type for sheet {sheet_id}.")

        sheet = ExpenseSheet(**current_sheet_dict)
        
        new_entry_id = str(uuid.uuid4())
        
        # Calculate km_amount
        km_amount_calculated = 0.0
        current_km_rate = entry_data.km_rate if entry_data.km_rate is not None else DEFAULT_KM_RATE
        if entry_data.kilometers is not None and entry_data.kilometers > 0:
            km_amount_calculated = entry_data.kilometers * current_km_rate
        
        # Calculate daily_total
        category_amounts = [
            entry_data.parking_amount,
            entry_data.taxi_amount,
            entry_data.transport_amount,
            entry_data.hotel_amount,
            entry_data.lunch_amount,
            entry_data.dinner_amount,
            entry_data.miscellaneous_amount
        ]
        daily_total_calculated = sum(amount for amount in category_amounts if amount is not None) + km_amount_calculated
        
        expense_entry = ExpenseEntry(
            id=new_entry_id,
            expense_sheet_id=sheet_id, 
            merchant_name=entry_data.merchant_name,
            entry_date=entry_data.entry_date, # Changed from purchase_date
            payment_method=entry_data.payment_method,
            project=entry_data.project,
            company=entry_data.company,
            location=entry_data.location,
            receipt_google_drive_id=entry_data.receipt_google_drive_id,
            receipt_google_drive_web_view_link=entry_data.receipt_google_drive_web_view_link,
            receipt_google_drive_web_content_link=entry_data.receipt_google_drive_web_content_link,
            receipt_google_drive_file_name=entry_data.receipt_google_drive_file_name, # MYA-31: Add field
            parking_amount=entry_data.parking_amount,
            taxi_amount=entry_data.taxi_amount,
            transport_amount=entry_data.transport_amount,
            hotel_amount=entry_data.hotel_amount,
            lunch_amount=entry_data.lunch_amount,
            dinner_amount=entry_data.dinner_amount,
            miscellaneous_amount=entry_data.miscellaneous_amount,
            kilometers=entry_data.kilometers,
            km_rate=current_km_rate, # Store the rate used for calculation
            km_amount=km_amount_calculated,
            daily_total=daily_total_calculated
        )
        
        sheet.entries.append(expense_entry)
        _recalculate_sheet_total(sheet) # This will now use entry.daily_total
        sheet.updated_at = datetime.datetime.utcnow()
        
        db.storage.json.put(storage_key, sheet.model_dump_json())
        print(f"Expense entry {expense_entry.id} added to sheet {sheet.id}. Sheet updated.")
        return sheet
        
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.") from None
    except Exception as e:
        print(f"Error adding expense entry to sheet {sheet_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add entry: {str(e)}") from e

@router.get("/expense-sheets/{sheet_id}/entries/{entry_id}", response_model=ExpenseEntry)
def get_expense_entry_from_sheet(sheet_id: str, entry_id: str) -> ExpenseEntry:
    """Retrieves a specific expense entry from an expense sheet."""
    storage_key = get_expense_sheet_storage_key(sheet_id)
    try:
        current_sheet_data_raw = db.storage.json.get(storage_key)
        if not current_sheet_data_raw:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.")
        
        current_sheet_dict: dict
        if isinstance(current_sheet_data_raw, str):
            try:
                current_sheet_dict = json.loads(current_sheet_data_raw)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON for sheet {sheet_id} when getting entry: {e}. Content: {current_sheet_data_raw[:500]}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid JSON format for sheet {sheet_id}.") from e
        elif isinstance(current_sheet_data_raw, dict):
            current_sheet_dict = current_sheet_data_raw
        else:
            print(f"Warning: Unexpected data type for sheet {sheet_id} when getting entry: {type(current_sheet_data_raw)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected data type for sheet {sheet_id}.")

        sheet = ExpenseSheet(**current_sheet_dict)
        found_entry = next((entry for entry in sheet.entries if entry.id == entry_id), None)
        
        if not found_entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense entry with ID {entry_id} not found in sheet {sheet_id}.")
        return found_entry

    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.") from None
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get entry: {str(e)}") from e

@router.put("/expense-sheets/{sheet_id}/entries/{entry_id}", response_model=ExpenseSheet)
def update_expense_entry_in_sheet(sheet_id: str, entry_id: str, entry_update_data: ExpenseEntryUpdateRequest) -> ExpenseSheet:
    """Updates an existing expense entry. If entry_update_data.new_sheet_id is provided 
       and is different from the current sheet_id, the entry will be moved to the new sheet."""
    
    # Get the original sheet
    original_storage_key = get_expense_sheet_storage_key(sheet_id)
    try:
        original_sheet_data = db.storage.json.get(original_storage_key)
        if not original_sheet_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Original expense sheet with ID {sheet_id} not found.")
        original_sheet = ExpenseSheet(**original_sheet_data)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Original expense sheet {sheet_id} not found (FileNotFound).") from None
    except Exception as e:
        print(f"Error retrieving original sheet {sheet_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error retrieving original sheet: {str(e)}") from e

    # Find the entry to update in the original sheet
    entry_to_update = None
    entry_index_in_original = -1
    for i, entry in enumerate(original_sheet.entries):
        if entry.id == entry_id:
            entry_to_update = entry
            entry_index_in_original = i
            break
    
    if not entry_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense entry ID {entry_id} not found in original sheet {sheet_id}.")

    # --- Apply updates to the entry object ---
    update_payload_dict = entry_update_data.model_dump(exclude_unset=True, exclude={"new_sheet_id"}) # Exclude new_sheet_id for direct field update
    for key, value in update_payload_dict.items():
        if hasattr(entry_to_update, key):
            setattr(entry_to_update, key, value)
    
    # --- Recalculate amounts for the entry ---
    # Determine the km_rate to use
    if "km_rate" in update_payload_dict and update_payload_dict["km_rate"] is not None:
        current_km_rate_for_calc = update_payload_dict["km_rate"]
    elif entry_to_update.km_rate is not None:
        current_km_rate_for_calc = entry_to_update.km_rate
    else:
        current_km_rate_for_calc = DEFAULT_KM_RATE
    entry_to_update.km_rate = current_km_rate_for_calc # Store the rate used

    # Recalculate km_amount
    entry_to_update.km_amount = 0.0
    if entry_to_update.kilometers is not None and entry_to_update.kilometers > 0:
        entry_to_update.km_amount = entry_to_update.kilometers * current_km_rate_for_calc
    
    # Recalculate daily_total
    category_amounts_updated = [
        entry_to_update.parking_amount, entry_to_update.taxi_amount, entry_to_update.transport_amount,
        entry_to_update.hotel_amount, entry_to_update.lunch_amount, entry_to_update.dinner_amount,
        entry_to_update.miscellaneous_amount
    ]
    entry_to_update.daily_total = sum(amount for amount in category_amounts_updated if amount is not None) + (entry_to_update.km_amount or 0.0)
    
    # Handle receipt Google Drive fields consistency if ID changes or is cleared
    if "receipt_google_drive_id" in update_payload_dict:
        if update_payload_dict["receipt_google_drive_id"] is None:
            entry_to_update.receipt_google_drive_web_view_link = None
            entry_to_update.receipt_google_drive_web_content_link = None
            entry_to_update.receipt_google_drive_file_name = None
        else:
            if "receipt_google_drive_web_view_link" not in update_payload_dict: entry_to_update.receipt_google_drive_web_view_link = None
            if "receipt_google_drive_web_content_link" not in update_payload_dict: entry_to_update.receipt_google_drive_web_content_link = None
            if "receipt_google_drive_file_name" not in update_payload_dict and entry_to_update.receipt_google_drive_id != update_payload_dict["receipt_google_drive_id"]:
                entry_to_update.receipt_google_drive_file_name = None 
    elif "receipt_google_drive_file_name" in update_payload_dict and update_payload_dict["receipt_google_drive_file_name"] is None:
        if entry_to_update.receipt_google_drive_id is None:
            entry_to_update.receipt_google_drive_web_view_link = None
            entry_to_update.receipt_google_drive_web_content_link = None

    entry_to_update.updated_at = datetime.datetime.utcnow()

    # --- Handle moving the entry if new_sheet_id is provided and different ---
    if entry_update_data.new_sheet_id and entry_update_data.new_sheet_id != sheet_id:
        new_sheet_id_from_payload = entry_update_data.new_sheet_id
        new_storage_key = get_expense_sheet_storage_key(new_sheet_id_from_payload)

        # Get the new sheet
        try:
            new_sheet_data = db.storage.json.get(new_storage_key)
            if not new_sheet_data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Destination expense sheet with ID {new_sheet_id_from_payload} not found.")
            new_sheet = ExpenseSheet(**new_sheet_data)
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Destination sheet {new_sheet_id_from_payload} not found (FileNotFound).") from None
        except Exception as e:
            print(f"Error retrieving destination sheet {new_sheet_id_from_payload}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error retrieving destination sheet: {str(e)}") from e

        # Remove entry from original sheet
        original_sheet.entries.pop(entry_index_in_original)
        _recalculate_sheet_total(original_sheet)
        original_sheet.updated_at = datetime.datetime.utcnow()

        # Update entry's own sheet ID and add to new sheet
        entry_to_update.expense_sheet_id = new_sheet_id_from_payload
        new_sheet.entries.append(entry_to_update)
        _recalculate_sheet_total(new_sheet)
        new_sheet.updated_at = datetime.datetime.utcnow()

        # Save both sheets
        try:
            db.storage.json.put(original_storage_key, original_sheet.model_dump_json())
            db.storage.json.put(new_storage_key, new_sheet.model_dump_json())
            print(f"Expense entry {entry_id} moved from sheet {sheet_id} to {new_sheet_id_from_payload}. Both sheets updated.")
            return new_sheet # Return the sheet where the entry was moved to
        except Exception as e:
            # This is a critical state, as one sheet might have saved and the other not.
            # Ideally, a transaction would be used if the storage supported it.
            print(f"CRITICAL: Error saving sheets during move of entry {entry_id}: {e}")
            # For now, re-raise, but the data might be inconsistent.
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Critical error during entry move: {str(e)}") from e
    else:
        # Not moving, just update entry in the original sheet
        original_sheet.entries[entry_index_in_original] = entry_to_update # Replace the entry in the list
        _recalculate_sheet_total(original_sheet)
        original_sheet.updated_at = datetime.datetime.utcnow()
        
        try:
            db.storage.json.put(original_storage_key, original_sheet.model_dump_json())
            print(f"Expense entry {entry_id} in sheet {sheet_id} updated. Sheet re-saved.")
            return original_sheet
        except Exception as e:
            print(f"Error saving updated sheet {sheet_id}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error saving updated sheet: {str(e)}") from e

@router.delete("/expense-sheets/{sheet_id}/entries/{entry_id}", response_model=ExpenseSheet)
def delete_expense_entry_from_sheet(sheet_id: str, entry_id: str) -> ExpenseSheet:
    """Deletes an expense entry from an expense sheet."""
    storage_key = get_expense_sheet_storage_key(sheet_id)
    try:
        current_sheet_data_raw = db.storage.json.get(storage_key)
        if not current_sheet_data_raw:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet with ID {sheet_id} not found.")

        current_sheet_dict: dict
        if isinstance(current_sheet_data_raw, str):
            try:
                current_sheet_dict = json.loads(current_sheet_data_raw)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON for sheet {sheet_id} when deleting entry: {e}. Content: {current_sheet_data_raw[:500]}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid JSON format for sheet {sheet_id}.") from e
        elif isinstance(current_sheet_data_raw, dict):
            current_sheet_dict = current_sheet_data_raw
        else:
            print(f"Warning: Unexpected data type for sheet {sheet_id} when deleting entry: {type(current_sheet_data_raw)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected data type for sheet {sheet_id}.")

        sheet = ExpenseSheet(**current_sheet_dict)
        original_entries_count = len(sheet.entries)
        sheet.entries = [entry for entry in sheet.entries if entry.id != entry_id]
        
        if len(sheet.entries) == original_entries_count:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense entry ID {entry_id} not found in sheet {sheet_id}.")
            
        _recalculate_sheet_total(sheet)
        sheet.updated_at = datetime.datetime.utcnow()
        
        db.storage.json.put(storage_key, sheet.model_dump_json())
        print(f"Expense entry {entry_id} deleted from sheet {sheet_id}. Sheet re-saved.")
        return sheet

    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Expense sheet {sheet_id} not found.") from None
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete entry: {str(e)}") from e


# Placeholder for other endpoints
@router.get("/hello")
def read_root():
    return {"message": "Welcome to Expense Management API"}

/** AccountDeletionResponse */
export interface AccountDeletionResponse {
  /** Message */
  message: string;
  /** Email */
  email?: string | null;
}

/** AuthUrlResponse */
export interface AuthUrlResponse {
  /** Authorization Url */
  authorization_url: string;
}

/** Body_process_receipt_google_cloud_vision */
export interface BodyProcessReceiptGoogleCloudVision {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_company_logo */
export interface BodyUploadCompanyLogo {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_excel_template */
export interface BodyUploadExcelTemplate {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_receipt_image_to_drive */
export interface BodyUploadReceiptImageToDrive {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** ExpenseEntry */
export interface ExpenseEntry {
  /** Id */
  id?: string;
  /** Expense Sheet Id */
  expense_sheet_id: string;
  /** Entry Date */
  entry_date?: string | null;
  /** Merchant Name */
  merchant_name?: string | null;
  /** Payment Method */
  payment_method?: string | null;
  /** Project */
  project?: string | null;
  /** Company */
  company?: string | null;
  /** Location */
  location?: string | null;
  /** Receipt Google Drive Id */
  receipt_google_drive_id?: string | null;
  /** Receipt Google Drive Web View Link */
  receipt_google_drive_web_view_link?: string | null;
  /** Receipt Google Drive Web Content Link */
  receipt_google_drive_web_content_link?: string | null;
  /** Receipt Google Drive File Name */
  receipt_google_drive_file_name?: string | null;
  /**
   * Parking Amount
   * Parking cost
   */
  parking_amount?: number | null;
  /**
   * Taxi Amount
   * Taxi cost
   */
  taxi_amount?: number | null;
  /**
   * Transport Amount
   * Cost for flight/train/car rental
   */
  transport_amount?: number | null;
  /**
   * Hotel Amount
   * Hotel room cost
   */
  hotel_amount?: number | null;
  /**
   * Lunch Amount
   * Lunch cost
   */
  lunch_amount?: number | null;
  /**
   * Dinner Amount
   * Dinner cost
   */
  dinner_amount?: number | null;
  /**
   * Miscellaneous Amount
   * Miscellaneous costs
   */
  miscellaneous_amount?: number | null;
  /**
   * Kilometers
   * Kilometers driven
   */
  kilometers?: number | null;
  /**
   * Km Rate
   * Rate per kilometer for this entry, defaults to DEFAULT_KM_RATE if not provided
   */
  km_rate?: number | null;
  /**
   * Km Amount
   * Calculated: kilometers * km_rate
   */
  km_amount?: number | null;
  /**
   * Daily Total
   * Calculated: sum of all category amounts + km_amount
   */
  daily_total?: number | null;
  /** Purchase Date */
  purchase_date?: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at?: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at?: string;
}

/**
 * ExpenseEntryCreateRequest
 * Request model for creating an expense entry.
 */
export interface ExpenseEntryCreateRequest {
  /** Merchant Name */
  merchant_name?: string | null;
  /**
   * Entry Date
   * @format date
   */
  entry_date: string;
  /** Payment Method */
  payment_method: string;
  /** Project */
  project?: string | null;
  /** Company */
  company?: string | null;
  /** Location */
  location?: string | null;
  /** Receipt Google Drive Id */
  receipt_google_drive_id?: string | null;
  /** Receipt Google Drive Web View Link */
  receipt_google_drive_web_view_link?: string | null;
  /** Receipt Google Drive Web Content Link */
  receipt_google_drive_web_content_link?: string | null;
  /** Receipt Google Drive File Name */
  receipt_google_drive_file_name?: string | null;
  /** Parking Amount */
  parking_amount?: number | null;
  /** Taxi Amount */
  taxi_amount?: number | null;
  /** Transport Amount */
  transport_amount?: number | null;
  /** Hotel Amount */
  hotel_amount?: number | null;
  /** Lunch Amount */
  lunch_amount?: number | null;
  /** Dinner Amount */
  dinner_amount?: number | null;
  /** Miscellaneous Amount */
  miscellaneous_amount?: number | null;
  /** Kilometers */
  kilometers?: number | null;
  /** Km Rate */
  km_rate?: number | null;
}

/**
 * ExpenseEntryUpdateRequest
 * Request model for updating an expense entry. All fields are optional.
 */
export interface ExpenseEntryUpdateRequest {
  /**
   * New Sheet Id
   * If provided and different from current sheet_id, the entry will be moved to this new sheet.
   */
  new_sheet_id?: string | null;
  /** Merchant Name */
  merchant_name?: string | null;
  /** Entry Date */
  entry_date?: string | null;
  /** Payment Method */
  payment_method?: string | null;
  /** Project */
  project?: string | null;
  /** Company */
  company?: string | null;
  /** Location */
  location?: string | null;
  /** Receipt Google Drive Id */
  receipt_google_drive_id?: string | null;
  /** Receipt Google Drive Web View Link */
  receipt_google_drive_web_view_link?: string | null;
  /** Receipt Google Drive Web Content Link */
  receipt_google_drive_web_content_link?: string | null;
  /** Receipt Google Drive File Name */
  receipt_google_drive_file_name?: string | null;
  /** Parking Amount */
  parking_amount?: number | null;
  /** Taxi Amount */
  taxi_amount?: number | null;
  /** Transport Amount */
  transport_amount?: number | null;
  /** Hotel Amount */
  hotel_amount?: number | null;
  /** Lunch Amount */
  lunch_amount?: number | null;
  /** Dinner Amount */
  dinner_amount?: number | null;
  /** Miscellaneous Amount */
  miscellaneous_amount?: number | null;
  /** Kilometers */
  kilometers?: number | null;
  /** Km Rate */
  km_rate?: number | null;
}

/** ExpenseSheet */
export interface ExpenseSheet {
  /** Creator First Name */
  creator_first_name?: string | null;
  /** Creator Last Name */
  creator_last_name?: string | null;
  /** Id */
  id?: string;
  /** Name */
  name: string;
  /** Month */
  month: number;
  /** Year */
  year: number;
  /** Currency */
  currency: string;
  /** Payment Method Filter */
  payment_method_filter?: string | null;
  /**
   * Status
   * @default "pending_validation"
   */
  status?: "pending_validation" | "validated" | "rejected";
  /** Comments */
  comments?: string | null;
  /** User Name */
  user_name?: string | null;
  /**
   * Anticipo
   * @default 0
   */
  anticipo?: number;
  /** User Id */
  user_id?: string | null;
  /**
   * Total Amount
   * @default 0
   */
  total_amount?: number;
  /**
   * Entries
   * @default []
   */
  entries?: ExpenseEntry[];
  /**
   * Created At
   * @format date-time
   */
  created_at?: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at?: string;
}

/**
 * ExpenseSheetCreateRequest
 * Request model for creating an expense sheet.
 */
export interface ExpenseSheetCreateRequest {
  /** Name */
  name: string;
  /** Month */
  month: number;
  /** Year */
  year: number;
  /** Currency */
  currency: string;
  /** Payment Method Filter */
  payment_method_filter: "TARJETA" | "EFECTIVO";
  /** User Name */
  user_name?: string | null;
  /**
   * Anticipo
   * @default 0
   */
  anticipo?: number | null;
}

/**
 * ExpenseSheetUpdateRequest
 * Request model for updating an expense sheet. Fields are optional for partial updates,
 * but if payment_method_filter is provided, it must conform to the Literal.
 */
export interface ExpenseSheetUpdateRequest {
  /** Name */
  name?: string | null;
  /** Month */
  month?: number | null;
  /** Year */
  year?: number | null;
  /** Currency */
  currency?: string | null;
  /** Payment Method Filter */
  payment_method_filter?: "TARJETA" | "EFECTIVO" | null;
  /** Status */
  status?: "pending_validation" | "validated" | "rejected" | null;
  /** Comments */
  comments?: string | null;
  /** User Name */
  user_name?: string | null;
  /** Anticipo */
  anticipo?: number | null;
}

/** ExportResponse */
export interface ExportResponse {
  /** File Name */
  file_name: string;
  /** File Content Base64 */
  file_content_base64: string;
}

/** ExportSheetRequest */
export interface ExportSheetRequest {
  /** Sheet Id */
  sheet_id: string;
}

/** GoogleDriveUploadResponse */
export interface GoogleDriveUploadResponse {
  /** Google File Id */
  google_file_id: string;
  /** File Name */
  file_name: string;
  /** Web View Link */
  web_view_link?: string | null;
  /** Web Content Link */
  web_content_link?: string | null;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** LogoUploadResponse */
export interface LogoUploadResponse {
  /** Message */
  message: string;
  /** Filename */
  filename: string;
  /** Content Type */
  content_type: string;
  /** Storage Key */
  storage_key: string;
}

/** OCRResponse */
export interface OCRResponse {
  /** Raw Text */
  raw_text: string;
}

/** TemplateUploadResponse */
export interface TemplateUploadResponse {
  /** Message */
  message: string;
  /** File Name */
  file_name: string;
  /** Size */
  size: number;
}

/** UserInfo */
export interface UserInfo {
  /** Email */
  email?: string | null;
  /** Name */
  name?: string | null;
  /** Picture */
  picture?: string | null;
  /**
   * Is Authenticated
   * @default false
   */
  is_authenticated?: boolean;
}

/** UserProfileResponse */
export interface UserProfileResponse {
  /** Firstname */
  firstName?: string | null;
  /** Lastname */
  lastName?: string | null;
  /** Email */
  email?: string | null;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

export type CheckHealthData = HealthResponse;

export type UploadCompanyLogoData = LogoUploadResponse;

export type UploadCompanyLogoError = HTTPValidationError;

/** Response List Expense Sheets */
export type ListExpenseSheetsData = ExpenseSheet[];

export type CreateExpenseSheetData = ExpenseSheet;

export type CreateExpenseSheetError = HTTPValidationError;

export interface GetExpenseSheetByIdParams {
  /** Sheet Id */
  sheetId: string;
}

export type GetExpenseSheetByIdData = ExpenseSheet;

export type GetExpenseSheetByIdError = HTTPValidationError;

export interface UpdateExpenseSheetParams {
  /** Sheet Id */
  sheetId: string;
}

export type UpdateExpenseSheetData = ExpenseSheet;

export type UpdateExpenseSheetError = HTTPValidationError;

export interface DeleteExpenseSheetParams {
  /** Sheet Id */
  sheetId: string;
}

export type DeleteExpenseSheetData = any;

export type DeleteExpenseSheetError = HTTPValidationError;

export interface AddExpenseEntryToSheetParams {
  /** Sheet Id */
  sheetId: string;
}

export type AddExpenseEntryToSheetData = ExpenseSheet;

export type AddExpenseEntryToSheetError = HTTPValidationError;

export interface GetExpenseEntryFromSheetParams {
  /** Sheet Id */
  sheetId: string;
  /** Entry Id */
  entryId: string;
}

export type GetExpenseEntryFromSheetData = ExpenseEntry;

export type GetExpenseEntryFromSheetError = HTTPValidationError;

export interface UpdateExpenseEntryInSheetParams {
  /** Sheet Id */
  sheetId: string;
  /** Entry Id */
  entryId: string;
}

export type UpdateExpenseEntryInSheetData = ExpenseSheet;

export type UpdateExpenseEntryInSheetError = HTTPValidationError;

export interface DeleteExpenseEntryFromSheetParams {
  /** Sheet Id */
  sheetId: string;
  /** Entry Id */
  entryId: string;
}

export type DeleteExpenseEntryFromSheetData = ExpenseSheet;

export type DeleteExpenseEntryFromSheetError = HTTPValidationError;

export type ReadRootData = any;

export type TestTesseractOcrData = any;

export type ProcessReceiptGoogleCloudVisionData = OCRResponse;

export type ProcessReceiptGoogleCloudVisionError = HTTPValidationError;

export interface UploadReceiptImageToDriveParams {
  /**
   * Sheet Name
   * Name of the expense sheet for folder creation.
   */
  sheet_name: string;
  /**
   * Expense Date Str
   * Date of the expense (YYYY-MM-DD) for filename.
   */
  expense_date_str: string;
  /**
   * Project Name
   * Project name for filename (optional).
   */
  project_name?: string | null;
  /**
   * Company Name
   * Company name for filename (optional).
   */
  company_name?: string | null;
}

export type UploadReceiptImageToDriveData = GoogleDriveUploadResponse;

export type UploadReceiptImageToDriveError = HTTPValidationError;

export type LoginData = any;

export type CallbackData = any;

export type GetUserInfoPlaceholderData = any;

export interface ListDriveFilesPlaceholderParams {
  /** User Id */
  user_id: string;
}

export type ListDriveFilesPlaceholderData = any;

export type ListDriveFilesPlaceholderError = HTTPValidationError;

export type LoginWithGoogleData = any;

export interface AuthGoogleCallbackParams {
  /** Code */
  code: string;
  /** State */
  state?: string | null;
}

export type AuthGoogleCallbackData = any;

export type AuthGoogleCallbackError = HTTPValidationError;

export interface GetCurrentUserInfoParams {
  /** Session Id */
  session_id?: string | null;
}

export type GetCurrentUserInfoData = UserInfo;

export type GetCurrentUserInfoError = HTTPValidationError;

export type GetGoogleAuthUrlData = AuthUrlResponse;

export interface LogoutGoogleParams {
  /** Session Id */
  session_id?: string | null;
}

export type LogoutGoogleData = any;

export type LogoutGoogleError = HTTPValidationError;

export interface GetUserProfileByIdParams {
  /** User Id */
  userId: string;
}

export type GetUserProfileByIdData = UserProfileResponse;

export type GetUserProfileByIdError = HTTPValidationError;

export type RequestAccountDeletionData = AccountDeletionResponse;

export type UploadExcelTemplateData = TemplateUploadResponse;

export type UploadExcelTemplateError = HTTPValidationError;

export type ExportExpenseSheetToExcelData = ExportResponse;

export type ExportExpenseSheetToExcelError = HTTPValidationError;

export interface ExportExpenseSheetReceiptsZipParams {
  /** Sheet Id */
  sheetId: string;
}

export type ExportExpenseSheetReceiptsZipData = any;

export type ExportExpenseSheetReceiptsZipError = HTTPValidationError;

export type ServiceHealthCheckData = any;

import {
  AddExpenseEntryToSheetData,
  AddExpenseEntryToSheetError,
  AddExpenseEntryToSheetParams,
  AuthGoogleCallbackData,
  AuthGoogleCallbackError,
  AuthGoogleCallbackParams,
  BodyProcessReceiptGoogleCloudVision,
  BodyUploadCompanyLogo,
  BodyUploadExcelTemplate,
  BodyUploadReceiptImageToDrive,
  CallbackData,
  CheckHealthData,
  CreateExpenseSheetData,
  CreateExpenseSheetError,
  DeleteExpenseEntryFromSheetData,
  DeleteExpenseEntryFromSheetError,
  DeleteExpenseEntryFromSheetParams,
  DeleteExpenseSheetData,
  DeleteExpenseSheetError,
  DeleteExpenseSheetParams,
  ExpenseEntryCreateRequest,
  ExpenseEntryUpdateRequest,
  ExpenseSheetCreateRequest,
  ExpenseSheetUpdateRequest,
  ExportExpenseSheetReceiptsZipData,
  ExportExpenseSheetReceiptsZipError,
  ExportExpenseSheetReceiptsZipParams,
  ExportExpenseSheetToExcelData,
  ExportExpenseSheetToExcelError,
  ExportSheetRequest,
  GetCurrentUserInfoData,
  GetCurrentUserInfoError,
  GetCurrentUserInfoParams,
  GetExpenseEntryFromSheetData,
  GetExpenseEntryFromSheetError,
  GetExpenseEntryFromSheetParams,
  GetExpenseSheetByIdData,
  GetExpenseSheetByIdError,
  GetExpenseSheetByIdParams,
  GetGoogleAuthUrlData,
  GetUserInfoPlaceholderData,
  GetUserProfileByIdData,
  GetUserProfileByIdError,
  GetUserProfileByIdParams,
  ListDriveFilesPlaceholderData,
  ListDriveFilesPlaceholderError,
  ListDriveFilesPlaceholderParams,
  ListExpenseSheetsData,
  LoginData,
  LoginWithGoogleData,
  LogoutGoogleData,
  LogoutGoogleError,
  LogoutGoogleParams,
  ProcessReceiptGoogleCloudVisionData,
  ProcessReceiptGoogleCloudVisionError,
  ReadRootData,
  RequestAccountDeletionData,
  ServiceHealthCheckData,
  TestTesseractOcrData,
  UpdateExpenseEntryInSheetData,
  UpdateExpenseEntryInSheetError,
  UpdateExpenseEntryInSheetParams,
  UpdateExpenseSheetData,
  UpdateExpenseSheetError,
  UpdateExpenseSheetParams,
  UploadCompanyLogoData,
  UploadCompanyLogoError,
  UploadExcelTemplateData,
  UploadExcelTemplateError,
  UploadReceiptImageToDriveData,
  UploadReceiptImageToDriveError,
  UploadReceiptImageToDriveParams,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Uploads a company logo. The logo will be stored in db.storage.binary with the key 'company_logo_image'. Replaces the existing logo if one is already present.
   *
   * @tags Company Profile, dbtn/module:company_profile_api, dbtn/hasAuth
   * @name upload_company_logo
   * @summary Upload Company Logo
   * @request POST:/routes/company-profile/logo
   */
  upload_company_logo = (data: BodyUploadCompanyLogo, params: RequestParams = {}) =>
    this.request<UploadCompanyLogoData, UploadCompanyLogoError>({
      path: `/routes/company-profile/logo`,
      method: "POST",
      body: data,
      type: ContentType.FormData,
      ...params,
    });

  /**
   * @description Lists all expense sheets.
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name list_expense_sheets
   * @summary List Expense Sheets
   * @request GET:/routes/expense-management/expense-sheets
   */
  list_expense_sheets = (params: RequestParams = {}) =>
    this.request<ListExpenseSheetsData, any>({
      path: `/routes/expense-management/expense-sheets`,
      method: "GET",
      ...params,
    });

  /**
   * @description Creates a new expense sheet.
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name create_expense_sheet
   * @summary Create Expense Sheet
   * @request POST:/routes/expense-management/expense-sheets
   */
  create_expense_sheet = (data: ExpenseSheetCreateRequest, params: RequestParams = {}) =>
    this.request<CreateExpenseSheetData, CreateExpenseSheetError>({
      path: `/routes/expense-management/expense-sheets`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Retrieves a specific expense sheet by its ID. If the stored total_amount is inconsistent with the sum of its entries' daily_totals, it recalculates, saves, and returns the updated sheet.
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name get_expense_sheet_by_id
   * @summary Get Expense Sheet By Id
   * @request GET:/routes/expense-management/expense-sheets/{sheet_id}
   */
  get_expense_sheet_by_id = ({ sheetId, ...query }: GetExpenseSheetByIdParams, params: RequestParams = {}) =>
    this.request<GetExpenseSheetByIdData, GetExpenseSheetByIdError>({
      path: `/routes/expense-management/expense-sheets/${sheetId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Updates an existing expense sheet.
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name update_expense_sheet
   * @summary Update Expense Sheet
   * @request PUT:/routes/expense-management/expense-sheets/{sheet_id}
   */
  update_expense_sheet = (
    { sheetId, ...query }: UpdateExpenseSheetParams,
    data: ExpenseSheetUpdateRequest,
    params: RequestParams = {},
  ) =>
    this.request<UpdateExpenseSheetData, UpdateExpenseSheetError>({
      path: `/routes/expense-management/expense-sheets/${sheetId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Deletes an expense sheet by its ID.
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name delete_expense_sheet
   * @summary Delete Expense Sheet
   * @request DELETE:/routes/expense-management/expense-sheets/{sheet_id}
   */
  delete_expense_sheet = ({ sheetId, ...query }: DeleteExpenseSheetParams, params: RequestParams = {}) =>
    this.request<DeleteExpenseSheetData, DeleteExpenseSheetError>({
      path: `/routes/expense-management/expense-sheets/${sheetId}`,
      method: "DELETE",
      ...params,
    });

  /**
   * @description Adds a new expense entry to a specific expense sheet.
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name add_expense_entry_to_sheet
   * @summary Add Expense Entry To Sheet
   * @request POST:/routes/expense-management/expense-sheets/{sheet_id}/entries
   */
  add_expense_entry_to_sheet = (
    { sheetId, ...query }: AddExpenseEntryToSheetParams,
    data: ExpenseEntryCreateRequest,
    params: RequestParams = {},
  ) =>
    this.request<AddExpenseEntryToSheetData, AddExpenseEntryToSheetError>({
      path: `/routes/expense-management/expense-sheets/${sheetId}/entries`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Retrieves a specific expense entry from an expense sheet.
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name get_expense_entry_from_sheet
   * @summary Get Expense Entry From Sheet
   * @request GET:/routes/expense-management/expense-sheets/{sheet_id}/entries/{entry_id}
   */
  get_expense_entry_from_sheet = (
    { sheetId, entryId, ...query }: GetExpenseEntryFromSheetParams,
    params: RequestParams = {},
  ) =>
    this.request<GetExpenseEntryFromSheetData, GetExpenseEntryFromSheetError>({
      path: `/routes/expense-management/expense-sheets/${sheetId}/entries/${entryId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Updates an existing expense entry. If entry_update_data.new_sheet_id is provided and is different from the current sheet_id, the entry will be moved to the new sheet.
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name update_expense_entry_in_sheet
   * @summary Update Expense Entry In Sheet
   * @request PUT:/routes/expense-management/expense-sheets/{sheet_id}/entries/{entry_id}
   */
  update_expense_entry_in_sheet = (
    { sheetId, entryId, ...query }: UpdateExpenseEntryInSheetParams,
    data: ExpenseEntryUpdateRequest,
    params: RequestParams = {},
  ) =>
    this.request<UpdateExpenseEntryInSheetData, UpdateExpenseEntryInSheetError>({
      path: `/routes/expense-management/expense-sheets/${sheetId}/entries/${entryId}`,
      method: "PUT",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Deletes an expense entry from an expense sheet.
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name delete_expense_entry_from_sheet
   * @summary Delete Expense Entry From Sheet
   * @request DELETE:/routes/expense-management/expense-sheets/{sheet_id}/entries/{entry_id}
   */
  delete_expense_entry_from_sheet = (
    { sheetId, entryId, ...query }: DeleteExpenseEntryFromSheetParams,
    params: RequestParams = {},
  ) =>
    this.request<DeleteExpenseEntryFromSheetData, DeleteExpenseEntryFromSheetError>({
      path: `/routes/expense-management/expense-sheets/${sheetId}/entries/${entryId}`,
      method: "DELETE",
      ...params,
    });

  /**
   * No description
   *
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name read_root
   * @summary Read Root
   * @request GET:/routes/expense-management/hello
   */
  read_root = (params: RequestParams = {}) =>
    this.request<ReadRootData, any>({
      path: `/routes/expense-management/hello`,
      method: "GET",
      ...params,
    });

  /**
   * @description Tests if pytesseract can successfully perform OCR. Creates a simple image with text and tries to extract it.
   *
   * @tags OCR Service, dbtn/module:ocr_service, dbtn/hasAuth
   * @name test_tesseract_ocr
   * @summary Test Tesseract Ocr
   * @request GET:/routes/ocr/test-tesseract
   */
  test_tesseract_ocr = (params: RequestParams = {}) =>
    this.request<TestTesseractOcrData, any>({
      path: `/routes/ocr/test-tesseract`,
      method: "GET",
      ...params,
    });

  /**
   * @description Processes an uploaded receipt image using Google Cloud Vision API.
   *
   * @tags OCR Service, dbtn/module:ocr_service, dbtn/hasAuth
   * @name process_receipt_google_cloud_vision
   * @summary Process Receipt Google Cloud Vision
   * @request POST:/routes/ocr/process-receipt-gcv
   */
  process_receipt_google_cloud_vision = (data: BodyProcessReceiptGoogleCloudVision, params: RequestParams = {}) =>
    this.request<ProcessReceiptGoogleCloudVisionData, ProcessReceiptGoogleCloudVisionError>({
      path: `/routes/ocr/process-receipt-gcv`,
      method: "POST",
      body: data,
      type: ContentType.FormData,
      ...params,
    });

  /**
   * No description
   *
   * @tags Image Upload, dbtn/module:image_upload, dbtn/hasAuth
   * @name upload_receipt_image_to_drive
   * @summary Upload Receipt Image To Drive
   * @request POST:/routes/image_upload/upload-receipt-image
   */
  upload_receipt_image_to_drive = (
    query: UploadReceiptImageToDriveParams,
    data: BodyUploadReceiptImageToDrive,
    params: RequestParams = {},
  ) =>
    this.request<UploadReceiptImageToDriveData, UploadReceiptImageToDriveError>({
      path: `/routes/image_upload/upload-receipt-image`,
      method: "POST",
      query: query,
      body: data,
      type: ContentType.FormData,
      ...params,
    });

  /**
   * No description
   *
   * @tags Authentication, dbtn/module:auth_google_api
   * @name login
   * @summary Login
   * @request GET:/routes/auth-google-api/login
   */
  login = (params: RequestParams = {}) =>
    this.request<LoginData, any>({
      path: `/routes/auth-google-api/login`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags Authentication, dbtn/module:auth_google_api
   * @name callback
   * @summary Callback
   * @request GET:/routes/auth-google-api/callback
   */
  callback = (params: RequestParams = {}) =>
    this.request<CallbackData, any>({
      path: `/routes/auth-google-api/callback`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags Authentication, dbtn/module:auth_google_api
   * @name get_user_info_placeholder
   * @summary Get User Info Placeholder
   * @request GET:/routes/auth-google-api/get-user-info
   */
  get_user_info_placeholder = (params: RequestParams = {}) =>
    this.request<GetUserInfoPlaceholderData, any>({
      path: `/routes/auth-google-api/get-user-info`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags Authentication, dbtn/module:auth_google_api
   * @name list_drive_files_placeholder
   * @summary List Drive Files Placeholder
   * @request POST:/routes/auth-google-api/list-drive-files
   */
  list_drive_files_placeholder = (query: ListDriveFilesPlaceholderParams, params: RequestParams = {}) =>
    this.request<ListDriveFilesPlaceholderData, ListDriveFilesPlaceholderError>({
      path: `/routes/auth-google-api/list-drive-files`,
      method: "POST",
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name login_with_google
   * @summary Login With Google
   * @request GET:/routes/auth/google/login
   */
  login_with_google = (params: RequestParams = {}) =>
    this.request<LoginWithGoogleData, any>({
      path: `/routes/auth/google/login`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name auth_google_callback
   * @summary Auth Google Callback
   * @request GET:/routes/auth/google/callback
   */
  auth_google_callback = (query: AuthGoogleCallbackParams, params: RequestParams = {}) =>
    this.request<AuthGoogleCallbackData, AuthGoogleCallbackError>({
      path: `/routes/auth/google/callback`,
      method: "GET",
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name get_current_user_info
   * @summary Get Current User Info
   * @request GET:/routes/auth/google/me
   */
  get_current_user_info = (query: GetCurrentUserInfoParams, params: RequestParams = {}) =>
    this.request<GetCurrentUserInfoData, GetCurrentUserInfoError>({
      path: `/routes/auth/google/me`,
      method: "GET",
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name get_google_auth_url
   * @summary Get Google Auth Url
   * @request GET:/routes/auth/google/get-auth-url
   */
  get_google_auth_url = (params: RequestParams = {}) =>
    this.request<GetGoogleAuthUrlData, any>({
      path: `/routes/auth/google/get-auth-url`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name logout_google
   * @summary Logout Google
   * @request POST:/routes/auth/google/logout
   */
  logout_google = (query: LogoutGoogleParams, params: RequestParams = {}) =>
    this.request<LogoutGoogleData, LogoutGoogleError>({
      path: `/routes/auth/google/logout`,
      method: "POST",
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags Users, dbtn/module:user_api, dbtn/hasAuth
   * @name get_user_profile_by_id
   * @summary Get User Profile By Id
   * @request GET:/routes/users/{user_id}/profile
   */
  get_user_profile_by_id = ({ userId, ...query }: GetUserProfileByIdParams, params: RequestParams = {}) =>
    this.request<GetUserProfileByIdData, GetUserProfileByIdError>({
      path: `/routes/users/${userId}/profile`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags User Deletion, dbtn/module:user_deletion_service, dbtn/hasAuth
   * @name request_account_deletion
   * @summary Request Account Deletion
   * @request POST:/routes/user-deletion/request-deletion
   */
  request_account_deletion = (params: RequestParams = {}) =>
    this.request<RequestAccountDeletionData, any>({
      path: `/routes/user-deletion/request-deletion`,
      method: "POST",
      ...params,
    });

  /**
   * @description Receives an Excel file and stores it as the user's template.
   *
   * @tags Export Service, dbtn/module:export_service, dbtn/hasAuth
   * @name upload_excel_template
   * @summary Upload Excel Template
   * @request POST:/routes/export/upload-excel-template
   */
  upload_excel_template = (data: BodyUploadExcelTemplate, params: RequestParams = {}) =>
    this.request<UploadExcelTemplateData, UploadExcelTemplateError>({
      path: `/routes/export/upload-excel-template`,
      method: "POST",
      body: data,
      type: ContentType.FormData,
      ...params,
    });

  /**
   * No description
   *
   * @tags Export Service, dbtn/module:export_service, dbtn/hasAuth
   * @name export_expense_sheet_to_excel
   * @summary Export Expense Sheet To Excel
   * @request POST:/routes/export/expense-sheet/export-excel
   */
  export_expense_sheet_to_excel = (data: ExportSheetRequest, params: RequestParams = {}) =>
    this.request<ExportExpenseSheetToExcelData, ExportExpenseSheetToExcelError>({
      path: `/routes/export/expense-sheet/export-excel`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags Export Service, stream, dbtn/module:export_service, dbtn/hasAuth
   * @name export_expense_sheet_receipts_zip
   * @summary Export Expense Sheet Receipts Zip
   * @request GET:/routes/export/expense-sheet/{sheet_id}/receipts-zip
   */
  export_expense_sheet_receipts_zip = (
    { sheetId, ...query }: ExportExpenseSheetReceiptsZipParams,
    params: RequestParams = {},
  ) =>
    this.requestStream<ExportExpenseSheetReceiptsZipData, ExportExpenseSheetReceiptsZipError>({
      path: `/routes/export/expense-sheet/${sheetId}/receipts-zip`,
      method: "GET",
      ...params,
    });

  /**
   * No description
   *
   * @tags Export Service, Service Health, dbtn/module:export_service, dbtn/hasAuth
   * @name service_health_check
   * @summary Service Health Check
   * @request GET:/routes/export/health_check
   */
  service_health_check = (params: RequestParams = {}) =>
    this.request<ServiceHealthCheckData, any>({
      path: `/routes/export/health_check`,
      method: "GET",
      ...params,
    });
}

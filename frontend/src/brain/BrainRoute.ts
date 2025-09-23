import {
  AddExpenseEntryToSheetData,
  AuthGoogleCallbackData,
  BodyProcessReceiptGoogleCloudVision,
  BodyUploadCompanyLogo,
  BodyUploadExcelTemplate,
  BodyUploadReceiptImageToDrive,
  CallbackData,
  CheckHealthData,
  CreateExpenseSheetData,
  DeleteExpenseEntryFromSheetData,
  DeleteExpenseSheetData,
  ExpenseEntryCreateRequest,
  ExpenseEntryUpdateRequest,
  ExpenseSheetCreateRequest,
  ExpenseSheetUpdateRequest,
  ExportExpenseSheetReceiptsZipData,
  ExportExpenseSheetToExcelData,
  ExportSheetRequest,
  GetCurrentUserInfoData,
  GetExpenseEntryFromSheetData,
  GetExpenseSheetByIdData,
  GetGoogleAuthUrlData,
  GetUserInfoPlaceholderData,
  GetUserProfileByIdData,
  ListDriveFilesPlaceholderData,
  ListExpenseSheetsData,
  LoginData,
  LoginWithGoogleData,
  LogoutGoogleData,
  ProcessReceiptGoogleCloudVisionData,
  ReadRootData,
  RequestAccountDeletionData,
  ServiceHealthCheckData,
  TestTesseractOcrData,
  UpdateExpenseEntryInSheetData,
  UpdateExpenseSheetData,
  UploadCompanyLogoData,
  UploadExcelTemplateData,
  UploadReceiptImageToDriveData,
} from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Uploads a company logo. The logo will be stored in db.storage.binary with the key 'company_logo_image'. Replaces the existing logo if one is already present.
   * @tags Company Profile, dbtn/module:company_profile_api, dbtn/hasAuth
   * @name upload_company_logo
   * @summary Upload Company Logo
   * @request POST:/routes/company-profile/logo
   */
  export namespace upload_company_logo {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyUploadCompanyLogo;
    export type RequestHeaders = {};
    export type ResponseBody = UploadCompanyLogoData;
  }

  /**
   * @description Lists all expense sheets.
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name list_expense_sheets
   * @summary List Expense Sheets
   * @request GET:/routes/expense-management/expense-sheets
   */
  export namespace list_expense_sheets {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListExpenseSheetsData;
  }

  /**
   * @description Creates a new expense sheet.
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name create_expense_sheet
   * @summary Create Expense Sheet
   * @request POST:/routes/expense-management/expense-sheets
   */
  export namespace create_expense_sheet {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ExpenseSheetCreateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateExpenseSheetData;
  }

  /**
   * @description Retrieves a specific expense sheet by its ID. If the stored total_amount is inconsistent with the sum of its entries' daily_totals, it recalculates, saves, and returns the updated sheet.
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name get_expense_sheet_by_id
   * @summary Get Expense Sheet By Id
   * @request GET:/routes/expense-management/expense-sheets/{sheet_id}
   */
  export namespace get_expense_sheet_by_id {
    export type RequestParams = {
      /** Sheet Id */
      sheetId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetExpenseSheetByIdData;
  }

  /**
   * @description Updates an existing expense sheet.
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name update_expense_sheet
   * @summary Update Expense Sheet
   * @request PUT:/routes/expense-management/expense-sheets/{sheet_id}
   */
  export namespace update_expense_sheet {
    export type RequestParams = {
      /** Sheet Id */
      sheetId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ExpenseSheetUpdateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateExpenseSheetData;
  }

  /**
   * @description Deletes an expense sheet by its ID.
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name delete_expense_sheet
   * @summary Delete Expense Sheet
   * @request DELETE:/routes/expense-management/expense-sheets/{sheet_id}
   */
  export namespace delete_expense_sheet {
    export type RequestParams = {
      /** Sheet Id */
      sheetId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteExpenseSheetData;
  }

  /**
   * @description Adds a new expense entry to a specific expense sheet.
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name add_expense_entry_to_sheet
   * @summary Add Expense Entry To Sheet
   * @request POST:/routes/expense-management/expense-sheets/{sheet_id}/entries
   */
  export namespace add_expense_entry_to_sheet {
    export type RequestParams = {
      /** Sheet Id */
      sheetId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ExpenseEntryCreateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AddExpenseEntryToSheetData;
  }

  /**
   * @description Retrieves a specific expense entry from an expense sheet.
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name get_expense_entry_from_sheet
   * @summary Get Expense Entry From Sheet
   * @request GET:/routes/expense-management/expense-sheets/{sheet_id}/entries/{entry_id}
   */
  export namespace get_expense_entry_from_sheet {
    export type RequestParams = {
      /** Sheet Id */
      sheetId: string;
      /** Entry Id */
      entryId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetExpenseEntryFromSheetData;
  }

  /**
   * @description Updates an existing expense entry. If entry_update_data.new_sheet_id is provided and is different from the current sheet_id, the entry will be moved to the new sheet.
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name update_expense_entry_in_sheet
   * @summary Update Expense Entry In Sheet
   * @request PUT:/routes/expense-management/expense-sheets/{sheet_id}/entries/{entry_id}
   */
  export namespace update_expense_entry_in_sheet {
    export type RequestParams = {
      /** Sheet Id */
      sheetId: string;
      /** Entry Id */
      entryId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ExpenseEntryUpdateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateExpenseEntryInSheetData;
  }

  /**
   * @description Deletes an expense entry from an expense sheet.
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name delete_expense_entry_from_sheet
   * @summary Delete Expense Entry From Sheet
   * @request DELETE:/routes/expense-management/expense-sheets/{sheet_id}/entries/{entry_id}
   */
  export namespace delete_expense_entry_from_sheet {
    export type RequestParams = {
      /** Sheet Id */
      sheetId: string;
      /** Entry Id */
      entryId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteExpenseEntryFromSheetData;
  }

  /**
   * No description
   * @tags Expense Management, dbtn/module:expense_api, dbtn/hasAuth
   * @name read_root
   * @summary Read Root
   * @request GET:/routes/expense-management/hello
   */
  export namespace read_root {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ReadRootData;
  }

  /**
   * @description Tests if pytesseract can successfully perform OCR. Creates a simple image with text and tries to extract it.
   * @tags OCR Service, dbtn/module:ocr_service, dbtn/hasAuth
   * @name test_tesseract_ocr
   * @summary Test Tesseract Ocr
   * @request GET:/routes/ocr/test-tesseract
   */
  export namespace test_tesseract_ocr {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TestTesseractOcrData;
  }

  /**
   * @description Processes an uploaded receipt image using Google Cloud Vision API.
   * @tags OCR Service, dbtn/module:ocr_service, dbtn/hasAuth
   * @name process_receipt_google_cloud_vision
   * @summary Process Receipt Google Cloud Vision
   * @request POST:/routes/ocr/process-receipt-gcv
   */
  export namespace process_receipt_google_cloud_vision {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyProcessReceiptGoogleCloudVision;
    export type RequestHeaders = {};
    export type ResponseBody = ProcessReceiptGoogleCloudVisionData;
  }

  /**
   * No description
   * @tags Image Upload, dbtn/module:image_upload, dbtn/hasAuth
   * @name upload_receipt_image_to_drive
   * @summary Upload Receipt Image To Drive
   * @request POST:/routes/image_upload/upload-receipt-image
   */
  export namespace upload_receipt_image_to_drive {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = BodyUploadReceiptImageToDrive;
    export type RequestHeaders = {};
    export type ResponseBody = UploadReceiptImageToDriveData;
  }

  /**
   * No description
   * @tags Authentication, dbtn/module:auth_google_api
   * @name login
   * @summary Login
   * @request GET:/routes/auth-google-api/login
   */
  export namespace login {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LoginData;
  }

  /**
   * No description
   * @tags Authentication, dbtn/module:auth_google_api
   * @name callback
   * @summary Callback
   * @request GET:/routes/auth-google-api/callback
   */
  export namespace callback {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CallbackData;
  }

  /**
   * No description
   * @tags Authentication, dbtn/module:auth_google_api
   * @name get_user_info_placeholder
   * @summary Get User Info Placeholder
   * @request GET:/routes/auth-google-api/get-user-info
   */
  export namespace get_user_info_placeholder {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserInfoPlaceholderData;
  }

  /**
   * No description
   * @tags Authentication, dbtn/module:auth_google_api
   * @name list_drive_files_placeholder
   * @summary List Drive Files Placeholder
   * @request POST:/routes/auth-google-api/list-drive-files
   */
  export namespace list_drive_files_placeholder {
    export type RequestParams = {};
    export type RequestQuery = {
      /** User Id */
      user_id: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListDriveFilesPlaceholderData;
  }

  /**
   * No description
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name login_with_google
   * @summary Login With Google
   * @request GET:/routes/auth/google/login
   */
  export namespace login_with_google {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LoginWithGoogleData;
  }

  /**
   * No description
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name auth_google_callback
   * @summary Auth Google Callback
   * @request GET:/routes/auth/google/callback
   */
  export namespace auth_google_callback {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Code */
      code: string;
      /** State */
      state?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AuthGoogleCallbackData;
  }

  /**
   * No description
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name get_current_user_info
   * @summary Get Current User Info
   * @request GET:/routes/auth/google/me
   */
  export namespace get_current_user_info {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Session Id */
      session_id?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCurrentUserInfoData;
  }

  /**
   * No description
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name get_google_auth_url
   * @summary Get Google Auth Url
   * @request GET:/routes/auth/google/get-auth-url
   */
  export namespace get_google_auth_url {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetGoogleAuthUrlData;
  }

  /**
   * No description
   * @tags Authentication, dbtn/module:auth_service, dbtn/hasAuth
   * @name logout_google
   * @summary Logout Google
   * @request POST:/routes/auth/google/logout
   */
  export namespace logout_google {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Session Id */
      session_id?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LogoutGoogleData;
  }

  /**
   * No description
   * @tags Users, dbtn/module:user_api, dbtn/hasAuth
   * @name get_user_profile_by_id
   * @summary Get User Profile By Id
   * @request GET:/routes/users/{user_id}/profile
   */
  export namespace get_user_profile_by_id {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserProfileByIdData;
  }

  /**
   * No description
   * @tags User Deletion, dbtn/module:user_deletion_service, dbtn/hasAuth
   * @name request_account_deletion
   * @summary Request Account Deletion
   * @request POST:/routes/user-deletion/request-deletion
   */
  export namespace request_account_deletion {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestAccountDeletionData;
  }

  /**
   * @description Receives an Excel file and stores it as the user's template.
   * @tags Export Service, dbtn/module:export_service, dbtn/hasAuth
   * @name upload_excel_template
   * @summary Upload Excel Template
   * @request POST:/routes/export/upload-excel-template
   */
  export namespace upload_excel_template {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyUploadExcelTemplate;
    export type RequestHeaders = {};
    export type ResponseBody = UploadExcelTemplateData;
  }

  /**
   * No description
   * @tags Export Service, dbtn/module:export_service, dbtn/hasAuth
   * @name export_expense_sheet_to_excel
   * @summary Export Expense Sheet To Excel
   * @request POST:/routes/export/expense-sheet/export-excel
   */
  export namespace export_expense_sheet_to_excel {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ExportSheetRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ExportExpenseSheetToExcelData;
  }

  /**
   * No description
   * @tags Export Service, stream, dbtn/module:export_service, dbtn/hasAuth
   * @name export_expense_sheet_receipts_zip
   * @summary Export Expense Sheet Receipts Zip
   * @request GET:/routes/export/expense-sheet/{sheet_id}/receipts-zip
   */
  export namespace export_expense_sheet_receipts_zip {
    export type RequestParams = {
      /** Sheet Id */
      sheetId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ExportExpenseSheetReceiptsZipData;
  }

  /**
   * No description
   * @tags Export Service, Service Health, dbtn/module:export_service, dbtn/hasAuth
   * @name service_health_check
   * @summary Service Health Check
   * @request GET:/routes/export/health_check
   */
  export namespace service_health_check {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceHealthCheckData;
  }
}

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, XCircle, RotateCcw, RotateCw, ZoomIn, ZoomOut, RefreshCcw, HelpCircle } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale
import brain from 'brain';
import { ExpenseEntry, ExpenseEntryCreateRequest, ExpenseEntryUpdateRequest, GoogleDriveUploadResponse } from 'types';
import { toast } from 'sonner';
import { categoryToSpanish } from 'utils/translations'; // Import the translation util

// Helper function to get session ID from localStorage
const getStoredSessionId = (): string | null => {
  try {
    return localStorage.getItem("google_session_id");
  } catch (error) {
    console.error("Error retrieving session ID from localStorage:", error);
    return null;
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentSheetId?: string; // Optional: ID of the sheet if context is within a specific sheet
  availableExpenseSheets: { id: string; name: string; currency: string; payment_method_filter: "TARJETA" | "EFECTIVO" | "" | null }[]; // List of all available sheets
  sheetCurrency: string; // Original currency of the sheet (if in sheet context) or a default
  existingEntry?: ExpenseEntry | null;
  defaultCurrency?: string; // Fallback currency if no sheet is selected initially
}

export const AddExpenseEntryForm: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  currentSheetId, 
  availableExpenseSheets,
  sheetCurrency: initialSheetCurrency, // This is the currency of currentSheetId OR a default passed by parent
  existingEntry = null,
  defaultCurrency = "EUR", 
}) => {
  const isEditMode = !!existingEntry;

  const [selectedSheetId, setSelectedSheetId] = useState<string | undefined>(undefined);
  const [currentDisplayCurrency, setCurrentDisplayCurrency] = useState<string>(initialSheetCurrency || defaultCurrency);

  // Common fields
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
  const [project, setProject] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");

  // Entry type selection
  const [isExpenseType, setIsExpenseType] = useState(true);
  const [isMileageType, setIsMileageType] = useState(false);

  // Expense-specific fields
  const [merchantName, setMerchantName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [category, setCategory] = useState("");
  const [amountForCategory, setAmountForCategory] = useState("");

  // Mileage-specific fields
  const [kilometers, setKilometers] = useState("");
  const [kmRate, setKmRate] = useState("0.14");

  // Image/Receipt fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [receiptWebViewLink, setReceiptWebViewLink] = useState<string | null>(null);
  const [currentReceiptGoogleDriveId, setCurrentReceiptGoogleDriveId] = useState<string | null>(null);
  const [currentReceiptWebViewLink, setCurrentReceiptWebViewLink] = useState<string | null>(null);
  const [currentReceiptWebContentLink, setCurrentReceiptWebContentLink] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [ocrRawText, setOcrRawText] = useState<string | null>(null);

  // Derived state to determine if mileage registration should be disabled based on selected sheet
  const isMileageDisabledBySheet = useMemo(() => {
    if (!selectedSheetId) return false; // No sheet selected, mileage can be toggled
    const sheet = availableExpenseSheets.find(s => s.id === selectedSheetId);
    return sheet ? sheet.payment_method_filter !== "EFECTIVO" : false; // Disabled if sheet is not EFECTIVO
  }, [selectedSheetId, availableExpenseSheets]);

  const filteredExpenseSheetsForSelection = useMemo(() => {
    if (isMileageType) {
      return availableExpenseSheets.filter(sheet => sheet.payment_method_filter === "EFECTIVO");
    }
    return availableExpenseSheets;
  }, [availableExpenseSheets, isMileageType]);

  useEffect(() => {
    if (isOpen) {
      let activeSheetId = currentSheetId;
      let activeCurrency = initialSheetCurrency;
      let activeSheetPaymentMethod: "TARJETA" | "EFECTIVO" | "" | null = "";

      if (isEditMode && existingEntry) {
        // In edit mode, sheet ID is fixed to entry's original sheet (passed as currentSheetId)
        activeSheetId = currentSheetId;
        const entrySheet = availableExpenseSheets.find(sheet => sheet.id === activeSheetId);
        activeCurrency = entrySheet?.currency || defaultCurrency;
        activeSheetPaymentMethod = entrySheet?.payment_method_filter || "";
        
        // Populate form with existing entry data
        setEntryDate(existingEntry.entry_date ? new Date(existingEntry.entry_date) : new Date());
        setProject(existingEntry.project || "");
        setCompany(existingEntry.company || "");
        setLocation(existingEntry.location || "");

        const hasExpenseAmount = [
          existingEntry.parking_amount,
          existingEntry.taxi_amount,
          existingEntry.transport_amount,
          existingEntry.hotel_amount,
          existingEntry.lunch_amount,
          existingEntry.dinner_amount,
          existingEntry.various_amount
        ].some(amount => typeof amount === 'number' && amount > 0);
        const hasKmAmount = typeof existingEntry.km_amount === 'number' && existingEntry.km_amount > 0;

        setIsExpenseType(hasExpenseAmount || (!hasExpenseAmount && !hasKmAmount));
        setIsMileageType(hasKmAmount);

        setMerchantName(existingEntry.merchant_name || "");
        // Payment method will be set based on the sheet later, but existing entry's PM can be a fallback if needed, though usually derived
        // For now, we let the sheet's payment_method_filter dictate it primarily.
        // If the entry itself has a payment method, it might be from an older system; the sheet's filter is now the source of truth.
        setPaymentMethod(activeSheetPaymentMethod || (existingEntry.payment_method === "N/A" && !hasExpenseAmount ? "" : existingEntry.payment_method || ""));

        let foundCategory = "";
        let foundAmount = "";
        if (typeof existingEntry.parking_amount === 'number') { foundCategory = "PARKING"; foundAmount = existingEntry.parking_amount.toString(); }
        else if (typeof existingEntry.taxi_amount === 'number') { foundCategory = "TAXI"; foundAmount = existingEntry.taxi_amount.toString(); }
        else if (typeof existingEntry.transport_amount === 'number') { foundCategory = "AVION/TREN"; foundAmount = existingEntry.transport_amount.toString(); }
        else if (typeof existingEntry.hotel_amount === 'number') { foundCategory = "HOTEL"; foundAmount = existingEntry.hotel_amount.toString(); }
        else if (typeof existingEntry.lunch_amount === 'number') { foundCategory = "ALMUERZO"; foundAmount = existingEntry.lunch_amount.toString(); }
        else if (typeof existingEntry.dinner_amount === 'number') { foundCategory = "CENA"; foundAmount = existingEntry.dinner_amount.toString(); }
        else if (typeof existingEntry.miscellaneous_amount === 'number') { foundCategory = "VARIOS"; foundAmount = existingEntry.miscellaneous_amount.toString(); }
        setCategory(foundCategory);
        setAmountForCategory(foundAmount);

        setKilometers(existingEntry.kilometers?.toString() || "");
        setKmRate(existingEntry.km_rate?.toString() || "0.14");

        const driveId = existingEntry.receipt_google_drive_id || null;
        const webViewLink = existingEntry.receipt_google_drive_web_view_link || null;
        const webContentLink = existingEntry.receipt_google_drive_web_content_link || null;
        setCurrentReceiptGoogleDriveId(driveId);
        setCurrentReceiptWebViewLink(webViewLink);
        setCurrentReceiptWebContentLink(webContentLink);
        setReceiptWebViewLink(webViewLink);
        setImagePreviewUrl(webContentLink || null);

      } else {
        // Create mode
        resetFormFields(); // Resets all fields except sheet selection and currency
        if (currentSheetId) {
          // Launched from a specific sheet page
          const preselectedSheet = availableExpenseSheets.find(sheet => sheet.id === currentSheetId);
          activeCurrency = preselectedSheet?.currency || defaultCurrency;
          activeSheetPaymentMethod = preselectedSheet?.payment_method_filter || "";
        } else {
          // Launched from dashboard, no sheet preselected
          activeSheetId = undefined;
          activeCurrency = defaultCurrency;
          activeSheetPaymentMethod = ""; // No sheet, no payment method initially
        }
      }
      setSelectedSheetId(activeSheetId);
      setCurrentDisplayCurrency(activeCurrency);
      setPaymentMethod(activeSheetPaymentMethod || ""); // Set payment method based on selected sheet
      setErrors({});
      setIsLoading(false);
    }
  }, [isOpen, existingEntry, isEditMode, currentSheetId, availableExpenseSheets, defaultCurrency, initialSheetCurrency]);

  // Effect to handle changes in isMileageType affecting sheet selection OR if an incompatible sheet is selected
  useEffect(() => {
    if (isMileageDisabledBySheet && isMileageType) {
      // If mileage is on, but an incompatible sheet is selected (e.g. user changed sheet),
      // automatically turn off mileage. This is more direct than just a toast.
      setIsMileageType(false);
      // toast.info("Registro de kilometraje desactivado automáticamente: la hoja seleccionada no es de tipo EFECTIVO.");
    }
  }, [isMileageDisabledBySheet, isMileageType]);

  const resetFormFields = () => { // Renamed from resetForm to avoid confusion, this resets only data fields
    setEntryDate(new Date());
    setProject("");
    setCompany("");
    setLocation("");
    setIsExpenseType(true);
    setIsMileageType(false);
    setMerchantName("");
    setPaymentMethod("");
    setCategory("");
    setAmountForCategory("");
    setKilometers("");
    setKmRate("0.14");
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setReceiptWebViewLink(null);
    setCurrentReceiptGoogleDriveId(null);
    setCurrentReceiptWebViewLink(null);
    setCurrentReceiptWebContentLink(null);
    setRotationAngle(0);
    setZoomLevel(1);
    setIsOcrLoading(false);
    setOcrRawText(null);
  }

  const resetAllAndClose = () => {
    resetFormFields();
    setSelectedSheetId(undefined); // Also reset sheet selection
    setCurrentDisplayCurrency(initialSheetCurrency || defaultCurrency); // Reset currency to initial/default
    setErrors({});
    setIsLoading(false);
    onClose();
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!entryDate) newErrors.entryDate = "La fecha del gasto es obligatoria.";
    if (!isEditMode && !selectedSheetId) newErrors.selectedSheetId = "La hoja de gastos es obligatoria.";
    
    if (!isExpenseType && !isMileageType) {
      newErrors.entryType = "Por favor, seleccione al menos un tipo de entrada (Gasto o Kilometraje).";
    }
    if (isExpenseType) {
      if (!paymentMethod) newErrors.paymentMethod = "El método de pago es obligatorio para los gastos.";
      if (!category) newErrors.category = "La categoría es obligatoria para los gastos.";
      if (!amountForCategory.trim()) {
        newErrors.amountForCategory = "El importe es obligatorio para los gastos.";
      } else if (isNaN(parseFloat(amountForCategory))) {
        newErrors.amountForCategory = "El importe debe ser un número.";
      } else if (parseFloat(amountForCategory) <= 0) {
        newErrors.amountForCategory = "El importe debe ser positivo para los gastos.";
      }
    }
    if (isMileageType) {
      if (!kilometers.trim()) {
        newErrors.kilometers = "Los kilómetros son obligatorios para las entradas de kilometraje.";
      } else if (isNaN(parseFloat(kilometers))) {
        newErrors.kilometers = "Los kilómetros deben ser un número.";
      } else if (parseFloat(kilometers) < 0) {
        newErrors.kilometers = "Los kilómetros no pueden ser negativos.";
      }
      if (!kmRate.trim()) {
        newErrors.kmRate = "La tarifa (€/km) es obligatoria para las entradas de kilometraje.";
      } else if (isNaN(parseFloat(kmRate))) {
        newErrors.kmRate = "La tarifa debe ser un número.";
      } else if (parseFloat(kmRate) <= 0) {
        newErrors.kmRate = "La tarifa debe ser positiva.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    let googleDriveIdForPayload: string | null | undefined = currentReceiptGoogleDriveId;
    let webViewLinkForPayload: string | null | undefined = currentReceiptWebViewLink;
    let webContentLinkForPayload: string | null | undefined = currentReceiptWebContentLink;
    let fileNameForPayload: string | null | undefined = isEditMode && existingEntry ? existingEntry.receipt_google_drive_file_name : null;

    try {
      // fileNameForPayload is initialized at the top of handleSubmit
      if (selectedFile && isExpenseType) {
        if (!entryDate) {
          toast.error("Error de Subida de Imagen: La fecha del gasto es necesaria para nombrar el archivo.");
          setErrors(prev => ({ ...prev, entryDate: "La fecha del gasto es obligatoria." }));
          setIsLoading(false);
          return;
        }

        const expenseDateStrForUpload = format(entryDate, "yyyy-MM-dd");
        let sheetNameForUpload = "HojaPorDefecto"; // Default value
        const currentSheetForUpload = availableExpenseSheets.find(s => s.id === selectedSheetId);
        if (currentSheetForUpload) {
            sheetNameForUpload = currentSheetForUpload.name;
        } else if (isEditMode && currentSheetId) { // Fallback for edit mode if selectedSheetId is somehow lost
            const originalSheet = availableExpenseSheets.find(s => s.id === currentSheetId);
            if (originalSheet) sheetNameForUpload = originalSheet.name;
        }
        
        const queryParamsForUpload = {
          sheet_name: sheetNameForUpload,
          expense_date_str: expenseDateStrForUpload,
          project_name: project || null,
          company_name: company || null,
        };

        const bodyForUpload = {
          file: selectedFile!,
        };

        const uploadResponse = await brain.upload_receipt_image_to_drive(queryParamsForUpload, bodyForUpload);
        const uploadData: GoogleDriveUploadResponse = await uploadResponse.json();
        if (uploadResponse.ok && uploadData.google_file_id) {
          googleDriveIdForPayload = uploadData.google_file_id;
          webViewLinkForPayload = uploadData.web_view_link || null;
          webContentLinkForPayload = uploadData.web_content_link || null;
          fileNameForPayload = uploadData.file_name || null; // Use filename from Drive API response
          toast.success("¡Imagen del ticket subida a Google Drive!");
        } else {
          const errorMsg = uploadData?.detail || "Error al subir imagen a Google Drive.";
          toast.error(`Error de Subida de Imagen: ${errorMsg}`);
          setErrors(prev => ({ ...prev, receiptImage: errorMsg }));
          setIsLoading(false);
          return;
        }
      } else if (!selectedFile && isExpenseType && isEditMode && existingEntry?.receipt_google_drive_id && currentReceiptGoogleDriveId === null) {
        // Image was explicitly removed for an expense type, clear all Drive related fields including filename
        googleDriveIdForPayload = null;
        webViewLinkForPayload = null;
        webContentLinkForPayload = null;
        fileNameForPayload = null; 
      } else if (!isExpenseType) {
         // Not an expense type, no image should be associated, clear all Drive related fields
        googleDriveIdForPayload = null;
        webViewLinkForPayload = null; 
        webContentLinkForPayload = null;
        fileNameForPayload = null;
      }
      // If none of the above conditions are met (e.g., edit mode, no new file, image not removed),
      // googleDriveIdForPayload, webViewLinkForPayload, webContentLinkForPayload, and fileNameForPayload
      // retain their initial values (from currentReceipt... states or existingEntry for filename).

      const payload: any = {
        entry_date: format(entryDate!, "yyyy-MM-dd"),
        project: project || null,
        company: company || null,
        location: location || null,
        merchant_name: null,
        payment_method: null, 
        parking_amount: null,
        taxi_amount: null,
        transport_amount: null,
        hotel_amount: null,
        lunch_amount: null,
        dinner_amount: null,
        various_amount: null,
        kilometers: null,
        km_rate: null,
        receipt_google_drive_id: null,
        receipt_google_drive_web_view_link: null,
        receipt_google_drive_web_content_link: null,
        receipt_google_drive_file_name: null, 
      };

      if (isExpenseType) {
        payload.merchant_name = merchantName || null;
        payload.payment_method = paymentMethod;
        const parsedAmount = parseFloat(amountForCategory);
        if (category === "PARKING") payload.parking_amount = parsedAmount;
        else if (category === "TAXI") payload.taxi_amount = parsedAmount;
        else if (category === "AVION/TREN") payload.transport_amount = parsedAmount;
        else if (category === "HOTEL") payload.hotel_amount = parsedAmount;
        else if (category === "ALMUERZO") payload.lunch_amount = parsedAmount;
        else if (category === "CENA") payload.dinner_amount = parsedAmount;
        else if (category === "VARIOS") payload.miscellaneous_amount = parsedAmount;
        
        payload.receipt_google_drive_id = googleDriveIdForPayload;
        payload.receipt_google_drive_web_view_link = webViewLinkForPayload;
        payload.receipt_google_drive_web_content_link = webContentLinkForPayload;
        payload.receipt_google_drive_file_name = fileNameForPayload; 
      } else {
        payload.payment_method = "N/A";
      }

      if (isMileageType) {
        payload.kilometers = parseFloat(kilometers) || null; 
        payload.km_rate = parseFloat(kmRate) || null; 
      } else {
        payload.kilometers = null;
        payload.km_rate = null;
      }

      console.log("Expense Entry Payload:", JSON.stringify(payload, null, 2));

      let response;
      let targetSheetIdForApiCall: string;

      if (isEditMode && existingEntry?.id) {
        if (!currentSheetId) { // Should be the original sheet ID of the entry being edited
            toast.error("No se puede actualizar la entrada: Falta el ID de la hoja original.");
            setIsLoading(false);
            return;
        }
        targetSheetIdForApiCall = currentSheetId; // This is the original sheet ID of the entry
        
        const updatePayload: ExpenseEntryUpdateRequest = {
          ...payload,
        };

        if (selectedSheetId && targetSheetIdForApiCall && selectedSheetId !== targetSheetIdForApiCall) {
          updatePayload.new_sheet_id = selectedSheetId;
        }

        response = await brain.update_expense_entry_in_sheet({ sheetId: targetSheetIdForApiCall, entryId: existingEntry.id }, updatePayload);
      } else {
        if (!selectedSheetId) {
            toast.error("No se puede añadir la entrada: Hoja de gastos no seleccionada.");
            setErrors(prev => ({ ...prev, selectedSheetId: "La hoja de gastos es obligatoria."}));
            setIsLoading(false);
            return;
        }
        targetSheetIdForApiCall = selectedSheetId;
        response = await brain.add_expense_entry_to_sheet({ sheetId: targetSheetIdForApiCall }, payload as ExpenseEntryCreateRequest);
      }
      const responseData = await response.json();

      if (response.ok) {
        toast.success(`¡Gasto ${isEditMode ? 'actualizado' : 'añadido'} correctamente!`);
        onSuccess();
        resetAllAndClose();
      } else {
        const errorMsg = responseData?.detail || (responseData?.errors && responseData.errors[0]?.msg) || `Error al ${isEditMode ? 'actualizar' : 'añadir'} el gasto.`;
        toast.error(errorMsg);
        if (responseData?.errors) {
          const backendErrors: Record<string, string> = {};
          responseData.errors.forEach((err: any) => {
            if (err.loc && err.loc.length > 1) {
              backendErrors[err.loc[1]] = err.msg;
            }
          });
          setErrors(prev => ({ ...prev, ...backendErrors }));
        }
      }
    } catch (error: any) {
      console.error(`Error al ${isEditMode ? 'actualizar o añadir' : 'añadir'} gasto o subir imagen:`, error);
      const errorMessage = error?.message || String(error);
      toast.error(`Ocurrió un error inesperado: ${errorMessage}. Por favor, revise la consola e intente de nuevo.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const currentErrors = { ...errors };
    delete currentErrors.receiptImage;
    setErrors(currentErrors);
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Tipo de archivo inválido. Por favor, suba un JPG, PNG, GIF o PDF.");
        setErrors(prev => ({ ...prev, receiptImage: "Tipo de archivo inválido." }));
        setSelectedFile(null);
        setImagePreviewUrl(currentReceiptWebContentLink); // Revert to existing content
        setReceiptWebViewLink(currentReceiptWebViewLink);
        event.target.value = ""; // Reset file input
        return;
      }
      const maxSizeInMB = 5;
      if (file.size > maxSizeInMB * 1024 * 1024) {
        toast.error(`Archivo demasiado grande. El tamaño máximo es ${maxSizeInMB}MB.`);
        setErrors(prev => ({ ...prev, receiptImage: `Archivo demasiado grande (máx ${maxSizeInMB}MB).` }));
        setSelectedFile(null);
        setImagePreviewUrl(currentReceiptWebContentLink);
        setReceiptWebViewLink(currentReceiptWebViewLink);
        event.target.value = "";
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setImagePreviewUrl(URL.createObjectURL(file));
      } else {
        setImagePreviewUrl(null); // No preview for PDF directly
      }
      setReceiptWebViewLink(null); // Clear any old Drive link as new file is selected
      setCurrentReceiptGoogleDriveId(null); // Clear existing Drive ID
      setCurrentReceiptWebContentLink(null);
      setCurrentReceiptWebViewLink(null);
      setRotationAngle(0);
      setZoomLevel(1);
      if (file) {
        // performOcr(file); // OCR Desactivado temporalmente
      }
    } else {
      setSelectedFile(null);
      setImagePreviewUrl(currentReceiptWebContentLink);
      setReceiptWebViewLink(currentReceiptWebViewLink);
      setOcrRawText(null);
      setIsOcrLoading(false);
    }
  };

  const performOcr = async (file: File) => {
    setIsOcrLoading(true);
    setOcrRawText(null);
    try {
      if (!brain.process_receipt_google_cloud_vision) {
        console.error("Función de procesamiento OCR no disponible en el cliente brain.");
        toast.error("El servicio OCR se está inicializando, por favor intente de nuevo en un momento.");
        setIsOcrLoading(false);
        return;
      }
      const response = await brain.process_receipt_google_cloud_vision({ file });
      const ocrResult = await response.json();
      if (response.ok && ocrResult.raw_text) {
        setOcrRawText(ocrResult.raw_text);
        toast.success("Texto del ticket extraído. Use el botón Ayudante OCR.");
      } else {
        const errorMsg = ocrResult?.detail || "Error al extraer texto usando OCR.";
        toast.error(`Error OCR: ${errorMsg}`);
        setOcrRawText(null);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      toast.error(`Fallo en la Petición OCR: ${errorMessage}`);
      setOcrRawText(null);
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setReceiptWebViewLink(null);
    setCurrentReceiptGoogleDriveId(null); // Important: Mark as removed for handleSubmit
    setCurrentReceiptWebContentLink(null);
    setCurrentReceiptWebViewLink(null);
    setRotationAngle(0);
    setZoomLevel(1);
    const fileInput = document.getElementById('receiptImage') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    const currentErrors = { ...errors };
    delete currentErrors.receiptImage;
    setErrors(currentErrors);
    setIsOcrLoading(false);
    setOcrRawText(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAllAndClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Gasto" : "Añadir Nuevo Gasto"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Actualice los detalles del gasto." : "Introduzca los detalles para el nuevo gasto. Los campos marcados con * son obligatorios."}
          </DialogDescription>
        </DialogHeader>

        {/* Expense Sheet Selector */}
        <div className="pt-2 pb-4">
          <Label htmlFor="expenseSheetSelect">Hoja de Gastos *</Label>
          <Select 
            value={selectedSheetId}
            onValueChange={(value) => {
              setSelectedSheetId(value);
              const selectedSheet = filteredExpenseSheetsForSelection.find(sheet => sheet.id === value); // Use filtered list
              setCurrentDisplayCurrency(selectedSheet?.currency || defaultCurrency);
              setPaymentMethod(selectedSheet?.payment_method_filter || "");
              if (errors.selectedSheetId) {
                const newErrors = {...errors};
                delete newErrors.selectedSheetId;
                setErrors(newErrors);
              }
            }}
            disabled={isLoading || filteredExpenseSheetsForSelection.length === 0 || isEditMode} 
          >
            <SelectTrigger id="expenseSheetSelect" className="mt-1">
              <SelectValue placeholder={filteredExpenseSheetsForSelection.length === 0 ? (isMileageType ? "No hay hojas de EFECTIVO" : "No hay hojas disponibles") : "Seleccione una hoja de gastos"} />
            </SelectTrigger>
            <SelectContent>
              {filteredExpenseSheetsForSelection.map(sheet => (
                <SelectItem key={sheet.id} value={sheet.id}>
                  {sheet.name} ({sheet.currency}{sheet.payment_method_filter ? ` - ${sheet.payment_method_filter}` : ""})
                </SelectItem>
              ))}
              {filteredExpenseSheetsForSelection.length === 0 && <p className="p-2 text-sm text-muted-foreground">{isMileageType ? "No hay hojas de gastos de tipo EFECTIVO." : "No hay hojas de gastos disponibles."}</p>}
            </SelectContent>
          </Select>
          {errors.selectedSheetId && <p className="text-red-500 text-xs mt-1">{errors.selectedSheetId}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="entryDate">Fecha del Gasto *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={`w-full justify-start text-left font-normal mt-1 ${!entryDate && "text-muted-foreground"}`} disabled={isLoading}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {entryDate ? format(entryDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={entryDate} onSelect={setEntryDate} initialFocus disabled={(date) => date > new Date() || isLoading} locale={es} />
              </PopoverContent>
            </Popover>
            {errors.entryDate && <p className="text-red-500 text-xs mt-1">{errors.entryDate}</p>}
          </div>

          <div>
            <Label htmlFor="project">Proyecto</Label>
            <Input id="project" value={project} onChange={(e) => setProject(e.target.value)} placeholder="Ej: Reunión Cliente X" disabled={isLoading} className="mt-1" />
            {errors.project && <p className="text-red-500 text-xs mt-1">{errors.project}</p>}
          </div>

          <div>
            <Label htmlFor="company">Empresa</Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ej: ACME Corp" disabled={isLoading} className="mt-1" />
            {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
          </div>

          <div>
            <Label htmlFor="location">Ubicación</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Oficina Madrid" disabled={isLoading} className="mt-1" />
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
          </div>

          <hr className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch id="isExpenseType" checked={isExpenseType} onCheckedChange={setIsExpenseType} disabled={isLoading} />
              <Label htmlFor="isExpenseType" className="cursor-pointer">Registrar Gasto</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="isMileageType" 
                checked={isMileageType} 
                onCheckedChange={setIsMileageType} // Direct state update
                disabled={isLoading || isMileageDisabledBySheet} // Disable if loading or sheet is incompatible
              />
              <Label 
                htmlFor="isMileageType" 
                className={`cursor-pointer ${isMileageDisabledBySheet ? 'text-gray-400 dark:text-gray-500' : ''}`}
              >
                Registrar Kilometraje
              </Label>
              {isMileageDisabledBySheet && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  Opción solo disponible para hojas de gastos de EFECTIVO
                </span>
              )}
            </div>
            {errors.entryType && <p className="text-red-500 text-xs mt-1">{errors.entryType}</p>}
          </div>

          {isExpenseType && (
            <div className="p-4 border rounded-md mt-4 space-y-4 bg-slate-50 dark:bg-slate-800/30">
              <h3 className="text-lg font-semibold">Detalles del Gasto</h3>
              <div>
                <Label htmlFor="merchantName">Nombre del Comercio</Label>
                <Input id="merchantName" value={merchantName} onChange={(e) => setMerchantName(e.target.value)} disabled={isLoading} className="mt-1 bg-white dark:bg-slate-900" />
                {errors.merchantName && <p className="text-red-500 text-xs mt-1">{errors.merchantName}</p>}
              </div>
              <div>
                <Label htmlFor="paymentMethod">Método de Pago *</Label>
                <Select 
                  value={paymentMethod || ""} 
                  onValueChange={setPaymentMethod} 
                  disabled={true} // Always disabled as it's derived from the sheet
                >
                  <SelectTrigger className="mt-1 bg-white dark:bg-slate-900">
                    <SelectValue placeholder={!selectedSheetId ? "Seleccione una hoja primero" : "Método de pago (automático)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TARJETA">Tarjeta</SelectItem>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    {/* Only show N/A if it's a valid state, otherwise remove if sheet always defines TARJETA/EFECTIVO */}
                    {/* <SelectItem value="">N/A</SelectItem> */}
                  </SelectContent>
                </Select>
                {errors.paymentMethod && <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>}
              </div>
              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                  <SelectTrigger className="mt-1 bg-white dark:bg-slate-900"><SelectValue placeholder="Seleccione categoría" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARKING">{categoryToSpanish("PARKING")}</SelectItem>
                    <SelectItem value="TAXI">{categoryToSpanish("TAXI")}</SelectItem>
                    <SelectItem value="AVION/TREN">{categoryToSpanish("AVION/TREN")}</SelectItem>
                    <SelectItem value="HOTEL">{categoryToSpanish("HOTEL")}</SelectItem>
                    <SelectItem value="ALMUERZO">{categoryToSpanish("ALMUERZO")}</SelectItem>
                    <SelectItem value="CENA">{categoryToSpanish("CENA")}</SelectItem>
                    <SelectItem value="VARIOS">{categoryToSpanish("VARIOS")}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
              </div>
              <div>
                <Label htmlFor="amountForCategory">Importe ({currentDisplayCurrency}) *</Label>
                <Input id="amountForCategory" type="number" value={amountForCategory} onChange={(e) => setAmountForCategory(e.target.value)} placeholder="Ej: 25.50" step="0.01" disabled={isLoading} className="mt-1 bg-white dark:bg-slate-900" />
                {errors.amountForCategory && <p className="text-red-500 text-xs mt-1">{errors.amountForCategory}</p>}
              </div>
              <div>
                <Label htmlFor="receiptImage">Imagen/PDF del Ticket (Opcional)</Label>
                <Input id="receiptImage" type="file" onChange={handleImageChange} className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-800 dark:file:text-blue-200 dark:hover:file:bg-blue-700 transition-colors duration-200" disabled={isLoading} accept="image/jpeg,image/png,image/gif,application/pdf" />
                {errors.receiptImage && <p className="text-red-500 text-xs mt-1">{errors.receiptImage}</p>}
                {(imagePreviewUrl || receiptWebViewLink) && (
                  <div className="mt-3 relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto border p-2 rounded-md">
                    {imagePreviewUrl && imagePreviewUrl.startsWith("blob:") && (
                      <div className="overflow-hidden rounded-md border border-gray-300 dark:border-gray-600 flex justify-center items-center bg-gray-50 dark:bg-gray-700/50 min-h-[150px]">
                        <img src={imagePreviewUrl} alt="Vista previa del ticket" className="object-contain max-h-60 w-auto transition-transform duration-200 ease-in-out shadow-sm" style={{ transform: `rotate(${rotationAngle}deg) scale(${zoomLevel})` }} onError={() => { setImagePreviewUrl(null); }} />
                      </div>
                    )}
                    {imagePreviewUrl && !imagePreviewUrl.startsWith("blob:") && (
                      <div className="overflow-hidden rounded-md border border-gray-300 dark:border-gray-600 flex justify-center items-center bg-gray-50 dark:bg-gray-700/50 min-h-[150px]">
                        <img src={imagePreviewUrl} alt="Vista previa del ticket (Drive)" className="object-contain max-h-60 w-auto transition-transform duration-200 ease-in-out shadow-sm" style={{ transform: `rotate(${rotationAngle}deg) scale(${zoomLevel})` }} onError={(e) => { setImagePreviewUrl(null); }} />
                      </div>
                    )}
                    {!imagePreviewUrl && currentReceiptWebContentLink && receiptWebViewLink && (
                      <p className="text-sm text-center text-gray-600 dark:text-gray-300 py-2">Vista previa no disponible para este tipo de archivo.</p>
                    )}
                    {receiptWebViewLink && (
                      <a href={receiptWebViewLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 visited:text-purple-600 mt-2 inline-block text-sm underline">
                        Ver Ticket en Google Drive
                      </a>
                    )}
                    <div className="mt-2 flex items-center justify-center space-x-2">
                      {imagePreviewUrl && (
                        <TooltipProvider>
                          <Tooltip><TooltipTrigger asChild><Button type="button" variant="outline" size="icon" onClick={() => setRotationAngle(prev => prev - 90)} aria-label="Rotar izquierda" disabled={isLoading}><RotateCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Rotar Izquierda</p></TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button type="button" variant="outline" size="icon" onClick={() => setRotationAngle(prev => prev + 90)} aria-label="Rotar derecha" disabled={isLoading}><RotateCw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Rotar Derecha</p></TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button type="button" variant="outline" size="icon" onClick={() => setZoomLevel(prev => Math.max(0.2, prev - 0.1))} aria-label="Alejar" disabled={isLoading || zoomLevel <= 0.2}><ZoomOut className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Alejar</p></TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button type="button" variant="outline" size="icon" onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.1))} aria-label="Acercar" disabled={isLoading || zoomLevel >= 3}><ZoomIn className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Acercar</p></TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button type="button" variant="outline" size="icon" onClick={() => { setRotationAngle(0); setZoomLevel(1); }} aria-label="Restablecer vista" disabled={isLoading}><RefreshCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Restablecer Vista</p></TooltipContent></Tooltip>
                        </TooltipProvider>
                      )}
                      <Button variant="destructive" size="sm" onClick={handleRemoveImage} className="ml-auto self-center" aria-label="Eliminar imagen" type="button" disabled={isLoading}>
                        <XCircle size={16} className="mr-1" />Remove
                      </Button>
                      {/* {ocrRawText && !isOcrLoading && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" onClick={() => alert(`Texto OCR:\n${ocrRawText}`)} aria-label="Ayudante OCR">
                                    <HelpCircle className="h-5 w-5 text-purple-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Mostrar texto extraído por OCR</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )} */}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isMileageType && (
            <div className="p-4 border rounded-md mt-4 space-y-4 bg-sky-50 dark:bg-sky-800/30">
              <h3 className="text-lg font-semibold">Detalles del Kilometraje</h3>
              <div>
                <Label htmlFor="kilometers">Kilómetros *</Label>
                <Input id="kilometers" type="number" value={kilometers} onChange={(e) => setKilometers(e.target.value)} placeholder="Ej: 150" step="any" disabled={isLoading} className="mt-1 bg-white dark:bg-slate-900" />
                {errors.kilometers && <p className="text-red-500 text-xs mt-1">{errors.kilometers}</p>}
              </div>
              <div>
                <Label htmlFor="kmRate">Tarifa (€/km) *</Label>
                <Input id="kmRate" type="number" value={kmRate} onChange={(e) => setKmRate(e.target.value)} placeholder="Ej: 0.14" step="0.01" disabled={isLoading} className="mt-1 bg-white dark:bg-slate-900" />
                {errors.kmRate && <p className="text-red-500 text-xs mt-1">{errors.kmRate}</p>}
              </div>
              <div>
                <Label>Calculated Mileage Cost</Label>
                <p className="text-lg font-semibold mt-1">
                  {currentDisplayCurrency} {(parseFloat(kilometers || "0") * parseFloat(kmRate || "0")).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            {/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" onClick={() => { console.log("OCR Helper activated. Raw Text:", ocrRawText); toast.info(ocrRawText ? `OCR Data: ${ocrRawText.substring(0,100)}...` : "No OCR data yet.");}} disabled={isLoading || isOcrLoading || !ocrRawText}>
                    <HelpCircle className="mr-2 h-4 w-4" /> {isOcrLoading ? "Procesando..." : "Ayudante OCR"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Haga clic para ver el texto extraído del recibo (si lo hay). Úselo para completar el formulario.</p>
                  {ocrRawText && <p className="mt-1 text-xs text-gray-400">Raw: {ocrRawText.substring(0, 50)}...</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetAllAndClose} disabled={isLoading}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading || isOcrLoading || (!isEditMode && !selectedSheetId && availableExpenseSheets.length > 0)}>
              {isLoading ? (isEditMode ? "Actualizando..." : "Añadiendo...") : (isEditMode ? "Actualizar Gasto" : "Añadir Gasto")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
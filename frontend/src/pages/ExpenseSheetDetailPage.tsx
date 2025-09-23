import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import brain from 'brain';
import { API_URL } from 'app';
import { auth } from 'app'; // For Firebase auth instance and getAuthToken
import { ExpenseSheet, ExpenseEntry, ExpenseSheetUpdateRequest } from 'types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Save, Download, ChevronDown, FileArchive } from 'lucide-react';
import {
  formatDateToDDMMYYYY,
  formatCurrency, // Make sure this is imported
  displayValueOrDash
} from 'utils/formatters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
console.log("[ExpenseSheetDetailPage] File loaded and parsed by browser (TOP LEVEL)"); // MYA-40: Log component file load

import { AddExpenseEntryForm } from 'components/AddExpenseEntryForm';
import { ExpenseEntryList } from 'components/ExpenseEntryList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const expenseSheetStatusOptions = [
  { value: "pending_validation", label: "Pendiente de Validación" },
  { value: "validated", label: "Validada" },
  { value: "rejected", label: "Rechazada" },
];

const formatMonthYear = (month: number, year: number) => {
  const date = new Date(year, month - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const ExpenseSheetDetailPage: React.FC = () => {
  console.log("[ExpenseSheetDetailPage] Component function body executing START"); // MYA-40: Log inside function body start
  const location = useLocation(); // Added location hook
  console.log(`[ExpenseSheetDetailPage] Current location.key in component body: ${location.key}`); // MYA-40: Log location.key

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize isLoading based on whether a valid sheetId is present at mount time
  // This helps prevent showing "Loading..." if we already know there's no valid ID.
  const initialSheetId = searchParams.get('sheetId');
  const isValidInitialSheetId = initialSheetId && typeof initialSheetId === 'string' && initialSheetId.trim() !== "" && initialSheetId !== "undefined" && initialSheetId !== "null";

  const [sheet, setSheet] = useState<ExpenseSheet | null>(null);
  const [isLoading, setIsLoading] = useState(isValidInitialSheetId); // Only true if ID looks valid initially
  const [error, setError] = useState<string | null>(null);
  const [showAddEntryForm, setShowAddEntryForm] = useState(false);

  const [selectedStatusForUpdate, setSelectedStatusForUpdate] = useState<string>("");
  const [statusComments, setStatusComments] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<ExpenseEntry | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);

  const [entryToEdit, setEntryToEdit] = useState<ExpenseEntry | null>(null);
  const [showEditEntryForm, setShowEditEntryForm] = useState(false);
  const [allExpenseSheets, setAllExpenseSheets] = useState<ExpenseSheet[]>([]);
  const [isExportingZip, setIsExportingZip] = useState(false); // Define state for ZIP export loading

  const [isCategorySummaryOpen, setIsCategorySummaryOpen] = useState(true); // State for Collapsible

  const fetchSheetDetails = async (idToFetch: string) => {
    console.log(`ExpenseSheetDetailPage: fetchSheetDetails CALLED with idToFetch: "${idToFetch}", typeof: ${typeof idToFetch}`);
    
    // This guard is critical. Ensure it's robust.
    if (!idToFetch || typeof idToFetch !== 'string' || idToFetch.trim() === "" || idToFetch === "undefined" || idToFetch === "null") {
      console.error(`ExpenseSheetDetailPage: fetchSheetDetails - GUARD TRIGGERED because idToFetch is invalid: "${idToFetch}"`);
      setError('El ID de la hoja es incorrecto o no existe para la búsqueda.');
      setIsLoading(false); // Ensure loading stops
      toast.error('No se pueden obtener los detalles: El ID de la hoja es incorrecto o no existe.');
      return; 
    }

    // Set loading to true only when we are certain we will attempt a fetch
    setIsLoading(true);
    setError(null); // Clear previous errors

    try {
      console.log(`ExpenseSheetDetailPage: fetchSheetDetails - CALLING API with sheet_id: "${idToFetch}"`);
      const response = await brain.get_expense_sheet_by_id({ sheetId: idToFetch });
      const data = await response.json();
      if (response.ok) {
        setSheet(data);
        setSelectedStatusForUpdate(data.status || "pending_validation");
        setStatusComments(data.comments || "");

        console.log("[ExpenseSheetDetailPage] Raw sheet data received (response.ok):", data); // MYA-40: Log raw data
        // Creator name is now part of the sheet data (sheet.creator_first_name, sheet.creator_last_name)
        // No need to fetch it separately.
      } else {
        // This block executes if response.ok is false
        console.warn("[ExpenseSheetDetailPage] Response for get_expense_sheet_by_id was NOT ok. Status:", response.status, "Response data:", data);
        setError(data?.detail || `Error al obtener los detalles de la hoja (código: ${response.status}).`);
        toast.error(`Error de búsqueda: ${data?.detail || `No se pudieron cargar los detalles de la hoja (código: ${response.status}).`}`); // Added toast for this case
        setSheet(null);
        // No need to manage creatorName or isFetchingCreator state here anymore
      }
    } catch (err) {
      console.error('Error fetching sheet details catch block:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
      setError(errorMessage);
      toast.error(`Error de búsqueda: ${errorMessage}`);
      setSheet(null);
      // No need to manage creatorName or isFetchingCreator state here anymore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAllSheets = async () => {
      try {
        const response = await brain.list_expense_sheets({}); // Assuming no params needed or adjust as necessary
        const data = await response.json();
        if (response.ok) {
          // IMPORTANT: We need to ensure 'currency' is part of the ExpenseSheet type from list_expense_sheets
          // For now, we assume it is. If not, this will need adjustment.
          setAllExpenseSheets(data as ExpenseSheet[]); 
        } else {
          console.error("Failed to fetch all expense sheets:", data);
          toast.error("No se pudo cargar la lista de todas las hojas de gastos.");
        }
      } catch (err) {
        console.error("Error fetching all expense sheets:", err);
        toast.error("Ocurrió un error al obtener la lista de todas las hojas de gastos.");
      }
    };
    fetchAllSheets();
  }, []);

  useEffect(() => {
    console.log(`[ExpenseSheetDetailPage] useEffect TRIGGERED with location.key: ${location.key}`); // MYA-40: Log useEffect trigger and location.key
    const currentSheetId = searchParams.get('sheetId');
    console.log(`ExpenseSheetDetailPage: useEffect triggered. searchParams: "${searchParams.toString()}", currentSheetId: "${currentSheetId}"`);

    if (currentSheetId && typeof currentSheetId === 'string' && currentSheetId.trim() !== "" && currentSheetId !== "undefined" && currentSheetId !== "null") {
      // If sheetId is valid, proceed to fetch
      fetchSheetDetails(currentSheetId);
    } else {
      // If sheetId is not valid, set error and stop loading
      console.warn(`ExpenseSheetDetailPage: useEffect - Invalid or missing sheetId. currentSheetId: "${currentSheetId}". searchParams: "${searchParams.toString()}"`);
      if (searchParams.toString()) { // Only set error if there were params but sheetId was bad
        setError('El ID de la hoja falta o es inválido en la URL.');
        // toast.error('Sheet ID is missing or invalid in URL.'); // Avoid redundant toast if page shows error message
      }
      setSheet(null); // Clear any existing sheet data
      setIsLoading(false); // Explicitly set loading to false
      // No need to manage creatorName or isFetchingCreator state here anymore
    }
  }, [location.key]); // MYA-40: Changed dependency from [searchParams] to [location.key]

  const handleOpenEditForm = (entry: ExpenseEntry) => {
    setEntryToEdit(entry);
    setShowEditEntryForm(true);
    setShowAddEntryForm(false);
  };

  const handleAddEntrySuccess = () => {
    setShowAddEntryForm(false);
    const currentSheetId = searchParams.get('sheetId');
    if (currentSheetId) fetchSheetDetails(currentSheetId);
  };
  
  const handleEditEntrySuccess = () => {
    setShowEditEntryForm(false);
    setEntryToEdit(null);
    const currentSheetId = searchParams.get('sheetId');
    if (currentSheetId) fetchSheetDetails(currentSheetId);
  };

  const handleUpdateSheetStatus = async () => {
    const currentSheetId = searchParams.get('sheetId');
    if (!currentSheetId) {
      toast.error("Falta el ID de la hoja, no se puede actualizar el estado.");
      return;
    }
    if (!selectedStatusForUpdate) {
        toast.error("Por favor, seleccione un estado.");
        return;
    }

    setIsUpdatingStatus(true);
    const payload: Partial<ExpenseSheetUpdateRequest> = {
        status: selectedStatusForUpdate as ExpenseSheetUpdateRequest['status'],
    };

    if (selectedStatusForUpdate === 'rejected') {
        if (!statusComments.trim()) {
            toast.error("Los comentarios son obligatorios al rechazar una hoja.");
            setIsUpdatingStatus(false);
            return;
        }
        payload.comments = statusComments;
    } else {
        payload.comments = statusComments; // Keep comments for other statuses too, or set to null if only for rejected
    }

    try {
        const response = await brain.update_expense_sheet({ sheet_id: currentSheetId }, payload as ExpenseSheetUpdateRequest);
        const responseData = await response.json();
        if (response.ok) {
            toast.success("¡Estado de la hoja de gastos actualizado correctamente!");
            if (currentSheetId) fetchSheetDetails(currentSheetId);
        } else {
            const errorMsg = responseData?.detail || (responseData?.errors && responseData.errors[0]?.msg) || "Error al actualizar el estado.";
            toast.error(`Actualización fallida: ${errorMsg}`);
        }
    } catch (err) {
        console.error("Error updating sheet status:", err);
        const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error inesperado durante la actualización del estado.';
        toast.error(`Error de actualización: ${errorMessage}`);
    } finally {
        setIsUpdatingStatus(false);
    }
  };

  const isStatusOrCommentChanged = () => {
    if (!sheet) return false;
    const initialComments = sheet.comments || "";
    return sheet.status !== selectedStatusForUpdate || initialComments !== statusComments;
  };


  const handleExportToExcel = async () => {
    console.log("[handleExportToExcel] Clicked Export Sheet button");
    const currentSheetId = searchParams.get('sheetId');
    console.log("[handleExportToExcel] currentSheetId:", currentSheetId);
    console.log("[handleExportToExcel] sheet object:", sheet);
    console.log("[handleExportToExcel] isLoading state:", isLoading);

    if (!currentSheetId) {
      toast.error("Falta el ID de la hoja, no se puede exportar.");
      return;
    }
    if (!sheet || !sheet.entries || sheet.entries.length === 0) {
      toast.info("No hay gastos para exportar.");
      return;
    }

    console.log("[handleExportToExcel] Conditions met, about to call API.");
    toast.loading("Generando archivo Excel...", { id: "export-toast" });

    try {
      // The brain client method now returns a Promise<HttpResponse<Blob, ErrorResponse>>
      // (or similar, depending on exact generation for non-streaming binary data)
      const response = await brain.export_expense_sheet_to_excel({ sheet_id: currentSheetId });

      if (response.ok) {
        const data = await response.json(); // Expect JSON with base64 content

        if (data.file_content_base64 && data.file_name) {
          const byteCharacters = atob(data.file_content_base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

          let filename = data.file_name;
          // Attempt to use a more specific filename if sheet name is available and data.file_name is generic
          if (sheet && sheet.name && data.file_name === "expense-sheet.xlsx") {
             filename = `${sheet.name.replace(/[^a-z0-9_.-]/gi, '_')}_export.xlsx`;
          } else if (!filename) {
            // Fallback if data.file_name is somehow empty
            filename = sheet && sheet.name ? `${sheet.name.replace(/[^a-z0-9_.-]/gi, '_')}_export.xlsx` : "expense-sheet.xlsx";
          }

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          toast.success("¡Archivo Excel descargado!", { id: "export-toast" });
        } else {
          toast.error("La respuesta del servidor no contenía los datos del archivo esperados.", { id: "export-toast" });
          console.error("Missing file_content_base64 or file_name in response:", data);
        }
      } else {
        // Handle API errors (e.g., 4xx, 5xx responses)
        let errorDetail = "Error al exportar archivo Excel.";
        try {
            const errorData = await response.json(); // Attempt to parse error JSON
            errorDetail = errorData?.detail || errorData?.message || errorDetail;
        } catch (e) {
            // If parsing error JSON fails, stick to a generic message or use response.statusText
            errorDetail = response.statusText || errorDetail;
            console.warn("Could not parse error response JSON:", e);
        }
        toast.error(`Exportación fallida: ${errorDetail}`, { id: "export-toast" });
        console.error("Error exporting to Excel (API Error):", response);
      }
    } catch (err) {
      console.error("Error exporting to Excel (Network/Client Error):", err);
      let errorMessage = "Ocurrió un error inesperado durante la exportación.";
      if (err && typeof err === 'object') {
        if ('message' in err && typeof err.message === 'string') {
          errorMessage = err.message;
        }
      }
      toast.error(`Error de exportación: ${errorMessage}`, { id: "export-toast" });
    }
  };

  const calculateCategoryTotals = () => {
    if (!sheet || !sheet.entries || sheet.entries.length === 0) {
      return null;
    }
    const totals: Record<string, number> = {};
    const categoryFields: (keyof ExpenseEntry)[] = [
      'parking_amount',
      'taxi_amount',
      'transport_amount',
      'hotel_amount',
      'lunch_amount',
      'dinner_amount',
      'miscellaneous_amount'
    ];

    sheet.entries.forEach(entry => {
      categoryFields.forEach(field => {
        const amount = entry[field] as number | undefined | null;
        if (typeof amount === 'number' && !isNaN(amount)) {
          let categoryName = field.replace('_amount', '');
          if (categoryName === 'miscellaneous') categoryName = 'various'; // Align with AddExpenseEntryForm categories
          categoryName = categoryName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          totals[categoryName] = (totals[categoryName] || 0) + amount;
        }
      });
      // Also include km_amount if present
      if (typeof entry.km_amount === 'number' && !isNaN(entry.km_amount)) {
        totals['Kilometraje'] = (totals['Kilometraje'] || 0) + entry.km_amount;
      }
    });
    return totals;
  };

  const categoryTotals = calculateCategoryTotals();

  const handleExportToZip = async () => {
    if (!sheet || !sheet.id) {
      toast.error("No se puede exportar: falta información de la hoja de gastos.");
      return;
    }
    if (!sheet.entries || sheet.entries.length === 0) {
      toast.info("No hay tickets para exportar en esta hoja.");
      return;
    }

    const { id: sheetId, name: sheetName } = sheet;
    const exportToastId = "export-zip-toast";
    setIsExportingZip(true); // Set loading state at the beginning
    toast.loading("Generando archivo ZIP...", { id: exportToastId });

    try {
      const token = await auth.getAuthToken();
      console.log("[ExpenseSheetDetailPage] Auth token before calling export_expense_sheet_receipts_zip:", token ? `Token present (length: ${token.length}, first 10 chars: ${token.substring(0,10)}...)` : "Token NOT present");

      if (!token) {
        toast.error("Error de autenticación: No se pudo obtener el token.", { id: exportToastId });
        return;
      }

      // Use direct fetch to ensure proper binary stream handling for ZIP export
      const apiUrl = API_URL;
      const fetchUrl = `${apiUrl}/export/expense-sheet/${sheetId}/receipts-zip`;
      console.log("[ExpenseSheetDetailPage] Using direct fetch for URL:", fetchUrl);

      const response = await fetch(fetchUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include", // Add credentials include for dev environment
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ExpenseSheetDetailPage] Fetch error:", response.status, errorText);
        toast.error(`Error al exportar: ${response.status} - ${errorText || "Error del servidor"}`, { id: exportToastId });
        setIsExportingZip(false);
        return;
      }

      if (!response.body) {
        toast.error("Error al exportar: No se recibió cuerpo en la respuesta.", { id: exportToastId });
        setIsExportingZip(false);
        return;
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read(); // value here is Uint8Array
        if (done) {
          break;
        }
        if (value) {
           console.log("[ExpenseSheetDetailPage] Received Uint8Array chunk from fetch, length:", value.length, "First 30 bytes (hex):");
           console.log(Array.from(value.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' '));
          chunks.push(value);
        } else {
          console.log("[ExpenseSheetDetailPage] Received undefined chunk from reader.read(), continuing...");
        }
      }

      if (chunks.length === 0) {
        toast.error("No se recibieron datos para el archivo ZIP.", { id: exportToastId });
        return;
      }

      // Concatenate all chunks into a single Uint8Array
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const completeFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        completeFile.set(chunk, offset);
        offset += chunk.length;
      }

      const blob = new Blob([completeFile], { type: "application/zip" });
      const safeSheetName = sheetName.replace(/[^a-z0-9_.-]/gi, '_') || "HojaDeGastos";
      const filename = `${safeSheetName}_Tickets.zip`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("¡Archivo ZIP descargado!", { id: exportToastId });
      setIsExportingZip(false); // Reset loading state on success

    } catch (err) {
      console.error("Error exporting to ZIP:", err);
      let errorMessage = "Ocurrió un error inesperado durante la exportación del ZIP.";
      // Asegurarse de que el toastId se está pasando correctamente para actualizar el toast de carga
      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage, { id: exportToastId }); 
      setIsExportingZip(false); // Reset loading state on error
      if (err && typeof err === 'object') {
        if ('message' in err && typeof err.message === 'string') {
          errorMessage = err.message;
        } else if ('detail' in err && typeof err.detail === 'string') { // For backend's HTTPException
            errorMessage = err.detail;
        }
      }
      toast.error(`Error de exportación ZIP: ${errorMessage}`, { id: exportToastId });
    }
  };


  const handleOpenDeleteDialog = (entry: ExpenseEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteEntry = async () => {
    const currentSheetId = searchParams.get('sheetId');
    if (!currentSheetId || !entryToDelete || !entryToDelete.id) {
      toast.error("No se puede eliminar la entrada: Falta el ID de la hoja o de la entrada.");
      return;
    }
    setIsDeletingEntry(true);
    try {
      const response = await brain.delete_expense_entry_from_sheet({ 
        sheetId: currentSheetId, // Corrected: sheet_id to sheetId
        entryId: entryToDelete.id  // Corrected: entry_id to entryId
      });
      if (response.ok) {
        toast.success("¡Gasto eliminado correctamente!");
        if (currentSheetId) fetchSheetDetails(currentSheetId);
      } else {
        const errorData = await response.json();
        toast.error(`Eliminación fallida: ${errorData?.detail || "Error desconocido"}`);
      }
    } catch (err) {
      console.error("Error deleting expense entry:", err);
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      toast.error(`Error de eliminación: ${errorMessage}`);
    } finally {
      setIsDeletingEntry(false);
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  // Conditional rendering based on loading, error, and sheet state
  if (isLoading) { 
    // Only show generic loading if we expect a sheet to load.
    // If there was no valid initial sheetId, useEffect would set isLoading to false and potentially an error.
    return <div className="container mx-auto p-4"><p>Cargando detalles de la hoja...</p></div>;
  }

  if (error) { 
    // Show error if an error state is explicitly set.
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-red-50 border-red-200">
            <CardHeader>
                <CardTitle className="text-red-700">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-red-600">{error}</p>
                <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!sheet) {
    // This handles cases where not loading, no specific error set by fetch, but no sheet is available.
    // This implies an invalid/missing sheetId from the URL that didn't trigger a fetch.
    return (
        <div className="container mx-auto p-4 text-center">
            <p className="text-xl text-gray-500 dark:text-gray-400 mb-4">Hoja de gastos no encontrada. Por favor, compruebe la URL o vuelva al panel.</p>
            <Button variant="outline" onClick={() => navigate('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
            </Button>
        </div>
    );
  }

  // If we have a sheet, render the page content
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Button variant="outline" onClick={() => navigate('/')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
      </Button>

      <Card className="mb-8 shadow-lg">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 p-6">
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white">{sheet.name}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">
                    {formatMonthYear(sheet.month, sheet.year)} | Moneda: {sheet.currency} | Estado: <span className={`font-semibold ${sheet.status === 'validated' ? 'text-green-600' : sheet.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{sheet.status?.replace(/_/g, ' ').toUpperCase()}</span>
                    {sheet.payment_method_filter && ` | Filtro Pago: ${sheet.payment_method_filter.replace(/_/g, ' ').toUpperCase()}`}
                    <br />Gastos: {sheet.entries?.length || 0}
                    {/* MYA-40.1: Display Creator Name Start - Updated to use persisted fields */}
                    {(sheet?.creator_first_name || sheet?.creator_last_name) ? (
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Creado por: {sheet.creator_first_name || ''} {sheet.creator_last_name || ''}
                      </span>
                    ) : sheet?.user_id ? ( 
                      <span className="block text-xs text-orange-500 dark:text-orange-400 mt-1">
                        Nombre del creador no disponible en el perfil.
                      </span>
                    ) : null}
                    {/* MYA-40.1: Display Creator Name End */}
                </CardDescription>
            </div>
            <div className='text-right'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>Importe Total</p>
                <p className='text-2xl font-bold text-gray-800 dark:text-white'>{(sheet.total_amount !== null && sheet.total_amount !== undefined ? sheet.total_amount.toFixed(2) : '0.00')} {sheet.currency}</p>
            </div>
          </div>
        </CardHeader>
        {sheet.comments && (
            <CardContent className='p-6 border-t border-gray-200 dark:border-gray-700'>
                <h4 className='text-md font-semibold mb-1 text-gray-700 dark:text-gray-200'>Notas/Comentarios:</h4>
                <p className='text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap'>{sheet.comments}</p>
            </CardContent>
        )}
      </Card>

      <Card className="mb-8 shadow-lg">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 p-6">
            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">Gestionar Estado de la Hoja</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-1">
                    <Label htmlFor="sheetStatus" className="font-medium text-gray-700 dark:text-gray-300">Estado de la Hoja</Label>
                    <Select 
                        value={selectedStatusForUpdate}
                        onValueChange={setSelectedStatusForUpdate}
                        disabled={isUpdatingStatus}
                    >
                        <SelectTrigger id="sheetStatus" className="mt-1 w-full">
                            <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                            {expenseSheetStatusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedStatusForUpdate === 'rejected' && (
                    <div className="md:col-span-2">
                        <Label htmlFor="statusComments" className="font-medium text-gray-700 dark:text-gray-300">Comentarios de Rechazo</Label>
                        <Textarea
                            id="statusComments"
                            value={statusComments}
                            onChange={(e) => setStatusComments(e.target.value)}
                            placeholder="Proporcione el motivo del rechazo..."
                            className="mt-1 w-full min-h-[80px]"
                            disabled={isUpdatingStatus}
                        />
                    </div>
                )}
            </div>
            <div className="flex justify-end mt-4">
                <Button 
                    onClick={handleUpdateSheetStatus} 
                    disabled={isUpdatingStatus || !isStatusOrCommentChanged()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Save className="mr-2 h-4 w-4" />
                    {isUpdatingStatus ? 'Actualizando Estado...' : 'Actualizar Estado'}
                </Button>
            </div>
        </CardContent>
      </Card>

      {categoryTotals && Object.keys(categoryTotals).length > 0 && (
        <Collapsible
          open={isCategorySummaryOpen}
          onOpenChange={setIsCategorySummaryOpen}
          className="mb-8"
        >
          <Card className="shadow-lg">
            <CollapsibleTrigger asChild>
              <CardHeader className="bg-gray-50 dark:bg-gray-800 p-6 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">Resumen por Categoría</CardTitle>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 ${
                      isCategorySummaryOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  {Object.entries(categoryTotals).map(([category, total]) => (
                    <li key={category} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{category}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(total, sheet.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Gastos Registrados</h2>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportToExcel} 
            variant="outline"
            disabled={isLoading || !sheet || !sheet.entries || sheet.entries.length === 0}
          >
            <Download className="mr-2 h-5 w-5" /> Exportar Hoja
          </Button>
          <Button 
            onClick={handleExportToZip} 
            variant="outline"
            disabled={isLoading || !sheet || !sheet.entries || sheet.entries.length === 0}
          >
            <FileArchive className="mr-2 h-5 w-5" /> Descargar Tickets (ZIP)
          </Button>
          <Button onClick={() => setShowAddEntryForm(true)} disabled={isLoading || !searchParams.get('sheetId')}>
            <PlusCircle className="mr-2 h-5 w-5" /> Añadir Nuevo Gasto
          </Button>
        </div>
      </div>

      {showAddEntryForm && sheet && (
        <AddExpenseEntryForm
          isOpen={showAddEntryForm}
          onClose={() => setShowAddEntryForm(false)}
          onSuccess={handleAddEntrySuccess}
          currentSheetId={sheet.id!}
          availableExpenseSheets={allExpenseSheets} // Pass all sheets
          initialSheetCurrency={sheet.currency} // Currency of the current sheet
          defaultCurrency={sheet.currency} // Default to current sheet's currency
        />
      )}

      {showEditEntryForm && entryToEdit && sheet && (
        <AddExpenseEntryForm
          isOpen={showEditEntryForm}
          onClose={() => {
            setShowEditEntryForm(false);
            setEntryToEdit(null);
          }}
          onSuccess={handleEditEntrySuccess}
          currentSheetId={sheet.id!} // ID of the current sheet context
          availableExpenseSheets={allExpenseSheets} // Pass all sheets (will be disabled in form)
          initialSheetCurrency={sheet.currency} // Currency of the current sheet
          existingEntry={entryToEdit}
          defaultCurrency={sheet.currency} // Default to current sheet's currency
        />
      )}

      <ExpenseEntryList 
        entries={sheet.entries || []} 
        sheetCurrency={sheet.currency} 
        isLoading={isLoading} 
        onEditEntry={handleOpenEditForm} 
        onDeleteEntry={handleOpenDeleteDialog}
      />

      {entryToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Está seguro de que desea eliminar este gasto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto de "{entryToDelete.merchant_name}" con fecha {entryToDelete.entry_date ? formatDateToDDMMYYYY(entryToDelete.entry_date) : "N/A"}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingEntry}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDeleteEntry} 
                disabled={isDeletingEntry}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeletingEntry ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
};

export default ExpenseSheetDetailPage;

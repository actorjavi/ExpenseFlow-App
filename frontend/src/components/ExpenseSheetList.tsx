import React, { useState } from "react";
import { CreateExpenseSheetForm } from "components/CreateExpenseSheetForm";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExpenseSheet } from "types"; // Or from brain/data-contracts
import { toast } from "sonner";
import brain from "brain";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { mode, Mode, API_URL } from "app"; // Import mode, Mode and API_URL
import { saveAs } from "file-saver"; // Added import for saveAs
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Props {
  sheets: ExpenseSheet[];
  isLoading: boolean;
  refreshSheets: () => void;
  // Add a prop to control the create form visibility from the parent (ExpenseDashboardPage)
  // This allows ExpenseDashboardPage to manage when the CreateExpenseSheetForm (for new sheets) is open
  // and when the edit form (managed within ExpenseSheetList) is open, preventing overlaps.
  isCreateFormOpen: boolean; 
  setIsCreateFormOpen: (isOpen: boolean) => void;
}

const formatMonthYear = (month: number, year: number) => {
  const date = new Date(year, month - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "validated":
      return "default"; // Typically green, but shadcn default is fine
    case "pending_validation":
      return "secondary"; // Typically yellow/orange
    case "rejected":
      return "destructive"; // Typically red
    default:
      return "outline";
  }
};

export const ExpenseSheetList: React.FC<Props> = ({ sheets, isLoading, refreshSheets, isCreateFormOpen, setIsCreateFormOpen }) => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [sheetToEdit, setSheetToEdit] = useState<ExpenseSheet | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<Record<string, boolean>>({}); // For individual export loading state

  const handleOpenEditForm = (sheet: ExpenseSheet) => {
    if (isCreateFormOpen) {
        setIsCreateFormOpen(false); 
    }
    setSheetToEdit(sheet);
    setIsEditFormOpen(true);
  };

  const handleCloseEditForm = () => {
    setIsEditFormOpen(false);
    setSheetToEdit(null);
  };

  const handleEditSuccess = () => {
    handleCloseEditForm();
    refreshSheets(); 
  };

  const handleViewSheet = (sheetId: string | undefined) => {
    if (!sheetId) {
      toast.error("No se puede ver la hoja: Falta el ID de la hoja.");
      console.error("Attempted to navigate with undefined sheetId");
      return;
    }
    navigate(`/expense-sheet-detail-page?sheetId=${sheetId}`);
  };

  const handleDeleteSheet = async (sheetId: string) => {
    try {
      const response = await brain.delete_expense_sheet({ sheetId: sheetId }); 
      if (response.ok) {
        toast.success("¡Hoja de gastos eliminada correctamente!");
        refreshSheets();
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error during deletion response parsing."}))
        toast.error(`Error al eliminar la hoja de gastos: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error("Unexpected error deleting expense sheet:", error);
      toast.error("Ocurrió un error inesperado al eliminar la hoja de gastos.");
    }
  };

  const handleExportSheet = async (sheetId: string, sheetName: string) => {
    if (!sheetId) {
      toast.error("No se puede exportar la hoja: Falta el ID de la hoja.");
      return;
    }
    setIsExporting(prev => ({ ...prev, [sheetId]: true }));
try {
  const response = await brain.export_expense_sheet_to_excel({ sheet_id: sheetId });
  console.log("[DEBUG_BRAIN_EXPORT] Received response from brain:", response);

  if (response.ok) {
    const data = await response.json(); // data should be ExportResponse type
    console.log("[DEBUG_BRAIN_EXPORT] Received JSON data from brain:", data);

    if (data.file_content_base64 && data.file_name) {
      const byteCharacters = atob(data.file_content_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      // MIME type for .xlsx file
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      saveAs(blob, data.file_name);
      toast.success(`Hoja "${sheetName}" descargada como ${data.file_name}`);
    } else {
      console.error("[DEBUG_BRAIN_EXPORT] Export failed: JSON response missing expected fields.", data);
      toast.error(`Error al exportar: Respuesta inesperada del servidor (brain).`);
    }
  } else {
    let errorText = `Error al exportar la hoja "${sheetName}" con brain.`;
    try {
      // Try to parse error response if it's JSON (FastAPI validation errors often are)
      const errorData = await response.json(); 
      errorText += ` Detalles: ${errorData.detail || response.statusText || response.status }`;
    } catch (e) {
      // If not JSON, or other error, use status or a generic message
      errorText += ` Estado: ${response.status || 'Error desconocido'}`;
    }
    console.error("[DEBUG_BRAIN_EXPORT] Export failed response from brain:", response, errorText);
    toast.error(errorText);
  }
} catch (error: any) {
  console.error("Manual Fetch Export failed for sheet:", sheetName, error);
  toast.error(`Error de exportación para la hoja "${sheetName}". Error: ${error.message || error.toString()}`);
} finally {
  setIsExporting(prev => ({ ...prev, [sheetId]: false }));
}
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-gray-500 dark:text-gray-400">Cargando hojas de gastos...</p>
        {/* Consider adding Skeleton components here for a better UX */}
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="text-center py-10 mt-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-xl font-medium text-gray-900 dark:text-white">No hay hojas de gastos</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comienza creando una nueva hoja de gastos.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden shadow-sm bg-white dark:bg-gray-800">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-gray-700">
            <TableHead className="w-[250px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mes/Año</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Moneda</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Método de Pago</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Importe Total</TableHead>
            <TableHead className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sheets.map((sheet) => (
            <TableRow key={sheet.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  onClick={() => handleViewSheet(sheet.id!)}
                  title={`Ver detalles de ${sheet.name}`}
                >
                  {sheet.name}
                </Button>
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatMonthYear(sheet.month, sheet.year)}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{sheet.currency}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{sheet.payment_method_filter || "Cualquiera"}</TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                <Badge variant={getStatusBadgeVariant(sheet.status || "pending_validation")}>
                  {sheet.status === "pending_validation" ? "Pendiente Validación" : sheet.status ? sheet.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Pendiente Validación"}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right font-semibold">
                {sheet.total_amount != null ? sheet.total_amount.toFixed(2) : "0.00"}
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center space-x-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-2 text-xs text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  onClick={() => handleOpenEditForm(sheet)}
                  title={`Editar ${sheet.name}`}
                >
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-2 text-xs text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  onClick={() => sheet.id && handleExportSheet(sheet.id, sheet.name)}
                  title={`Exportar ${sheet.name}`}
                  disabled={isExporting[sheet.id!]}
                >
                  {isExporting[sheet.id!] ? "Exportando..." : "Exportar"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-500 hover:border-red-700">
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la hoja de gastos "{sheet.name}"
                        y todos sus gastos asociados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => {
                          console.log(`[AlertDialogAction] Clicked Sí, eliminar hoja. sheet.id to be passed: ${sheet?.id}`);
                          if (sheet?.id) {
                            handleDeleteSheet(sheet.id);
                          } else {
                            toast.error("Error: El ID de la hoja no está definido. No se puede eliminar.");
                            console.error("[AlertDialogAction] sheet.id is undefined.");
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Sí, eliminar hoja
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {isEditFormOpen && sheetToEdit && (
        <CreateExpenseSheetForm
          isOpen={isEditFormOpen}
          onClose={handleCloseEditForm}
          onSuccess={handleEditSuccess} // Use a specific success handler for edits if needed, or reuse
          sheetToEdit={sheetToEdit} // Pass the sheet data to the form
        />
      )}
    </div>
  );
};

export default ExpenseSheetList;
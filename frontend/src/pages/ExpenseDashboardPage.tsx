import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import brain from "brain";
import { 
    ExpenseSheet, 
    ListExpenseSheetsData,
    CreateExpenseSheetRequest 
} from "brain/data-contracts"; 
import { Button } from "@/components/ui/button";
import { PlusCircle, Download, Edit } from "lucide-react";
import ExpenseSheetList from "components/ExpenseSheetList";
import CreateExpenseSheetForm from "components/CreateExpenseSheetForm";
import { AddExpenseEntryForm } from 'components/AddExpenseEntryForm';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";


const ExpenseDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [expenseSheets, setExpenseSheets] = useState<ExpenseSheet[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isCreateSheetModalOpen, setIsCreateSheetModalOpen] = useState(false);
    const [isEditingSheet, setIsEditingSheet] = useState<ExpenseSheet | null>(null);
    const [showAddEntryForm, setShowAddEntryForm] = useState(false); // Declare the missing state

    const fetchExpenseSheets = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await brain.list_expense_sheets({});
            const data: ListExpenseSheetsData = await response.json();
            if (response.ok) {
                setExpenseSheets(data || []); // data is already ExpenseSheet[]
            } else {
                // If response is not ok, 'data' might be an error object like { detail: "..." } or { message: "..." }
                // We typecast to 'any' to safely access these properties.
                const errorData = data as any; 
                toast.error("Error al cargar las hojas de gastos: " + (errorData.message || errorData.detail || "Error desconocido"));
                setExpenseSheets([]);
            }
        } catch (error) {
            console.error("Failed to fetch expense sheets:", error);
            toast.error("Error de conexión al cargar las hojas de gastos.");
            setExpenseSheets([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExpenseSheets();
    }, [fetchExpenseSheets]);

    const handleCreateSheet = async (sheetData: CreateExpenseSheetRequest) => {
        try {
            const response = await brain.create_expense_sheet(sheetData);
            if (response.ok) {
                toast.success("Hoja de gastos creada exitosamente.");
                fetchExpenseSheets(); // Refresh the list
                setIsCreateSheetModalOpen(false);
                setIsEditingSheet(null);
            } else {
                const errorData = await response.json();
                toast.error("Error al crear la hoja de gastos: " + (errorData.detail || errorData.message || "Error desconocido"));
            }
        } catch (error) {
            console.error("Failed to create expense sheet:", error);
            toast.error("Error de conexión al crear la hoja de gastos.");
        }
    };

    const handleUpdateSheet = async (sheetId: string, sheetData: CreateExpenseSheetRequest) => {
        try {
            const response = await brain.update_expense_sheet({ sheet_id: sheetId }, sheetData);
            if (response.ok) {
                toast.success("Hoja de gastos actualizada exitosamente.");
                fetchExpenseSheets(); // Refresh the list
                setIsCreateSheetModalOpen(false);
                setIsEditingSheet(null);
            } else {
                const errorData = await response.json();
                toast.error("Error al actualizar la hoja de gastos: " + (errorData.detail || errorData.message || "Error desconocido"));
            }
        } catch (error) {
            console.error("Failed to update expense sheet:", error);
            toast.error("Error de conexión al actualizar la hoja de gastos.");
        }
    };

    const handleDeleteSheet = async (sheetId: string) => {
        toast("¿Estás seguro de que quieres eliminar esta hoja de gastos?", {
            action: {
                label: "Eliminar",
                onClick: async () => {
                    try {
                        const response = await brain.delete_expense_sheet({ sheet_id: sheetId });
                        if (response.ok) {
                            toast.success("Hoja de gastos eliminada exitosamente.");
                            fetchExpenseSheets(); // Refresh the list
                        } else {
                            const errorData = await response.json();
                            toast.error("Error al eliminar la hoja de gastos: " + (errorData.detail || errorData.message || "Error desconocido"));
                        }
                    } catch (error) {
                        console.error("Failed to delete expense sheet:", error);
                        toast.error("Error de conexión al eliminar la hoja de gastos.");
                    }
                },
            },
            cancel: {
                label: "Cancelar",
                onClick: () => { /* Do nothing */ },
            },
        });
    };

    const handleViewSheet = (sheetId: string) => {
        navigate(`/expense-sheet/${sheetId}`);
    };

    const handleEditSheet = (sheet: ExpenseSheet) => {
        setIsEditingSheet(sheet);
        setIsCreateSheetModalOpen(true);
    };

    const handleExportSheet = async (sheetId: string, sheetName: string) => {
        toast.info("Preparando exportación...", { id: "export-toast" });
        try {
            const response = await brain.export_expense_sheet_to_excel({ sheet_id: sheetId });
            const data = await response.json();

            if (response.ok && data.file_content_base64) {
                // Decode Base64 to binary and trigger download
                const byteCharacters = atob(data.file_content_base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = data.file_name || `${sheetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                toast.success("Hoja de gastos exportada exitosamente.", { id: "export-toast" });
            } else {
                toast.error("Error al exportar la hoja de gastos: " + (data.message || data.detail || "Respuesta no válida del servidor."), { id: "export-toast" });
            }
        } catch (error) {
            console.error("Failed to export expense sheet:", error);
            toast.error("Error de conexión al exportar la hoja de gastos.", { id: "export-toast" });
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <header className="mb-6 flex flex-col sm:flex-row justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Panel de Hojas de Gastos</h1>
                <div className="flex flex-col sm:flex-row gap-2"> {/* Wrapper for buttons */}
                    <Button variant="outline" onClick={() => setShowAddEntryForm(true)} size="lg" disabled={expenseSheets.length === 0}>
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Crear Nuevo Gasto
                    </Button>
                    <Dialog open={isCreateSheetModalOpen} onOpenChange={(isOpen) => {
                        setIsCreateSheetModalOpen(isOpen);
                        if (!isOpen) setIsEditingSheet(null); // Reset editing state when dialog closes
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="default" size="lg" onClick={() => setIsEditingSheet(null)}>
                                <PlusCircle className="mr-2 h-5 w-5" />
                                {isEditingSheet ? "Modificar Hoja" : "Crear Nueva Hoja"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>
                                    {isEditingSheet ? "Modificar Hoja de Gastos" : "Crear Nueva Hoja de Gastos"}
                                </DialogTitle>
                            </DialogHeader>
                            <CreateExpenseSheetForm 
                                isOpen={isCreateSheetModalOpen} // Pass isOpen state
                                onClose={() => { // This acts as the onClose for the form itself
                                    setIsCreateSheetModalOpen(false);
                                    setIsEditingSheet(null);
                                }}
                                onSuccess={() => { // This acts as the onSuccess callback
                                    fetchExpenseSheets(); // Refresh list
                                    setIsCreateSheetModalOpen(false); // Close modal
                                    setIsEditingSheet(null); // Reset editing state
                                }}
                                onSubmit={isEditingSheet ? (data) => handleUpdateSheet(isEditingSheet.id, data) : handleCreateSheet}
                                sheetToEdit={isEditingSheet || undefined} // Corrected prop name
                            />
                        </DialogContent>
                    </Dialog>
                </div> {/* End of wrapper for buttons */}
            </header>

            {showAddEntryForm && (
                <AddExpenseEntryForm
                    isOpen={showAddEntryForm}
                    onClose={() => setShowAddEntryForm(false)}
                    onSuccess={() => {
                        setShowAddEntryForm(false);
                        fetchExpenseSheets(); // Refresh sheets to reflect new totals if any displayed
                        toast.success("Entrada de gasto creada/actualizada desde el dashboard!");
                    }}
                    currentSheetId={undefined}
                    availableExpenseSheets={expenseSheets}
                    initialSheetCurrency={expenseSheets.length > 0 ? expenseSheets[0].currency : "EUR"}
                    defaultCurrency={"EUR"}
                />
            )}

            {/* Interfaz para subir plantilla (próximamente) */}

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-gray-500">Cargando hojas de gastos...</p>
                </div>
            ) : expenseSheets.length > 0 ? (
                <ExpenseSheetList 
                    sheets={expenseSheets} 
                    isLoading={isLoading} // Pass isLoading state
                    refreshSheets={fetchExpenseSheets} // Pass the refresh function
                    isCreateFormOpen={isCreateSheetModalOpen} // Pass state for create form
                    setIsCreateFormOpen={setIsCreateSheetModalOpen} // Pass setter for create form state
                />
            ) : (
                <div className="text-center py-10">
                    <img src="/no_data_illustration.svg" alt="No hay hojas de gastos" className="mx-auto mb-4 h-40 w-40"/>
                    <p className="text-lg text-gray-600">No hay hojas de gastos todavía.</p>
                    <p className="text-sm text-gray-500 mb-6">Comienza creando una nueva hoja para organizar tus gastos.</p>
                    <Button variant="outline" size="lg" onClick={() => {
                        setIsEditingSheet(null);
                        setIsCreateSheetModalOpen(true);
                    }}>
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Crear Primera Hoja
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ExpenseDashboardPage;

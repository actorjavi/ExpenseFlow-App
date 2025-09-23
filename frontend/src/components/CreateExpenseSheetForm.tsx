import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Added DialogDescription
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserFirestoreProfile } from '../utils/useUserFirestoreProfile'; // MYA-31
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import brain from "brain";
import { ExpenseSheetCreateRequest, ExpenseSheet, ExpenseSheetUpdateRequest } from "types"; // Using types from brain/data-contracts
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sheetToEdit?: ExpenseSheet | null; // Make sheetToEdit an optional prop
}

const currentYear = new Date().getFullYear();
const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: new Date(0, i).toLocaleString("default", { month: "long" }),
}));

export const CreateExpenseSheetForm: React.FC<Props> = ({ isOpen, onClose, onSuccess, sheetToEdit }) => {
  const [name, setName] = useState("");
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState<string>(currentYear.toString());
  const [currency, setCurrency] = useState("EUR");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"TARJETA" | "EFECTIVO" | "">(""); // Start empty
  const [anticipo, setAnticipo] = useState("");
  const {
    firstName: currentFirstName,
    lastName: currentLastName,
    isLoading: isLoadingProfile
  } = useUserFirestoreProfile(); // MYA-31
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditMode = !!sheetToEdit;

  React.useEffect(() => {
    if (sheetToEdit) {
      setName(sheetToEdit.name);
      setMonth(sheetToEdit.month.toString());
      setYear(sheetToEdit.year.toString());
      setCurrency(sheetToEdit.currency);
      setPaymentMethodFilter(sheetToEdit.payment_method_filter === "TARJETA" || sheetToEdit.payment_method_filter === "EFECTIVO" ? sheetToEdit.payment_method_filter : "");
      setAnticipo(sheetToEdit.anticipo ? sheetToEdit.anticipo.toString() : "");
    } else {
      // If not in edit mode, or sheetToEdit becomes null, reset to default create mode values
      resetForm(); // resetForm takes no arguments in its implementation
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetToEdit]); // Depend on sheetToEdit to re-populate form

  useEffect(() => {
  }, [currentFirstName, currentLastName, isLoadingProfile, sheetToEdit]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "El nombre es obligatorio.";
    if (!month) newErrors.month = "El mes es obligatorio.";
    if (!year.trim() || isNaN(parseInt(year)) || parseInt(year) < 1900 || parseInt(year) > 2200) {
      newErrors.year = "Introduce un año válido (ej. 2024).";
    }
    if (!currency) newErrors.currency = "La moneda es obligatoria.";
    if (!paymentMethodFilter) newErrors.paymentMethodFilter = "El método de pago es obligatorio."; // New validation
    // MYA-31: Validate anticipo if provided
    if (anticipo && isNaN(parseFloat(anticipo))) {
      newErrors.anticipo = "El anticipo debe ser un número válido.";
    } else if (anticipo && parseFloat(anticipo) < 0) {
      newErrors.anticipo = "El anticipo no puede ser negativo.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const commonPayload = {
      name,
      month: parseInt(month),
      year: parseInt(year),
      currency,
      payment_method_filter: paymentMethodFilter, // Directly use the state value
      user_name: null, // Kept for backend compatibility if still expected, but not used in UI
      anticipo: parseFloat(anticipo) || 0.0, // MYA-31: Add anticipo to payload, default to 0.0 if invalid or empty
    };

    try {
      let response;
      let responseData;

      if (isEditMode && sheetToEdit?.id) {
        const updatePayload: ExpenseSheetUpdateRequest = { // Assuming ExpenseSheetUpdateRequest type exists or create one
            ...commonPayload,
        };
        response = await brain.update_expense_sheet({ sheetId: sheetToEdit.id }, updatePayload);
        responseData = await response.json();
        if (response.ok) {
          toast.success("¡Hoja de gastos actualizada correctamente!");
          onSuccess(); // This will call handleEditSuccess from ExpenseSheetList
          // No need to call resetForm() here as onClose in handleEditSuccess will do it via handleDialogClose
        } else {
          toast.error(`Error al actualizar la hoja de gastos: ${responseData?.detail || "Error de servidor desconocido"}`);
        }
      } else {
        // Create mode
        const createPayload: ExpenseSheetCreateRequest = commonPayload;
        response = await brain.create_expense_sheet(createPayload);
        responseData = await response.json();
        if (response.ok) {
          toast.success("¡Hoja de gastos creada correctamente!");
          onSuccess(); // This will call handleFormSuccess from ExpenseDashboardPage
          resetForm(); // Reset form only on successful creation directly in this component
        } else {
          toast.error(`Error al crear la hoja de gastos: ${responseData?.detail || "Error de servidor desconocido"}`);
        }
      }

      // Common error handling for backend validation errors for both create and update
      if (!response.ok && responseData?.errors) {
        const backendErrors: Record<string, string> = {};
        for (const err of responseData.errors) {
          if (err.loc && err.loc.length > 1) {
            backendErrors[err.loc[1]] = err.msg;
          }
        }
        setErrors(prev => ({...prev, ...backendErrors}));
      }

    } catch (error) {
      console.error(isEditMode ? "Error updating expense sheet:" : "Error creating expense sheet:", error);
      toast.error("Ocurrió un error inesperado. Por favor, inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setName("");
    setMonth((new Date().getMonth() + 1).toString());
    setYear(currentYear.toString());
    setCurrency("EUR");
    setPaymentMethodFilter(""); // Reset to empty
    setAnticipo("");
    setErrors({});
  };

  const handleDialogClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Hoja de Gastos" : "Crear Nueva Hoja de Gastos"}</DialogTitle>
          {/* MYA-41: Added DialogDescription for accessibility */}
          <DialogDescription>
            {isEditMode ? "Modifique los detalles de la hoja de gastos." : "Complete los detalles para crear una nueva hoja de gastos. Los campos marcados con * son obligatorios."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nombre<span className="text-red-500"> *</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
              />
              {errors.name && <p className="col-span-4 text-red-500 text-sm text-right">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="month" className="text-right">Mes<span className="text-red-500"> *</span></Label>
              <Select value={month} onValueChange={setMonth} disabled={isLoading}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.month && <p className="col-span-4 text-red-500 text-sm text-right">{errors.month}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">Año<span className="text-red-500"> *</span></Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
              />
              {errors.year && <p className="col-span-4 text-red-500 text-sm text-right">{errors.year}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">Moneda<span className="text-red-500"> *</span></Label>
              <Select value={currency} onValueChange={setCurrency} disabled={isLoading}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  {/* Add more currencies as needed */}
                </SelectContent>
              </Select>
              {errors.currency && <p className="col-span-4 text-red-500 text-sm text-right">{errors.currency}</p>}
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMethodFilter" className="text-right">Método de Pago<span className="text-red-500"> *</span></Label>
              <Select 
                value={paymentMethodFilter} 
                onValueChange={(value: "TARJETA" | "EFECTIVO" | "") => setPaymentMethodFilter(value)} 
                disabled={isLoading}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione método de pago..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TARJETA">Tarjeta</SelectItem>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethodFilter && <p className="col-span-4 text-red-500 text-sm text-right">{errors.paymentMethodFilter}</p>}
            </div>


            {/* MYA-31: Anticipo Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="anticipo" className="text-right">Anticipo (€)</Label>
              <Input
                id="anticipo"
                type="number"
                value={anticipo}
                onChange={(e) => setAnticipo(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
                placeholder="0.00"
              />
              {errors.anticipo && <p className="col-span-4 text-red-500 text-sm text-right">{errors.anticipo}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isLoading}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEditMode ? "Actualizando..." : "Guardando...") : (isEditMode ? "Actualizar Hoja de Gastos" : "Guardar Hoja de Gastos")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateExpenseSheetForm;

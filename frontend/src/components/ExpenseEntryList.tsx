import React, { useState, useMemo, useEffect } from 'react';
import { ExpenseEntry } from 'types';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Added TableFooter
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, ArrowUpDown, ExternalLink, UploadCloud } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import {
  formatDateToDDMMYYYY,
  formatCurrency,
  formatNumberOneDecimal,
  displayValueOrDash,
} from 'utils/formatters';

interface Props {
  entries: ExpenseEntry[];
  sheetCurrency: string;
  isLoading: boolean;
  onEditEntry: (entry: ExpenseEntry) => void;
  onDeleteEntry: (entry: ExpenseEntry) => void;
}

interface SortConfig {
  key: keyof ExpenseEntry | null;
  direction: 'ascending' | 'descending';
}

export const ExpenseEntryList: React.FC<Props> = ({ entries, sheetCurrency, isLoading, onEditEntry, onDeleteEntry }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'entry_date', direction: 'descending' });
  // const [filterMerchantName, setFilterMerchantName] = useState<string>(""); // Filter removed
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5; // Changed from 8 to 5 for better mobile viewing

  // console.log("[ExpenseEntryList] Props entries length:", entries.length, "Sheet Currency:", sheetCurrency); // Debug log removed

  const handleSort = (key: keyof ExpenseEntry | 'entry_date' | 'daily_total' | 'merchant_name' | null) => {
    if (!key) return;
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key: key as keyof ExpenseEntry, direction });
  };

  // Memoize the full sorted list (filter removed)
  const sortedEntries = useMemo(() => {
    let processedEntries = [...entries]; // Start with a copy of original entries

    // Sorting logic (remains the same)
    if (sortConfig.key) {
      processedEntries.sort((a, b) => {
        let valA = a[sortConfig.key as keyof ExpenseEntry];
        let valB = b[sortConfig.key as keyof ExpenseEntry];
        if (sortConfig.key === 'entry_date') {
          valA = new Date(valA as string) as any;
          valB = new Date(valB as string) as any;
        }
        if (valA === null || valA === undefined) valA = sortConfig.direction === 'ascending' ? Infinity as any : -Infinity as any;
        if (valB === null || valB === undefined) valB = sortConfig.direction === 'ascending' ? Infinity as any : -Infinity as any;
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if ((valA as any) < (valB as any)) return sortConfig.direction === 'ascending' ? -1 : 1;
        if ((valA as any) > (valB as any)) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return processedEntries;
  }, [entries, sortConfig]);

  // console.log("[ExpenseEntryList] filterMerchantName:", filterMerchantName); // Debug log removed
  // console.log("[ExpenseEntryList] sortedAndFilteredEntries length:", sortedAndFilteredEntries.length); // Debug log removed

  // Effect to reset to page 1 if sortConfig changes (filter dependency removed)
  useEffect(() => {
    setCurrentPage(1);
  }, [sortConfig]); // Reset only on sort change now

  // Calculate pagination variables based on the full sorted list
  const totalPages = Math.ceil(sortedEntries.length / ITEMS_PER_PAGE);
  // console.log("[ExpenseEntryList] ITEMS_PER_PAGE:", ITEMS_PER_PAGE, "Total Pages:", totalPages); // Debug log removed

  // Effect to adjust currentPage if it becomes out of bounds due to data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  
  const entriesForCurrentPage = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedEntries.slice(startIndex, endIndex);
  }, [currentPage, sortedEntries, ITEMS_PER_PAGE]);

  // console.log("[ExpenseEntryList] Current Page:", currentPage); // Debug log removed
  // console.log("[ExpenseEntryList] entriesForCurrentPage length:", entriesForCurrentPage.length); // Debug log removed

  // Original processedEntries variable is now entriesForCurrentPage for rendering
  // We keep the name `processedEntries` in the map function for minimal diff for now,
  // but ideally it should be `entriesForCurrentPage`
  // For the purpose of this change, I will update the map to use entriesForCurrentPage.

  // As per requirement, totals should reflect filtered entries
  // The actual calculation of columnTotals happens below

  const columnTotals = useMemo(() => {
    const totals = {
      parking_amount: 0,
      taxi_amount: 0,
      km_amount: 0,
      transport_amount: 0,
      hotel_amount: 0,
      lunch_amount: 0,
      dinner_amount: 0,
      miscellaneous_amount: 0,
      daily_total: 0, // This will be our Grand Total
    };
    entries.forEach(entry => {
      totals.parking_amount += entry.parking_amount || 0;
      totals.taxi_amount += entry.taxi_amount || 0;
      totals.km_amount += entry.km_amount || 0;
      totals.transport_amount += entry.transport_amount || 0;
      totals.hotel_amount += entry.hotel_amount || 0;
      totals.lunch_amount += entry.lunch_amount || 0;
      totals.dinner_amount += entry.dinner_amount || 0;
      totals.miscellaneous_amount += entry.miscellaneous_amount || 0;
      totals.daily_total += entry.daily_total || 0;
    });
    return totals;
  }, [entries]);

  if (isLoading) {
    return (
        <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Cargando gastos...</p>
        </div>
    );
  }

  // No need to check for processedEntries length here for totals, 
  // as totals row should show even if entries are filtered out but exist in the sheet originally.
  // The parent component (ExpenseSheetDetailPage) should handle the case of a completely empty sheet.

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row justify-end gap-4 p-1"> {/* Removed merchant filter input, adjusted flex for sort only */}
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Ordenar por:</span>
            <Select 
                value={sortConfig.key || ''} 
                onValueChange={(value) => handleSort(value as keyof ExpenseEntry)}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="entry_date">Día</SelectItem>
                    <SelectItem value="project">Proyecto</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                    <SelectItem value="location">Localidad</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => handleSort(sortConfig.key)} title="Cambiar dirección de ordenación" disabled={!sortConfig.key}>
                <ArrowUpDown className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {(!sortedEntries || sortedEntries.length === 0) && (
         <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <p className="text-xl text-gray-500 dark:text-gray-400">Aún no hay gastos para esta hoja.</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Haz clic en "Añadir Nuevo Gasto" arriba para empezar.</p>
        </div>
      )}

      {(sortedEntries && sortedEntries.length > 0) && (
        <Card className="shadow-md">
          <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-180px)] sm:max-h-[calc(100vh-200px)]"> {/* Increased max-height */}
            <div className="overflow-x-auto"> {/* Kept overflow-x-auto on this direct table wrapper */}
<Table className="w-full min-w-[1600px]"><TableHeader className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800"><TableRow className="border-b border-gray-200 dark:border-gray-700"><TableHead className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 z-30">Ticket</TableHead><TableHead className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dia</TableHead><TableHead className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proyecto</TableHead><TableHead className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Empresa</TableHead><TableHead className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Localidad</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Parking</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Taxi</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">KM</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Coste Kilometraje</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Transporte</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hotel (Hab.)</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Almuerzo</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cena</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Varios</TableHead><TableHead className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Diario</TableHead><TableHead className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky right-0 bg-gray-50 dark:bg-gray-800 z-30">Acciones</TableHead></TableRow></TableHeader><TableBody>{entriesForCurrentPage.map((entry) => (<TableRow key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ease-in-out"><TableCell className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-gray-700 z-10">
                        {entry.receipt_google_drive_web_view_link ? (
                          <Button variant="outline" size="icon" asChild className="h-8 w-8">
                            <a href={entry.receipt_google_drive_web_view_link} target="_blank" rel="noopener noreferrer" title="Ver Ticket">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <Button variant="outline" size="icon" className="h-8 w-8" title="Subir Ticket (deshabilitado)" disabled>
                            <UploadCloud className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDateToDDMMYYYY(entry.entry_date)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{displayValueOrDash(entry.project)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{displayValueOrDash(entry.company)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{displayValueOrDash(entry.location)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatCurrency(entry.parking_amount, sheetCurrency)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatCurrency(entry.taxi_amount, sheetCurrency)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatNumberOneDecimal(entry.kilometers)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatCurrency(entry.km_amount, sheetCurrency)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatCurrency(entry.transport_amount, sheetCurrency)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatCurrency(entry.hotel_amount, sheetCurrency)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatCurrency(entry.lunch_amount, sheetCurrency)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatCurrency(entry.dinner_amount, sheetCurrency)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatCurrency(entry.miscellaneous_amount, sheetCurrency)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right font-semibold">{formatCurrency(entry.daily_total, sheetCurrency)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-center sticky right-0 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-gray-700 z-10">
                        <Button variant="ghost" size="icon" className="mr-1 h-8 w-8 hover:text-blue-600" onClick={() => onEditEntry(entry)} title="Editar Gasto">
                          <Pencil className="h-4 w-4" /> 
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 h-8 w-8" onClick={() => onDeleteEntry(entry)} title="Eliminar Gasto">
                          <Trash2 className="h-4 w-4" />
</Button></TableCell></TableRow>))}</TableBody><TableFooter className="sticky bottom-0 z-20 bg-gray-100 dark:bg-gray-700"><TableRow className="font-semibold text-gray-700 dark:text-gray-200 border-t-2 border-gray-300 dark:border-gray-600"><TableCell className="px-3 py-3 sticky left-0 bg-gray-100 dark:bg-gray-700 z-30 text-sm" colSpan={5}>TOTALES</TableCell><TableCell className="px-3 py-3 text-right text-sm">{formatCurrency(columnTotals.parking_amount, sheetCurrency)}</TableCell><TableCell className="px-3 py-3 text-right text-sm">{formatCurrency(columnTotals.taxi_amount, sheetCurrency)}</TableCell><TableCell className="px-3 py-3 text-right text-sm">-</TableCell><TableCell className="px-3 py-3 text-right text-sm">{formatCurrency(columnTotals.km_amount, sheetCurrency)}</TableCell><TableCell className="px-3 py-3 text-right text-sm">{formatCurrency(columnTotals.transport_amount, sheetCurrency)}</TableCell><TableCell className="px-3 py-3 text-right text-sm">{formatCurrency(columnTotals.hotel_amount, sheetCurrency)}</TableCell><TableCell className="px-3 py-3 text-right text-sm">{formatCurrency(columnTotals.lunch_amount, sheetCurrency)}</TableCell><TableCell className="px-3 py-3 text-right text-sm">{formatCurrency(columnTotals.dinner_amount, sheetCurrency)}</TableCell><TableCell className="px-3 py-3 text-right text-sm">{formatCurrency(columnTotals.miscellaneous_amount, sheetCurrency)}</TableCell><TableCell className="px-3 py-3 text-right text-sm font-bold">{formatCurrency(columnTotals.daily_total, sheetCurrency)}</TableCell><TableCell className="px-3 py-3 sticky right-0 bg-gray-100 dark:bg-gray-700 z-30"></TableCell></TableRow></TableFooter>
              </Table>
            </div> {/* Closing div wrapper */}
          </CardContent>
          {totalPages > 1 && (
            <div className="flex items-center justify-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                className="mr-2 h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm" // Adjusted size for consistency
              >
                Anterior
              </Button>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                variant="outline"
                className="ml-2 h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm" // Adjusted size for consistency
              >
                Siguiente
              </Button>
            </div>
          )}
      </Card>
      )}
    </div>
  );
};

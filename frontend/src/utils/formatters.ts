import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale

// Formats a date string (YYYY-MM-DD or parsable) to dd/mm/yyyy
export const formatDateToDDMMYYYY = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    // Attempt to parse the date, assuming it might be YYYY-MM-DD or a full ISO string
    const date = new Date(dateString);
    // Check if the date is valid after parsing
    if (isNaN(date.getTime())) {
      // Handle cases where dateString might be just a year or month-year, or invalid
      // For this specific app, backend sends YYYY-MM-DD for entry_date
      // If it's already in dd/mm/yyyy or other non-standard, it might fail here
      console.warn(`Invalid date string for formatDateToDDMMYYYY: ${dateString}`);
      return '-'; // Or return dateString if you prefer to show the original malformed one
    }
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return '-'; // Fallback for any other error
  }
};

// Formats a number as currency, using the provided currency symbol
export const formatCurrency = (amount: number | null | undefined, currencySymbol: string = '€'): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '-'; // Handle null, undefined, or NaN
  
  const displaySymbol = currencySymbol === 'EUR' ? '€' : currencySymbol;

  // Convert to number with 2 decimal places
  const formattedAmount = amount.toFixed(2);
  
  // Split into integer and decimal parts
  const parts = formattedAmount.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add thousands separator to the integer part
  const integerWithThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Combine parts and add currency symbol
  return `${integerWithThousands},${decimalPart} ${displaySymbol}`;
};

// Formats a number to one decimal place
export const formatNumberOneDecimal = (number: number | null | undefined): string => {
  if (number === null || number === undefined || isNaN(number)) return '-'; // Handle null, undefined, or NaN
  return number.toFixed(1);
};

// Helper to display a value or a dash if it's null/undefined
export const displayValueOrDash = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
};

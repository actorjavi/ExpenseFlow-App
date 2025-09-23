import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseSheet } from "types"; // Or from brain/data-contracts
import { DollarSign, ListChecks } from 'lucide-react'; // Example icons

interface Props {
  sheets: ExpenseSheet[];
}

const formatCurrency = (amount: number, currencyCode: string = "USD") => {
  // Basic formatter, can be expanded with locale and more robust currency handling
  // For multiple currencies, this might need to be more complex or show totals per currency
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2 }).format(amount);
};

export const ExpenseSummaryStats: React.FC<Props> = ({ sheets }) => {
  const totalSheets = sheets.length;
  
  // Assuming all sheets have a currency and total_amount.
  // For a multi-currency scenario, summing up directly might be misleading.
  // Here, we'll sum up assuming a common currency or just for the sake of example.
  // A more robust solution would group by currency or convert amounts.
  const totalExpensesAllSheets = sheets.reduce((acc, sheet) => acc + (sheet.total_amount || 0), 0);
  
  // Attempt to get the most common currency or default to EUR if mixed and many
  const mainCurrency = sheets.length > 0 ? sheets[0].currency : "EUR";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Expense Sheets</CardTitle>
          <ListChecks className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{totalSheets}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Active and archived sheets</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Expenses Value</CardTitle>
          <DollarSign className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {formatCurrency(totalExpensesAllSheets, mainCurrency)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sum of all sheets ({mainCurrency})
          </p>
           {/* Note: If currencies are mixed, this sum is indicative and needs clarification or per-currency breakdown */}
        </CardContent>
      </Card>
      
      {/* Placeholder for more stats if needed */}
      {/* <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Validated Sheets</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+2</div>
          <p className="text-xs text-muted-foreground">+12% from last month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">3</div>
          <p className="text-xs text-muted-foreground">Awaiting review</p>
        </CardContent>
      </Card> */}
    </div>
  );
};
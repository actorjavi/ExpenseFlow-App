import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, FileText, Edit, Trash2, ExternalLink } from 'lucide-react';
import { ExpenseEntry } from 'types'; // Assuming ExpenseEntry type is defined in types.ts
import { format } from 'date-fns';

interface Props {
  entry: ExpenseEntry;
  currency: string;
  onEdit: (entry: ExpenseEntry) => void;
  onDelete: (entryId: string) => void;
}

const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  // Basic check for common image extensions. 
  // Google Drive web_content_link might not have extensions but might be directly renderable.
  // For simplicity, we'll rely on onError of the img tag for non-direct image links.
  return url.startsWith('https://') || url.startsWith('http://');
};

export const ExpenseListItem: React.FC<Props> = ({ entry, currency, onEdit, onDelete }) => {
  const [imageError, setImageError] = React.useState(false);

  const handleImageError = () => {
    console.error("[ExpenseListItem] Error loading image with webContentLink:", entry.receipt_google_drive_web_content_link, "Related entry:", entry);
    setImageError(true);
  };

  // Determine if the receipt is a PDF based on its Google Drive ID or name (if available and more reliable)
  // This is a basic check. A more robust way would be to store mimeType from Drive if possible.
  const isPdf = entry.receipt_google_drive_id?.toLowerCase().endsWith('.pdf') || 
                entry.receipt_google_drive_web_content_link?.toLowerCase().includes('application/pdf') ||
                entry.receipt_google_drive_web_view_link?.toLowerCase().includes('application/pdf');

  const canShowThumbnail = isValidImageUrl(entry.receipt_google_drive_web_content_link) && !isPdf && !imageError;

  return (
    <Card className="mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{entry.merchant_name}</CardTitle>
            <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(entry.purchase_date), "PPP")} - {entry.payment_method}
            </CardDescription>
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(entry.total_amount_vat_included)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-2 space-y-2">
            {entry.department && <p className="text-sm"><span className="font-medium">Department:</span> {entry.department}</p>}
            {entry.categories && entry.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="font-medium text-sm mr-1">Categories:</span>
                {entry.categories.map(cat => <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>)}
              </div>
            )}
            {entry.program_code && <p className="text-sm"><span className="font-medium">Program Code:</span> {entry.program_code}</p>}
            {entry.associated_kilometers != null && <p className="text-sm"><span className="font-medium">Kilometers:</span> {entry.associated_kilometers} km</p>}
          </div>

          <div className="md:col-span-1 flex flex-col items-center justify-center space-y-2 pt-2 md:pt-0">
            {entry.receipt_google_drive_id && (
              <div className="w-full text-center">
                {canShowThumbnail && entry.receipt_google_drive_web_content_link ? (
                  <a href={entry.receipt_google_drive_web_view_link || entry.receipt_google_drive_web_content_link} target="_blank" rel="noopener noreferrer" title="View full receipt in Drive">
                    <img 
                      src={entry.receipt_google_drive_web_content_link} 
                      alt="Receipt Thumbnail" 
                      className="w-24 h-24 object-cover rounded-md border shadow-sm mx-auto hover:opacity-80 transition-opacity"
                      onError={handleImageError}
                    />
                  </a>
                ) : isPdf ? (
                  <a href={entry.receipt_google_drive_web_view_link || "#"} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                    <FileText size={48} className="mb-1" />
                    <span className="text-xs underline">View PDF Receipt</span>
                  </a>
                ) : entry.receipt_google_drive_web_view_link ? (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preview failed to load.</p>
                    <a href={entry.receipt_google_drive_web_view_link} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                      <ImageIcon size={36} className="mb-1 text-gray-400 dark:text-gray-500" />
                      <span className="text-xs underline">View Receipt in Drive</span>
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-gray-500">
                    <FileText size={48} className="mb-1" />
                    <span className="text-xs">No Preview</span>
                  </div>
                )}
              </div>
            )}
            {!entry.receipt_google_drive_id && <p className="text-xs text-gray-400 dark:text-gray-500">No receipt attached</p>}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(entry)} title="Edit Expense">
            <Edit size={16} className="mr-1" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(entry.id)} title="Delete Expense">
            <Trash2 size={16} className="mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

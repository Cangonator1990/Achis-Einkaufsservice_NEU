import { Button } from '@/components/ui/button';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

/**
 * Eigenschaften für die UserPagination-Komponente
 */
interface UserPaginationProps {
  /** Gesamtzahl der angezeigten Elemente */
  totalItems: number;
  /** Aktuelle Seite */
  currentPage: number;
  /** Elemente pro Seite */
  itemsPerPage: number;
  /** Callback für Seitenwechsel */
  onPageChange: (page: number) => void;
}

/**
 * Paginierung für Benutzerlisten
 */
export function UserPagination({ totalItems, currentPage, itemsPerPage, onPageChange }: UserPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages || totalPages === 0;

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-gray-500">
        {totalItems > 0 
          ? `${totalItems} Benutzer angezeigt, Seite ${currentPage} von ${totalPages}`
          : 'Keine Benutzer gefunden'}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isFirstPage}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <IconChevronLeft className="h-4 w-4 mr-1" />
          Zurück
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isLastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Weiter
          <IconChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
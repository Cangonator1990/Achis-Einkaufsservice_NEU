import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  IconDotsVertical, 
  IconEye, 
  IconEdit, 
  IconTrash, 
  IconRotateClockwise,
  IconStatusChange,
  IconPrinter
} from '@tabler/icons-react';

/**
 * Eigenschaften für OrderActionsMenu-Komponente
 */
interface OrderActionsMenuProps {
  /** Die Bestellung, auf die sich die Aktionen beziehen */
  order: any;
  /** Callback zum Anzeigen der Bestelldetails */
  onShowDetails: () => void;
  /** Callback zum Bearbeiten einer Bestellung */
  onEdit: () => void;
  /** Callback zum Löschen einer Bestellung */
  onDelete: () => void;
  /** Callback zum Wiederherstellen einer gelöschten Bestellung */
  onRestore?: () => void;
  /** Callback zum Ändern des Bestellstatus */
  onChangeStatus: () => void;
}

/**
 * Dropdown-Menü für Bestellungsaktionen
 */
export function OrderActionsMenu({ 
  order, 
  onShowDetails, 
  onEdit, 
  onDelete, 
  onRestore, 
  onChangeStatus 
}: OrderActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconDotsVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onShowDetails}>
          <IconEye className="mr-2 h-4 w-4" />
          Details anzeigen
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onEdit}>
          <IconEdit className="mr-2 h-4 w-4" />
          Bearbeiten
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onChangeStatus}>
          <IconStatusChange className="mr-2 h-4 w-4" />
          Status ändern
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <IconPrinter className="mr-2 h-4 w-4" />
          Drucken
        </DropdownMenuItem>
        
        {order.deletedAt ? (
          <DropdownMenuItem onClick={onRestore}>
            <IconRotateClockwise className="mr-2 h-4 w-4" />
            Wiederherstellen
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="text-red-600" onClick={onDelete}>
            <IconTrash className="mr-2 h-4 w-4" />
            Löschen
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
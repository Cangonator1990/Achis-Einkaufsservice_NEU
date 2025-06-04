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
  IconX, 
  IconCheck, 
  IconLock 
} from '@tabler/icons-react';

/**
 * Eigenschaften für UserActionsMenu-Komponente
 */
interface UserActionsMenuProps {
  /** Der Benutzer, auf den sich die Aktionen beziehen */
  user: any;
  /** Callback zum Anzeigen der Benutzerdetails */
  onShowDetails: () => void;
  /** Callback zum Bearbeiten eines Benutzers */
  onEdit?: () => void;
  /** Callback zum Aktivieren/Deaktivieren eines Benutzers */
  onToggleStatus: (isActive: boolean) => void;
  /** Callback zum Löschen eines Benutzers */
  onDelete: () => void;
  /** Callback zum Befördern eines Benutzers zum Admin */
  onPromoteToAdmin: () => void;
}

/**
 * Dropdown-Menü für Benutzeraktionen
 */
export function UserActionsMenu({ 
  user, 
  onShowDetails, 
  onEdit,
  onToggleStatus, 
  onDelete, 
  onPromoteToAdmin 
}: UserActionsMenuProps) {
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
        {user.isActive ? (
          <DropdownMenuItem onClick={() => onToggleStatus(false)}>
            <IconX className="mr-2 h-4 w-4" />
            Deaktivieren
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onToggleStatus(true)}>
            <IconCheck className="mr-2 h-4 w-4" />
            Aktivieren
          </DropdownMenuItem>
        )}
        {user.role !== 'admin' && (
          <DropdownMenuItem onClick={onPromoteToAdmin}>
            <IconLock className="mr-2 h-4 w-4" />
            Zum Admin befördern
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-red-600" onClick={onDelete}>
          <IconTrash className="mr-2 h-4 w-4" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
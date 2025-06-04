import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserActionsMenu } from './UserActionsMenu';

/**
 * Eigenschaften für die UserTable-Komponente
 */
interface UserTableProps {
  /** Liste der anzuzeigenden Benutzer */
  users: any[];
  /** Flag, ob die Daten noch geladen werden */
  isLoading: boolean;
  /** Callback zum Anzeigen der Benutzerdetails */
  onShowDetails: (user: any) => void;
  /** Callback zum Bearbeiten eines Benutzers */
  onEdit?: (user: any) => void;
  /** Callback zum Aktivieren/Deaktivieren eines Benutzers */
  onToggleStatus: (userId: number, isActive: boolean) => void;
  /** Callback zum Löschen eines Benutzers */
  onDelete: (userId: number) => void;
  /** Callback zum Befördern eines Benutzers zum Admin */
  onPromoteToAdmin: (userId: number) => void;
}

/**
 * Tabelle zur Anzeige von Benutzerdaten
 */
export function UserTable({ 
  users, 
  isLoading, 
  onShowDetails, 
  onEdit,
  onToggleStatus, 
  onDelete, 
  onPromoteToAdmin 
}: UserTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="animate-pulse flex items-center space-x-4 p-4 border-b">
            <div className="rounded-full bg-gray-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Benutzer</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Rolle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Registriert am</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">Keine Benutzer gefunden</TableCell>
            </TableRow>
          ) : (
            users.map((user: any) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {user.firstName && user.firstName.charAt(0)}
                      {user.lastName && user.lastName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {user.firstName || ''} {user.lastName || ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        @{user.username || 'noname'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                    {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'default' : 'destructive'}>
                    {user.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </TableCell>
                <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unbekannt'}</TableCell>
                <TableCell className="text-right">
                  <UserActionsMenu 
                    user={user}
                    onShowDetails={() => onShowDetails(user)}
                    onEdit={onEdit ? () => onEdit(user) : undefined}
                    onToggleStatus={(isActive) => onToggleStatus(user.id, isActive)}
                    onDelete={() => onDelete(user.id)}
                    onPromoteToAdmin={() => onPromoteToAdmin(user.id)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
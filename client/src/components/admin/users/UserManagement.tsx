import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { apiService } from '@/services/api.service';
import { API_ADMIN } from '@/config/api.config';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader } from '../common/AdminPageHeader';
import { AdminCard } from '../common/AdminCard';
import { UserFilter } from './UserFilter';
import { UserTable } from './UserTable';
import { UserDetailsDialog } from './UserDetailsDialog';
import { UserEditDialog } from './UserEditDialog';
import { UserPagination } from './UserPagination';
import { IconUser } from '@tabler/icons-react';

/**
 * Hauptkomponente für die Benutzerverwaltung
 */
export function UserManagement() {
  const { toast } = useToast();
  
  // Zustandsvariablen
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Alle Benutzer abrufen mit dem neuen ApiService
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      console.log("Fetching admin users with ApiService");
      const response = await apiService.get<any[]>(API_ADMIN.USERS.LIST);
      return response.data;
    }
  });

  // Benutzer aktivieren/deaktivieren mit ApiService
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number, isActive: boolean }) => {
      const endpoint = API_ADMIN.USERS.TOGGLE_ACTIVE(userId);
      await apiService.patch(endpoint, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Benutzerstatus aktualisiert',
        description: 'Der Benutzerstatus wurde erfolgreich aktualisiert.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Der Benutzerstatus konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    }
  });

  // Benutzer löschen mit ApiService
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const endpoint = API_ADMIN.USERS.DELETE(userId);
      await apiService.delete(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Benutzer gelöscht',
        description: 'Der Benutzer wurde erfolgreich gelöscht.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Der Benutzer konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
  });

  // Benutzer zum Administrator befördern mit ApiService
  const promoteToAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const endpoint = API_ADMIN.USERS.UPDATE(userId);
      await apiService.patch(endpoint, { role: 'admin' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Benutzer befördert',
        description: 'Der Benutzer wurde erfolgreich zum Administrator befördert.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Der Benutzer konnte nicht befördert werden.',
        variant: 'destructive',
      });
    }
  });

  // Benutzerliste filtern mit Typensicherheit
  const filteredUsers = (users as any[]).filter((user: any) => {
    // Suche
    const matchesSearch = searchQuery === '' ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());

    // Tab-Filter
    if (currentTab === 'all') return matchesSearch;
    if (currentTab === 'active') return matchesSearch && user.isActive;
    if (currentTab === 'inactive') return matchesSearch && !user.isActive;
    if (currentTab === 'admin') return matchesSearch && user.role === 'admin';

    return matchesSearch;
  });

  // Paginierung anwenden
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handler-Funktionen
  const showUserDetails = (user: any) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const showUserEdit = (user: any) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const toggleUserStatus = (userId: number, isActive: boolean) => {
    toggleUserStatusMutation.mutate({ userId, isActive });
  };

  const deleteUser = (userId: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Benutzer löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const promoteToAdmin = (userId: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Benutzer zum Administrator befördern möchten? Dies gibt dem Benutzer vollen Zugriff auf alle Administratorfunktionen.')) {
      promoteToAdminMutation.mutate(userId);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Benutzerverwaltung" 
        actionButton={{
          label: "Neuen Benutzer erstellen",
          icon: <IconUser className="h-5 w-5" />,
          onClick: () => alert("Neuen Benutzer erstellen")
        }}
      />

      <AdminCard
        title="Benutzerliste"
        description="Verwalten Sie die Benutzer Ihres Systems."
        footer={
          <UserPagination 
            totalItems={filteredUsers.length} 
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        }
      >
        <div className="space-y-4">
          <UserFilter 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={currentTab}
            onTabChange={setCurrentTab}
          />

          <UserTable 
            users={paginatedUsers}
            isLoading={isLoading}
            onShowDetails={showUserDetails}
            onEdit={showUserEdit}
            onToggleStatus={toggleUserStatus}
            onDelete={deleteUser}
            onPromoteToAdmin={promoteToAdmin}
          />
        </div>
      </AdminCard>

      {/* Benutzerdetails Dialog */}
      <UserDetailsDialog 
        user={selectedUser} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
      />

      {/* Benutzer bearbeiten Dialog */}
      <UserEditDialog 
        user={selectedUser} 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
      />
    </div>
  );
}
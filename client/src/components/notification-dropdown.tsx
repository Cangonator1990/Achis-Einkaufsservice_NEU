import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { IconBellRinging, IconCheck, IconTrash } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export interface NotificationDropdownProps {
  count?: number;
}

/**
 * Dropdown-Komponente für Benachrichtigungen
 */
export function NotificationDropdown({ count }: NotificationDropdownProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(count || 0);

  // Lade ungelesene Benachrichtigungsanzahl
  const { data: countData } = useQuery({
    queryKey: ['/api/notifications/unread/count'],
    queryFn: async () => {
      const response = await apiRequest('/api/notifications/unread/count');
      return response.json();
    },
    refetchInterval: 60000, // Alle 60 Sekunden aktualisieren
  });

  // Lade alle Benachrichtigungen, wenn das Dropdown geöffnet ist
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await apiRequest('/api/notifications');
      return response.json();
    },
    enabled: isOpen,
  });

  // Benachrichtigung als gelesen markieren
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
    },
  });

  // Alle Benachrichtigungen als gelesen markieren
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/notifications/read-all', {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
      toast({
        title: 'Alle gelesen',
        description: 'Alle Benachrichtigungen wurden als gelesen markiert.',
      });
    },
  });

  // Benachrichtigung löschen
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
    },
  });

  // Alle Benachrichtigungen löschen
  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/notifications', {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
      toast({
        title: 'Alle gelöscht',
        description: 'Alle Benachrichtigungen wurden gelöscht.',
      });
    },
  });

  // Aktualisiere ungelesene Anzahl, wenn sich die Daten ändern
  useEffect(() => {
    if (countData?.count !== undefined) {
      setUnreadCount(countData.count);
    }
  }, [countData]);

  // Hilfsfunktion zum Formatieren des Datums
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: de });
    } catch (e) {
      return 'Unbekanntes Datum';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <IconBellRinging className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center p-0">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Benachrichtigungen</span>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <IconCheck className="h-4 w-4 mr-1" />
                <span className="text-xs">Alle lesen</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (window.confirm('Möchten Sie wirklich alle Benachrichtigungen löschen?')) {
                    deleteAllNotificationsMutation.mutate();
                  }
                }}
                disabled={deleteAllNotificationsMutation.isPending}
              >
                <IconTrash className="h-4 w-4 mr-1" />
                <span className="text-xs">Alle löschen</span>
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Benachrichtigungen werden geladen...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">Keine Benachrichtigungen vorhanden</p>
            </div>
          ) : (
            notifications.map((notification: any) => (
              <div key={notification.id} className="relative">
                <DropdownMenuItem
                  className={`px-4 py-3 cursor-default ${!notification.read ? 'bg-gray-50' : ''}`}
                >
                  <div className="w-full">
                    <div className="flex items-start justify-between mb-1">
                      <span className={`text-sm font-medium ${!notification.read ? 'text-primary' : ''}`}>
                        {notification.title}
                      </span>
                      <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{notification.message}</p>
                    <div className="flex justify-end gap-2 mt-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                        >
                          <IconCheck className="h-3 w-3 mr-1" />
                          Gelesen
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteNotificationMutation.mutate(notification.id)}
                      >
                        <IconTrash className="h-3 w-3 mr-1" />
                        Löschen
                      </Button>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { createUserQueryKey } from "@/lib/queryClient";
import {
  FaBell,
  FaCheckDouble,
  FaCalendarAlt,
  FaShoppingBasket,
  FaCheckCircle,
  FaLock,
  FaUnlock,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";

interface MobileNotificationListProps {
  onClose?: () => void;
}

export function MobileNotificationList({ onClose }: MobileNotificationListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Benachrichtigungen abrufen
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: createUserQueryKey("/api/notifications"),
  });

  // Anzahl ungelesener Benachrichtigungen
  const { data: notificationCountData } = useQuery<{ count: number }>({
    queryKey: createUserQueryKey("/api/notifications/unread/count"),
  });
  
  const unreadCount = notificationCountData?.count || 0;

  // Benachrichtigung als gelesen markieren
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      }).then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        return res;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/notifications") });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/notifications/unread/count") });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Alle Benachrichtigungen als gelesen markieren
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      }).then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        return res;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/notifications") });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/notifications/unread/count") });
      toast({
        title: "Erfolg",
        description: "Alle Benachrichtigungen als gelesen markiert",
      });
      if (onClose) onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Zeitformatierung
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
    } else if (hours < 24) {
      return `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
    } else {
      return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
    }
  };

  // Icon für verschiedene Benachrichtigungstypen
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
        return <FaShoppingBasket className="h-5 w-5 text-blue-600" />;
      case 'date_change':
      case 'date_change_request':
      case 'date_accepted':
        return <FaCalendarAlt className="h-5 w-5 text-amber-600" />;
      case 'final_date_set':
        return <FaCheckCircle className="h-5 w-5 text-green-600" />;
      case 'order_locked':
        return <FaLock className="h-5 w-5 text-red-600" />;
      case 'order_unlocked':
        return <FaUnlock className="h-5 w-5 text-green-600" />;
      default:
        return <FaBell className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="mt-2 border rounded-md overflow-hidden bg-white shadow-md">
      <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
        <h3 className="text-sm font-medium">Ungelesene: {unreadCount}</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? (
              <span className="animate-spin h-3 w-3 mr-1">◌</span>
            ) : (
              <FaCheckDouble className="h-3 w-3 mr-1" />
            )}
            Alle gelesen
          </Button>
        )}
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-4 px-3 text-center text-gray-500 text-sm">
            Keine Benachrichtigungen vorhanden
          </div>
        ) : (
          <div>
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`py-3 px-3 border-b last:border-b-0 ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start">
                  <div 
                    className="flex flex-1 items-start cursor-pointer"
                    onClick={() => {
                      // Als gelesen markieren, wenn noch nicht gelesen
                      if (!notification.isRead) {
                        markAsReadMutation.mutate(notification.id);
                      }
                      
                      // Zur Bestellung navigieren, wenn eine relatedOrderId vorhanden ist
                      if (notification.relatedOrderId) {
                        // Lade die Bestellung vorab, um sicherzustellen, dass die QueryClient-Cache gefüllt ist
                        queryClient.prefetchQuery({
                          queryKey: createUserQueryKey(`/api/orders/${notification.relatedOrderId}`),
                          queryFn: () => fetch(`/api/orders/${notification.relatedOrderId}`, {
                            credentials: 'include'
                          }).then(res => res.json())
                        }).then(() => {
                          queryClient.prefetchQuery({
                            queryKey: createUserQueryKey('/api/addresses'),
                            queryFn: () => fetch('/api/addresses', {
                              credentials: 'include'
                            }).then(res => res.json())
                          }).then(() => {
                            // Zeitverzögerung, um sicherzustellen, dass die Markierung als gelesen und Prefetch abgeschlossen sind
                            setTimeout(() => {
                              // Import direkt verwenden, um Typ-Probleme zu vermeiden
                              import('wouter').then(({ useLocation }) => {
                                // Verwende navigate statt window.location.href für die Navigation innerhalb der React-App
                                const [, navigate] = useLocation();
                                navigate(`/orders/${notification.relatedOrderId}`);
                                if (onClose) onClose();
                              }).catch(() => {
                                // Fallback, falls Import fehlschlägt
                                window.location.href = `/orders/${notification.relatedOrderId}`;
                                if (onClose) onClose();
                              });
                            }, 300);
                          });
                        });
                      }
                    }}
                  >
                    <div className="flex-shrink-0 mr-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        !notification.isRead ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(new Date(notification.createdAt))}
                      </p>
                    </div>
                  </div>
                  {!notification.isRead ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsReadMutation.mutate(notification.id);
                      }}
                      disabled={markAsReadMutation.isPending}
                    >
                      {markAsReadMutation.isPending ? (
                        <span className="animate-spin h-3 w-3 mr-1">◌</span>
                      ) : (
                        <FaCheckDouble className="h-3 w-3 mr-1" />
                      )}
                      Als gelesen markieren
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400 ml-2">Gelesen</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
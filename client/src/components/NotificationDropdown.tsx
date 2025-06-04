import React, { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  FaShoppingBasket, 
  FaCalendarAlt, 
  FaCheckCircle, 
  FaInfoCircle,
  FaLock,
  FaUnlock,
  FaBell
} from "react-icons/fa";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Benachrichtigungen mit regelmäßiger Aktualisierung
  const { data: notifications = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 10000, // Alle 10 Sekunden aktualisieren
    refetchIntervalInBackground: true,
    staleTime: 5000, // Daten nach 5 Sekunden als veraltet betrachten
  });
  
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
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
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
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
      toast({
        title: "Erfolg",
        description: "Alle Benachrichtigungen als gelesen markiert",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Außerhalb klicken schließt das Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("#notificationDropdown")) {
        onClose();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  
  // Automatisch ungelesene Benachrichtigungen als gelesen markieren nach 5 Sekunden Anzeige
  useEffect(() => {
    if (!isLoading && notifications && notifications.length > 0) {
      const unreadNotifications = notifications.filter((notification: any) => !notification.isRead);
      
      if (unreadNotifications.length > 0) {
        const timeoutIds: NodeJS.Timeout[] = [];
        
        unreadNotifications.forEach((notification: any) => {
          const timeoutId = setTimeout(() => {
            markAsReadMutation.mutate(notification.id);
          }, 5000); // Nach 5 Sekunden als gelesen markieren
          
          timeoutIds.push(timeoutId);
        });
        
        // Timeouts beim Unmount löschen
        return () => {
          timeoutIds.forEach(id => clearTimeout(id));
        };
      }
    }
  }, [isLoading, notifications, markAsReadMutation]);
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_order":
        return <FaShoppingBasket className="h-5 w-5 text-primary" />;
      case "status_change":
      case "delivery_confirmation":
        return <FaCheckCircle className="h-5 w-5 text-green-500" />;
      case "delivery_suggestion":
      case "suggestion_accepted":
        return <FaCalendarAlt className="h-5 w-5 text-amber-500" />;
      case "order_locked":
        return <FaLock className="h-5 w-5 text-red-500" />;
      case "order_unlocked":
        return <FaUnlock className="h-5 w-5 text-green-500" />;
      default:
        return <FaInfoCircle className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const handleMarkAsRead = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAsReadMutation.mutate(id);
  };
  
  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    markAllAsReadMutation.mutate();
  };

  return (
    <div 
      id="notificationDropdown" 
      className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50"
      style={{ top: "3rem", right: "0" }}
    >
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Benachrichtigungen</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-primary hover:text-blue-700"
          onClick={handleMarkAllAsRead}
        >
          Alle als gelesen markieren
        </Button>
      </div>
      
      <ScrollArea className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-3 text-center text-gray-500">Lädt...</div>
        ) : notifications?.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            Keine Benachrichtigungen vorhanden
          </div>
        ) : (
          notifications?.map((notification: any) => (
            <div 
              key={notification.id} 
              className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer ${!notification.isRead ? 'bg-blue-100' : ''}`}
              onClick={(e) => {
                // Als gelesen markieren, wenn noch nicht gelesen
                if (!notification.isRead) {
                  markAsReadMutation.mutate(notification.id);
                }
                
                // Zur Bestellung navigieren, wenn eine relatedOrderId vorhanden ist
                if (notification.relatedOrderId) {
                  // Lade die Bestellung vorab, um sicherzustellen, dass die QueryClient-Cache gefüllt ist
                  queryClient.prefetchQuery({
                    queryKey: [`/api/orders/${notification.relatedOrderId}`],
                    queryFn: () => fetch(`/api/orders/${notification.relatedOrderId}`, {
                      credentials: 'include'
                    }).then(res => res.json())
                  }).then(() => {
                    queryClient.prefetchQuery({
                      queryKey: ['/api/addresses'],
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
                          onClose();
                        }).catch(() => {
                          // Fallback, falls Import fehlschlägt
                          window.location.href = `/orders/${notification.relatedOrderId}`;
                          onClose();
                        });
                      }, 300);
                    });
                  });
                }
              }}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="ml-3 w-0 flex-1">
                  <p className="text-sm text-gray-900 font-medium">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { 
                      addSuffix: true,
                      locale: de 
                    })}
                  </p>
                </div>
                {!notification.isRead && (
                  <button 
                    className="ml-2 text-xs text-gray-400 hover:text-gray-600 bg-white rounded px-2 py-1"
                    onClick={(e) => {
                      e.stopPropagation(); // Verhindert das Auslösen des Klick-Events des übergeordneten Elements
                      handleMarkAsRead(notification.id, e);
                    }}
                  >
                    Gelesen
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </ScrollArea>
      
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-center">
        <span 
          className="text-sm text-primary hover:text-blue-700 transition cursor-pointer" 
          onClick={() => {
            // Verwende prefetchQuery um sicherzustellen, dass die Bestelldaten geladen sind
            queryClient.prefetchQuery({
              queryKey: ['/api/orders'],
              queryFn: () => fetch('/api/orders', {
                credentials: 'include'
              }).then(res => res.json())
            }).then(() => {
              // Import direkt verwenden, um Typ-Probleme zu vermeiden
              import('wouter').then(({ useLocation }) => {
                // Verwende navigate statt window.location.href für die Navigation innerhalb der React-App
                const [, navigate] = useLocation();
                navigate("/orders");
                onClose();
              }).catch(() => {
                // Fallback, falls Import fehlschlägt
                window.location.href = "/orders";
                onClose();
              });
            });
          }}
        >
          Alle Bestellungen anzeigen
        </span>
      </div>
    </div>
  );
};

export default NotificationDropdown;

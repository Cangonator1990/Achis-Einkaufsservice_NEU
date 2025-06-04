import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, createUserQueryKey } from "@/lib/queryClient";
import { Notification } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  FaHome, 
  FaShoppingBag, 
  FaShoppingCart, 
  FaUser, 
  FaSignOutAlt,
  FaShieldAlt,
  FaBell,
  FaCalendarAlt,
  FaLock,
  FaUnlock,
  FaCheckCircle,
  FaChevronDown,
  FaCheckDouble,
  FaEllipsisH
} from "react-icons/fa";

interface NotificationCountResponse {
  count: number;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, logoutMutation } = useAuth();

  // Ungelesene Benachrichtigungen abfragen
  const { data: notificationCountData } = useQuery<NotificationCountResponse>({
    queryKey: createUserQueryKey("/api/notifications/unread/count"),
    enabled: !!user,
  });
  
  // Anzahl der ungelesenen Benachrichtigungen
  const unreadCount = notificationCountData?.count || 0;

  // Alle Benachrichtigungen abfragen
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: createUserQueryKey("/api/notifications"),
    enabled: !!user && notificationsOpen,
  });

  // Benachrichtigung als gelesen markieren
  const markAsReadMutation = useMutation<unknown, Error, number>({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/notifications") });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/notifications/unread/count") });
    },
  });

  // Alle Benachrichtigungen als gelesen markieren
  const markAllAsReadMutation = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/notifications") });
      queryClient.invalidateQueries({ queryKey: createUserQueryKey("/api/notifications/unread/count") });
    },
  });

  const handleNavigation = (path: string) => {
    // Erst Menü schließen
    setOpen(false);
    setNotificationsOpen(false);
    
    // Dann Navigation verzögert ausführen, um zuerst UI-Updates abzuschließen
    setTimeout(() => {
      setLocation(path);
      // Nach oben scrollen
      window.scrollTo({
        top: 0,
        behavior: 'auto'
      });
    }, 10);
  };

  const handleLogout = () => {
    // Zuerst die UI-Elemente schließen
    setOpen(false);
    setNotificationsOpen(false);
    
    // Dann Logout durchführen
    logoutMutation.mutate();
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
  };

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
        return <FaShoppingCart className="text-blue-600" />;
      case 'date_change':
      case 'date_change_request':
      case 'date_accepted':
        return <FaCalendarAlt className="text-amber-600" />;
      case 'final_date_set':
        return <FaCheckCircle className="text-green-600" />;
      case 'order_locked':
        return <FaLock className="text-red-600" />;
      case 'order_unlocked':
        return <FaUnlock className="text-green-600" />;
      default:
        return <FaBell className="text-blue-600" />;
    }
  };

  // Prüfen, ob Benutzer ein Admin ist
  const isAdmin = user ? user.role === 'admin' : false;

  // Mobile Tab-Bar am unteren Bildschirmrand
  return (
    <>
      {/* Keine Desktop-Ansicht dieses Elements */}

      {/* Mobile Tab-Bar für mobile Ansicht */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 flex justify-around items-center p-1 shadow-lg">
        <Button 
          variant="ghost" 
          size="icon" 
          className={`flex flex-col items-center py-1 ${location === "/" ? "text-primary" : "text-gray-500"}`}
          onClick={() => handleNavigation("/")}
        >
          <FaHome className="h-5 w-5 mb-1" />
          <span className="text-xs">Home</span>
        </Button>

        {user ? (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`flex flex-col items-center py-1 ${location === "/order" ? "text-primary" : "text-gray-500"}`}
              onClick={() => handleNavigation("/order")}
            >
              <FaShoppingCart className="h-5 w-5 mb-1" />
              <span className="text-xs">Bestellen</span>
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className={`flex flex-col items-center py-1 ${location === "/orders" ? "text-primary" : "text-gray-500"}`}
              onClick={() => handleNavigation("/orders")}
            >
              <FaShoppingBag className="h-5 w-5 mb-1" />
              <span className="text-xs">Bestellungen</span>
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className={`flex flex-col items-center py-1 ${notificationsOpen ? "text-primary" : "text-gray-500"}`}
              onClick={toggleNotifications}
            >
              <div className="relative">
                <FaBell className="h-5 w-5 mb-1" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs">Mitteilungen</span>
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className={`flex flex-col items-center py-1 ${(location === "/profile" || location === "/admin") ? "text-primary" : "text-gray-500"}`}
              onClick={() => setOpen(true)}
            >
              <FaEllipsisH className="h-5 w-5 mb-1" />
              <span className="text-xs">Mehr</span>
            </Button>
          </>
        ) : (
          <>
            <div className="w-12"></div>
            <div className="w-12"></div>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`flex flex-col items-center py-1 ${location === "/auth" ? "text-primary" : "text-gray-500"}`}
              onClick={() => handleNavigation("/auth")}
            >
              <FaUser className="h-5 w-5 mb-1" />
              <span className="text-xs">Anmelden</span>
            </Button>
          </>
        )}
      </div>

      {/* Notifikations-Modal (wird bei Klick auf Benachrichtigungen angezeigt) */}
      {notificationsOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={toggleNotifications}>
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden" 
               onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Benachrichtigungen</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500"
                onClick={toggleNotifications}
              >
                <FaChevronDown className="h-4 w-4" />
              </Button>
            </div>
            
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
            
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              {notifications.length === 0 ? (
                <div className="py-8 px-4 text-center text-gray-500">
                  Keine Benachrichtigungen vorhanden
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b ${!notification.isRead ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
                        {!notification.isRead && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 h-7 text-xs"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            {markAsReadMutation.isPending ? (
                              <span className="animate-spin h-3 w-3 mr-1">◌</span>
                            ) : (
                              <FaCheckDouble className="h-3 w-3 mr-1" />
                            )}
                            Gelesen
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seitenmenü für "Mehr" (wie Profil, Admin, Abmelden) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle>
              {user ? (
                <div className="flex items-center">
                  <div className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              ) : (
                <Logo variant="text" size="medium" />
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 flex-1">
            {user && (
              <>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${location === "/profile" ? "bg-muted" : ""}`}
                  onClick={() => handleNavigation("/profile")}
                >
                  <FaUser className="mr-2 h-5 w-5" />
                  Profil
                </Button>

                {isAdmin && (
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${location === "/admin" ? "bg-muted" : ""}`}
                    onClick={() => handleNavigation("/admin")}
                  >
                    <FaShieldAlt className="mr-2 h-5 w-5" />
                    Administration
                  </Button>
                )}
              </>
            )}
          </div>

          {user && (
            <div className="border-t pt-4 mt-auto">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <FaSignOutAlt className="mr-2 h-5 w-5" />
                Abmelden
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
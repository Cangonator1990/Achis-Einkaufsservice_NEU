import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  ChevronDown, 
  Menu, 
  User, 
  ShoppingBag, 
  Home, 
  ClipboardList,
  Calendar,
  CheckCircle,
  Lock,
  Unlock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationDropdown from "./NotificationDropdown";
import { MobileNotificationList } from "./mobile-notification-list";
import { MobileNav } from "./mobile-nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { createUserQueryKey } from "@/lib/queryClient";

const Header = () => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get unread notification count - automatisch alle 15 Sekunden aktualisieren
  const { data: notificationData } = useQuery<{ count: number }>({
    queryKey: createUserQueryKey("/api/notifications/unread/count"),
    enabled: !!user,
    refetchInterval: 15000, // Alle 15 Sekunden aktualisieren
    refetchIntervalInBackground: true, // Auch aktualisieren, wenn die Seite im Hintergrund ist
    staleTime: 10000, // Daten nach 10 Sekunden als veraltet betrachten
  });

  // Alle Benachrichtigungen abfragen
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: createUserQueryKey("/api/notifications"),
    enabled: !!user && notificationDropdownOpen,
  });

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
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Formatiert die Zeit relativ zum aktuellen Zeitpunkt
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

  // Icon für verschiedene Benachrichtigungstypen zurückgeben
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
        return <ShoppingBag className="h-5 w-5 text-blue-600" />;
      case 'date_change':
      case 'date_change_request':
      case 'date_accepted':
        return <Calendar className="h-5 w-5 text-amber-600" />;
      case 'final_date_set':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'order_locked':
        return <Lock className="h-5 w-5 text-red-600" />;
      case 'order_unlocked':
        return <Unlock className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const unreadCount = notificationData ? (notificationData.count || 0) : 0;
  const prevUnreadCountRef = useRef<number>(0);

  // Benachrichtigung anzeigen, wenn neue ungelesene Nachrichten hinzukommen
  useEffect(() => {
    if (user && unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
      // Nur benachrichtigen, wenn neue Nachrichten hinzugekommen sind (nicht beim ersten Laden)
      toast({
        title: "Neue Benachrichtigung",
        description: "Sie haben neue ungelesene Benachrichtigungen",
        variant: "default",
        action: (
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setNotificationDropdownOpen(true)}
          >
            Anzeigen
          </Button>
        ),
      });
    }
    // Aktuellen Wert für den nächsten Vergleich speichern
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount, user, toast]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleNotifications = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Logo variant="text" size="medium" />
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="flex items-center space-x-6">
              <Link href="/">
                <span className={`text-gray-700 hover:text-primary transition font-medium cursor-pointer ${location === "/" ? "text-primary" : ""}`}>
                  Startseite
                </span>
              </Link>

              {user && (
                <>
                  <Link href="/order">
                    <span className={`text-gray-700 hover:text-primary transition font-medium cursor-pointer ${location === "/order" ? "text-primary" : ""}`}>
                      Bestellen
                    </span>
                  </Link>
                  <Link href="/orders">
                    <span className={`text-gray-700 hover:text-primary transition font-medium cursor-pointer ${location === "/orders" ? "text-primary" : ""}`}>
                      Meine Bestellungen
                    </span>
                  </Link>
                  <Link href="/profile">
                    <span className={`text-gray-700 hover:text-primary transition font-medium cursor-pointer ${location === "/profile" ? "text-primary" : ""}`}>
                      Profil
                    </span>
                  </Link>

                  {/* Notification Icon */}
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      className="text-gray-700 hover:text-primary transition p-2 relative"
                      onClick={toggleNotifications}
                    >
                      {/* Dunklere Bell mit besserem Kontrast auf weißem Hintergrund */}
                      <Bell className="h-5 w-5 text-gray-800" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>

                    {notificationDropdownOpen && (
                      <NotificationDropdown 
                        onClose={() => setNotificationDropdownOpen(false)} 
                      />
                    )}
                  </div>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="ml-2 hidden lg:block">
                          {user?.firstName} {user?.lastName}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <div className="flex items-center cursor-pointer w-full">
                            <User className="mr-2 h-4 w-4" />
                            <span>Mein Profil</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/orders">
                          <div className="flex items-center cursor-pointer w-full">
                            <ClipboardList className="mr-2 h-4 w-4" />
                            <span>Meine Bestellungen</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                      {user?.role === "admin" && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <div className="flex items-center cursor-pointer w-full">
                              <ShoppingBag className="mr-2 h-4 w-4" />
                              <span>Admin Dashboard</span>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        Abmelden
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {!user && (
                <Button asChild>
                  <Link href="/auth">
                    <span>Anmelden</span>
                  </Link>
                </Button>
              )}
            </nav>
          )}

          {/* Mobile Menu Button - nur zeigen, wenn nicht die neue Mobile-Nav aktiv ist */}
          {isMobile && (
            <MobileNav />
          )}
        </div>
      </div>

      {/* Alte Mobile Navigation Menu - deaktiviert wegen neuer Tab-Bar */}
    </header>
  );
};

export default Header;
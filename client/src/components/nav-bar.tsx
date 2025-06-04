import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { NotificationTestButton } from "@/components/notification-test-button"; // Hinzugefügt
import { useQuery } from "@tanstack/react-query";
import { Link as WouterLink, useLocation } from "wouter";

// Verbesserte Link-Komponente mit optimiertem Scroll-Verhalten
const Link = ({ href, className, children, ...props }: { href: string; className?: string; children: React.ReactNode; [key: string]: any }) => {
  const [, setLocation] = useLocation();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Sofort nach oben scrollen
    window.scrollTo({
      top: 0,
      behavior: 'auto' // instant statt smooth für bessere Benutzererfahrung
    });
    
    // Verzögerung hinzufügen, damit der Scroll vollständig ausgeführt werden kann
    setTimeout(() => {
      // Nutze wouter's setLocation für die Navigation
      setLocation(href);
    }, 5); // Minimale Verzögerung
  };
  
  return (
    <span 
      onClick={handleClick} 
      className={className} 
      style={{ cursor: 'pointer' }}
    >
      {children}
    </span>
  );
};

export function NavBar() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Funktion zum Navigieren zur Bestellseite mit Scroll nach oben
  const navigateToOrder = () => {
    // Sofort nach oben scrollen
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
    
    // Verzögerung hinzufügen, damit der Scroll vollständig ausgeführt werden kann
    setTimeout(() => {
      // Nutze wouter's setLocation für die Navigation
      setLocation("/order");
    }, 5); // Minimale Verzögerung
  };

  // Get notification count
  const { data: notificationData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread/count"],
    queryFn: ({ queryKey }) => fetch(queryKey[0] as string).then(res => res.json()),
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  const notificationCount = notificationData?.count || 0;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Sofort nach oben scrollen
        window.scrollTo({
          top: 0,
          behavior: 'auto'
        });
        
        // Nach erfolgreicher Abmeldung zur Login-Seite navigieren mit wouter
        setTimeout(() => {
          setLocation("/auth");
        }, 100); // Kurze Verzögerung, damit die Abmeldung abgeschlossen werden kann
      }
    });
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="bg-white shadow-sm relative z-20">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="ACHIS Einkaufsservice Logo" 
              className="h-12 w-auto object-contain"
            />
            <span className="text-xl font-semibold text-primary">Achis Einkaufsservice</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-gray-700 focus:outline-none"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {user && (
            <>
              <Link href="/" className="text-primary font-medium">
                Startseite
              </Link>
              <button 
                onClick={navigateToOrder} 
                className="text-gray-600 hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 font-inherit text-inherit"
              >
                Bestellen
              </button>
              <Link href="/orders" className="text-gray-600 hover:text-primary transition-colors">
                Meine Bestellungen
              </Link>
              <Link href="/profile" className="text-gray-600 hover:text-primary transition-colors">
                Profil
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="text-gray-600 hover:text-primary transition-colors">
                  Admin
                </Link>
              )}

              {/* Notification Icon */}
              <div className="flex items-center">
                <NotificationDropdown count={notificationCount} />
                {user.role === "admin" && (
                  <NotificationTestButton />
                )}
              </div>

              <Button 
                variant="outline" 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                Abmelden
              </Button>
            </>
          )}

          {!user && (
            <>
              <Link href="/auth">
                <Button variant="outline">Anmelden</Button>
              </Link>
              <Link href="/auth?register=true">
                <Button>Registrieren</Button>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="container mx-auto px-4 py-2 space-y-3">
            {user ? (
              <>
                <Link href="/" className="block py-2 text-primary font-medium">
                  Startseite
                </Link>
                <button 
                  onClick={navigateToOrder} 
                  className="block py-2 text-gray-600 text-left w-full bg-transparent border-none cursor-pointer"
                >
                  Bestellen
                </button>
                <Link href="/orders" className="block py-2 text-gray-600">
                  Meine Bestellungen
                </Link>
                <Link href="/profile" className="block py-2 text-gray-600">
                  Profil
                </Link>
                {user.role === "admin" && (
                  <Link href="/admin" className="block py-2 text-gray-600">
                    Admin
                  </Link>
                )}
                <div>
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="w-full"
                  >
                    Abmelden
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col space-y-2 py-2">
                <Link href="/auth">
                  <Button variant="outline" className="w-full">Anmelden</Button>
                </Link>
                <Link href="/auth?register=true">
                  <Button className="w-full">Registrieren</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
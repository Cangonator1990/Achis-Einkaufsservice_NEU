import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useEffect } from "react";

// Eigene ScrollToTop-Komponente
const ScrollToTop = () => {
  useEffect(() => {
    // Sofort nach oben scrollen
    window.scrollTo({
      top: 0,
      behavior: 'auto' // instant statt smooth für bessere Benutzererfahrung
    });
  }, []);
  
  return null;
};

// Eigene Redirect-Komponente, die nach oben scrollt
const ScrollingRedirect = ({ to }: { to: string }) => {
  useEffect(() => {
    // Sofort nach oben scrollen
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }, []);
  
  return <Redirect to={to} />;
};

export function ProtectedRoute({
  element,
  admin = false
}: {
  element: React.ReactNode;
  admin?: boolean;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Bei jedem Rendern (Seitenwechsel) nach oben scrollen
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <ScrollingRedirect to="/auth" />;
  }

  if (admin && user?.role !== "admin") {
    return <ScrollingRedirect to="/" />;
  }

  return (
    <>
      <ScrollToTop />
      {element}
    </>
  );
}

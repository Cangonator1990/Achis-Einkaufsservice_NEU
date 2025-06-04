import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import OrderPage from "@/pages/order-page";
import ProfilePage from "@/pages/profile-page";
import MyOrdersPage from "@/pages/my-orders-page";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin-page";
import EditOrderPage from "@/pages/edit-order-page";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/lib/CartProvider";
import { ProtectedRoute } from "@/lib/protected-route";
import { ScrollToTop } from "@/components/scroll-to-top";
import { useEffect } from "react";

// NavigationHandler Komponente für Seitenübergänge
function NavigationHandler() {
  useEffect(() => {
    // Event-Listener für vor der Seiten-Navigation
    const handleBeforeNavigate = () => {
      // Sofort nach oben scrollen
      window.scrollTo({
        top: 0,
        behavior: 'auto'
      });
      
      // Alle Abfragen für ein Neuladen markieren
      queryClient.invalidateQueries();
    };

    // Event-Listener für Links hinzufügen
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const linkElement = target.closest('a');
      
      if (linkElement && linkElement.getAttribute('href')?.startsWith('/')) {
        handleBeforeNavigate();
      }
    });

    return () => {
      // Event-Listener bei Unmount entfernen
      document.removeEventListener('click', handleBeforeNavigate);
    };
  }, []);

  return null;
}

function Router() {
  // Nach dem ersten Rendern nach oben scrollen
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }, []);

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/order">
        <ProtectedRoute element={<OrderPage />} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute element={<ProfilePage />} />
      </Route>
      <Route path="/orders">
        <ProtectedRoute element={<MyOrdersPage />} />
      </Route>
      <Route path="/orders/:id/edit">
        <ProtectedRoute element={<EditOrderPage />} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute element={<AdminPage />} admin={true} />
      </Route>
      <Route path="/admin/orders">
        <ProtectedRoute element={<AdminPage />} admin={true} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute element={<AdminPage />} admin={true} />
      </Route>
      <Route path="/admin/products">
        <ProtectedRoute element={<AdminPage />} admin={true} />
      </Route>
      <Route path="/admin/notifications">
        <ProtectedRoute element={<AdminPage />} admin={true} />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute element={<AdminPage />} admin={true} />
      </Route>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Verbesserte Error-Boundary-Behandlung für stabilere App
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <NavigationHandler />
            <ScrollToTop />
            <Router />
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("Kritischer Fehler in App-Komponente:", error);
    
    // Einfache Fallback-UI bei kritischen Fehlern
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-800">
            Achis Einkaufservice
          </h2>
          <div className="p-4 mb-4 text-sm text-red-600 bg-red-100 rounded-md">
            <p>
              Beim Laden der Anwendung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder
              kontaktieren Sie uns, wenn das Problem weiterhin besteht.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }
}

export default App;

import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, getPrivateQueriesFilter, createUserQueryKey } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userLoading: boolean; // Alias für isLoading zur Konsistenz mit AdminDashboard
  authenticated: boolean; // Alias für isAuthenticated zur Konsistenz mit AdminDashboard
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  logout: () => void; // Einfache Methode zum Abmelden
};

type LoginData = {
  username: string;
  password: string;
};

// Use the same schema definition for registration as on the auth page
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
  // Override birthDate to accept string from the date input
  birthDate: z.string().refine(val => !!val, {
    message: "Geburtsdatum ist erforderlich"
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Verbesserte Version mit Fallback und schnellerem direkten Auth-Check
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: createUserQueryKey("/api/user"),
    queryFn: async ({ queryKey }) => {
      try {
        // Einfacher Auth-Check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        try {
          // Wir verwenden den Standard-Endpunkt '/api/auth/check'
          const res = await fetch('/api/auth/check', {
            credentials: "include",
            signal: controller.signal
          });
          
          // Wenn wir nicht authentifiziert sind
          if (res.status === 401) {
            clearTimeout(timeoutId);
            return null;
          }
          
          // Wenn wir authentifiziert sind, geben wir die Benutzerdaten zurück
          if (res.ok) {
            clearTimeout(timeoutId);
            const data = await res.json();
            return data.user;
          }
        } catch (e) {
          console.error("Auth-Check fehlgeschlagen:", e);
        } finally {
          clearTimeout(timeoutId);
        }
        
        // Fallback auf den normalen Authentifizierungsprozess mit erforderlichen Parametern
        return await getQueryFn({ on401: "returnNull" })({ 
          queryKey,
          // Fehlende erforderliche Parameter hinzufügen
          signal: new AbortController().signal,
          meta: {}
        });
      } catch (error) {
        console.error("Auth-Check-Fehler:", error);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        // Standard Login-Endpunkt verwenden
        const res = await fetch("/api/login", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(credentials)
        });
        
        if (res.ok) {
          const userData = await res.json();
          return userData;
        }
        
        // Bei Fehlern werfen wir eine informative Fehlermeldung
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || "Anmeldung fehlgeschlagen");
      } catch (error) {
        console.error("Login error:", error);
        throw new Error(error instanceof Error ? error.message : "Anmeldung fehlgeschlagen");
      }
    },
    onSuccess: (user: User) => {
      // DATENSCHUTZ: Vollständiger Cache-Reset vor dem Login eines neuen Benutzers
      queryClient.clear();
      
      // Nutzerdaten mit benutzerspezifischem Key im Cache speichern
      queryClient.setQueryData(createUserQueryKey("/api/user", user.id), user);
      
      // Auch den User-Status sofort aktualisieren
      queryClient.setQueryData(createUserQueryKey("/api/user"), user);
      
      // Proaktive Invalidierung aller privaten Abfragen
      queryClient.invalidateQueries(getPrivateQueriesFilter());
      
      navigate("/");
      toast({
        title: "Erfolgreich angemeldet",
        description: `Willkommen zurück, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Anmeldung fehlgeschlagen",
        description: error.message || "Ein unbekannter Fehler ist aufgetreten",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      // Convert birthDate from string to Date
      const processedData = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined
      };
      const res = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(processedData)
      });
      return await res.json();
    },
    onSuccess: (user: User) => {
      // DATENSCHUTZ: Vollständiger Cache-Reset vor dem Login eines neuen Benutzers
      queryClient.clear();
      
      // Nutzerdaten mit benutzerspezifischem Key im Cache speichern
      queryClient.setQueryData(createUserQueryKey("/api/user", user.id), user);
      
      navigate("/");
      toast({
        title: "Registrierung erfolgreich",
        description: `Willkommen bei Achis Einkaufservice, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registrierung fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", {
        method: "POST"
      });
    },
    onSuccess: () => {
      // Vor dem Logout sicherstellen, dass alle Abfragen gelöscht werden
      queryClient.clear();
      
      navigate("/");
      toast({
        title: "Erfolgreich abgemeldet",
        description: "Auf Wiedersehen!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Abmeldung fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Ein Benutzer ist authentifiziert, wenn ein User-Objekt vorhanden ist
  const isAuthenticated = !!user;
  
  // Prüfen, ob der Benutzer Admin-Rechte hat
  const isAdmin = user?.role === 'admin';

  // Einfache Logout-Funktion
  const logout = () => {
    logoutMutation.mutate();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isAuthenticated,
        isAdmin: !!isAdmin,
        // Alias-Felder für Konsistenz
        userLoading: isLoading,
        authenticated: isAuthenticated,
        loginMutation,
        logoutMutation,
        registerMutation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
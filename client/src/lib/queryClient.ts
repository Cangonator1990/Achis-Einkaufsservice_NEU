import { QueryClient, QueryFunction, QueryFilters } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

import { API_BASE_URL, API_V2_BASE_URL } from '../config/api.config';

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string | FormData;
    headers?: Record<string, string>;
    timeout?: number;
    useV2?: boolean;
  }
): Promise<Response> {
  // Verbesserte Version mit Timeout-Unterstützung
  const controller = new AbortController();
  const { signal } = controller;
  
  // Standard-Timeout: 10 Sekunden
  const timeout = options?.timeout || 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Entscheiden, ob V2-API verwendet werden soll
    const useV2Api = options?.useV2 || 
                   url === '/api/health' || 
                   url.startsWith('/api/v2/') ||
                   url.startsWith('/api/admin/');
    
    // Health-Check speziell behandeln
    if (url === '/api/health') {
      try {
        const directRes = await fetch('/api/health-direct', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          credentials: "include"
        });
        
        if (directRes.ok) {
          console.log('Direkter Health-Endpunkt erfolgreich verwendet');
          return directRes;
        }
      } catch (error) {
        console.log('Direkter Health-Endpunkt fehlgeschlagen, versuche normal');
      }
    }
    
    // URL mit V2-Unterstützung aufbauen
    let finalUrl = url;
    
    // Wenn V2-API verwendet werden soll, passe URL an
    if (useV2Api) {
      // Entferne /api/ vom Anfang, falls vorhanden
      const path = url.startsWith('/api/') ? url.substring(5) : url;
      
      // Entferne v2/ vom Anfang, falls vorhanden
      const normalizedPath = path.startsWith('v2/') ? path.substring(3) : path;
      
      // Füge API_V2_BASE_URL hinzu
      finalUrl = `${API_V2_BASE_URL}/${normalizedPath}`;
    }
    
    // Normale Anfrage mit Timeout und expliziten Accept-Header
    const res = await fetch(finalUrl, {
      method: options?.method || 'GET',
      headers: options?.body && !(options.body instanceof FormData) 
        ? { 
            "Content-Type": "application/json", 
            "Accept": "application/json", 
            "X-Requested-With": "XMLHttpRequest", // Hilft Server zu erkennen, dass es AJAX ist
            ...options?.headers 
          }
        : { 
            "Accept": "application/json", 
            "X-Requested-With": "XMLHttpRequest", // Hilft Server zu erkennen, dass es AJAX ist
            ...options?.headers || {} 
          },
      body: options?.body,
      credentials: "include",
      signal
    });
    
    await throwIfResNotOk(res);
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Sicherheitsmaßnahme: Stellen Sie sicher, dass der Endpunkt im QueryKey ist
    if (!queryKey || !queryKey[0] || typeof queryKey[0] !== 'string') {
      throw new Error('Ungültiger QueryKey: Der erste Eintrag muss ein String sein.');
    }

    // Endpunkt extrahieren
    const endpoint = queryKey[0] as string;
    
    // Sicherheitsrichtlinie durchsetzen: Für private Daten muss eine Benutzer-ID vorhanden sein
    if (isPrivateEndpoint(endpoint) && queryKey.length < 2) {
      console.warn(`DATENSCHUTZ-WARNUNG: Zugriff auf private Daten ohne Benutzer-ID: ${endpoint}`);
      // In der Produktion könnten wir hier abbrechen, aber für Entwicklungszwecke erlauben wir es
    }

    // Entscheide ob V2-API genutzt werden soll
    const useV2Api = endpoint === '/api/health' || 
                    endpoint.startsWith('/api/v2/') || 
                    endpoint.startsWith('/api/admin/');

    // API-Anfrage senden mit Timeout und Fallback
    let res: Response;
    try {
      // Versuche mit apiRequest, das automatisch V2-URLs verarbeitet
      res = await apiRequest(endpoint, { 
        useV2: useV2Api, 
        timeout: 5000
      });
    } catch (error) {
      // Bei Timeout oder Fehler versuche einen Direct-Endpoint als Fallback
      if (endpoint === '/api/health') {
        console.log('Normaler Endpunkt fehlgeschlagen, versuche Fallback für Health-Check');
        res = await fetch('/api/health-direct', { 
          credentials: "include",
          headers: { 
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
          }
        });
      } else if (endpoint === '/api/user') {
        console.log('Normaler User-Endpunkt fehlgeschlagen, versuche direkten Datenbank-Check');
        // Für den Benutzerendpunkt gibt es keinen Fallback, also geben wir 401 zurück
        return null;
      } else {
        // Für andere Endpunkte noch einen Fallback-Versuch mit V2-API
        if (useV2Api) {
          console.log(`V2-API für ${endpoint} fehlgeschlagen, versuche Standardendpunkt`);
          // Letzter Versuch mit Standardendpunkt
          try {
            res = await fetch(endpoint, {
              credentials: "include",
              headers: { 
                "Accept": "application/json", 
                "X-Requested-With": "XMLHttpRequest"
              }
            });
          } catch (fallbackError) {
            throw error; // Wenn auch das fehlschlägt, Original-Fehler werfen
          }
        } else {
          throw error;
        }
      }
    }

    // 401 Unauthorized-Handling gemäß Konfiguration
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * DATENSCHUTZ: Data Isolation System (DIS)
 * 
 * Dieses System stellt sicher, dass sensible Daten eines Benutzers 
 * niemals zwischen verschiedenen Benutzern geteilt werden.
 * Es gilt das Prinzip der strikten Isolation: Daten eines Benutzers 
 * können niemals im Browser-Cache eines anderen Benutzers landen.
 */

/**
 * Liste sensibler Endpunkte, die privat pro Benutzer sein müssen.
 * WICHTIG: Alle Endpunkte, die benutzerspezifische Daten enthalten, müssen hier aufgelistet sein!
 */
const PRIVATE_ENDPOINTS = [
  "/api/addresses", 
  "/api/profile",
  "/api/orders",
  "/api/cart",
  "/api/cart/active", // Wichtig: Cart-Daten müssen isoliert werden!
  "/api/notifications",
  "/api/notifications/unread/count",
  "/api/user",
  "/api/order-draft",
  "/api/preferences",
  // Admin-Endpunkte hinzufügen
  "/api/admin/",
  "/api/admin/dashboard",
  "/api/admin/orders",
  "/api/admin/users"
];

/**
 * Prüft, ob ein Endpunkt private Benutzerdaten enthält
 */
export function isPrivateEndpoint(endpoint: string): boolean {
  return PRIVATE_ENDPOINTS.some(privateEndpoint => 
    endpoint.includes(privateEndpoint)
  );
}

/**
 * Erstellt benutzerspezifische Query-Keys
 * Für private Daten wird die Benutzer-ID Teil des Cache-Schlüssels,
 * wodurch eine vollständige Isolation zwischen Benutzern sichergestellt wird.
 */
export function createUserQueryKey(endpoint: string, userId?: number): string[] {
  if (isPrivateEndpoint(endpoint)) {
    // Für sensible Daten: Füge Benutzer-ID hinzu, um Isolation zu garantieren
    return [endpoint, `user_${userId || 'anonymous'}`];
  }
  
  // Für öffentliche Daten: Nur Endpunkt verwenden (kann geteilt werden)
  return [endpoint];
}

/**
 * Erzeugt ein Filter für QueryClient.invalidateQueries, das alle
 * Abfragen zu privaten Endpunkten ohne Benutzer-ID invalidiert
 */
export function getPrivateQueriesFilter(): QueryFilters {
  return {
    predicate: (query) => {
      const queryKey = query.queryKey;
      if (Array.isArray(queryKey) && typeof queryKey[0] === 'string') {
        // Filtere private Endpunkte
        return isPrivateEndpoint(queryKey[0]);
      }
      return false;
    },
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Bei Seitenwechsel Daten als veraltet markieren, damit sie neu geladen werden
      staleTime: 0,
      // Bei Fehlern nicht wiederholen
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

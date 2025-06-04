/**
 * API Service
 * 
 * Zentrale Klasse für alle API-Anfragen der Anwendung.
 * Stellt standardisierte Methoden für alle HTTP-Verben bereit
 * und kümmert sich um die Fehlerbehandlung und Rückgabetypen.
 */

// Importiere zentrale API-Konfigurationswerte
import { API_BASE_URL, API_V2_BASE_URL } from '../config/api.config';

// Response-Typen
type ApiResponse<T> = {
  data: T;
  status: number;
  ok: boolean;
};

type ApiErrorResponse = {
  status: number;
  message: string;
  errors?: Record<string, string[]> | null;
};

/**
 * API-Service Hauptklasse
 * 
 * Stellt standardisierte Methoden für REST-Anfragen bereit
 */
class ApiService {
  /**
   * GET-Anfrage an die API
   * 
   * @param endpoint - API-Endpunkt (ohne Base-URL)
   * @param params - Optionale Query-Parameter
   * @returns API-Antwort als typisiertes Objekt
   */
  /**
   * GET-Anfrage an die API mit V2-Endpoint-Unterstützung
   * 
   * @param endpoint - API-Endpunkt (ohne Base-URL)
   * @param params - Optionale Query-Parameter
   * @param useV2 - Optional: Erzwingt die Verwendung der V2-API
   * @returns API-Antwort als typisiertes Objekt
   */
  async get<T>(endpoint: string, params?: Record<string, string>, useV2?: boolean): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, params, useV2);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include'
      });
      
      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }
  
  /**
   * POST-Anfrage an die API mit V2-Endpoint-Unterstützung
   * 
   * @param endpoint - API-Endpunkt (ohne Base-URL)
   * @param data - Zu sendende Daten
   * @param useV2 - Optional: Erzwingt die Verwendung der V2-API
   * @returns API-Antwort als typisiertes Objekt
   */
  async post<T>(endpoint: string, data: any, useV2?: boolean): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, undefined, useV2);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }
  
  /**
   * PUT-Anfrage an die API mit V2-Endpoint-Unterstützung
   * 
   * @param endpoint - API-Endpunkt (ohne Base-URL)
   * @param data - Zu sendende Daten
   * @param useV2 - Optional: Erzwingt die Verwendung der V2-API
   * @returns API-Antwort als typisiertes Objekt
   */
  async put<T>(endpoint: string, data: any, useV2?: boolean): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, undefined, useV2);
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }
  
  /**
   * PATCH-Anfrage an die API mit V2-Endpoint-Unterstützung
   * 
   * @param endpoint - API-Endpunkt (ohne Base-URL)
   * @param data - Zu sendende Daten
   * @param useV2 - Optional: Erzwingt die Verwendung der V2-API
   * @returns API-Antwort als typisiertes Objekt
   */
  async patch<T>(endpoint: string, data: any, useV2?: boolean): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, undefined, useV2);
    
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }
  
  /**
   * DELETE-Anfrage an die API mit V2-Endpoint-Unterstützung
   * 
   * @param endpoint - API-Endpunkt (ohne Base-URL)
   * @param useV2 - Optional: Erzwingt die Verwendung der V2-API
   * @returns API-Antwort als typisiertes Objekt
   */
  async delete<T>(endpoint: string, useV2?: boolean): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, undefined, useV2);
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include'
      });
      
      return await this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }
  
  /**
   * Prüft den Authentifizierungsstatus des Benutzers
   * Unterstützt automatisch die v2-API
   * 
   * @returns true wenn der Benutzer angemeldet ist, sonst false
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Zuerst versuchen wir es mit der v2-API
      try {
        const response = await this.get<{ isAuthenticated: boolean }>('/auth/check', undefined, true);
        return response.ok && response.data.isAuthenticated;
      } catch (v2Error) {
        // Bei Fehler mit der v2-API fallback zur v1-API
        console.log("V2 Auth-Check fehlgeschlagen, versuche v1-API");
        const response = await this.get<{ isAuthenticated: boolean }>('/auth/check');
        return response.ok && response.data.isAuthenticated;
      }
    } catch {
      return false;
    }
  }
  
  /**
   * Baut eine vollständige URL mit Base-URL und Query-Parametern
   * Unterstützt automatisch die Verwendung von API_V2_BASE_URL für neue Endpunkte
   * 
   * @param endpoint - API-Endpunkt (ohne Base-URL)
   * @param params - Optionale Query-Parameter
   * @param useV2 - Optional: Erzwingt die Verwendung der V2-API
   * @returns Vollständige URL
   */
  private buildUrl(endpoint: string, params?: Record<string, string>, useV2?: boolean): string {
    // Sicherstellen, dass der Endpunkt mit einem / beginnt
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Entscheiden, ob API_V2_BASE_URL oder API_BASE_URL verwendet werden soll
    // Wir prüfen auf bekannte v2-Präfixe und auf explizite useV2-Anforderung
    const isV2Endpoint = useV2 || 
      normalizedEndpoint.startsWith('/v2/') || 
      normalizedEndpoint.startsWith('/health');
      
    // Basis-URL entsprechend wählen
    const baseUrl = isV2Endpoint ? API_V2_BASE_URL : API_BASE_URL;
    
    // Bei v2-Endpunkten, die mit /v2/ beginnen, dieses Präfix entfernen
    const finalEndpoint = isV2Endpoint && normalizedEndpoint.startsWith('/v2/') 
      ? normalizedEndpoint.substring(3) // Entferne '/v2' vom Anfang
      : normalizedEndpoint;
      
    let url = `${baseUrl}${finalEndpoint}`;
    
    // Query-Parameter hinzufügen
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return url;
  }
  
  /**
   * Erzeugt die Standard-Header für API-Anfragen
   * 
   * @returns Header-Objekt
   */
  private getHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    return headers;
  }
  
  /**
   * Verarbeitet die API-Antwort
   * 
   * @param response - Fetch-Response-Objekt
   * @returns Typisierte API-Antwort
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const status = response.status;
    
    try {
      // Versuchen, die Antwort als JSON zu parsen
      const data = await response.json();
      
      return {
        data: data as T,
        status,
        ok: response.ok
      };
    } catch (error) {
      // Falls keine JSON-Antwort, leeres Objekt zurückgeben
      return {
        data: {} as T,
        status,
        ok: response.ok
      };
    }
  }
  
  /**
   * Fehlerbehandlung für API-Anfragen
   * 
   * @param error - Aufgetretener Fehler
   * @returns Standardisierte Fehlerantwort
   */
  private handleError<T>(error: any): ApiResponse<T> {
    console.error('API-Fehler:', error);
    
    return {
      data: {} as T,
      status: 500,
      ok: false
    };
  }
}

// Singleton-Instanz des API-Service exportieren
export const apiService = new ApiService();
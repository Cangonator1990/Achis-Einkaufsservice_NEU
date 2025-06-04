import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// Cart-Daten-Typen
type CartItem = {
  productName: string;
  quantity: string; // Als String, um mit dem Schema und der Datenbank konsistent zu sein
  notes?: string;
  store: string;
  imageUrl?: string;
  filePath?: string;
};

type Cart = {
  items: CartItem[];
  store?: string;
};

// Typ für den CartContext
type CartContextType = {
  cart: Cart; // Immer definiert, mindestens mit leeren items
  isLoading: boolean;
  clearCart: (silent?: boolean) => void;
  saveCart: (items: CartItem[], store: string | undefined, silent?: boolean) => void;
};

// Standardwert für einen leeren Warenkorb
const emptyCart: Cart = { items: [] };

// CartContext erstellen mit Default-Wert
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  /**
   * Diese Hilfsfunktion überprüft und korrigiert Bild-URLs im MULTI-Format.
   * Sie stellt sicher, dass alle Bilder im Warenkorb valide sind.
   */
  const ensureValidImageUrls = (items: CartItem[]): CartItem[] => {
    if (!items || !Array.isArray(items)) return [];
    
    return items.map(item => {
      // Wenn kein Item oder es nicht den erwarteten Typ hat, überspringen
      if (!item || typeof item !== 'object') {
        console.warn("Ungültiges CartItem gefunden, übersprungen");
        return {
          productName: "Unbekanntes Produkt",
          quantity: "1",
          store: "",
          imageUrl: ""
        };
      }
      
      // Wenn das Item keine imageUrl hat, unverändert zurückgeben
      if (!item.imageUrl) return item;
      
      if (typeof item.imageUrl === 'string') {
        // Wenn das Bild im MULTI-Format vorliegt, stellen wir sicher, dass es korrekt encoded ist
        if (item.imageUrl.startsWith('MULTI:')) {
          try {
            // Wir überprüfen, ob die URL decodiert werden kann
            const base64 = item.imageUrl.replace('MULTI:', '');
            const jsonString = decodeURIComponent(atob(base64));
            JSON.parse(jsonString); // Nur zur Überprüfung
            // Wenn kein Fehler auftritt, ist das Bild-Format korrekt
            return item;
          } catch (e) {
            console.warn("Ungültiges MULTI-Bildformat für Produkt, setze auf leeren String:", 
              item.productName, e);
            
            // Bei Fehler nicht null verwenden, sondern leeren String (kompatibel mit CartItem Typ)
            return { 
              ...item, 
              imageUrl: "" // Leerer String statt null
            };
          }
        }
      } else {
        // Wenn imageUrl nicht vom Typ string ist
        console.warn("imageUrl ist nicht vom Typ string, setze auf leeren String", 
          typeof item.imageUrl);
        return {
          ...item,
          imageUrl: ""
        };
      }
      
      // Wenn alles in Ordnung ist, Item unverändert zurückgeben
      return item;
    }).filter(Boolean); // Entferne mögliche null/undefined-Werte
  };

  // Initialisiere den lokalen Cart mit einem leeren Warenkorb
  // Gemäß Sicherheitsanforderungen werden keine Daten mehr im localStorage gespeichert
  const [localCart, setLocalCart] = useState<Cart>(emptyCart);

  // Hole aktiven Warenkorb vom Server, aber nur wenn der Benutzer angemeldet ist
  const { data: serverCart, isLoading, error: cartError } = useQuery<Cart>({
    queryKey: ['/api/cart/active'],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true, 
    retry: 3,
    retryDelay: 1000,
    // Default-Antwort für den Fall, dass der Server keinen Cart zurückgibt
    select: (data) => {
      // Stellen sicher, dass die Daten immer dem Cart-Format entsprechen
      if (!data || !data.items) {
        return emptyCart;
      }
      return data;
    }
  });
  
  // Wenn der Benutzer sich anmeldet oder der Server-Warenkorb sich ändert
  useEffect(() => {
    if (!isAuthenticated) return;
    
    try {
      // Typensicherheit: Stelle sicher, dass serverCart ein vollständiges Cart-Objekt ist
      const typedServerCart = serverCart as Cart | undefined;
      
      // Prüfe, ob der Server-Warenkorb Elemente enthält
      const hasServerItems = typedServerCart && typedServerCart.items && typedServerCart.items.length > 0;
      
      // Wenn Server-Warenkorb Elemente hat, hat dieser Priorität
      if (hasServerItems) {
        console.log("Server-Warenkorb mit Elementen empfangen:", typedServerCart);
        
        // Lokalen Status aktualisieren (nur für nicht-authentifizierte Benutzer relevant)
        setLocalCart(typedServerCart);
        
        // Keine Speicherung im localStorage mehr gemäß Sicherheitsanforderungen
      } 
      // Wenn Server-Warenkorb LEER ist, aber lokaler Warenkorb gefüllt ist
      else if (localCart.items.length > 0 && !isLoading) {
        console.log("Lokalen Warenkorb zum Server synchronisieren:", localCart);
        
        // Zum Server senden - Hier ist die wichtige Änderung: Lokalen Warenkorb nicht überschreiben
        // Als stiller Update, damit keine Toast-Benachrichtigung erscheint
        saveCartMutation.mutate({
          items: localCart.items,
          store: localCart.store || "",
          silent: true
        });
      }
      // Wenn beide Warenkörbe leer sind, nichts tun
    } catch (error) {
      console.error("Fehler bei der Warenkorb-Synchronisierung:", error);
    }
  }, [serverCart, isAuthenticated, isLoading]);
  
  // Behandle Ausloggen: Bei Logout wird der Warenkorb geleert
  useEffect(() => {
    // Wenn der Benutzer nicht mehr authentifiziert ist (ausgeloggt wurde)
    if (!isAuthenticated && serverCart) {
      console.log("Benutzer ausgeloggt, setze lokalen Warenkorb zurück");
      
      // Setze den lokalen Warenkorb auf leer, um Datenschutz zu gewährleisten
      setLocalCart(emptyCart);
    }
  }, [isAuthenticated, serverCart]);

  // Clear cart mutation
  const clearCartMutation = useMutation<{ silent: boolean }, Error, boolean>({
    mutationFn: async (silent: boolean = false) => {
      await apiRequest('/api/cart', {
        method: 'DELETE',
      });
      return { silent };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart/active'] });
      
      // Prüfe, ob wir im stillen Modus sind
      const silent = result?.silent || false;
      
      // Toast nur anzeigen, wenn wir nicht im stillen Modus sind
      if (!silent) {
        toast({
          title: 'Warenkorb geleert',
          description: 'Ihr Warenkorb wurde erfolgreich geleert.',
          variant: 'success',
        });
      }
    },
  });

  // Save cart mutation
  const saveCartMutation = useMutation({
    mutationFn: async ({ 
      items, 
      store, 
      silent = false 
    }: { 
      items: CartItem[]; 
      store: string | undefined;
      silent?: boolean;
    }) => {
      // Validiere, dass jedes Produkt ein Geschäft hat
      const invalidItems = items.filter(item => !item.store || item.store.trim() === "");
      if (invalidItems.length > 0) {
        console.error("Artikel ohne Geschäft gefunden:", invalidItems);
        throw new Error(`Artikel "${invalidItems[0].productName}" hat kein Geschäft ausgewählt`);
      }
      
      // Stelle sicher, dass store ein String ist
      const storeValue = store || "";
      
      // WICHTIG: RESPEKTIERE IMMER DIE INDIVIDUELLEN GESCHÄFTSWERTE JEDES ARTIKELS!
      // Jedes Artikel-Geschäft soll immer bewahrt werden und niemals verändert werden
      // Das Hauptgeschäft wird nur gespeichert, damit neue Artikel im Interface schneller hinzugefügt werden können
      const itemsWithStore = items.map(item => ({
        ...item,
        // Artikel-Geschäft muss immer vorhanden sein (Validierung oben sichert das ab)
        store: item.store,
        quantity: item.quantity.toString() // Stellen Sie sicher, dass quantity ein String ist
      }));

      console.log("Cart saving with original item stores:", 
        itemsWithStore.map(i => ({ name: i.productName, store: i.store })));

      await apiRequest('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ 
          items: itemsWithStore,
          store: storeValue // Speichere das Hauptgeschäft getrennt für neue Artikel
        }),
      });
      
      // Rückgabe des silent-Parameters für den onSuccess-Handler
      return { silent };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart/active'] });
      
      // Hole den silent-Parameter aus dem Ergebnis
      const silent = result?.silent || false;
      
      // Wenn wir im stillen Modus sind, keine Toast-Benachrichtigung anzeigen
      if (silent) {
        console.log("Stiller Warenkorb-Update: Keine Toast-Benachrichtigung");
        return;
      }
      
      // Keine Toast-Nachricht anzeigen, da wir bereits in ProductEntryForm spezifische 
      // Toast-Meldungen für das Hinzufügen, Aktualisieren und Entfernen von Produkten haben
      // Dies verhindert doppelte und widersprüchliche Meldungen
    },
    onError: (error: Error, variables) => {
      console.error("Fehler beim Speichern des Warenkorbs:", error);
      
      // Prüfe, ob dies ein stilles Update war
      const silent = variables?.silent || false;
      
      // Zeige Toast nur an, wenn nicht im stillen Modus
      if (!silent) {
        toast({
          title: 'Fehler beim Speichern des Warenkorbs',
          description: error.message || 'Bitte stellen Sie sicher, dass für jedes Produkt ein Geschäft ausgewählt ist.',
          variant: 'destructive',
        });
      }
    },
  });

  // Keine Verwendung von localStorage mehr gemäß Sicherheitsanforderungen

  // Der effektive Warenkorb, der im Context bereitgestellt wird
  // Bevorzuge den Server-Warenkorb bei angemeldeten Benutzern, ansonsten den lokalen Warenkorb
  // Stellen Sie sicher, dass serverCart immer ein Cart mit items ist (wurde in select behandelt)
  const effectiveCart: Cart = isAuthenticated && serverCart ? serverCart as Cart : localCart;

  // Explizite Umwandlung des Werts zur Behebung des Typfehlers
  const value: CartContextType = {
    // Der Warenkorb ist nun garantiert niemals undefined
    cart: effectiveCart,
    isLoading,
    clearCart: (silent: boolean = false) => {
      // Leerer Warenkorb erstellen
      const emptyCartValue: Cart = { items: [] };
      
      // Lokalen Zustand sofort aktualisieren für schnelle UI-Reaktion
      setLocalCart(emptyCartValue);
      
      // Cache direkt aktualisieren für sofortige UI-Aktualisierung
      queryClient.setQueryData(['/api/cart/active'], emptyCartValue);
      
      // Nur zum Server senden, wenn der Benutzer angemeldet ist
      if (isAuthenticated) {
        clearCartMutation.mutate(silent);
      }
    },
    saveCart: (items: CartItem[], store: string | undefined, silent: boolean = false) => {
      console.log("saveCart aufgerufen mit:", items.length, "Elementen", silent ? "(im stillen Modus)" : "");
      
      try {
        // Stelle sicher, dass das items Array gültig ist
        if (!Array.isArray(items)) {
          console.error("saveCart wurde mit ungültigen Items aufgerufen:", items);
          items = [];
        }
        
        // Stelle sicher, dass jedes Element ein Geschäft hat
        const validatedItems = items.map(item => ({
          ...item,
          // Verwende das Geschäft des Items, wenn vorhanden, sonst das übergebene Geschäft
          store: (item.store && item.store.trim() !== "") ? item.store : (store || "")
        }));
        
        // Neuen Warenkorb erstellen
        const newCartValue: Cart = { 
          items: validatedItems, 
          store 
        };
        
        // Lokalen Zustand sofort aktualisieren für schnelle UI-Reaktion
        setLocalCart(newCartValue);
        
        // Keine sessionStorage-Verwendung mehr gemäß Datenschutzrichtlinien
        
        // Cache direkt aktualisieren für sofortige UI-Aktualisierung
        queryClient.setQueryData(['/api/cart/active'], newCartValue);
        
        // Nur zum Server senden, wenn der Benutzer angemeldet ist
        if (isAuthenticated) {
          // Spezielle Behandlung für stille Updates
          if (silent) {
            // Stilles Update direkt zum Server senden ohne Toast-Benachrichtigung
            apiRequest('/api/cart', {
              method: 'POST',
              body: JSON.stringify({ 
                items: validatedItems, 
                store: store || "" 
              }),
            }).then(() => {
              // Invalidiere die Abfrage, aber ohne Toast
              queryClient.invalidateQueries({ queryKey: ['/api/cart/active'] });
            }).catch((error) => {
              // Fehler nur in Konsole loggen, keine UI-Benachrichtigung
              console.error("Fehler beim stillen Speichern des Warenkorbs:", error);
            });
          } else {
            // Normales Update mit Toast-Benachrichtigung
            saveCartMutation.mutate({ 
              items: validatedItems, 
              store: store || "",
              silent: silent
            });
          }
        }
      } catch (error) {
        console.error("Fehler beim Speichern des Warenkorbs:", error);
        // Zeige Toast nur an, wenn nicht im stillen Modus
        if (!silent) {
          toast({
            title: 'Fehler beim Speichern des Warenkorbs',
            description: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
            variant: 'destructive',
          });
        }
      }
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Exportiere den Hook als benannte Funktion (für HMR-Kompatibilität als separate benannte Funktion)
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
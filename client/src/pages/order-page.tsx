import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { timeSlotSchema } from '@shared/schema';
import type { Address, InsertOrderItem, TimeSlot, OrderDraft } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useCart } from '@/lib/CartProvider';
import { useAuth } from '@/hooks/use-auth';
import MainLayout from '@/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { SteppedOrderForm } from '@/components/SteppedOrderForm';
import AddressForm from '@/components/AddressForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Erweiterte Typdefinition für OrderDraft mit orderItems
// Klare Definition von OrderDraft und ExtendedOrderDraft für bessere Typprüfung
interface OrderDraftItem {
  productName: string;
  quantity: string;
  notes?: string;
  store?: string;
  imageUrl?: string;
  filePath?: string;
}

// Definieren Sie das vollständige ExtendedOrderDraft mit allen möglichen Eigenschaften
interface ExtendedOrderDraft {
  id?: number;
  userId?: number;
  addressId?: number;
  desiredDeliveryDate?: string | Date;
  desiredTimeSlot?: TimeSlot;
  additionalInstructions?: string;
  store?: string;
  orderItems?: OrderDraftItem[];
}

// Schritte für den Bestellprozess
enum OrderStep {
  Products = 0,   // Produkte hinzufügen
  Delivery = 1,   // Lieferdetails festlegen
  Review = 2      // Bestellung prüfen und absenden
}

const orderFormSchema = z.object({
  addressId: z.number({
    required_error: "Bitte wählen Sie eine Lieferadresse",
  }),
  desiredDeliveryDate: z.date({
    required_error: "Bitte wählen Sie ein Lieferdatum",
  }),
  desiredTimeSlot: timeSlotSchema,
  additionalInstructions: z.string().optional(),
  // Geschäft-Feld wurde in das Produktformular verschoben
  orderItems: z.array(z.any()).optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function OrderPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [orderItems, setOrderItems] = useState<InsertOrderItem[]>([]);
  const [storeValue, setStoreValue] = useState<string>('');
  const { cart, isLoading: cartLoading, clearCart, saveCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [hasSetStoreFromCart, setHasSetStoreFromCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialState, setLoadingInitialState] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // State für den Bestellerfolgsdialog
  const [orderSuccessData, setOrderSuccessData] = useState<{
    isOpen: boolean;
    orderNumber: string;
  }>({
    isOpen: false,
    orderNumber: ""
  });

  // Get user addresses
  const { data: addresses = [], isLoading: isLoadingAddresses } = useQuery<Address[]>({
    queryKey: ['/api/addresses'],
  });
  
  // Lade den gespeicherten Formularentwurf mit erweitertem Typ und verbesserten Optionen
  const { 
    data: orderDraft, 
    isLoading: isLoadingDraft,
    refetch: refetchOrderDraft 
  } = useQuery<ExtendedOrderDraft>({
    queryKey: ['/api/order-draft'],
    enabled: isAuthenticated,
    // Immer neu laden, wenn die Komponente angezeigt wird
    staleTime: 0,
    // Parameter in React Query v5 für Cache-Zeit geändert
    gcTime: 0,
    // Immer frisch vom Server holen
    refetchOnMount: 'always', 
    refetchOnWindowFocus: true,
  });

  // Mutation to delete order draft
  const deleteOrderDraftMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) return;
      
      await apiRequest('/api/order-draft', {
        method: 'DELETE'
      });
      
      return true;
    }
  });

  // Form
  const form = useForm<OrderFormValues>({
    defaultValues: {
      additionalInstructions: '',
      // Store wurde entfernt, da es jetzt Teil des Produktformulars ist
    }
  });
  
  const { handleSubmit, getValues, control } = form;

  // Überprüft, ob der Warenkorb leer ist
  // Wichtig: Dank der Verbesserungen in CartProvider ist cart nie undefined
  const hasCartItems = cart.items.length > 0;
  const cartIsEmpty = !hasCartItems; // Zeigt "Warenkorb ist leer" an, wenn keine Artikel im Warenkorb sind

  // Extract functions - verbesserte Version mit Cache-Invalidierung
  const saveFormState = async (values: Partial<OrderFormValues>) => {
    if (!isAuthenticated) return;
    
    try {
      // Speichere Daten auf dem Server
      const response = await apiRequest('/api/order-draft', {
        method: 'POST',
        body: JSON.stringify(values)
      });
      
      // Nach dem Speichern der Daten auf dem Server den Cache aktualisieren,
      // damit die Daten beim nächsten Zugriff sofort verfügbar sind
      queryClient.invalidateQueries({ queryKey: ['/api/order-draft'] });
      
      // Optional: Manuelles Refetch
      await refetchOrderDraft();
      
      console.log("Formularstatus erfolgreich gespeichert und Cache aktualisiert");
      return response;
    } catch (error) {
      console.error("Error saving form state:", error);
      toast({
        title: "Fehler",
        description: "Formularstatus konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  // Effekt, um den gespeicherten Formularentwurf zu laden - verbesserte Version
  useEffect(() => {
    if (isLoadingDraft) {
      console.log("Formularentwurf wird geladen...");
      return;
    }

    if (orderDraft && Object.keys(orderDraft).length > 0) {
      console.log("Formularentwurf geladen:", orderDraft);
      
      // Sofort alle Formularfelder aktualisieren, damit der Benutzer keine Seite aktualisieren muss
      try {
        // Setze Adresse
        if (orderDraft.addressId) {
          console.log("Setze Adresse:", orderDraft.addressId);
          form.setValue('addressId', orderDraft.addressId, { shouldValidate: true });
        }
        
        // Setze Lieferdatum - Datum korrekt konvertieren
        if (orderDraft.desiredDeliveryDate) {
          // Stelle sicher, dass das Datum korrekt formatiert ist
          const deliveryDate = new Date(orderDraft.desiredDeliveryDate);
          console.log("Setze Lieferdatum:", deliveryDate);
          if (!isNaN(deliveryDate.getTime())) {
            form.setValue('desiredDeliveryDate', deliveryDate, { shouldValidate: true });
          } else {
            console.error("Ungültiges Datumsformat:", orderDraft.desiredDeliveryDate);
          }
        }
        
        // Setze Zeitfenster
        if (orderDraft.desiredTimeSlot && 
            ['morning', 'afternoon', 'evening'].includes(orderDraft.desiredTimeSlot)) {
          console.log("Setze Zeitfenster:", orderDraft.desiredTimeSlot);
          form.setValue('desiredTimeSlot', orderDraft.desiredTimeSlot as TimeSlot, { shouldValidate: true });
        }
        
        // Setze zusätzliche Anweisungen
        if (orderDraft.additionalInstructions) {
          console.log("Setze Anweisungen:", orderDraft.additionalInstructions);
          form.setValue('additionalInstructions', orderDraft.additionalInstructions, { shouldValidate: true });
        }
        
        // Setze Geschäftswert für Produktformular
        if (orderDraft.store) {
          console.log("Setze Geschäft:", orderDraft.store);
          setStoreValue(orderDraft.store);
          // Kein form.setValue mehr nötig, da es nur noch storeValue verwendet wird
          setHasSetStoreFromCart(true);
        }

        // Wenn orderItems im Entwurf vorhanden sind, setze sie auch
        if (orderDraft.orderItems && 
            Array.isArray(orderDraft.orderItems) && 
            orderDraft.orderItems.length > 0) {
          
          console.log("Setze gespeicherte Produkte:", orderDraft.orderItems);
          
          // Konvertiere die orderItems in das richtige Format, falls nötig
          const formattedItems = orderDraft.orderItems.map(item => ({
            productName: item.productName || '',
            quantity: String(item.quantity || ''),
            notes: item.notes || '',
            store: item.store || orderDraft.store || '',
            // Stellen Sie sicher, dass Bildpfade übernommen werden
            imageUrl: item.imageUrl || item.filePath || '',
            filePath: item.filePath || item.imageUrl || ''
          }));
          
          setOrderItems(formattedItems);
          form.setValue('orderItems', formattedItems, { shouldValidate: true });
          
          // Auch zum Warenkorb hinzufügen, damit Konsistenz gewährleistet ist
          if (saveCart && orderDraft.store) {
            saveCart(formattedItems, orderDraft.store);
          }
        }
      } catch (error) {
        console.error("Fehler beim Setzen der Formularwerte:", error);
      }
    } else {
      console.log("Kein Formularentwurf vorhanden oder leerer Entwurf");
    }
    
  }, [orderDraft, isLoadingDraft, form, saveCart]);

  // Effekt, um das Geschäft aus dem Warenkorb zu ermitteln
  useEffect(() => {
    if (hasSetStoreFromCart || storeValue || cart.items.length === 0) {
      return;
    }

    const allStores = cart.items.map(item => item.store).filter(Boolean);
    
    if (allStores.length > 0) {
      const allSameStore = allStores.every(store => store === allStores[0]);
      
      if (allSameStore) {
        setStoreValue(allStores[0]);
        setHasSetStoreFromCart(true);
        // Kein form.setValue mehr, da store nicht mehr im Formular ist
      }
    } else if (cart.store) {
      setStoreValue(cart.store);
      setHasSetStoreFromCart(true);
    }
  }, [cart, hasSetStoreFromCart, storeValue]);

  // Load cart items - verbesserte Version
  useEffect(() => {
    // Verarbeite alle Zustandsänderungen des Warenkorbs sofort
    if (!cartLoading) {
      console.log("Warenkorb geladen:", cart);
      
      // Sicherstellen, dass cart.items ein gültiges Array ist
      if (cart && cart.items && Array.isArray(cart.items) && cart.items.length > 0) {
        const mappedItems: InsertOrderItem[] = cart.items.map(item => ({
          productName: item.productName,
          quantity: String(item.quantity),
          notes: item.notes || '',
          store: item.store || cart.store || '',
          // Stellen Sie sicher, dass Bildpfade übernommen werden
          imageUrl: item.imageUrl || item.filePath || '',
          filePath: item.filePath || item.imageUrl || ''
        }));
        
        console.log("Warenkorb-Elemente für Bestellseite geladen:", mappedItems);
        setOrderItems(mappedItems);
        form.setValue('orderItems', mappedItems);
      } else {
        console.log("Warenkorb ist leer, setze Elemente zurück");
        setOrderItems([]);
        form.setValue('orderItems', []);
      }
    }
    
    // Nach dem Laden der Daten den Ladezustand beenden
    if (!cartLoading) {
      setLoadingInitialState(false);
    }
  }, [cart, cartLoading, form]);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormValues) => {
      setIsSubmitting(true);
      
      try {
        // Prüfe, ob Produkte im Warenkorb vorhanden sind
        if (cart.items.length === 0 || !orderItems.length) {
          throw new Error("Bitte fügen Sie mindestens ein Produkt zum Warenkorb hinzu");
        }
        
        // Prüfe, ob alle Produkte ein Geschäft haben (jedes Produkt muss ein eigenes Geschäft haben)
        const itemsWithoutStore = orderItems.filter(item => !item.store || item.store.trim() === '');
        
        if (itemsWithoutStore.length > 0) {
          throw new Error(`Bitte wählen Sie für alle Produkte ein Geschäft aus. Produkt "${itemsWithoutStore[0].productName}" hat kein Geschäft.`);
        }

        // Gemeinsames Geschäft aus den Produkten ableiten
        const allStores = orderItems.map(item => item.store).filter(Boolean);
        const commonStore = allStores.length > 0 ? 
          (allStores.every(store => store === allStores[0]) ? allStores[0] : storeValue || '') : 
          storeValue || '';
        
        const orderData = {
          addressId: data.addressId,
          desiredDeliveryDate: data.desiredDeliveryDate,
          desiredTimeSlot: data.desiredTimeSlot,
          additionalInstructions: data.additionalInstructions,
          store: commonStore, // Gemeinsames Geschäft aus den Produkten oder storeValue
          orderItems: orderItems.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            notes: item.notes || '',
            // Jedes Produkt muss bereits sein eigenes Geschäft haben (keine Fallback-Logik mehr)
            store: item.store,
            // Bildpfade beibehalten - Wir verwenden TypeScript-Casting für Kompatibilität
            imageUrl: (item as any).imageUrl || (item as any).filePath || '',
            // Speichern der Bild-URL auch im filePath-Feld für bessere Kompatibilität
            filePath: (item as any).filePath || (item as any).imageUrl || ''
          }))
        };

        const response = await apiRequest('/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const responseData = await response.json();
        return responseData;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      // Scroll zum Seitenanfang mit Berücksichtigung der Navbar-Höhe
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      
      // Warenkorb im stillen Modus leeren
      clearCart(true);
      setHasSetStoreFromCart(false);
      
      if (isAuthenticated) {
        deleteOrderDraftMutation.mutate();
      }
      
      // Dialog mit allen Informationen anzeigen
      setOrderSuccessData({
        isOpen: true,
        orderNumber: data.orderNumber
      });
      
      // Wir setzen keinen Timeout für die Navigation, da der Benutzer selbst 
      // auf "OK" klicken muss, um fortzufahren
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
        variant: 'destructive',
      });
    }
  });

  // Clear cart handler
  const handleClearCart = () => {
    // Warenkorb leeren mit Toast-Benachrichtigung (silent = false), da dies
    // eine explizite Benutzeraktion ist
    clearCart(false);
    setOrderItems([]);
    // Kein form.setValue('store', '') mehr nötig
    setStoreValue('');
    setHasSetStoreFromCart(false);
    
    if (isAuthenticated) {
      deleteOrderDraftMutation.mutate();
    }
  };
  
  // Handler für das Schließen des Erfolgsdialogs
  const handleCloseSuccessDialog = () => {
    setOrderSuccessData({
      isOpen: false,
      orderNumber: ""
    });
    
    // Nach dem Schließen des Dialogs zur Bestellübersicht navigieren
    navigate('/orders');
  };
  
  // Submit handler
  const onSubmit = (values: OrderFormValues) => {
    createOrderMutation.mutate(values);
  };

  // If no addresses, show message to add an address
  if (addresses.length === 0 && !isLoadingAddresses) {
    return (
      <MainLayout>
        <div className="py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 font-sans">Neue Bestellung</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Neue Lieferadresse hinzufügen</h2>
              <p className="mb-4">Bitte fügen Sie eine Lieferadresse hinzu, bevor Sie eine Bestellung aufgeben.</p>
              <div className="mt-6">
                <AddressForm onSuccess={() => {
                  toast({
                    title: "Adresse hinzugefügt",
                    description: "Ihre Lieferadresse wurde erfolgreich gespeichert. Sie können jetzt mit Ihrer Bestellung fortfahren.",
                    variant: "success"
                  });
                  queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
                }} />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">Neue Bestellung</h1>
          </div>
          
          {/* SteppedOrderForm übernimmt den gesamten Bestellprozess */}
          <SteppedOrderForm
            addresses={addresses}
            orderDraft={orderDraft}
            refetchOrderDraft={refetchOrderDraft}
            saveOrderDraft={saveFormState}
            deleteOrderDraft={() => deleteOrderDraftMutation.mutate()}
            onSubmitOrder={onSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </section>
      
      {/* Erfolgs-Dialog nach Bestellabschluss */}
      <Dialog open={orderSuccessData.isOpen} onOpenChange={() => handleCloseSuccessDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              Bestellung erfolgreich aufgegeben
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 px-2">
            <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-6">
              <p className="text-center mb-2">
                Ihre Bestellung mit der Nummer <span className="font-bold">{orderSuccessData.orderNumber}</span> wurde erfolgreich aufgegeben.
              </p>
            </div>
            
            <h3 className="font-semibold text-lg mb-2">So geht es weiter:</h3>
            <ul className="space-y-3 pl-5 list-disc text-sm">
              <li>
                Der Lieferant wird Ihre Bestellung prüfen und das Lieferdatum bestätigen. 
                Sie erhalten eine Benachrichtigung, sobald dies geschehen ist.
              </li>
              <li>
                Falls Ihr gewünschter Liefertermin nicht möglich ist, wird Ihnen ein alternativer 
                Zeitpunkt vorgeschlagen. Sie können diesen dann akzeptieren oder einen eigenen 
                Gegenvorschlag für den Liefertermin machen.
              </li>
              <li>
                Sie können jederzeit den Status Ihrer Bestellung in der Bestellübersicht einsehen.
              </li>
            </ul>
          </div>
          
          <DialogFooter className="flex-col sm:flex-col sm:space-y-2">
            <Button onClick={handleCloseSuccessDialog} className="w-full">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
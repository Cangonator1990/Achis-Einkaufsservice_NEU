import React, { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import SimpleProductEntryForm from "@/components/SimpleProductEntryForm";
import { Trash2, ShoppingCart, CalendarIcon, Loader2, PenLine, Edit, Plus, AlertCircle } from "lucide-react";
import AddressForm from "@/components/AddressForm";
import { timeSlotSchema } from "@shared/schema";
import type { Address, InsertOrderItem, TimeSlot } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/CartProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";

// Hilfsfunktion zum Extrahieren von Bildern aus einer imageUrl
interface ImageData {
  url: string;
  isMain?: boolean;
  order?: number;
}

function extractImages(imageUrl: string | null): ImageData[] {
  if (!imageUrl) {
    return [];
  }

  // Wenn es ein MULTI-Format ist, dekodiere es
  if (imageUrl.startsWith('MULTI:')) {
    try {
      const base64Part = imageUrl.replace("MULTI:", "");
      const decodedData = decodeURIComponent(atob(base64Part));
      return JSON.parse(decodedData);
    } catch (error) {
      console.error("Fehler beim Dekodieren von MULTI-Format:", error);
      return [];
    }
  } 
  
  // Andernfalls behandle es als einzelnes Bild
  return [{ url: imageUrl, isMain: true, order: 0 }];
}

// Schritte für den Bestellprozess
enum OrderStep {
  Products = 0,   // Zuerst Produkte hinzufügen
  Delivery = 1,   // Dann Lieferdetails festlegen
  Review = 2      // Bestellung prüfen und absenden
}

const orderFormSchema = z.object({
  store: z.string({
    required_error: "Bitte wählen Sie ein Geschäft",
  }),
  addressId: z.number({
    required_error: "Bitte wählen Sie eine Lieferadresse",
  }),
  desiredDeliveryDate: z.date({
    required_error: "Bitte wählen Sie ein Lieferdatum",
  }),
  desiredTimeSlot: timeSlotSchema,
  additionalInstructions: z.string().optional(),
  orderItems: z.array(z.any()).optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderDraftItem {
  productName: string;
  quantity: string;
  notes?: string;
  store?: string;
  imageUrl?: string;
  filePath?: string;
}

interface SteppedOrderFormProps {
  addresses: Address[];
  orderDraft?: any;
  refetchOrderDraft?: () => Promise<any>;
  saveOrderDraft?: (data: any) => Promise<any>;
  deleteOrderDraft?: () => void;
  onSubmitOrder: (data: any) => void;
  isSubmitting: boolean;
}

export function SteppedOrderForm({
  addresses,
  orderDraft,
  refetchOrderDraft,
  saveOrderDraft,
  deleteOrderDraft,
  onSubmitOrder,
  isSubmitting
}: SteppedOrderFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { cart, isLoading: cartLoading, clearCart, saveCart } = useCart();
  const [currentStep, setCurrentStep] = useState<OrderStep>(OrderStep.Products);
  const [storeValue, setStoreValue] = useState<string>("");
  const [orderItems, setOrderItems] = useState<InsertOrderItem[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{index: number; item: any | null}>({index: -1, item: null});
  const [productDialogOpen, setProductDialogOpen] = useState(false); // Für Hinzufügen
  const [editDialogOpen, setEditDialogOpen] = useState(false); // Explizit für Bearbeiten
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [imageZoomDialogOpen, setImageZoomDialogOpen] = useState(false);
  const [editCameraDialogOpen, setEditCameraDialogOpen] = useState(false); // Für Kamera im Bearbeitungsdialog
  const [confirmOrderDialogOpen, setConfirmOrderDialogOpen] = useState(false); // Für Bestellbestätigung
  const [confirmOrderData, setConfirmOrderData] = useState<OrderFormValues | null>(null); // Zu bestätigende Bestelldaten
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const saveOrderDraftTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState<boolean>(false);
  const [hideInstructions, setHideInstructions] = useState<boolean>(false);
  const [showOrderInstructions, setShowOrderInstructions] = useState<boolean | null>(null);

  // Setup form with validation
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      store: "",
      addressId: addresses.length > 0 ? addresses[0].id : undefined,
      desiredDeliveryDate: new Date(),
      desiredTimeSlot: "morning",
      additionalInstructions: "",
      orderItems: []
    },
  });

  const { handleSubmit, control, getValues, setValue, watch } = form;

  // Effekt, um den gespeicherten Formularentwurf zu laden
  useEffect(() => {
    if (orderDraft) {
      try {
        // Setze Geschäft
        if (orderDraft.store) {
          setStoreValue(orderDraft.store);
          setValue("store", orderDraft.store);
        }
        
        // Setze Adresse
        if (orderDraft.addressId) {
          setValue("addressId", orderDraft.addressId);
        }
        
        // Setze Lieferdatum - Datum korrekt konvertieren
        if (orderDraft.desiredDeliveryDate) {
          const deliveryDate = new Date(orderDraft.desiredDeliveryDate);
          if (!isNaN(deliveryDate.getTime())) {
            setValue("desiredDeliveryDate", deliveryDate);
          }
        }
        
        // Setze Zeitfenster
        if (orderDraft.desiredTimeSlot && 
            ['morning', 'afternoon', 'evening'].includes(orderDraft.desiredTimeSlot)) {
          setValue("desiredTimeSlot", orderDraft.desiredTimeSlot as TimeSlot);
        }
        
        // Setze zusätzliche Anweisungen
        if (orderDraft.additionalInstructions) {
          setValue("additionalInstructions", orderDraft.additionalInstructions);
        }

        // Wenn orderItems im Entwurf vorhanden sind, setze sie auch
        if (orderDraft.orderItems && 
            Array.isArray(orderDraft.orderItems) && 
            orderDraft.orderItems.length > 0) {
          
          // Konvertiere die orderItems in das richtige Format, falls nötig
          const formattedItems = orderDraft.orderItems.map((item: OrderDraftItem) => ({
            productName: item.productName || '',
            quantity: String(item.quantity || ''),
            notes: item.notes || '',
            store: item.store || orderDraft.store || '',
            // Stellen Sie sicher, dass Bildpfade übernommen werden
            imageUrl: item.imageUrl || item.filePath || '',
            filePath: item.filePath || item.imageUrl || ''
          }));
          
          setOrderItems(formattedItems);
          setValue("orderItems", formattedItems);
        }
      } catch (error) {
        console.error("Fehler beim Setzen der Formularwerte:", error);
      }
    }
  }, [orderDraft, setValue]);

  // Load cart items
  useEffect(() => {
    if (!cartLoading && cart && cart.items && cart.items.length > 0) {
      const mappedItems: InsertOrderItem[] = cart.items.map(item => ({
        productName: item.productName,
        quantity: String(item.quantity),
        notes: item.notes || '',
        store: item.store || cart.store || '',
        imageUrl: item.imageUrl || item.filePath || '',
        filePath: item.filePath || item.imageUrl || ''
      }));
      
      setOrderItems(mappedItems);
      setValue("orderItems", mappedItems);
      
      // Set store value from cart if not already set
      if ((!storeValue || storeValue === "") && cart.store) {
        setStoreValue(cart.store);
        setValue("store", cart.store);
      }
    }
  }, [cart, cartLoading, setValue, storeValue]);

  // Save changes when form values change
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (saveOrderDraft) {
        // Löschen Sie das vorherige Timeout, wenn ein neues erstellt wird
        if (saveOrderDraftTimeout.current) {
          clearTimeout(saveOrderDraftTimeout.current);
        }
        
        // Neues Timeout erstellen (Debounce-Effekt)
        saveOrderDraftTimeout.current = setTimeout(() => {
          saveOrderDraft(value);
        }, 500); // 500ms Verzögerung
      }
    });
    
    return () => {
      // Bereinigen des Timeouts bei Komponentenabbau
      if (saveOrderDraftTimeout.current) {
        clearTimeout(saveOrderDraftTimeout.current);
      }
      subscription.unsubscribe();
    };
  }, [form, saveOrderDraft]);
  
  // Event-Listener für die Weiterleitung zur Lieferdetailansicht
  useEffect(() => {
    // Event-Listener für die direkte Navigation zu den Lieferdetails
    const handleGoToDeliveryEvent = () => {
      console.log("Ereignis 'goToNextStep' empfangen, navigiere zu Lieferdetails");
      if (currentStep === OrderStep.Products) {
        // Vom Produkt-Schritt direkt zu Lieferdetails
        setCurrentStep(OrderStep.Delivery);
      }
    };
    
    // Event-Listener registrieren
    window.addEventListener('goToNextStep', handleGoToDeliveryEvent);
    
    // Aufräumen
    return () => {
      window.removeEventListener('goToNextStep', handleGoToDeliveryEvent);
    };
  }, [currentStep]);
  
  // Abrufen der Benutzereinstellungen zu Anleitungen
  useEffect(() => {
    // Prüfen, ob der Benutzer eingeloggt ist
    if (user && user.id) {
      // User-Einstellungen abrufen
      const fetchUserPreferences = async () => {
        try {
          const response = await fetch('/api/user');
          if (response.ok) {
            const userData = await response.json();
            // showOrderInstructions enthält die Benutzereinstellung
            setShowOrderInstructions(userData.showOrderInstructions !== false);
          } else {
            // Bei Fehlern standardmäßig Anleitungen anzeigen
            setShowOrderInstructions(true);
          }
        } catch (error) {
          console.error("Fehler beim Abrufen der Benutzereinstellungen:", error);
          // Bei Fehlern standardmäßig Anleitungen anzeigen
          setShowOrderInstructions(true);
        }
      };
      
      fetchUserPreferences();
    } else {
      // Für nicht eingeloggte Benutzer immer Anleitungen anzeigen
      setShowOrderInstructions(true);
    }
  }, [user]);
  
  // Anleitung anzeigen beim Betreten des ersten Schritts, wenn die Einstellung es erlaubt
  // und nur einmal pro Bestellsitzung
  const instructionsShownRef = useRef(false);
  
  useEffect(() => {
    // Nur beim ersten Mal anzeigen und nur wenn Einstellung es erlaubt
    if (currentStep === OrderStep.Products && showOrderInstructions === true && !instructionsShownRef.current) {
      setInstructionsDialogOpen(true);
      instructionsShownRef.current = true; // Markiere als gezeigt für diese Sitzung
    }
  }, [currentStep, showOrderInstructions]);
  
  // Funktion zum Speichern der Benutzereinstellung für Anleitungen
  const saveInstructionsPreference = async () => {
    if (user && user.id) {
      try {
        const response = await fetch('/api/preferences/orderInstructions', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ show: !hideInstructions }),
        });
        
        if (response.ok) {
          // Daten aus der Antwort extrahieren
          const result = await response.json();
          const showOrderInstructionsValue = result.showOrderInstructions;
          
          // Lokalen Zustand aktualisieren
          setShowOrderInstructions(showOrderInstructionsValue);
          
          // Aktualisieren der Benutzerdaten im globalen Zustand
          queryClient.setQueryData(['/api/user'], {
            ...user,
            showOrderInstructions: showOrderInstructionsValue
          });
          
          // Sicherstellen, dass alle abhängigen Abfragen aktualisiert werden
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        } else {
          console.error("Fehler beim Speichern der Anleitung-Einstellung:", await response.text());
        }
      } catch (error) {
        console.error("Fehler beim Speichern der Anleitung-Einstellung:", error);
      }
    }
    
    setInstructionsDialogOpen(false);
  };

  // Handle form submission - nur bei explizitem Bestellabschluss
  const onSubmit = (data: OrderFormValues) => {
    // Nur bei automatischen Submits blockieren, nicht bei manuellen Aktionen
    if (addressJustCreated && currentStep !== OrderStep.Review) {
      console.log("Formular-Submit blockiert - Adresse wurde gerade erstellt und nicht im Review-Schritt");
      return;
    }
    
    // Nur wenn wir im Review-Schritt sind, darf die Bestellung aufgegeben werden
    if (currentStep !== OrderStep.Review) {
      console.log("Formular-Submit blockiert - nicht im Review-Schritt");
      return;
    }
    
    // Ensure items are associated with stores
    const processedData = {
      ...data,
      store: storeValue,
      orderItems: orderItems.map(item => ({
        ...item,
        store: item.store || storeValue,
      }))
    };
    
    // Bestätigungsdialog öffnen
    setConfirmOrderData(processedData);
    setConfirmOrderDialogOpen(true);
  };
  
  // Bestätigung der Bestellung
  const handleConfirmOrder = () => {
    if (confirmOrderData) {
      onSubmitOrder(confirmOrderData);
      setConfirmOrderDialogOpen(false);
    }
  };

  // Clear cart handler
  const handleClearCart = () => {
    clearCart();
    setOrderItems([]);
    setStoreValue("");
    setValue("store", "");
    
    if (deleteOrderDraft) {
      deleteOrderDraft();
    }
  };

  // Step navigation
  const goToNextStep = async () => {
    // Bei manueller Navigation (Button-Klick) das Adress-Flag zurücksetzen
    if (addressJustCreated) {
      console.log("Manueller Weiter-Klick - setze Adress-Flag zurück");
      setAddressJustCreated(false);
    }
    
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < OrderStep.Review) {
      setCurrentStep(prevStep => prevStep + 1 as OrderStep);
      // Zum Seitenanfang scrollen
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prevStep => prevStep - 1 as OrderStep);
      // Zum Seitenanfang scrollen
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Validate current step
  const validateCurrentStep = async () => {
    try {
      switch (currentStep) {
        case OrderStep.Products:
          const currentOrderItems = getValues().orderItems || orderItems;
          console.log('Validiere Produkte:', { 
            orderItemsState: orderItems, 
            formOrderItems: getValues().orderItems, 
            currentOrderItems 
          });
          
          if (!currentOrderItems || currentOrderItems.length === 0) {
            toast({
              title: "Produkte fehlen",
              description: "Bitte fügen Sie mindestens ein Produkt hinzu.",
              variant: "destructive",
            });
            return false;
          }
          return true;
          
        case OrderStep.Delivery:
          const addressId = form.getValues("addressId");
          const deliveryDate = form.getValues("desiredDeliveryDate");
          const timeSlot = form.getValues("desiredTimeSlot");
          
          // Debug: Ausgabe der Werte
          console.log("Validierung Lieferung:", { 
            addressId, 
            deliveryDate, 
            timeSlot, 
            adressenVorhanden: addresses.length > 0
          });
          
          // Wenn keine Adressen vorhanden sind, eine Adresse automatisch auswählen
          if (!addressId && addresses.length > 0) {
            const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
            form.setValue("addressId", defaultAddress.id);
            console.log("Adresse automatisch gesetzt:", defaultAddress.id);
          }
          
          // Prüfung mit aktuellen Werten durchführen
          const currentAddressId = form.getValues("addressId");
          if (!currentAddressId || !deliveryDate || !timeSlot) {
            toast({
              title: "Lieferinformationen unvollständig",
              description: "Bitte füllen Sie alle erforderlichen Lieferinformationen aus.",
              variant: "destructive",
            });
            return false;
          }
          return true;
          
        default:
          return true;
      }
    } catch (error) {
      console.error("Fehler bei der Validierung:", error);
      return false;
    }
  };

  // Get minimum date (today)
  const today = new Date();

  // Überprüft, ob der Warenkorb leer ist
  const cartIsEmpty = !cart?.items?.length;
  
  // Funktionen zum Bearbeiten von Produkten
  const handleEditProduct = (index: number) => {
    setEditingItem({
      index,
      item: orderItems[index] ? { ...orderItems[index] } : null
    });
    setEditDialogOpen(true);
  };

  const handleUpdateProduct = () => {
    if (editingItem.index !== -1 && editingItem.item) {
      // Prüfen, ob sich die Filiale geändert hat
      const originalItem = orderItems[editingItem.index];
      const storeHasChanged = originalItem.store !== editingItem.item.store && 
                              editingItem.item.store && 
                              originalItem.store;
      
      const newItems = [...orderItems];
      newItems[editingItem.index] = editingItem.item;
      setOrderItems(newItems);
      setValue("orderItems", newItems);
      
      // Aktualisiere den globalen Store-Wert, wenn sich die Filiale geändert hat
      if (storeHasChanged && editingItem.item.store) {
        setStoreValue(editingItem.item.store);
      }
      
      // Speichere auch im Warenkorb, mit aktualisiertem Store-Wert, wenn geändert
      if (saveCart) {
        saveCart(newItems as any, storeHasChanged ? editingItem.item.store : storeValue, true);
      }
      
      setEditDialogOpen(false);
      
      toast({
        title: "Produkt aktualisiert",
        description: storeHasChanged 
          ? `Das Produkt wurde zur Filiale "${editingItem.item.store}" verschoben.`
          : "Das Produkt wurde erfolgreich aktualisiert.",
      });
    }
  };
  
  const handleRemoveProduct = (index: number) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
    setValue("orderItems", newItems);
    
    // Speichere auch im Warenkorb
    if (saveCart) {
      saveCart(newItems as any, storeValue, true);
    }
    
    toast({
      title: "Produkt entfernt",
      description: "Das Produkt wurde aus Ihrer Bestellung entfernt.",
    });
  };
  
  // Verarbeite hochgeladenes Bild für den Bearbeitungsdialog
  const handleEditImageUpload = async (file: File) => {
    try {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast({
          title: "Datei zu groß",
          description: "Die Datei darf nicht größer als 5MB sein.",
          variant: "destructive",
        });
        return;
      }
      
      // Dateityp überprüfen
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Ungültiges Dateiformat",
          description: "Bitte wählen Sie nur Bilddateien aus.",
          variant: "destructive",
        });
        return;
      }
      
      // Für bessere Benutzererfahrung: Ladevorgang anzeigen
      toast({
        title: "Bild wird hochgeladen",
        description: "Bitte warten Sie...",
      });
      
      const formData = new FormData();
      formData.append('image', file);
      
      // Bild hochladen
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Hochladen des Bildes');
      }
      
      const imageData = await response.json();
      
      // Erfolgreich hochgeladenes Bild zum editierten Produkt hinzufügen
      if (editingItem.item) {
        let newImageUrl = imageData.filePath;
        
        // Wenn bereits Bilder vorhanden sind (MULTI-Format), neues Bild hinzufügen
        if (editingItem.item.imageUrl && editingItem.item.imageUrl.startsWith('MULTI:')) {
          try {
            // Bestehende Bilder aus MULTI-Format extrahieren
            const existingImages = extractImages(editingItem.item.imageUrl);
            
            // Neues Bild mit höchster Sortierreihenfolge hinzufügen
            const nextOrder = Math.max(...existingImages.map(img => img.order || 0), 0) + 1;
            existingImages.push({
              url: imageData.filePath,
              isMain: existingImages.length === 0, // Erstes Bild ist Hauptbild
              order: nextOrder
            });
            
            // Zurück in MULTI-Format kodieren
            newImageUrl = "MULTI:" + encodeURIComponent(JSON.stringify(
              existingImages.map(img => ({
                url: img.url,
                isMain: img.isMain,
                order: img.order
              }))
            ));
          } catch (error) {
            console.error("Fehler bei der Verarbeitung des MULTI-Formats:", error);
            // Bei Fehler: Einfaches Format verwenden
            newImageUrl = imageData.filePath;
          }
        } 
        // Wenn es nur ein Bild gibt (kein MULTI-Format), in MULTI-Format konvertieren
        else if (editingItem.item.imageUrl) {
          const images = [
            { url: editingItem.item.imageUrl, isMain: true, order: 0 },
            { url: imageData.filePath, isMain: false, order: 1 }
          ];
          newImageUrl = "MULTI:" + encodeURIComponent(JSON.stringify(images));
        }
        
        // Editierungszustand aktualisieren
        setEditingItem({
          ...editingItem,
          item: { 
            ...editingItem.item, 
            imageUrl: newImageUrl,
            filePath: imageData.filePath // Primäres Bild als filePath setzen
          }
        });
        
        toast({
          title: "Bild hochgeladen",
          description: "Das Bild wurde erfolgreich hinzugefügt.",
        });
      }
    } catch (error) {
      console.error("Fehler beim Bildupload:", error);
      toast({
        title: "Upload fehlgeschlagen",
        description: "Beim Hochladen des Bildes ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  };
  
  // Öffne die Kamera
  const handleOpenCamera = async () => {
    try {
      // Prüfe, ob Browser Media API unterstützt
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Nicht unterstützt",
          description: "Ihr Browser unterstützt keine Kamerafunktion.",
          variant: "destructive",
        });
        return;
      }
      
      // Freigabe bestehender Streams (falls vorhanden)
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      // Anfrage für Kamerazugriff
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Rückkamera bevorzugen (für mobile Geräte)
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setCameraStream(stream);
      
      // Video-Element mit Stream verbinden
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setEditCameraDialogOpen(true);
    } catch (error) {
      console.error("Fehler beim Kamerazugriff:", error);
      toast({
        title: "Kamerazugriff fehlgeschlagen",
        description: "Bitte erlauben Sie den Zugriff auf Ihre Kamera oder verwenden Sie stattdessen den Datei-Upload.",
        variant: "destructive",
      });
    }
  };
  
  // Kamera-Foto aufnehmen
  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    
    try {
      // Canvas für Bilderfassung erstellen
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      // Bild aus Video-Stream extrahieren
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context nicht verfügbar');
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Bild in Datei konvertieren
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast({
            title: "Fehler",
            description: "Das Foto konnte nicht erstellt werden.",
            variant: "destructive",
          });
          return;
        }
        
        // Kamerafunktion schließen
        closeCamera();
        
        // Als Datei speichern
        const file = new File([blob], `kamera-foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Mit dem Bildupload-Handler verarbeiten
        await handleEditImageUpload(file);
      }, 'image/jpeg', 0.85); // JPEG-Qualität: 85%
      
    } catch (error) {
      console.error("Fehler bei der Fotoaufnahme:", error);
      toast({
        title: "Fehler bei der Aufnahme",
        description: "Das Foto konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  };
  
  // Kamera schließen
  const closeCamera = () => {
    // Stream beenden
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    // Dialog schließen
    setEditCameraDialogOpen(false);
  };
  
  // Flag to prevent auto-navigation after address creation
  const [addressJustCreated, setAddressJustCreated] = useState(false);

  // Funktion zum Hinzufügen einer neuen Adresse
  const handleNewAddressCreated = () => {
    // Flag setzen um automatische Navigation zu verhindern
    setAddressJustCreated(true);
    
    // Dialog schließen
    setAddressDialogOpen(false);
    
    // Die Adressdaten abrufen, falls eine Refetch-Funktion vorhanden ist
    if (refetchOrderDraft) {
      refetchOrderDraft().then(() => {
        // Aktuelle Adressen vom Server abfragen
        apiRequest("/api/addresses", { method: "GET" })
          .then(response => {
            if (response && Array.isArray(response) && response.length > 0) {
              // Neueste Adresse auswählen (wahrscheinlich die gerade erstellte)
              const newestAddress = response.reduce((newest, current) => {
                return newest.id > current.id ? newest : current;
              });
              
              // Die neu erstellte Adresse auswählen (ohne Auto-Navigation)
              setValue("addressId", newestAddress.id, { shouldValidate: false });
              
              // WICHTIG: Benutzer bleibt im Delivery-Schritt
              // Explizit sicherstellen, dass wir im Delivery-Schritt bleiben
              setCurrentStep(OrderStep.Delivery);
              
              toast({
                title: "Adresse hinzugefügt",
                description: "Die neue Lieferadresse wurde erfolgreich hinzugefügt und ausgewählt. Sie können nun mit der Bestellung fortfahren.",
              });
              
              // Flag nach kurzer Zeit zurücksetzen
              setTimeout(() => {
                setAddressJustCreated(false);
              }, 1000);
            }
          })
          .catch(error => {
            console.error("Fehler beim Abrufen der Adressen:", error);
            setAddressJustCreated(false);
            toast({
              title: "Fehler",
              description: "Die Adressen konnten nicht abgerufen werden.",
              variant: "destructive",
            });
          });
      });
    } else {
      // Fallback ohne refetchOrderDraft
      apiRequest("/api/addresses", { method: "GET" })
        .then(response => {
          if (response && Array.isArray(response) && response.length > 0) {
            const newestAddress = response.reduce((newest, current) => {
              return newest.id > current.id ? newest : current;
            });
            
            setValue("addressId", newestAddress.id, { shouldValidate: false });
            setCurrentStep(OrderStep.Delivery);
            
            toast({
              title: "Adresse hinzugefügt",
              description: "Die neue Lieferadresse wurde erfolgreich hinzugefügt und ausgewählt. Sie können nun mit der Bestellung fortfahren.",
            });
            
            setTimeout(() => {
              setAddressJustCreated(false);
            }, 1000);
          }
        })
        .catch(error => {
          console.error("Fehler beim Abrufen der Adressen:", error);
          setAddressJustCreated(false);
          toast({
            title: "Fehler",
            description: "Die Adressen konnten nicht abgerufen werden.",
            variant: "destructive",
          });
        });
    }
  };

  // Fortschrittsleiste
  const renderProgressBar = () => {
    return (
      <div className="w-full mb-6">
        <div className="flex justify-between items-center">
          <div 
            className="text-center flex flex-col items-center cursor-pointer text-primary"
            onClick={() => setCurrentStep(OrderStep.Products)}
          >
            <div className="rounded-full w-8 h-8 flex items-center justify-center mb-1 bg-primary text-white">
              1
            </div>
            <span className="text-xs">Produkte</span>
          </div>
          <div className={`flex-grow h-0.5 mx-2 ${currentStep >= OrderStep.Delivery ? "bg-primary" : "bg-gray-200"}`}></div>
          <div 
            className={`text-center flex flex-col items-center cursor-pointer ${currentStep >= OrderStep.Delivery ? "text-primary" : "text-gray-400"}`}
            onClick={() => currentStep > OrderStep.Delivery ? setCurrentStep(OrderStep.Delivery) : null}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center mb-1 ${currentStep >= OrderStep.Delivery ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}>
              2
            </div>
            <span className="text-xs">Lieferung</span>
          </div>
          <div className={`flex-grow h-0.5 mx-2 ${currentStep >= OrderStep.Review ? "bg-primary" : "bg-gray-200"}`}></div>
          <div 
            className={`text-center flex flex-col items-center cursor-pointer ${currentStep >= OrderStep.Review ? "text-primary" : "text-gray-400"}`}
            onClick={() => currentStep > OrderStep.Review ? setCurrentStep(OrderStep.Review) : null}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center mb-1 ${currentStep >= OrderStep.Review ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}>
              3
            </div>
            <span className="text-xs">Abschluss</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Dialog für Anleitungen */}
      <Dialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto overflow-x-hidden w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-primary" />
              So funktioniert's
            </DialogTitle>
            <DialogDescription>
              Anleitung zum Erstellen einer Bestellung
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <h3 className="font-medium text-primary">Schritt 1: Produkte hinzufügen</h3>
              <p className="text-sm">Klicken Sie auf "Produkt hinzufügen", um Artikel zu Ihrer Bestellung hinzuzufügen. Geben Sie den Produktnamen, die Menge und eventuell weitere Hinweise an.</p>
              <p className="text-sm">Ein Foto des Produkts hilft uns beim Finden des richtigen Artikels.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-primary">Schritt 2: Lieferdetails angeben</h3>
              <p className="text-sm">Wählen Sie eine Lieferadresse und geben Sie an, wann Sie die Lieferung erhalten möchten. Sie können aus verschiedenen Zeitfenstern wählen.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-primary">Schritt 3: Bestellung prüfen und absenden</h3>
              <p className="text-sm">Überprüfen Sie Ihre Bestellung sorgfältig. Bei Bedarf können Sie zurückgehen, um Änderungen vorzunehmen. Klicken Sie auf "Bestellung aufgeben", wenn alles stimmt.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-primary">Bestellstatus</h3>
              <p className="text-sm">Nach dem Absenden können Sie den Status Ihrer Bestellung in "Meine Bestellungen" verfolgen. Wir informieren Sie per E-Mail über Statusänderungen.</p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hide-instructions" 
                checked={hideInstructions}
                onCheckedChange={(checked) => setHideInstructions(!!checked)}
              />
              <label 
                htmlFor="hide-instructions" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Nicht mehr anzeigen
              </label>
            </div>
            <Button onClick={saveInstructionsPreference}>
              Verstanden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog für Produkthinzufügung */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Produkt hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie ein neues Produkt zu Ihrer Einkaufsliste hinzu.
            </DialogDescription>
          </DialogHeader>
          
          <SimpleProductEntryForm
            control={control}
            name="orderItems"
            value={[]}
            storeValue={orderItems.length > 0 ? orderItems[orderItems.length - 1].store : storeValue}
            onChange={(items) => {
              if (items.length > 0) {
                // Speichere den Geschäftswert aus dem neuen Produkt für zukünftige Verwendung
                if (items[0].store) {
                  setStoreValue(items[0].store);
                }
                
                // Füge das neue Item zu den existierenden hinzu
                const newItems = [...orderItems, items[0]];
                setOrderItems(newItems);
                setValue("orderItems", newItems);
                
                // Speichere auch im Warenkorb, mit dem neuen Store-Wert
                if (saveCart) {
                  saveCart(newItems as any, items[0].store || storeValue, true);
                }
                
                // Schließe das Dialog-Fenster
                setProductDialogOpen(false);
              }
            }}
            singleItemMode={true}
          />
        </DialogContent>
      </Dialog>
      
      {/* Dialog für Produktbearbeitung */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Produkt bearbeiten</DialogTitle>
            <DialogDescription>
              Passen Sie die Details des Produkts an.
            </DialogDescription>
          </DialogHeader>
          
          {editingItem.item && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-productName" className="text-right font-medium">
                  Produkt
                </label>
                <input
                  id="edit-productName"
                  value={editingItem.item.productName}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { 
                      ...editingItem.item, 
                      productName: e.target.value,
                      store: editingItem.item?.store || storeValue || ""
                    }
                  })}
                  className="col-span-3 border rounded p-2"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-quantity" className="text-right font-medium">
                  Menge
                </label>
                <input
                  id="edit-quantity"
                  value={editingItem.item.quantity}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, quantity: e.target.value }
                  })}
                  className="col-span-3 border rounded p-2"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-store" className="text-right font-medium">
                  Geschäft
                </label>
                <input
                  id="edit-store"
                  type="text"
                  value={editingItem.item.store || storeValue}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, store: e.target.value }
                  })}
                  className="col-span-3 border rounded p-2"
                  placeholder="z.B. Edeka, Rewe, Aldi..."
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-notes" className="text-right font-medium">
                  Hinweise
                </label>
                <textarea
                  id="edit-notes"
                  value={editingItem.item.notes || ""}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, notes: e.target.value }
                  })}
                  className="col-span-3 border rounded p-2 h-20 resize-none"
                  placeholder="z.B. Marke, Spezifikationen, etc."
                />
              </div>
              
              {/* Bildupload und Bildanzeige */}
              <div className="grid grid-cols-4 items-start gap-4">
                <label className="text-right font-medium pt-2">
                  Bilder
                </label>
                <div className="col-span-3">
                  {/* Aktuelle Bilder anzeigen */}
                  {editingItem.item.imageUrl && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-500 mb-2">Vorhandene Bilder (max. 3):</p>
                      <div className="flex flex-wrap gap-2">
                        {editingItem.item.imageUrl.startsWith('MULTI:') ? (
                          (() => {
                            // MULTI-Format mit extractImages dekodieren
                            try {
                              const images = extractImages(editingItem.item.imageUrl);
                              
                              return images.map((img, idx) => (
                                <div key={idx} className="relative">
                                  <div 
                                    className="w-16 h-16 rounded overflow-hidden cursor-pointer border"
                                    onClick={() => {
                                      setZoomedImageSrc(img.url || '');
                                      setImageZoomDialogOpen(true);
                                    }}
                                  >
                                    <img 
                                      src={img.url} 
                                      alt={`Produktbild ${idx + 1}`} 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <button 
                                    type="button"
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Bild aus dem Array entfernen
                                      const newImages = images.filter((_, i) => i !== idx);
                                      if (newImages.length === 0) {
                                        // Wenn keine Bilder mehr übrig sind, setze imageUrl auf null
                                        setEditingItem({
                                          ...editingItem,
                                          item: { ...editingItem.item, imageUrl: null }
                                        });
                                      } else {
                                        // Sonst kodiere die übrigen Bilder wieder in MULTI-Format
                                        const newMultiString = "MULTI:" + encodeURIComponent(JSON.stringify(
                                          newImages.map(img => ({
                                            url: img.url,
                                            isMain: img.isMain,
                                            order: img.order
                                          }))
                                        ));
                                        setEditingItem({
                                          ...editingItem,
                                          item: { ...editingItem.item, imageUrl: newMultiString }
                                        });
                                      }
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  </button>
                                </div>
                              ));
                            } catch (error) {
                              console.error("Fehler beim Dekodieren des MULTI-Formats:", error);
                              return null;
                            }
                          })()
                        ) : editingItem.item.imageUrl ? (
                          <div className="relative">
                            <div 
                              className="w-16 h-16 rounded overflow-hidden cursor-pointer border"
                              onClick={() => {
                                setZoomedImageSrc(editingItem.item.imageUrl || '');
                                setImageZoomDialogOpen(true);
                              }}
                            >
                              <img 
                                src={editingItem.item.imageUrl} 
                                alt="Produktbild" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button 
                              type="button"
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingItem({
                                  ...editingItem,
                                  item: { ...editingItem.item, imageUrl: null }
                                });
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                  
                  {/* Prüfen, ob max. 3 Bilder bereits erreicht ist */}
                  {(!editingItem.item.imageUrl || 
                    (editingItem.item.imageUrl.startsWith('MULTI:') && 
                      extractImages(editingItem.item.imageUrl).length < 3) || 
                    (!editingItem.item.imageUrl.startsWith('MULTI:'))) && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500">Neues Bild hinzufügen:</p>
                      
                      {/* Datei-Upload-Button */}
                      <label 
                        htmlFor="edit-image-upload" 
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded cursor-pointer w-fit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                        Bild auswählen
                      </label>
                      <input 
                        id="edit-image-upload" 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            // Bild-Upload-Logik
                            handleEditImageUpload(e.target.files[0]);
                          }
                        }}
                      />
                      
                      {/* Kamera-Button */}
                      <button
                        type="button"
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded w-fit"
                        onClick={() => setEditCameraDialogOpen(true)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                        Foto aufnehmen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="default" onClick={handleUpdateProduct}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderProgressBar()}
      {/* "Warenkorb leeren"-Button wird nur im ersten Schritt angezeigt */}
      {currentStep === OrderStep.Products && !cartIsEmpty && (
        <div className="flex justify-end mb-4">
          <Button
            variant="destructive"
            onClick={handleClearCart}
            size="sm"
          >
            Warenkorb leeren
          </Button>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Dieser Teil wird nicht mehr benötigt, das Geschäft wird pro Produkt ausgewählt */}
          {false && (
            <Card className="mb-6 border-primary/20 shadow-sm">
              <CardHeader className="bg-primary/10 pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-1 text-sm font-bold">1</div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-1"><path d="M2 3h19v12l-9.5 5-9.5-5V3Z"/><path d="M3 3v10l9 5"/><path d="M13 18l9-5V3"/><path d="M9 9v.01"/><path d="M15 9v.01"/><path d="M9 14v.01"/><path d="M15 14v.01"/></svg>
                  Geschäft auswählen
                </CardTitle>
                <CardDescription>Für welches Geschäft soll eingekauft werden?</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">

                
                <FormField
                  control={control}
                  name="store"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geschäft <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <input
                          type="text"
                          placeholder="z.B. EDEKA, REWE, ALDI, etc."
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setStoreValue(e.target.value);
                          }}
                          className="w-full border border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3 py-2"
                        />
                      </FormControl>
                      <FormDescription>
                        Geben Sie den Namen des Geschäfts ein, in dem Sie einkaufen möchten.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end mt-6">
                  <Button 
                    type="button" 
                    onClick={goToNextStep}
                    className="bg-primary text-white"
                  >
                    Weiter zu Produkten
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SCHRITT 1: Produkte */}
          {currentStep === OrderStep.Products && (
            <Card className="mb-6 border-primary/20 shadow-sm">
              <CardHeader className="bg-primary/10 pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-1 text-sm font-bold">1</div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-1"><path d="m7 5 10 .01m-10 3 5 .01m-5 3h10m-10 3 5 .01m-5 3 10 .01"/><path d="M19 7v14l-7-4-7 4V7"/><path d="M19 3a8 8 0 0 1 4 7v11l-1-1"/></svg>
                  Produkte hinzufügen
                </CardTitle>
                <CardDescription>Was soll für Sie eingekauft werden?</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Produkteingabeformular */}
                {/* Produkt-Hinzufügen-Button und Einkaufsliste */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Ihre Einkaufsliste</h3>
                    <Button 
                      type="button" 
                      className="bg-primary text-white" 
                      onClick={() => setProductDialogOpen(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      Produkt hinzufügen
                    </Button>
                  </div>
                  
                  {orderItems.length > 0 ? (
                    <div>
                      {/* Produkte nach Geschäft gruppieren */}
                      {(() => {
                        // Gruppiere nach Geschäft
                        const storeGroups: Record<string, typeof orderItems> = {};
                        
                        orderItems.forEach(item => {
                          const store = item.store || storeValue || "Unbekannt";
                          if (!storeGroups[store]) {
                            storeGroups[store] = [];
                          }
                          storeGroups[store].push(item);
                        });
                        
                        return Object.entries(storeGroups).map(([store, items], groupIndex) => (
                          <div key={groupIndex} className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
                              <h4 className="font-medium text-gray-800">{store}</h4>
                              <Badge variant="outline" className="ml-2">{items.length} {items.length === 1 ? "Produkt" : "Produkte"}</Badge>
                            </div>
                            
                            <ul className="space-y-2 pl-6">
                              {items.map((item, index) => {
                                const itemIndex = orderItems.findIndex(i => 
                                  i.productName === item.productName && 
                                  i.quantity === item.quantity && 
                                  i.store === item.store
                                );
                                
                                return (
                                  <li key={index} className="bg-white border rounded-md p-3 flex justify-between items-start shadow-sm">
                                    <div className="flex-1">
                                      <div className="flex items-start">
                                        <div className="text-gray-500 font-medium min-w-6 mr-2 text-right">
                                          {item.quantity}×
                                        </div>
                                        <div>
                                          <h5 className="font-medium">{item.productName}</h5>
                                          <p className="text-sm text-gray-600">{item.notes && `${item.notes}`}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleEditProduct(itemIndex)}
                                        className="h-8 px-2"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleRemoveProduct(itemIndex)}
                                        className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed rounded-lg bg-gray-50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-3"><path d="M8 3H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V9l-6-6H8z"/><path d="M17 9V3"/><path d="M10 13h4"/><path d="M10 17h4"/></svg>
                      <p className="text-gray-500 mb-2">Ihre Einkaufsliste ist noch leer</p>
                      <p className="text-gray-400 text-sm">Fügen Sie Produkte hinzu, um mit Ihrer Bestellung zu beginnen</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between mt-6">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Zurück
                  </Button>
                  
                  <Button 
                    type="button" 
                    onClick={goToNextStep}
                    className="bg-primary text-white"
                  >
                    Weiter zur Lieferung
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SCHRITT 2: Lieferadresse und -zeit */}
          {currentStep === OrderStep.Delivery && (
            <Card className="mb-6 border-primary/20 shadow-sm">
              <CardHeader className="bg-primary/10 pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-1 text-sm font-bold">2</div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  Lieferadresse
                </CardTitle>
                <CardDescription>Wohin und wann soll Ihre Bestellung geliefert werden?</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Lieferadresse */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel>Lieferadresse <span className="text-red-500">*</span></FormLabel>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAddressDialogOpen(true)}
                      className="flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4" />
                      Neue Adresse
                    </Button>
                  </div>
                  
                  <FormField
                    control={control}
                    name="addressId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <select
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value));
                            }}
                            className="w-full border border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3 py-2"
                          >
                            {addresses.length === 0 ? (
                              <option value="">Keine Adressen verfügbar - bitte fügen Sie eine hinzu</option>
                            ) : (
                              addresses.map((address) => (
                                <option key={address.id} value={address.id}>
                                  {address.name || address.fullName}: {address.street} {address.houseNumber}, {address.postalCode} {address.city}
                                  {address.isDefault ? " (Standard)" : ""}
                                </option>
                              ))
                            )}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Dialog für neue Adresse */}
                <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Neue Lieferadresse hinzufügen</DialogTitle>
                      <DialogDescription>
                        Fügen Sie eine neue Adresse für die Lieferung Ihrer Bestellung hinzu.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <AddressForm 
                      onSuccess={handleNewAddressCreated}
                      onCancel={() => setAddressDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>

                {/* Datum */}
                <div className="mb-4">
                  <FormField
                    control={control}
                    name="desiredDeliveryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Wunschlieferdatum <span className="text-red-500">*</span></FormLabel>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full h-10 pl-3 text-left font-normal border border-gray-300 rounded-md shadow-sm",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: de })
                                ) : (
                                  <span>Datum auswählen</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setCalendarOpen(false);
                              }}
                              disabled={(date) => date < today}
                              initialFocus
                              locale={de}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Zeitfenster */}
                <div className="mb-4">
                  <FormField
                    control={control}
                    name="desiredTimeSlot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wunschlieferzeit <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full border-gray-300 rounded-md shadow-sm">
                              <SelectValue placeholder="Bitte Zeitraum auswählen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="morning">Vormittag (9:00 - 12:00)</SelectItem>
                            <SelectItem value="afternoon">Nachmittag (13:00 - 16:00)</SelectItem>
                            <SelectItem value="evening">Abend (17:00 - 20:00)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Lieferhinweise */}
                <div className="mb-4">
                  <FormField
                    control={control}
                    name="additionalInstructions"
                    render={({ field }) => {
                      // Destrukturierung des Field-Objekts
                      const { onChange, ...restField } = field;
                      
                      // Optimierte onChange-Funktion mit Debounce-Funktion
                      const debouncedOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        // Setze den Wert sofort im Formular
                        onChange(e);
                        
                        // Starte Timer für Speicherung
                        if (saveOrderDraftTimeout.current) {
                          clearTimeout(saveOrderDraftTimeout.current);
                        }
                        
                        // Nur alle 1.5 Sekunden speichern
                        saveOrderDraftTimeout.current = setTimeout(() => {
                          // Sichere automatische Speicherung ohne Validierung im Hintergrund
                          const currentValues = getValues();
                          saveOrderDraft?.({
                            ...currentValues,
                            additionalInstructions: e.target.value,
                            orderItems: orderItems
                          });
                        }, 1500);
                      };
                      
                      return (
                        <FormItem>
                          <FormLabel>Hinweise zur Lieferung (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="z.B. Klingel defekt, bitte anrufen"
                              className="resize-none"
                              onChange={debouncedOnChange}
                              {...restField}
                            />
                          </FormControl>
                          <FormDescription>
                            Hilfreiche Informationen für den Lieferanten (max. 250 Zeichen)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                <div className="flex justify-between mt-6">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Zurück
                  </Button>
                  
                  <Button 
                    type="button" 
                    onClick={goToNextStep}
                    className="bg-primary text-white"
                  >
                    Weiter zur Übersicht
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SCHRITT 3: Überprüfen und Absenden */}
          {currentStep === OrderStep.Review && (
            <Card className="mb-6 border-primary/20 shadow-sm">
              <CardHeader className="bg-primary/10 pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mr-1 text-sm font-bold">3</div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Bestellung prüfen
                </CardTitle>
                <CardDescription>Überprüfen Sie Ihre Bestellung und geben Sie sie auf</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="bg-gray-50 rounded-lg p-5 mb-6">
                  {/* Bestellübersicht - gruppiert nach Geschäften */}
                  <h4 className="font-medium text-gray-800 mb-3">Produkte nach Geschäften</h4>
                  
                  {/* Gruppiere Produkte nach Geschäft */}
                  {(() => {
                    // Gruppiere Produkte nach Geschäft
                    const storeGroups: {[key: string]: typeof orderItems} = {};
                    
                    orderItems.forEach(item => {
                      const store = item.store || "Unbekanntes Geschäft";
                      if (!storeGroups[store]) {
                        storeGroups[store] = [];
                      }
                      storeGroups[store].push(item);
                    });
                    
                    return Object.entries(storeGroups).map(([store, items], storeIndex) => (
                      <div key={storeIndex} className="mb-6 last:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"/>
                            <path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8"/>
                            <path d="M15 2v5h5"/>
                          </svg>
                          <h5 className="font-bold text-primary">{store}</h5>
                        </div>
                        <ul className="mb-4 space-y-2 pl-6 border-l-2 border-primary/20">
                          {items.map((item, index) => (
                            <li key={index} className="flex justify-between items-center border-b pb-2 border-gray-200">
                              <div className="flex gap-3">
                                <div className="text-gray-500 font-medium w-6">
                                  {item.quantity}×
                                </div>
                                
                                {/* Bilder werden in Schritt 3 nicht angezeigt, um Platz zu sparen */}
                                
                                <div>
                                  <span className="font-medium">{item.productName}</span>
                                  <p className="text-sm text-gray-600">{item.notes || "Keine Notizen"}</p>
                                  <p className="text-xs text-gray-500">Geschäft: {item.store || storeValue}</p>
                                </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              // Finde den tatsächlichen Index in der Gesamtliste
                              const globalIndex = orderItems.findIndex(i => 
                                i.productName === item.productName && 
                                i.quantity === item.quantity && 
                                i.store === item.store
                              );
                              handleEditProduct(globalIndex !== -1 ? globalIndex : 0);
                            }}
                            className="text-xs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            Bearbeiten
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              // Finde den tatsächlichen Index in der Gesamtliste
                              const globalIndex = orderItems.findIndex(i => 
                                i.productName === item.productName && 
                                i.quantity === item.quantity && 
                                i.store === item.store
                              );
                              if (globalIndex !== -1) {
                                handleRemoveProduct(globalIndex);
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            Entfernen
                          </Button>
                        </div>
                      </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  })()}

                  <h4 className="font-medium text-gray-800 mb-2">Lieferinformationen</h4>
                  <div className="border-b pb-2 mb-2">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Lieferadresse</p>
                        {(() => {
                          const selectedAddressId = getValues("addressId");
                          const selectedAddress = addresses.find(a => a.id === selectedAddressId);
                          return (
                            <p className="text-sm text-gray-600">
                              {selectedAddress 
                                ? `${selectedAddress.name || selectedAddress.fullName}: ${selectedAddress.street} ${selectedAddress.houseNumber}, ${selectedAddress.postalCode} ${selectedAddress.city}`
                                : "Keine Adresse ausgewählt"}
                            </p>
                          );
                        })()}
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCurrentStep(OrderStep.Delivery)}
                        className="text-xs"
                      >
                        Bearbeiten
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <p className="font-medium">Lieferzeitpunkt</p>
                    <p className="text-sm text-gray-600">
                      {(() => {
                        const date = getValues("desiredDeliveryDate");
                        const timeSlot = getValues("desiredTimeSlot");
                        return (
                          <>
                            {date instanceof Date ? format(date, "PPP", { locale: de }) : "Kein Datum ausgewählt"}
                            {timeSlot && ` - ${
                              timeSlot === "morning" 
                                ? "Vormittag (9:00 - 12:00)" 
                                : timeSlot === "afternoon" 
                                  ? "Nachmittag (13:00 - 16:00)" 
                                  : "Abend (17:00 - 20:00)"
                            }`}
                          </>
                        );
                      })()}
                    </p>
                    
                    {getValues("additionalInstructions") && (
                      <div className="mt-2">
                        <p className="font-medium">Lieferhinweise</p>
                        <p className="text-sm text-gray-600">{getValues("additionalInstructions")}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Zurück
                  </Button>
                  
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || cartIsEmpty}
                    className="bg-primary text-white px-8 py-2 text-lg font-medium rounded-md hover:bg-primary-600 transition-colors flex items-center gap-2 shadow-md"
                    size="lg"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {isSubmitting ? "Wird bearbeitet..." : "Bestellen"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>

      {/* Dialog für Bildvergrößerung */}
      <Dialog open={imageZoomDialogOpen} onOpenChange={setImageZoomDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden p-1 bg-transparent border-none shadow-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <button 
              onClick={() => setImageZoomDialogOpen(false)}
              className="absolute top-2 right-2 z-10 bg-black/70 rounded-full p-1 text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            {zoomedImageSrc && (
              <img 
                src={zoomedImageSrc} 
                alt="Vergrößerte Ansicht" 
                className="max-w-full max-h-[80vh] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Kamera-Dialog für Foto-Aufnahme */}
      <Dialog open={editCameraDialogOpen} onOpenChange={(open) => {
        if (!open) closeCamera();
        else setEditCameraDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Foto aufnehmen</DialogTitle>
            <DialogDescription>
              Richten Sie die Kamera auf das Produkt und drücken Sie den Aufnahme-Button.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative w-full bg-black rounded overflow-hidden">
            {/* Video-Element für Kamera-Preview */}
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto max-h-[60vh] object-contain mx-auto"
              style={{ maxWidth: '100%' }}
            />
            
            {/* Bedienelemente */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button
                type="button"
                variant="destructive"
                onClick={closeCamera}
                className="rounded-full w-12 h-12 p-0 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
              
              <Button
                type="button"
                variant="secondary"
                onClick={handleTakePhoto}
                className="rounded-full w-16 h-16 p-0 flex items-center justify-center bg-white border-4 border-gray-300"
              >
                <div className="rounded-full w-12 h-12 bg-red-500 border-2 border-white"></div>
              </Button>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-center">
            <p className="text-sm text-muted-foreground">
              Hinweis: Bitte erlauben Sie den Zugriff auf Ihre Kamera, wenn Sie dazu aufgefordert werden.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bestätigungsdialog für Bestellabschluss */}
      <AlertDialog open={confirmOrderDialogOpen} onOpenChange={setConfirmOrderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bestellung aufgeben</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie mit Ihrer Bestellung fertig und möchten sie jetzt aufgeben?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOrderDialogOpen(false)}>
              Zurück zur Bearbeitung
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmOrder}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird bearbeitet...
                </>
              ) : (
                <>Ja, bestellen</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
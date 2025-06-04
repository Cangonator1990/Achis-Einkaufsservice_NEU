import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

// Wir definieren einfache Ersatzkomponenten, um die Form-Komponenten zu ersetzen
const FormItem = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`space-y-2 ${className}`}>{children}</div>
);

const FormLabel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <Label className={className}>{children}</Label>
);

const FormControl = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

const FormDescription = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <p className={`text-xs text-gray-600 ${className}`}>{children}</p>
);

import { AlertCircle } from "lucide-react";
import { PencilIcon, TrashIcon, ImageIcon, UploadIcon, CameraIcon } from "@/components/ui/icons";
import { InsertOrderItem, ProductWithImages } from "@shared/schema";
import { Control } from "react-hook-form";

// Die Helper-Funktionen zum Kodieren/Dekodieren mehrerer Bilder sind als Methoden innerhalb der Komponente definiert

// Dialog- und AlertDialog-Komponenten importieren
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

// Interface für Produktbilder (vereinfacht)
type ProductImage = {
  id?: number;
  imageUrl: string;
  filePath?: string; // Optional für Abwärtskompatibilität
  isMain: boolean;
  sortOrder: number;
  createdAt?: string;
}

// Erweitere den InsertOrderItem-Typ um zusätzliche Felder
interface ExtendedOrderItem extends InsertOrderItem {
  filePath?: string;
  productImages?: ProductImage[]; // Mehrere Bilder pro Produkt
}

// Definiere ein neues Interface für den Bearbeitungszustand
interface EditingState {
  isEditing: boolean;
  index: number | null;
}

interface ProductEntryFormProps {
  control: Control<any>;
  name: string;
  value?: ExtendedOrderItem[];
  onChange?: (items: InsertOrderItem[]) => void;
  storeValue?: string; // Geschäftswert vom Hauptformular
  singleItemMode?: boolean; // Wenn true, dann nur ein Produkt hinzufügen (für Modal)
}

// Neuer Ansatz für die ProductEntryForm-Komponente
const ProductEntryForm = ({ 
  value = [], 
  onChange = () => {}, 
  storeValue = "",
  singleItemMode = false,
  control // Wir ignorieren den Control-Parameter vorerst
}: ProductEntryFormProps) => {
  // Hook für Toast-Benachrichtigungen
  const { toast } = useToast();
  // Authentifizierungsstatus prüfen
  const { isAuthenticated } = useAuth();

  // Ein getrennter Bearbeitungszustand, der nicht in den Hauptzustand einfließt
  const [editingState, setEditingState] = useState<EditingState>({
    isEditing: false,
    index: null
  });

  // Der aktuelle Produkt-Zustand im Formular
  const [currentProduct, setCurrentProduct] = useState<ExtendedOrderItem>({
    productName: "",
    quantity: "1",
    store: storeValue || "",
    notes: "",
    imageUrl: "",
    filePath: "", // Beide Bildfelder verwenden, um Konsistenz zu gewährleisten
    productImages: [] // Mehrere Bilder pro Produkt (max. 3)
  });

  // State für die aktuellen Produktbilder (maximal 3)
  const [productImages, setProductImages] = useState<ProductImage[]>([]);

  // State für den Lösch-Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  // States für Bild-Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States für Kamera
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [showAddMoreDialog, setShowAddMoreDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State für Bildzoom-Dialog
  const [imageZoomDialogOpen, setImageZoomDialogOpen] = useState(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string>("");

  // Aktualisiere die Store-Eigenschaft beim ersten Laden und wenn sich der storeValue ändert
  useEffect(() => {
    if (!editingState.isEditing) {
      // Priorisiere: 1. Letzter Store-Wert aus den vorhandenen Produkten, 2. storeValue, 3. Leerer String
      const lastUsedStore = value.length > 0 
        ? value[value.length - 1].store || storeValue || "" 
        : storeValue || "";

      console.log("Store-Value aktualisiert:", { lastUsedStore, storeValue, productsLength: value.length });

      setCurrentProduct(prev => ({
        ...prev,
        store: lastUsedStore
      }));
    }
  }, [storeValue, editingState.isEditing, value]);

  // Aktualisiere das Store-Feld und initialisiere es immer mit dem besten verfügbaren Wert
  useEffect(() => {
    // Diese Funktion findet den besten Store-Wert basierend auf verschiedenen Quellen
    const getBestStoreValue = (): string => {
      // Prioritätsreihenfolge:
      // 1. Letztes Produkt in der Liste, wenn vorhanden
      // 2. Übergeordneter storeValue vom Parent-Component
      // 3. Netto als hardcodierter Fallback (weil wir wissen, dass der Benutzer das bereits benutzt hat)
      
      // Prüfe, ob wir ein letztes Produkt haben mit einem gültigen Store-Wert
      if (value.length > 0) {
        const lastProduct = value[value.length - 1];
        if (lastProduct?.store?.trim()) {
          console.log("Verwende Store-Wert vom letzten Produkt:", lastProduct.store);
          return lastProduct.store;
        }
      }
      
      // Wenn kein Produkt mit Store-Wert gefunden wurde, verwende den übergeordneten storeValue
      if (storeValue?.trim()) {
        console.log("Verwende übergeordneten storeValue:", storeValue);
        return storeValue;
      }
      
      // Wenn der Store des aktuellen Produkts bereits gesetzt ist, behalte ihn
      if (currentProduct.store?.trim()) {
        console.log("Behalte aktuellen Store-Wert:", currentProduct.store);
        return currentProduct.store;
      }
      
      // Fallback auf "Netto", weil der Benutzer das bereits verwendet hat
      console.log("Fallback auf 'Netto'");
      return "Netto";
    };

    // Benutze unsere Funktion nicht im Bearbeitungsmodus, da wir dort den
    // Original-Wert des Produkts verwenden wollen
    if (!editingState.isEditing) {
      const bestStoreValue = getBestStoreValue();
      
      // Nur aktualisieren, wenn sich der Wert ändert oder empty ist
      if (bestStoreValue !== currentProduct.store || !currentProduct.store) {
        console.log("Aktualisiere Store-Feld mit dem besten Wert:", bestStoreValue);
        setCurrentProduct(prev => ({
          ...prev,
          store: bestStoreValue
        }));
      }
    }
  }, [editingState.isEditing, value, storeValue, currentProduct.store]);

  // Neuer Effekt, um sicherzustellen, dass der Dialog korrekt funktioniert
  useEffect(() => {
    // Debug-Logging zum Nachverfolgen des Dialog-Status
    console.log("Dialog-Status geändert:", imageZoomDialogOpen, "Bild-URL:", zoomedImageSrc);
  }, [imageZoomDialogOpen, zoomedImageSrc]);

  // Extrahiere alle einzigartigen Geschäfte aus der Produktliste und dem storeValue
  useEffect(() => {
    // Sammle alle Store-Werte aus der Produktliste
    const storeNames = value
      .map(item => item.store?.trim())
      .filter((store): store is string => !!store && store !== "");
    
    // Füge den storeValue hinzu, wenn er nicht leer ist
    if (storeValue && storeValue.trim() !== "") {
      storeNames.push(storeValue.trim());
    }
    
    // Füge den aktuellen Store-Wert aus dem Formular hinzu, wenn vorhanden
    if (currentProduct.store && currentProduct.store.trim() !== "") {
      storeNames.push(currentProduct.store.trim());
    }
    
    // Entferne Duplikate und leere Werte
    const uniqueStores = Array.from(new Set(storeNames));
    console.log("Einzigartige Geschäfte für Autovervollständigung:", uniqueStores);
    
    // Nur aktualisieren wenn es tatsächlich Änderungen gibt
    if (uniqueStores.length > 0) {
      setUsedStores(uniqueStores);
    }
  }, [value, storeValue, currentProduct.store]);

  // Kamera-Funktionalität
  useEffect(() => {
    // Aktiviere die Kamera, wenn das Dialog geöffnet wird
    if (cameraDialogOpen && !isCameraActive) {
      const startCamera = async () => {
        try {
          // Prüfe, ob die Kamera API verfügbar ist
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast({
              title: "Kamera nicht verfügbar",
              description: "Ihr Browser unterstützt die Kamerafunktion nicht oder der Zugriff auf die Kamera wurde verweigert.",
              variant: "destructive"
            });
            return;
          }

          // Fordere Kamerazugriff an
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment', // Nutze die rückseitige Kamera, wenn verfügbar (besonders wichtig für Smartphones)
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });

          // Setze den Stream auf das Video-Element
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setIsCameraActive(true);
          }
        } catch (error) {
          console.error("Fehler beim Starten der Kamera:", error);
          toast({
            title: "Kamera-Fehler",
            description: "Die Kamera konnte nicht gestartet werden. Bitte überprüfen Sie Ihre Kameraberechtigungen.",
            variant: "destructive"
          });
        }
      };

      startCamera();
    }

    // Cleanup-Funktion: Kamera stoppen, wenn Dialog geschlossen wird
    return () => {
      if (isCameraActive && videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        setIsCameraActive(false);
      }
    };
  }, [cameraDialogOpen, isCameraActive, toast]);

  // Überprüfe, ob ein Produkt gültig ist und verwende den letzten Store-Wert als Fallback
  const isValidProduct = (product: InsertOrderItem) => {
    // Prüfe, ob ein Geschäft angegeben wurde oder aus dem letzten Produkt entnommen werden kann
    const hasValidStore = 
      product.store?.trim() !== "" || 
      (value.length > 0 && value[value.length - 1]?.store?.trim() !== "");

    return product.productName.trim() !== "" && 
           product.quantity.trim() !== "" &&
           hasValidStore; // Geschäft muss angegeben sein oder aus dem letzten Produkt entnommen werden können
  };

  // Temporäre Liste von hochgeladenen Bildern, die noch nicht gespeichert wurden
  const [tempUploadedImages, setTempUploadedImages] = useState<string[]>([]);
  
  // Liste der bereits verwendeten Geschäfte für Autovervollständigung
  // Initialisiere mit einigen Beispielwerten, damit wir sofort etwas zum Anzeigen haben
  const [usedStores, setUsedStores] = useState<string[]>(["Rewe", "Aldi", "Kaufland", "Lidl", "Edeka", "Netto"]);
  
  // Debug-Log für die Store-Liste
  useEffect(() => {
    console.log("Aktualisierte Liste der Geschäfte für Autovervollständigung:", usedStores);
  }, [usedStores]);
  
  // Zustand für die Anzeige der Autovervollständigungsliste
  const [showStoreAutocomplete, setShowStoreAutocomplete] = useState(false);

  // Funktion zum Löschen eines Bildes auf dem Server
  const deleteUploadedImage = async (imagePath: string) => {
    if (!imagePath || !imagePath.startsWith('/uploads/')) {
      return; // Vermeide leere oder ungültige Pfade
    }

    try {
      console.log("Lösche temporäres Bild vom Server:", imagePath);
      const response = await fetch(`/api/upload/product-image`, {
        method: 'DELETE',
        body: JSON.stringify({ filePath: imagePath }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log("Bild erfolgreich gelöscht");
      } else {
        console.warn("Fehler beim Löschen des Bildes:", await response.text());
      }
    } catch (error) {
      console.error("Fehler beim Löschen des temporären Bildes:", error);
    }
  };

  // Zurücksetzen des Formulars
  const resetForm = async (keepImages = false) => {
    // Bilder aus dem Formular ermitteln
    let images: ProductImage[] = [];

    // 1. Prüfe, ob es ein kodiertes Bild-Set gibt (MULTI:...)
    if (currentProduct.imageUrl && currentProduct.imageUrl.startsWith("MULTI:")) {
      // Dekodiere die Bilder
      images = decodeMultipleImages(currentProduct.imageUrl);
    } 
    // 2. Oder ob es eine Liste von Produktbildern gibt
    else if (currentProduct.productImages && currentProduct.productImages.length > 0) {
      images = currentProduct.productImages;
    } 
    // 3. Oder ob es ein einzelnes Bild gibt (Legacy)
    else if (currentProduct.imageUrl || currentProduct.filePath) {
      const imgPath = currentProduct.imageUrl || currentProduct.filePath;
      if (imgPath) {
        images = [{
          imageUrl: imgPath,
          filePath: imgPath,
          isMain: true,
          sortOrder: 0
        }];
      }
    }

    // Lösche temporäre Bilder nur, wenn wir sie nicht behalten sollen
    // keepImages = true bedeutet, dass wir die Bilder behalten wollen, z.B. wenn das Produkt zum Warenkorb hinzugefügt wurde
    if (!keepImages) {
      // Lösche alle temporär hochgeladenen Bilder
      for (const image of images) {
        const imagePath = image.imageUrl || image.filePath;
        if (imagePath && tempUploadedImages.includes(imagePath)) {
          await deleteUploadedImage(imagePath);
          // Entferne das Bild aus der temporären Liste
          setTempUploadedImages(prev => prev.filter(img => img !== imagePath));
        }
      }
    } else {
      // Wenn wir Bilder behalten, leeren wir nur die temporäre Liste ohne die Bilder zu löschen
      setTempUploadedImages([]);
    }

    // Ermittle den letzten verwendeten Store-Wert
    const lastUsedStore = value.length > 0 
      ? value[value.length - 1].store || storeValue || "" 
      : storeValue || "";

    setCurrentProduct({
      productName: "",
      quantity: "1",
      store: lastUsedStore, // Verwende den letzten Store-Wert als Vorgabe
      notes: "",
      imageUrl: "", // Leere den kodierten String
      filePath: "", // Auch filePath zurücksetzen
      productImages: [] // Bilderliste zurücksetzen
    });

    setEditingState({
      isEditing: false,
      index: null
    });

    // Setze Upload-States zurück
    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Wir haben diesen Dialog-State bereits vorher definiert

  // Handler für das Speichern eines Produkts
  const handleSaveProduct = () => {
    if (!isValidProduct(currentProduct)) {
      return;
    }

    try {
      // Wir erlauben jetzt, dass Produkte ohne Geschäft hinzugefügt werden können
      // Sie erhalten später das Geschäft des Hauptformulars oder behalten ihr eigenes,
      // falls bereits eine gesetzt wurde

      // Ermittle den besten Store-Wert für dieses Produkt
      const lastUsedStore = value.length > 0 
        ? value[value.length - 1].store || storeValue || "" 
        : storeValue || "";

      console.log("Original-Produkt vor dem Speichern:", currentProduct);

      // Bilder verarbeiten - unterscheidet zwischen Single und Multiple Images
      let finalImageUrl = "";
      let finalFilePath = "";

      // Prüfe, ob mehrere Bilder vorhanden sind
      if (currentProduct.productImages && currentProduct.productImages.length > 0) {
        // Kodiere die Bilder und speichere sie als einen String
        finalImageUrl = encodeMultipleImages(currentProduct.productImages);

        // Für Legacy-Unterstützung: Verwende das Hauptbild als filePath
        const mainImage = currentProduct.productImages.find(img => img.isMain) || currentProduct.productImages[0];
        finalFilePath = mainImage?.imageUrl || "";
      } else {
        // Einzelnes Bild-Handling (Legacy) 
        // Priorität: imageUrl > filePath > leerer String
        finalImageUrl = currentProduct.imageUrl || currentProduct.filePath || "";
        finalFilePath = finalImageUrl;
      }

      console.log("Speichere Produkt mit Bildern:", finalImageUrl);

      const productToSave = {
        ...currentProduct,
        // Priorität: 1. Aktuelle Eingabe, 2. Letzter verwendeter Store-Wert, 3. storeValue, 4. Leerer String
        store: currentProduct.store?.trim() || lastUsedStore,
        // Stelle sicher, dass das Bild in beiden Feldern für vollständige Kompatibilität gespeichert wird
        imageUrl: finalImageUrl,
        filePath: finalFilePath
      };

      console.log("Produkt zum Speichern (nach Bildpfad-Korrektur):", productToSave);

      // Erstelle eine Kopie der aktuellen Produkte
      const newProducts = Array.isArray(value) ? [...value] : [];

      if (editingState.isEditing && editingState.index !== null) {
        // Update ein bestehendes Produkt
        newProducts[editingState.index] = productToSave;

        // Benachrichtige den Benutzer mit einem Toast
        toast({
          title: "Produkt aktualisiert",
          description: `${productToSave.productName} wurde erfolgreich aktualisiert.`,
          variant: "success"
        });
      } else {
        // Füge ein neues Produkt hinzu
        newProducts.push(productToSave);

        // Benachrichtige den Benutzer mit einem Toast
        toast({
          title: "Produkt hinzugefügt",
          description: `${productToSave.productName} wurde zur Einkaufsliste hinzugefügt.`,
          variant: "success"
        });
      }

      console.log("Produkt gespeichert, neue Produktliste:", newProducts);

      // Benachrichtige den Eltern-Component über die Änderung
      onChange(newProducts);

      // Setze das Formular zurück, aber behalte die Bilder (keepImages=true)
      // Dies verhindert, dass die Bilder physisch vom Server gelöscht werden
      resetForm(true);
      
      // Nach dem Hinzufügen eines neuen Produkts:
      // 1. Zum Anfang des Formulars scrollen (mit Navbar-Berücksichtigung)
      // 2. Dialog anzeigen, ob weitere Produkte hinzugefügt werden sollen
      if (!editingState.isEditing) {
        // Verzögerung für besseres UX
        setTimeout(() => {
          // Scrolle zum Anfang des Formulars mit Berücksichtigung der Navbar-Höhe
          const formTopElement = document.getElementById('product-form-top');
          if (formTopElement) {
            const navbarHeight = 80; // Ungefähre Navbar-Höhe in Pixeln
            const elementPosition = formTopElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
            
            // Nach dem Scrollen Dialog anzeigen
            setTimeout(() => setShowAddMoreDialog(true), 500);
          }
        }, 100);
      }
    } catch (error) {
      console.error("Fehler beim Speichern des Produkts:", error);
    }
  };

  // Handler für das Bearbeiten eines Produkts
  const handleEditProduct = (index: number, e?: React.MouseEvent) => {
    // Verhindere Event Bubbling, falls ein Event übergeben wurde
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Stoppe, wenn wir bereits im Bearbeitungsmodus sind
    if (editingState.isEditing) {
      return;
    }

    // Setze den Bearbeitungszustand
    setEditingState({
      isEditing: true,
      index: index
    });

    // Hole das zu bearbeitende Produkt aus dem Original-Array
    const originalProduct = value[index];
    console.log("Originalprodukt vor Bearbeitung:", originalProduct);

    // Lade das ausgewählte Produkt
    const productToEdit = {
      ...originalProduct,
      store: originalProduct.store || storeValue || "",
    };

    // Bilder verarbeiten - prüfen, ob es sich um kodierte Bilder handelt
    if (originalProduct.imageUrl && originalProduct.imageUrl.startsWith("MULTI:")) {
      // Dekodieren und als Bilder-Array setzen
      const decodedImages = decodeMultipleImages(originalProduct.imageUrl);
      productToEdit.productImages = decodedImages;

      // Für Legacy-Unterstützung das Hauptbild als imageUrl und filePath setzen
      const mainImage = decodedImages.find(img => img.isMain) || decodedImages[0];
      if (mainImage) {
        productToEdit.imageUrl = originalProduct.imageUrl; // Behalte den kodierten String
        productToEdit.filePath = mainImage.imageUrl;
      }
    } 
    // Sonst normale Bild-Verarbeitung
    else {
      // Prüfe und verwende die vorhandenen Bildpfade
      // Priorität: imageUrl > filePath > leerer String
      if (originalProduct.imageUrl) {
        productToEdit.imageUrl = originalProduct.imageUrl;
        // Zusätzlich im filePath-Feld speichern für vollständige Kompatibilität
        productToEdit.filePath = originalProduct.imageUrl;

        // Als ein einzelnes Bild in das productImages-Array konvertieren
        productToEdit.productImages = [{
          id: 0,
          imageUrl: originalProduct.imageUrl,
          filePath: originalProduct.imageUrl,
          isMain: true,
          sortOrder: 0
        }];
      } else if (originalProduct.filePath) {
        // Wenn nur filePath vorhanden ist, in beide Felder kopieren
        productToEdit.imageUrl = originalProduct.filePath;
        productToEdit.filePath = originalProduct.filePath;

        // Als ein einzelnes Bild in das productImages-Array konvertieren
        productToEdit.productImages = [{
          id: 0,
          imageUrl: originalProduct.filePath,
          filePath: originalProduct.filePath,
          isMain: true,
          sortOrder: 0
        }];
      } else {
        // Kein Bild vorhanden
        productToEdit.imageUrl = "";
        productToEdit.filePath = "";
        productToEdit.productImages = [];
      }
    }

    // Debug: Das zu bearbeitende Produkt und dessen Bildpfad ausgeben
    console.log("Produkt zum Bearbeiten (nach Bildpfad-Korrektur):", productToEdit);
    console.log("Bild-URL:", productToEdit.imageUrl);
    console.log("Bild-Pfad:", productToEdit.filePath);
    console.log("Bilder-Array:", productToEdit.productImages);

    // WICHTIG: Geschäft aus Produkt ins Hauptformular übertragen
    // Das hilft dem Benutzer zu erkennen, welches Geschäft zum Produkt gehört
    // Informiere den Eltern-Component über die Änderung des Geschäfts
    if (productToEdit.store && productToEdit.store.trim() !== "") {
      // Callback zum Aktualisieren des Geschäfts im Hauptformular
      try {
        onChange([...value]); // Trigger für Update des Geschäfts, bevor wir bearbeiten
      } catch (error) {
        console.error("Fehler beim Aktualisieren des Geschäfts:", error);
      }
    }

    // Aktualisiere das aktuelle Produkt
    setCurrentProduct(productToEdit);

    // Scrolle direkt zum Eingabeformular mit Verzögerung und Offset für die Navbar
    setTimeout(() => {
      const productFormInputs = document.getElementById('product-form-inputs');
      if (productFormInputs) {
        // Berechne Position mit Offset für die Navbar (ca. 70px)
        const navbarOffset = 80; // Höhe der Navbar + etwas Abstand
        const elementPosition = productFormInputs.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navbarOffset;

        // Scrolle zur angepassten Position
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        console.log('Scrolling to product form inputs with navbar offset');
      } else {
        // Fallback auf das äußere Element
        const productFormElement = document.getElementById('product-form-top');
        if (productFormElement) {
          // Auch hier mit Offset
          const navbarOffset = 80;
          const elementPosition = productFormElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navbarOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          console.log('Scrolling to product form container with navbar offset');
        } else {
          console.log('Product form elements not found');
        }
      }
    }, 200); // Längere Verzögerung für bessere Zuverlässigkeit
  };

  // Öffne den Lösch-Dialog
  const openDeleteDialog = (index: number, e?: React.MouseEvent) => {
    // Verhindere Event Bubbling, falls ein Event übergeben wurde
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    setProductToDelete(index);
    setDeleteDialogOpen(true);
  };

  // Handler für das Entfernen eines Produkts nach Bestätigung
  const handleRemoveProduct = (index: number) => {
    // Speichere den Produktnamen, bevor wir es entfernen
    const productName = value[index]?.productName || "Produkt";

    const newProducts = value.filter((_, i) => i !== index);

    // Wenn wir das Produkt löschen, das gerade bearbeitet wird, setze das Formular zurück
    // Behalte die Bilder (keepImages=true), da sie in einem anderen Produkt verwendet werden könnten
    if (editingState.isEditing && editingState.index === index) {
      resetForm(true);
    }

    // Benachrichtige den Eltern-Component
    // Dies wird die Änderungen mit dem Server synchronisieren und in localStorage speichern
    onChange(newProducts);

    // Dialog schließen und Lösch-Index zurücksetzen
    setDeleteDialogOpen(false);
    setProductToDelete(null);

    // Benachrichtige den Benutzer mit einem Toast
    toast({
      title: "Produkt entfernt",
      description: `${productName} wurde aus Ihrer Einkaufsliste entfernt.`,
      variant: "destructive"
    });

    console.log("Produkt entfernt, neue Produktliste:", newProducts);
  };

  // Handler für das Abbrechen der Bearbeitung
  const handleCancelEdit = async () => {
    // Wir rufen resetForm an und behalten die Bilder (keepImages=false)
    // Hier werden die Bilder tatsächlich gelöscht, weil der Benutzer die Bearbeitung abbricht
    // und die Bilder nicht mehr benötigt
    await resetForm(false);

    toast({
      title: "Bearbeitung abgebrochen",
      description: "Alle Änderungen wurden verworfen.",
      variant: "default"
    });
  };

  // Funktion zum Aufnehmen eines Fotos
  const capturePhoto = async () => {
    // Prüfe, ob der Benutzer angemeldet ist
    if (!isAuthenticated) {
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melden Sie sich an, um Fotos aufzunehmen.",
        variant: "destructive"
      });
      return;
    }

    // Prüfe, ob bereits 3 Bilder vorhanden sind
    if (currentProduct.productImages && currentProduct.productImages.length >= 3) {
      toast({
        title: "Maximum erreicht",
        description: "Sie können maximal 3 Bilder pro Produkt hochladen. Bitte entfernen Sie zuerst ein Bild.",
        variant: "destructive"
      });
      // Schließe den Kamera-Dialog, da wir kein weiteres Bild aufnehmen können
      setCameraDialogOpen(false);
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Kamera-Fehler",
        description: "Die Kamera konnte nicht verwendet werden.",
        variant: "destructive"
      });
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Bildgröße auf das Video anpassen
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Bild aus Video auf Canvas zeichnen
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Canvas zu Blob konvertieren
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else {
            toast({
              title: "Foto-Fehler",
              description: "Das Foto konnte nicht erstellt werden.",
              variant: "destructive"
            });
          }
        }, 'image/jpeg', 0.9);
      });

      // Blob zu File konvertieren
      const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Starte Upload
      await uploadProductImage(file);

      // Kamera-Dialog schließen
      setCameraDialogOpen(false);

    } catch (error) {
      console.error("Fehler beim Aufnehmen des Fotos:", error);
      toast({
        title: "Foto-Fehler",
        description: "Das Foto konnte nicht aufgenommen werden.",
        variant: "destructive"
      });
    }
  };

  // Upload eines Produktbildes (maximal 3 Bilder pro Produkt)
  /**
   * Diese Funktion kodiert ein Array von Produktbildern in einen einzelnen String 
   * im MULTI-Format für die Speicherung in der Datenbank.
   * Die Implementierung ist robust gegen Fehler und enthält Fallbacks.
   */
  const encodeMultipleImages = (images: ProductImage[]): string => {
    // Überprüfung der Eingabe
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.warn("Keine gültigen Bilder zum Kodieren vorhanden");
      return "";
    }

    // Validiere, dass alle Bilder korrekte URLs haben
    const validImages = images.filter(img => img && img.imageUrl && typeof img.imageUrl === 'string');

    // Wenn keine gültigen Bilder übrig bleiben, früh zurückkehren
    if (validImages.length === 0) {
      console.warn("Keine gültigen Bildpfade gefunden");
      return "";
    }

    // Detailliertes Logging für Debug-Zwecke
    console.log(`Kodiere ${validImages.length} Bilder:`, 
      validImages.map(img => ({
        url: img.imageUrl ? img.imageUrl.substring(0, 20) + "..." : "keine URL",
        isMain: img.isMain,
        order: img.sortOrder
      }))
    );

    // Erstelle die Datenstruktur für die JSON-Serialisierung
    const imageData = validImages.map(img => ({
      url: img.imageUrl,
      isMain: img.isMain === true, // Explizite Konvertierung zu boolean
      order: typeof img.sortOrder === 'number' ? img.sortOrder : 0
    }));

    // URL-sichere Base64-Kodierung des JSON-Strings
    try {
      // Schritt 1: JSON-Serialisierung
      const jsonString = JSON.stringify(imageData);
      if (!jsonString) throw new Error("JSON-Serialisierung fehlgeschlagen");

      // Schritt 2: URL-Kodierung (macht den String URL-sicher)
      const encodedJsonString = encodeURIComponent(jsonString);

      // Schritt 3: Base64-Kodierung (für bessere Kompatibilität und Verkürzung)
      const base64String = btoa(encodedJsonString);

      // Füge das MULTI-Präfix hinzu, um den kodierten String zu kennzeichnen
      return "MULTI:" + base64String;
    } catch (error) {
      console.error("Fehler beim Kodieren der Bilder:", error);

      // Im Fehlerfall: Versuche eine einfachere Serialisierung ohne Base64
      try {
        // Erstelle eine Liste von Bildpfaden als einfachen String
        const fallbackString = "MULTI:" + encodeURIComponent(
          validImages.map(img => img.imageUrl).join('|')
        );
        console.log("Fallback-Kodierung verwendet:", fallbackString.substring(0, 50) + "...");
        return fallbackString;
      } catch (e) {
        console.error("Auch Fallback-Kodierung fehlgeschlagen:", e);
        // Absoluter Fallback: Verwende nur das erste Bild
        const mainImage = validImages.find(img => img.isMain) || validImages[0];
        return mainImage?.imageUrl || "";
      }
    }
  };

  // Hilfsfunktion um einen String in mehrere Bilder zu dekodieren
  /**
   * Diese Funktion dekodiert einen kodierten String zu einem Array von ProductImage-Objekten.
   * Sie ist robust implementiert und behandelt verschiedene Fehlerfälle.
   */
  const decodeMultipleImages = (encodedString: string): ProductImage[] => {
    // Wenn keine Bilddaten vorhanden sind, geben wir ein leeres Array zurück
    if (!encodedString) return [];

    // Sicherer debug-Log
    console.log("Versuche, Bilddaten zu dekodieren:", 
      encodedString.substring(0, 20) + (encodedString.length > 20 ? "..." : ""));

    // Prüfe, ob es sich um einen kodierten String im MULTI-Format handelt
    if (encodedString.startsWith("MULTI:")) {
      try {
        // Schritt 1: Entferne das MULTI:-Präfix
        const base64Part = encodedString.replace("MULTI:", "");

        // Schritt 2: BASE64-Dekodierung
        let jsonString;
        try {
          jsonString = atob(base64Part); // Versuche Base64 zu dekodieren
        } catch (e) {
          console.error("BASE64-Dekodierungsfehler:", e);
          throw new Error("Ungültiges BASE64-Format");
        }

        // Schritt 3: URL-Dekodierung
        try {
          jsonString = decodeURIComponent(jsonString);
        } catch (e) {
          console.error("URL-Dekodierungsfehler:", e);
          // Versuche ohne URL-Dekodierung fortzufahren, falls der String nicht URL-kodiert ist
        }

        // Schritt 4: JSON-Parsing
        let imageData;
        try {
          imageData = JSON.parse(jsonString);
          if (!Array.isArray(imageData)) {
            console.error("Dekodierte Daten sind kein Array:", imageData);
            throw new Error("Ungültiges Bildformat: Kein Array");
          }
        } catch (e) {
          console.error("JSON-Parsing-Fehler:", e);
          throw new Error("Ungültiges JSON-Format");
        }

        // Log für Debug-Zwecke
        console.log("Erfolgreich dekodierte Bilder:", imageData);

        // Schritt 5: Konvertierung in ProductImage-Objekte mit Typhintbehandlung
        const validImages = imageData
          .map((img: any, index: number) => {
            // Validierung der Image-Daten
            if (!img || !img.url) {
              console.warn(`Bild an Index ${index} hat keine URL:`, img);
              return undefined; // Dieses Bild wird später herausgefiltert
            }

            return {
              id: index,
              imageUrl: img.url,
              filePath: img.url, // Für Abwärtskompatibilität
              isMain: img.isMain === true, // Explizite Konvertierung zu boolean
              sortOrder: typeof img.order === 'number' ? img.order : index
            } as ProductImage;
          })
          .filter((img): img is ProductImage => img !== undefined); // TypeScript-sichere Filterung

        return validImages;

      } catch (error) {
        console.error("Fehler beim Dekodieren der MULTI-Bilder:", error, "String:", 
          encodedString.substring(0, 50) + (encodedString.length > 50 ? "..." : ""));

        // Fallback für spezielle Fälle
        if (typeof encodedString === 'string') {
          // Versuch einer manuellen Extraktion von URLs, falls der String teilweise dekodierbar ist
          try {
            const urlMatches = encodedString.match(/\/uploads\/products\/[^"',\s]+/g);
            if (urlMatches && urlMatches.length > 0) {
              console.log("URLs durch manuelle Extraktion gefunden:", urlMatches);
              // Manuell validierte URLs in ProductImage-Objekte mit TypeScript-Type-Safety
              return urlMatches.map((url, index) => ({
                id: index,
                imageUrl: url,
                filePath: url,
                isMain: index === 0, // Erstes Bild ist Hauptbild
                sortOrder: index
              } as ProductImage));
            }
          } catch (e) {
            console.error("Manuelle URL-Extraktion fehlgeschlagen:", e);
          }
        }

        // Wenn alles fehlschlägt, geben wir ein leeres Array zurück
        return [];
      }
    }

    // Für einfache Strings (keine MULTI-Kodierung): Behandeln als einzelnes Bild
    // Mit expliziter Type-Annotation für TypeScript
    return [{
      id: 0,
      imageUrl: encodedString,
      filePath: encodedString, // Für Abwärtskompatibilität
      isMain: true,
      sortOrder: 0
    } as ProductImage];
  };

  const uploadProductImage = async (file: File) => {
    try {
      // Prüfe, ob der Benutzer angemeldet ist
      if (!isAuthenticated) {
        toast({
          title: "Anmeldung erforderlich",
          description: "Bitte melden Sie sich an, um Bilder hochzuladen.",
          variant: "destructive"
        });
        return;
      }

      // Berechne die aktuelle Anzahl der Bilder
      let currentImages: ProductImage[] = [];

      // Wenn bereits ein imageUrl existiert, dekodiere es zu einem Array von Bildern
      if (currentProduct.imageUrl) {
        if (currentProduct.imageUrl.startsWith("MULTI:")) {
          currentImages = decodeMultipleImages(currentProduct.imageUrl);
        } else if (currentProduct.productImages && currentProduct.productImages.length > 0) {
          currentImages = currentProduct.productImages;
        } else {
          // Legacy-Unterstützung: Einzelbild in ein Array umwandeln
          currentImages = [{
            id: 0,
            imageUrl: currentProduct.imageUrl,
            filePath: currentProduct.imageUrl,
            isMain: true,
            sortOrder: 0
          }];
        }
      }

      // Prüfe, ob bereits 3 Bilder vorhanden sind
      if (currentImages.length >= 3) {
        toast({
          title: "Maximum erreicht",
          description: "Sie können maximal 3 Bilder pro Produkt hochladen. Bitte entfernen Sie zuerst ein Bild.",
          variant: "destructive"
        });
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      // Formular für den Upload erstellen
      const formData = new FormData();
      formData.append('image', file); // Muss mit dem Namen im Server übereinstimmen: upload.single('image')

      // Upload via Fetch API mit Progress Tracking
      const xhr = new XMLHttpRequest();

      // Progress-Handler
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      // Promise für XHR-Request erstellen
      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.open('POST', '/api/upload/product-image', true);
        xhr.withCredentials = true; // Wichtig: Sendet Cookies mit, um die Authentifizierung zu ermöglichen

        xhr.onload = () => {
          // Akzeptiere sowohl Status 200 als auch 201 (Created)
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log("Bild hochgeladen, Server-Antwort:", response);
              
              if (response.filePath) {
                resolve(response.filePath); // Server gibt 'filePath' zurück, nicht 'imageUrl'
              } else {
                console.error("Server lieferte kein filePath zurück:", response);
                reject(new Error('Server lieferte keinen Dateipfad zurück'));
              }
            } catch (e) {
              console.error("Fehler beim Parsen der Server-Antwort:", e, xhr.responseText);
              reject(new Error('Ungültige Serverantwort'));
            }
          } else {
            reject(new Error(`Server antwortete mit Status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Netzwerkfehler beim Upload'));
        xhr.send(formData);
      });

      // Warte auf den Upload und erhalte die Bild-URL
      const filePath = await uploadPromise;
      console.log("Bild hochgeladen, filePath:", filePath);

      // Füge das Bild zur temporären Liste hinzu, damit wir es löschen können, 
      // wenn der Benutzer abbricht oder das Formular zurücksetzt
      setTempUploadedImages(prev => [...prev, filePath]);
      console.log("Bild zur temporären Liste hinzugefügt:", filePath);

      // Neues Bild-Objekt für die Produktbilder-Liste
      const newImage: ProductImage = {
        imageUrl: filePath,
        filePath: filePath,
        isMain: currentImages.length === 0, // Erstes Bild ist das Hauptbild
        sortOrder: currentImages.length
      };

      // Aktualisiere die Produktbilder-Liste
      const updatedImages = [...currentImages, newImage];

      // Kodiere die Bilder für die Datenbank
      const encodedImages = encodeMultipleImages(updatedImages);

      // Aktualisiere das aktuelle Produkt
      setCurrentProduct(prev => {
        return {
          ...prev,
          // Speichere den kodierten String im imageUrl-Feld für die Datenbank
          imageUrl: encodedImages,
          // Für Legacy-Unterstützung: Verwende das Hauptbild auch im filePath-Feld
          filePath: updatedImages.find(img => img.isMain)?.imageUrl || updatedImages[0].imageUrl,
          // Auch die entschlüsselte Liste für die UI beibehalten
          productImages: updatedImages
        };
      });

      toast({
        title: "Bild hochgeladen",
        description: "Das Produktbild wurde erfolgreich hochgeladen.",
        variant: "success"
      });

    } catch (error) {
      console.error("Fehler beim Hochladen des Bildes:", error);
      toast({
        title: "Upload-Fehler",
        description: "Das Bild konnte nicht hochgeladen werden.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Das Hauptlayout der Komponente, angepasst für bessere Darstellung der Einkaufsliste
  // Handler für die Dialog-Aktionen
  const handleContinueShopping = () => {
    setShowAddMoreDialog(false);
  };
  
  const handleGoToDelivery = () => {
    setShowAddMoreDialog(false);
    // Wir teilen dem Eltern-Component mit, dass der Benutzer zur Lieferung fortfahren möchte
    // Dies wird durch einen Array mit den aktuellen Produkten gesendet
    onChange([...value]);
    
    // Jetzt lösen wir ein benutzerdefiniertes Event aus, um dem SteppedOrderForm zu signalisieren,
    // dass es zum nächsten Schritt (Lieferdetails) wechseln soll
    console.log("Löse 'goToNextStep' Event aus...");
    
    // Kurze Verzögerung hinzufügen, um sicherzustellen, dass die Ereignisverarbeitung in der richtigen Reihenfolge erfolgt
    setTimeout(() => {
      const event = new CustomEvent('goToNextStep');
      window.dispatchEvent(event);
      
      // Zusätzlich zum Anfang der Seite scrollen für eine bessere Benutzererfahrung
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  };

  return (
    <div id="product-form-top" className="flex flex-col gap-6">
      {/* Formularbereich */}
      <div className="space-y-6">
      {/* Dialog, der nach Produkthinzufügung erscheint */}
      <Dialog open={showAddMoreDialog} onOpenChange={setShowAddMoreDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Produkt hinzugefügt</DialogTitle>
            <DialogDescription>
              {/* Überprüfen, ob wir uns in der Edit-Order-Seite befinden */}
              {window.location.pathname.includes('/orders/') && window.location.pathname.includes('/edit') ? (
                // Dialog für die Bearbeitung einer bestehenden Bestellung
                "Möchten Sie weitere Produkte hinzufügen oder die Bearbeitung abschließen?"
              ) : (
                // Standard-Dialog für eine neue Bestellung
                "Möchten Sie weitere Produkte hinzufügen oder zu den Lieferdetails fortfahren?"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button variant="outline" onClick={handleContinueShopping} className="flex-1">
              Weiteres Produkt hinzufügen
            </Button>
            {/* Button je nach Kontext anpassen */}
            {window.location.pathname.includes('/orders/') && window.location.pathname.includes('/edit') ? (
              // Button für die Bearbeitung einer bestehenden Bestellung
              <Button 
                variant="default" 
                onClick={() => {
                  setShowAddMoreDialog(false);
                  // Löse ein Form-Submit-Event aus, das die Bearbeitung abschließt
                  const updateButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                  if (updateButton) {
                    updateButton.click();
                  }
                }} 
                className="flex-1"
              >
                Bearbeitung abschließen
              </Button>
            ) : (
              // Standard-Button für eine neue Bestellung
              <Button variant="default" onClick={handleGoToDelivery} className="flex-1">
                Zu Lieferdetails
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bestätigungsdialog zum Löschen eines Produkts */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" /> 
              Produkt wirklich löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie dieses Produkt aus Ihrer Bestellung entfernen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (productToDelete !== null) {
                  handleRemoveProduct(productToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Produkt löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Single Product Form */}
      <div id="product-form-inputs" className="bg-green-100 p-5 rounded-lg border-2 border-green-300 focus-within:border-primary shadow-md w-full">
        <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center">
          {editingState.isEditing ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 mr-2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 mr-2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" x2="18" y1="17" y2="17"/></svg>
          )}
          {editingState.isEditing ? 'Produkt bearbeiten' : 'Neues Produkt zu Ihrer Einkaufsliste hinzufügen'}
        </h3>

        {/* Geschäft als erstes Feld - mit Autovervollständigung */}
        <div className="mb-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-700">
              Geschäft <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="store-input"
                placeholder="z.B. Rewe"
                value={currentProduct.store}
                onChange={(e) => {
                  const newValue = e.target.value;
                  
                  // Debug-Log für Benutzeraktionen
                  console.log("Store-Eingabe geändert:", newValue);
                  
                  // Das aktuelle Produkt aktualisieren
                  setCurrentProduct({...currentProduct, store: newValue});
                  
                  // Autovervollständigung anzeigen oder ausblenden
                  setShowStoreAutocomplete(newValue.trim() !== "");
                }}
                onFocus={() => {
                  // Debug-Log für Fokus-Ereignis
                  console.log("Store-Eingabefeld fokussiert, aktuelle Store-Liste:", usedStores);
                  
                  // Zeige Autovervollständigung bei Fokus, wenn Werte vorhanden sind
                  if (usedStores.length > 0) {
                    setShowStoreAutocomplete(true);
                    console.log("Autovervollständigung bei Fokus angezeigt");
                  }
                }}
                onBlur={(e) => {
                  // Verzögert ausblenden, damit Klick auf Vorschlag funktioniert
                  console.log("Store-Eingabefeld Blur-Event");
                  setTimeout(() => {
                    setShowStoreAutocomplete(false);
                    console.log("Autovervollständigung nach Blur-Event ausgeblendet");
                  }, 200);
                }}
                className="border-green-300 focus:border-green-500 focus:ring-green-500"
              />
              
              {/* Autovervollständigungs-Dropdown mit verbesserten Styles */}
              {showStoreAutocomplete && usedStores.length > 0 && (
                <div 
                  className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm border-2 border-green-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Überschrift für die Vorschläge */}
                  <div className="px-4 py-2 bg-green-50 text-green-800 text-sm font-medium border-b border-green-100">
                    Verfügbare Geschäfte
                  </div>
                  
                  {/* Filtern und Anzeigen der relevanten Geschäftsnamen */}
                  {usedStores
                    .filter(store => {
                      // Wenn keine Eingabe, zeige alle an
                      if (currentProduct.store.trim() === "") return true;
                      
                      // Fall-insensitive Filterung - zeige Namen, die den eingegebenen Text enthalten
                      return store.toLowerCase().includes(currentProduct.store.toLowerCase());
                    })
                    .map((store, index) => (
                      <div
                        key={index}
                        className="cursor-pointer hover:bg-green-50 py-2 px-4 transition-colors duration-150 ease-in-out"
                        onClick={() => {
                          console.log("Geschäft ausgewählt:", store);
                          setCurrentProduct(prev => ({...prev, store: store}));
                          setShowStoreAutocomplete(false);
                          
                          // Fokus zurück auf das Eingabefeld setzen
                          document.getElementById('store-input')?.focus();
                        }}
                      >
                        {store}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600">
              Geben Sie hier den Namen des Geschäfts ein, in dem Sie einkaufen möchten
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormItem>
              <FormLabel className="text-sm font-bold text-gray-700">
                Produktname <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="z.B. Vollmilch 1L"
                  value={currentProduct.productName}
                  onChange={(e) => setCurrentProduct({...currentProduct, productName: e.target.value})}
                  className="border-green-300 focus:border-green-500 focus:ring-green-500"
                />
              </FormControl>
            </FormItem>
          </div>

          <div>
            <FormItem>
              <FormLabel className="text-sm font-bold text-gray-700">
                Menge <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="z.B. 2 oder 500g"
                  value={currentProduct.quantity}
                  onChange={(e) => setCurrentProduct({...currentProduct, quantity: e.target.value})}
                  className="border-green-300 focus:border-green-500 focus:ring-green-500"
                />
              </FormControl>
            </FormItem>
          </div>
        </div>

        {/* Bildupload Bereich */}
        <div className="mt-3">
          <FormItem>
            <FormLabel className="text-sm font-bold text-gray-700">
              Produktbild (optional)
            </FormLabel>
            <div className="mt-2 flex flex-col space-y-3">

              {/* Bildergalerie - wenn mehrere Bilder oder mindestens ein einzelnes Bild vorhanden sind */}
              {/* Prüfe zuerst auf neue productImages-Liste, dann auf Legacy-Bildpfade */}
              {(
                (currentProduct.productImages && currentProduct.productImages.length > 0) || 
                currentProduct.imageUrl || 
                currentProduct.filePath
              ) && (
                <div className="border-2 border-gray-300 rounded-md p-3 bg-white shadow-sm">
                  <h4 className="font-medium text-sm mb-2 text-gray-700">Produktbilder:</h4>

                  {/* Grid für mehrere Bilder */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Neue Produktbilder-Liste */}
                    {currentProduct.productImages && currentProduct.productImages.length > 0 ? (
                      // Zeige Bilder aus der productImages-Liste an
                      currentProduct.productImages.map((image, index) => (
                        <div key={`image-${index}`} className="relative">
                          <img 
                            src={image.imageUrl} 
                            alt={`Produktbild ${index + 1}`} 
                            className={`border ${image.isMain ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-300'} 
                                        rounded-md object-cover w-full h-24 bg-white p-1 cursor-pointer`}
                            onClick={() => {
                              // Vorschau des Bildes in Großansicht
                              setZoomedImageSrc(image.imageUrl);
                              setImageZoomDialogOpen(true);
                            }}
                            onError={(e) => {
                              console.error("Bild konnte nicht geladen werden:", image.imageUrl);
                              (e.target as HTMLImageElement).alt = "Bild nicht verfügbar";
                              (e.target as HTMLImageElement).className = "border-2 border-red-300 rounded-md w-full p-1 text-center text-xs text-red-500";
                            }}
                          />

                          {/* Badge für das Hauptbild */}
                          {image.isMain && (
                            <div className="absolute top-1 left-1 bg-green-500 text-white text-[10px] px-1 rounded">
                              Hauptbild
                            </div>
                          )}

                          {/* Aktionen für dieses Bild */}
                          <div className="absolute -top-2 -right-2 flex space-x-1">
                            {/* Hauptbild-Schalter - nur anzeigen, wenn es nicht bereits das Hauptbild ist */}
                            {!image.isMain && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full w-6 h-6 p-0 flex items-center justify-center bg-green-100 border-green-300 hover:bg-green-200"
                                onClick={() => {
                                  // Setze dieses Bild als Hauptbild und alle anderen auf nicht-Hauptbild
                                  setCurrentProduct(prev => ({
                                    ...prev,
                                    // Aktualisiere auch die legacy-Felder, damit die Kompatibilität gewahrt bleibt
                                    imageUrl: image.imageUrl,
                                    filePath: image.filePath,
                                    productImages: prev.productImages?.map((img, i) => ({
                                      ...img,
                                      isMain: i === index
                                    }))
                                  }));
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-700">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </Button>
                            )}

                            {/* Lösch-Button */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="rounded-full w-6 h-6 p-0 flex items-center justify-center"
                              onClick={async () => {
                                try {
                                  // Prüfe, ob der Benutzer angemeldet ist
                                  if (!isAuthenticated) {
                                    toast({
                                      title: "Anmeldung erforderlich",
                                      description: "Bitte melden Sie sich an, um Bilder zu löschen.",
                                      variant: "destructive"
                                    });
                                    return;
                                  }

                                  // Lösche das Bild vom Server
                                  const response = await fetch('/api/upload/product-image', {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ filePath: image.filePath })
                                  });

                                  if (response.ok) {
                                    // Entferne das Bild aus der Liste
                                    const updatedImages = currentProduct.productImages?.filter((_, i) => i !== index) || [];

                                    // Wenn das gelöschte Bild das Hauptbild war und noch andere Bilder vorhanden sind,
                                    // setze das erste verbleibende Bild als Hauptbild
                                    if (image.isMain && updatedImages.length > 0) {
                                      updatedImages[0].isMain = true;

                                      // Aktualisiere auch die Legacy-Felder
                                      setCurrentProduct({
                                        ...currentProduct,
                                        imageUrl: updatedImages[0].imageUrl,
                                        filePath: updatedImages[0].filePath,
                                        productImages: updatedImages
                                      });
                                    } else {
                                      // Wenn kein Bild übrig bleibt oder das gelöschte nicht das Hauptbild war
                                      const shouldClearLegacy = image.isMain || updatedImages.length === 0;

                                      setCurrentProduct({
                                        ...currentProduct,
                                        imageUrl: shouldClearLegacy ? "" : currentProduct.imageUrl,
                                        filePath: shouldClearLegacy ? "" : currentProduct.filePath,
                                        productImages: updatedImages
                                      });
                                    }

                                    toast({
                                      title: "Bild gelöscht",
                                      description: "Das Produktbild wurde erfolgreich gelöscht.",
                                      variant: "success"
                                    });
                                  } else {
                                    console.error("Fehler beim Löschen des Bildes:", await response.text());
                                    toast({
                                      title: "Fehler",
                                      description: "Das Bild konnte nicht gelöscht werden.",
                                      variant: "destructive"
                                    });
                                  }
                                } catch (error) {
                                  console.error("Fehler beim Löschen des Bildes:", error);
                                  toast({
                                    title: "Fehler",
                                    description: "Ein unerwarteter Fehler ist aufgetreten.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              <TrashIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Legacy-Unterstützung für einzelnes Bild (wenn productImages leer ist)
                      <div className="relative col-span-3">
                        <img 
                          src={currentProduct.imageUrl || currentProduct.filePath} 
                          alt="Produktbild" 
                          className="border-2 border-gray-300 rounded-md object-contain w-full h-auto max-h-[200px] bg-white p-2" 
                          onError={(e) => {
                            console.error("Bild konnte nicht geladen werden:", currentProduct.imageUrl || currentProduct.filePath);
                            (e.target as HTMLImageElement).alt = "Bild nicht verfügbar";
                            (e.target as HTMLImageElement).className = "border-2 border-red-300 rounded-md w-full p-4 text-center text-sm text-red-500";
                          }}
                          onClick={() => {
                            // Vorschau des Bildes in Großansicht
                            setZoomedImageSrc(currentProduct.imageUrl || currentProduct.filePath || "");
                            setImageZoomDialogOpen(true);
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 rounded-full w-8 h-8 p-0 flex items-center justify-center"
                          onClick={async () => {
                            try {
                              // Prüfe, ob der Benutzer angemeldet ist
                              if (!isAuthenticated) {
                                toast({
                                  title: "Anmeldung erforderlich",
                                  description: "Bitte melden Sie sich an, um Bilder zu löschen.",
                                  variant: "destructive"
                                });
                                return;
                              }

                              if (currentProduct.imageUrl) {
                                // Extrahiere Dateiname aus URL
                                const filePath = currentProduct.imageUrl;

                                // Sende Löschanfrage an den Server
                                const response = await fetch('/api/upload/product-image', {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({ filePath })
                                });

                                if (response.ok) {
                                  toast({
                                    title: "Bild gelöscht",
                                    description: "Das Produktbild wurde erfolgreich gelöscht.",
                                    variant: "success"
                                  });
                                } else {
                                  console.error("Fehler beim Löschen des Bildes:", await response.text());
                                }
                              }
                            } catch (error) {
                              console.error("Fehler beim Löschen des Bildes:", error);
                            } finally {
                              // Unabhängig vom Ergebnis des API-Aufrufs das Bild aus dem UI entfernen
                              // Beide Bildpfade zurücksetzen
                              setCurrentProduct({...currentProduct, imageUrl: "", filePath: "", productImages: []})
                            }
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Anzeige der Anzahl der Bilder und des verbleibenden Limits */}
                  <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
                    <span>
                      {currentProduct.productImages?.length || 1} von 3 Bildern
                    </span>
                  </div>
                </div>
              )}

              {/* Upload Buttons werden immer angezeigt, solange weniger als 3 Bilder vorhanden sind */}
              {(currentProduct.productImages?.length || 0) < 3 && (
                <div className="flex flex-wrap gap-2 justify-center mt-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                  <p className="w-full text-sm text-gray-600 mb-2 text-center">
                    Laden Sie bis zu 3 Bilder hoch:
                  </p>
                  
                  {/* Datei hochladen Button */}
                  <div>
                    <input
                      type="file"
                      id="file-upload"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          // Prüfe, ob der Benutzer angemeldet ist
                          if (!isAuthenticated) {
                            toast({
                              title: "Anmeldung erforderlich",
                              description: "Bitte melden Sie sich an, um Bilder hochzuladen.",
                              variant: "destructive"
                            });
                            return;
                          }

                          const file = e.target.files[0];

                          // Direkter Aufruf der uploadProductImage-Funktion
                          uploadProductImage(file)
                            .catch(error => {
                              console.error("Fehler beim Hochladen des Bildes:", error);
                              toast({
                                title: "Fehler beim Hochladen",
                                description: "Das Bild konnte nicht hochgeladen werden. Bitte versuchen Sie es erneut.",
                                variant: "destructive"
                              });
                            })
                            .finally(() => {
                              // Reset file input
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            });
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Prüfe, ob der Benutzer angemeldet ist
                        if (!isAuthenticated) {
                          toast({
                            title: "Anmeldung erforderlich",
                            description: "Bitte melden Sie sich an, um Bilder hochzuladen.",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Prüfe, ob bereits 3 Bilder vorhanden sind
                        if (currentProduct.productImages && currentProduct.productImages.length >= 3) {
                          toast({
                            title: "Maximum erreicht",
                            description: "Sie können maximal 3 Bilder pro Produkt hochladen.",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Öffne den Datei-Dialog nur wenn weniger als 3 Bilder vorhanden sind
                        // Sicherstellen dass das Feld zurückgesetzt ist vor dem Klicken
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploading}
                      className="flex items-center gap-2 border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      <UploadIcon className="h-4 w-4" />
                      <span>Vom Gerät</span>
                    </Button>
                  </div>

                  {/* Kamerabild aufnehmen Button */}
                  <Dialog 
                    open={cameraDialogOpen} 
                    onOpenChange={(open) => {
                      // Wenn Dialog geschlossen wird, nur Zustand aktualisieren
                      if (!open) {
                        setCameraDialogOpen(false);
                        return;
                      }

                      // Prüfe Authentifizierung beim Öffnen des Dialogs
                      if (!isAuthenticated) {
                        toast({
                          title: "Anmeldung erforderlich",
                          description: "Bitte melden Sie sich an, um die Kamera zu verwenden.",
                          variant: "destructive"
                        });
                        return;
                      }

                      // Prüfe, ob bereits 3 Bilder vorhanden sind
                      if (currentProduct.productImages && currentProduct.productImages.length >= 3) {
                        toast({
                          title: "Maximum erreicht",
                          description: "Sie können maximal 3 Bilder pro Produkt hochladen.",
                          variant: "destructive"
                        });
                        return;
                      }

                      // Öffne den Dialog nur, wenn weniger als 3 Bilder vorhanden sind
                      setCameraDialogOpen(true);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        className="flex items-center gap-2 border-green-300 bg-green-50 text-green-600 hover:bg-green-100"
                      >
                        <CameraIcon className="h-4 w-4" />
                        <span>Kamera</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Foto aufnehmen</DialogTitle>
                        <DialogDescription>
                          Nehmen Sie ein Foto des Produkts mit Ihrer Kamera auf
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <div id="camera-container" className="w-full h-[300px] bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                          {!isCameraActive && (
                            <p className="text-gray-500">Kamera wird initialisiert...</p>
                          )}
                          <video 
                            ref={videoRef} 
                            className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
                            autoPlay
                            playsInline
                            muted
                          />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <div className="flex justify-center mt-4 gap-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setCameraDialogOpen(false);
                              // Stoppt die Kamera, wenn der Dialog geschlossen wird
                              if (isCameraActive && videoRef.current?.srcObject) {
                                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                                tracks.forEach(track => track.stop());
                                setIsCameraActive(false);
                              }
                            }}
                          >
                            Abbrechen
                          </Button>
                          <Button 
                            type="button" 
                            className="bg-green-600 hover:bg-green-700" 
                            disabled={!isCameraActive}
                            onClick={capturePhoto}
                          >
                            Foto aufnehmen
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* Fortschrittsanzeige */}
              {isUploading && (
                <div className="w-full max-w-[250px] mx-auto mt-2">
                  <p className="text-sm text-gray-600 mb-1">Upload läuft... {Math.round(uploadProgress)}%</p>
                  <Progress value={uploadProgress} max={100} className="h-2" />
                </div>
              )}
            </div>
          </FormItem>
        </div>

        <div className="mt-3">
          <FormItem>
            <FormLabel className="text-sm font-bold text-gray-700">
              Anmerkungen
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Besondere Hinweise zum Produkt (z.B. bestimmte Marke)"
                value={currentProduct.notes || ''}
                onChange={(e) => setCurrentProduct({...currentProduct, notes: e.target.value})}
                className="border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            </FormControl>
          </FormItem>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          {editingState.isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Abbrechen
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSaveProduct}
            disabled={!isValidProduct(currentProduct)}
            className={`${editingState.isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
          >
            {editingState.isEditing ? 'Produkt aktualisieren' : 'Produkt zur Liste hinzufügen'} 
          </Button>
        </div>
      </div>

      {/* End of product input form */}
      </div>
      
      {/* Einkaufsliste - jetzt unterhalb des Produktformulars */}
      {value && value.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-md mt-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 mr-2"><path d="M2 7.5h11.5a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H5.5"/><path d="M14 15v4.5"/><path d="M5.5 11.5V15"/><path d="M8 15h0a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2"/></svg>
            Ihre Einkaufsliste
          </h3>

          {/* Desktop-Ansicht für größere Bildschirme */}
          <div className="hidden md:block rounded-md border shadow-sm overflow-hidden">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4">Produkt</th>
                  <th className="text-left py-3 px-4">Menge</th>
                  <th className="text-left py-3 px-4">Geschäft</th>
                  <th className="text-left py-3 px-4 w-1/4">Anmerkungen</th>
                  <th className="text-center py-3 px-4">Bild</th>
                  <th className="text-center py-3 px-4">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {value.map((product, index) => {
                  // Wechselnde Farben für die Zeilen
                  const bgColorClass = index % 2 === 0 ? 'bg-white' : 'bg-blue-50/30';
                  const rowClass = editingState.isEditing && editingState.index === index 
                    ? 'bg-blue-100 border-b border-blue-200' 
                    : `${bgColorClass} border-b border-gray-200`;

                  return (
                    <tr key={index} className={rowClass}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {product.productName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {product.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {product.store || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="max-w-[120px]">
                          {product.notes 
                            ? (product.notes.length > 10 
                               ? product.notes.substring(0, 10) + "..." 
                               : product.notes)
                            : "-"}
                          {product.notes && product.notes.length > 10 && (
                            <span 
                              className="ml-1 text-xs text-blue-600 cursor-pointer hover:underline"
                              title={product.notes}
                              onClick={() => {
                                toast({
                                  title: "Anmerkung",
                                  description: product.notes,
                                  variant: "default"
                                });
                              }}
                            >
                              ↗
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {/* Prüfe auf kodierte Bilder (MULTI:...) oder reguläre Bilder */}
                        {(() => {
                          // Bilder aus dem Produkt extrahieren
                          let images: ProductImage[] = [];

                          // Prüfe zunächst auf kodierte Bilder (MULTI:...)
                          if (product.imageUrl && product.imageUrl.startsWith("MULTI:")) {
                            // Dekodieren und verwenden
                            images = decodeMultipleImages(product.imageUrl);
                          } 
                          // Dann auf einzelne Bilder prüfen
                          else if (product.imageUrl || product.filePath) {
                            // Ein einzelnes Bild erstellen
                            images = [{
                              id: 0,
                              imageUrl: product.imageUrl || product.filePath || "",
                              isMain: true,
                              sortOrder: 0
                            }];
                          }

                          // Wenn keine Bilder vorhanden sind, Strich anzeigen
                          if (images.length === 0) {
                            return <span className="text-gray-400">-</span>;
                          }

                          // Zeige eine Miniatur-Galerie, wenn Bilder vorhanden sind
                          return (
                            <div className="flex justify-center items-center gap-1">
                              {images.slice(0, 3).map((image, imageIndex) => (
                                <div key={`product-${index}-image-${imageIndex}`} className="relative group">
                                  <button 
                                    type="button"
                                    className={`w-10 h-10 flex items-center justify-center rounded-md border ${image.isMain ? 'border-green-500 ring-1 ring-green-300' : 'border-gray-300'} bg-white p-1 shadow-sm group-hover:border-blue-400 transition-all overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    title={image.isMain ? "Hauptbild (klicken zum Vergrößern)" : "Produktbild vergrößern"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();

                                      // Setze das Bild für die Großansicht
                                      setZoomedImageSrc(image.imageUrl);
                                      // Öffne den Dialog
                                      setImageZoomDialogOpen(true);
                                    }}
                                  >
                                    <img 
                                      src={image.imageUrl} 
                                      alt={`Produktbild ${imageIndex + 1} für ${product.productName}`} 
                                      className="object-cover w-full h-full"
                                      onError={(e) => {
                                        console.error("Bild konnte nicht geladen werden:", image.imageUrl);
                                        (e.target as HTMLImageElement).alt = "!";
                                        (e.target as HTMLImageElement).className = "text-xs text-red-500";
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                      </svg>
                                    </div>
                                  </button>

                                  {/* Badge für das Hauptbild */}
                                  {image.isMain && (
                                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full w-3 h-3"></div>
                                  )}
                                </div>
                              ))}

                              {/* Zähler für zusätzliche Bilder über 3 */}
                              {images.length > 3 && (
                                <div className="text-xs text-blue-600 font-medium">
                                  +{images.length - 3}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium">
                        <div className="flex flex-row space-x-1 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Bearbeiten"
                            onClick={(e) => handleEditProduct(index, e)}
                            className={`text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8 ${editingState.isEditing && editingState.index === index ? 'hidden' : ''}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Löschen"
                            onClick={(e) => openDeleteDialog(index, e)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile-Ansicht - kompaktere Version */}
          <div className="md:hidden space-y-2">
            {value.map((product, index) => {
              // Konsistente Farbe für alle Karten
              const cardColor = 'bg-blue-50 border-blue-200';              
              const activeCardColor = 'bg-blue-100 border-blue-300';

              return (
                <div 
                  key={index} 
                  className={`border rounded-lg py-3 px-4 shadow-sm ${editingState.isEditing && editingState.index === index ? activeCardColor : cardColor}`}
                >
                  <div className="flex flex-col gap-2">
                    {/* Hauptzeile mit Bild, Produktname und Aktionen in einer Reihe */}
                    <div className="flex items-center justify-between">
                      {/* Linker Bereich mit Bild und Produktname */}
                      <div className="flex items-center gap-2">
                        {/* Bild Vorschau (wenn vorhanden) */}
                        <div className="flex-shrink-0">
                          {(() => {
                            // Bilder aus dem Produkt extrahieren
                            let images: ProductImage[] = [];

                            // Prüfe zunächst auf kodierte Bilder (MULTI:...)
                            if (product.imageUrl && product.imageUrl.startsWith("MULTI:")) {
                              images = decodeMultipleImages(product.imageUrl);
                            } 
                            else if (product.imageUrl || product.filePath) {
                              images = [{
                                id: 0,
                                imageUrl: product.imageUrl || product.filePath || "",
                                isMain: true,
                                sortOrder: 0
                              }];
                            }

                            // Wenn keine Bilder vorhanden sind, Platzhalter anzeigen
                            if (images.length === 0) {
                              return <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-xs text-gray-400 border border-gray-200 rounded-md bg-gray-50">Kein Bild</span>;
                            }

                            // Nehme das Hauptbild oder das erste Bild
                            const mainImage = images.find(img => img.isMain) || images[0];

                            return (
                              <div 
                                className="relative group cursor-pointer flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setZoomedImageSrc(mainImage.imageUrl);
                                  setImageZoomDialogOpen(true);
                                }}
                              >
                                <img 
                                  src={mainImage.imageUrl} 
                                  alt="Produktbild" 
                                  className="w-10 h-10 object-contain rounded-md border border-gray-300 bg-white p-0.5 shadow-sm group-hover:border-blue-400 transition-all" 
                                  onError={(e) => {
                                    console.error("Mobiles Bild konnte nicht geladen werden:", mainImage.imageUrl);
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute top-0 right-0 opacity-70">
                                  <div className="bg-blue-600 text-white rounded-full p-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path></svg>
                                  </div>
                                </div>

                                {/* Badge für mehrere Bilder */}
                                {images.length > 1 && (
                                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full text-[8px] w-4 h-4 flex items-center justify-center">
                                    {images.length}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Produktname und Menge */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center">
                            <span className="text-xs bg-white px-1.5 py-0.5 rounded border border-blue-200 mr-1.5">{product.quantity}x</span>
                            <p className="text-sm font-semibold truncate">{product.productName.length > 25 
                              ? product.productName.substring(0, 25) + "..." 
                              : product.productName}</p>
                          </div>
                          <div className="flex items-center mt-0.5">
                            <span className="text-xs bg-white py-0.5 px-1.5 rounded-full border border-gray-200 text-gray-600">{product.store || "-"}</span>
                            
                            {/* Anmerkungen in derselben Zeile */}
                            {product.notes && (
                              <span className="ml-2 text-xs text-gray-600">
                                {product.notes.length > 10 
                                  ? product.notes.substring(0, 10) + "..." 
                                  : product.notes}
                                {product.notes.length > 10 && (
                                  <span 
                                    className="ml-1 text-xs text-blue-600 font-medium cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast({
                                        title: "Anmerkung",
                                        description: product.notes,
                                        variant: "default"
                                      });
                                    }}
                                  >
                                    mehr ↗
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rechter Bereich mit Aktionen */}
                      <div className="flex flex-col space-y-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Bearbeiten"
                          onClick={(e) => handleEditProduct(index, e)}
                          className={`h-7 w-7 text-blue-600 hover:bg-blue-50 ${editingState.isEditing && editingState.index === index ? 'hidden' : ''}`}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Löschen"
                          onClick={(e) => openDeleteDialog(index, e)}
                          className="h-7 w-7 text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bildzoom-Dialog - verbesserte Version für bessere Zuverlässigkeit */}
      <Dialog 
        open={imageZoomDialogOpen} 
        onOpenChange={(open) => {
          console.log("Dialog-Status wird geändert zu:", open);
          // Ohne Verzögerung setzen, da wir nicht mehrfach den gleichen Zustand setzen wollen
          setImageZoomDialogOpen(open);
        }}
      >
        <DialogContent className="p-0 max-w-3xl overflow-hidden">
          <DialogHeader className="p-4 bg-gray-800 text-white sticky top-0 z-10 shadow-md">
            <DialogTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              Produktbild vergrößert
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Klicken Sie außerhalb des Bildes oder auf X, um zu schließen
            </DialogDescription>
          </DialogHeader>
          <div className="relative p-1 bg-gray-100 flex items-center justify-center min-h-[300px] max-h-[70vh]">
            {zoomedImageSrc && (
              <div className="relative flex items-center justify-center w-full h-full overflow-auto">
                <img 
                  src={zoomedImageSrc} 
                  alt="Vergrößertes Produktbild" 
                  className="max-w-full max-h-[70vh] object-contain"
                  onError={(e) => {
                    console.error("Fehlgeschlagen beim Laden des vergrößerten Bildes:", zoomedImageSrc);
                    (e.target as HTMLImageElement).alt = "Bild konnte nicht geladen werden";
                    (e.target as HTMLImageElement).className = "border-2 border-red-300 rounded-md p-4 text-center text-sm text-red-500";
                  }}
                />
              </div>
            )}
            <DialogClose className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductEntryForm;
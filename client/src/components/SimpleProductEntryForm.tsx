import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { InsertOrderItem } from "@shared/schema";
import { Control } from "react-hook-form";
import { PenLine, Loader2 } from 'lucide-react';
import { CameraIcon, ImageIcon, UploadIcon } from "@/components/ui/icons";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

// Funktion zum Kodieren von Bildern im MULTI-Format
function encodeMultipleImages(images: { url: string; isMain?: boolean; order?: number }[]): string {
  if (!images || images.length === 0) {
    return "";
  }
  
  try {
    // JSON-Serialisierung
    const jsonString = JSON.stringify(images);
    // URL-Kodierung
    const encodedJsonString = encodeURIComponent(jsonString);
    // Base64-Kodierung
    const base64String = btoa(encodedJsonString);
    // MULTI-Präfix hinzufügen
    return `MULTI:${base64String}`;
  } catch (error) {
    console.error("Fehler beim Kodieren von Bildern:", error);
    return images[0].url; // Fallback: Erstes Bild direkt zurückgeben
  }
}

interface ProductEntryFormProps {
  control: Control<any>;
  name: string;
  value?: InsertOrderItem[];
  onChange?: (items: InsertOrderItem[]) => void;
  storeValue?: string;
  singleItemMode?: boolean;
}

// Einfache Version der ProductEntryForm ohne FormContext
const SimpleProductEntryForm = ({
  value = [],
  onChange = () => {},
  storeValue = "",
  singleItemMode = false
}: ProductEntryFormProps) => {
  // Debug-Logging: Welche Produkte wurden übergeben?
  console.log("SimpleProductEntryForm - erhaltene Produkte:", JSON.stringify(value));
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State für Kamera und Bild-Upload
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // State für Bild-Vergrößerung
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  
  // Unterstützt jetzt mehrere Bilder
  const [currentProduct, setCurrentProduct] = useState<InsertOrderItem & {
    imageUrl?: string;
    filePath?: string;
    productImages?: { url: string; isMain: boolean; order: number }[];
  }>({
    productName: "",
    quantity: "1",
    store: storeValue || "",
    notes: "",
    imageUrl: "",
    filePath: "",
    productImages: []
  });

  // Übernehme den Store-Wert, falls er sich ändert
  useEffect(() => {
    if (storeValue) {
      console.log("Store-Wert geändert in SimpleProductEntryForm:", storeValue);
      setCurrentProduct(prev => ({
        ...prev,
        store: storeValue
      }));
    }
  }, [storeValue]);

  // Liste der bereits verwendeten Geschäfte für Autovervollständigung
  const [usedStores, setUsedStores] = useState<string[]>(["Rewe", "Aldi", "Kaufland", "Lidl", "Edeka", "Netto"]);
  
  // Zustand für die Anzeige der Autovervollständigungsliste
  const [showStoreAutocomplete, setShowStoreAutocomplete] = useState(false);
  
  // Benutze den storeValue auch als initialen Wert
  useEffect(() => {
    // Diese Funktion findet den besten Store-Wert basierend auf verschiedenen Quellen
    const getBestStoreValue = (): string => {
      // Prioritätsreihenfolge:
      // 1. Übergeordneter storeValue vom Parent-Component (kommt vom letzten hinzugefügten Produkt)
      // 2. Aktueller Store-Wert, falls bereits gesetzt
      
      // Verwende den übergeordneten storeValue, der vom SteppedOrderForm weitergegeben wird
      // (dieser enthält bereits den Wert des zuletzt hinzugefügten Produkts)
      if (storeValue?.trim()) {
        console.log("Verwende übergeordneten storeValue:", storeValue);
        return storeValue;
      }
      
      // Wenn der Store des aktuellen Produkts bereits gesetzt ist, behalte ihn
      if (currentProduct.store?.trim()) {
        console.log("Behalte aktuellen Store-Wert:", currentProduct.store);
        return currentProduct.store;
      }
      
      // Wenn alles andere fehlschlägt, gib einen leeren String zurück
      return "";
    };
    
    const bestStoreValue = getBestStoreValue();
    console.log("Bester Store-Wert für SimpleProductEntryForm:", bestStoreValue);
    
    // Nur aktualisieren, wenn sich der Wert ändert oder leer ist
    if (bestStoreValue !== currentProduct.store || !currentProduct.store) {
      console.log("Aktualisiere Store-Feld mit dem besten Wert:", bestStoreValue);
      setCurrentProduct(prev => ({
        ...prev,
        store: bestStoreValue
      }));
    }
  }, [storeValue, value]);
  
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
    if (uniqueStores.length > 0) {
      console.log("Einzigartige Geschäfte für Autovervollständigung in SimpleProductEntryForm:", uniqueStores);
      setUsedStores(prev => {
        // Beginne mit den vordefinierten Geschäften als Basis
        const baseStores = ["Rewe", "Aldi", "Kaufland", "Lidl", "Edeka", "Netto"];
        // Kombiniere mit den gefundenen, eindeutigen Geschäften
        return Array.from(new Set([...baseStores, ...uniqueStores]));
      });
    }
  }, [value, storeValue, currentProduct.store]);

  // Prüfe, ob ein Produkt gültig ist
  const isValidProduct = () => {
    const valid = (
      currentProduct.productName.trim() !== "" &&
      currentProduct.quantity.trim() !== "" &&
      currentProduct.store?.trim() !== ""
    );
    if (!valid) {
      console.log("Ungültiges Produkt:", {
        name: currentProduct.productName,
        quantity: currentProduct.quantity,
        store: currentProduct.store
      });
    }
    return valid;
  };
  
  // Datei-Upload-Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File change triggered");
    if (!e.target.files || e.target.files.length === 0) {
      console.log("No files selected");
      return;
    }
    
    const file = e.target.files[0];
    console.log("Processing file:", file.name);
    
    // Prüfen, ob der Benutzer eingeloggt ist
    if (!isAuthenticated) {
      console.log("Benutzer ist nicht authentifiziert");
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melden Sie sich an, um Bilder hochzuladen.",
        variant: "destructive"
      });
      
      // Datei-Input zurücksetzen
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // Prüfen, ob bereits 3 Bilder vorhanden sind
    const currentImages = currentProduct.productImages || [];
    if (currentImages.length >= 3) {
      toast({
        title: "Maximum erreicht",
        description: "Sie können maximal 3 Bilder pro Produkt hochladen.",
        variant: "destructive"
      });
      
      // Datei-Input zurücksetzen
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    try {
      console.log("Uploading image for authenticated user:", user?.username);
      await uploadProductImage(file);
      console.log("File upload completed successfully");
    } catch (error) {
      console.error("Error during file upload:", error);
      toast({
        title: "Upload fehlgeschlagen",
        description: "Das Bild konnte nicht hochgeladen werden. Bitte versuchen Sie es erneut.",
        variant: "destructive"
      });
    } finally {
      // Sicherstellen, dass das Input-Feld in jedem Fall zurückgesetzt wird
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        console.log("File input reset");
      }
    }
  };
  
  // Kamera starten
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Fehler beim Zugriff auf die Kamera:", error);
      toast({
        title: "Fehler",
        description: "Konnte nicht auf die Kamera zugreifen. Bitte überprüfen Sie Ihre Berechtigungen.",
        variant: "destructive"
      });
    }
  };
  
  // Kamera beenden
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };
  
  // Bei Dialogschließung Kamera beenden
  useEffect(() => {
    if (!cameraDialogOpen && cameraStream) {
      stopCamera();
    }
  }, [cameraDialogOpen]);
  
  // Foto aufnehmen
  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    // Prüfen, ob der Benutzer eingeloggt ist
    if (!isAuthenticated) {
      console.log("Benutzer ist nicht authentifiziert");
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melden Sie sich an, um Bilder aufzunehmen und hochzuladen.",
        variant: "destructive"
      });
      setCameraDialogOpen(false);
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx && videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `camera_image_${Date.now()}.jpg`, { type: 'image/jpeg' });
          console.log("Uploading camera image for authenticated user:", user?.username);
          await uploadProductImage(file);
          setCameraDialogOpen(false);
        }
      }, 'image/jpeg', 0.8);
    }
  };
  
  // Helfer-Funktion zum Hinzufügen eines Bildes
  const addImageToProduct = (imagePath: string) => {
    // Prüfen, ob bereits 3 Bilder vorhanden sind
    const currentImages = currentProduct.productImages || [];
    if (currentImages.length >= 3) {
      toast({
        title: "Maximale Anzahl erreicht",
        description: "Es können maximal 3 Bilder pro Produkt hochgeladen werden.",
        variant: "destructive"
      });
      return false;
    }
    
    // Neues Bild hinzufügen
    const newImage = {
      url: imagePath,
      isMain: currentImages.length === 0, // Erstes Bild ist Hauptbild
      order: currentImages.length
    };
    
    const updatedImages = [...currentImages, newImage];
    
    // Aktualisiere den Produktzustand
    setCurrentProduct({
      ...currentProduct,
      // Für Abwärtskompatibilität behalten wir das erste Bild auch in imageUrl/filePath
      imageUrl: updatedImages[0].url,
      filePath: updatedImages[0].url,
      productImages: updatedImages
    });
    
    return true;
  };
  
  // Bild hochladen
  const uploadProductImage = async (file: File) => {
    try {
      if (!isAuthenticated) {
        toast({
          title: "Nicht angemeldet",
          description: "Sie müssen angemeldet sein, um Bilder hochzuladen.",
          variant: "destructive"
        });
        return;
      }
      
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'  // Wichtig: Sendet Cookies mit, um die Authentifizierung zu ermöglichen
      });
      
      if (!response.ok) {
        throw new Error('Bild-Upload fehlgeschlagen');
      }
      
      // Überprüfen, ob die Antwort JSON-Daten enthält
      const contentType = response.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // Fallback, wenn keine JSON-Daten zurückgegeben wurden
        console.log("Keine JSON-Antwort erhalten");
        data = {
          imageUrl: `/uploads/products/${file.name}`,
          filePath: `/uploads/products/${file.name}`
        };
      }
      
      console.log("Upload-Antwort:", data);
      
      // Überprüfen, ob die erforderlichen Felder in der Antwort enthalten sind
      if (!data.filePath) {
        throw new Error('Unvollständige Antwortdaten vom Server: Kein filePath gefunden');
      }
      
      // Bild zum Produkt hinzufügen
      const added = addImageToProduct(data.filePath);
      
      if (added) {
        toast({
          title: "Bild hochgeladen",
          description: "Das Bild wurde erfolgreich hochgeladen.",
          variant: "success"
        });
      }
      
      // File-Input zurücksetzen, damit weitere Dateien hochgeladen werden können
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Fehler beim Hochladen des Bildes:", error);
      toast({
        title: "Fehler",
        description: "Das Bild konnte nicht hochgeladen werden.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Produkt speichern
  const handleSaveProduct = () => {
    if (!isValidProduct()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive"
      });
      return;
    }

    // Kodieren der Bilder im MULTI-Format, falls vorhanden
    const productToSave = { ...currentProduct };
    
    if (productToSave.productImages && productToSave.productImages.length > 0) {
      try {
        // Konvertiere die Bilder in das MULTI-Format
        const imageData = productToSave.productImages.map(img => ({
          url: img.url,
          isMain: img.isMain,
          order: img.order
        }));
        
        // Kodiere die Bilder und setze das Ergebnis als imageUrl
        const multiFormatString = encodeMultipleImages(imageData);
        productToSave.imageUrl = multiFormatString;
        
        console.log("Bilder im MULTI-Format kodiert:", multiFormatString);
      } catch (error) {
        console.error("Fehler beim Kodieren der Bilder:", error);
        // Fallback: Erstes Bild als imageUrl verwenden
        productToSave.imageUrl = productToSave.productImages[0].url;
      }
    }

    const newProducts = [...value, productToSave];
    onChange(newProducts);
    
    toast({
      title: "Produkt hinzugefügt",
      description: `${currentProduct.productName} wurde zur Einkaufsliste hinzugefügt.`,
      variant: "success"
    });
    
    // Formular zurücksetzen, aber den Store-Wert beibehalten
    setCurrentProduct({
      productName: "",
      quantity: "1",
      store: currentProduct.store,
      notes: "",
      imageUrl: "",
      filePath: "",
      productImages: []
    });
  };

  return (
    <div className="space-y-6 bg-green-100 p-5 rounded-lg border-2 border-green-300 shadow-md">
      <h3 className="font-bold text-lg mb-4 text-gray-800">
        Neues Produkt zu Ihrer Einkaufsliste hinzufügen
      </h3>
      
      {/* Geschäft */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-gray-700">
          Geschäft <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="store-input-simple"
            placeholder="z.B. Rewe"
            value={currentProduct.store || ""}
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
                  if (currentProduct.store?.trim() === "") return true;
                  
                  // Fall-insensitive Filterung - zeige Namen, die den eingegebenen Text enthalten
                  return store.toLowerCase().includes((currentProduct.store || "").toLowerCase());
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
                      document.getElementById('store-input-simple')?.focus();
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Produktname */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-700">
            Produktname <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="z.B. Vollmilch 1L"
            value={currentProduct.productName}
            onChange={(e) => setCurrentProduct({...currentProduct, productName: e.target.value})}
            className="border-green-300 focus:border-green-500 focus:ring-green-500"
          />
        </div>
        
        {/* Menge */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-700">
            Menge <span className="text-red-500">*</span>
          </Label>
          <Input
            type="text"
            placeholder="z.B. 2 oder 500g"
            value={currentProduct.quantity}
            onChange={(e) => setCurrentProduct({...currentProduct, quantity: e.target.value})}
            className="border-green-300 focus:border-green-500 focus:ring-green-500"
          />
        </div>
      </div>
      
      {/* Notizen */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-gray-700">
          Notizen (optional)
        </Label>
        <Textarea
          placeholder="Zusätzliche Hinweise zum Produkt..."
          value={currentProduct.notes || ""}
          onChange={(e) => setCurrentProduct({...currentProduct, notes: e.target.value})}
          className="border-green-300 focus:border-green-500 focus:ring-green-500"
        />
      </div>
      
      {/* Verstecktes Datei-Input-Feld - WICHTIG: außerhalb der Bedingungen platzieren */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Bild-Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-gray-700">
          Produktbilder (optional, max. 3)
        </Label>
        
        {/* Vorhandene Bilder anzeigen */}
        {currentProduct.productImages && currentProduct.productImages.length > 0 ? (
          <div className="mt-2">
            <div className="grid grid-cols-3 gap-2">
              {currentProduct.productImages.map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={image.url} 
                    alt={`Produktbild ${index + 1}`} 
                    className="w-full h-28 object-cover border rounded cursor-pointer"
                    onClick={() => setEnlargedImageUrl(image.url)}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => {
                      // Bild entfernen
                      const updatedImages = currentProduct.productImages?.filter((_, i) => i !== index) || [];
                      setCurrentProduct({
                        ...currentProduct,
                        imageUrl: updatedImages.length > 0 ? updatedImages[0].url : "",
                        filePath: updatedImages.length > 0 ? updatedImages[0].url : "",
                        productImages: updatedImages
                      });
                    }}
                  >
                    <span className="text-xs">×</span>
                  </Button>
                </div>
              ))}
              
              {/* Upload-Buttons anzeigen, wenn weniger als 3 Bilder vorhanden sind */}
              {currentProduct.productImages.length < 3 && (
                <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded h-28">
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        console.log("Upload-Button geklickt!");
                        // Sicherstellen, dass das Feld zurückgesetzt ist
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                          // Dann den Click auslösen
                          fileInputRef.current.click();
                        } else {
                          console.error("File-Input-Referenz ist null!");
                        }
                      }}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCameraDialogOpen(true);
                        startCamera();
                      }}
                      disabled={isUploading}
                    >
                      <CameraIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            {/* Datei-Upload-Button */}
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2 flex-1"
              onClick={() => {
                console.log("Upload-Button geklickt!");
                // Sicherstellen, dass das Feld zurückgesetzt ist
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  // Dann den Click auslösen
                  fileInputRef.current.click();
                } else {
                  console.error("File-Input-Referenz ist null!");
                }
              }}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Wird hochgeladen...</span>
                </>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4" />
                  <span>Foto hochladen</span>
                </>
              )}
            </Button>
            
            {/* Kamera-Button */}
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                setCameraDialogOpen(true);
                startCamera();
              }}
              disabled={isUploading}
            >
              <CameraIcon className="h-4 w-4" />
              <span className="sr-only md:not-sr-only">Foto aufnehmen</span>
            </Button>
          </div>
        )}
        <p className="text-xs text-gray-600">
          Fügen Sie bis zu 3 Fotos des Produkts hinzu. Klicken Sie auf ein Bild, um es zu vergrößern.
        </p>
      </div>
      
      {/* Kamera-Dialog */}
      <Dialog open={cameraDialogOpen} onOpenChange={setCameraDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto aufnehmen</DialogTitle>
            <DialogDescription>
              Verwenden Sie Ihre Kamera, um ein Foto des Produkts aufzunehmen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative bg-black rounded-md overflow-hidden aspect-video">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCameraDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={capturePhoto}
              className="bg-green-600 hover:bg-green-700"
              disabled={!cameraStream}
            >
              Foto aufnehmen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Bild-Vergrößerungsdialog */}
      <Dialog 
        open={!!enlargedImageUrl} 
        onOpenChange={(open) => !open && setEnlargedImageUrl(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-screen overflow-auto">
          <DialogHeader>
            <DialogTitle>Produktbild</DialogTitle>
            <DialogDescription>
              Ansicht in voller Größe
            </DialogDescription>
          </DialogHeader>
          
          {enlargedImageUrl && (
            <div className="mt-2 flex items-center justify-center">
              <img 
                src={enlargedImageUrl} 
                alt="Vergrößertes Produktbild" 
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button
              type="button"
              onClick={() => setEnlargedImageUrl(null)}
            >
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Speichern-Button */}
      <div className="pt-2">
        <Button
          type="button"
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={handleSaveProduct}
        >
          Produkt hinzufügen
        </Button>
      </div>
      
      {/* Produktliste anzeigen */}
      {value.length > 0 && (
        <div className="mt-8">
          <h4 className="font-semibold text-base mb-3">Hinzugefügte Produkte:</h4>
          <div className="space-y-3">
            {value.map((product: any, index) => (
              <div key={index} className="flex gap-3 p-3 bg-white rounded border border-gray-300">
                {/* Produktbilder (falls vorhanden) */}
                {product.imageUrl && (
                  <div className="flex-shrink-0 flex gap-1">
                    {/* Überprüfen, ob das Bild im MULTI-Format vorliegt */}
                    {product.imageUrl.startsWith('MULTI:') ? (
                      // Mehrere Bilder aus dem MULTI-Format extrahieren und anzeigen
                      (() => {
                        try {
                          // MULTI-Präfix entfernen
                          const base64String = product.imageUrl.substring(6);
                          // Base64 dekodieren
                          const decoded = decodeURIComponent(atob(base64String));
                          // JSON parsen
                          const images = JSON.parse(decoded);
                          
                          // Bis zu 3 Bilder anzeigen
                          return images.slice(0, 3).map((img: any, idx: number) => (
                            <img 
                              key={idx}
                              src={img.url} 
                              alt={`${product.productName} Bild ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded cursor-pointer"
                              onClick={() => setEnlargedImageUrl(img.url)}
                            />
                          ));
                        } catch (error) {
                          console.error("Fehler beim Dekodieren von Bildern:", error);
                          // Fallback: Einfach das imageUrl als einzelnes Bild anzeigen
                          return (
                            <img 
                              src={product.imageUrl} 
                              alt={product.productName}
                              className="w-16 h-16 object-cover rounded cursor-pointer"
                              onClick={() => setEnlargedImageUrl(product.imageUrl)}
                            />
                          );
                        }
                      })()
                    ) : (
                      // Einzelnes Bild anzeigen
                      <img 
                        src={product.imageUrl} 
                        alt={product.productName}
                        className="w-16 h-16 object-cover rounded cursor-pointer"
                        onClick={() => setEnlargedImageUrl(product.imageUrl)}
                      />
                    )}
                  </div>
                )}
                
                {/* Produktdetails */}
                <div className="flex-grow">
                  <p className="font-medium">{product.quantity} × {product.productName}</p>
                  <p className="text-sm text-gray-600">{product.store}</p>
                  {product.notes && <p className="text-xs text-gray-500 mt-1">{product.notes}</p>}
                </div>
                
                {/* Aktionen */}
                <div className="flex-shrink-0">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const newProducts = [...value];
                      newProducts.splice(index, 1);
                      onChange(newProducts);
                      toast({
                        title: "Produkt entfernt",
                        description: `${product.productName} wurde aus der Einkaufsliste entfernt.`,
                        variant: "success"
                      });
                    }}
                  >
                    Entfernen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleProductEntryForm;
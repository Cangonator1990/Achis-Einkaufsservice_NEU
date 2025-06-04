import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InsertOrderItem, ProductWithImages } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Trash2,
  Edit,
  Plus,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Camera as CameraIcon,
  Upload as UploadIcon,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ProductEntryForm } from "@/components/ProductEntryForm";

// Interface für Produktbilder (vereinfacht)
type ProductImage = {
  id?: number;
  imageUrl: string;
  filePath?: string; // Optional für Abwärtskompatibilität
  isMain: boolean;
  sortOrder: number;
  createdAt?: string;
}

// Erweiterte Version von InsertOrderItem für Bilder
interface ExtendedOrderItem extends InsertOrderItem {
  filePath?: string;
  productImages?: ProductImage[]; // Mehrere Bilder pro Produkt
}

interface ProductListEditorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  orderId: number;
  orderItems: InsertOrderItem[];
  isLocked: boolean;
  store: string;
}

export default function ProductListEditorModal({
  isOpen,
  onOpenChange,
  onSave,
  orderId,
  orderItems: initialOrderItems,
  isLocked,
  store: initialStore,
}: ProductListEditorModalProps) {
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<ExtendedOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [currentProduct, setCurrentProduct] = useState<ExtendedOrderItem>({
    productName: "",
    quantity: "1",
    store: "",
    notes: "",
    imageUrl: "",
    filePath: "",
    productImages: []
  });

  // States für die Bildupload-Funktionalität
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [tempUploadedImages, setTempUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States für Kamera
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State für Bildzoom-Dialog
  const [imageZoomDialogOpen, setImageZoomDialogOpen] = useState(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string>("");
  
  // State für Lösch-Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  // Lade die initialen Daten
  useEffect(() => {
    if (isOpen) {
      if (initialOrderItems && initialOrderItems.length > 0) {
        // Konvertiere initialOrderItems zu ExtendedOrderItem-Format
        const extendedItems = initialOrderItems.map(item => ({
          ...item,
          productImages: extractImages(item.imageUrl)
        }));
        setOrderItems(extendedItems);
      } else {
        setOrderItems([{
          productName: "",
          quantity: "1",
          store: initialStore || "",
          notes: "",
          imageUrl: "",
          filePath: "",
          productImages: []
        }]);
      }
    }
  }, [initialOrderItems, initialStore, isOpen]);

  // Hilfsfunktion zum Dekodieren von MULTI-Format-Bildern
  function decodeMultipleImages(multiString: string): ProductImage[] {
    if (!multiString || !multiString.startsWith("MULTI:")) {
      return [];
    }

    try {
      // Format: "MULTI:encodedJsonString"
      const encodedJson = multiString.substring(6); // Entferne "MULTI:"
      const jsonString = decodeURIComponent(encodedJson);
      const imagesData = JSON.parse(jsonString);
      
      return imagesData.map((img: any, index: number) => ({
        imageUrl: img.url,
        filePath: img.url, // Für Kompatibilität
        isMain: img.isMain || index === 0,
        sortOrder: img.order || index
      }));
    } catch (error) {
      console.error("Fehler beim Dekodieren von MULTI-Format:", error);
      return [];
    }
  }

  // Hilfsfunktion zum Extrahieren aller Bilder aus einem imageUrl-String
  function extractImages(imageUrl: string | null): ProductImage[] {
    if (!imageUrl) return [];
    
    if (imageUrl.startsWith("MULTI:")) {
      return decodeMultipleImages(imageUrl);
    }
    
    // Einzelnes Bild als Produktbild zurückgeben
    return [{
      imageUrl,
      filePath: imageUrl,
      isMain: true,
      sortOrder: 0
    }];
  }

  // Hilfsfunktion zum Kodieren mehrerer Bilder in ein MULTI-Format
  function encodeMultipleImages(images: ProductImage[]): string {
    if (!images || images.length === 0) return "";
    
    if (images.length === 1) {
      return images[0].imageUrl;
    }
    
    const imagesData = images.map(img => ({
      url: img.imageUrl,
      isMain: img.isMain,
      order: img.sortOrder
    }));
    
    return "MULTI:" + encodeURIComponent(JSON.stringify(imagesData));
  }

  // Kamera-Funktionalität aktivieren/deaktivieren
  useEffect(() => {
    if (cameraDialogOpen && !isCameraActive) {
      const startCamera = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast({
              title: "Kamera nicht verfügbar",
              description: "Ihr Browser unterstützt die Kamerafunktion nicht oder der Zugriff auf die Kamera wurde verweigert.",
              variant: "destructive"
            });
            return;
          }

          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });

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

    // Cleanup-Funktion
    return () => {
      if (isCameraActive && videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        setIsCameraActive(false);
      }
    };
  }, [cameraDialogOpen, isCameraActive, toast]);

  // Funktion zum Aufnehmen eines Fotos
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Canvas-Größe an Video anpassen
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Bild auf Canvas zeichnen
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // In Blob konvertieren
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast({
            title: "Fehler",
            description: "Das Foto konnte nicht verarbeitet werden.",
            variant: "destructive"
          });
          return;
        }
        
        // Als Datei speichern
        const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Hochladen
        await uploadProductImage(file);
        
        // Kameradialog schließen
        setCameraDialogOpen(false);
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error("Fehler bei der Bildverarbeitung:", error);
      toast({
        title: "Fehler",
        description: "Das Foto konnte nicht verarbeitet werden.",
        variant: "destructive"
      });
    }
  };

  // Funktion zum Hochladen eines Bildes
  const uploadProductImage = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // FormData für den Upload erstellen
    const formData = new FormData();
    formData.append('image', file);
    
    // XMLHttpRequest für Progress-Tracking
    const xhr = new XMLHttpRequest();
    
    // Progress-Event-Listener
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    });
    
    // Promise für asynchrone Verarbeitung
    const uploadPromise = new Promise<string>((resolve, reject) => {
      xhr.open('POST', '/api/upload/product-image', true);
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.filePath);
          } catch (error) {
            reject(new Error('Ungültige Serverantwort'));
          }
        } else {
          reject(new Error(`HTTP-Fehler ${xhr.status}: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Netzwerkfehler beim Upload'));
      };
      
      xhr.send(formData);
    });
    
    try {
      // Auf den Upload warten
      const filePath = await uploadPromise;
      
      // Bild zur temporären Liste hinzufügen
      setTempUploadedImages(prev => [...prev, filePath]);
      
      // Aktuelle Bilder ermitteln
      let currentImages = [...productImages];
      
      // Neues Bild hinzufügen
      const newImage = {
        imageUrl: filePath,
        filePath: filePath,
        isMain: currentImages.length === 0, // Erstes Bild ist Hauptbild
        sortOrder: currentImages.length
      };
      
      currentImages.push(newImage);
      
      // Maximale Anzahl von Bildern prüfen (max. 3)
      if (currentImages.length > 3) {
        currentImages = currentImages.slice(-3); // Behalte nur die letzten 3 Bilder
        toast({
          title: "Hinweis",
          description: "Es können maximal 3 Bilder pro Produkt hochgeladen werden. Das älteste Bild wurde entfernt."
        });
      }
      
      // Bilder aktualisieren
      setProductImages(currentImages);
      
      // Aktuelles Produkt aktualisieren
      const encodedImages = encodeMultipleImages(currentImages);
      setCurrentProduct(prev => ({
        ...prev,
        imageUrl: encodedImages,
        filePath: filePath // Auch filePath für Abwärtskompatibilität
      }));
      
      toast({
        title: "Bild hochgeladen",
        description: "Das Bild wurde erfolgreich hochgeladen."
      });
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      toast({
        title: "Upload fehlgeschlagen",
        description: `Das Bild konnte nicht hochgeladen werden: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Datei-Input zurücksetzen
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Funktion zum Löschen eines hochgeladenen Bildes
  const deleteUploadedImage = async (imagePath: string) => {
    if (!imagePath || !imagePath.startsWith('/uploads/')) {
      return;
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

      if (!response.ok) {
        console.warn("Fehler beim Löschen des Bildes:", await response.text());
      }
    } catch (error) {
      console.error("Fehler beim Löschen des temporären Bildes:", error);
    }
  };

  // Funktion zum Aktualisieren der Bestellung
  const updateOrder = async () => {
    // Validiere, dass es mindestens ein Produkt mit einem Namen gibt
    if (orderItems.length === 0 || !orderItems.some(item => item.productName.trim() !== "")) {
      toast({
        title: 'Fehler',
        description: 'Fügen Sie mindestens ein Produkt mit Namen hinzu.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Bestelldaten aktualisieren  
      // Bestellungselemente aktualisieren
      if (initialOrderItems) {
        // 1. Bestehende Elemente aktualisieren
        for (let i = 0; i < Math.min(initialOrderItems.length, orderItems.length); i++) {
          // Hier nutzen wir die ID vom initialOrderItem (vom Server)
          const itemId = (initialOrderItems[i] as any).id;
          if (!itemId) continue;
          
          await apiRequest(`/api/orders/${orderId}/items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              ...orderItems[i],
              imageUrl: orderItems[i].imageUrl || orderItems[i].filePath || '',
              filePath: orderItems[i].filePath || orderItems[i].imageUrl || ''
            })
          });
        }
        
        // 2. Neue Elemente hinzufügen
        if (orderItems.length > initialOrderItems.length) {
          for (let i = initialOrderItems.length; i < orderItems.length; i++) {
            // Nur Produkte mit Namen hinzufügen
            if (orderItems[i].productName.trim() === "") continue;
            
            await apiRequest(`/api/orders/${orderId}/items`, {
              method: 'POST',
              body: JSON.stringify({
                ...orderItems[i],
                imageUrl: orderItems[i].imageUrl || orderItems[i].filePath || '',
                filePath: orderItems[i].filePath || orderItems[i].imageUrl || ''
              })
            });
          }
        }
        
        // 3. Überschüssige Artikel löschen
        if (initialOrderItems.length > orderItems.length) {
          for (let i = orderItems.length; i < initialOrderItems.length; i++) {
            // Hier nutzen wir die ID vom initialOrderItem (vom Server)
            const itemId = (initialOrderItems[i] as any).id;
            if (!itemId) continue;
            
            await apiRequest(`/api/orders/${orderId}/items/${itemId}`, {
              method: 'DELETE'
            });
          }
        }
      }
      
      toast({
        title: 'Bestellung aktualisiert',
        description: 'Ihre Bestellung wurde erfolgreich aktualisiert.',
      });
      
      // Cache invalidieren, damit die Änderungen sofort sichtbar sind
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: `Die Bestellung konnte nicht aktualisiert werden: ${(error as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funktion zum Hinzufügen eines neuen Produkts
  const addProduct = () => {
    // Letzten genutzten Store-Wert ermitteln
    const lastStore = orderItems.length > 0 ? 
      orderItems[orderItems.length - 1].store || initialStore : 
      initialStore;
    
    const newProduct: ExtendedOrderItem = {
      productName: "",
      quantity: "1",
      store: lastStore || "",
      notes: "",
      imageUrl: "",
      filePath: "",
      productImages: []
    };
    
    setOrderItems([...orderItems, newProduct]);
    setEditingIndex(orderItems.length);
    setCurrentProduct(newProduct);
    setProductImages([]);
  };

  // Funktion zum Bearbeiten eines Produkts
  const editProduct = (index: number) => {
    setEditingIndex(index);
    const product = orderItems[index];
    setCurrentProduct({...product});
    
    // Bilder des Produkts laden
    if (product.imageUrl) {
      const images = extractImages(product.imageUrl);
      setProductImages(images);
    } else {
      setProductImages([]);
    }
  };

  // Funktion zum Löschen eines Bildes
  const handleDeleteImage = (imageIndex: number) => {
    const images = [...productImages];
    const imageToDelete = images[imageIndex];
    
    // Bild aus dem Array entfernen
    images.splice(imageIndex, 1);
    
    // Wenn das gelöschte Bild das Hauptbild war, setze das erste Bild als Hauptbild
    if (imageToDelete.isMain && images.length > 0) {
      images[0].isMain = true;
    }
    
    // Reihenfolge aktualisieren
    images.forEach((img, idx) => {
      img.sortOrder = idx;
    });
    
    setProductImages(images);
    
    // Aktuelles Produkt aktualisieren
    const encodedImages = encodeMultipleImages(images);
    setCurrentProduct(prev => ({
      ...prev,
      imageUrl: encodedImages,
      filePath: images.length > 0 ? images[0].imageUrl : ""
    }));
    
    // Lösche das Bild vom Server, wenn es temporär hochgeladen wurde
    if (imageToDelete.imageUrl && tempUploadedImages.includes(imageToDelete.imageUrl)) {
      deleteUploadedImage(imageToDelete.imageUrl);
      setTempUploadedImages(prev => prev.filter(img => img !== imageToDelete.imageUrl));
    }
  };

  // Funktion zum Speichern des bearbeiteten Produkts
  const saveProduct = () => {
    if (currentProduct.productName.trim() === "") {
      toast({
        title: 'Fehler',
        description: 'Der Produktname darf nicht leer sein.',
        variant: 'destructive',
      });
      return;
    }
    
    // Bilder-Handling: Konvertiere Bilder zu MULTI-Format
    if (productImages.length > 0) {
      currentProduct.imageUrl = encodeMultipleImages(productImages);
      // Setze filePath auf das Hauptbild für Abwärtskompatibilität
      const mainImage = productImages.find(img => img.isMain) || productImages[0];
      currentProduct.filePath = mainImage.imageUrl;
    }
    
    const newOrderItems = [...orderItems];
    newOrderItems[editingIndex] = currentProduct;
    setOrderItems(newOrderItems);
    setEditingIndex(-1);
  };

  // Funktion zum Löschen eines Produkts
  const deleteProduct = (index: number) => {
    // Verhindere das Löschen, wenn es das letzte Produkt ist
    if (orderItems.length <= 1) {
      toast({
        title: 'Hinweis',
        description: 'Die Bestellung muss mindestens ein Produkt enthalten.',
      });
      return;
    }
    
    // Lösche alle temporären Bilder
    const product = orderItems[index];
    if (product.imageUrl) {
      const images = extractImages(product.imageUrl);
      images.forEach(img => {
        if (img.imageUrl && tempUploadedImages.includes(img.imageUrl)) {
          deleteUploadedImage(img.imageUrl);
          setTempUploadedImages(prev => prev.filter(path => path !== img.imageUrl));
        }
      });
    }
    
    const newOrderItems = [...orderItems];
    newOrderItems.splice(index, 1);
    setOrderItems(newOrderItems);
    
    // Wenn das bearbeitete Produkt gelöscht wurde, Bearbeitungsmodus beenden
    if (editingIndex === index) {
      setEditingIndex(-1);
    } else if (editingIndex > index) {
      // Wenn ein Produkt vor dem bearbeiteten gelöscht wurde, Index anpassen
      setEditingIndex(editingIndex - 1);
    }
  };

  // Handler für die Dateiauswahl
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadProductImage(e.target.files[0]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Produkte bearbeiten</DialogTitle>
          <DialogDescription>
            Sie können Produkte hinzufügen, bearbeiten oder löschen.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Produkte</h3>
            <Button 
              type="button" 
              className="bg-primary text-white" 
              onClick={addProduct}
              disabled={isLocked || editingIndex !== -1}
            >
              <Plus className="h-4 w-4 mr-1" />
              Produkt hinzufügen
            </Button>
          </div>
          
          {/* Produktbearbeitungsformular */}
          {editingIndex !== -1 && (
            <div className="border rounded-lg p-4 mb-4 bg-primary/5">
              <h4 className="font-medium mb-3">
                {editingIndex >= orderItems.length ? "Neues Produkt" : "Produkt bearbeiten"}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="productName" className="block text-sm font-medium mb-1">
                    Produktname *
                  </label>
                  <Input
                    id="productName"
                    value={currentProduct.productName}
                    onChange={(e) => setCurrentProduct({...currentProduct, productName: e.target.value})}
                    placeholder="z.B. Milch"
                    required
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                    Menge *
                  </label>
                  <Input
                    id="quantity"
                    value={currentProduct.quantity}
                    onChange={(e) => setCurrentProduct({...currentProduct, quantity: e.target.value})}
                    placeholder="z.B. 2 Liter"
                    required
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="store" className="block text-sm font-medium mb-1">
                    Geschäft
                  </label>
                  <Input
                    id="store"
                    value={currentProduct.store || ""}
                    onChange={(e) => setCurrentProduct({...currentProduct, store: e.target.value})}
                    placeholder="z.B. Edeka"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium mb-1">
                    Anmerkungen
                  </label>
                  <Textarea
                    id="notes"
                    value={currentProduct.notes || ''}
                    onChange={(e) => setCurrentProduct({...currentProduct, notes: e.target.value})}
                    placeholder="z.B. Fettarm, Haltbar"
                    className="resize-none w-full"
                    rows={3}
                  />
                </div>
                
                {/* Bildupload Bereich */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Produktbilder
                  </label>
                  
                  {/* Bestehende Bilder anzeigen */}
                  {productImages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Vorhandene Bilder (max. 3):</p>
                      <div className="flex flex-wrap gap-2">
                        {productImages.map((image, idx) => (
                          <div key={idx} className="relative">
                            <div 
                              className="w-16 h-16 rounded overflow-hidden cursor-pointer border"
                              onClick={() => {
                                setZoomedImageSrc(image.imageUrl || '');
                                setImageZoomDialogOpen(true);
                              }}
                            >
                              <img 
                                src={image.imageUrl} 
                                alt={`Produktbild ${idx + 1}`} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button 
                              type="button"
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(idx);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Wenn weniger als 3 Bilder vorhanden sind, Upload-Optionen anzeigen */}
                  {productImages.length < 3 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {/* Dateiupload-Button */}
                        <label 
                          htmlFor="file-upload" 
                          className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded cursor-pointer"
                        >
                          <UploadIcon className="h-4 w-4" />
                          <span className="text-sm">Dateisystem</span>
                        </label>
                        <input 
                          id="file-upload" 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                        />
                        
                        {/* Kamera-Button */}
                        <button
                          type="button"
                          className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm"
                          onClick={() => setCameraDialogOpen(true)}
                        >
                          <CameraIcon className="h-4 w-4" />
                          Direktfoto
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Upload-Status anzeigen */}
                  {isUploading && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-1">Upload läuft... {Math.round(uploadProgress)}%</p>
                      <Progress value={uploadProgress} max={100} className="h-2" />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setEditingIndex(-1)}
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    type="button"
                    onClick={saveProduct}
                    disabled={!currentProduct.productName || isUploading}
                  >
                    Speichern
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Produkte nach Geschäft gruppiert (wie in SteppedOrderForm) */}
          {orderItems.length > 0 ? (
            <div>
              {/* Produkte nach Geschäft gruppieren */}
              {(() => {
                // Gruppiere nach Geschäft
                const storeGroups: Record<string, typeof orderItems> = {};
                
                orderItems.forEach(item => {
                  const store = item.store || initialStore || "Unbekannt";
                  if (!storeGroups[store]) {
                    storeGroups[store] = [];
                  }
                  storeGroups[store].push(item);
                });
                
                return Object.entries(storeGroups).map(([store, items], groupIndex) => (
                  <div key={groupIndex} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"/>
                        <path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8"/>
                        <path d="M15 2v5h5"/>
                      </svg>
                      <h5 className="font-bold text-primary">{store}</h5>
                    </div>
                    <ul className="mb-4 space-y-2 pl-6 border-l-2 border-primary/20">
                      {items.map((item, index) => {
                        const itemIndex = orderItems.findIndex(i => 
                          i.productName === item.productName && 
                          i.quantity === item.quantity && 
                          i.store === item.store
                        );
                        
                        // Bilder aus dem ImageUrl extrahieren
                        const productImages = extractImages(item.imageUrl);
                        
                        return (
                          <li key={index} className="flex justify-between items-start border-b pb-2 border-gray-200">
                            <div className="flex gap-3">
                              <div className="text-gray-500 font-medium w-6">
                                {item.quantity}×
                              </div>
                              
                              {/* Bilder anzeigen, wenn vorhanden */}
                              {productImages.length > 0 && (
                                <div 
                                  className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border cursor-pointer"
                                  onClick={() => {
                                    const mainImage = productImages.find(img => img.isMain) || productImages[0];
                                    setZoomedImageSrc(mainImage.imageUrl);
                                    setImageZoomDialogOpen(true);
                                  }}
                                >
                                  <img 
                                    src={productImages[0].imageUrl} 
                                    alt={item.productName} 
                                    className="w-full h-full object-cover"
                                  />
                                  {productImages.length > 1 && (
                                    <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1">
                                      +{productImages.length - 1}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div>
                                <span className="font-medium">{item.productName}</span>
                                <p className="text-sm text-gray-600">{item.notes || "Keine Notizen"}</p>
                                <p className="text-xs text-gray-500">Geschäft: {item.store || initialStore}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => editProduct(itemIndex)}
                                className="text-xs"
                                disabled={isLocked || editingIndex !== -1}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                Bearbeiten
                              </Button>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setProductToDelete(itemIndex);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                disabled={isLocked || editingIndex !== -1 || orderItems.length <= 1}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                Entfernen
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
        
        {/* Kamera-Dialog */}
        <Dialog open={cameraDialogOpen} onOpenChange={setCameraDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Foto aufnehmen</DialogTitle>
              <DialogDescription>
                Verwenden Sie Ihre Kamera, um ein Foto des Produkts aufzunehmen.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2">
              <div className="relative aspect-video overflow-hidden rounded-md bg-gray-100">
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                >
                  Ihr Browser unterstützt das Video-Element nicht.
                </video>
              </div>
              <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            <DialogFooter className="sm:justify-center gap-2">
              <DialogClose asChild>
                <Button variant="outline">Abbrechen</Button>
              </DialogClose>
              <Button 
                className="bg-primary text-white"
                onClick={capturePhoto}
                disabled={!isCameraActive}
              >
                Foto aufnehmen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Bildzoom-Dialog */}
        <Dialog open={imageZoomDialogOpen} onOpenChange={setImageZoomDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Produktbild</DialogTitle>
            </DialogHeader>
            <div className="overflow-hidden rounded-md bg-gray-100">
              {zoomedImageSrc && (
                <img 
                  src={zoomedImageSrc} 
                  alt="Produktbild vergrößert" 
                  className="w-full h-auto object-contain max-h-[70vh]"
                />
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setImageZoomDialogOpen(false)}>Schließen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Lösch-Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Produkt löschen</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass Sie dieses Produkt aus Ihrer Bestellung entfernen möchten?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={() => {
                  if (productToDelete !== null) {
                    deleteProduct(productToDelete);
                    setProductToDelete(null);
                  }
                }}
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={updateOrder}
            disabled={isLoading || isLocked || orderItems.length === 0 || editingIndex !== -1}
            className="bg-primary text-white"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Speichern...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Änderungen speichern
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
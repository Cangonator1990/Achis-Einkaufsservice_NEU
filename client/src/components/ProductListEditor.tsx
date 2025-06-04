import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InsertOrderItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  Edit,
  Plus,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ProductListEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  orderId: number;
  orderItems: InsertOrderItem[];
  isLocked: boolean;
  store: string;
}

export default function ProductListEditor({
  isOpen,
  onClose,
  onSave,
  orderId,
  orderItems: initialOrderItems,
  isLocked,
  store: initialStore,
}: ProductListEditorProps) {
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<InsertOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [currentProduct, setCurrentProduct] = useState<InsertOrderItem>({
    productName: "",
    quantity: "1",
    store: "",
    notes: "",
    imageUrl: "",
    filePath: ""
  });

  // Lade die initialen Daten
  useEffect(() => {
    if (isOpen) {
      if (initialOrderItems && initialOrderItems.length > 0) {
        setOrderItems([...initialOrderItems]);
      } else {
        setOrderItems([{
          productName: "",
          quantity: "1",
          store: initialStore || "",
          notes: "",
          imageUrl: "",
          filePath: ""
        }]);
      }
    }
  }, [initialOrderItems, initialStore, isOpen]);

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
      
      onSave();
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
    const newProduct: InsertOrderItem = {
      productName: "",
      quantity: "1",
      store: "",
      notes: "",
      imageUrl: "",
      filePath: ""
    };
    
    setOrderItems([...orderItems, newProduct]);
    setEditingIndex(orderItems.length);
    setCurrentProduct(newProduct);
  };

  // Funktion zum Bearbeiten eines Produkts
  const editProduct = (index: number) => {
    setEditingIndex(index);
    setCurrentProduct({...orderItems[index]});
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

  // Wenn der Dialog nicht geöffnet ist, nichts rendern
  if (!isOpen) return null;

  return (
    <div className="w-full">
      <Card className="mb-6 border-primary/20 shadow-sm">
        <CardHeader className="bg-primary/10 pb-3">
          <CardTitle className="text-xl">Produkte bearbeiten</CardTitle>
          <CardDescription>Sie können Produkte hinzufügen, bearbeiten oder löschen.</CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Produkte</h3>
            <Button 
              type="button" 
              className="bg-primary text-white" 
              onClick={addProduct}
              disabled={isLocked || editingIndex !== -1}
            >
              <Plus className="h-4 w-4 mr-1" />
              Hinzufügen
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
                    disabled={!currentProduct.productName}
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
                                onClick={() => editProduct(itemIndex)}
                                className="h-8 px-2"
                                disabled={isLocked || editingIndex !== -1}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => deleteProduct(itemIndex)}
                                className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                disabled={isLocked || editingIndex !== -1 || orderItems.length <= 1}
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
        </CardContent>
        
        <CardFooter className="flex justify-between px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={updateOrder}
            disabled={isLoading || isLocked || editingIndex !== -1}
            className="bg-primary text-white"
          >
            {isLoading ? (
              <>Wird gespeichert...</>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Speichern
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
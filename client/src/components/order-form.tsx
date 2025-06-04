import React, { useState, useEffect } from "react";
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
import { ProductItem } from "@/components/product-item";
import { Plus, ShoppingCart, Trash2, AlertCircle, ChevronRight } from "lucide-react";
import { insertOrderSchema } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import AddressForm from "@/components/AddressForm";

// Erweitere das Schema um die zusätzlichen Felder für das Formular
const orderFormSchema = insertOrderSchema.extend({
  deliveryAddressId: z.number().min(1, { message: "Bitte Adresse auswählen" }),
  desiredDeliveryTime: z.string().min(1, { message: "Bitte Zeitraum auswählen" }),
  deliveryNotes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

// Adresse-Interface für Typsicherheit
interface Address {
  id: number;
  userId: number;
  name?: string;
  fullName?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  additionalInfo?: string;
  isDefault: boolean;
}

// Cart-Interface für Typsicherheit
interface CartItem {
  id?: number;
  cartId?: number;
  productName: string;
  quantity: string;
  notes?: string;
  store?: string;
  imageUrl?: string;
  filePath?: string;
}

interface Cart {
  id?: number;
  userId?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  store?: string;
  items?: CartItem[];
}

// Schritte im Bestellprozess
enum OrderStep {
  Store = 0,      // Zuerst Geschäft auswählen
  Products = 1,   // Dann Produkte hinzufügen
  Delivery = 2,   // Lieferdetails festlegen
  Review = 3      // Bestellung prüfen und absenden
}

export function OrderForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<OrderStep>(OrderStep.Store);

  // Get user's addresses and active cart
  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
  });

  const { data: activeCart, isLoading: isCartLoading } = useQuery<Cart>({
    queryKey: ["/api/cart/active"],
    refetchOnWindowFocus: true,
  });

  // If user has no addresses, show message
  const hasAddresses = addresses.length > 0;

  // Setup form with validation
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      store: "",
      products: [{ name: "", quantity: 1, notes: "" }],
      deliveryAddressId: 0,
      desiredDeliveryDate: new Date().toISOString().split('T')[0],
      desiredDeliveryTime: "",
      deliveryNotes: "",
    },
  });

  // Field array for products
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  // Load cart items when component mounts
  useEffect(() => {
    if (activeCart?.items?.length && !isCartLoading) {
      form.reset({
        ...form.getValues(),
        store: activeCart.store || "",
        products: activeCart.items.map(item => ({
          name: item.productName,
          quantity: Number(item.quantity) || 1,
          notes: item.notes || ""
        }))
      });
    }
  }, [activeCart, isCartLoading, form]);

  // Set default address if available
  useEffect(() => {
    if (addresses.length > 0) {
      const defaultAddress = addresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        form.setValue("deliveryAddressId", defaultAddress.id);
      } else {
        form.setValue("deliveryAddressId", addresses[0].id);
      }
    }
  }, [addresses, form]);

  // Save to cart with debounce
  const saveToCartMutation = useMutation({
    mutationFn: async (data: OrderFormValues) => {
      await apiRequest("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          store: data.store,
          items: data.products.map(product => ({
            productName: product.name,
            quantity: String(product.quantity),
            notes: product.notes
          }))
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart/active"] });
    }
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/cart", {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart/active"] });
      // Reset form to initial state
      form.reset({
        store: "",
        products: [{ name: "", quantity: 1, notes: "" }],
        deliveryAddressId: form.getValues("deliveryAddressId"),
        desiredDeliveryDate: new Date().toISOString().split('T')[0],
        desiredDeliveryTime: "",
        deliveryNotes: "",
      });
      setCurrentStep(OrderStep.Store);
      toast({
        title: "Warenkorb geleert",
        description: "Ihr Warenkorb wurde erfolgreich geleert.",
      });
    }
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormValues) => {
      const res = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Bestellung erfolgreich aufgegeben",
        description: "Ihre Bestellung wurde erfolgreich aufgegeben.",
      });
      // Clear cart after successful order
      clearCartMutation.mutate();
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setLocation("/my-orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aufgeben der Bestellung",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Auto-save when form changes with debounce
  useEffect(() => {
    const debouncedSave = debounce((value: OrderFormValues) => {
      if (value.products?.length > 0 && value.store) {
        saveToCartMutation.mutate(value);
      }
    }, 1000);

    const subscription = form.watch((value) => {
      debouncedSave(value as OrderFormValues);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form.watch, saveToCartMutation]);

  // Handle form submission
  const onSubmit = (data: OrderFormValues) => {
    createOrderMutation.mutate(data);
  };

  // Add a new product
  const addProduct = () => {
    append({ name: "", quantity: 1, notes: "" });
  };

  // Gehe zum nächsten Schritt, wenn die aktuellen Daten valide sind
  const goToNextStep = async () => {
    const currentStepData = await validateCurrentStep();
    if (currentStepData && currentStep < OrderStep.Review) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Gehe zum vorherigen Schritt
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validiere den aktuellen Schritt
  const validateCurrentStep = async () => {
    try {
      switch (currentStep) {
        case OrderStep.Products:
          const values = form.getValues();
          const hasValidProducts = values.products.length > 0 && 
            values.products.every(p => p.name && p.name.trim() !== "" && p.quantity > 0);
          if (!hasValidProducts) {
            toast({
              title: "Bitte Produkte überprüfen",
              description: "Stellen Sie sicher, dass alle Produkte einen Namen und eine gültige Menge haben.",
              variant: "destructive",
            });
            return false;
          }
          return values;
          
        case OrderStep.Store:
          const storeValue = form.getValues('store');
          if (!storeValue) {
            toast({
              title: "Supermarkt fehlt",
              description: "Bitte wählen Sie einen Supermarkt aus.",
              variant: "destructive",
            });
            return false;
          }
          return form.getValues();
          
        case OrderStep.Delivery:
          const addressId = form.getValues('deliveryAddressId');
          const desiredDate = form.getValues('desiredDeliveryDate');
          const desiredTime = form.getValues('desiredDeliveryTime');
          
          if (!addressId || !desiredDate || !desiredTime) {
            toast({
              title: "Lieferinformationen unvollständig",
              description: "Bitte füllen Sie alle erforderlichen Lieferinformationen aus.",
              variant: "destructive",
            });
            return false;
          }
          return form.getValues();
          
        case OrderStep.Review:
          const isValid = await form.trigger();
          if (!isValid) {
            toast({
              title: "Formular unvollständig",
              description: "Bitte überprüfen Sie alle Felder und korrigieren Sie die Fehler.",
              variant: "destructive",
            });
            return false;
          }
          return form.getValues();
          
        default:
          return form.getValues();
      }
    } catch (error) {
      console.error("Fehler bei der Validierung:", error);
      return false;
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  if (!hasAddresses) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Neue Bestellung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4 text-center">
              Neue Lieferadresse hinzufügen
            </h3>
            <p className="text-center mb-6">Bitte fügen Sie eine Lieferadresse hinzu, bevor Sie eine Bestellung aufgeben.</p>
            <AddressForm onSuccess={() => {
              toast({
                title: "Adresse hinzugefügt",
                description: "Ihre Lieferadresse wurde erfolgreich gespeichert. Sie können jetzt mit Ihrer Bestellung fortfahren.",
                variant: "success"
              });
              queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
            }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const cartIsEmpty = !activeCart?.items?.length;
  const selectedAddress = addresses.find(a => a.id === form.getValues("deliveryAddressId"));

  // Fortschrittsleiste
  const renderProgressBar = () => {
    return (
      <div className="w-full mb-6">
        <div className="flex justify-between items-center">
          <div 
            className={`text-center flex flex-col items-center cursor-pointer ${currentStep >= OrderStep.Store ? "text-primary" : "text-gray-400"}`}
            onClick={() => setCurrentStep(OrderStep.Store)}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center mb-1 ${currentStep >= OrderStep.Store ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}>
              1
            </div>
            <span className="text-xs">Geschäft</span>
          </div>
          <div className={`flex-grow h-0.5 mx-2 ${currentStep >= OrderStep.Products ? "bg-primary" : "bg-gray-200"}`}></div>
          <div 
            className={`text-center flex flex-col items-center cursor-pointer ${currentStep >= OrderStep.Products ? "text-primary" : "text-gray-400"}`}
            onClick={() => currentStep > OrderStep.Products ? setCurrentStep(OrderStep.Products) : null}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center mb-1 ${currentStep >= OrderStep.Products ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}>
              2
            </div>
            <span className="text-xs">Produkte</span>
          </div>
          <div className={`flex-grow h-0.5 mx-2 ${currentStep >= OrderStep.Delivery ? "bg-primary" : "bg-gray-200"}`}></div>
          <div 
            className={`text-center flex flex-col items-center cursor-pointer ${currentStep >= OrderStep.Delivery ? "text-primary" : "text-gray-400"}`}
            onClick={() => currentStep > OrderStep.Delivery ? setCurrentStep(OrderStep.Delivery) : null}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center mb-1 ${currentStep >= OrderStep.Delivery ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}>
              3
            </div>
            <span className="text-xs">Lieferung</span>
          </div>
          <div className={`flex-grow h-0.5 mx-2 ${currentStep >= OrderStep.Review ? "bg-primary" : "bg-gray-200"}`}></div>
          <div 
            className={`text-center flex flex-col items-center cursor-pointer ${currentStep >= OrderStep.Review ? "text-primary" : "text-gray-400"}`}
            onClick={() => currentStep > OrderStep.Review ? setCurrentStep(OrderStep.Review) : null}
          >
            <div className={`rounded-full w-8 h-8 flex items-center justify-center mb-1 ${currentStep >= OrderStep.Review ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}>
              4
            </div>
            <span className="text-xs">Prüfen</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">Neue Bestellung</CardTitle>
            <CardDescription>
              {isCartLoading ? 'Lade Warenkorb...' : activeCart?.items?.length ? 'Ihre Bestellung wird automatisch gespeichert.' : ''}
            </CardDescription>
          </div>
          <Button
            variant="destructive"
            onClick={() => clearCartMutation.mutate()}
            disabled={cartIsEmpty || clearCartMutation.isPending}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {clearCartMutation.isPending ? "Wird geleert..." : "Warenkorb leeren"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cartIsEmpty && !isCartLoading && currentStep === OrderStep.Products && (
          <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg mb-6">
            <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
            <p className="text-gray-600">Ihr Warenkorb ist derzeit leer.</p>
          </div>
        )}

        {renderProgressBar()}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Schritt 1: Produkte */}
            {currentStep === OrderStep.Products && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-800">Was soll eingekauft werden?</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-primary hover:text-primary-600 transition-colors"
                    onClick={addProduct}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Produkt hinzufügen
                  </Button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Tipp:</strong> Geben Sie möglichst detaillierte Produktbeschreibungen an (Marke, Größe, Sorte, etc.)
                  </p>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <ProductItem
                      key={field.id}
                      index={index}
                      onRemove={() => remove(index)}
                      disableRemove={fields.length <= 1}
                      register={form.register}
                      errors={form.formState.errors}
                      setValue={form.setValue}
                      getValues={form.getValues}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Schritt 2: Supermarkt */}
            {currentStep === OrderStep.Store && (
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-800">In welchem Geschäft soll eingekauft werden?</h3>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Hinweis:</strong> Wir werden versuchen, Ihre Einkäufe im angegebenen Geschäft zu erledigen. 
                    Falls ein Produkt dort nicht verfügbar ist, werden wir Sie kontaktieren.
                  </p>
                </div>
                
                <FormField
                  control={form.control}
                  name="store"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Geschäft auswählen</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3">
                            <SelectValue placeholder="Bitte Geschäft auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="edeka">EDEKA</SelectItem>
                          <SelectItem value="rewe">REWE</SelectItem>
                          <SelectItem value="aldi">ALDI</SelectItem>
                          <SelectItem value="lidl">LIDL</SelectItem>
                          <SelectItem value="netto">Netto</SelectItem>
                          <SelectItem value="penny">Penny</SelectItem>
                          <SelectItem value="dm">dm</SelectItem>
                          <SelectItem value="rossmann">Rossmann</SelectItem>
                          <SelectItem value="andere">Andere</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Schritt 3: Lieferinformationen */}
            {currentStep === OrderStep.Delivery && (
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-800">Wann und wohin soll geliefert werden?</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="deliveryAddressId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Lieferadresse</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3">
                              <SelectValue placeholder="Bitte Adresse auswählen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {addresses.map((address) => (
                              <SelectItem key={address.id} value={address.id.toString()}>
                                {address.name || address.fullName}: {address.street} {address.houseNumber}, {address.postalCode} {address.city}
                                {address.isDefault && " (Standard)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="desiredDeliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Wunschlieferdatum</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            min={today}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="desiredDeliveryTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Wunschlieferzeit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3">
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

                  <FormField
                    control={form.control}
                    name="deliveryNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Lieferhinweise (optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="z.B. Klingel defekt, bitte anrufen" 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary-200 focus:ring-opacity-50 h-10 px-3" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Schritt 4: Überprüfung und Absenden */}
            {currentStep === OrderStep.Review && (
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-800">Bestellung überprüfen</h3>
                </div>

                <div className="bg-gray-50 rounded-lg p-5 mb-6">
                  <h4 className="font-medium text-gray-800 mb-3">Produkte</h4>
                  <ul className="mb-4 space-y-2">
                    {fields.map((field, index) => (
                      <li key={index} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <span className="font-medium">{form.getValues(`products.${index}.name`)}</span>
                          <p className="text-sm text-gray-600">{form.getValues(`products.${index}.quantity`)}x - {form.getValues(`products.${index}.notes`) || "Keine Notizen"}</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setCurrentStep(OrderStep.Products)}
                          className="text-xs"
                        >
                          Bearbeiten
                        </Button>
                      </li>
                    ))}
                  </ul>

                  <h4 className="font-medium text-gray-800 mb-2">Geschäft</h4>
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <p>{form.getValues("store")?.toUpperCase() || "Nicht ausgewählt"}</p>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setCurrentStep(OrderStep.Store)}
                      className="text-xs"
                    >
                      Bearbeiten
                    </Button>
                  </div>

                  <h4 className="font-medium text-gray-800 mb-2">Lieferinformationen</h4>
                  <div className="border-b pb-2 mb-2">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Lieferadresse</p>
                        <p className="text-sm text-gray-600">
                          {selectedAddress 
                            ? `${selectedAddress.name || selectedAddress.fullName}: ${selectedAddress.street} ${selectedAddress.houseNumber}, ${selectedAddress.postalCode} ${selectedAddress.city}`
                            : "Keine Adresse ausgewählt"}
                        </p>
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
                      {form.getValues("desiredDeliveryDate") 
                        ? new Date(form.getValues("desiredDeliveryDate")).toLocaleDateString() 
                        : "Kein Datum ausgewählt"
                      }
                      {form.getValues("desiredDeliveryTime") && ` - ${
                        form.getValues("desiredDeliveryTime") === "morning" 
                          ? "Vormittag (9:00 - 12:00)" 
                          : form.getValues("desiredDeliveryTime") === "afternoon" 
                            ? "Nachmittag (13:00 - 16:00)" 
                            : "Abend (17:00 - 20:00)"
                      }`}
                    </p>
                    
                    {form.getValues("deliveryNotes") && (
                      <div className="mt-2">
                        <p className="font-medium">Lieferhinweise</p>
                        <p className="text-sm text-gray-600">{form.getValues("deliveryNotes")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between items-center">
              {currentStep > OrderStep.Products ? (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={goToPreviousStep}
                  className="px-4 py-2"
                >
                  Zurück
                </Button>
              ) : (
                <div></div> // Platzhalter für Flexbox-Ausrichtung
              )}
              
              {currentStep < OrderStep.Review ? (
                <Button 
                  type="button" 
                  onClick={goToNextStep}
                  className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-600 transition-colors flex items-center gap-2"
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={createOrderMutation.isPending || cartIsEmpty}
                  className="bg-primary text-white px-8 py-3 text-lg font-medium rounded-md hover:bg-primary-600 transition-colors flex items-center gap-2 shadow-md"
                  size="lg"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {createOrderMutation.isPending ? "Wird aufgegeben..." : "Bestellung aufgeben"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
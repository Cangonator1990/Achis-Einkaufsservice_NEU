import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import MainLayout from '@/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent,
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { format } from 'date-fns';
import { useLocation, useParams } from 'wouter';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useAuth } from '@/hooks/use-auth';
import { InsertOrderItem } from '@shared/schema';
import ProductListEditorModal from '@/components/ProductListEditorModal';
import { PenLine } from 'lucide-react';

// Definiere die Typen für die API-Antworten
interface OrderResponse {
  id: number;
  userId: number;
  orderNumber: string;
  status: string;
  createdAt: string;
  desiredDeliveryDate: string;
  desiredTimeSlot: 'morning' | 'afternoon' | 'evening';
  suggestedDeliveryDate?: string;
  suggestedTimeSlot?: string;
  finalDeliveryDate?: string;
  finalTimeSlot?: string;
  isLocked: boolean;
  additionalInstructions?: string;
  addressId: number;
  store?: string;
  items?: OrderItemResponse[];
}

interface OrderItemResponse {
  id: number;
  orderId: number;
  productName: string;
  quantity: string;
  store: string;
  notes?: string;
  imageUrl?: string;
  filePath?: string;
}

// Hilfsfunktion für deutsche Statusbezeichnung
const getGermanStatusLabel = (status: string) => {
  switch(status) {
    case 'new': return 'Neu';
    case 'processing': return 'In Bearbeitung';
    case 'completed': return 'Abgeschlossen';
    case 'cancelled': return 'Storniert';
    case 'pending_admin_review': return 'Ihr Terminvorschlag wird geprüft';
    case 'pending_customer_review': return 'Neuer Terminvorschlag verfügbar';
    case 'date_forced': return 'Termin wurde festgelegt';
    case 'date_accepted': return 'Termin bestätigt';
    default: return status;
  }
};

const TIME_SLOT_OPTIONS = [
  { value: "morning", label: "Vormittag (9-12 Uhr)" },
  { value: "afternoon", label: "Nachmittag (12-17 Uhr)" },
  { value: "evening", label: "Abend (17-20 Uhr)" },
];

const EditOrderPage = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const orderId = params.id ? parseInt(params.id) : null;
  const [orderItems, setOrderItems] = useState<InsertOrderItem[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  
  // Wenn keine orderId vorhanden ist, zurück zur Bestellungsübersicht navigieren
  if (!orderId) {
    useEffect(() => {
      navigate('/orders');
      toast({
        title: 'Fehler',
        description: 'Keine Bestellungs-ID angegeben',
        variant: 'destructive',
      });
    }, []);
    return null;
  }
  
  // Bestellung laden
  const { 
    data: order, 
    isLoading: orderLoading, 
    error: orderError,
    refetch: refetchOrder
  } = useQuery<OrderResponse>({
    queryKey: [`/api/orders/${orderId}`],
    retry: false,
  });
  
  // OrderItems in das richtige Format konvertieren
  useEffect(() => {
    if (order && !orderLoading && order.items) {
      const formattedItems = order.items.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        store: item.store,
        notes: item.notes || '',
        imageUrl: item.imageUrl || '',
        filePath: item.filePath || ''
      }));
      setOrderItems(formattedItems);
    }
  }, [order, orderLoading]);

  // Editor öffnen
  const openEditor = () => {
    setIsEditorOpen(true);
  };

  // Fehler bei Bestellungsladung
  if (orderError) {
    return (
      <MainLayout>
        <div className="py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold mb-8 font-sans">Bestellungsdetails</h1>
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <p className="text-red-600 mb-4">
                    Fehler beim Laden der Bestellung. Diese Bestellung existiert möglicherweise nicht oder Sie haben keine Berechtigung, sie einzusehen.
                  </p>
                  <Button onClick={() => navigate('/orders')}>
                    Zurück zur Bestellübersicht
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Laden-Anzeige
  if (orderLoading) {
    return (
      <MainLayout>
        <div className="py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold mb-8 font-sans">Bestellungsdetails</h1>
            <Card>
              <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center">
                  <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-gray-600">Bestellung wird geladen...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Status Badge-Klasse
  const getStatusBadgeClass = (status?: string) => {
    switch(status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Formatiere Zeitslot
  const formatTimeSlot = (slot?: string) => {
    if (!slot) return '';
    const option = TIME_SLOT_OPTIONS.find(o => o.value === slot);
    return option ? option.label : slot;
  };

  return (
    <MainLayout>
      <section className="py-8 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Überschrift mit Bearbeiten-Button */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold font-sans">Bestellungsdetails</h1>
            
            {order && !order.isLocked && (
              <Button 
                onClick={openEditor}
                className="flex items-center gap-2"
              >
                <PenLine className="h-4 w-4" />
                Produkte bearbeiten
              </Button>
            )}
          </div>
          
          {/* Bestellungsinformationen */}
          {order && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Bestellnummer: {order.orderNumber}</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${getStatusBadgeClass(order.status)}`}>
                    {getGermanStatusLabel(order.status || '')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-medium mb-3">Allgemeine Informationen</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Erstellt am:</span>
                        <span>{order.createdAt ? format(new Date(order.createdAt), 'dd.MM.yyyy') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Geschäft:</span>
                        <span>{order.store || '-'}</span>
                      </div>
                      {order.additionalInstructions && (
                        <div>
                          <span className="text-gray-500 block">Zusätzliche Anweisungen:</span>
                          <span className="block mt-1">{order.additionalInstructions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium mb-3">Lieferinformationen</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Wunschtermin:</span>
                        <span>
                          {order.desiredDeliveryDate ? format(new Date(order.desiredDeliveryDate), 'dd.MM.yyyy') : '-'}, 
                          {' '}{formatTimeSlot(order.desiredTimeSlot)}
                        </span>
                      </div>
                      
                      {order.suggestedDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Vorgeschlagener Termin:</span>
                          <span className="font-medium text-amber-600">
                            {format(new Date(order.suggestedDeliveryDate), 'dd.MM.yyyy')}, 
                            {' '}{formatTimeSlot(order.suggestedTimeSlot)}
                          </span>
                        </div>
                      )}
                      
                      {order.finalDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Finaler Termin:</span>
                          <span className="font-medium text-green-600">
                            {format(new Date(order.finalDeliveryDate), 'dd.MM.yyyy')}, 
                            {' '}{formatTimeSlot(order.finalTimeSlot)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Produktliste */}
          {order && (
            <Card>
              <CardHeader>
                <CardTitle>Produkte</CardTitle>
              </CardHeader>
              <CardContent>
                {orderItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Keine Produkte in dieser Bestellung.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderItems.map((item, index) => (
                      <Card key={index} className="shadow-sm">
                        <CardContent className="p-4">
                          <div className="grid md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Produkt</div>
                              <div className="font-medium">{item.productName}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Menge</div>
                              <div>{item.quantity}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Geschäft</div>
                              <div>{item.store}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">Anmerkungen</div>
                              <div>{item.notes || "-"}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Zurück Button */}
          <div className="mt-6 flex justify-end">
            <Button onClick={() => navigate('/orders')} variant="outline">
              Zurück zur Übersicht
            </Button>
          </div>
          
          {/* Produktlisten-Editor Modal */}
          {order && (
            <ProductListEditorModal
              isOpen={isEditorOpen}
              onOpenChange={setIsEditorOpen}
              onSave={() => {
                refetchOrder();
              }}
              orderId={orderId}
              orderItems={orderItems}
              isLocked={order.isLocked}
              store={order.store || ''}
            />
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default EditOrderPage;
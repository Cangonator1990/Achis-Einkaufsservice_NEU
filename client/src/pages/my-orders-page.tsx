import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import MainLayout from '@/layouts/MainLayout';
import ProductListEditorModal from '@/components/ProductListEditorModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  PenLine,
  Trash2,
  AlertCircle,
  Calendar as CalendarRange,
  Calendar as CalendarDays,
  CheckCircle as CheckCircle2
} from "lucide-react";
import { IconX } from '@tabler/icons-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  pending_admin_review: 'bg-purple-100 text-purple-800',
  pending_customer_review: 'bg-yellow-100 text-yellow-800',
  date_forced: 'bg-orange-100 text-orange-800',
  date_accepted: 'bg-green-100 text-green-800',
};

const statusLabels = {
  new: 'Neu',
  processing: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  pending_admin_review: 'Ihr Terminvorschlag wird geprüft',
  pending_customer_review: 'Neuer Terminvorschlag verfügbar',
  date_forced: 'Termin wurde festgelegt',
  date_accepted: 'Termin bestätigt',
};

const timeSlotLabels = {
  morning: 'Vormittag (9-12 Uhr)',
  afternoon: 'Nachmittag (12-17 Uhr)',
  evening: 'Abend (17-20 Uhr)',
};

const TIME_SLOT_OPTIONS = [
  { value: "morning", label: "Vormittag (9-12 Uhr)" },
  { value: "afternoon", label: "Nachmittag (12-17 Uhr)" },
  { value: "evening", label: "Abend (17-20 Uhr)" },
];

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  isLoading: boolean;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  isLoading,
}: ConfirmDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Wird verarbeitet...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MyOrdersPage = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  // Neue Zustände für den Terminvorschlag
  const [suggestedDate, setSuggestedDate] = useState<string>("");
  const [suggestedTimeSlot, setSuggestedTimeSlot] = useState<string>("");

  // Get user orders
  interface Order {
    id: number;
    orderNumber: string;
    status: string;
    createdAt: string;
    desiredDeliveryDate: string;
    desiredTimeSlot: string;
    suggestedDeliveryDate?: string;
    suggestedTimeSlot?: string;
    finalDeliveryDate?: string;
    finalTimeSlot?: string;
    isLocked: boolean;
    additionalInstructions?: string;
    items?: any[];
  }
  
  const { data: ordersData, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });
  
  const orders = ordersData || [];

  // Accept suggested delivery date mutation
  const acceptSuggestionMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest(`/api/orders/${orderId}/accept-date`, {
        method: 'POST'
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Termin akzeptiert',
        description: 'Der vorgeschlagene Liefertermin wurde akzeptiert.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowAcceptDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Der Termin konnte nicht akzeptiert werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Neue Mutation für eigene Terminvorschläge
  const suggestDateMutation = useMutation({
    mutationFn: async ({ orderId, date, timeSlot }: { orderId: number, date: string, timeSlot: string }) => {
      // Debugging-Log
      console.log("Sende an API:", {
        orderId,
        suggestedDeliveryDate: date,
        suggestedTimeSlot: timeSlot
      });
      
      const res = await apiRequest(`/api/orders/${orderId}/suggest-date`, {
        method: 'POST',
        body: JSON.stringify({
          suggestedDate: date,
          suggestedTimeSlot: timeSlot
        }),
      });
      
      // Wenn die Antwort nicht OK ist, wirf den Fehler mit der Fehlermeldung
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Ein Fehler ist aufgetreten");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Terminvorschlag gesendet',
        description: 'Ihr Terminvorschlag wurde erfolgreich übermittelt.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowSuggestionDialog(false);
      setSuggestedDate("");
      setSuggestedTimeSlot("");
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Der Terminvorschlag konnte nicht gesendet werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleAcceptSuggestion = () => {
    if (selectedOrder) {
      acceptSuggestionMutation.mutate(selectedOrder.id);
    }
  };

  const handleShowOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const handleShowSuggestionDialog = (order: any) => {
    setSelectedOrder(order);
    setShowSuggestionDialog(true);
    // Setze Standardwerte, falls der Benutzer bereits einen Termin vorgeschlagen hat
    if (order.suggestedDeliveryDate && !order.finalDeliveryDate) {
      // Konvertiere das Datum ins richtige Format (YYYY-MM-DD)
      const date = new Date(order.suggestedDeliveryDate);
      setSuggestedDate(date.toISOString().split('T')[0]);
      setSuggestedTimeSlot(order.suggestedTimeSlot || "");
    } else {
      // Setze den ursprünglichen Wunschtermin als Ausgangspunkt
      const date = new Date(order.desiredDeliveryDate);
      setSuggestedDate(date.toISOString().split('T')[0]);
      setSuggestedTimeSlot(order.desiredTimeSlot || "");
    }
  };
  
  const handleSuggestDate = () => {
    if (selectedOrder && suggestedDate && suggestedTimeSlot) {
      console.log("Sende Terminvorschlag:", {
        orderId: selectedOrder.id,
        date: suggestedDate,
        timeSlot: suggestedTimeSlot
      });
      
      suggestDateMutation.mutate({
        orderId: selectedOrder.id,
        date: suggestedDate, // Das Datum ist bereits im ISO-Format YYYY-MM-DD
        timeSlot: suggestedTimeSlot
      });
    } else {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie ein Datum und eine Uhrzeit aus.",
        variant: "destructive"
      });
    }
  };

  const handleShowAcceptDialog = (order: any) => {
    setSelectedOrder(order);
    setShowAcceptDialog(true);
  };

  // Handler zum Öffnen des Bearbeitungsmodals
  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  // Handler für die erfolgreiche Aktualisierung der Bestellung
  const handleOrderUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: [`/api/orders/${selectedOrder?.id}`] });
    toast({
      title: 'Bestellung aktualisiert',
      description: 'Ihre Bestellung wurde erfolgreich aktualisiert.',
    });
  };
  
  // Löschen-Dialog anzeigen
  const handleShowDeleteDialog = (order: any) => {
    setSelectedOrder(order);
    setShowDeleteDialog(true);
  };
  
  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest(`/api/orders/${orderId}/cancel`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Ein Fehler ist aufgetreten");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Bestellung storniert',
        description: 'Ihre Bestellung wurde erfolgreich storniert.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setCancelDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Die Bestellung konnte nicht storniert werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Bestellung stornieren
  const handleCancelOrder = () => {
    if (selectedOrder) {
      cancelOrderMutation.mutate(selectedOrder.id);
    }
  };
  
  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Ein Fehler ist aufgetreten");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Bestellung gelöscht',
        description: 'Ihre Bestellung wurde erfolgreich gelöscht.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Die Bestellung konnte nicht gelöscht werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Bestellung löschen
  const handleDeleteOrder = () => {
    if (selectedOrder) {
      deleteOrderMutation.mutate(selectedOrder.id);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
  };

  return (
    <MainLayout>
      <section className="py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8 font-sans">Meine Bestellungen</h1>
          
          <Card>
            <CardContent className="p-0">
              {/* Desktop-Ansicht */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bestell-Nr.</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Wunschtermin</TableHead>
                      <TableHead>Vorgeschlagener Termin</TableHead>
                      <TableHead>Finaler Termin</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Lädt Bestellungen...
                        </TableCell>
                      </TableRow>
                    ) : orders?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Keine Bestellungen vorhanden
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders?.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                              {statusLabels[order.status as keyof typeof statusLabels]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.finalDeliveryDate ? (
                              <span className="line-through text-gray-500">
                                {formatDate(order.desiredDeliveryDate)}, 
                                {' '}{timeSlotLabels[order.desiredTimeSlot as keyof typeof timeSlotLabels]}
                              </span>
                            ) : (
                              <>
                                {formatDate(order.desiredDeliveryDate)}, 
                                {' '}{timeSlotLabels[order.desiredTimeSlot as keyof typeof timeSlotLabels]}
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.suggestedDeliveryDate ? (
                              order.finalDeliveryDate ? (
                                <span className="line-through text-gray-500">
                                  {formatDate(order.suggestedDeliveryDate)}, {timeSlotLabels[order.suggestedTimeSlot as keyof typeof timeSlotLabels]}
                                </span>
                              ) : (
                                <span className="font-medium text-amber-600">
                                  {formatDate(order.suggestedDeliveryDate)}, {timeSlotLabels[order.suggestedTimeSlot as keyof typeof timeSlotLabels]}
                                </span>
                              )
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {order.finalDeliveryDate ? (
                              <span className="font-medium text-green-600">
                                {formatDate(order.finalDeliveryDate)}, {timeSlotLabels[order.finalTimeSlot as keyof typeof timeSlotLabels]}
                              </span>
                            ) : 'Ausstehend'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleShowOrderDetails(order)}
                                title="Details anzeigen"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {!order.isLocked && order.status !== 'completed' && order.status !== 'cancelled' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditOrder(order)}
                                  title="Bestellung bearbeiten"
                                >
                                  <PenLine className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* Stornieren wenn: nicht cancelled, nicht completed, und KEIN finaler Liefertermin */}
                              {order.status !== 'cancelled' && 
                               order.status !== 'completed' && 
                               !order.finalDeliveryDate ? (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-amber-600"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setCancelDialogOpen(true);
                                  }}
                                  title="Bestellung stornieren"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                              ) : (
                                /* Löschen wenn: cancelled oder completed. Oder (finaler Termin UND completed) */
                                order.status === 'cancelled' || 
                                (order.status === 'completed') ? (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleShowDeleteDialog(order)}
                                    title="Bestellung löschen"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                ) : (
                                  /* Deaktiviert wenn: Finaler Termin UND nicht completed */
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    disabled
                                    title="Bestellungen mit bestätigtem Liefertermin können erst nach Abschluss gelöscht werden"
                                  >
                                    <X className="h-4 w-4 text-gray-400" />
                                  </Button>
                                )
                              )}
                              

                              
                              {order.suggestedDeliveryDate && !order.finalDeliveryDate && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleShowAcceptDialog(order)}
                                  title="Vorgeschlagenen Termin akzeptieren"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              
                              {/* Spezieller Button für Reaktion auf Admin-Vorschlag */}
                              {(order.status === 'pending_customer_review' || order.suggestedDeliveryDate) && !order.finalDeliveryDate && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleShowSuggestionDialog(order)}
                                  title="Gegenvorschlag senden"
                                >
                                  <Clock className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              
                              {/* Standard Button für Terminanpassung durch Kunden */}
                              {order.status !== 'completed' && 
                               order.status !== 'cancelled' && 
                               !order.suggestedDeliveryDate &&
                               order.status !== 'pending_customer_review' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleShowSuggestionDialog(order)}
                                  title="Termin anpassen"
                                >
                                  <CalendarRange className="h-4 w-4 text-amber-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Mobile-Ansicht (Karten statt Tabelle) */}
              <div className="md:hidden space-y-4 p-4">
                {ordersLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    Lädt Bestellungen...
                  </div>
                ) : orders?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Keine Bestellungen vorhanden
                  </div>
                ) : (
                  orders?.map((order: any) => (
                    <Card key={order.id} className="shadow-sm hover:shadow-md transition-shadow border">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base font-medium">#{order.orderNumber}</CardTitle>
                            <p className="text-xs font-medium">
                              {formatDate(order.createdAt)}
                            </p>
                            <p className="text-xs text-primary-700 font-semibold">
                              {new Date(order.createdAt).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} Uhr
                            </p>
                          </div>
                          <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                            {statusLabels[order.status as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-3 space-y-3">
                        {/* Termininformationen */}
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Wunschtermin</p>
                            {order.finalDeliveryDate ? (
                              <p className="line-through text-gray-500">
                                {formatDate(order.desiredDeliveryDate)}, 
                                {' '}{timeSlotLabels[order.desiredTimeSlot as keyof typeof timeSlotLabels]}
                              </p>
                            ) : (
                              <p>
                                {formatDate(order.desiredDeliveryDate)}, 
                                {' '}{timeSlotLabels[order.desiredTimeSlot as keyof typeof timeSlotLabels]}
                              </p>
                            )}
                          </div>
                          
                          {order.suggestedDeliveryDate && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Vorgeschlagener Termin</p>
                              {order.finalDeliveryDate ? (
                                <p className="line-through text-gray-500">
                                  {formatDate(order.suggestedDeliveryDate)}, {timeSlotLabels[order.suggestedTimeSlot as keyof typeof timeSlotLabels]}
                                </p>
                              ) : (
                                <p className="font-medium text-amber-600">
                                  {formatDate(order.suggestedDeliveryDate)}, {timeSlotLabels[order.suggestedTimeSlot as keyof typeof timeSlotLabels]}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {order.finalDeliveryDate && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Finaler Termin</p>
                              <p className="font-medium text-green-600">
                                {formatDate(order.finalDeliveryDate)}, {timeSlotLabels[order.finalTimeSlot as keyof typeof timeSlotLabels]}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Aktionen */}
                        <div className="pt-2 border-t mt-2 flex flex-col gap-2">
                          <div className="flex space-x-2 justify-center mb-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleShowOrderDetails(order)}
                              className="flex-1"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                            
                            {!order.isLocked && order.status !== 'completed' && order.status !== 'cancelled' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditOrder(order)}
                                className="flex-1"
                              >
                                <PenLine className="h-4 w-4 mr-2" />
                                Bearbeiten
                              </Button>
                            )}
                            
                            {/* Stornieren wenn: nicht cancelled, nicht completed, und kein finaler Liefertermin */}
                            {order.status !== 'cancelled' && 
                             order.status !== 'completed' && 
                             !order.finalDeliveryDate ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setCancelDialogOpen(true);
                                }}
                                className="flex-1 text-amber-600"
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Stornieren
                              </Button>
                            ) : (
                              /* Löschen wenn: cancelled oder completed. Oder (finaler Termin UND completed) */
                              order.status === 'cancelled' || 
                              (order.status === 'completed') ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleShowDeleteDialog(order)}
                                  className="flex-1"
                                >
                                  <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                  Löschen
                                </Button>
                              ) : (
                                /* Deaktiviert wenn: finaler Termin und nicht completed */
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled
                                  className="flex-1 text-gray-500"
                                  title="Bestellungen mit bestätigtem Liefertermin können erst nach Abschluss gelöscht werden"
                                >
                                  <X className="h-4 w-4 mr-2 text-gray-400" />
                                  Nicht möglich
                                </Button>
                              )
                            )}
                          </div>
                          
                          {order.suggestedDeliveryDate && !order.finalDeliveryDate && (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleShowAcceptDialog(order)}
                              className="w-full"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Termin akzeptieren
                            </Button>
                          )}
                          
                          {(order.status === 'pending_customer_review' || order.suggestedDeliveryDate) && !order.finalDeliveryDate && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleShowSuggestionDialog(order)}
                              className="w-full"
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Gegenvorschlag senden
                            </Button>
                          )}
                          
                          {order.status !== 'completed' && 
                           order.status !== 'cancelled' && 
                           !order.suggestedDeliveryDate &&
                           order.status !== 'pending_customer_review' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleShowSuggestionDialog(order)}
                              className="w-full"
                            >
                              <CalendarRange className="h-4 w-4 mr-2" />
                              Termin anpassen
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Order Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Bestelldetails</DialogTitle>
            <DialogDescription>
              Bestellnummer: {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Bestellinformationen</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge className={statusColors[selectedOrder.status as keyof typeof statusColors]}>
                      {statusLabels[selectedOrder.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bestelldatum</p>
                    <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                    <p className="text-sm text-primary-700 font-semibold">
                      {new Date(selectedOrder.createdAt).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} Uhr
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gewünschter Liefertermin</p>
                    <p className={selectedOrder.finalDeliveryDate ? "line-through text-gray-400" : ""}>
                      {formatDate(selectedOrder.desiredDeliveryDate)}, 
                      {' '}{timeSlotLabels[selectedOrder.desiredTimeSlot as keyof typeof timeSlotLabels]}
                    </p>
                  </div>
                  {selectedOrder.suggestedDeliveryDate && (
                    <div>
                      <p className="text-sm text-gray-500">Vorgeschlagener Liefertermin</p>
                      <p className={selectedOrder.finalDeliveryDate ? "line-through text-gray-400" : "font-medium text-amber-600"}>
                        {formatDate(selectedOrder.suggestedDeliveryDate)}, 
                        {' '}{timeSlotLabels[selectedOrder.suggestedTimeSlot as keyof typeof timeSlotLabels]}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Finaler Liefertermin</p>
                    <p className={selectedOrder.finalDeliveryDate ? "font-medium text-green-600" : ""}>
                      {selectedOrder.finalDeliveryDate 
                        ? `${formatDate(selectedOrder.finalDeliveryDate)}, ${timeSlotLabels[selectedOrder.finalTimeSlot as keyof typeof timeSlotLabels]}` 
                        : 'Noch nicht festgelegt'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Lieferadresse hinzufügen */}
              <div>
                <h3 className="text-lg font-medium mb-2">Lieferadresse</h3>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  {selectedOrder.addressFullName ? (
                    <>
                      <p className="font-medium">{selectedOrder.addressFullName}</p>
                      <p>{selectedOrder.addressStreet} {selectedOrder.addressHouseNumber}</p>
                      <p>{selectedOrder.addressPostalCode} {selectedOrder.addressCity}</p>
                      {selectedOrder.addressAdditionalInfo && (
                        <p className="text-gray-600 mt-1">{selectedOrder.addressAdditionalInfo}</p>
                      )}
                    </>
                  ) : selectedOrder.address ? (
                    <>
                      <p className="font-medium">{selectedOrder.address.fullName}</p>
                      <p>{selectedOrder.address.street} {selectedOrder.address.houseNumber}</p>
                      <p>{selectedOrder.address.postalCode} {selectedOrder.address.city}</p>
                      {selectedOrder.address.additionalInfo && (
                        <p className="text-gray-600 mt-1">{selectedOrder.address.additionalInfo}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 italic">Keine Adressinformationen verfügbar</p>
                  )}
                </div>
              </div>
              
              {selectedOrder.additionalInstructions && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Zusätzliche Anweisungen</h3>
                  <p className="text-gray-700">{selectedOrder.additionalInstructions}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-medium mb-2">Bestellte Produkte</h3>
                <div className="overflow-y-auto">
                  <div className="w-full">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt</th>
                          <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anzahl</th>
                          <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Geschäft</th>
                          <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anmerkungen</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedOrder.items?.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-3 py-3 whitespace-normal break-words text-sm font-medium text-gray-900">{item.productName}</td>
                            <td className="px-3 py-3 whitespace-normal break-words text-sm text-gray-500">{item.quantity}</td>
                            <td className="px-3 py-3 whitespace-normal break-words text-sm text-gray-500">{item.store}</td>
                            <td className="px-3 py-3 whitespace-normal break-words text-sm text-gray-500">{item.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Suggestion Dialog */}
      <ConfirmDialog
        isOpen={showAcceptDialog}
        onClose={() => setShowAcceptDialog(false)}
        onConfirm={handleAcceptSuggestion}
        title="Liefertermin akzeptieren"
        description={`Möchten Sie den vorgeschlagenen Liefertermin (${selectedOrder?.suggestedDeliveryDate ? formatDate(selectedOrder.suggestedDeliveryDate) : ''}, ${selectedOrder?.suggestedTimeSlot ? timeSlotLabels[selectedOrder.suggestedTimeSlot as keyof typeof timeSlotLabels] : ''}) akzeptieren?`}
        confirmText="Termin akzeptieren"
        isLoading={acceptSuggestionMutation.isPending}
      />

      {/* Suggest New Date Dialog */}
      <Dialog open={showSuggestionDialog} onOpenChange={setShowSuggestionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.status === 'pending_customer_review' 
                ? 'Gegenvorschlag senden' 
                : 'Neuen Liefertermin vorschlagen'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.status === 'pending_customer_review'
                ? `Der Administrator hat einen Liefertermin am ${selectedOrder?.suggestedDeliveryDate ? formatDate(selectedOrder.suggestedDeliveryDate) : ''} (${selectedOrder?.suggestedTimeSlot ? timeSlotLabels[selectedOrder.suggestedTimeSlot as keyof typeof timeSlotLabels] : ''}) vorgeschlagen. Sie können diesen akzeptieren oder einen Gegenvorschlag senden.`
                : `Bitte wählen Sie einen alternativen Liefertermin für Ihre Bestellung ${selectedOrder?.orderNumber}.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Datum</label>
              <Input 
                type="date" 
                value={suggestedDate}
                onChange={(e) => setSuggestedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} // Nur zukünftige Termine erlauben
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Zeitfenster</label>
              <Select 
                value={suggestedTimeSlot} 
                onValueChange={setSuggestedTimeSlot}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zeitfenster auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestionDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSuggestDate}
              disabled={!suggestedDate || !suggestedTimeSlot || suggestDateMutation.isPending}
            >
              {suggestDateMutation.isPending ? "Wird gesendet..." : 
                selectedOrder?.status === 'pending_customer_review' 
                  ? "Gegenvorschlag senden" 
                  : "Termin vorschlagen"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bearbeiten-Modal für Produkte */}
      {selectedOrder && (
        <ProductListEditorModal
          isOpen={showEditModal}
          onOpenChange={setShowEditModal}
          onSave={handleOrderUpdated}
          orderId={selectedOrder.id}
          orderItems={selectedOrder.items || []}
          isLocked={selectedOrder.isLocked}
          store={selectedOrder.store || ""}
        />
      )}
      
      {/* Cancel Order Dialog */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelOrder}
        title="Bestellung stornieren"
        description={`Möchten Sie die Bestellung ${selectedOrder?.orderNumber} wirklich stornieren? Die Bestellung wird als storniert markiert und kann nicht mehr bearbeitet werden.`}
        confirmText="Bestellung stornieren"
        isLoading={cancelOrderMutation.isPending}
      />
      
      {/* Delete Order Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteOrder}
        title="Bestellung löschen"
        description={`Möchten Sie die Bestellung ${selectedOrder?.orderNumber} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmText="Bestellung löschen"
        isLoading={deleteOrderMutation.isPending}
      />
    </MainLayout>
  );
};

export default MyOrdersPage;

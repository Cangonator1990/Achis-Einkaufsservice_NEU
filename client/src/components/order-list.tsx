import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { 
  Loader2,
  Eye,
  Lock,
  Unlock,
  PenLine,
  CheckCircle,
  Calendar,
  CalendarClock,
  AlertCircle,
  Trash2,
  Clock,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Definieren eines String-Literals für OrderStatus
type OrderStatus = 
  | 'new' 
  | 'pending_admin_review' 
  | 'pending_customer_review' 
  | 'date_forced' 
  | 'date_accepted' 
  | 'completed' 
  | 'canceled' 
  | 'cancelled';

// Order-Interface definieren
interface Order {
  id: number;
  userId: number;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  desiredDeliveryDate: string;
  desiredTimeSlot: string;
  suggestedDeliveryDate?: string;
  suggestedTimeSlot?: string;
  finalDeliveryDate?: string;
  finalTimeSlot?: string;
  isLocked: boolean;
  additionalInstructions?: string;
  store?: string;
  items?: any[];
  addressId?: number;
}

const statusColors: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  pending_admin_review: 'bg-purple-100 text-purple-800',
  pending_customer_review: 'bg-yellow-100 text-yellow-800',
  date_forced: 'bg-orange-100 text-orange-800',
  date_accepted: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-rose-100 text-rose-800 border-2 border-rose-300 font-bold',
  canceled: 'bg-rose-100 text-rose-800 border-2 border-rose-300 font-bold',
};

const statusLabels: Record<OrderStatus, string> = {
  new: 'Neu',
  pending_admin_review: 'Wartet auf Admin-Prüfung',
  pending_customer_review: 'Wartet auf Kundenbestätigung',
  date_forced: 'Termin festgelegt',
  date_accepted: 'Termin akzeptiert',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  canceled: 'Storniert',
};

const TIME_SLOT_OPTIONS = [
  { value: 'morning', label: 'Vormittag (9:00 - 12:00)' },
  { value: 'afternoon', label: 'Nachmittag (13:00 - 16:00)' },
  { value: 'evening', label: 'Abend (17:00 - 20:00)' },
];

const getStatusBadge = (status: string) => {
  const color = statusColors[status as OrderStatus] || 'bg-gray-100 text-gray-800';
  const label = statusLabels[status as OrderStatus] || status;
  return <Badge variant="outline" className={color}>{label}</Badge>;
};

const formatDeliveryTime = (time?: string) => {
  if (!time) return "-";
  return TIME_SLOT_OPTIONS.find(slot => slot.value === time)?.label || time;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return format(date, "dd.MM.yyyy", { locale: de });
  } catch {
    return dateString;
  }
};

export function OrderList() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState('');
  const [suggestedTimeSlot, setSuggestedTimeSlot] = useState('');

  // Accept date mutation
  const acceptDateMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest(`/api/orders/${orderId}/accept-date`, {
        method: 'POST'
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Termin akzeptiert',
        description: 'Der vorgeschlagene Termin wurde akzeptiert.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowAcceptDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Suggest new date mutation
  const suggestDateMutation = useMutation({
    mutationFn: async ({ orderId, date, timeSlot }: { orderId: number, date: string, timeSlot: string }) => {
      const res = await apiRequest(`/api/orders/${orderId}/suggest-date`, {
        method: 'POST',
        body: JSON.stringify({ suggestedDate: date, suggestedTimeSlot: timeSlot })
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Termin vorgeschlagen',
        description: 'Ihr Terminvorschlag wurde gesendet.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowSuggestDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSuggestDate = () => {
    if (selectedOrder && suggestedDate && suggestedTimeSlot) {
      suggestDateMutation.mutate({
        orderId: selectedOrder.id,
        date: suggestedDate,
        timeSlot: suggestedTimeSlot
      });
    }
  };

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest(`/api/orders/${orderId}/cancel`, {
        method: 'POST'
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Bestellung storniert',
        description: 'Die Bestellung wurde erfolgreich storniert.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowCancelDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Bestellung gelöscht',
        description: 'Die Bestellung wurde erfolgreich gelöscht.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch orders
  const { data: orders = [] as Order[], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Meine Bestellungen</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Meine Bestellungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Sie haben noch keine Bestellungen aufgegeben
            </h3>
            <Button onClick={() => setLocation("/order")}>
              Jetzt bestellen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dialog Komponenten für die verschiedenen Aktionen
  const renderCancelDialog = () => {
    if (!selectedOrder) return null;
    return (
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bestellung stornieren</DialogTitle>
            <DialogDescription>
              Möchten Sie die Bestellung #{selectedOrder.orderNumber} wirklich stornieren? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p>Nach der Stornierung wird die Bestellung als "Storniert" markiert und kann nicht mehr bearbeitet werden.</p>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => cancelOrderMutation.mutate(selectedOrder.id)}
              disabled={cancelOrderMutation.isPending}
            >
              {cancelOrderMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird storniert...</>
              ) : (
                <>Bestellung stornieren</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderDeleteDialog = () => {
    if (!selectedOrder) return null;
    return (
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bestellung löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie die Bestellung #{selectedOrder.orderNumber} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p>Bei der Löschung wird die Bestellung für den Kunden unsichtbar, bleibt aber in der Datenbank für Adminzwecke erhalten.</p>
            <p className="text-red-500 font-medium">
              <AlertCircle className="h-4 w-4 inline-block mr-1" />
              Diese Aktion sollte nur durchgeführt werden, wenn die Bestellung ungültig ist oder auf Kundenwunsch gelöscht werden soll.
            </p>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteOrderMutation.mutate(selectedOrder.id)}
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gelöscht...</>
              ) : (
                <>Bestellung löschen</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      {renderCancelDialog()}
      {renderDeleteDialog()}
      
      {/* Deklaration der useAuth Hook Variable */}
      <div className="hidden">{/* Verstecktes Element für Deklarationen */}
        {useAuth().user ? null : null}
      </div>
      
      <Card className="mb-8 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Meine Bestellungen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop-Tabelle (nur auf md und größeren Bildschirmen anzeigen) */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="min-w-[800px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[10%]">Bestell-Nr.</TableHead>
                  <TableHead className="w-[12%]">Datum</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[10%]">Geschäft</TableHead>
                  <TableHead className="w-[15%]">Wunschtermin</TableHead>
                  <TableHead className="w-[15%]">Vorgeschlagener Termin</TableHead>
                  <TableHead className="w-[15%]">Finaler Termin</TableHead>
                  <TableHead className="text-right w-[11%]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatDate(order.createdAt)}</span>
                      <div className="text-sm text-primary-700 font-semibold mt-1">
                        {new Date(order.createdAt).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} Uhr
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {order.store || "-"}
                    </TableCell>
                    <TableCell>
                      {formatDate(order.desiredDeliveryDate)}
                      {order.desiredTimeSlot && <>, {formatDeliveryTime(order.desiredTimeSlot)}</>}
                    </TableCell>
                    <TableCell>
                      {order.suggestedDeliveryDate ? (
                        <>
                          {formatDate(order.suggestedDeliveryDate)}
                          {order.suggestedTimeSlot && <>, {formatDeliveryTime(order.suggestedTimeSlot)}</>}
                          {order.status === 'pending_customer_review' && (
                            <div className="mt-2 space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowAcceptDialog(true);
                                }}
                              >
                                Akzeptieren
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowSuggestDialog(true);
                                }}
                              >
                                Gegenvorschlag
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {order.finalDeliveryDate ? (
                        <div className="font-medium text-green-700 border border-green-200 rounded-md px-2 py-1 bg-green-50 inline-block">
                          <CheckCircle className="h-4 w-4 inline-block mr-1 text-green-600" />
                          {formatDate(order.finalDeliveryDate)}
                          {order.finalTimeSlot && <>, {formatDeliveryTime(order.finalTimeSlot)}</>}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="hover:bg-primary/10"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Details
                        </Button>
                        
                        {!order.isLocked && order.status !== 'date_forced' ? (
                          <Button 
                            variant="default" 
                            size="sm"
                            className="hover:bg-primary-600"
                            onClick={() => setLocation(`/order/${order.id}`)}
                          >
                            <PenLine className="h-4 w-4 mr-1" /> Bearbeiten
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-gray-400 cursor-not-allowed" 
                            disabled
                          >
                            {order.status === 'date_forced' ? 
                              <><CalendarClock className="h-4 w-4 mr-1" /> Termin</> : 
                              <><Lock className="h-4 w-4 mr-1" /> Gesperrt</>}
                          </Button>
                        )}
                        
                        {/* Stornieren-Button (nur anzeigen, wenn Status nicht "cancelled" oder "canceled" ist) */}
                        {order.status !== 'cancelled' && order.status !== 'canceled' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="hover:bg-red-50 text-red-600 border-red-200"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowCancelDialog(true);
                            }}
                          >
                            <AlertCircle className="h-4 w-4 mr-1" /> Stornieren
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="hover:bg-red-50"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Löschen
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile-Ansicht (Karten statt Tabelle) */}
          <div className="md:hidden space-y-4 p-3">
            {orders.map((order) => (
              <Card key={order.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-medium">#{order.orderNumber}</CardTitle>
                      <CardDescription className="text-xs">
                        <span className="font-medium">{formatDate(order.createdAt)}</span>
                      </CardDescription>
                      <CardDescription className="text-xs text-primary-700 font-semibold">
                        {new Date(order.createdAt).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} Uhr
                      </CardDescription>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent className="py-2 space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Geschäft</p>
                      <p className="truncate">{order.store || "-"}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Status</p>
                      <p className="text-sm">{order.isLocked ? (
                          <Badge variant="destructive" className="mt-1">
                            <Lock className="h-3 w-3 mr-1" /> Gesperrt
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="mt-1">
                            <Unlock className="h-3 w-3 mr-1" /> Entsperrt
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Liefertermin</p>
                    {order.finalDeliveryDate ? (
                      <div>
                        {/* Durchgestrichener ursprünglicher Wunschtermin */}
                        <div className="line-through text-gray-400 text-xs">
                          {formatDate(order.desiredDeliveryDate)} ({formatDeliveryTime(order.desiredTimeSlot)})
                        </div>
                        
                        {/* Falls ein Vorschlag existiert, auch diesen durchgestrichen anzeigen */}
                        {order.suggestedDeliveryDate && (
                          <div className="line-through text-gray-400 text-xs">
                            {formatDate(order.suggestedDeliveryDate)} ({formatDeliveryTime(order.suggestedTimeSlot || "")})
                          </div>
                        )}
                        
                        {/* Finaler Termin */}
                        <div className="font-medium text-green-700 border border-green-200 rounded-md px-2 py-1 bg-green-50 mt-1">
                          <CheckCircle className="h-4 w-4 inline-block mr-1 text-green-600" />
                          {formatDate(order.finalDeliveryDate)} ({formatDeliveryTime(order.finalTimeSlot || "")})
                        </div>
                      </div>
                    ) : order.suggestedDeliveryDate ? (
                      <div>
                        <div className="text-gray-400 text-xs">
                          {formatDate(order.desiredDeliveryDate)} (gewünscht)
                        </div>
                        <div className="font-medium text-amber-600 text-sm">
                          {formatDate(order.suggestedDeliveryDate)} ({formatDeliveryTime(order.suggestedTimeSlot || "")})
                        </div>
                        
                        {order.status === 'pending_customer_review' && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs px-2 py-0 h-7"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowAcceptDialog(true);
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Akzeptieren
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs px-2 py-0 h-7"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowSuggestDialog(true);
                              }}
                            >
                              <Calendar className="h-3 w-3 mr-1" /> Gegenvorschlag
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm">
                        {formatDate(order.desiredDeliveryDate)} ({formatDeliveryTime(order.desiredTimeSlot)})
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 px-3 pb-3 flex flex-wrap gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[80px]"
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDetailDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" /> Details
                  </Button>
                  
                  {!order.isLocked && order.status !== 'date_forced' ? (
                    <Button 
                      variant="default"
                      size="sm"
                      className="flex-1 min-w-[80px]"
                      onClick={() => setLocation(`/order/${order.id}`)}
                    >
                      <PenLine className="h-4 w-4 mr-1" /> Bearbeiten
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex-1 text-gray-400 cursor-not-allowed min-w-[80px]"
                      disabled
                    >
                      {order.status === 'date_forced' ? 
                        <><CalendarClock className="h-4 w-4 mr-1" /> Termin</> : 
                        <><Lock className="h-4 w-4 mr-1" /> Gesperrt</>}
                    </Button>
                  )}
                  
                  {/* Mobile: Stornieren-Button (wenn Bestellung nicht storniert ist) oder Löschen-Button (wenn storniert) */}
                  {order.status !== 'cancelled' && order.status !== 'canceled' ? (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[80px]"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowCancelDialog(true);
                      }}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" /> Stornieren
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[80px]"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Löschen
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-[500px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Bestellung {selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              Erstellt am <span className="font-medium">{selectedOrder && formatDate(selectedOrder.createdAt)}</span> um <span className="text-primary-700 font-semibold">{selectedOrder && new Date(selectedOrder.createdAt).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}</span> Uhr
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-lg font-medium">Bestellstatus</h3>
                <div className="flex flex-wrap gap-2 mt-2 mb-4">
                  {getStatusBadge(selectedOrder.status)}
                  <span>
                    {selectedOrder.isLocked ? (
                      <Badge variant="destructive">
                        <Lock className="h-3 w-3 mr-1" /> Gesperrt
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50">
                        <Unlock className="h-3 w-3 mr-1" /> Entsperrt
                      </Badge>
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Geschäft</h3>
                  <p className="mt-1 text-sm font-semibold break-words">{selectedOrder.store || "Keine Angabe"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Bestelldatum</h3>
                  <p className="mt-1 text-sm">
                    <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span> um <span className="text-primary-700 font-semibold">{new Date(selectedOrder.createdAt).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}</span> Uhr
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <h3 className="text-lg font-medium mb-3">Liefertermin</h3>
                
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <div className="font-medium text-gray-600">Wunschtermin</div>
                    <div className={`text-sm ${selectedOrder.finalDeliveryDate ? 'line-through text-gray-400' : 'font-semibold'}`}>
                      {formatDate(selectedOrder.desiredDeliveryDate)} • {formatDeliveryTime(selectedOrder.desiredTimeSlot)}
                    </div>
                  </div>
                  
                  {selectedOrder.suggestedDeliveryDate && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <div className="font-medium text-gray-600">Vorgeschlagener Termin</div>
                      <div className={`text-sm ${selectedOrder.finalDeliveryDate ? 'line-through text-gray-400' : 'font-semibold text-amber-600'}`}>
                        {formatDate(selectedOrder.suggestedDeliveryDate)} • {formatDeliveryTime(selectedOrder.suggestedTimeSlot || "")}
                      </div>
                    </div>
                  )}
                  
                  {selectedOrder.finalDeliveryDate && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <div className="font-medium text-gray-600">Finaler Termin</div>
                      <div className="text-sm font-semibold text-green-600">
                        {formatDate(selectedOrder.finalDeliveryDate)} • {formatDeliveryTime(selectedOrder.finalTimeSlot || "")}
                      </div>
                    </div>
                  )}
                  
                  {selectedOrder.status === 'pending_customer_review' && (
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => {
                          setShowDetailDialog(false);
                          setShowAcceptDialog(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Akzeptieren
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => {
                          setShowDetailDialog(false);
                          setShowSuggestDialog(true);
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-1" /> Gegenvorschlag
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.additionalInstructions && (
                <div>
                  <h3 className="text-lg font-medium">Zusätzliche Hinweise</h3>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm whitespace-pre-line break-words">{selectedOrder.additionalInstructions}</p>
                  </div>
                </div>
              )}

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Artikel</h3>
                  {/* Mobile-optimierte Kartenliste für die Artikel (nur auf kleinen Bildschirmen) */}
                  <div className="sm:hidden space-y-2">
                    {selectedOrder.items.map((item: any) => (
                      <div key={item.id} className="bg-gray-50 p-3 rounded-lg border">
                        <p className="font-medium text-sm">{item.productName}</p>
                        <div className="flex justify-between mt-1 text-sm">
                          <span className="text-gray-600">Menge:</span>
                          <span>{item.quantity}</span>
                        </div>
                        {item.notes && (
                          <div className="mt-1.5">
                            <p className="text-gray-600 text-xs">Hinweise:</p>
                            <p className="text-sm break-words">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Tabelle nur für größere Bildschirme */}
                  <div className="hidden sm:block rounded-md border overflow-hidden">
                    <div className="overflow-y-auto">
                      <div className="w-full">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Artikel</th>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Menge</th>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Hinweise</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedOrder.items.map((item: any) => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-3 py-3 whitespace-normal break-words text-sm font-medium text-gray-900">{item.productName}</td>
                                <td className="px-3 py-3 whitespace-normal text-sm text-gray-500">{item.quantity}</td>
                                <td className="px-3 py-3 whitespace-normal break-words text-sm text-gray-500">{item.notes || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {!selectedOrder.isLocked && selectedOrder.status !== 'date_forced' && (
                <div className="flex justify-end">
                  <Button 
                    variant="default"
                    onClick={() => {
                      setShowDetailDialog(false);
                      setLocation(`/order/${selectedOrder.id}`);
                    }}
                  >
                    <PenLine className="h-4 w-4 mr-2" /> Bearbeiten
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-[500px] overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Liefertermin akzeptieren</DialogTitle>
            <DialogDescription>
              Möchten Sie den vorgeschlagenen Liefertermin akzeptieren?
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && selectedOrder.suggestedDeliveryDate && selectedOrder.suggestedTimeSlot && (
            <div className="py-4">
              <p>Vorgeschlagener Termin: {formatDate(selectedOrder.suggestedDeliveryDate)}</p>
              <p>Zeitfenster: {formatDeliveryTime(selectedOrder.suggestedTimeSlot)}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => selectedOrder && acceptDateMutation.mutate(selectedOrder.id)}
              disabled={acceptDateMutation.isPending}
            >
              {acceptDateMutation.isPending ? "Wird akzeptiert..." : "Termin akzeptieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suggest Dialog */}
      <Dialog open={showSuggestDialog} onOpenChange={setShowSuggestDialog}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-[500px] overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Neuen Liefertermin vorschlagen</DialogTitle>
            <DialogDescription>
              Wählen Sie einen alternativen Liefertermin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={suggestedDate}
                  onChange={(e) => setSuggestedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div className="space-y-2">
                <Label>Zeitfenster</Label>
                <Select
                  value={suggestedTimeSlot}
                  onValueChange={setSuggestedTimeSlot}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zeitfenster wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOT_OPTIONS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSuggestDate}
              disabled={suggestDateMutation.isPending || !suggestedDate || !suggestedTimeSlot}
            >
              {suggestDateMutation.isPending ? "Wird vorgeschlagen..." : "Termin vorschlagen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
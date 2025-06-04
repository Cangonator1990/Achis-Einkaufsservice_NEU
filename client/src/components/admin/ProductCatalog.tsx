import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { IconShoppingBag, IconEdit, IconTrash, IconDotsVertical, IconPlus, IconPhoto, IconEye } from '@tabler/icons-react';

export function ProductCatalog() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Produktdaten für Demo - später durch echte API ersetzen
  const demoProducts = [
    { 
      id: 1, 
      name: 'Gemischter Lebensmittelkorb', 
      price: 49.99, 
      description: 'Ein Korb mit grundlegenden Lebensmitteln für eine Woche.', 
      category: 'Lebensmittel', 
      imageUrl: '/products/food-basket.jpg', 
      stock: 15, 
      isActive: true 
    },
    { 
      id: 2, 
      name: 'Bio-Gemüsebox', 
      price: 29.99, 
      description: 'Frisches Bio-Gemüse aus regionaler Erzeugung.', 
      category: 'Bio', 
      imageUrl: '/products/vegetables.jpg', 
      stock: 8, 
      isActive: true 
    },
    { 
      id: 3, 
      name: 'Premium Fleischpaket', 
      price: 89.99, 
      description: 'Hochwertiges Fleisch vom lokalen Metzger.', 
      category: 'Fleisch', 
      imageUrl: '/products/meat.jpg', 
      stock: 5, 
      isActive: true 
    },
    { 
      id: 4, 
      name: 'Vegane Snackbox', 
      price: 19.99, 
      description: 'Auswahl an veganen Snacks und Leckereien.', 
      category: 'Vegan', 
      imageUrl: '/products/vegan.jpg', 
      stock: 20, 
      isActive: true 
    },
    { 
      id: 5, 
      name: 'Haushaltsprodukte Set', 
      price: 34.99, 
      description: 'Grundlegende Haushaltsprodukte für Bad und Küche.', 
      category: 'Haushalt', 
      imageUrl: '/products/household.jpg', 
      stock: 12, 
      isActive: true 
    }
  ];

  // Alle Produkte abrufen - später durch echte API ersetzen
  const { data: products = demoProducts, isLoading } = useQuery({
    queryKey: ['/api/admin/products'],
    queryFn: async () => {
      console.log("Fetching admin products");
      // Wenn API existiert, diese verwenden:
      // const response = await apiRequest('/api/admin/products');
      // return response.json();
      
      // Für Demo Beispieldaten zurückgeben
      return demoProducts;
    },
    enabled: false // Deaktiviert, bis API existiert
  });

  // Produkte filtern
  const filteredProducts = products.filter((product: any) => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Produktdetails anzeigen
  const showProductDetails = (product: any) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  // Produkt bearbeiten
  const editProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  // Produkt löschen
  const deleteProduct = (productId: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Produkt löschen möchten?')) {
      toast({
        title: 'Produkt gelöscht',
        description: 'Das Produkt wurde erfolgreich gelöscht.',
      });
      // Hier API-Aufruf zum Löschen einfügen und Cache aktualisieren
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Produktkatalog</h2>
        <Button>
          <IconPlus className="mr-2 h-5 w-5" />
          Neues Produkt
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produktliste</CardTitle>
          <CardDescription>Verwalten Sie Ihren Produktkatalog.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Input
                  placeholder="Produkte durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              </div>
              <Button variant="outline">
                Filter
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="animate-pulse flex items-center space-x-4 p-4 border-b">
                    <div className="rounded bg-gray-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Preis</TableHead>
                      <TableHead>Lagerbestand</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">Keine Produkte gefunden</TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product: any) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Kein+Bild';
                                    }}
                                  />
                                ) : (
                                  <IconPhoto className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-gray-500 line-clamp-1">
                                  {product.description}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell>{product.price.toFixed(2)} €</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span>{product.stock}</span>
                              {product.stock < 10 && (
                                <Badge variant="destructive" className="ml-2">Niedrig</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.isActive ? 'default' : 'secondary'}>
                              {product.isActive ? 'Aktiv' : 'Inaktiv'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <IconDotsVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => showProductDetails(product)}>
                                  <IconEye className="mr-2 h-4 w-4" />
                                  Details anzeigen
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => editProduct(product)}>
                                  <IconEdit className="mr-2 h-4 w-4" />
                                  Bearbeiten
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => deleteProduct(product.id)}>
                                  <IconTrash className="mr-2 h-4 w-4" />
                                  Löschen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <div className="text-sm text-gray-500">
            {filteredProducts.length} Produkte angezeigt
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Zurück
            </Button>
            <Button variant="outline" size="sm">
              Weiter
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Produktdetails Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Produktdetails</DialogTitle>
            <DialogDescription>
              Detaillierte Informationen über das ausgewählte Produkt.
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="aspect-square w-full rounded-md bg-gray-100 overflow-hidden">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Kein+Bild';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IconPhoto className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Preis</h3>
                  <p className="text-xl font-bold">{selectedProduct.price.toFixed(2)} €</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Lagerbestand</h3>
                  <p className="flex items-center">
                    {selectedProduct.stock} Einheiten
                    {selectedProduct.stock < 10 && (
                      <Badge variant="destructive" className="ml-2">Niedrig</Badge>
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="text-xl font-bold">{selectedProduct.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Kategorie</h3>
                  <Badge variant="outline">{selectedProduct.category}</Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <Badge variant={selectedProduct.isActive ? 'default' : 'secondary'}>
                    {selectedProduct.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Beschreibung</h3>
                  <p className="text-gray-700">{selectedProduct.description}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Schließen
            </Button>
            <Button onClick={() => {
              setIsDetailsOpen(false);
              if (selectedProduct) editProduct(selectedProduct);
            }}>
              <IconEdit className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Fehlende Icons
function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
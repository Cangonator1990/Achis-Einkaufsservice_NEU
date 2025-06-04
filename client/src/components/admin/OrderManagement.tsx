import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconBasket } from '@tabler/icons-react';

export function OrderManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Bestellungen</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Bestellungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <IconBasket className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-lg font-medium">Keine Bestellungen</h3>
            <p className="text-gray-500">
              Es wurden keine Bestellungen gefunden.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
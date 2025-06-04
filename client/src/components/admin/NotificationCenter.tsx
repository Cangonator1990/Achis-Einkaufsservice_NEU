import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconBell } from '@tabler/icons-react';

export function NotificationCenter() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Benachrichtigungszentrale</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <IconBell className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-lg font-medium">Keine Benachrichtigungen</h3>
            <p className="text-gray-500">
              Sie haben keine Benachrichtigungen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
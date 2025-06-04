import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { IconChevronRight, IconEye } from '@tabler/icons-react';

/**
 * Karte für die Anzeige der neuesten Benutzer im Dashboard
 */
export function RecentUsersCard() {
  // Lade neueste Benutzer
  const { data: recentUsers = [], isLoading } = useQuery({
    queryKey: ['/api/admin/users/recent'],
    queryFn: async () => {
      console.log("Fetching recent users");
      try {
        const response = await apiRequest('/api/admin/users/recent-direct');
        return response.json();
      } catch (error) {
        console.error("Error fetching recent users:", error);
        return [];
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neueste Benutzer</CardTitle>
        <CardDescription>Die letzten 5 registrierten Benutzer</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="animate-pulse flex items-center justify-between p-2 border-b">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            ))
          ) : recentUsers.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              Keine Benutzer vorhanden
            </div>
          ) : (
            recentUsers.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between p-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {user.firstName && user.firstName.charAt(0)}
                    {user.lastName && user.lastName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.firstName || ''} {user.lastName || ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      @{user.username || 'noname'} • {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'kürzlich'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.isActive ? 'default' : 'destructive'}>
                    {user.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="ghost" size="icon">
                      <IconEye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Link href="/admin/users">
          <Button variant="ghost" className="text-sm">
            Alle Benutzer anzeigen
            <IconChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
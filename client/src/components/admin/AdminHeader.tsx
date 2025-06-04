import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function AdminHeader() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialen des Benutzers für den Avatar-Fallback
  const getInitials = () => {
    if (!user) return '';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;
  };

  return (
    <header className="bg-background border-b py-3 px-4 md:px-6 flex items-center justify-between">
      <div className="flex-1">
        <h2 className="text-lg font-medium">
          Admin Dashboard
        </h2>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('de-DE')}
        </p>
      </div>
      
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
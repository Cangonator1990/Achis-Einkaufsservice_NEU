import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from '@/components/notification-dropdown';
import { IconBellRinging, IconLogout, IconSettings, IconUser } from '@tabler/icons-react';
import { Link } from 'wouter';

/**
 * Header-Komponente für den Admin-Bereich
 */
export function AdminHeader() {
  const { user, logout } = useAuth();
  
  return (
    <header className="border-b bg-background sticky top-0 z-30">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="rounded-md bg-primary p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                  <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
                  <path d="M9 14h6" />
                </svg>
              </div>
              <span className="font-bold text-lg sm:text-xl">Admin-Portal</span>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationDropdown />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border">
                  <AvatarFallback>
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-0.5 leading-none">
                  <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <IconUser className="mr-2 h-4 w-4" />
                  <span>Mein Profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings">
                  <IconSettings className="mr-2 h-4 w-4" />
                  <span>Einstellungen</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <IconLogout className="mr-2 h-4 w-4" />
                <span>Abmelden</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
import { ReactNode } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

/**
 * Eigenschaften für die AdminLayout-Komponente
 */
interface AdminLayoutProps {
  /** Kinder-Komponenten, die innerhalb des Layouts gerendert werden */
  children: ReactNode;
}

/**
 * Haupt-Layout-Komponente für den Admin-Bereich
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <div className="flex flex-1 flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
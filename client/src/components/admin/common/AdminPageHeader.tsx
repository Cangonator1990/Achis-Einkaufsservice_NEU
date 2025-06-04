import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

/**
 * Eigenschaften für die AdminPageHeader-Komponente
 */
interface AdminPageHeaderProps {
  /** Titel der Seite */
  title: string;
  /** Beschreibung der Seite (optional) */
  description?: string;
  /** Konfiguration für einen optionalen Aktions-Button */
  actionButton?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
  };
}

/**
 * Wiederverwendbare Komponente für Seitenüberschriften im Admin-Bereich
 */
export function AdminPageHeader({ title, description, actionButton }: AdminPageHeaderProps) {
  return (
    <div className="flex justify-between items-center pb-4 border-b">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-gray-500 mt-1">{description}</p>
        )}
      </div>
      
      {actionButton && (
        <Button onClick={actionButton.onClick}>
          {actionButton.icon && (
            <span className="mr-2">{actionButton.icon}</span>
          )}
          {actionButton.label}
        </Button>
      )}
    </div>
  );
}
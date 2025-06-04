import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';

/**
 * Eigenschaften für die AdminCard-Komponente
 */
interface AdminCardProps {
  /** Titel der Karte */
  title: string;
  /** Beschreibung der Karte (optional) */
  description?: string;
  /** Inhalt der Karte */
  children: ReactNode;
  /** Footer-Inhalt (optional) */
  footer?: ReactNode;
  /** Zusätzliche CSS-Klassen (optional) */
  className?: string;
}

/**
 * Wiederverwendbare Card-Komponente für den Admin-Bereich
 */
export function AdminCard({ title, description, children, footer, className = '' }: AdminCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className="border-t pt-4">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
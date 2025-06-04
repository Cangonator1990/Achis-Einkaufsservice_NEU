import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';

/**
 * Eigenschaften für die Statistikkarte
 */
interface StatCardProps {
  /** Titel der Statistik */
  title: string;
  /** Angezeigter Wert */
  value: string | number;
  /** Beschreibung unter dem Wert */
  description: string;
  /** Icon, das die Statistik darstellt */
  icon: ReactNode;
  /** Optionale Trend-Informationen */
  trend?: {
    /** Prozentwert des Trends */
    value: number;
    /** Ob der Trend positiv ist */
    positive: boolean;
  };
}

/**
 * Statistikkarte für das Admin-Dashboard
 * Zeigt eine Kennzahl mit Icon, Wert und optionalem Trend an
 */
export function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-full text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <CardDescription className="flex items-center mt-1">
          {description}
          {trend && (
            <span className={`flex items-center ml-2 ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.positive ? <IconArrowUp className="w-4 h-4 mr-1" /> : <IconArrowDown className="w-4 h-4 mr-1" />}
              {trend.value}%
            </span>
          )}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
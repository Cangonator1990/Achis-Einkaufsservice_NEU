import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconSearch } from '@tabler/icons-react';

/**
 * Eigenschaften für die OrderFilter-Komponente
 */
interface OrderFilterProps {
  /** Aktueller Suchbegriff */
  searchQuery: string;
  /** Callback für Änderung des Suchbegriffs */
  onSearchChange: (value: string) => void;
  /** Aktueller Tab/Filter */
  activeTab: string;
  /** Callback für Tab-Änderung */
  onTabChange: (value: string) => void;
}

/**
 * Komponente für Filter und Suche in der Bestellungsverwaltung
 */
export function OrderFilter({ searchQuery, onSearchChange, activeTab, onTabChange }: OrderFilterProps) {
  return (
    <div className="flex gap-4 items-center">
      {/* Suchfeld */}
      <div className="relative flex-1">
        <Input
          placeholder="Suchen nach Bestellnummer oder Kundennamen..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
        <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
      </div>
      
      {/* Filter-Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="new">Neu</TabsTrigger>
          <TabsTrigger value="processing">In Bearbeitung</TabsTrigger>
          <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
          <TabsTrigger value="deleted">Gelöscht</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
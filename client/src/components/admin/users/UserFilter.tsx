import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconSearch } from '@tabler/icons-react';

/**
 * Eigenschaften für die UserFilter-Komponente
 */
interface UserFilterProps {
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
 * Komponente für Filter und Suche in der Benutzerverwaltung
 */
export function UserFilter({ searchQuery, onSearchChange, activeTab, onTabChange }: UserFilterProps) {
  return (
    <div className="flex gap-4 items-center">
      {/* Suchfeld */}
      <div className="relative flex-1">
        <Input
          placeholder="Suchen nach Name, E-Mail oder Benutzername..."
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
          <TabsTrigger value="active">Aktiv</TabsTrigger>
          <TabsTrigger value="inactive">Inaktiv</TabsTrigger>
          <TabsTrigger value="admin">Administratoren</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
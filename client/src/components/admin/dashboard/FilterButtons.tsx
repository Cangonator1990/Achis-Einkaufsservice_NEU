import { Button } from '@/components/ui/button';

/**
 * Eigenschaften für FilterButtons-Komponente
 */
interface FilterButtonsProps {
  /** Aktuell gewählter Zeitraum */
  selected: 'day' | 'week' | 'month';
  /** Callback bei Änderung des ausgewählten Zeitraums */
  onChange: (period: 'day' | 'week' | 'month') => void;
}

/**
 * Filter-Buttons für die Zeitauswahl im Dashboard
 * Ermöglicht die Auswahl zwischen Tag, Woche und Monat
 */
export function FilterButtons({ selected, onChange }: FilterButtonsProps) {
  return (
    <div className="flex space-x-2">
      <Button 
        variant={selected === 'day' ? 'default' : 'outline'} 
        size="sm"
        onClick={() => onChange('day')}
      >
        Tag
      </Button>
      <Button 
        variant={selected === 'week' ? 'default' : 'outline'} 
        size="sm"
        onClick={() => onChange('week')}
      >
        Woche
      </Button>
      <Button 
        variant={selected === 'month' ? 'default' : 'outline'} 
        size="sm"
        onClick={() => onChange('month')}
      >
        Monat
      </Button>
    </div>
  );
}
// Deklarationen für Module ohne eigene Typdefinitionen

// date-fns locale Module
declare module 'date-fns/locale' {
  const de: any;
  export { de };
}

// lucide-react
declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  
  type Icon = FC<IconProps>;
  
  export const Trash2: Icon;
  export const Calendar: Icon;
  export const CalendarIcon: Icon; 
  export const CalendarClock: Icon;
  export const CheckCircle: Icon;
  export const CheckCircle2: Icon;
  export const Clock: Icon;
  export const Edit: Icon;
  export const Eye: Icon;
  export const Loader2: Icon;
  export const Lock: Icon;
  export const Unlock: Icon;
  export const Menu: Icon;
  export const PenLine: Icon;
  export const Plus: Icon;
  export const ShoppingBag: Icon;
  export const ShoppingCart: Icon;
  export const User: Icon;
  export const AlertCircle: Icon;
  export const Bell: Icon;
  export const ChevronDown: Icon;
  export const ChevronRight: Icon;
  export const Home: Icon;
  export const ClipboardList: Icon;
  // Weitere Icons bei Bedarf hinzufügen
}
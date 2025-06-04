import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * ScrollToTop-Komponente
 * 
 * Scrollt automatisch nach oben, wenn sich die Route ändert.
 * Wird in App.tsx eingebunden, um globales Auto-Scrolling zu ermöglichen.
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Sofort nach oben scrollen
    window.scrollTo({
      top: 0,
      behavior: 'auto' // Instant statt smooth für bessere Benutzererfahrung
    });
  }, [location]); // Nur ausführen, wenn sich der Standort ändert

  return null;
}
/**
 * Hilfsfunktionen
 * 
 * Sammlung von nützlichen Hilfsfunktionen für die gesamte Anwendung.
 */

/**
 * Generiert eine zufällige Bestellnummer
 * Format: AE-JJJJMMTT-XXXXX (z.B. AE-20240315-78934)
 * 
 * @returns Zufällige Bestellnummer
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(10000 + Math.random() * 90000); // 5-stellige Zufallszahl
  
  return `AE-${year}${month}${day}-${random}`;
}

/**
 * Formatiert einen Geldbetrag als Euro-Betrag (z.B. "15,99 €")
 * 
 * @param amount - Der zu formatierende Betrag
 * @returns Formatierter Betrag als String
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

/**
 * Formatiert ein Datum im deutschen Format (z.B. "15.03.2024")
 * 
 * @param date - Das zu formatierende Datum
 * @returns Formatiertes Datum als String
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Formatiert ein Datum mit Uhrzeit im deutschen Format (z.B. "15.03.2024, 14:30 Uhr")
 * 
 * @param date - Das zu formatierende Datum
 * @returns Formatiertes Datum mit Uhrzeit als String
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date) + ' Uhr';
}

/**
 * Parst einen String zu einem Float-Wert, unter Berücksichtigung des deutschen Formats
 * 
 * @param value - Der zu parsende String (z.B. "15,99")
 * @returns Der geparste Float-Wert oder null bei ungültigem Format
 */
export function parseFloat(value: string): number | null {
  // Komma durch Punkt ersetzen, um das deutsche Format zu unterstützen
  const normalized = value.replace(',', '.');
  const result = Number.parseFloat(normalized);
  
  return isNaN(result) ? null : result;
}

/**
 * Kürzt einen Text auf eine bestimmte Länge und fügt "..." am Ende hinzu
 * 
 * @param text - Der zu kürzende Text
 * @param maxLength - Die maximale Länge
 * @returns Der gekürzte Text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substr(0, maxLength - 3) + '...';
}

/**
 * Entfernt HTML-Tags aus einem String
 * 
 * @param html - Der String mit HTML-Tags
 * @returns String ohne HTML-Tags
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Entfernt Sonderzeichen aus einem String
 * 
 * @param text - Der zu bereinigende String
 * @returns Bereinigter String
 */
export function sanitizeString(text: string): string {
  return text.replace(/[^\w\sÄäÖöÜüß.,\-]/g, '');
}

/**
 * Validiert eine E-Mail-Adresse
 * 
 * @param email - Die zu validierende E-Mail-Adresse
 * @returns true wenn die E-Mail-Adresse gültig ist, sonst false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validiert eine Telefonnummer
 * 
 * @param phoneNumber - Die zu validierende Telefonnummer
 * @returns true wenn die Telefonnummer gültig ist, sonst false
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Einfache Validierung: Mindestens 6 Ziffern, erlaubt Leerzeichen, - und ()
  const phoneRegex = /^[\d\s\-\(\)]{6,}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Validiert eine Postleitzahl (deutsches Format)
 * 
 * @param zipCode - Die zu validierende Postleitzahl
 * @returns true wenn die Postleitzahl gültig ist, sonst false
 */
export function isValidZipCode(zipCode: string): boolean {
  const zipRegex = /^\d{5}$/;
  return zipRegex.test(zipCode);
}
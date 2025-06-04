import { ShoppingBasket, Facebook, Twitter, Instagram, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <ShoppingBasket className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">Achis Einkaufservice</span>
            </div>
            <p className="text-gray-400 mb-4">Ihr persönlicher Einkaufsservice - schnell, zuverlässig und bequem.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Schnelllinks</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  Startseite
                </Link>
              </li>
              <li>
                <Link href="/order" className="text-gray-400 hover:text-white transition-colors">
                  Bestellen
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-gray-400 hover:text-white transition-colors">
                  Meine Bestellungen
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-gray-400 hover:text-white transition-colors">
                  Profil
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Hilfe & Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">FAQ</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Kontakt</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Datenschutz</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Impressum</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Kontakt</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>Musterstraße 123, 10115 Berlin</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                <span>+49 (0) 123 456789</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                <span>info@achis-einkaufservice.de</span>
              </li>
              <li className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Mo-Fr: 8:00 - 18:00 Uhr</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Achis Einkaufservice. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  );
}

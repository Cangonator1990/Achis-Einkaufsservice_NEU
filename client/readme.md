# Frontend-Architektur für Achis Einkaufsservice

## Überblick
Dieses Dokument beschreibt die Architektur und Struktur des Frontends für Achis Einkaufsservice. Das Frontend ist in TypeScript mit React geschrieben und verwendet Vite als Build-Tool. Die UI-Komponenten basieren auf einem Tailwind-CSS-basierten Design-System.

## Ordnerstruktur

```
client/
├── public/            # Statische Assets
├── src/
│   ├── assets/        # Bilder, Schriftarten und andere Assets
│   ├── components/    # Wiederverwendbare Komponenten
│   │   ├── common/    # Allgemeine UI-Komponenten
│   │   │   ├── buttons/        # Button-Komponenten
│   │   │   ├── forms/          # Formular-Komponenten
│   │   │   ├── layout/         # Layout-Komponenten
│   │   │   └── feedback/       # Feedback-Komponenten (Toasts, Alerts)
│   │   ├── features/  # Feature-spezifische Komponenten
│   │   │   ├── auth/           # Authentifizierungsbezogene Komponenten
│   │   │   ├── user/           # Benutzerbezogene Komponenten
│   │   │   ├── order/          # Bestellungsbezogene Komponenten
│   │   │   ├── cart/           # Warenkorbsbezogene Komponenten
│   │   │   ├── product/        # Produktbezogene Komponenten
│   │   │   └── notification/   # Benachrichtigungsbezogene Komponenten
│   │   ├── admin/     # Admin-Bereichskomponenten
│   │   │   ├── common/         # Admin-Bereich gemeinsame Komponenten
│   │   │   ├── dashboard/      # Dashboard-Komponenten
│   │   │   ├── users/          # Benutzerverwaltungskomponenten
│   │   │   ├── orders/         # Bestellungsverwaltungskomponenten
│   │   │   ├── products/       # Produktverwaltungskomponenten
│   │   │   └── settings/       # Einstellungskomponenten
│   │   └── ui/        # Basis-UI-Komponenten (shadcn)
│   ├── hooks/         # Benutzerdefinierte React-Hooks
│   │   ├── api/       # API-bezogene Hooks
│   │   ├── auth/      # Authentifizierungsbezogene Hooks
│   │   ├── form/      # Formularbezogene Hooks
│   │   └── ui/        # UI-bezogene Hooks
│   ├── layouts/       # Hauptlayouts der Anwendung
│   │   ├── MainLayout.tsx      # Hauptlayout
│   │   ├── AdminLayout.tsx     # Admin-Bereich-Layout
│   │   └── AuthLayout.tsx      # Authentifizierungsseiten-Layout
│   ├── lib/           # Bibliotheks- und Hilfsfunktionen
│   │   ├── api.ts               # API-Hilfsfunktionen
│   │   ├── auth.ts              # Authentifizierungsfunktionen
│   │   ├── storage.ts           # Lokaler Speicher (LocalStorage)
│   │   ├── validation.ts        # Validierungsfunktionen
│   │   └── utils.ts             # Allgemeine Hilfsfunktionen
│   ├── pages/         # Seitenkomponenten
│   │   ├── public/    # Öffentliche Seiten
│   │   │   ├── HomePage.tsx
│   │   │   └── AboutPage.tsx
│   │   ├── auth/      # Authentifizierungsseiten
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── user/      # Benutzerseiten
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   └── AddressesPage.tsx
│   │   ├── order/     # Bestellungsseiten
│   │   │   ├── OrderPage.tsx
│   │   │   └── CheckoutPage.tsx
│   │   ├── admin/     # Admin-Bereichsseiten
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   └── error/     # Fehlerseiten
│   │       ├── NotFoundPage.tsx
│   │       └── ErrorPage.tsx
│   ├── context/       # React-Kontexte
│   │   ├── AuthContext.tsx
│   │   ├── CartContext.tsx
│   │   ├── NotificationContext.tsx
│   │   └── ThemeContext.tsx
│   ├── services/      # API-Dienstleistungen
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── order.service.ts
│   │   ├── cart.service.ts
│   │   ├── product.service.ts
│   │   └── notification.service.ts
│   ├── types/         # TypeScript-Typdefinitionen
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   ├── user.types.ts
│   │   ├── order.types.ts
│   │   ├── cart.types.ts
│   │   ├── product.types.ts
│   │   └── notification.types.ts
│   ├── utils/         # Hilfsfunktionen
│   │   ├── date.ts
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── helpers.ts
│   ├── constants/     # Konstanten
│   │   ├── api.constants.ts
│   │   ├── routes.constants.ts
│   │   └── ui.constants.ts
│   ├── config/        # Konfigurationsdateien
│   │   ├── api.config.ts
│   │   └── app.config.ts
│   ├── App.tsx        # Hauptkomponente der Anwendung
│   ├── main.tsx       # Einstiegspunkt der Anwendung
│   ├── index.css      # Globale CSS-Stile
│   └── routes.tsx     # Anwendungsrouten
├── index.html         # HTML-Einstiegspunkt
└── vite.config.ts     # Vite-Konfigurationsdatei
```

## Architekturprinzipien

### 1. Komponentenbasierte Architektur
Das Frontend folgt einer komponentenbasierten Architektur:
- **Atomare Komponenten**: Kleine, wiederverwendbare UI-Komponenten (Buttons, Inputs)
- **Zusammengesetzte Komponenten**: Aus atomaren Komponenten zusammengesetzte Komponenten (Cards, Forms)
- **Feature-Komponenten**: Komponenten, die eine bestimmte Funktion implementieren
- **Seitenkomponenten**: Komponenten, die eine vollständige Seite darstellen

### 2. Trennung der Anliegen (Separation of Concerns)
Jede Komponente hat eine spezifische, klar definierte Aufgabe:
- **Präsentationskomponenten**: Stellen Daten dar, ohne Geschäftslogik zu enthalten
- **Container-Komponenten**: Verwalten Zustand und Geschäftslogik
- **Hooks**: Kapseln wiederverwendbare Logik
- **Kontexte**: Stellen globalen Zustand bereit

### 3. Stil- und Designrichtlinien
- **Tailwind CSS**: Für schnelles und konsistentes Styling
- **Shadcn UI**: Basis-UI-Komponenten
- **Theming**: Anpassbare Designvariablen für konsistentes Erscheinungsbild

## Zustandsverwaltung
- **React Query**: Für serverseitigen Zustand und API-Anfragen
- **React Context**: Für globalen Anwendungszustand
- **Local State**: Für komponentenspezifischen Zustand

## Routing
- **Wouter**: Für clientseitiges Routing
- **Protected Routes**: Für geschützte Routen, die Authentifizierung erfordern

## Formularverwaltung
- **React Hook Form**: Für Formularvalidierung und -verwaltung
- **Zod**: Für Schema-Validierung

## API-Kommunikation
- **Fetch API**: Für HTTP-Anfragen
- **React Query**: Für Abfrage-Cache und Anfragenverwaltung

## Authentifizierung
- **Token-basierte Authentifizierung**: JWT-Tokens für Benutzerauthentifizierung
- **AuthContext**: Für globalen Authentifizierungszustand

## Fehlerbehandlung
- **ErrorBoundary**: Für komponentenbasierte Fehlerbehandlung
- **Toast-Benachrichtigungen**: Für Benutzerrückmeldungen

## Responsive Design
- **Mobile-First-Ansatz**: Für optimale Benutzererfahrung auf allen Geräten
- **Responsive Komponenten**: Anpassbar an verschiedene Bildschirmgrößen

## Barrierefreiheit
- **ARIA-Attribute**: Für verbesserte Zugänglichkeit
- **Semantisches HTML**: Für bessere Screenreader-Unterstützung

## Performance-Optimierung
- **Code-Splitting**: Für reduzierte Bundle-Größe
- **Lazy Loading**: Für verzögertes Laden von Komponenten
- **Memoization**: Für reduzierte Neuberechnungen
# Backend-Architektur für Achis Einkaufsservice

## Überblick
Dieses Dokument beschreibt die Architektur und Struktur des Backends für Achis Einkaufsservice. Das Backend ist in TypeScript geschrieben und verwendet Express.js als Web-Framework zusammen mit einer PostgreSQL-Datenbank.

## Ordnerstruktur

```
server/
├── controllers/       # Enthält die Geschäftslogik für Anfragen
│   ├── user/          # Benutzerbezogene Controller
│   ├── order/         # Bestellungsbezogene Controller
│   ├── cart/          # Warenkorbsbezogene Controller
│   ├── notification/  # Benachrichtigungsbezogene Controller
│   ├── admin/         # Admin-Funktionsbezogene Controller
│   └── auth/          # Authentifizierungsbezogene Controller
├── middleware/        # Enthält Express-Middleware
│   ├── auth/          # Authentifizierungsmiddleware
│   ├── validation/    # Anfragendatenvalidierung
│   └── error/         # Fehlerbehandlung
├── models/            # Datenbankmodelle (falls erforderlich)
├── routes/            # API-Routen
│   ├── user.routes.ts
│   ├── order.routes.ts
│   ├── cart.routes.ts
│   ├── notification.routes.ts
│   ├── admin.routes.ts
│   └── auth.routes.ts
├── services/          # Geschäftslogik und Datendienstleistungen
│   ├── user.service.ts
│   ├── order.service.ts
│   ├── cart.service.ts
│   ├── notification.service.ts
│   ├── image.service.ts
│   └── admin.service.ts
├── utils/             # Hilfsfunktionen und -dienstprogramme
│   ├── errors.ts      # Fehlerdefinitionen
│   ├── logger.ts      # Logging-Dienstprogramm
│   └── helpers.ts     # Allgemeine Hilfsfunktionen
├── config/            # Konfigurationsdateien
│   ├── db.config.ts   # Datenbankeinstellungen
│   └── app.config.ts  # Anwendungseinstellungen
├── types/             # TypeScript-Typdefinitionen
│   └── index.ts       # Gemeinsame Typen
├── db.ts              # Datenbankverbindungsinstanz
├── auth.ts            # Authentifizierungslogik
└── index.ts           # Einstiegspunkt des Servers
```

## Architekturprinzipien

### 1. Schichtenarchitektur
Das Backend folgt einer Schichtenarchitektur:
- **Routen**: Definieren Endpunkte und validieren Anfragen
- **Controller**: Behandeln Anfragen und rufen Services auf
- **Services**: Enthalten Geschäftslogik und kommunizieren mit der Datenbank
- **Datenbank**: Persistenzschicht

### 2. Trennung der Anliegen (Separation of Concerns)
Jede Komponente hat eine spezifische, klar definierte Aufgabe:
- **Routes**: Definieren API-Endpunkte und leiten Anfragen an Controller weiter
- **Controllers**: Verarbeiten Anfragen, rufen Services auf und formatieren Antworten
- **Services**: Implementieren Geschäftslogik und interagieren mit der Datenbank
- **Middleware**: Verarbeitet Anfragen vor oder nach dem Haupthandler

### 3. RESTful API-Design
Die API folgt RESTful-Prinzipien mit standardisierten Operationen:
- GET: Abrufen von Ressourcen
- POST: Erstellen neuer Ressourcen
- PUT/PATCH: Aktualisieren vorhandener Ressourcen
- DELETE: Löschen von Ressourcen

## Datenfluss
1. Eine eingehende HTTP-Anfrage wird an eine Route weitergeleitet
2. Middleware überprüft Authentifizierung und validiert Anfragedaten
3. Der Controller verarbeitet die Anfrage und ruft Services auf
4. Services führen Geschäftslogik aus und interagieren mit der Datenbank
5. Die Antwort wird zur Verarbeitung an den Controller zurückgegeben
6. Der Controller formatiert die Antwort und sendet sie an den Client zurück

## Fehlerbehandlung
- Zentralisierte Fehlerbehandlung durch spezielle Middleware
- Standardisierte Fehlerantworten mit HTTP-Statuscodes
- Eigene Fehlerklassen für verschiedene Fehlertypen

## Authentifizierung und Autorisierung
- JWT-basierte Authentifizierung
- Rollenbasierte Zugriffskontrolle für verschiedene Benutzertypen
- Middleware zur Überprüfung von Authentifizierung und Autorisierung

## Datenvalidierung
- Zod-Schema-Validierung für eingehende Anfragen
- Validierungsmiddleware zur Überprüfung von Anfragedaten

## Logging
- Strukturiertes Logging für Entwicklung und Produktion
- Fehlerprotokollierung für Fehlerbehebung und Überwachung

## Umgebungskonfiguration
- Umgebungsvariablen für umgebungsspezifische Konfigurationen
- Separierte Konfigurationsdateien für verschiedene Aspekte der Anwendung
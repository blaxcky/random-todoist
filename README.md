# Random Todoist Task PWA

Eine Progressive Web App, die eine zufällige fällige Aufgabe aus deiner Todoist-Liste anzeigt.

## Features

- 🎯 Zeigt eine zufällige fällige Aufgabe an
- ✅ Aufgaben als erledigt markieren
- ⏰ Aufgaben auf morgen verschieben
- 🔑 API-Key wird sicher im LocalStorage gespeichert
- 📱 PWA - installierbar auf Mobile und Desktop
- 🎨 Responsive Design

## Setup

1. Erstelle einen Todoist API-Key:
   - Gehe zu https://todoist.com/prefs/integrations
   - Scrolle zu "API token" 
   - Kopiere deinen Token

2. Öffne die App und gib deinen API-Key ein

3. Optional: Icons hinzufügen
   - Erstelle `icon-192.png` (192x192px)
   - Erstelle `icon-512.png` (512x512px)

## Verwendung

- Die App lädt automatisch alle fälligen Aufgaben
- Klicke auf "Erledigt" um eine Aufgabe abzuschließen
- Klicke auf "Verschieben" um die Aufgabe auf morgen zu verschieben
- Klicke auf "Nächste Aufgabe" für eine neue zufällige Aufgabe

## Installation als PWA

1. Öffne die App in einem modernen Browser
2. Suche nach dem "Zur Startseite hinzufügen" Button
3. Die App verhält sich dann wie eine native App

## Technische Details

- Vanilla JavaScript (keine Frameworks)
- Todoist REST API v2
- Service Worker für Offline-Funktionalität
- LocalStorage für API-Key Speicherung
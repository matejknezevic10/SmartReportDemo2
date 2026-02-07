# SmartReport Business Edition v1.1.0

Eine KI-gestützte Berichterstellungs-App für Außendienstmitarbeiter im Schadenservice.

## 🆕 Änderungen in v1.1.0

### 🔒 Sicherheitsverbesserungen

1. **Passwort-Hashing**
   - Passwörter werden nicht mehr im Klartext gespeichert
   - Verwendung einer Hash-Funktion in `utils/security.ts`
   - Passwörter sind im Dashboard nicht mehr sichtbar

2. **Session-Management**
   - Nur noch User-ID wird in localStorage gespeichert (nicht mehr das gesamte User-Objekt)
   - Reduziert Angriffsfläche bei XSS

3. **Login-Schutz**
   - Maximale Fehlversuche (5) mit temporärer Sperre
   - Passwort-Stärke-Anzeige bei User-Erstellung

### 🐛 Bugfixes

1. **Memory Leak behoben**
   - Speech Recognition Event-Listener werden bei Component-Unmount korrekt entfernt

2. **Gemini API Model korrigiert**
   - Von `gemini-3-pro-preview` (existiert nicht) zu `gemini-1.5-pro`

3. **Templates werden jetzt persistiert**
   - Templates werden in localStorage gespeichert und überleben einen Reload

4. **Ungenutzte Imports entfernt**
   - Reduziert Bundle-Größe

### ⚠️ Bekannte Einschränkungen

- **API-Key im Frontend**: Der Gemini API-Key ist im Browser-Bundle sichtbar. Für Produktion sollte ein Backend-Proxy verwendet werden.
- **E-Mail-Versand simuliert**: Der "Versenden"-Button ist nur ein Mockup. Für echten Versand: Integration mit SendGrid, Resend, o.ä.
- **Lokale Datenhaltung**: Alle Daten sind in localStorage. Für Multi-User: Backend mit Datenbank nötig.

## 🚀 Installation

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Produktions-Build
npm run build
```

## 🔑 API-Key einrichten

1. Hole dir einen API-Key von [Google AI Studio](https://aistudio.google.com/apikey)
2. Erstelle/bearbeite `.env.local`:
   ```
   VITE_GEMINI_API_KEY=dein_api_key_hier
   ```
3. Starte den Dev-Server neu

## 📁 Projektstruktur

```
smartreport/
├── App.tsx                 # Haupt-App-Komponente
├── types.ts                # TypeScript Interfaces
├── components/
│   ├── Login.tsx           # Login-Screen mit Brute-Force-Schutz
│   ├── BusinessDashboard.tsx # Manager-Dashboard (ohne Passwort-Anzeige)
│   ├── ReportEditor.tsx    # Bericht-Editor mit Export
│   ├── ReportCard.tsx      # Bericht-Karte in der Liste
│   ├── TemplateManager.tsx # Vorlagen-Verwaltung
│   └── ImageEditor.tsx     # Bild-Bearbeitung
├── services/
│   └── geminiService.ts    # Gemini API Integration
├── utils/
│   └── security.ts         # Passwort-Hashing & Validierung
└── .env.local              # API-Keys (nicht committen!)
```

## 👥 Demo-Zugänge

| Rolle | Name | PIN |
|-------|------|-----|
| Manager | Zentrale Leitung | 1234 |
| Techniker | Max Mustermann | 0000 |

## 🛡️ Sicherheitshinweise für Produktion

1. **API-Keys**: Niemals im Frontend! Verwende einen Backend-Proxy.
2. **Passwörter**: Nutze bcrypt/argon2 auf dem Server statt Client-seitigem Hashing.
3. **Session**: Verwende HTTP-only Cookies statt localStorage.
4. **HTTPS**: Immer HTTPS in Produktion verwenden.

## 📝 Lizenz

Proprietär - Saneo Schadenservice GmbH

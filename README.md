# Nikos Messenger - Gruppenanrufe

Gruppenvideo-Chat-Messenger mit WebRTC-Unterstützung für bis zu 32 gleichzeitige Teilnehmer.

## Features

- **Multi-Peer WebRTC**: Mesh-Topologie für Gruppenvideoanrufe
- **Bis zu 32 Teilnehmer**: Unterstützt große Gruppenanrufe
- **Dynamisches Grid-Layout**: Responsive Video-Layouts (2x2, 3x3, 4x4, 4x8)
- **Socket.IO Signaling**: Echtzeit-Kommunikation für Peer-Verbindungen
- **Datenbank-Tracking**: Speichert Call-Sessions und Teilnehmerlisten
- **Call Controls**: Mikrofon/Kamera an/aus, Anruf beenden

## Installation

```bash
npm install
```

## Server starten

```bash
npm start
```

Für Entwicklung mit Auto-Reload:
```bash
npm run dev
```

Der Server läuft standardmäßig auf Port 3000: http://localhost:3000

## Verwendung

1. Öffnen Sie http://localhost:3000 im Browser
2. Klicken Sie auf das Einstellungs-Symbol (⚙️) oben rechts
3. Wählen Sie "Videoanruf starten"
4. Erlauben Sie den Zugriff auf Kamera und Mikrofon
5. Um weitere Teilnehmer hinzuzufügen, öffnen Sie die gleiche URL in einem anderen Browser/Tab

## Architektur

### Backend (server.js)

- **Express**: Statischer Datei-Server
- **Socket.IO**: Signaling-Server für WebRTC
- **SQLite**: Datenbank für Call-Sessions und Teilnehmer

#### Socket.IO Events

- `start-group-call`: Startet einen neuen Gruppenanruf
- `join-group-call`: Tritt einem bestehenden Anruf bei
- `peer-offer`: Sendet WebRTC-Offer an einen Peer
- `peer-answer`: Sendet WebRTC-Answer an einen Peer
- `peer-candidate`: Sendet ICE-Kandidaten
- `leave-call`: Verlässt den Anruf
- `peer-joined`: Benachrichtigung über neuen Teilnehmer
- `peer-left`: Benachrichtigung über verlassenen Teilnehmer

### Frontend

#### webrtc-manager.js

Verwaltet WebRTC-Verbindungen:
- Map von RTCPeerConnection-Objekten (eine pro Remote-Peer)
- Automatische ICE-Kandidaten-Austausch
- Stream-Management für Audio/Video
- Peer-Addition/-Removal

#### call.html

Video-Call-Interface:
- Dynamisches Grid-Layout basierend auf Teilnehmeranzahl
- Video-Tiles für jeden Teilnehmer
- Call-Controls (Mute, Video Toggle, Leave)
- Responsive Design für mobile Geräte

## Datenbank-Schema

### group_call_sessions
- `id`: Eindeutige Session-ID
- `group_id`: Gruppen-Identifier
- `started_at`: Startzeit
- `ended_at`: Endzeit
- `status`: Call-Status (active/completed)

### call_participants
- `id`: Eindeutige Teilnehmer-ID
- `session_id`: Referenz zur Call-Session
- `user_id`: Benutzer-Identifier
- `socket_id`: Socket.IO Connection-ID
- `joined_at`: Beitrittszeit
- `left_at`: Austrittszeit

## Technische Details

### Mesh-Topologie

Das System verwendet eine Mesh-Topologie, bei der jeder Teilnehmer direkte Peer-to-Peer-Verbindungen zu allen anderen Teilnehmern aufbaut. Dies funktioniert gut für kleine bis mittlere Gruppen (bis ~6 Personen optimal, bis 32 Personen unterstützt).

**Vorteile:**
- Niedrige Latenz (direkte P2P-Verbindungen)
- Keine zentrale Medien-Server-Infrastruktur nötig
- Einfache Implementierung

**Nachteile:**
- Bandbreiten-Anforderungen steigen mit der Anzahl der Teilnehmer
- Bei >6 Teilnehmern kann die Performance leiden

### Grid-Layouts

Das System passt das Video-Grid automatisch an:
- 1 Teilnehmer: 1x1
- 2 Teilnehmer: 2x1
- 3-4 Teilnehmer: 2x2
- 5-6 Teilnehmer: 3x2
- 7-9 Teilnehmer: 3x3
- 10-16 Teilnehmer: 4x4
- 17-32 Teilnehmer: 4x8

## Browser-Kompatibilität

- Chrome/Chromium (empfohlen)
- Firefox
- Safari
- Edge

WebRTC und getUserMedia werden benötigt.

## Lizenz

ISC

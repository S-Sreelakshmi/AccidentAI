# 🚨 AccidentAI : Intelligent Emergency Response Application

> A mobile-first Progressive Web App that detects vehicle crashes, dispatches SOS alerts, and guides users to the nearest emergency services — all in seconds.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [File Structure](#file-structure)
- [How to Run](#how-to-run)
- [Screens & Modules](#screens--modules)
- [API Integrations](#api-integrations)
- [Offline Support](#offline-support)
- [Demo Data](#demo-data)
- [Known Limitations](#known-limitations)
- [Author](#author)

---

## Overview

**AccidentAI** is a browser-based emergency response application designed for road accident scenarios in India. It operates as a "smoke detector for crashes" — running silently in the background and automatically triggering an SOS sequence when a sudden impact is detected via the device's accelerometer.

The app requires **no installation**, works on any modern smartphone browser, and is designed to function even in **low/no connectivity** situations using SMS fallback.

---

## Features

| Feature | Description |
|---|---|
| 🛡️ **Crash Detection** | Hardware accelerometer monitors for impacts exceeding 25 m/s² |
| ⏱️ **10-Second SOS Countdown** | Grace period to cancel false positives before auto-dispatch |
| 📍 **Live GPS Location** | Real-time coordinates injected into every alert |
| 📲 **Auto SMS Dispatch** | Sends emergency SMS to saved contact or 112 with location + timestamp |
| 🗺️ **Nearby Emergency Map** | Leaflet.js map with hospitals, police, fuel stations & towing services |
| 📷 **OCR Plate Scanner** | Tesseract.js reads vehicle registration plates via rear camera |
| 🪪 **Medical ID Profile** | Stores blood group, allergies, emergency contact — saved offline |
| 📱 **QR Code** | Generates scannable QR from Medical ID for first-responders |
| 📋 **Incident History** | Logs all SOS events with severity, location, and status |
| 📡 **Offline Mode** | Detects no connectivity and switches to SMS-only fallback |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Markup** | HTML5 (Semantic, Mobile-First) |
| **Styling** | Vanilla CSS3 (Dark Theme, CSS Variables, Animations) |
| **Logic** | Vanilla JavaScript ES2020 (No frameworks) |
| **Maps** | [Leaflet.js v1.9.4](https://leafletjs.com/) |
| **Map Tiles** | CartoDB Dark Matter (via CDN) |
| **POI Data** | [OpenStreetMap Overpass API](https://overpass-api.de/) |
| **OCR Engine** | [Tesseract.js v5](https://tesseract.projectnaptha.com/) |
| **QR Code** | [qrcodejs](https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/) |
| **Icons** | [Lucide Icons](https://lucide.dev/) |
| **Fonts** | [Google Fonts — Outfit](https://fonts.google.com/specimen/Outfit) |
| **Geocoding** | [Nominatim (OpenStreetMap)](https://nominatim.org/) |
| **IP Location** | [ipapi.co](https://ipapi.co/) |
| **Storage** | Browser `localStorage` (fully offline) |

---

## File Structure

```
ACCIDENTAI/
├── index.html        # Application shell — all 6 screens & navigation
├── styles.css        # Complete design system (1,795 lines)
├── main.js           # All application logic (1,550 lines)
├── test.py           # Python utility to test Overpass API connectivity
├── car_bg.png        # Background image asset
└── README.md         # This file
```

---

## How to Run

### Option 1 — Live Server (Recommended)
> Camera (OCR) and GPS features require an HTTP server. The `file://` protocol blocks these APIs.

1. Open the project folder in **VS Code**
2. Install the **Live Server** extension (by Ritwick Dey)
3. Right-click `index.html` → **"Open with Live Server"**
4. The app opens at `http://127.0.0.1:5500`

### Option 2 — Python HTTP Server
```bash
cd path/to/ACCIDENTAI
python -m http.server 5500
```
Then open `http://localhost:5500` in your browser.

### Option 3 — Direct File (Limited)
Simply double-click `index.html` to open it in your browser.  
> ⚠️ Camera and GPS will be blocked by browser security on `file://` protocol.

---

## Screens & Modules

### Screen 1 — Standby (Home)
- Displays **"Protection Active"** status pill with pulsing green dot
- Large **SOS button** — hold for 3 seconds to manually trigger emergency
- SVG progress ring fills as you hold
- Offline banner appears automatically when connectivity is lost
- Links to Nearby Map, Medical ID, and History via bottom navigation

### Screen 2 — Crash Detected / Countdown
- Activated by accelerometer threshold breach OR manual SOS hold
- **10-second countdown** with animated SVG ring
- Shows live GPS location, simulated impact G-force, and vehicle orientation
- **"I'm Safe — Cancel"** button aborts and logs a CANCELLED event
- **"Send Now"** immediately dispatches the SOS
- After countdown: SMS intent launched, confirmation banner shown

### Screen 3 — OCR Scene Scanner
- Accesses rear camera via `getUserMedia`
- Captures a frame, preprocesses it (grayscale, 2× scale, padding)
- Runs **Tesseract.js** OCR in sparse-text mode
- Formats extracted text into Indian plate format (e.g. `KL 11 AB 1234`)
- Draws a **bounding box** around detected text
- Simulates a **Vaahan vehicle registry lookup** with shimmer loading states

### Screen 4 — Nearby Emergency Map
- Leaflet.js map with **dark CartoDB tiles**
- Fetches from OpenStreetMap Overpass API within 7 km radius
- **Filter chips**: All · Government · Private · Trauma · Police · Fuel · Towing
- Tapping a pin opens a **bottom sheet** with name, distance, drive time, and action buttons
- Navigate → opens Google Maps directions
- Call → dials the emergency number

### Screen 5 — Medical ID Profile
- Input form: Name, Age, Blood Group, Allergies, Conditions, Emergency Contact
- Auto-saves to `localStorage` on every keystroke
- Generates a **QR code** encoding the medical summary
- QR is readable without unlocking the phone (for first-responders)

### Screen 6 — Incident History
- Lists all SOS events with date, location, status badge, and severity pill
- Status: `RESOLVED` · `CANCELLED` · `PENDING`
- Severity: `CRITICAL` · `MODERATE` · `MINOR`
- Pre-loaded with 7 hardcoded demo incidents (Kozhikode locations)

---

## API Integrations

| API | Purpose | Endpoint |
|---|---|---|
| **Overpass API** | Fetch hospitals, police, fuel, towing | `overpass-api.de/api/interpreter` |
| **Nominatim** | Reverse geocode GPS coordinates to address | `nominatim.openstreetmap.org/reverse` |
| **ipapi.co** | IP-based city/region detection as GPS fallback | `ipapi.co/json/` |

All APIs are **free and open** — no API keys required.

---

## Offline Support

AccidentAI is designed with offline-first principles:

- **GPS coordinates** are cached continuously via `watchPosition`
- **Addresses** are reverse-geocoded and cached every 30 seconds
- **Medical ID** stored in `localStorage` — no server needed
- **Offline banner** auto-shows when `navigator.onLine === false`
- **SMS fallback** uses native `sms:` URI scheme — works without internet
- A **"Toggle Offline Mode"** button on the home screen simulates offline for testing

---

## Demo Data

For demonstration purposes, the app includes:

- **7 hardcoded incident history entries** with real Kozhikode locations
- **Simulated Vaahan lookup** returning `Honda Activa 6G, 2022` for any scanned plate
- **AI triage simulation**: random G-force (20G–80G) and orientation on each crash trigger
- **Default fallback coordinates**: Delhi (28.6139, 77.2090) if GPS and IP both fail

---

## Known Limitations

- OCR accuracy depends on lighting and plate clarity; works best in good light
- Vaahan registry lookup is simulated — real integration requires a government API key
- SMS dispatch uses `sms:` URI which is blocked on desktop browsers (clipboard fallback used)
- Overpass API may be slow or rate-limited during peak usage

---

## Author

**AccidentAI** — Built as an emergency response prototype for road accident scenarios in India.

- Platform: Progressive Web App
- Target Device: Android / iOS smartphones
- Language Support: English
- Designed for: First-responders, accident victims, and bystanders

---

*"Every second counts. AccidentAI buys you those seconds."*

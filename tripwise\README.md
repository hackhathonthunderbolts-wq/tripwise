# TripWise

A travel planner built around the three questions a trip actually raises:

- **Explore** — *"What is near me?"* Search any place, discover real attractions nearby on a map, and see live weather.
- **Smart Time Planner** — *"I have just two hours."* Turn a time budget into a realistic, ordered itinerary using real travel times.
- **My Trip** — *"What have I missed?"* Track stops, estimates and progress across the whole trip.
- **Budget Tracker** — *"Where is the money going?"* Compare real spend against planned estimates without double-counting.
- **Memory Journal** — *"How do I remember this?"* Save photos and stories locally, pin them on a map, revisit them "On This Day", and print a recap.

Everything runs in the browser. There is no backend, no account and no API key to configure.

---

## Table of contents

- [Feature tour](#feature-tour)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Data sources and attribution](#data-sources-and-attribution)
- [How the pieces work](#how-the-pieces-work)
- [Privacy and storage](#privacy-and-storage)
- [Honesty about data](#honesty-about-data)
- [Known limitations](#known-limitations)
- [Tests](#tests)

---

## Feature tour

### Explore (`/`)
- Geocode search (Nominatim) with debounced suggestions, falling back to Wikipedia search when geocoding fails.
- Discover nearby real places from OpenStreetMap via the Overpass API, filtered by category (attractions, museums, parks, beaches, historical sites, viewpoints, food) and by a distance that scales with how much time you have.
- Sort by distance or name, paginate results, and open a rich detail page.
- Live weather for the searched area from Open-Meteo.
- Interactive Leaflet map with OpenStreetMap tiles; if tiles fail to load, a notice and an "open in OpenStreetMap" link appear instead.

### Destination detail (`/destination/:coords`)
- Wikipedia summary, coordinates, category and distance when available.
- Current weather plus a short forecast.
- Nearby places you can add straight to your trip.
- Memories already linked to that location.

### Smart Time Planner (`/planner`)
- Inputs: starting location (search, "use my location", or the default centre), available time (presets or custom minutes), interests, travel mode (walking/driving) and start time.
- Fetches candidate places near your start point, then builds travel times with **OSRM routing**.
- A **greedy, time-boxed algorithm** suggests an ordered itinerary that fits your budget; the nearest reachable stop is always preferred, and it stops as soon as nothing else fits.
- Shows estimated arrival clock times, per-stop visit duration and travel time, and which are routed vs approximated.
- Edit visit durations, tick/untick candidates, reorder, remove, or "re-suggest for my time".
- Warns clearly when a plan exceeds the available time.
- One click adds the whole plan to My Trip (duplicates are skipped).

### My Trip (`/trip`)
- Itinerary with per-stop status (planned / visited / skipped) and live progress.
- Inline editing of visit duration, cost estimate, planned day and notes.
- Reorder stops, remove stops, and open a stop's destination page.
- Attach a memory directly to a stop and see linked memories inline.
- Everything is persisted and restored in order after a refresh.

### Budget Tracker (`/budget`)
- Set a total budget and optional per-day cap.
- Log real expenses (amount, category, date, optional note, optional link to an itinerary stop).
- A clear summary: recorded spend, planned-but-unspent estimates, committed total, remaining balance and percentage used/committed, with a safe / tight / over status and plain-language advice.
- Estimates from stops that already have a linked expense are **excluded from planned cost**, so nothing is counted twice.
- A hand-rolled SVG donut for category breakdown and a daily bar chart that flags days over the daily cap (no chart library).

### Memory Journal (`/memories`)
- Gallery and timeline views, search, tag filters and a favourites-only filter.
- An "On This Day" section that resurfaces memories from past trips sharing today's date.
- Optional map of all pinned memories.
- Create/edit memories with up to 6 photos, caption, story, date, mood and tags.

### Memory detail (`/memories/:id`)
- Full-screen lightbox with keyboard navigation (arrows, Escape).
- Linked itinerary stop, mini map and an OpenStreetMap link.
- Edit and delete (with confirmation).

### Trip recap (`/memories/recap`)
- A print-optimised summary: trip dates, progress, the full route grouped by day, budget breakdown and top memories.
- Print / Save as PDF with a dedicated print stylesheet.

---

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19 + TypeScript (strict) |
| Build | Vite 8 (Rolldown) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` (design tokens defined in `src/index.css`) |
| Routing | React Router 7, with route-level code splitting |
| Maps | Leaflet 1.9 + OpenStreetMap tiles |
| Icons | lucide-react |
| Local photos | idb (IndexedDB wrapper) |
| Tests | Vitest |

No UI kit, no chart library, no form library and no state-management library — the shared UI components, charts, validation and stores are written by hand.

---

## Getting started

Requirements: Node.js 20+ (developed on Node 24) and npm.

```bash
npm install
npm run dev
```

Then open the printed local URL. The app works immediately — all external services are public and keyless.

Optional environment variables (copy `.env.example` to `.env`) let you point at different endpoints or add a contact email for Nominatim. They are **not** required.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc --noEmit`) then produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm test` | Run the Vitest unit tests |

---

## Deployment

The project is ready for a static host such as Vercel or Netlify.

- `vercel.json` contains a single-page-app rewrite so deep links (e.g. `/memories/recap`, `/destination/13.08,80.27`) resolve to `index.html`.
- Build command: `npm run build`. Output directory: `dist`.

---

## Project structure

```
src/
  components/
    budget/        # SVG donut + daily bar chart
    destinations/  # cards, search box, filters, weather widget, images
    itinerary/     # itinerary list with inline editing
    layout/        # app shell, header, footer, page container
    map/           # Leaflet wrapper with graceful tile failure
    memories/      # memory card + create/edit form modal
    ui/            # Button, Card, Badge, Field, Modal, States, ...
  hooks/           # usePhotoUrl, useDebouncedValue
  lib/             # categories, geo, format, validation, weather, utils
  pages/           # one component per route
  services/
    api/           # client, nominatim, overpass, wikipedia, openMeteo, osrm, discover
    budget/        # budget calculations
    itinerary/     # itinerary calculations
    planner/       # greedy time-boxed planner (pure, unit-tested)
    storage/       # localStorage, schemas, IndexedDB photo store
  store/           # TripStore, MemoriesStore, ToastStore (React context)
  types/           # shared domain models
```

Business logic lives in `src/services/*` as pure functions and is unit-tested; React components stay focused on presentation and wiring.

---

## Data sources and attribution

All services are public and keyless. Attribution is shown in the footer and next to the relevant data.

| Purpose | Service | Licence / notes |
| --- | --- | --- |
| Place search & geocoding | Nominatim (OpenStreetMap) | OSM ODbL; low-volume use |
| Nearby places (POIs) | Overpass API (OpenStreetMap) | OSM ODbL |
| Summaries & place search | Wikipedia / Wikimedia | CC BY-SA |
| Map tiles | OpenStreetMap | ODbL |
| Weather | Open-Meteo | CC BY 4.0 |
| Travel times | OSRM public demo server | car profile |

**Resilience and honesty:** every call has a timeout and a fallback. If Overpass is unavailable the app falls back to Wikipedia's geosearch and clearly marks the results as *degraded* with category filters unavailable. If OSRM routing is unavailable, travel times fall back to straight-line approximations that are explicitly labelled as estimates. Failures are surfaced with an explanation rather than hidden behind fake data.

---

## How the pieces work

- **Planner (`src/services/planner/planner.ts`)** — `buildPlan` runs a greedy, time-boxed selection: from the current point it repeatedly picks the reachable stop with the shortest travel time that still fits the remaining budget. `assemblePlan` then derives arrival/departure times for any explicit order, always using the supplied travel matrix. `approximateMatrix` provides a labelled straight-line fallback when routing is unavailable. These functions are pure and covered by tests.
- **Budget (`src/services/budget/calculations.ts`)** — `calculateBudget` separates recorded spend from planned estimates and excludes any stop whose cost has already been recorded as a linked expense, so estimates are never double-counted. It also derives category shares, daily totals and a safe/warning/over status.
- **Stores** — `TripStore` and `MemoriesStore` are React context providers that own localStorage-backed state (with defensive `sanitize*` parsers on read), while the photo store persists image blobs in IndexedDB. No cross-device sync is implied or attempted.

---

## Privacy and storage

- There are no accounts and no server. Text data (itinerary, expenses, budget, memories) is stored in this browser's **localStorage**; photos are stored as blobs in **IndexedDB**.
- If IndexedDB is blocked, the app still saves text and tells you photos cannot be stored.
- Memory photos never leave the device.

---

## Honesty about data

- Visit durations and costs are **user-editable estimates**, never official prices or opening hours, and are labelled as such throughout.
- Travel times are either real OSRM routing or clearly-labelled straight-line approximations.
- When a data source fails, the UI says so and degrades gracefully instead of inventing data.

---

## Known limitations

- Place coverage and naming depend on OpenStreetMap/Wikipedia data quality.
- The OSRM public demo server provides driving routes; walking times are derived from routed distance at a nominal pace and labelled as estimates.
- The Overpass public servers can be slow or rate-limited; the multi-mirror fallback helps but is not guaranteed.
- Data is local to one browser profile — clearing site data removes it.

---

## Tests

```bash
npm test
```

Vitest covers the planner (fit/no-fit, ordering, overflow, approximation), the budget calculations (remaining balance, no double counting, category and daily breakdowns, over-budget status) and the validation helpers (memory input, tag parsing, photo file rules).

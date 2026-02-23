# Travel App — אפליקציית תכנון טיולים

A full-stack Hebrew (RTL) travel planning app. Plan trips day-by-day, manage accommodations, attractions, flights, expenses, shopping lists, documents, and more — all from your browser or phone.

**Stack:** React + TypeScript + Vite (frontend) | Express + SQLite (backend) | PWA with offline support

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**

### 1. Clone and install

```bash
git clone https://github.com/ranavaon/travel-app-plan.git
cd travel-app-plan
```

```bash
# Install both frontend and backend
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Start the backend

```bash
cd backend
npm run build
npm start
```

The API server runs on **http://localhost:3001**. A SQLite database (`data.sqlite`) is created automatically.

### 3. Start the frontend

Open a new terminal:

```bash
cd frontend
echo "VITE_API_URL=http://localhost:3001" > .env
npm run dev
```

Open **http://localhost:5173** in your browser.

### 4. Create an account

Go to `/register` to create an account, then log in at `/login`. You're ready to plan your first trip.

---

## Offline Mode (no backend)

The app also works **without a backend**. If `VITE_API_URL` is not set, data is stored locally in the browser (localStorage). This is useful for quick demos or offline use.

```bash
cd frontend
npm run dev   # no .env file needed
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Trips** | Create, edit, delete trips with dates, destination, tags, and budget |
| **Day-by-day view** | Each trip auto-generates days; drag-and-drop to reorder activities |
| **Accommodations** | Track lodging with dates, address, and map location |
| **Attractions** | Save attractions linked to specific days |
| **Flights** | Store flight details (airline, times, gate, seat, ticket link) |
| **Shopping lists** | Checklist items with done/undone toggle |
| **Budget tracking** | Set a planned budget, log expenses, see remaining/overspent |
| **Documents** | Upload and view travel documents (passport, visa, insurance, etc.) |
| **Pinned places** | Save locations you discover while traveling, assign them later |
| **Maps** | Interactive Leaflet map showing all trip locations; navigation links |
| **Navigation links** | One-tap Google Maps navigation, public transit, and search |
| **Happy Cow** | Quick link to find vegan/kosher restaurants near any location |
| **Smart suggestions** | Auto-suggested attractions from OpenTripMap based on trip destination |
| **Reminders** | Set date/time reminders with browser notifications |
| **Sharing** | Read-only share links; invite members with roles (participant/viewer) |
| **Export** | Export trip as TXT or PDF |
| **PWA & Offline** | Install to home screen; view and edit trips offline with sync queue |
| **Auth** | Email/password, Google Sign-In, Apple Sign-In |
| **Filters** | Filter trips by future/past and by tags |

---

## Project Structure

```
travel-app-plan/
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/          # Home, Trip, DayView, NewTrip, EditTrip, Login, Register, ...
│   │   ├── components/     # Reusable: DayMap, LocationPickerMap, TripDocuments, TripReminders, ...
│   │   ├── context/        # TripContext (state), AuthContext (auth)
│   │   ├── api/            # API client (fetch wrapper)
│   │   ├── types/          # TypeScript interfaces
│   │   ├── utils/          # Map URLs, geocoding helpers
│   │   └── schemas/        # Zod validation schemas
│   └── public/             # PWA manifest, icons
│
├── backend/                # Express + SQLite + TypeScript
│   ├── src/
│   │   ├── index.ts        # Route definitions (auth, trips, activities, etc.)
│   │   ├── db.ts           # Database schema and migrations
│   │   ├── auth.ts         # JWT, user lookup helpers
│   │   ├── models.ts       # Row types and DB-to-API converters
│   │   └── helpers.ts      # Shared utilities (genId, role checks, etc.)
│   └── test/               # Vitest API tests
│
├── docs/                   # Deployment, workflow, and network docs
└── PLANNING.md             # Full feature spec and implementation status
```

---

## Routes (Pages)

| Path | Page |
|------|------|
| `/` | Home — list of all trips, filters |
| `/trip/new` | Create a new trip |
| `/trip/:id` | Trip detail — days, map, flights, accommodations, attractions, lists, expenses, documents |
| `/trip/:id/edit` | Edit trip details |
| `/trip/:id/day/:dayIndex` | Day view — activities, drag-and-drop, map |
| `/login` | Login |
| `/register` | Register |
| `/profile` | User profile |
| `/share/:token` | Read-only shared trip view |
| `/invite/:token` | Accept trip invitation |

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend URL (e.g. `http://localhost:3001`). If omitted, app uses localStorage. |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth client ID for Sign-In button |
| `VITE_APPLE_CLIENT_ID` | No | Apple Sign-In service ID |

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `SQLITE_PATH` | No | `./data.sqlite` | Path to SQLite database file |
| `JWT_SECRET` | **Yes (prod)** | `dev-secret-...` | Secret for signing JWT tokens |
| `GOOGLE_CLIENT_ID` | No | — | Enable Google Sign-In |
| `APPLE_CLIENT_ID` | No | — | Enable Apple Sign-In |

Copy `backend/.env.example` to `backend/.env` and fill in values for production.

---

## Running Tests

```bash
# Backend tests (Vitest + Supertest)
cd backend && npm test

# Frontend tests (Vitest + React Testing Library)
cd frontend && npm test

# End-to-end tests (Playwright)
cd frontend && npx playwright install && npm run e2e
```

---

## Deployment

### Option 1: Render.com (recommended)

A `render.yaml` blueprint is included. It builds both frontend and backend as a single service.

1. Connect the repo to [Render](https://render.com)
2. Use the blueprint file (`render.yaml`)
3. Set `JWT_SECRET` in environment variables

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for details.

### Option 2: Separate hosting

**Backend** — deploy `backend/` to any Node.js host (Railway, Fly.io, VPS with Docker):

```bash
cd backend
npm run build
NODE_ENV=production JWT_SECRET=your-secret npm start
```

A `Dockerfile` is included in `backend/`.

**Frontend** — build and deploy as static files:

```bash
cd frontend
VITE_API_URL=https://your-backend-url.com npm run build
```

Deploy the `frontend/dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages). Make sure all routes fall back to `index.html` (SPA routing).

---

## Development Workflow

- **Main branch:** `main` (stable releases)
- **Development branch:** `development` (integration)
- **Feature branches:** `feature/xyz` branched from `development`
- **Bug fixes:** `fix/xyz` branched from `development`

Each feature/fix gets a PR to `development`. After testing, `development` is merged to `main`.

See [docs/WORKFLOW.md](./docs/WORKFLOW.md) for full details.

---

## License

Private project.

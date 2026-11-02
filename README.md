# AI TripMate — Personalized Travel Itinerary Planner

A beginner-friendly MVP using React + Vite, FastAPI, Gemini API (optional), and Supabase (optional).

## Features
- Trip form: destination, date, duration, budget, interests, travel style, group size
- Day-by-day itinerary generation
- Demo mode works without an AI key
- Optional Gemini integration using a backend-only API key
- Edit activity names in the results view
- Save/list trips using Supabase, with an in-memory demo fallback

> The generated sample costs and suggestions are illustrative. This is not a live booking or real-time route optimization system. Verify current prices, opening hours and availability independently.

## 1. Install Node.js
Install the LTS version from https://nodejs.org/en/download and restart VS Code. Verify:

```powershell
node -v
npm -v
python --version
```

## 2. Start the backend (PowerShell terminal 1)
From the project root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload
```

If PowerShell blocks activation, run this in that terminal and retry activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Open http://127.0.0.1:8000/docs to test the API and http://127.0.0.1:8000/api/health to inspect integration status.

## 3. Start the frontend (PowerShell terminal 2)
Open a second VS Code terminal from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

## 4. Enable Gemini AI (optional)
1. Visit https://aistudio.google.com/app/apikey and sign in.
2. Create an API key if available for your account. Check applicable usage limits and terms.
3. Open `backend/.env` and set `GEMINI_API_KEY=your_key_here`.
4. Restart the backend. The key must remain in the backend `.env`, never in React files or screenshots.

If the key is missing or the AI call fails, the app returns a demo itinerary. This makes the project testable without API access.

## 5. Enable Supabase persistence (optional)
1. Create a project at https://supabase.com/.
2. In the Supabase SQL Editor, run the contents of `backend/schema.sql`.
3. In Supabase project settings, find the project URL and a server-side service-role/secret key.
4. Put them in `backend/.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SIDE_SECRET_KEY
```

5. Restart the backend. The frontend will show saved trips from Supabase when configured.

**Security:** This starter uses a service-role key only for a local educational prototype and does not implement authentication. Do not expose this backend publicly or commit `.env`. Before public deployment, implement Supabase Auth, Row Level Security and per-user ownership, and use a suitable server-side secret.

## API endpoints
- `GET /api/health` — checks server and optional integrations
- `POST /api/generate` — generate an itinerary
- `GET /api/trips` — list saved trips
- `POST /api/trips` — save a trip

## Test example
In `http://127.0.0.1:8000/docs`, use `POST /api/generate` with:

```json
{
  "destination": "Jaipur, India",
  "start_date": "2026-10-30",
  "days": 3,
  "budget": 6000,
  "currency": "INR",
  "interests": ["food", "culture"],
  "travel_style": "budget",
  "group_size": 1
}
```

## MVP limitations to explain in the report
- No user login or multi-user collaboration yet.
- Itinerary recommendations and prices are not verified live data.
- Travel-time optimization is not implemented; tips encourage grouping nearby stops.
- Demo saved trips are held in memory and disappear when the backend restarts unless Supabase is configured.
- For a public deployment, add authentication, database policies, API rate limits, and secret management.

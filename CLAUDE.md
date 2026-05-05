# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FAINDA (ファインダ) is an anime recommendation web app hosted on Firebase (Hosting + Functions + Firestore + Auth). Firebase Functions run the recommendation engine server-side; the frontend is plain JS with no build step.

## Commands

```bash
# Local development (required — /__/firebase/init.js only works via firebase serve)
firebase emulators:start

# Deploy everything
firebase deploy

# Deploy only hosting or functions
firebase deploy --only hosting
firebase deploy --only functions
```

## Architecture

**Pages:**
- `public/anime.html` — recommendation UI (the main app)
- `public/manga.html` — stub (under construction)
- `public/index.html` — landing page

**Frontend JS** (classic `<script>` tags, no bundler):

| File | Purpose |
|---|---|
| `public/script.js` | Auth, Firestore read/write, calls Firebase Function, renders recommendation cards |
| `public/autocomplete.js` | Live anime search via Jikan API (`/v4/anime?q=`) with 350ms debounce |
| `public/loading.js` | `openModal` / `closeModal` for the detail overlay |

Firebase SDK (compat v10) is loaded from CDN before `script.js`. The app config is injected automatically via `/__/firebase/init.js` (Firebase Hosting reserved URL — requires `firebase serve` or emulators locally, never open as `file://`).

**Backend — `functions/index.js`:**
- Single callable function: `getRecommendations({ ratings, sortBy })`
- Loads `anime-filtered.csv.gz` and `user-filtered-updated.csv.gz` from `functions/data/` on first invocation, caches them in memory with `node-cache` for warm calls
- Runs user-based collaborative filtering (cosine similarity) against 7.6M user rating rows
- Returns top-5 anime objects `{ animeId, name, score, synopsis, ranked, popularity }`
- Saves recommendation history to Firestore if the caller is authenticated
- Memory: 1GB, timeout: 120s (cold start ~2-3s, warm calls fast)

**Firestore schema:**
```
users/{uid}/
  ratings[]        — { animeId, animeName, score } — saved when user adds anime
  recommendations[] — { timestamp, sortBy, results[] } — saved after each query
```

**Firestore rules:** authenticated users can only read/write their own document.

## Data

`functions/data/` (server-side only, never sent to browser):
- `anime-filtered.csv.gz` — 14,954 rows. Columns: `[0]` anime_id, `[1]` Name, `[2]` Score, `[6]` synopsis, `[17]` Ranked, `[18]` Popularity
- `user-filtered-updated.csv.gz` — 7,667,185 rows. Format: `[userID, animeID, rating]`, sorted by userID (no header row)

`public/data/`:
- `anime-names.csv` — legacy file, no longer used (autocomplete now calls Jikan)

## Recommendation Algorithm

1. User rates anime → `inputUserData: [{animeId, score}]` built up client-side
2. On "Find" click → `getRecommendations` Firebase Function called
3. Function scans all users in the CSV, computes adjusted cosine similarity (weighted by % of input anime in common)
4. Most similar user's highest-rated unseen shows become candidates
5. Candidates sorted by `ranked` / `popularity` / `score` column, top 5 returned
6. Frontend calls Jikan `/v4/anime/{id}/pictures` for cover art (500ms delay between calls)

## Authentication

Firebase Auth (email/password + Google). Auth state managed in `script.js` via `onAuthStateChanged`. On sign-in, saved ratings are loaded from Firestore and pre-populated into the UI.

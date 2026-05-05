# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FAINDA (ファインダ) is a static anime/manga recommendation web app hosted on Firebase Hosting. There is no build step — all files in `public/` are served directly.

## Deployment

```bash
firebase deploy --only hosting
firebase serve --only hosting   # local preview on localhost:5000
```

The Firebase project is `fainda-bc446` (`.firebaserc`). Firestore is configured but all reads/writes are denied — the app is static hosting only.

## Architecture

The app has two functional pages:

- **`public/anime.html`** — the recommendation UI
- **`public/manga.html`** — stub ("under construction")
- **`public/index.html`** — landing page with nav links

All logic lives in three plain JS files loaded as classic `<script>` tags (not modules):

| File | Purpose |
|---|---|
| `script.js` | Core recommendation engine + DOM manipulation |
| `autocomplete.js` | Anime name autocomplete from `data/anime-names.csv` |
| `loading.js` | Modal open/close + loading message display |

External libraries are loaded from CDN: **PapaParse** (CSV parsing), **pako** (gzip decompression), **Font Awesome**.

## Data

All data lives in `public/data/`:

- `anime-filtered.csv.gz` — anime metadata (columns: ID, name, score, ..., synopsis at index 6, rank at index 17, popularity at index 18)
- `user-filtered-updated.csv.gz` — user rating rows `[userID, animeID, rating]`, sorted by userID
- `anime-names.csv` — pipe-delimited (`|`) list of anime names for autocomplete

Both `.gz` files are fetched and decompressed client-side with pako on page load.

## Recommendation Algorithm

`script.js` implements user-based collaborative filtering:

1. User rates 1+ anime via the search UI → stored in `inputUserData`
2. `similarityFilter()` scans all users in the dataset, computing adjusted cosine similarity between the input rating vector and each dataset user's vector
3. The most similar user's highest-rated shows (excluding already-rated ones) become recommendations
4. `recommendShows(type)` sorts recommendations by rank (`17`), popularity (`18`), or score (`2`) and returns top 5
5. `fetchAnimeImages()` calls the **Jikan API** (`/v4/anime/{id}/pictures`) for cover art — throttled to one call per 500ms to stay within the 3 req/sec limit

## Known Issues

- `index.html` contains a broken Firebase Analytics snippet that uses `require('dotenv')` inside a browser ES module — this will throw at runtime. The analytics are non-functional.
- The `package.json` node dependencies (`csv-parser`, `dotenv`, `node-cache`, `pako`) are not used by the frontend; the app uses CDN versions instead.

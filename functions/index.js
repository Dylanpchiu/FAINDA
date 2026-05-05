const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const pako = require("pako");
const Papa = require("papaparse");
const NodeCache = require("node-cache");

admin.initializeApp();

const cache = new NodeCache({ stdTTL: 0 });

function loadAnimeData() {
  const cached = cache.get("anime");
  if (cached) return cached;

  const buf = fs.readFileSync(path.join(__dirname, "data", "anime-filtered.csv.gz"));
  const text = pako.inflate(new Uint8Array(buf), { to: "string" });
  const rows = Papa.parse(text, { skipEmptyLines: true }).data;

  const index = {};
  for (const row of rows) index[row[0]] = row;

  cache.set("anime", index);
  return index;
}

function loadUserIndex() {
  const cached = cache.get("userIndex");
  if (cached) return cached;

  const buf = fs.readFileSync(path.join(__dirname, "data", "user-index.json.gz"));
  const text = pako.inflate(new Uint8Array(buf), { to: "string" });
  const result = JSON.parse(text);

  cache.set("userIndex", result);
  return result;
}

function cosineSimilarity(inputRatings, userRatingObj) {
  let dot = 0, normA = 0, normB = 0, common = 0;
  for (const { animeId, score } of inputRatings) {
    const b = userRatingObj[String(animeId)] || 0;
    if (score !== 0 && b !== 0) {
      dot += score * b;
      normA += score * score;
      normB += b * b;
      common++;
    }
  }
  if (common === 0) return 0;
  return (dot / (Math.sqrt(normA) * Math.sqrt(normB))) * (common / inputRatings.length);
}

function findBestUsers(inputRatings, animeToUsers, userRatings) {
  const candidates = new Set();
  for (const { animeId } of inputRatings) {
    const users = animeToUsers[String(animeId)];
    if (users) for (const u of users) candidates.add(u);
  }

  let maxSim = -1;
  let bestUsers = [];

  for (const userId of candidates) {
    const sim = cosineSimilarity(inputRatings, userRatings[userId]);
    if (sim > maxSim) {
      maxSim = sim;
      bestUsers = [userId];
    } else if (sim === maxSim && sim > 0) {
      bestUsers.push(userId);
    }
  }
  return bestUsers;
}

function getTopAnimeFromUsers(bestUsers, userRatings, inputAnimeIds) {
  const inputSet = new Set(inputAnimeIds.map(String));
  const scores = {};

  for (const userId of bestUsers) {
    for (const [animeId, rating] of Object.entries(userRatings[userId])) {
      if (!inputSet.has(animeId)) {
        if (!scores[animeId] || rating > scores[animeId]) {
          scores[animeId] = rating;
        }
      }
    }
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

function getAnimeMetadata(animeIds, animeIndex, sortBy) {
  const COL = { score: 2, ranked: 17, popularity: 18 };
  const col = COL[sortBy] || 2;

  const rows = animeIds.map(id => animeIndex[id]).filter(Boolean);

  rows.sort((a, b) =>
    sortBy === "ranked"
      ? Number(a[col]) - Number(b[col])
      : Number(b[col]) - Number(a[col])
  );

  return rows.slice(0, 5).map(row => ({
    animeId: row[0],
    name: row[1],
    score: row[2],
    synopsis: row[6],
    ranked: row[17],
    popularity: row[18],
  }));
}

exports.getRecommendations = functions
  .runWith({ memory: "2GB", timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    const { ratings, sortBy = "score" } = data;

    // Warm-up call — pre-loads data into cache and returns immediately
    if (data.warmup) {
      loadAnimeData();
      loadUserIndex();
      return { warmup: true };
    }

    if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "ratings required");
    }

    const animeIndex = loadAnimeData();
    const { animeToUsers, userRatings } = loadUserIndex();

    const bestUsers = findBestUsers(ratings, animeToUsers, userRatings);
    if (bestUsers.length === 0) return { recommendations: [] };

    const inputAnimeIds = ratings.map(r => String(r.animeId));
    const candidateIds = getTopAnimeFromUsers(bestUsers, userRatings, inputAnimeIds);
    const recommendations = getAnimeMetadata(candidateIds, animeIndex, sortBy);

    if (context.auth) {
      const db = admin.firestore();
      await db.collection("users").doc(context.auth.uid).set(
        {
          recommendations: admin.firestore.FieldValue.arrayUnion({
            timestamp: Date.now(),
            sortBy,
            results: recommendations.map(r => r.animeId),
          }),
        },
        { merge: true }
      );
    }

    return { recommendations };
  });

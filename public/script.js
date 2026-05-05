"use strict";

let inputUserData = [];
let IDCheck = [];
let count = 0;
let currentUser = null;
let authMode = "signin";

document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const fns = firebase.functions();

  if (location.hostname === "localhost") {
    auth.useEmulator("http://localhost:9099");
    db.useEmulator("localhost", 8080);
    fns.useEmulator("localhost", 5001);
  }

  window._auth = auth;
  window._db = db;
  window._getRecommendations = fns.httpsCallable("getRecommendations");

  // Pre-warm the function so data is cached before the user clicks Find
  fns.httpsCallable("getRecommendations")({ warmup: true }).catch(() => {});

  auth.onAuthStateChanged(user => {
    currentUser = user;
    updateAuthUI(user);
    if (user) loadSavedRatings(user.uid);
    else clearRatingsList();
  });

  document.getElementById("search-button").addEventListener("click", handleAddAnime);
  document.getElementById("filter").addEventListener("click", handleGetRecommendations);
  document.getElementById("sign-in-btn").addEventListener("click", () => openAuthModal("signin"));
  document.getElementById("sign-out-btn").addEventListener("click", () => window._auth.signOut());
  document.getElementById("auth-submit-btn").addEventListener("click", handleAuthSubmit);
  document.getElementById("auth-toggle").addEventListener("click", e => {
    e.preventDefault();
    openAuthModal(authMode === "signin" ? "register" : "signin");
  });
  document.getElementById("google-sign-in").addEventListener("click", handleGoogleSignIn);
});

// AUTH ---------------------------------------------------------------

function updateAuthUI(user) {
  const emailEl = document.getElementById("user-email");
  const signOutBtn = document.getElementById("sign-out-btn");
  const signInBtn = document.getElementById("sign-in-btn");

  if (user) {
    emailEl.textContent = user.email;
    signOutBtn.classList.remove("hidden");
    signInBtn.classList.add("hidden");
  } else {
    emailEl.textContent = "";
    signOutBtn.classList.add("hidden");
    signInBtn.classList.remove("hidden");
  }
}

function openAuthModal(mode) {
  authMode = mode;
  const isSignIn = mode === "signin";
  document.getElementById("auth-title").textContent = isSignIn ? "SIGN IN" : "REGISTER";
  document.getElementById("auth-submit-btn").textContent = isSignIn ? "SIGN IN" : "CREATE ACCOUNT";
  document.getElementById("auth-toggle").textContent = isSignIn
    ? "Don't have an account? Register"
    : "Already have an account? Sign in";
  document.getElementById("auth-error").textContent = "";
  document.getElementById("authModal").style.display = "flex";
}

function closeAuthModal() {
  document.getElementById("authModal").style.display = "none";
}

async function handleAuthSubmit() {
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  const errorEl = document.getElementById("auth-error");
  try {
    if (authMode === "signin") {
      await window._auth.signInWithEmailAndPassword(email, password);
    } else {
      await window._auth.createUserWithEmailAndPassword(email, password);
    }
    closeAuthModal();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

async function handleGoogleSignIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await window._auth.signInWithPopup(provider);
    closeAuthModal();
  } catch (err) {
    document.getElementById("auth-error").textContent = err.message;
  }
}

// RATINGS ------------------------------------------------------------

async function loadSavedRatings(uid) {
  const doc = await window._db.collection("users").doc(uid).get();
  if (!doc.exists) return;

  clearRatingsList();
  for (const { animeId, animeName, score } of (doc.data().ratings || [])) {
    IDCheck.push(String(animeId));
    inputUserData.push({ animeId: String(animeId), score: Number(score) });
    appendRatingItem(animeName, score);
  }
}

function clearRatingsList() {
  inputUserData = [];
  IDCheck = [];
  document.getElementById("displayList").innerHTML = "";
}

function appendRatingItem(animeName, score) {
  const li = document.createElement("li");
  li.textContent = animeName + "   RATED: " + score;
  document.getElementById("displayList").appendChild(li);
}

async function handleAddAnime() {
  const animeId = window.selectedAnimeId;
  const animeName = document.getElementById("anime-name").value.trim();
  const score = Number(document.getElementById("rate").value);

  if (!animeId || !animeName) {
    showPopup("popupContainer2");
    return;
  }
  if (IDCheck.includes(String(animeId))) {
    showPopup("popupContainer");
    return;
  }

  IDCheck.push(String(animeId));
  inputUserData.push({ animeId: String(animeId), score });
  appendRatingItem(animeName, score);

  if (currentUser) {
    await window._db.collection("users").doc(currentUser.uid).set(
      { ratings: firebase.firestore.FieldValue.arrayUnion({ animeId: String(animeId), animeName, score }) },
      { merge: true }
    );
  }
}

// RECOMMENDATIONS ----------------------------------------------------

async function handleGetRecommendations() {
  if (!inputUserData.length) return;

  const sortMap = { TopRanked: "ranked", HiddenGems: "popularity", HighScore: "score" };
  const sortBy = sortMap[document.getElementById("sort").value] || "score";
  const labelMap = { ranked: "TOP RANKED", popularity: "HIDDEN GEMS", score: "HIGHEST SCORE" };

  document.getElementById("loading-message").style.display = "block";

  try {
    const result = await window._getRecommendations({ ratings: inputUserData, sortBy });
    const recommendations = result.data.recommendations;

    const paragraph = document.createElement("p");
    paragraph.className = "indexParagraph";
    paragraph.textContent = labelMap[sortBy];

    const imageContainer = document.getElementById("imageContainer");
    if (count !== 0) {
      imageContainer.appendChild(paragraph);
    } else {
      document.getElementById("recommendations").appendChild(paragraph);
    }

    await fetchAnimeImages(recommendations);
    count++;
  } catch (err) {
    console.error("Recommendation error:", err);
  } finally {
    document.getElementById("loading-message").style.display = "none";
  }
}

// IMAGE CARDS --------------------------------------------------------

async function fetchAnimeImages(recommendations) {
  for (const rec of recommendations) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${rec.animeId}/pictures`);
      const data = await res.json();
      let imgEl = null;
      if (data.data && data.data.length > 0) {
        imgEl = document.createElement("img");
        imgEl.src = data.data[0].webp.image_url;
        imgEl.alt = rec.name;
      }
      createImageCard(imgEl, rec.name, rec.synopsis);
    } catch {
      createImageCard(null, rec.name, rec.synopsis);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

function createImageCard(image, title, synopsis) {
  const card = document.createElement("div");
  card.className = "image-card";
  if (image) card.appendChild(image);

  const titleEl = document.createElement("h3");
  titleEl.className = "title";
  titleEl.textContent = title;
  card.appendChild(titleEl);

  card.addEventListener("click", () => openModal(image, title, synopsis));
  document.getElementById("imageContainer").appendChild(card);
}

// UTILS --------------------------------------------------------------

function showPopup(id) {
  const el = document.getElementById(id);
  el.classList.add("show-popup");
  setTimeout(() => el.classList.remove("show-popup"), 2000);
}

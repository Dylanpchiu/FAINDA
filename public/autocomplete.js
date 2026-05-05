const resultsBox = document.querySelector(".result-box");
const inputBox = document.getElementById("anime-name");

let debounceTimer;

inputBox.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const query = inputBox.value.trim();
  if (!query) { resultsBox.innerHTML = ""; return; }
  debounceTimer = setTimeout(() => searchAnime(query), 350);
});

async function searchAnime(query) {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10&sfw=true`
    );
    const data = await res.json();
    displayResults(data.data || []);
  } catch {
    resultsBox.innerHTML = "";
  }
}

function displayResults(results) {
  if (!results.length) { resultsBox.innerHTML = ""; return; }

  const ul = document.createElement("ul");
  for (const anime of results) {
    const li = document.createElement("li");
    li.textContent = anime.title;
    li.addEventListener("click", () => {
      window.selectedAnimeId = anime.mal_id;
      inputBox.value = anime.title;
      resultsBox.innerHTML = "";
    });
    ul.appendChild(li);
  }
  resultsBox.innerHTML = "";
  resultsBox.appendChild(ul);
}

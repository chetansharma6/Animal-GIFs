/* app.js — main application logic: wires the UI to the API and storage.
 *
 * Flow (per the README spec):
 *   1. User enters a single-word animal name -> validate.
 *   2. Fetch funny GIFs (via our backend), show one.
 *   3. "Next GIF" shows a new, non-repeating GIF, up to 5 per animal.
 *   4. After the 5th GIF (or when GIPHY runs out), reset to the input stage.
 *   5. Re-entering the same animal starts a fresh 5-GIF session.
 *   6. Reloading mid-session resumes where the user left off (Local Storage).
 */

(function () {
  "use strict";

  // --- Element references -------------------------------------------------
  const inputStage = document.getElementById("input-stage");
  const gifStage = document.getElementById("gif-stage");
  const form = document.getElementById("animal-form");
  const animalInput = document.getElementById("animal-input");
  const errorMsg = document.getElementById("error-msg");

  const currentAnimalEl = document.getElementById("current-animal");
  const gifCountEl = document.getElementById("gif-count");
  const gifImage = document.getElementById("gif-image");
  const loader = document.getElementById("loader");
  const notice = document.getElementById("notice");
  const nextBtn = document.getElementById("next-btn");
  const resetBtn = document.getElementById("reset-btn");

  // --- In-memory state ----------------------------------------------------
  // session: persisted to Local Storage. pool: GIFs fetched for this animal.
  let session = null;
  let pool = [];

  // --- Validation ---------------------------------------------------------
  // Single word, letters only (allow internal hyphen, e.g. "angler-fish").
  const ANIMAL_PATTERN = /^[a-z]+(-[a-z]+)?$/;

  function validateAnimal(raw) {
    const value = (raw || "").trim().toLowerCase();
    if (!value) return { ok: false, error: "Please enter an animal name." };
    if (/\s/.test(value)) {
      return { ok: false, error: "Enter only one word (a single animal name)." };
    }
    if (!ANIMAL_PATTERN.test(value)) {
      return {
        ok: false,
        error: "Use letters only — a valid one-word animal name.",
      };
    }
    return { ok: true, value };
  }

  // --- Stage switching ----------------------------------------------------
  function showInputStage() {
    gifStage.classList.add("hidden");
    inputStage.classList.remove("hidden");
    animalInput.value = "";
    animalInput.focus();
  }

  function showGifStage() {
    inputStage.classList.add("hidden");
    gifStage.classList.remove("hidden");
  }

  function setLoading(isLoading) {
    loader.classList.toggle("hidden", !isLoading);
    nextBtn.disabled = isLoading;
  }

  // --- Pool helpers -------------------------------------------------------
  function findInPool(id) {
    return pool.find((gif) => gif.id === id) || null;
  }

  // The next GIF in the pool that hasn't been shown this session.
  function nextUnseenGif() {
    return pool.find((gif) => !session.shownIds.includes(gif.id)) || null;
  }

  // --- Rendering ----------------------------------------------------------
  // Display a GIF and count it toward the session total.
  function renderNewGif(gif) {
    gifImage.src = gif.url;
    gifImage.alt = `Funny ${session.animal} GIF`;
    Storage.recordGif(session, gif.id);
    gifCountEl.textContent = String(session.count);

    if (session.count >= CONFIG.MAX_GIFS_PER_SESSION) {
      nextBtn.disabled = true;
      notice.textContent = "That's all 5! Pick a new animal to keep going.";
    }
  }

  // Display an already-counted GIF (used when resuming, no count change).
  function renderExistingGif(gif) {
    gifImage.src = gif.url;
    gifImage.alt = `Funny ${session.animal} GIF`;
  }

  // --- Core actions -------------------------------------------------------

  // Fetch the GIF pool for the current animal, then show the first GIF.
  async function startSessionFor(animal) {
    session = Storage.start(animal);
    pool = [];
    currentAnimalEl.textContent = animal;
    gifCountEl.textContent = "0";
    notice.textContent = "";
    gifImage.removeAttribute("src");
    nextBtn.disabled = false;

    showGifStage();
    setLoading(true);
    try {
      pool = await Api.searchGifs(animal);
      if (pool.length === 0) {
        notice.textContent = `No funny ${animal} GIFs found. Try another animal.`;
        nextBtn.disabled = true;
        return;
      }
      renderNewGif(nextUnseenGif());
    } catch (err) {
      notice.textContent = err.message || "Something went wrong. Try again.";
      nextBtn.disabled = true;
    } finally {
      setLoading(false);
    }
  }

  // Resume an interrupted session: re-fetch the pool and re-show the last
  // GIF the user saw, without counting it again.
  async function resumeSession(saved) {
    session = saved;
    pool = [];
    currentAnimalEl.textContent = saved.animal;
    gifCountEl.textContent = String(saved.count);
    notice.textContent = "";
    nextBtn.disabled = false;

    showGifStage();
    setLoading(true);
    try {
      pool = await Api.searchGifs(saved.animal);

      const lastId = saved.shownIds[saved.shownIds.length - 1];
      const last = lastId ? findInPool(lastId) : null;
      if (last) renderExistingGif(last);

      if (saved.count >= CONFIG.MAX_GIFS_PER_SESSION) {
        nextBtn.disabled = true;
        notice.textContent = "That's all 5! Pick a new animal to keep going.";
      } else if (!nextUnseenGif()) {
        nextBtn.disabled = true;
        notice.textContent =
          "No more new GIFs for this animal — please choose another animal.";
      }
    } catch (err) {
      notice.textContent = err.message || "Something went wrong. Try again.";
      nextBtn.disabled = true;
    } finally {
      setLoading(false);
    }
  }

  function showNextGif() {
    if (session.count >= CONFIG.MAX_GIFS_PER_SESSION) return;

    const gif = nextUnseenGif();
    if (!gif) {
      // GIPHY ran out of unique GIFs before reaching 5 (spec answer #4).
      notice.textContent =
        "No more new GIFs for this animal — please choose another animal.";
      nextBtn.disabled = true;
      return;
    }
    renderNewGif(gif);
  }

  // --- Event listeners ----------------------------------------------------
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = validateAnimal(animalInput.value);
    if (!result.ok) {
      errorMsg.textContent = result.error;
      return;
    }
    errorMsg.textContent = "";
    startSessionFor(result.value);
  });

  nextBtn.addEventListener("click", showNextGif);

  resetBtn.addEventListener("click", () => {
    Storage.clear();
    session = null;
    pool = [];
    showInputStage();
  });

  // --- Init ---------------------------------------------------------------
  // Resume an in-progress session on reload, otherwise start at the input.
  (function init() {
    const saved = Storage.load();
    if (saved && saved.animal && saved.count < CONFIG.MAX_GIFS_PER_SESSION) {
      resumeSession(saved);
    } else {
      Storage.clear();
      showInputStage();
    }
  })();
})();

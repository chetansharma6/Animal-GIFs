/* app.js — main application logic: wires the UI to the API and storage.
 *
 * Flow (per the README spec):
 *   1. User enters a single-word animal name -> validate.
 *   2. Fetch funny GIFs (via our backend), show one.
 *   3. "Next GIF" shows a new, non-repeating GIF. More pages are fetched
 *      from GIPHY as needed, so generation continues indefinitely.
 *   4. There is no attempt limit — it keeps going until the user clicks
 *      "New animal", which resets to the input stage.
 *   5. Re-entering the same animal starts a fresh session.
 *   6. Reloading mid-session resumes the same animal (Local Storage).
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
  const gifImage = document.getElementById("gif-image");
  const loader = document.getElementById("loader");
  const notice = document.getElementById("notice");
  const nextBtn = document.getElementById("next-btn");
  const resetBtn = document.getElementById("reset-btn");

  // --- In-memory state ----------------------------------------------------
  // session: persisted to Local Storage ({animal, shownIds, offset}).
  // pool: GIFs fetched so far for the current animal.
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
  // The next GIF in the pool that hasn't been shown this session.
  function nextUnseenGif() {
    return pool.find((gif) => !session.shownIds.includes(gif.id)) || null;
  }

  // Fetch the next page of GIFs from the backend and add them to the pool.
  // Returns the number of new GIFs added (0 means GIPHY has no more).
  async function fetchMore() {
    const batch = await Api.searchGifs(session.animal, session.offset);
    session.offset += batch.length;
    pool.push(...batch);
    Storage.save(session);
    return batch.length;
  }

  // --- Rendering ----------------------------------------------------------
  function renderGif(gif) {
    gifImage.src = gif.url;
    gifImage.alt = `Funny ${session.animal} GIF`;
    session.shownIds.push(gif.id);
    Storage.save(session);
    notice.textContent = "";
  }

  // --- Core actions -------------------------------------------------------

  // Show the next unseen GIF, fetching more pages if the pool is exhausted.
  async function showNextGif() {
    setLoading(true);
    try {
      let gif = nextUnseenGif();
      while (!gif) {
        const added = await fetchMore();
        if (added === 0) {
          // GIPHY has no more results for this animal.
          notice.textContent =
            session.shownIds.length === 0
              ? `No funny ${session.animal} GIFs found. Try another animal.`
              : "No more new GIFs for this animal — pick a new animal.";
          nextBtn.disabled = true;
          return;
        }
        gif = nextUnseenGif();
      }
      renderGif(gif);
    } catch (err) {
      notice.textContent = err.message || "Something went wrong. Try again.";
    } finally {
      // Re-enable unless we hit the genuine end-of-results above.
      if (!notice.textContent.startsWith("No ")) nextBtn.disabled = false;
      loader.classList.add("hidden");
    }
  }

  // Start a brand-new session for the given animal.
  async function startSessionFor(animal) {
    session = Storage.start(animal);
    pool = [];
    currentAnimalEl.textContent = animal;
    notice.textContent = "";
    gifImage.removeAttribute("src");
    showGifStage();
    await showNextGif();
  }

  // Resume an existing session (e.g. after a page reload): keep the animal
  // and history, and continue with the next new GIF.
  async function resumeSession(saved) {
    session = saved;
    if (!Array.isArray(session.shownIds)) session.shownIds = [];
    if (typeof session.offset !== "number") session.offset = 0;
    pool = [];
    currentAnimalEl.textContent = session.animal;
    notice.textContent = "";
    gifImage.removeAttribute("src");
    showGifStage();
    await showNextGif();
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
    if (saved && saved.animal) {
      resumeSession(saved);
    } else {
      Storage.clear();
      showInputStage();
    }
  })();
})();

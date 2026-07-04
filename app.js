/* app.js — main application logic: wires the UI to the API and storage.
 *
 * Behavior:
 *   1. User enters a single-word animal name (or taps a quick-pick chip).
 *   2. The app fetches funny GIFs via the backend and shows one.
 *   3. "Next GIF" shows a new, non-repeating GIF, paging through GIPHY as
 *      needed — generation is unlimited.
 *   4. It continues until the user clicks "New animal".
 *   5. Reloading resumes the same animal from Local Storage.
 *
 * UI extras: quick-pick chips, a session counter, a "recently viewed"
 * thumbnail strip, copy-link / open-in-tab actions, keyboard shortcuts,
 * loading spinner, and smooth fade-ins.
 */

(function () {
  "use strict";

  // --- Element references -------------------------------------------------
  const inputStage = document.getElementById("input-stage");
  const gifStage = document.getElementById("gif-stage");
  const form = document.getElementById("animal-form");
  const searchBox = form.querySelector(".search-box");
  const animalInput = document.getElementById("animal-input");
  const errorMsg = document.getElementById("error-msg");
  const quickPicks = document.getElementById("quick-picks");

  const currentAnimalEl = document.getElementById("current-animal");
  const counterEl = document.getElementById("counter");
  const gifFrame = document.getElementById("gif-frame");
  const gifImage = document.getElementById("gif-image");
  const loader = document.getElementById("loader");
  const notice = document.getElementById("notice");
  const nextBtn = document.getElementById("next-btn");
  const resetBtn = document.getElementById("reset-btn");
  const copyBtn = document.getElementById("copy-btn");
  const openBtn = document.getElementById("open-btn");
  const historyEl = document.getElementById("history");
  const historyStrip = document.getElementById("history-strip");
  const toast = document.getElementById("toast");

  // --- Config -------------------------------------------------------------
  const QUICK_PICKS = [
    { emoji: "🐶", name: "dog" },
    { emoji: "🐱", name: "cat" },
    { emoji: "🐼", name: "panda" },
    { emoji: "🦊", name: "fox" },
    { emoji: "🐧", name: "penguin" },
    { emoji: "🦥", name: "sloth" },
    { emoji: "🦦", name: "otter" },
    { emoji: "🐒", name: "monkey" },
  ];
  const MAX_THUMBS = 20;

  // --- In-memory state ----------------------------------------------------
  // session: persisted to Local Storage ({animal, shownIds, offset}).
  // pool: GIFs fetched so far. viewed: GIFs shown this run (for thumbnails).
  let session = null;
  let pool = [];
  let viewed = [];
  let currentUrl = "";

  // --- Validation ---------------------------------------------------------
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

  // --- Small UI helpers ---------------------------------------------------
  function showInputStage() {
    gifStage.classList.add("hidden");
    inputStage.classList.remove("hidden");
    animalInput.value = "";
    errorMsg.textContent = "";
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

  function updateCounter() {
    const n = viewed.length;
    counterEl.textContent = `${n} viewed`;
  }

  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function flagInvalid(message) {
    errorMsg.textContent = message;
    searchBox.classList.remove("shake");
    // Force reflow so the animation can retrigger.
    void searchBox.offsetWidth;
    searchBox.classList.add("shake");
  }

  // --- Pool helpers -------------------------------------------------------
  function nextUnseenGif() {
    return pool.find((gif) => !session.shownIds.includes(gif.id)) || null;
  }

  async function fetchMore() {
    const batch = await Api.searchGifs(session.animal, session.offset);
    session.offset += batch.length;
    pool.push(...batch);
    Storage.save(session);
    return batch.length;
  }

  // --- Rendering ----------------------------------------------------------
  // Swap the main image with a fade-in.
  function displayImage(url) {
    currentUrl = url;
    gifImage.classList.remove("loaded");
    gifImage.src = url;
    gifImage.alt = `Funny ${session.animal} GIF`;
  }

  gifImage.addEventListener("load", () => gifImage.classList.add("loaded"));

  function renderThumbs() {
    historyStrip.innerHTML = "";
    // newest first
    viewed
      .slice()
      .reverse()
      .forEach((gif) => {
        const thumb = document.createElement("button");
        thumb.className = "thumb";
        thumb.type = "button";
        thumb.title = "View this GIF again";
        if (gif.url === currentUrl) thumb.classList.add("active");

        const img = document.createElement("img");
        img.src = gif.url;
        img.alt = "";
        img.loading = "lazy";
        thumb.appendChild(img);

        thumb.addEventListener("click", () => {
          displayImage(gif.url);
          markActiveThumb();
        });
        historyStrip.appendChild(thumb);
      });

    historyEl.classList.toggle("hidden", viewed.length === 0);
  }

  function markActiveThumb() {
    historyStrip.querySelectorAll(".thumb").forEach((t) => {
      const img = t.querySelector("img");
      t.classList.toggle("active", img && img.src === currentUrl);
    });
  }

  // Show a brand-new GIF (counts toward the session and history).
  function renderNewGif(gif) {
    displayImage(gif.url);
    session.shownIds.push(gif.id);
    Storage.save(session);

    viewed.push(gif);
    if (viewed.length > MAX_THUMBS) viewed = viewed.slice(-MAX_THUMBS);
    updateCounter();
    renderThumbs();
    notice.textContent = "";
  }

  // --- Core actions -------------------------------------------------------
  async function showNextGif() {
    setLoading(true);
    try {
      let gif = nextUnseenGif();
      while (!gif) {
        const added = await fetchMore();
        if (added === 0) {
          notice.textContent =
            viewed.length === 0
              ? `No funny ${session.animal} GIFs found. Try another animal.`
              : "That's every GIF GIPHY has for this one — pick a new animal!";
          nextBtn.disabled = true;
          loader.classList.add("hidden");
          return;
        }
        gif = nextUnseenGif();
      }
      renderNewGif(gif);
    } catch (err) {
      notice.textContent = err.message || "Something went wrong. Try again.";
    } finally {
      if (!notice.textContent) nextBtn.disabled = false;
      loader.classList.add("hidden");
    }
  }

  async function startSessionFor(animal) {
    session = Storage.start(animal);
    pool = [];
    viewed = [];
    currentUrl = "";
    currentAnimalEl.textContent = animal;
    notice.textContent = "";
    gifImage.removeAttribute("src");
    gifImage.classList.remove("loaded");
    updateCounter();
    renderThumbs();
    showGifStage();
    await showNextGif();
  }

  async function resumeSession(saved) {
    session = saved;
    if (!Array.isArray(session.shownIds)) session.shownIds = [];
    if (typeof session.offset !== "number") session.offset = 0;
    pool = [];
    viewed = [];
    currentUrl = "";
    currentAnimalEl.textContent = session.animal;
    notice.textContent = "";
    gifImage.removeAttribute("src");
    gifImage.classList.remove("loaded");
    updateCounter();
    renderThumbs();
    showGifStage();
    await showNextGif();
  }

  // --- Quick-pick chips ---------------------------------------------------
  function buildQuickPicks() {
    QUICK_PICKS.forEach(({ emoji, name }) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.textContent = `${emoji} ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
      chip.addEventListener("click", () => startSessionFor(name));
      quickPicks.appendChild(chip);
    });
  }

  // --- Event listeners ----------------------------------------------------
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = validateAnimal(animalInput.value);
    if (!result.ok) {
      flagInvalid(result.error);
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
    viewed = [];
    showInputStage();
  });

  copyBtn.addEventListener("click", async () => {
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      showToast("🔗 GIF link copied!");
    } catch {
      showToast("Couldn't copy — try Open instead.");
    }
  });

  openBtn.addEventListener("click", () => {
    if (currentUrl) window.open(currentUrl, "_blank", "noopener");
  });

  // Keyboard shortcuts (only while the GIF stage is visible).
  document.addEventListener("keydown", (event) => {
    if (gifStage.classList.contains("hidden")) return;
    const typing = document.activeElement === animalInput;
    if (typing) return;

    if (event.code === "Space" || event.code === "ArrowRight") {
      event.preventDefault();
      if (!nextBtn.disabled) showNextGif();
    } else if (event.code === "Escape") {
      resetBtn.click();
    }
  });

  // --- Init ---------------------------------------------------------------
  buildQuickPicks();

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

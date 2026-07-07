/* config.js — app-wide configuration constants (frontend). */

const CONFIG = {
  // Backend endpoint that returns the GIF list.
  GIFS_ENDPOINT: "/api/gifs",

  // Local Storage key under which the current session is persisted.
  STORAGE_KEY: "animalGifsSession",

  // Local Storage key for saved (favorited) GIFs — persists across sessions.
  FAVORITES_KEY: "animalGifsFavorites",
};

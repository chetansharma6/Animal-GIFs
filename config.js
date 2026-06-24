/* config.js — app-wide configuration constants (frontend).
 *
 * NOTE: The GIPHY API key is NOT here. It lives only on the server (.env)
 * so it can never be read from the browser. The frontend talks to our own
 * backend endpoint instead.
 */

const CONFIG = {
  // Our backend endpoint that proxies the GIPHY search (keeps the key hidden).
  GIFS_ENDPOINT: "/api/gifs",

  // Maximum distinct GIFs shown per animal (Option A from the spec).
  MAX_GIFS_PER_SESSION: 5,

  // Local Storage key under which the session is persisted.
  STORAGE_KEY: "animalGifsSession",
};

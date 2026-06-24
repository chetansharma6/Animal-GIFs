/* config.js — app-wide configuration constants (frontend).
 *
 * NOTE: The GIPHY API key is NOT here. It lives only on the server (.env)
 * so it can never be read from the browser. The frontend talks to our own
 * backend endpoint instead.
 */

const CONFIG = {
  // Our backend endpoint that proxies the GIPHY search (keeps the key hidden).
  GIFS_ENDPOINT: "/api/gifs",

  // Local Storage key under which the session is persisted.
  STORAGE_KEY: "animalGifsSession",
};

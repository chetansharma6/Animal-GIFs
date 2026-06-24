/* config.js — app-wide configuration constants.
 *
 * Replace GIPHY_API_KEY with your own key from
 * https://developers.giphy.com/ (Create an App -> API Key).
 * The free "API" tier is enough for development.
 */

const CONFIG = {
  // Your GIPHY API key. Keep "PUT_YOUR_GIPHY_API_KEY_HERE" until you add one.
  GIPHY_API_KEY: "PUT_YOUR_GIPHY_API_KEY_HERE",

  // GIPHY Search endpoint.
  GIPHY_SEARCH_URL: "https://api.giphy.com/v1/gifs/search",

  // How the animal name is turned into a search query.
  SEARCH_PREFIX: "funny",

  // Maximum distinct GIFs shown per animal (Option A from the spec).
  MAX_GIFS_PER_SESSION: 5,

  // How many results to pull from GIPHY per request. We over-fetch so we
  // have enough unique GIFs to satisfy a full 5-GIF session.
  FETCH_LIMIT: 25,

  // Content rating filter for family-friendly results.
  RATING: "g",

  // Local Storage key under which the session is persisted.
  STORAGE_KEY: "animalGifsSession",
};

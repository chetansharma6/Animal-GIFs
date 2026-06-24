/* api.js — talks to the GIPHY Search API.
 *
 * Exposes Api.searchGifs(animal), which returns a list of GIF objects
 * shaped as { id, url } for the query "funny {animal}".
 */

const Api = {
  /**
   * Search GIPHY for funny GIFs of the given animal.
   * @param {string} animal - a single-word animal name (already validated)
   * @returns {Promise<Array<{id: string, url: string}>>}
   * @throws {Error} if the API key is missing or the request fails
   */
  async searchGifs(animal) {
    if (
      !CONFIG.GIPHY_API_KEY ||
      CONFIG.GIPHY_API_KEY === "PUT_YOUR_GIPHY_API_KEY_HERE"
    ) {
      throw new Error(
        "Missing GIPHY API key. Add your key in config.js (GIPHY_API_KEY)."
      );
    }

    const query = `${CONFIG.SEARCH_PREFIX} ${animal}`.trim();
    const params = new URLSearchParams({
      api_key: CONFIG.GIPHY_API_KEY,
      q: query,
      limit: String(CONFIG.FETCH_LIMIT),
      rating: CONFIG.RATING,
      lang: "en",
    });

    const url = `${CONFIG.GIPHY_SEARCH_URL}?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GIPHY request failed (HTTP ${response.status}).`);
    }

    const payload = await response.json();
    const data = Array.isArray(payload.data) ? payload.data : [];

    // Normalise to the minimal shape the app needs. Prefer a reasonably
    // sized rendition, falling back to the original.
    return data
      .map((gif) => {
        const images = gif.images || {};
        const best =
          (images.downsized_medium && images.downsized_medium.url) ||
          (images.original && images.original.url) ||
          gif.url;
        return { id: gif.id, url: best };
      })
      .filter((g) => g.id && g.url);
  },
};

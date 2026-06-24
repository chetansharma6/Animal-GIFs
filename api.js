/* api.js — talks to our own backend, which proxies GIPHY.
 *
 * The GIPHY API key is never used here; it stays on the server. This file
 * just calls /api/gifs?animal=... and returns [{ id, url }, ...].
 */

const Api = {
  /**
   * Fetch funny GIFs of the given animal from our backend.
   * @param {string} animal - a single-word animal name (already validated)
   * @param {number} [offset=0] - how many results to skip (for paging)
   * @returns {Promise<Array<{id: string, url: string}>>}
   * @throws {Error} if the request fails or the backend returns an error
   */
  async searchGifs(animal, offset = 0) {
    const params = new URLSearchParams({ animal, offset: String(offset) });
    const url = `${CONFIG.GIFS_ENDPOINT}?${params.toString()}`;

    let response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new Error("Could not reach the server. Is it running?");
    }

    let payload = {};
    try {
      payload = await response.json();
    } catch (err) {
      // Non-JSON response (e.g. served as a static file with no backend).
      throw new Error("Unexpected server response. Start the Flask server.");
    }

    if (!response.ok) {
      throw new Error(payload.error || `Request failed (HTTP ${response.status}).`);
    }

    return Array.isArray(payload.data) ? payload.data : [];
  },
};

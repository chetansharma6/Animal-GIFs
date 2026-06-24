/* storage.js — session persistence in the browser's Local Storage.
 *
 * A "session" tracks the current animal, which GIF IDs have already been
 * shown (to prevent repeats), and the paging offset reached in the GIPHY
 * results. There is no attempt limit — generation continues until the user
 * starts a new animal.
 */

const Storage = {
  /**
   * Load the saved session, or null if none exists / it is corrupt.
   * @returns {{animal: string, shownIds: string[], offset: number} | null}
   */
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn("Could not read session from Local Storage:", err);
      return null;
    }
  },

  /**
   * Save the session object to Local Storage.
   * @param {{animal: string, shownIds: string[], offset: number}} session
   */
  save(session) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(session));
    } catch (err) {
      console.warn("Could not save session to Local Storage:", err);
    }
  },

  /**
   * Start a fresh session for the given animal. Re-using the same animal
   * name is allowed — it simply resets shownIds and offset.
   * @param {string} animal
   * @returns {{animal: string, shownIds: string[], offset: number}}
   */
  start(animal) {
    const session = { animal, shownIds: [], offset: 0 };
    this.save(session);
    return session;
  },

  /** Clear the saved session entirely. */
  clear() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
  },
};

"""server.py — Flask backend for Animal GIFs.

Responsibilities:
  * Serve the static frontend (index.html, CSS, JS).
  * Proxy GIF searches to GIPHY so the API key stays on the server and is
    never exposed to the browser. The key is read from the .env file
    (GIPHY_API_KEY) and is never sent to the client.

Run:
    pip install -r requirements.txt
    python server.py
Then open http://127.0.0.1:5000
"""

import os
import re

import requests
from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request, send_from_directory

load_dotenv()  # load GIPHY_API_KEY from .env

GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
GIPHY_SEARCH_URL = "https://api.giphy.com/v1/gifs/search"

SEARCH_PREFIX = "funny"
FETCH_LIMIT = 25
RATING = "g"

# Single-word animal name: letters only, optional internal hyphen.
ANIMAL_PATTERN = re.compile(r"^[a-z]+(-[a-z]+)?$")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Only these frontend files may be served over HTTP. Everything else in the
# project directory — .env (the API key!), server.py, .git/, requirements.txt
# — must NOT be reachable. We therefore disable Flask's automatic static route
# (static_folder=None) and serve an explicit allowlist instead.
PUBLIC_FILES = frozenset(
    {"index.html", "styles.css", "app.js", "config.js", "storage.js", "api.js"}
)

app = Flask(__name__, static_folder=None)


@app.route("/")
def index():
    """Serve the frontend entry point."""
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def frontend_file(filename):
    """Serve only allowlisted frontend assets; 404 for anything else."""
    if filename not in PUBLIC_FILES:
        abort(404)
    return send_from_directory(BASE_DIR, filename)


@app.route("/api/gifs")
def gifs():
    """Search GIPHY for funny GIFs of the requested animal.

    Query params:
        animal=<single-word animal name>
        offset=<int>  how many results to skip (for paging through more GIFs)
    Returns: {"data": [{"id": "...", "url": "..."}, ...]}
    """
    if not GIPHY_API_KEY:
        return (
            jsonify({"error": "Server is missing GIPHY_API_KEY (.env)."}),
            500,
        )

    animal = (request.args.get("animal") or "").strip().lower()
    if not ANIMAL_PATTERN.match(animal):
        return (
            jsonify({"error": "Provide a valid one-word animal name."}),
            400,
        )

    # Paging offset. GIPHY caps offset at 4999, so clamp to stay valid.
    try:
        offset = max(0, int(request.args.get("offset", "0")))
    except ValueError:
        offset = 0
    offset = min(offset, 4999)

    params = {
        "api_key": GIPHY_API_KEY,
        "q": f"{SEARCH_PREFIX} {animal}",
        "limit": FETCH_LIMIT,
        "offset": offset,
        "rating": RATING,
        "lang": "en",
    }

    try:
        response = requests.get(GIPHY_SEARCH_URL, params=params, timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        return jsonify({"error": f"GIPHY request failed: {exc}"}), 502

    payload = response.json()
    data = payload.get("data", []) if isinstance(payload, dict) else []

    gifs_out = []
    for gif in data:
        images = gif.get("images", {}) or {}
        best = (
            (images.get("downsized_medium") or {}).get("url")
            or (images.get("original") or {}).get("url")
            or gif.get("url")
        )
        if gif.get("id") and best:
            gifs_out.append({"id": gif["id"], "url": best})

    return jsonify({"data": gifs_out})


if __name__ == "__main__":
    # Local development server. On a host (Render/Railway/etc.) the app is
    # served by gunicorn instead, which imports `app` directly and binds the
    # platform-provided PORT. We still honor PORT here for parity.
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)

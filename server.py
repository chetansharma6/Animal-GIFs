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
from flask import Flask, jsonify, request, send_from_directory

load_dotenv()  # load GIPHY_API_KEY from .env

GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
GIPHY_SEARCH_URL = "https://api.giphy.com/v1/gifs/search"

SEARCH_PREFIX = "funny"
FETCH_LIMIT = 25
RATING = "g"

# Single-word animal name: letters only, optional internal hyphen.
ANIMAL_PATTERN = re.compile(r"^[a-z]+(-[a-z]+)?$")

app = Flask(__name__, static_folder=".", static_url_path="")


@app.route("/")
def index():
    """Serve the frontend entry point."""
    return send_from_directory(".", "index.html")


@app.route("/api/gifs")
def gifs():
    """Search GIPHY for funny GIFs of the requested animal.

    Query param: animal=<single-word animal name>
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

    params = {
        "api_key": GIPHY_API_KEY,
        "q": f"{SEARCH_PREFIX} {animal}",
        "limit": FETCH_LIMIT,
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
    app.run(host="127.0.0.1", port=5000, debug=True)

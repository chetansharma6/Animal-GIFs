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
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix

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

# Render terminates TLS and forwards the real client IP in X-Forwarded-For.
# Trust exactly one proxy hop so rate limiting keys off the real client.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# Per-client rate limiting to protect the GIPHY quota and the instance from
# abuse. In-memory storage is fine for a single-process free-tier deployment.
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["120 per minute"],
    storage_uri="memory://",
)


@app.errorhandler(429)
def ratelimit_handler(_exc):
    """Return rate-limit rejections as JSON so the frontend can show them."""
    return jsonify({"error": "Too many requests — please slow down."}), 429


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


# Content-Security-Policy: the frontend only loads its own scripts/styles,
# Google Fonts, and GIF images from GIPHY, and only calls back to /api (self).
CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; "
    "img-src 'self' https://*.giphy.com https://giphy.com; "
    "connect-src 'self'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "object-src 'none'; "
    "frame-ancestors 'none'"
)


@app.after_request
def set_security_headers(response):
    """Add defensive HTTP headers to every response."""
    response.headers["Content-Security-Policy"] = CSP
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = (
        "geolocation=(), microphone=(), camera=()"
    )
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    # Don't advertise the exact server/framework version.
    response.headers["Server"] = "animal-gifs"
    return response


@app.route("/api/gifs")
@limiter.limit("40 per minute")
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
    if len(animal) > 30 or not ANIMAL_PATTERN.match(animal):
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
        # Never echo the exception to the client: its message can include the
        # full request URL, which contains the secret api_key. Log privately,
        # return a generic message.
        app.logger.warning("GIPHY request failed: %s", exc)
        return jsonify({"error": "Could not reach the GIF service. Try again."}), 502

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
    # Debug mode exposes the Werkzeug interactive debugger (arbitrary code
    # execution). Keep it OFF unless FLASK_DEBUG=1 is explicitly set locally.
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)

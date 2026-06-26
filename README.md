# Animal-GIFs

Animal GIFs generates funny GIFs (graphics interchange formats) for any animal of your choice.

> 🔗 **Access the platform:** see [PLATFORM.md](PLATFORM.md) for the link to open the running app.

## Overview

A small web app where a user types in a single animal name and the site responds with a funny GIF of that animal. A **"Next GIF" button** generates a new, different GIF for the same animal each time it's pressed — with **no limit**: it keeps generating fresh GIFs (paging through GIPHY) until the user clicks **"New animal"**. Re-entering the same name is allowed and starts a fresh session.

## Tech Stack

- **Frontend:** HTML + CSS + JavaScript (no framework).
- **Backend:** Python **Flask** — serves the frontend and proxies GIF searches so the GIPHY API key stays on the server.
- **GIF source:** [GIPHY](https://developers.giphy.com/) Search API — queried with a "funny {animal}" style search term.
- **State / persistence:** browser **Local Storage** — tracks the current animal, GIFs already shown this session, and the GIF count.

## Why a backend? (API key protection)

A pure HTML/CSS/JS site **cannot hide an API key** — anything the browser sends is visible to anyone via the network tab. To keep the key usable only by the administrator, the key lives **only on the server** in a gitignored `.env` file. The browser never sees it:

```
Browser  ──►  /api/gifs?animal=dog  ──►  Flask (adds secret key)  ──►  GIPHY
         ◄──         GIF list        ◄──                           ◄──
```

The real `.env` is listed in `.gitignore` and is **never committed or pushed**. The repo only contains `.env.example` as a template.

## Project Structure

| File | Role |
|------|------|
| `index.html` | Page structure (input stage + GIF stage) |
| `styles.css` | Styling (dark theme, responsive) |
| `config.js` | Frontend constants (endpoint, GIF cap, storage key) — **no API key** |
| `storage.js` | Local Storage session management |
| `api.js` | Calls the backend `/api/gifs` endpoint |
| `app.js` | Validation, session logic, and UI wiring |
| `server.py` | Flask backend: serves frontend + proxies GIPHY (holds the key) |
| `requirements.txt` | Python dependencies |
| `.env.example` | Template for the key file (copy to `.env`) |
| `.env` | **Local, gitignored** — holds the real `GIPHY_API_KEY` |

## Setup & Run

```bash
# 1. Install Python dependencies
python -m pip install -r requirements.txt

# 2. Create your key file from the template, then paste your GIPHY key
#    (the administrator's key already lives in .env on the admin machine)
cp .env.example .env        # edit .env and set GIPHY_API_KEY

# 3. Start the server
python server.py

# 4. Open the app
#    http://127.0.0.1:5000
```

> Get a GIPHY key at <https://developers.giphy.com/> (Create an App → API Key). The free tier is enough for development.

## Core Behavior (Final Specification)

1. The user enters a **single-word animal name** into an input field.
2. The input is **validated** (see [Input Validation](#input-validation)). Invalid input prompts the user to enter a valid one-word animal name.
3. On a valid name, the app fetches a **funny GIF** of that animal (via the backend) and displays it.
4. A **"Next GIF" button** generates the next funny GIF for the **same** animal. Each press shows a **new, non-repeating** GIF.
5. There is **no attempt limit** — generation continues indefinitely. When the current page of results is used up, the app fetches the next page from GIPHY (via an `offset`), so new GIFs keep coming.
6. Generation only stops when the user clicks **"New animal"**, which resets to the input field.
7. If the user enters the **same animal name** again, that's allowed — a fresh session begins.
8. If GIPHY eventually runs out of GIFs for that animal, a message asks the user to pick a new animal.

## User Flow

```
[Enter single-word animal name]
        |
        v
[Validate input] ---- invalid ----> [Prompt: enter a valid one-word animal name]
        |
      valid
        |
        v
[Fetch & display funny GIF via backend]
        |
   click "Next GIF"  <--------------------+
        |                                  |
        v                                  |
[Display a NEW, non-repeating GIF] --------+   (fetches next page as needed)
        |
   click "New animal"
        |
        v
[Reset input] --> [Prompt for a new animal name]
        |
        v
(same name allowed -> fresh session)
```

## Input Validation

- Input must be a **single word** (one animal name only).
- Reject empty input, multiple words, numbers, and symbols.
- Trim whitespace and normalize case ("Dog", "dog", "DOG" treated the same).
- On invalid input, prompt the user to enter a valid one-word animal name.
- Validation runs on **both** the frontend (instant feedback) and the backend (safety).
- Matching to an animal relies on what **closely relates to GIPHY's returned dataset** for the search term (rather than a strict local animal dictionary).

## Session & State Behavior

- A **session** begins when a valid animal name is entered.
- A session serves **unlimited distinct GIFs** for that animal; duplicates are avoided by tracking already-shown GIF IDs.
- State is persisted in **Local Storage**:
  - current animal name
  - GIF IDs already shown this session (to prevent repeats)
  - current paging `offset` into the GIPHY results
- Reloading mid-session **resumes** the same animal and continues with the next new GIF.
- The session ends only when the user clicks **"New animal"** (or, rarely, when GIPHY runs out of GIFs for that animal).
- Re-entering the **same name** starts a **new session**, not a continuation.

## Open / Deferred Items

- **Reset UX:** The exact look of the reset (auto-clear, modal, redirect, etc.) is **not yet decided** and will be specified later.

## Status

Implemented — frontend + Flask backend in place, GIPHY key protected server-side.

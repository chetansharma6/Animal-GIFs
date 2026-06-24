# animal-gifs

Animal GIFs generates funny GIFs (graphics interchange formats) for any animal of your choice.

## Overview

A small web app where a user types in a single animal name and the site responds with a funny GIF of that animal. A button generates a new, different GIF for the same animal each time it's pressed — up to **5 GIFs per animal**. After the 5th GIF, the input resets and the user is prompted to enter a new animal name. Re-entering the same name is allowed and starts a fresh session with new GIFs.

## Tech Stack

- **Frontend:** HTML + CSS + JavaScript (no framework).
- **GIF source:** [GIPHY](https://developers.giphy.com/) Search API — queried with a "funny {animal}" style search term.
- **State / persistence:** browser **Local Storage** — tracks the current animal, GIFs already shown this session, and the GIF count.

## Core Behavior (Final Specification)

1. The user enters a **single-word animal name** into an input field.
2. The input is **validated** (see [Input Validation](#input-validation)). Invalid input prompts the user to enter a valid one-word animal name.
3. On a valid name, the app fetches a **funny GIF** of that animal from GIPHY and displays it.
4. A **"Next GIF" button** generates the next funny GIF for the **same** animal. Each press shows a **new, non-repeating** GIF.
5. The session continues until **5 distinct GIFs** have been shown (Option A — count-based, not time-based).
6. After the **5th GIF**, the animal name is **reset** and the user is prompted to enter a new animal name.
7. If the user enters the **same animal name** again, that's allowed — a fresh session of 5 new GIFs begins.
8. If GIPHY returns **no more unique GIFs** before reaching 5, a message/header is shown asking the user to choose another animal.

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
[Fetch & display funny GIF from GIPHY]   (GIF count = 1)
        |
   click "Next GIF"
        |
        v
[Display a NEW, non-repeating GIF]   (count increments)
        |
   count reaches 5  OR  no more unique GIFs available
        |
        v
[Reset input] --> [Prompt for a new animal name]
        |
        v
(same name allowed -> fresh session of 5 new GIFs)
```

## Input Validation

- Input must be a **single word** (one animal name only).
- Reject empty input, multiple words, numbers, and symbols.
- Trim whitespace and normalize case ("Dog", "dog", "DOG" treated the same).
- On invalid input, prompt the user to enter a valid one-word animal name.
- Matching to an animal relies on what **closely relates to GIPHY's returned dataset** for the search term (rather than a strict local animal dictionary).

## Session & State Behavior

- A **session** begins when a valid animal name is entered.
- Each session serves up to **5 distinct GIFs** for that animal; refreshes/duplicates are avoided by tracking already-shown GIF IDs.
- State is persisted in **Local Storage**:
  - current animal name
  - GIF IDs already shown this session (to prevent repeats)
  - current GIF count (1–5)
- The session ends when the count reaches **5**, or earlier if GIPHY has no more unique GIFs to serve.
- On session end, the animal name is **reset** and the user is prompted for a new one.
- Re-entering the **same name** starts a **new session**, not a continuation.

## GIPHY Integration Notes

- Use the GIPHY **Search** endpoint with a query such as `funny {animal}`.
- An API key is required (register at the GIPHY developer portal).
- Track returned GIF IDs in Local Storage to guarantee no repeats within a session.
- Handle the case where the API returns fewer than 5 unique results (show the "choose another animal" message).

## Open / Deferred Items

- **Reset UX:** The exact look of the reset (auto-clear, modal, redirect, etc.) is **not yet decided** and will be specified later.

## Status

Final specification stage — ready for implementation review.

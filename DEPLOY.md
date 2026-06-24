# Deploying Animal GIFs (free hosting)

This app is ready to deploy to **Render**'s free tier. The repo already
contains everything the host needs:

- `render.yaml` — Render blueprint (build + start commands, env var slot)
- `Procfile` — start command for Procfile-based hosts
- `requirements.txt` — includes `gunicorn` (production server)
- `server.py` — binds the platform-provided `PORT`

The GIPHY API key is **never** in the repo. You paste it into the host's
dashboard as an environment variable named `GIPHY_API_KEY`.

## Deploy to Render (step by step)

1. Go to <https://render.com> and sign up / log in (free; GitHub login works).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub and select the **`animal-gifs`** repository.
4. Render reads `render.yaml` and proposes a free web service. Click **Apply**.
5. When prompted for the **`GIPHY_API_KEY`** environment variable, paste your
   key (the one currently in your local `.env`). This is stored only in
   Render, not in GitHub.
6. Wait for the build/deploy to finish (a few minutes).
7. Render gives you a public URL like `https://animal-gifs-XXXX.onrender.com`.
   That is your shareable platform link.

## After deploying

- Put the public URL into [PLATFORM.md](PLATFORM.md) (replace the local link).
- Free Render web services **spin down when idle**; the first request after a
  while may take ~30–60s to wake up. This is normal on the free tier.

## Alternative free hosts

The same `Procfile` / `requirements.txt` also work on:

- **Railway** (<https://railway.app>) — New Project → Deploy from GitHub repo,
  then add `GIPHY_API_KEY` under Variables.
- **PythonAnywhere** (<https://www.pythonanywhere.com>) — manual WSGI setup;
  set `GIPHY_API_KEY` in the web app's environment.

In every case: set `GIPHY_API_KEY` as a platform environment variable. Never
commit the real key.

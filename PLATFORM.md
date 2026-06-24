# Platform Access

The Animal GIFs platform is served by the Flask backend (`server.py`).

## Access link (local hosting)

Once the server is running, open the platform here:

### 👉 http://127.0.0.1:5000

## How to start the platform

```bash
python -m pip install -r requirements.txt   # first time only
python server.py
```

Then visit the link above in your browser. The page lets you enter an animal
name and view up to 5 funny GIFs per animal. Your session (current animal,
GIFs already shown, and the count) is stored in the browser's **Local Storage**,
so reloading the page resumes where you left off.

## Notes

- This is a **local** address — it works only on the machine running the server.
- To share a **public** link, deploy `server.py` to a host (e.g. Render, Railway,
  Fly.io, or PythonAnywhere) and set `GIPHY_API_KEY` as a platform environment
  variable instead of using the local `.env` file. The public host will then
  provide a shareable URL to replace the local link above.

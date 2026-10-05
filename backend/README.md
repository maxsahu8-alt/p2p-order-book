# Verify server (optional)

`verify-worker.js` is a small Cloudflare Worker that reads two screenshots with a vision AI and returns JSON.
The app compares the result itself. Screenshots are not stored.

Why: the AI key stays on the server, not in the app or APK.

## Setup
1. Cloudflare dashboard → Workers → Create → paste `verify-worker.js` → Deploy.
2. Settings → Variables: set the secrets below.
3. In the app: Control → Verify screenshots → Verify server → paste the Worker URL and the same `APP_TOKEN`.

| Variable | Needed | Example |
|---|---|---|
| `AI_PROVIDER` | no (default `gemini`) | `gemini`, `openai`, `anthropic`, `openrouter` |
| `AI_API_KEY` | yes (secret) | your provider key |
| `AI_MODEL` | no | `gemini-2.5-flash` |
| `APP_TOKEN` | yes (secret) | a long random string |
| `ALLOWED_ORIGIN` | no | `*` |

Never commit keys to this repository.

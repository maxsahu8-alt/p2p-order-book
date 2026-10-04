# P2P Order Book — Android app

Personal P2P / Direct / Cash order book for Indian crypto merchants.

## How it works
- `web/` — the app's screens and features (one HTML file + libraries).
- `android/` — a small Android shell. It shows `web/` and **updates it by itself**:
  on every start it reads `web/version.json` from this repo and downloads only changed files.
- Changing `web/` = instant update for the phone (no new APK).
- Changing `android/` (name, icon, permissions) = GitHub Actions builds a new APK
  (Releases → **P2P-Order-Book.apk**). The app shows "New app version" and installs over the old one; data stays.

## Data
- Saved on the phone in a private file, plus a daily safety copy (last 7 days).
- Optional **Database phone**: a full copy on a second phone (see `server/SETUP.md`).
- Backup / Restore: Settings → Backup.

## Signing key (keep it safe)
The APK must always be signed with the same key, otherwise Android refuses to update it.
Repo secrets: `KEYSTORE_B64` (base64 of release.jks) and `KEYSTORE_PASSWORD`.
Never commit the .jks file.

## Release a screen update
```
python tools/make_web.py path/to/p2p-tracker.html --repo OWNER/REPO
git add web && git commit -m "Update v0.00xx" && git push
```

## Release a new APK
Bump `android/app/version.properties` (versionCode +1), run `make_web.py` (so version.json announces it), push.

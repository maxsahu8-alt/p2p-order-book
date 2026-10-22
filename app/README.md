# Pexai source

The app is one HTML file for the phone, but the source is split into parts here.

- `manifest.json` lists the parts in order. `tools/build_app.py` joins them byte for byte.
- `css/`, `body/`, `js/` hold the parts. Edit those, never the built file.
- `js/05-features.js` is the list of switchable parts (`FEATURES`) and `feat(key)`.
- `js/180-features-ui.js` applies switches and checks licence codes. `LIC_PUB` (in 05) is the owner's PUBLIC key; empty means open mode.
- Release: bump `APP_BUILD` and add an `APP_LOG` line (js/110-feedback-about.js), run `tools/release.sh`, run the tests, commit, push.
- Never commit the licence private key. It lives only on the owner's phone.

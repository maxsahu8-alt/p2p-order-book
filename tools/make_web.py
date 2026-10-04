#!/usr/bin/env python3
"""Build web/ from the app file and write web/version.json.

Usage: python tools/make_web.py <path/to/p2p-tracker.html> [--repo owner/name] [--notes "APK notes"]
The phone app compares web/version.json with what it has and downloads only changed files.
"""
import hashlib, json, os, re, sys
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web = os.path.join(here, "web")
args = sys.argv[1:]
src = args[0]
repo = args[args.index("--repo") + 1] if "--repo" in args else ""
notes = args[args.index("--notes") + 1] if "--notes" in args else ""
app = open(src, encoding="utf-8").read()
ver = re.search(r'const APP_VER="([0-9.]+)"', app).group(1)
doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
       '<style>html,body{margin:0;padding:0}</style></head><body>' + app + '</body></html>')
open(os.path.join(web, "index.html"), "w", encoding="utf-8").write(doc)
files = {}
for root, _, names in os.walk(web):
    for n in sorted(names):
        p = os.path.join(root, n)
        rel = os.path.relpath(p, web).replace(os.sep, "/")
        if rel in ("version.json", "README.md"):
            continue
        files[rel] = hashlib.sha1(open(p, "rb").read()).hexdigest()
props = dict(l.strip().split("=", 1) for l in open(os.path.join(here, "android/app/version.properties")) if "=" in l and not l.startswith("#"))
out = {"web": ver, "files": files,
       "apk": {"code": int(props["versionCode"]), "name": props["versionName"],
               "url": f"https://github.com/{repo}/releases/latest/download/P2P-Order-Book.apk" if repo else "",
               "notes": notes}}
json.dump(out, open(os.path.join(web, "version.json"), "w"), indent=1)
print("web", ver, "·", len(files), "files")

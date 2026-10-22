#!/usr/bin/env python3
"""Build the single-file app from the modules in app/.

Usage: python3 tools/build_app.py [--out path/to/p2p-tracker.html] [--check]

The app is written as small modules under app/ (css/, body/, js/). This script joins them, in the
order given by app/manifest.json, into ONE html file, exactly what the phone and the web page run.
Nothing is added or changed while joining, so the output is the same program, only easier to work on.

  --check   build in memory and only report the size and fingerprint (writes nothing)
"""
import hashlib, json, os, sys
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = os.path.join(here, "app")
args = sys.argv[1:]
out = args[args.index("--out") + 1] if "--out" in args else os.path.join(here, "dist", "p2p-tracker.html")
man = json.load(open(os.path.join(app, "manifest.json"), encoding="utf-8"))
chunks = []
for name in man["parts"]:
    p = os.path.join(app, name)
    if not os.path.isfile(p):
        sys.exit("missing module: " + name)
    chunks.append(open(p, encoding="utf-8", newline="").read())
html = "".join(chunks)
sha = hashlib.sha256(html.encode("utf-8")).hexdigest()
if "--check" in args:
    print("modules", len(man["parts"]), "· bytes", len(html.encode("utf-8")), "· sha256", sha[:16])
    sys.exit(0)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, "w", encoding="utf-8", newline="").write(html)
print("built", out, "·", len(man["parts"]), "modules ·", len(html.encode("utf-8")), "bytes ·", sha[:16])

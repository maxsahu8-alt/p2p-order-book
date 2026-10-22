#!/bin/bash
# Build the single-file app, check syntax, refresh web/ . Usage: tools/release.sh [out.html]
set -e
cd "$(dirname "$0")/.."
OUT=${1:-/home/claude/p2p-tracker.html}
python3 tools/build_app.py --out "$OUT"
python3 - "$OUT" <<'PY'
import re,subprocess,sys
h=open(sys.argv[1],encoding="utf-8").read()
js="\n".join(re.findall(r"<script>(.*?)</script>",h,re.S))
open("/tmp/_chk.js","w").write(js)
subprocess.check_call(["node","--check","/tmp/_chk.js"])
print("syntax ok")
PY
python3 tools/make_web.py "$OUT"

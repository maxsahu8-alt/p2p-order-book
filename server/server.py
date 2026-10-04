#!/usr/bin/env python3
"""P2P Order Book - database phone server (runs in Termux on an always-on Android phone).

Keeps a copy of every app record (orders, banks, parties, payments, settings...) in
records.db next to this script. Every request must send the header  X-Token: <your token>.

Run:   python server.py            (first run prints your token)
Port:  8080
API:   GET /ping  ·  GET /records  ·  PUT /records/<id>  ·  DELETE /records/<id>
"""
import json, os, secrets, sqlite3, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "records.db")
TOKEN_PATH = os.path.join(HERE, "token.txt")
PORT = 8080
MAX_BODY = 300_000  # one record, bytes

if not os.path.exists(TOKEN_PATH):
    with open(TOKEN_PATH, "w") as f:
        f.write(secrets.token_urlsafe(16))
TOKEN = open(TOKEN_PATH).read().strip()

lock = threading.Lock()
db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.execute("PRAGMA journal_mode=WAL")
db.execute("CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, body TEXT NOT NULL, updated INTEGER NOT NULL)")
db.commit()


class H(BaseHTTPRequestHandler):
    def _send(self, code, data=None):
        body = b"" if code == 204 else json.dumps(data if data is not None else {}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _auth(self):
        if not secrets.compare_digest(self.headers.get("X-Token", ""), TOKEN):
            self._send(401, {"error": "wrong token"})
            return False
        return True

    def _rec_id(self):
        parts = self.path.split("?")[0].strip("/").split("/")
        if len(parts) == 2 and parts[0] in ("records", "orders"):
            rid = unquote(parts[1])
            if 0 < len(rid) <= 200:
                return rid
        return None

    def do_OPTIONS(self):
        self._send(204)

    def do_GET(self):
        p = self.path.split("?")[0].rstrip("/")
        if p == "/ping":
            return self._send(200, {"ok": True, "time": int(time.time())})
        if not self._auth():
            return
        if p in ("/records", "/orders"):
            with lock:
                rows = db.execute("SELECT body FROM records").fetchall()
            return self._send(200, [json.loads(r[0]) for r in rows])
        self._send(404, {"error": "not found"})

    def do_PUT(self):
        if not self._auth():
            return
        rid = self._rec_id()
        if not rid:
            return self._send(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n > MAX_BODY:
                return self._send(413, {"error": "too big"})
            o = json.loads(self.rfile.read(n))
            if not isinstance(o, dict) or o.get("id") != rid:
                raise ValueError("id mismatch")
        except Exception as e:
            return self._send(400, {"error": str(e)})
        with lock:
            db.execute("INSERT OR REPLACE INTO records VALUES (?,?,?)", (rid, json.dumps(o, ensure_ascii=False), int(time.time())))
            db.commit()
        self._send(200, {"ok": True})

    def do_DELETE(self):
        if not self._auth():
            return
        rid = self._rec_id()
        if not rid:
            return self._send(404, {"error": "not found"})
        with lock:
            db.execute("DELETE FROM records WHERE id=?", (rid,))
            db.commit()
        self._send(200, {"ok": True})

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    print("P2P database server running on port", PORT)
    print("Your token (paste this in the app):", TOKEN)
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()

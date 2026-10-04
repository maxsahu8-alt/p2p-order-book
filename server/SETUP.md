# Database phone (optional)

A second phone that stays on charge keeps a full copy of all your records.

1. On the database phone install **Termux** (from F-Droid) and **Tailscale** (Play Store). Sign in to Tailscale with the same Gmail you use on your main phone.
2. In Termux:
   ```
   pkg update -y && pkg install -y python
   termux-setup-storage
   mkdir -p ~/p2p && cp ~/storage/downloads/server.py ~/p2p/
   cd ~/p2p && termux-wake-lock && python server.py
   ```
   It prints a **token**. Keep Termux open. Settings → Apps → Termux and Tailscale → Battery → **Unrestricted**.
3. On the main phone install Tailscale (same Gmail). Note the database phone's address (starts with `100.`).
4. In P2P Order Book: Menu → App → **Database phone** → address `http://100.x.x.x:8080` + token → **Save and turn on**.

The app syncs on start, every 5 minutes and after every change. If the database phone is off, the app keeps working and catches up later.
After the database phone restarts: open Termux → `cd ~/p2p && termux-wake-lock && python server.py`.

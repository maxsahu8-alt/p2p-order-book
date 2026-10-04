"""Accounting edge-case tests for P2P Order Book.
Run: python3 tests/accounting_test.py path/to/app.html
Each case loads a fresh app with seeded records and checks the single accounting layer (ACC)."""
import asyncio, json, sys
from playwright.async_api import async_playwright

APP = sys.argv[1] if len(sys.argv) > 1 else "web/index.html"
T0 = 1_780_000_000_000
H = 3_600_000
def bank(i, opening, typ="Bank"): return {"id": i, "kind": "bank", "name": i, "type": typ, "opening": opening, "time": T0}
def order(i, side, qty, rate, status="Completed", splits=None, t=0, **k):
    o = {"id": i, "side": side, "coin": "USDT", "qty": qty, "rate": rate, "status": status, "mode": "P2P", "pay": "UPI",
         "platform": "KuCoin", "cp": "c", "note": "", "time": T0 + t * H, "splits": splits if splits is not None else [{"bank": "A", "amt": qty * rate, "method": "UPI"}]}
    o.update(k); return o
def sp(amt, b="A"): return [{"bank": b, "amt": amt, "method": "UPI"}]

CASES = [
 ("opening only", [bank("A", 10000)], {"money": 10000, "netWorth": 10000}),
 ("buy then sell, profit from avg cost",
  [bank("A", 100000), order("b1", "BUY", 100, 90, t=1), order("s1", "SELL", 100, 92, t=2)],
  {"money": 100000 - 9000 + 9200, "stock.USDT": 0, "profit": 200, "netWorth": 100200}),
 ("sell on a later day still has profit (carried stock)",
  [bank("A", 100000), order("b1", "BUY", 100, 90, t=1), order("s1", "SELL", 50, 93, t=30)],
  {"profit": 150, "stock.USDT": 50, "netWorth": 100000 - 9000 + 4650 + 50 * 90}),
 ("cancelled order changes nothing",
  [bank("A", 50000), order("b1", "BUY", 100, 90, status="Cancelled")],
  {"money": 50000, "stock.USDT": 0, "netWorth": 50000}),
 ("reversed: completed then cancelled",
  [bank("A", 50000), order("b1", "BUY", 100, 90, status="Cancelled", doneAt=T0)],
  {"money": 50000, "stock.USDT": 0}),
 ("pending BUY already paid = coins in transit, net worth unchanged",
  [bank("A", 50000), order("b1", "BUY", 100, 90, status="Pending")],
  {"money": 41000, "stock.USDT": 0, "transit.USDT": 100, "netWorth": 50000}),
 ("pending SELL money received = coins owed, no double count",
  [bank("A", 0), order("b0", "BUY", 100, 90, t=0, splits=[]), order("s1", "SELL", 100, 92, status="Pending", t=1)],
  {"money": 9200, "stock.USDT": 100, "transit.USDT": -100, "netWorth": 9200}),
 ("pending not yet paid moves nothing",
  [bank("A", 50000), order("b1", "BUY", 100, 90, status="Pending", splits=[])],
  {"money": 50000, "transit.USDT": 0, "netWorth": 50000}),
 ("partial payment: half paid pending buy",
  [bank("A", 50000), order("b1", "BUY", 100, 90, status="Pending", splits=sp(4500))],
  {"money": 45500, "transit.USDT": 50, "netWorth": 50000}),
 ("duplicate order counted twice (shows why duplicate check is needed)",
  [bank("A", 50000), order("b1", "BUY", 100, 90), order("b2", "BUY", 100, 90)],
  {"money": 32000, "stock.USDT": 200}),
 ("edited order: rate change recomputes", [bank("A", 50000), order("b1", "BUY", 100, 91)],
  {"money": 50000 - 9100, "avgCost.USDT": 91}),
 ("expense reduces money and net worth",
  [bank("A", 10000), {"id": "e1", "kind": "expense", "amt": 500, "bank": "A", "cat": "Food", "time": T0}],
  {"money": 9500, "netWorth": 9500}),
 ("bank transfer moves money, total same",
  [bank("A", 10000), bank("B", 0), {"id": "m1", "kind": "move", "from": "A", "to": "B", "amt": 4000, "time": T0}],
  {"bal.A": 6000, "bal.B": 4000, "money": 10000}),
 ("cash account counted as cash",
  [bank("A", 10000), bank("C", 2000, "Cash")], {"bank": 10000, "cash": 2000, "money": 12000}),
 ("direct BUY on credit: coins up, dues up, net worth flat",
  [bank("A", 10000), {"id": "p1", "kind": "party", "name": "P", "time": T0},
   order("d1", "BUY", 100, 90, mode="Direct", splits=[], party="p1", dueLink=True),
   {"id": "dl_d1", "kind": "pdue", "party": "p1", "amt": 9000, "order": "d1", "time": T0}],
  {"money": 10000, "owe": 9000, "netWorth": 10000}),
 ("party paid more than due = advance",
  [bank("A", 10000), {"id": "p1", "kind": "party", "name": "P", "time": T0},
   {"id": "pd", "kind": "pdue", "party": "p1", "amt": 1000, "time": T0},
   {"id": "pp", "kind": "ppay", "party": "p1", "amt": 1500, "splits": sp(1500), "time": T0}],
  {"money": 8500, "owe": 0, "adv": 500, "netWorth": 9000}),
 ("opening stock with cost",
  [bank("A", 0), {"id": "s_main", "kind": "setting", "stock": {"USDT": 100}, "stockCost": {"USDT": 88}},
   order("s1", "SELL", 100, 92, t=1)],
  {"profit": 400, "stock.USDT": 0, "money": 9200}),
 ("archived bank keeps its history in net worth",
  [bank("A", 10000), dict(bank("B", 0), archived=True), {"id": "m1", "kind": "move", "from": "A", "to": "B", "amt": 0.4, "time": T0}],
  {"money": 10000}),
]

async def main():
    fails = 0
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, recs, exp in CASES:
            pg = await b.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
            await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(recs))})")
            await pg.goto("file://" + __import__("os").path.abspath(APP)); await pg.wait_for_timeout(600)
            got = await pg.evaluate("""()=>{const A=ACC();return {...A,profit:stats(orders).profit}}""")
            bad = []
            for k, v in exp.items():
                cur = got
                for part in k.split("."): cur = (cur or {}).get(part, 0) if isinstance(cur, dict) else 0
                if abs((cur or 0) - v) > 0.01: bad.append(f"{k}: want {v} got {cur}")
            if errs: bad.append("page errors: " + "; ".join(errs[:2]))
            print(("PASS " if not bad else "FAIL ") + name + ("" if not bad else "  -> " + " | ".join(bad)))
            fails += bool(bad); await pg.close()
        await b.close()
    print(f"\n{len(CASES)-fails}/{len(CASES)} passed"); sys.exit(1 if fails else 0)
asyncio.run(main())

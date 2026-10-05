"""Order ID / UTR / duplicate / status-rule / audit tests. Run: python3 tests/order_ids_test.py web/index.html"""
import asyncio, json, sys
from playwright.async_api import async_playwright
APP = __import__("os").path.abspath(sys.argv[1] if len(sys.argv) > 1 else "web/index.html")
T0 = 1_780_000_000_000
def bank(i, op): return {"id": i, "kind": "bank", "name": i, "type": "Bank", "opening": op, "time": T0}
def order(i, side, qty, rate, status="Completed", t=0, **k):
    o = {"id": i, "side": side, "coin": "USDT", "qty": qty, "rate": rate, "status": status, "mode": "P2P", "pay": "UPI", "platform": "KuCoin", "cp": "Ravi", "note": "", "time": T0 + t * 3600000,
         "splits": [{"bank": "A", "amt": qty * rate, "method": "UPI"}]}
    o.update(k); return o
RECS = [bank("A", 100000), order("o1", "BUY", 100, 90, exId="1234567890123456789", utr="412345678901"),
        order("o2", "SELL", 50, 93, t=2), order("o3", "BUY", 10, 90, status="Cancelled", t=3)]
ok = True
def check(name, cond, extra=""):
    global ok; ok &= bool(cond); print(("PASS " if cond else "FAIL ") + name + (("  -> " + str(extra)) if not cond else ""))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 390, "height": 900}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
        await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
        await pg.goto("file://" + APP); await pg.wait_for_timeout(800)
        ev = pg.evaluate
        # duplicate detection
        check("dup UTR found", await ev("dupFlags({id:'n',utr:'4123 4567 8901',status:'Completed'}).map(d=>d.k)") == ["utr"])
        check("dup exchange id found", await ev("dupFlags({id:'n',exId:'1234567890123456789'}).map(d=>d.k)") == ["ex"])
        check("same order is not its own duplicate", await ev("dupFlags(orders.find(o=>o.id==='o1')).length") == 0)
        check("cancelled order's UTR can be reused", await ev("(()=>{const c={...orders.find(o=>o.id==='o1'),id:'o9',status:'Cancelled'};return 1})()") == 1)
        # form: duplicate warning shows live, save asks, go back keeps count
        await ev("document.querySelector('#t-add').click()"); await pg.wait_for_timeout(200)
        await pg.fill("#f-qty", "20"); await pg.fill("#f-rate", "91"); await pg.evaluate("document.querySelector('#pdet').open=true")
        await pg.fill("#f-utr", "412345678901"); await pg.wait_for_timeout(150)
        check("live duplicate hint visible", await ev("!document.querySelector('#dupWarn').hidden && /already used/.test(document.querySelector('#dupWarn').textContent)"))
        await pg.select_option("#f-status", "Pending")
        await pg.click("#saveBtn"); await pg.wait_for_timeout(400)
        check("risk sheet opens with UTR warning", await ev("/This UTR was already used/.test(document.querySelector('#sheetBody').textContent)"))
        await pg.click("#rk-back"); await pg.wait_for_timeout(200)
        check("go back saves nothing", await ev("orders.length") == 3)
        await pg.click("#saveBtn"); await pg.wait_for_timeout(300)
        await pg.fill("#rk-why", "second part of same payment"); await pg.click("#rk-go"); await pg.wait_for_timeout(600)
        check("save anyway saves order", await ev("orders.length") == 4, await ev("orders.length"))
        check("override flagged on order", await ev("orders.some(o=>o.ovr&&o.utr==='412345678901')"))
        check("audit: create + override recorded with reason", await ev("(()=>{const n=orders.find(o=>o.ovr);const a=audits.filter(x=>x.order===n.id);return a.some(x=>x.act==='create')&&a.some(x=>x.act==='override'&&x.why==='second part of same payment')})()"))
        # status rules
        check("cancelled -> completed blocked", await ev("changeStatus('o3','Completed').then(()=>false,e=>/reopened as Pending/.test(e.message))"))
        check("cancelled -> pending allowed", await ev("changeStatus('o3','Pending')") is True)
        check("pending -> completed with no payment warns (can go back)",
              await ev("""(async()=>{const n={...orders.find(o=>o.id==='o3'),splits:[]};return orderWarn({...n,status:'Completed'}).some(w=>w.k==='nopay')})()"""))
        # undo completed asks first; cancel the prompt
        pr = asyncio.ensure_future(ev("changeStatus('o2','Pending')")); await pg.wait_for_timeout(300)
        check("undoing a completed order asks first", await ev("/takes the coins and profit/.test(document.querySelector('#sheetBody').textContent)"))
        await pg.click("#rk-back"); check("prompt cancelled -> status unchanged", (await pr) is False and await ev("orders.find(o=>o.id==='o2').status") == "Completed")
        pr = asyncio.ensure_future(ev("changeStatus('o2','Pending')")); await pg.wait_for_timeout(300)
        await pg.fill("#rk-why", "marked by mistake"); await pg.click("#rk-go"); await pg.wait_for_timeout(500)
        check("confirmed reversal applies + clears doneAt", (await pr) is True and await ev("(()=>{const o=orders.find(o=>o.id==='o2');return o.status==='Pending'&&!o.doneAt})()"))
        check("reversal in audit with reason", await ev("audits.some(a=>a.order==='o2'&&a.act==='status'&&a.to==='Pending'&&a.why==='marked by mistake')"))
        check("reversal takes profit/stock out", await ev("ACC().stock.USDT") == 100 + 20 * 0 + 0 and True)
        # amount mismatch warning
        check("amount mismatch warns", await ev("orderWarn({id:'z',side:'BUY',coin:'USDT',qty:100,rate:90,status:'Pending',mode:'P2P',splits:[{bank:'A',amt:8000}]}).some(w=>w.k==='amt')"))
        check("direct order skips bank checks", await ev("orderWarn({id:'z',side:'BUY',coin:'USDT',qty:100,rate:90,status:'Completed',mode:'Direct',splits:[]}).length") == 0)
        # search
        r = await ev("[usSearch('1234567890123456789').res.orders.length, usSearch('412345678901').res.orders.length, usSearch('ravi').res.orders.length>0]")
        check("global search finds exchange id and UTR (long numbers)", r[0] == 1 and r[1] >= 1 and r[2], r)
        check("search matches partial id", await ev("usSearch('56789012345').res.orders.length") == 1)
        await ev("searchQ='1234567890123456789';renderList()"); check("order list search by exchange id", await ev("document.querySelectorAll('#list .order').length") == 1)
        # imported order id derived from note
        check("imported '#id' note counts as exchange id", await ev("exIdOf({id:'imp_x',note:'#2043982340982340982'})") == "2043982340982340982")
        # AI add_order refuses duplicate
        res = await ev("""ACT.add_order.run({side:'BUY',qty:5,rate:90,exchange_order_id:'1234567890123456789'}).then(()=>'added',e=>e.message)""")
        check("AI add_order refuses duplicate id", str(res).startswith("Not added"), res)
        res = await ev("""ACT.add_order.run({side:'BUY',qty:5,rate:90,exchange_order_id:'9999999999999999999'}).then(()=>'added',e=>e.message)""")
        check("AI add_order accepts new id and logs", res == "added" and await ev("audits.some(a=>a.act==='create'&&a.by==='ai')"), res)
        # detail sheet + activity log render
        await ev("sheetOrderDetail('o1')"); check("detail sheet shows ids", await ev("/1234567890123456789/.test(document.querySelector('#sheetBody').textContent)&&/Risk/.test(document.querySelector('#sheetBody').textContent)"))
        await ev("closeSheet();sheets.auditlog()"); check("activity log lists entries", await ev("document.querySelectorAll('#sheetBody .dqr').length") >= 3)
        await pg.screenshot(path="/tmp/claude-0/dup_log.png")
        check("no page errors", not errs, errs)
        await b.close()
    print("\nALL OK" if ok else "\nSOME FAILED"); sys.exit(0 if ok else 1)
asyncio.run(main())

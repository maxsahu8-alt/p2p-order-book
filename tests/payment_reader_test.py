"""Payment screenshot reader tests. OCR text in tests/fixtures was produced by running tesseract on rendered sample screens.
Run: python3 tests/payment_reader_test.py path/to/app.html"""
import asyncio, json, os, sys, datetime
from playwright.async_api import async_playwright
APP = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "web/index.html")
FX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
def ts(y, mo, d, h=0, mi=0): return int(datetime.datetime(y, mo, d, h, mi).timestamp() * 1000)
CASES = {
 "pay_phonepe":    dict(amount=2500, utr="628151234567", receiver="RAVI KUMAR", bank="HDFC Bank", last4="1234", dir="out", status="Success", method="UPI", ok=True),
 "pay_gpay":       dict(amount=4650, utr="412345678901", receiver="AMIT SHARMA", sender="Shiv Sahu", bank="SBI", last4="1234", status="Success", ok=True),
 "pay_paytm":      dict(amount=9000, utr="528812345678", receiver="Ravi K", bank="Paytm Payments Bank", dir="out", ok=True),
 "pay_failed":     dict(amount=1200, utr="528800000001", receiver="SUNIL VERMA", status="Failed", ok=True),
 "pay_received":   dict(amount=725000.5, utr="528812349999", sender="MEHTA TRADERS", bank="ICICI Bank", last4="5678", dir="in", method="IMPS", ok=True),
 "pay_sms_credit": dict(amount=5000, utr="528812345678", bank="HDFC Bank", last4="1234", dir="in", method="IMPS", status="Success", ok=True),
 "pay_sms_debit":  dict(amount=3000, utr="528812345678", receiver="RAVI KUMAR", bank="SBI", last4="1234", dir="out", ok=True),
 "pay_not_payment": dict(ok=False),
}
TIMES = {"pay_phonepe": ts(2026,10,5,21,41), "pay_gpay": ts(2026,10,5,21,41), "pay_paytm": ts(2026,10,5,21,41), "pay_failed": ts(2026,10,5,21,50),
         "pay_received": ts(2026,10,5,10,12), "pay_sms_credit": ts(2026,10,5), "pay_sms_debit": ts(2026,10,5)}
ok = True
def check(name, cond, extra=""):
    global ok; ok &= bool(cond); print(("PASS " if cond else "FAIL ") + name + ((" -> " + str(extra)) if not cond else ""))
T0 = 1_780_000_000_000
RECS = [{"id": "A", "kind": "bank", "name": "HDFC main", "bankName": "HDFC Bank", "accNo": "50100012341234", "type": "Bank", "opening": 100000, "time": T0},
        {"id": "o1", "side": "BUY", "coin": "USDT", "qty": 100, "rate": 25, "status": "Pending", "mode": "P2P", "pay": "UPI", "platform": "KuCoin", "cp": "Ravi Kumar", "note": "", "time": T0, "splits": []},
        {"id": "o2", "side": "SELL", "coin": "USDT", "qty": 50, "rate": 93, "status": "Pending", "mode": "P2P", "pay": "UPI", "platform": "KuCoin", "cp": "cryptoking99", "note": "", "time": T0 + 1, "splits": []},
        {"id": "o3", "side": "BUY", "coin": "USDT", "qty": 60, "rate": 50, "status": "Completed", "mode": "P2P", "pay": "UPI", "platform": "KuCoin", "cp": "Other", "note": "", "time": T0 + 2, "utr": "628151234567", "splits": []}]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 390, "height": 900}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
        await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
        await pg.goto("file://" + APP); await pg.wait_for_timeout(800)
        for name, exp in CASES.items():
            txt = open(os.path.join(FX, name + ".txt")).read()
            got = await pg.evaluate("t=>payParse(t)", txt)
            bad = [f"{k}: want {v!r} got {got.get(k)!r}" for k, v in exp.items() if (abs(got.get(k, 0) - v) > 0.001 if isinstance(v, float) else got.get(k) != v)]
            if name in TIMES and got.get("time") != TIMES[name]: bad.append(f"time: want {TIMES[name]} got {got.get('time')}")
            check("parse " + name.replace("pay_", ""), not bad, "; ".join(bad))
        # --- card flow on the PhonePe sample (₹2,500 paid to RAVI KUMAR, UTR already on o3 -> warning)
        await pg.evaluate("""()=>{orders.find(o=>o.id==='o1').rate=25;}""")  # total 2500, matches
        txt = open(os.path.join(FX, "pay_phonepe.txt")).read()
        await pg.evaluate("t=>{const c=payCard(payParse(t),null,'phone');c.id='tcard';document.body.appendChild(c)}", txt)
        sel = await pg.evaluate("[...document.querySelectorAll('#tcard [data-f=order] option')].map(o=>o.textContent.slice(0,2)+'|'+o.value)")
        check("order with same amount is suggested first", sel[0].endswith("|o1") and sel[0].startswith("✓"), sel)
        w = await pg.evaluate("document.querySelector('#tcard [data-w]').textContent")
        check("warns: UTR already used by another order", "already used in another order" in w, w)
        check("no sender-name warning when names match", "not the client" not in w, w)
        check("offers to record the payment in the matching bank (last 4 digits)", await pg.evaluate("!document.querySelector('#tcard [data-recw]').hidden && /HDFC main/.test(document.querySelector('#tcard [data-rect]').textContent)"))
        # confirm anyway with a reason
        await pg.evaluate("document.querySelector('#tcard [data-f=rec]').checked=true")
        await pg.click("#tcard [data-ok]"); await pg.wait_for_timeout(400)
        check("risk sheet asks before confirming", await pg.evaluate("/Check this payment/.test(document.querySelector('#sheetBody').textContent)"))
        await pg.fill("#rk-why", "same payment re-shared"); await pg.click("#rk-go"); await pg.wait_for_timeout(700)
        o = await pg.evaluate("(()=>{const o=orders.find(x=>x.id==='o1');return {pv:o.pv,utr:o.utr,spl:allocated(o),pay:!!o.payAt,tag:pvOf(o)}})()")
        check("order marked Verified by you, UTR + payment time saved, bank recorded", o["pv"] == "verified" and o["utr"] == "628151234567" and o["spl"] == 2500 and o["pay"], o)
        check("audit has proof entry with reason", await pg.evaluate("audits.some(a=>a.order==='o1'&&a.act==='proof'&&a.why==='same payment re-shared')"))
        check("activity wording is readable", "Payment proof checked by you" in await pg.evaluate("auTxt(audits.find(a=>a.act==='proof'))"))
        # sender mismatch + failed + partial
        w = await pg.evaluate("""()=>{const o=orders.find(x=>x.id==='o2');return payWarn({amount:1000,utr:'999900001111',sender:'Amit Sharma',receiver:'',status:'Failed'},o,'')}""")
        joined = " | ".join(w)
        check("warns on failed status, partial amount and different sender", "Failed" in joined and "Partial payment" in joined and "not the client" in joined, joined)
        # screenshot reuse
        await pg.evaluate("patchRec('o2',{shots:['abc123']})"); await pg.wait_for_timeout(200)
        w = await pg.evaluate("""()=>payWarn({amount:4650,utr:'111122223333',sender:'cryptoking',status:'Success'},orders.find(x=>x.id==='o2'),'abc123')""")
        check("warns when the same screenshot is reused", any("screenshot was already used" in x for x in w), w)
        check("dupFlags catches reused screenshot on another order", await pg.evaluate("dupFlags({id:'zz',shots:['abc123'],status:'Pending'}).some(d=>d.k==='shot')"))
        # no order yet -> opens the new-order form prefilled, screenshot carried
        await pg.evaluate("document.querySelector('#tcard')&&document.querySelector('#tcard').remove()")
        await pg.evaluate("t=>{const c=payCard(payParse(t),null,'phone');c.id='tcard2';document.body.appendChild(c);c.querySelector('[data-f=order]').value=''}", open(os.path.join(FX, "pay_received.txt")).read())
        await pg.evaluate("document.querySelector('#tcard2 [data-f=order]').dispatchEvent(new Event('change',{bubbles:true}))")
        await pg.click("#tcard2 [data-ok]"); await pg.wait_for_timeout(600)
        if await pg.evaluate("/Check this payment/.test(document.querySelector('#sheetBody').textContent||'')"):
            await pg.click("#rk-go"); await pg.wait_for_timeout(500)
        pre = await pg.evaluate("({utr:document.querySelector('#f-utr').value,pv:document.querySelector('#f-pv').value,cp:document.querySelector('#f-cp').value,side:document.querySelector('#sideSeg .on').dataset.v})")
        check("'No order yet' starts a new order with UTR, name, side and Verified", pre == {"utr": "528812349999", "pv": "verified", "cp": "MEHTA TRADERS", "side": "SELL"}, pre)
        # AI-created orders are marked AI-read; verified is separate
        r = await pg.evaluate("ACT.add_order.run({side:'BUY',qty:5,rate:90,exchange_order_id:'7777777777777777',__proofs:['a1'],__hashes:['h1']}).then(()=>orders.filter(o=>o.src==='ai').map(o=>pvOf(o)))")
        check("order created from a screenshot by AI is marked AI-read", r == ["ai"], r)
        r = await pg.evaluate("ACT.add_order.run({side:'BUY',qty:5,rate:90,__proofs:['a2'],__hashes:['h1']}).then(()=>'added',e=>e.message)")
        check("AI cannot add the same screenshot twice", str(r).startswith("Not added") and "screenshot" in str(r), r)
        check("Smart intake asks first by default", await pg.evaluate("pref('autoIntake')===false"))
        check("no page errors", not errs, errs)
        await b.close()
    print("\nALL OK" if ok else "\nSOME FAILED"); sys.exit(0 if ok else 1)
asyncio.run(main())

import json,time
from playwright.sync_api import sync_playwright
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
T=int(time.time()*1000)-3600e3
RECS=[{"id":"A","kind":"bank","name":"Sbi bank","bankName":"SBI","type":"Bank","opening":20000,"time":T-9e8},
      {"id":"e1","kind":"expense","amt":300,"cat":"Food","note":"","time":int(T)}]
SHOT="/tmp/claude-0/-home-claude/e06cf8eb-6fee-5f8b-bf8b-b13130f5f5f0/scratchpad/shots/"
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={"width":390,"height":900},device_scale_factor=2);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))});localStorage.setItem('p2p_theme','light')")
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1200)
    bal=lambda:pg.evaluate("()=>balances().bal.A")
    b0=bal()
    pg.evaluate("()=>openQuick()");pg.wait_for_timeout(300)
    chk("Add sheet has Bank charges row",pg.locator('[data-q="q-chg"]').count()==1)
    pg.click('[data-q="q-chg"]');pg.wait_for_timeout(300)
    chk("charge sheet opens",pg.locator("#c-ty").count()==1)
    pg.click('#c-ty [data-t="Cash deposit / withdrawal"]');pg.fill("#c-amt","59");pg.fill("#c-note","cash deposit 50k")
    pg.screenshot(path=SHOT+"chg_form.png")
    pg.click('#sf button[type=submit]');pg.wait_for_timeout(500)
    chk("balance drops by 59",abs((b0-bal())-59)<0.01)
    pg.evaluate("()=>openQuick()");pg.wait_for_timeout(300)
    chk("Add sheet shows charges total",pg.evaluate("()=>document.querySelector('[data-v=\"q-chg\"]').textContent").startswith("₹59"))
    chk("personal spending excludes charge",pg.evaluate("()=>document.querySelector('[data-v=\"q-exp\"]').textContent").startswith("₹300"))
    pg.screenshot(path=SHOT+"chg_add.png");pg.evaluate("()=>closeSheet()")
    pg.evaluate("()=>sheets.ledger('A')");pg.wait_for_timeout(300)
    chk("ledger shows the charge",pg.locator('#sheetBody [data-chg]').count()==1 and "Bank charge · Cash deposit" in pg.inner_text("#sheetBody"))
    pg.click('#sheetBody [data-chg]');pg.wait_for_timeout(300)
    chk("tapping it opens edit",pg.locator("#c-del").count()==1 and pg.input_value("#c-amt")=="59")
    pg.evaluate("()=>sheets.bankrec('A')");pg.wait_for_timeout(300)
    pg.fill("#br-real",str(round(bal()-17.7,2)));pg.wait_for_timeout(150)
    chk("balance check offers charge",pg.locator("#br-chg").is_visible())
    pg.click("#br-chg");pg.wait_for_timeout(300)
    chk("charge prefilled with difference",pg.input_value("#c-amt")=="17.7")
    pg.click('#c-ty [data-t="SMS alert"]');pg.click('#sf button[type=submit]');pg.wait_for_timeout(400)
    pg.evaluate("()=>sheets.report()");pg.wait_for_timeout(300)
    t=pg.inner_text("#rpBody")
    chk("report shows Bank charges row","Bank charges" in t and "−₹77" in t)
    chk("share text lists charges","Bank charges: ₹77" in pg.evaluate("()=>buildReport('today').text"))
    chk("no page errors",not errs)
    if errs:print(errs)
print("FAILS",f)

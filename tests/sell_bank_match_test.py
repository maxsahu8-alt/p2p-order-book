from playwright.sync_api import sync_playwright
import json,time
now=int(time.time()*1000);f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
B=[{"id":"B1","kind":"bank","name":"Sbi bank","accNo":"XXXXXX2594","type":"Bank","opening":1000,"time":now-9e8,"upi":"9876547529@ptsbi, sbi.alt@oksbi"},
{"id":"B2","kind":"bank","name":"Axis bank","accNo":"XXXXXX7410","type":"Bank","opening":1000,"time":now-9e8,"vpas":["raju@okaxis"]},
{"id":"B3","kind":"bank","name":"Hdfc bank","type":"Bank","opening":1000,"time":now-9e8}]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps([{"id":"S","kind":"setting"}]+B)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1000)
    q=lambda o:pg.evaluate("o=>{const b=ixBankOf(o,'SELL');return b?b.id:null}",o)
    chk("received by account number",q({"dir":"in","last4":"7410"})=="B2")
    chk("received by full UPI ID",q({"dir":"in","vpa":"raju@okaxis"})=="B2")
    chk("received by hidden UPI ID ••7529@ptsbi",q({"dir":"in","vpa":"••••••7529@ptsbi"})=="B1")
    chk("hidden ID on another handle does not match",q({"dir":"in","vpa":"••••7529@okaxis"})is None)
    chk("unknown ID matches nothing",q({"dir":"in","vpa":"nobody@ybl"})is None)
    chk("full-number tail wrong digits no match",q({"dir":"in","vpa":"••••1111@ptsbi"})is None)
    chk("second UPI ID in the list matches",q({"dir":"in","vpa":"sbi.alt@oksbi"})=="B1")
    pg.evaluate("sheets.bank('B3')");pg.wait_for_timeout(400)
    chk("bank form shows the UPI ID field",pg.evaluate("!!document.querySelector('#s-upi')"))
    pg.fill('#s-upi','new.id@okhdfc, other@ybl');pg.click('#sf button[type=submit]');pg.wait_for_timeout(700)
    chk("form saves the UPI IDs",pg.evaluate("banks.find(b=>b.id==='B3').upi")=="new.id@okhdfc, other@ybl")
    chk("saved ID now matches that bank",q({"dir":"in","vpa":"other@ybl"})=="B3")
    chk("no page errors",not errs)
print("FAILS",f)

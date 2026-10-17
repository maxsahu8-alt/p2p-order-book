from playwright.sync_api import sync_playwright
import json,time
now=int(time.time()*1000);f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
L=lambda a:{"on":True,"app":"PhonePe","bal":a}
B=[{"id":"B2","kind":"bank","name":"Axis bank","accNo":"XXXX7410","type":"Bank","opening":5000,"time":now-9e8,"lite":L(900)},
{"id":"B1","kind":"bank","name":"Sbi bank","accNo":"XXXX4521","type":"Bank","opening":10000,"time":now-9e8,"lite":L(900)},
{"id":"B3","kind":"bank","name":"Hdfc bank","accNo":"XXXX1111","type":"Bank","opening":9000,"time":now-9e8}]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps([{"id":"S","kind":"setting"}]+B)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1000)
    H=lambda h:pg.evaluate("h=>{const b=ixLiteHint(h,'PhonePe');return b?b.id:null}",h)
    chk("no hint: old guess would pick Axis (first with balance)",pg.evaluate("ixLiteBank(67.96,'PhonePe').id")=="B2")
    chk("logo says SBI -> Sbi bank",H(["SBI"])=="B1")
    chk("State Bank of India -> Sbi bank",H(["State Bank of India"])=="B1")
    chk("Axis Bank -> Axis bank",H(["Axis Bank"])=="B2")
    chk("Powered by YES BANK is ignored",H(["YES BANK"]) is None)
    chk("bank without Lite (HDFC) is not picked",H(["HDFC Bank"]) is None)
    chk("empty hint gives nothing",H(["",None]) is None)
    chk("first useful hint wins",H(["YES BANK","SBI"])=="B1")
    TXT="Transaction Successful\nPaid to\nRohit Raj\nreetdhoni@axl\n₹67.96\nPhonePe Transaction ID\nT2610171212131305109256\nDebited from\nUPI Lite\nUTR: 518620073356\nPowered by\nUPI YES BANK"
    R=pg.evaluate("""t=>{const mk=(bank)=>{const P=payParse(t);
      const g={items:[],pays:[{pay:{...P,bank:bank||P.bank}}],order:null,aiPay:{...P,bank:bank||P.bank}};try{ixVerify(g)}catch(e){return {err:String(e.stack).slice(0,400)}};return {bank:g.X&&g.X.pay.bank,last4:g.pays[0].pay.last4,amb:!!g.liteAmbig,lite:g.X&&g.X.pay.lite}};
      return {sbi:mk("SBI"),none:mk("")}}""",TXT)
    print(R)
    chk("verify: SBI logo -> Sbi bank ••4521, not Axis",R["sbi"].get("bank")=="Sbi bank" and R["sbi"].get("last4")=="4521" and not R["sbi"].get("amb"))
    chk("verify: no logo -> warns which bank (ambiguous)",R["none"].get("amb") is True)
    chk("no page errors",not errs)
print("FAILS",f)

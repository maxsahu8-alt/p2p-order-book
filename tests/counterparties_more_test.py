from playwright.sync_api import sync_playwright
import json,time,base64,os
now=int(time.time()*1000);DAY=86400000
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
R=[{"id":"S","kind":"setting"},
 {"id":"p1","kind":"party","name":"Vinay Lalwani","time":now-9*DAY},
 {"id":"d1","kind":"pdue","party":"p1","amt":10000,"time":now-8*DAY},
 {"id":"pp1","kind":"ppay","party":"p1","amt":4000,"time":now-7*DAY}]
k=[0]
def od(cp,side="BUY",st="Completed",qty=100,rate=90,age=0,**kw):
    k[0]+=1;t=now-age*DAY-k[0]*1e5
    o={"id":"O%d"%k[0],"side":side,"coin":"USDT","qty":qty,"rate":rate,"status":st,"platform":"KuCoin","time":t,"mode":"P2P","cp":cp,"doneAt":t+600000};o.update(kw);R.append(o)
od("Vinay Lalwani",age=5);od("Vinay Lalwani",side="SELL",rate=95,age=3);od("Vinay Lalwani",qty=50,rate=90,age=0)
for i in range(3):od("Bad Guy",st="Cancelled",age=4+i)
od("Bad Guy",age=2)
for i in range(3):od("Shady Two",st="Cancelled",age=4+i)
od("Shady Two",age=2)
od("Big Fish",qty=6000,rate=90,age=10)
png=base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==")
open('/tmp/claude-0/-home-claude/9b72aef0-0d4a-55ae-b6d6-e1b833fc0685/scratchpad/t.png','wb').write(png)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(R)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1000)
    pg.evaluate("sheets.cps()");pg.wait_for_timeout(500)
    chk("concentration line shown",pg.evaluate("(()=>{const c=document.querySelector('#cpconc');return !c.hidden&&/Top 3 clients = \\d+%/.test(c.textContent)})()"))
    chk("Gold ring on Big Fish",pg.evaluate("[...document.querySelectorAll('#cpl .cprow')].some(r=>/Big Fish/.test(r.textContent)&&/#d4a017/i.test(r.querySelector('.cpav').getAttribute('style')))"))
    chk("block suggestion shown for both",pg.evaluate("document.querySelectorAll('#cpl .cpsug').length")==2)
    pg.click("[data-sugb='Bad Guy']");pg.wait_for_timeout(400)
    chk("accepting the suggestion blocks them",pg.evaluate("cpTag('Bad Guy')&&cpTag('Bad Guy').tag==='block'"))
    pg.click("[data-sugx='Shady Two']");pg.wait_for_timeout(400)
    chk("Not now hides the suggestion",pg.evaluate("document.querySelectorAll('#cpl .cpsug').length")==0)
    pg.click("#cpl [data-more='Vinay Lalwani']");pg.wait_for_timeout(100)
    pg.click("#cpl [data-rm='Vinay Lalwani']");pg.wait_for_timeout(500)
    chk("7-day reminder created",pg.evaluate("reminds.some(r=>/Follow up with Vinay Lalwani/.test(r.text)&&r.at>Date.now()+6*864e5)"))
    pg.click("#cpconc");pg.wait_for_timeout(400)
    chk("Top clients opens with rows",pg.evaluate("document.querySelectorAll('#tp-l .tpr').length")>=3)
    chk("Big Fish is first by volume",pg.evaluate("/Big Fish/.test(document.querySelector('#tp-l .tpr').textContent)"))
    pg.click("[data-met=profit]");pg.wait_for_timeout(150)
    chk("profit view switches",pg.evaluate("document.querySelector('[data-met=profit]').classList.contains('on')"))
    pg.click("[data-per=all]");pg.wait_for_timeout(150)
    pg.click("[data-tpback]");pg.wait_for_timeout(400)
    chk("Back returns to Counterparties",pg.evaluate("!!document.querySelector('#cpl')"))
    pg.click("#cpl [data-tr='Vinay Lalwani']");pg.wait_for_timeout(500)
    chk("khata balance shown",pg.evaluate("/Left to pay[\\s\\S]*6,000/.test(document.querySelector('.insw').innerText)&&!!document.querySelector('[data-sheet^=partyView]')"))
    pg.fill("#tr-rate","95");pg.fill("#tr-lo","12000");pg.fill("#tr-ld","8000");pg.click("#tr-ts");pg.wait_for_timeout(500)
    chk("terms saved",pg.evaluate("(()=>{const x=cpx('Vinay Lalwani');return x&&x.rate===95&&x.limOrd===12000&&x.limDay===8000})()"))
    pg.fill("#tr-lg","Appeal raised, solved in 2 days");pg.click("#tr-lga");pg.wait_for_timeout(500)
    chk("notes log entry added",pg.evaluate("/Appeal raised/.test(document.querySelector('.nlog').innerText)"))
    pg.click("[data-rmd='14']");pg.wait_for_timeout(400)
    chk("14-day reminder from profile",pg.evaluate("reminds.filter(r=>/Follow up with Vinay/.test(r.text)).length")>=2)
    pg.evaluate("uploadProofs=async()=>['blob_abc123']");pg.evaluate("assetsApi={upload:async()=>({id:'x'})}")
    pg.set_input_files("#tr-docf","/tmp/claude-0/-home-claude/9b72aef0-0d4a-55ae-b6d6-e1b833fc0685/scratchpad/t.png");pg.wait_for_timeout(700)
    chk("document attached and thumbnail shown",pg.evaluate("(cpx('Vinay Lalwani').proofs||[]).includes('blob_abc123')&&!!document.querySelector('.cpdocs [data-proof]')"))
    pg.click("[data-dx]");pg.click("[data-dx]");pg.wait_for_timeout(500)
    chk("document removed after two taps",pg.evaluate("(cpx('Vinay Lalwani').proofs||[]).length")==0)
    pg.click("[data-lgx]");pg.click("[data-lgx]");pg.wait_for_timeout(500)
    chk("notes entry removed after two taps",pg.evaluate("!/Appeal raised/.test(document.querySelector('.nlog').innerText)"))
    pg.click("#tr-rep");pg.wait_for_timeout(900)
    chk("Repeat last order fills the form with the special rate",pg.evaluate("document.querySelector('#f-cp').value==='Vinay Lalwani'&&+document.querySelector('#f-qty').value>0&&+document.querySelector('#f-rate').value===95"))
    # form behaviours
    pg.evaluate("endEdit(true)");pg.wait_for_timeout(200)
    def typ(cp):
        pg.evaluate("(c)=>{const e=document.querySelector('#f-cp');e.value=c;e.dispatchEvent(new Event('input'))}",cp);pg.wait_for_timeout(150)
    typ("Vinay Lalwani")
    chk("special rate auto-fills",pg.evaluate("+document.querySelector('#f-rate').value")==95)
    chk("Repeat chip appears",pg.evaluate("(()=>{const b=document.querySelector('#cpRep');return !b.hidden&&/Repeat last/.test(b.textContent)})()"))
    pg.click("#cpRep");pg.wait_for_timeout(500)
    chk("chip fills quantity",pg.evaluate("+document.querySelector('#f-qty').value")>0)
    pg.evaluate("endEdit(true)");typ("Vinay Lalwani")
    def amt(q,r):
        pg.evaluate("(a)=>{document.querySelector('#f-qty').value=a[0];document.querySelector('#f-rate').value=a[1];document.querySelector('#f-rate').dispatchEvent(new Event('input'))}",[q,r]);pg.wait_for_timeout(100)
        return pg.evaluate("(()=>{const w=document.querySelector('#cpWarn');return w.hidden?'':w.textContent})()")
    chk("per-order limit warns",("per-order limit" in amt("200","95")))
    chk("daily limit warns using today's orders",("daily limit" in amt("90","95")))
    chk("small order fine",("limit" not in amt("10","95")))
    # intake alert
    r=pg.evaluate("(()=>{const hi=[],me=[];ixCpRisk({target:{cp:'Bad Guy'},X:{pay:{amount:1000},ord:{}}},hi,me);const h2=[],m2=[];cpxSet('Shady Two',{labels:['Slow payer']});return[hi,me]})()")
    chk("intake flags blocked person",any("Blocked counterparty" in x for x in r[0]))
    pg.wait_for_timeout(300)
    r2=pg.evaluate("(()=>{const hi=[],me=[];ixCpRisk({target:{cp:'Shady Two'},X:{pay:{amount:1000},ord:{}}},hi,me);return[hi,me]})()")
    chk("intake flags slow payer and cancellations",any("Slow payer" in x for x in r2[1]) and any("cancelled" in x for x in r2[1]))
    r3=pg.evaluate("(()=>{const hi=[],me=[];ixCpRisk({target:{cp:'Vinay Lalwani'},X:{pay:{amount:20000},ord:{}}},hi,me);return[hi,me]})()")
    chk("intake flags limit breach",any("limit" in x for x in r3[1]))
    # csv tier
    pg.evaluate("sheets.cps()");pg.wait_for_timeout(400)
    pg.evaluate("window.__csv=null;saveFile=async(n,d)=>{window.__csv=[n,d]}");pg.click("#cpmeta [data-exp]");pg.wait_for_timeout(200)
    c=pg.evaluate("window.__csv")
    chk("CSV has Tier column with Gold",bool(c) and "Tier" in c[1] and "Gold" in c[1])
    chk("no page errors",not errs);print(errs)
print("FAILS",f)

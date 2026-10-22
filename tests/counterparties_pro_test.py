from playwright.sync_api import sync_playwright
import json,time
now=int(time.time()*1000);DAY=86400000
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
R=[{"id":"S","kind":"setting"}]
def od(i,cp,side="BUY",st="Completed",qty=100,rate=90,age=0,took=None,**kw):
    t=now-age*DAY-i*1e5
    o={"id":"O%d"%i,"side":side,"coin":"USDT","qty":qty,"rate":rate,"status":st,"platform":"KuCoin","time":t,"mode":"P2P","cp":cp}
    if took:o["doneAt"]=t+took*60000
    o.update(kw);R.append(o)
od(1,"Vinay Lalwani",side="BUY",qty=200,rate=90,age=5,took=12,vpa="vinay@okaxis")
od(2,"Vinay Lalwani",side="SELL",qty=100,rate=95,age=3,took=8,payer="Rahul Sharma")
od(3,"Vinay Lalwani",side="SELL",qty=100,rate=95,age=2,took=10,payer="Vinay Lalwani")
od(4,"Old Client",side="SELL",qty=50,rate=95,age=60,took=30)
od(5,"Nitin Viju",qty=10,age=1);od(6,"Nitin Viju K",qty=10,age=1)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(R)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1000)
    pg.evaluate("sheets.cps()");pg.wait_for_timeout(400)
    chk("duplicate banner shown",pg.evaluate("!!document.querySelector('[data-dup]')"))
    chk("Idle tab counts the 60-day-old client",pg.evaluate("document.querySelector('#cpf [data-f=idle] i').textContent")=="1")
    chk("score shown on rows",pg.evaluate("[...document.querySelectorAll('#cpl .cps')].some(e=>/Score \\d+/.test(e.textContent))"))
    chk("profit shown for Vinay",pg.evaluate("[...document.querySelectorAll('#cpl .cprow')].some(r=>/Vinay/.test(r.textContent)&&/profit/.test(r.textContent))"))
    chk("avg completion time on row",pg.evaluate("/min avg/.test(document.querySelector('#cpl').textContent)"))
    chk("last seen on row",pg.evaluate("/2mo ago|60d|2mo/.test(document.querySelector('#cpl').textContent)||/ago|today|yesterday/.test(document.querySelector('#cpl').textContent)"))
    # sort cycle reaches Best customers
    for _ in range(2):pg.click("#cpmeta [data-sort]")
    chk("sort has Best customers",pg.evaluate("/Best customers/.test(document.querySelector('#cpmeta').textContent)"))
    chk("Best customers puts Vinay first",pg.evaluate("/Vinay/.test(document.querySelector('#cpl .cpn').textContent)"))
    pg.click("#cpf [data-f=idle]");pg.wait_for_timeout(100)
    chk("Idle filter lists Old Client only",pg.evaluate("[...document.querySelectorAll('#cpl .cpn')].map(e=>e.textContent).join('|')")=="Old Client")
    pg.click("#cpf [data-f=all]")
    # CSV export
    pg.evaluate("window.__csv=null;saveFile=async(n,d)=>{window.__csv=[n,d]}")
    pg.click("#cpmeta [data-exp]");pg.wait_for_timeout(200)
    csv=pg.evaluate("window.__csv")
    chk("export gives a CSV with header and rows",bool(csv) and csv[0].endswith(".csv") and "Trust score" in csv[1] and "Vinay Lalwani" in csv[1])
    # 360
    pg.click("#cpl [data-tr='Vinay Lalwani']");pg.wait_for_timeout(500)
    txt=pg.evaluate("document.querySelector('.insw').innerText")
    chk("360 shows Avg time",bool(__import__('re').search(r"AVG TIME\s*\n?\s*\d+(\.\d)? ?min",txt,__import__('re').I)))
    chk("360 shows Profit and Last order",("PROFIT" in txt.upper()) and ("LAST ORDER" in txt.upper()))
    chk("known UPI listed",pg.evaluate("/vinay@okaxis/.test(document.querySelector('.insw').innerText)"))
    chk("third-party payer flagged, same-name payer fine",pg.evaluate("(()=>{const t=document.querySelector('.insw').innerText;return /Rahul Sharma[\\s\\S]*THIRD PARTY/i.test(t)&&/Vinay Lalwani[\\s\\S]*SAME NAME/i.test(t)})()"))
    pg.click("[data-lb='Slow payer']");pg.wait_for_timeout(400)
    chk("label toggles on",pg.evaluate("document.querySelector(\"[data-lb='Slow payer']\").classList.contains('on')"))
    pg.fill("#tr-lbin","Daily client");pg.click("#tr-lbadd");pg.wait_for_timeout(400)
    chk("custom label added",pg.evaluate("!!document.querySelector(\"[data-lb='Daily client'].on\")"))
    pg.fill("#tr-ph","98765 43210");pg.fill("#tr-tg","@vinay_l");pg.click("#tr-cs");pg.wait_for_timeout(500)
    chk("Call link uses +91 number",pg.evaluate("(()=>{const a=[...document.querySelectorAll('.cpexp a')].map(x=>x.getAttribute('href'));return a.includes('tel:+919876543210')&&a.includes('https://wa.me/919876543210')&&a.includes('https://t.me/vinay_l')})()"))
    pg.evaluate("window.__csv=null;saveFile=async(n,d)=>{window.__csv=[n,d]}")
    pg.click("#tr-csv");pg.wait_for_timeout(200)
    c2=pg.evaluate("window.__csv")
    chk("person CSV has their orders only",bool(c2) and c2[1].count("Vinay Lalwani")>=3 and "Old Client" not in c2[1] and "Rahul Sharma" in c2[1])
    chk("statement text built",pg.evaluate("/Statement: Vinay Lalwani/.test(cpStatement('Vinay Lalwani'))"))
    pg.click("#tr-back");pg.wait_for_timeout(400)
    chk("labels show on the list row",pg.evaluate("[...document.querySelectorAll('#cpl .cprow')].some(r=>/Vinay/.test(r.textContent)&&r.querySelector('.cplb i.w'))"))
    pg.fill("#cpq","daily");pg.wait_for_timeout(150)
    chk("search finds by label",pg.evaluate("document.querySelectorAll('#cpl .cprow').length")==1)
    pg.evaluate("closeSheet()");pg.wait_for_timeout(200)
    # known payer no longer a mismatch
    chk("repeat payer counts as a name match",pg.evaluate("verName('Rahul Sharma','Vinay Lalwani')")=="M")
    chk("unknown payer still mismatches",pg.evaluate("verName('Random Person','Vinay Lalwani')")!="M")
    # new-order amount warnings
    pg.evaluate("goPage&&0")
    def amt(cp,q,r):
        pg.evaluate("(a)=>{document.querySelector('#f-cp').value=a[0];document.querySelector('#f-qty').value=a[1];document.querySelector('#f-rate').value=a[2];document.querySelector('#f-rate').dispatchEvent(new Event('input'))}",[cp,q,r])
        return pg.evaluate("(()=>{const w=document.querySelector('#cpWarn');return w.hidden?'':w.textContent})()")
    t1=amt("Brand New Person","1000","95")
    chk("big first deal warns",("large amount" in t1))
    t2=amt("Brand New Person","10","95")
    chk("small first deal does not warn",("large amount" not in t2))
    t3=amt("Vinay Lalwani","1500","95")
    chk("much bigger than usual warns",("much bigger" in t3))
    chk("label shows in the order form",("Slow payer" in t3))
    t4=amt("Vinay Lalwani","100","95")
    chk("usual size does not warn about amount",("much bigger" not in t4))
    chk("no page errors",not errs);print(errs)
print("FAILS",f)

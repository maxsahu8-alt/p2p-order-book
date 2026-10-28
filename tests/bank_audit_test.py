from playwright.sync_api import sync_playwright
import json,time
now=int(time.time()*1000);f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
B=[{"id":"B1","kind":"bank","name":"Axis bank","accNo":"XXXX7410","type":"Bank","opening":10000,"time":now-9e8,"lite":{"on":True,"app":"Google Pay","bal":500}},
   {"id":"B2","kind":"bank","name":"Sbi bank","accNo":"XXXX4521","type":"Bank","opening":5000,"time":now-9e8}]
O=[{"id":"o1","side":"BUY","coin":"USDT","qty":2,"rate":100,"status":"Completed","pay":"UPI","time":now-5e5,"cp":"A","splits":[{"bank":"B1","amt":200,"method":"UPI","lite":True}]},
   {"id":"o2","side":"BUY","coin":"USDT","qty":3,"rate":100,"status":"Completed","pay":"UPI","time":now-4e5,"cp":"B","splits":[]},
   {"id":"o3","side":"BUY","coin":"USDT","qty":5,"rate":100,"status":"Completed","pay":"UPI","time":now-3e5,"cp":"C","splits":[{"bank":"B2","amt":500,"method":"UPI"}]},
   {"id":"o4","side":"BUY","coin":"USDT","qty":4,"rate":100,"status":"Completed","pay":"UPI","time":now-2e5,"cp":"D","splits":[{"bank":"B2","amt":100,"method":"UPI"}]}]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={"width":400,"height":860});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps([{"id":"S","kind":"setting"}]+B+O)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1200)
    bal=lambda:pg.evaluate("()=>balances().bal")
    b0=bal()
    chk("before: Lite payment does not touch the bank",b0["B1"]==10000)
    pg.evaluate("sheets.bankaudit()");pg.wait_for_timeout(400)
    t=pg.evaluate("document.querySelector('.baw').innerText")
    chk("audit lists no-bank order",pg.evaluate("[...document.querySelectorAll('.baor')].some(e=>/No bank/.test(e.innerText))"))
    chk("audit lists part not assigned",pg.evaluate("[...document.querySelectorAll('.baor')].some(e=>/Part not assigned/.test(e.innerText))"))
    chk("audit lists the UPI Lite order",pg.evaluate("[...document.querySelectorAll('.baor')].some(e=>/UPI Lite/.test(e.innerText))"))
    chk("fully assigned order is not listed",pg.evaluate("![...document.querySelectorAll('.baor')].some(e=>e.dataset.id==='o3')"))
    chk("preview shows Axis balance change",pg.evaluate("/Axis bank/.test(document.querySelector('#ba-prev').innerText)"))
    # switch on
    pg.evaluate("document.querySelector('#ba-direct').click()");pg.wait_for_timeout(700)
    b1=bal()
    chk("switch on: Lite payment now reduces Axis by 200",round(b0["B1"]-b1["B1"])==200)
    chk("switch on: other banks unchanged",b1["B2"]==b0["B2"])
    chk("net worth ignores the separate Lite balance",pg.evaluate("ACC().netWorth")>0)
    # bulk fix
    pg.evaluate("sheets.bankaudit()");pg.wait_for_timeout(400)
    pg.evaluate("const s=document.querySelector('#ba-bk');s.value='B2';s.dispatchEvent(new Event('change'))");pg.wait_for_timeout(100)
    pg.evaluate("document.querySelector('#ba-all').click()");pg.wait_for_timeout(200)
    chk("bulk needs a second tap",pg.evaluate("orders.find(o=>o.id==='o2').splits.length===0"))
    pg.evaluate("document.querySelector('#ba-all').click()");pg.wait_for_timeout(900)
    chk("no-bank order now has the chosen bank",pg.evaluate("(()=>{const s=orders.find(o=>o.id==='o2').splits;return s.length===1&&s[0].bank==='B2'&&s[0].amt===300})()"))
    chk("gap order got the missing part only",pg.evaluate("(()=>{const o=orders.find(o=>o.id==='o4');return o.splits.length===2&&Math.round(allocated(o))===400&&o.splits[0].amt===100})()"))
    chk("already assigned order untouched",pg.evaluate("orders.find(o=>o.id==='o3').splits.length===1"))
    chk("Lite order keeps its own bank",pg.evaluate("orders.find(o=>o.id==='o1').splits[0].bank==='B1'"))
    chk("no page errors",not errs)
print("FAILS",f)

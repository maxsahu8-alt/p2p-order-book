from playwright.sync_api import sync_playwright
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
JS="""([ai,ph,alts,fiat])=>{const mk=(amount,al)=>({status:'SUCCESS',amount,currency:'INR',sender:null,receiver:'MOCHI RAM MAHATO',utr:'083402396639',method:'UPI',bank:'SBI',date:'2026-10-18',time:'09:09',acct:'••2594',conf:.9,dir:'out',last4:'2594',ok:true,amountAlts:al||null});
 const g={items:[],pays:[{pay:mk(ph,alts)}],order:{ord:{id:'6ad43ca925c578000104144e',status:'Completed',buyer:null,seller:'MOCHI RAM MAHATO',fiat,crypto:52.262876,coin:'USDT',price:97.26,method:null,when:'2026-10-18 08:57',acct:null,conf:.9,side:'BUY'}},aiPay:ai===null?null:mk(ai)};
 try{ixVerify(g)}catch(e){return {err:String(e.stack).slice(0,300)}};return {amt:g.X.pay.amount,fixed:!!g.X.pay.amountFixed,read:g.X.pay.amountRead||null}}"""
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(900)
    r=pg.evaluate(JS,[75083,5083.09,None,5083.09]);print(r)
    chk("AI says 75,083, phone read 5,083.09 -> 5,083.09",r.get("amt")==5083.09 and r.get("fixed"))
    r=pg.evaluate(JS,[75083,75083,None,5083.09]);print(r)
    chk("both read 75,083 -> first digit cut -> 5,083",r.get("amt")==5083 and r.get("fixed"))
    r=pg.evaluate(JS,[5083.09,5083.09,None,5083.09]);print(r)
    chk("a correct amount is left alone",r.get("amt")==5083.09 and not r.get("fixed"))
    r=pg.evaluate(JS,[73207.21,73207.21,None,5083.09]);print(r)
    chk("a real different amount (no 7-cut fits) is not changed",r.get("amt")==73207.21 and not r.get("fixed"))
    r=pg.evaluate(JS,[None,75083,[5083.09],5083.09]);print(r)
    chk("no AI: phone alternatives are used",r.get("amt") in (5083.09,5083))
    chk("no page errors",not errs)
print("FAILS",f)

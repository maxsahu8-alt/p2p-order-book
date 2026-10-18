from playwright.sync_api import sync_playwright
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(timezone_id="Asia/Kolkata");pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(900)
    TS="new Date('2026-10-18T08:57:37+05:30').getTime()"
    fx=lambda i:pg.evaluate("i=>ixIdFix(i,%s)"%TS,i)
    chk("your real case: Bad43ca925c578000104144e -> 6ad43ca925c578000104144e",fx("Bad43ca925c578000104144e")=="6ad43ca925c578000104144e")
    chk("correct number stays as it is",fx("6ad43ca925c578000104144e")=="6ad43ca925c578000104144e")
    chk("capital letters of a correct number are lowered",fx("6AD43CA925C578000104144E")=="6ad43ca925c578000104144e")
    chk("zero read as O in the tail",fx("6ad43ca925c57800O104144e")=="6ad43ca925c578000104144e")
    chk("two wrong characters at the start",fx("Bad4Bca925c578000104144e")=="6ad43ca925c578000104144e" or fx("Bad4Bca925c578000104144e")=="6ad43ca925c578000104144e")
    chk("unfixable start is left alone",fx("Xad43ca925c578000104144e")=="Xad43ca925c578000104144e")
    chk("19-digit Binance number is untouched",fx("1234567890123456789")=="1234567890123456789")
    chk("no creation time: unchanged",pg.evaluate("ixIdFix('Bad43ca925c578000104144e',0)")=="Bad43ca925c578000104144e")
    D=lambda i:pg.evaluate("i=>ixIdDoubt(i,%s)"%TS,i)
    chk("good number is not doubtful",D("6ad43ca925c578000104144e") is False)
    chk("number with a bad start is doubtful",D("Xad43ca925c578000104144e") is True)
    chk("19-digit number is not doubtful",D("1234567890123456789") is False)
    # whole parse: the order text of your screenshot
    T="Buy USDT\nTotal Amount 5,083.09 INR\nUSDT Price 97.26 INR\nAmount 52.262876 USDT\nCounterparty MOCHI RAM MAHATO(man***@gmail.com)\nOrder Number Bad43ca925c5780001041\n44e\nCreated At 10/18/2026 08:57:37\n"
    r=pg.evaluate("t=>{const o=ixOrdFrom(t,0.9);return {id:o.id,when:o.when}}",T)
    print(r)
    chk("order parse gives the fixed number",r["id"]=="6ad43ca925c578000104144e")
    # zoom: image with a label and a number, reader is replaced by a mock
    Z=pg.evaluate("""async()=>{const c=document.createElement('canvas');c.width=720;c.height=400;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,720,400);g.fillStyle='#000';g.font='28px sans-serif';g.fillText('Order Number',40,200);g.fillText('Xad43ca925c5780001041',280,200);g.fillText('44e',280,240);
      const blob=await new Promise(r=>c.toBlob(r,'image/png'));let seen=null;ixZoomReadBlob=async b=>{const bm=await createImageBitmap(b);seen=[bm.width,bm.height];return '6ad43ca925c5780001041\\n44e'};
      const it={file:blob,ocr:{lines:[['Order Number',40,175,230,210],['Xad43ca925c5780001041',280,175,640,210],['44e',280,215,340,250]]},ord:{id:'Xad43ca925c578000104144e',when:'2026-10-18 08:57'}};
      await ixZoomIds([it]);return {id:it.ord.id,zoom:!!it.ord.idZoom,seen}}""")
    print(Z)
    chk("zoomed picture was cut out and enlarged",Z["seen"] and Z["seen"][0]>=900)
    chk("doubtful number replaced by the zoom reading",Z["id"]=="6ad43ca925c578000104144e" and Z["zoom"])
    N=pg.evaluate("""async()=>{const c=document.createElement('canvas');c.width=300;c.height=100;const blob=await new Promise(r=>c.toBlob(r,'image/png'));let called=0;ixZoomReadBlob=async()=>{called++;return ''};
      const it={file:blob,ocr:{lines:[]},ord:{id:'6ad43ca925c578000104144e',when:'2026-10-18 08:57'}};await ixZoomIds([it]);return {called,id:it.ord.id}}""")
    chk("a good number is never re-read",N["called"]==0 and N["id"]=="6ad43ca925c578000104144e")
    chk("no page errors",not errs)
print("FAILS",f)

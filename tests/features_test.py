from playwright.sync_api import sync_playwright
import json,os,time
APP=os.environ.get("APP_FILE","/home/claude/p2p-tracker.html")
now=int(time.time()*1000)
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
R=[{"id":"S","kind":"setting"},
 {"id":"O1","side":"BUY","coin":"USDT","qty":100,"rate":90,"status":"Completed","platform":"KuCoin","time":now-1e6,"mode":"P2P","cp":"Vinay Lalwani","doneAt":now-4e5},
 {"id":"B1","kind":"bank","name":"HDFC","accNo":"1234","type":"Savings","opening":1000,"status":"Active","lite":{"on":True,"app":"PhonePe","bal":200}},
 {"id":"cp_vinaylalwani","kind":"cptag","name":"Vinay Lalwani","tag":"block","note":"","time":now}]
def page(p,off=None,**kw):
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':900},**kw);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(R)))
    if off is not None:
        pg.add_init_script("localStorage.setItem('p2p_feat_off',%s)"%json.dumps(json.dumps(off)))
    pg.goto('file://'+APP);pg.wait_for_timeout(1200)
    return b,pg,errs
with sync_playwright() as p:
    # ---------- open mode: nothing hidden
    b,pg,errs=page(p)
    chk("open mode: every part is on",pg.evaluate("FEATURES.every(f=>feat(f.k))")and pg.evaluate("window.__featOff.length")==0)
    pg.evaluate("sheets.cps()");pg.wait_for_timeout(300)
    chk("open mode: counterparties opens",pg.evaluate("!!document.querySelector('#cpl')"))
    chk("modules registered the same list of parts",pg.evaluate("FEATURES.length")>=12)
    b.close()
    # ---------- parts switched off
    b,pg,errs=page(p,["counterparties","lite","ai","direct","market"])
    chk("off list applied",pg.evaluate("window.__featOff.sort().join()")=="ai,counterparties,direct,lite,market")
    pg.evaluate("sheets.cps()");pg.wait_for_timeout(300)
    chk("a screen of an off part shows the reason, not the screen",pg.evaluate("!document.querySelector('#cpl')&&/switched off/.test(document.querySelector('#sheetBody').innerText)"))
    pg.evaluate("closeSheet()")
    chk("AI button is hidden",pg.evaluate("getComputedStyle(document.querySelector('#aiFab')).display")=="none")
    pg.evaluate("goPage('direct')");pg.wait_for_timeout(300)
    chk("a page of an off part sends you home",pg.evaluate("document.querySelector('#p-home').hidden")==False and pg.evaluate("document.querySelector('#p-direct').hidden")==True)
    pg.evaluate("closeSheet()")
    chk("bottom tab of an off page is hidden",pg.evaluate("(()=>{const t=document.querySelector('.tabs button[data-tab=direct]');return !t||getComputedStyle(t).display==='none'})()"))
    pg.evaluate("openDrawer()");pg.wait_for_timeout(500)
    chk("menu has no entries for off parts",pg.evaluate("!document.querySelector('#dAll [data-sheet=cps]')&&!document.querySelector('#dAll [data-go=direct]')&&!document.querySelector('#dAll [data-go=ai]')"))
    chk("menu groups with nothing left are gone",pg.evaluate("[...document.querySelectorAll('#dAll .dgrp')].every(g=>g.querySelector('.dri'))"))
    pg.evaluate("document.querySelector('#drawer').hidden=true")
    chk("counterparty warnings are off (blocked person, no warning)",pg.evaluate("(()=>{const e=document.querySelector('#f-cp');e.value='Vinay Lalwani';e.dispatchEvent(new Event('input'));return document.querySelector('#cpWarn').hidden})()"))
    chk("intake alert is off too",pg.evaluate("(()=>{const hi=[],me=[];ixCpRisk({target:{cp:'Vinay Lalwani'},X:{pay:{amount:1},ord:{}}},hi,me);return hi.length+me.length})()")==0)
    chk("Lite helpers see no Lite bank",pg.evaluate("liteBanks().length")==0 and pg.evaluate("ixLiteBank(10,'')")==None)
    pg.evaluate("sheets.bank('B1')");pg.wait_for_timeout(300)
    chk("bank sheet hides the Lite section",pg.evaluate("[...document.querySelectorAll('#sheetBody [data-feat=lite]')].length>0&&[...document.querySelectorAll('#sheetBody [data-feat=lite]')].every(e=>getComputedStyle(e).display==='none')"))
    chk("no page errors",not errs);b.close()
    # ---------- the switches screen
    b,pg,errs=page(p)
    pg.evaluate("sheets.features()");pg.wait_for_timeout(300)
    chk("switch list has every part",pg.evaluate("document.querySelectorAll('[data-fk]').length")==pg.evaluate("FEATURES.length"))
    pg.evaluate("document.querySelector('[data-fk=ai]').click()")
    pg.click("#fs-save");pg.wait_for_timeout(2500)
    chk("switching a part off and restarting turns it off",pg.evaluate("feat('ai')")==False and pg.evaluate("feat('counterparties')")==True)
    chk("no page errors (switch screen)",not errs);b.close()
    # ---------- licence codes
    b,pg,errs=page(p)
    pg.evaluate("sheets.features()");pg.wait_for_timeout(300)
    chk("owner tools offered while the build is open",pg.evaluate("!!document.querySelector('#fo-gen')"))
    pg.click("#fo-gen");pg.wait_for_timeout(800)
    chk("signing keys made on the phone",pg.evaluate("!!localStorage.getItem('p2p_lic_priv')&&!!document.querySelector('#fo-pub')"))
    pg.fill("#fo-name","Ravi Traders");pg.select_option("#fo-plan","pro");pg.click("#fo-make");pg.wait_for_timeout(800)
    code=pg.evaluate("document.querySelector('#fo-out').value")
    chk("a code is made",code.startswith("PX1.") and code.count(".")==2)
    # enforce: put the public key into the app (as the owner would have it built in)
    R_=pg.evaluate("""async(code)=>{
      LIC_PUB=localStorage.getItem('p2p_lic_pub');const out={};
      featLoad();out.ownerAll=FEATURES.every(f=>feat(f.k));
      const ownerCode=await licSign({v:1,n:'Ravi',f:['counterparties','intake'],exp:''});
      const expired=await licSign({v:1,n:'Old',f:'*',exp:'2020-01-01'});
      // a customer phone: no private key
      const priv=localStorage.getItem('p2p_lic_priv'),pub=localStorage.getItem('p2p_lic_pub');
      localStorage.removeItem('p2p_lic_priv');localStorage.removeItem('p2p_lic_pub');localStorage.removeItem('p2p_lic_ok');featLoad();
      out.noLicence=[feat('counterparties'),feat('ai')];
      out.proCode=(await licVerify(code)).ok;
      out.good=(await licActivate(ownerCode)).ok;out.afterGood=[feat('counterparties'),feat('intake'),feat('ai'),feat('lite')];
      const e=await licVerify(expired);out.expired=[e.ok,e.why];
      const parts=ownerCode.split('.');out.tampered=(await licVerify(parts[0]+'.'+parts[1].slice(0,-2)+'AA.'+parts[2])).ok;
      out.garbage=(await licVerify('hello')).ok;
      // a customer who makes their own keys must not become the owner
      await licGenKeys();out.selfOwner=FS.owner;out.afterSelf=[feat('ai')];
      // a code from someone else's keys
      const k2=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign']);
      const body=b64u.enc(licText(JSON.stringify({v:1,n:'X',f:'*',exp:''})));
      const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},k2.privateKey,licText('PX1.'+body));
      out.foreign=(await licVerify('PX1.'+body+'.'+b64u.enc(new Uint8Array(sig)))).ok;
      localStorage.removeItem('p2p_lic_priv');localStorage.removeItem('p2p_lic_pub');featLoad();
      return out}""",code)
    chk("owner phone: every part works",R_["ownerAll"])
    chk("customer without a licence: optional parts locked",R_["noLicence"]==[False,False])
    chk("a Pro code made in the app verifies",R_["proCode"])
    chk("a valid code unlocks exactly what it lists",R_["good"] and R_["afterGood"]==[True,True,False,False])
    chk("an ended licence is refused with the date",R_["expired"][0]==False and "2020-01-01" in R_["expired"][1])
    chk("a tampered code is refused",R_["tampered"]==False)
    chk("garbage is refused",R_["garbage"]==False)
    chk("making your own keys does not make you the owner",R_["selfOwner"]==False and R_["afterSelf"]==[False])
    chk("a code signed by someone else's key is refused",R_["foreign"]==False)
    # locked screen text for an unlicensed part
    pg.evaluate("localStorage.removeItem('p2p_lic_ok');featLoad();featApply();sheets.cps()");pg.wait_for_timeout(300)
    chk("locked screen says it is not in the licence",pg.evaluate("/not included in your licence/.test(document.querySelector('#sheetBody').innerText)"))
    chk("no page errors (licences)",not errs);b.close()
print("FAILS",f)

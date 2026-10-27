// ================= NIGHT ORDER ALARM (Android app) =================
// The phone app listens to KuCoin notifications only and rings a loud alarm for a new BUY or SELL order until you tap "Dekh liya".
// Only the TYPE and TIME of a notification is kept. Names and chat messages are never read or saved.
const NA=()=>{try{return window.P2PNative&&typeof P2PNative.naGet==="function"?P2PNative:null}catch(e){return null}};
function naRead(){const n=NA();if(!n)return null;try{return JSON.parse(n.naGet())}catch(e){return null}}
function naLogRead(){const n=NA();if(!n)return[];try{const a=JSON.parse(n.naLog());return Array.isArray(a)?a:[]}catch(e){return[]}}
function naSet(o){const n=NA();if(n)try{n.naSet(JSON.stringify(o))}catch(e){}}
const naHM=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const naMin=s=>{const p=String(s||"").split(":");return Math.max(0,Math.min(1439,(+p[0]||0)*60+(+p[1]||0)))};
// summary of the notifications since a time, against the orders written in the app since then (a rough count, not an exact match)
function naSummary(log,ords,since){
  const L=(log||[]).filter(x=>x&&x.t>=since&&x.k!=="TEST");
  const c={BUY:0,SELL:0,DONE:0};L.forEach(x=>{if(c[x.k]!=null)c[x.k]++});
  const made=(ords||[]).filter(o=>(+o.time||0)>=since).length;
  const orderN=c.BUY+c.SELL;
  return{buy:c.BUY,sell:c.SELL,done:c.DONE,made,orderN,missing:Math.max(0,orderN-made)};
}
sheets.nalarm=function(){
  const n=NA(),s=naRead();
  if(!n||!s){openSheet(`<div class="insw"><h3>Night order alarm</h3><p class="note">Ye alarm sirf Android app me chalta hai. Latest APK install karo, phir yahan aao.</p><div class="cpexp"><button type="button" class="mini ghost" data-close>Close</button></div></div>`);return}
  const tg=(k,t,d,on)=>`<div class="dqr fsr"><span><b>${esc(t)}</b><small>${esc(d)}</small></span><label class="tog"><input type="checkbox" data-na="${k}" ${on?"checked":""}><span></span></label></div>`;
  const opt=(arr,v,f)=>arr.map(x=>`<option value="${x}" ${x==v?"selected":""}>${f(x)}</option>`).join("");
  const since=Date.now()-12*3600000,sm=naSummary(naLogRead(),orders,since);
  const snz=s.snoozeUntil>Date.now();
  const step=(ok,t,d,id,b)=>`<div class="dqr fsr"><span><b>${ok?"✅":"⬜"} ${esc(t)}</b><small>${esc(d)}</small></span><button type="button" class="mini ghost" id="${id}">${b}</button></div>`;
  openSheet(`<div class="insw"><h3>Night order alarm</h3>
   <p class="note">KuCoin ka naya order aate hi tez alarm bajega, jab tak "Dekh liya" na dabao. Sirf notification ka type aur time yaad rehta hai, naam ya chat nahi padhi jaati.</p>
   <div class="pcsec">Setup (ek baar)</div><div class="rml">
    ${step(s.access,"Notification access","Pexai ko KuCoin ki notification dekhne do","na-acc",s.access?"Check":"Open")}
    ${step(false,"Battery: Unrestricted","Warna phone raat me app band kar dega","na-bat","Open")}
    ${step(false,"Do Not Disturb: Alarms allowed","Silent/DND me bhi alarm bajega","na-dnd","Open")}
   </div>
   <div class="pcsec">Alarm</div><div class="rml">
    ${tg("on","Night order alarm ON","Master switch",s.on)}
    ${tg("buy","BUY order","Payment karna hai: har baar tez alarm",s.buy)}
    ${tg("sell","SELL order","Buyer pay kar raha hai: alarm",s.sell)}
    ${tg("loud","Awaaz apne aap full","Alarm volume max ho jata hai",s.loud)}
    ${tg("allday","24 ghante","Band karo to sirf neeche ka time",s.allday)}
   </div>
   <div class="tgf" id="na-win" ${s.allday?"hidden":""}><span class="note">Time:</span><input type="time" id="na-from" value="${naHM(s.from)}"><span class="note">se</span><input type="time" id="na-to" value="${naHM(s.to)}"></div>
   <div class="cpterms">
    <label class="note">BUY alarm har <select id="na-be">${opt([30,60,120,180],s.buyEvery,x=>x+" sec")}</select></label>
    <label class="note">SELL alarm har <select id="na-se">${opt([60,120,180,300],s.sellEvery,x=>x+" sec")}</select></label>
    <label class="note">Maximum <select id="na-mx">${opt([10,20,30,60],s.maxMin,x=>x+" min")}</select></label></div>
   <div class="cpexp"><button type="button" class="primary" id="na-test">Test alarm</button><button type="button" class="mini ghost" id="na-ack">Dekh liya (band karo)</button><button type="button" class="mini ghost" id="na-snz">${snz?"Snooze hatao":"1 ghanta snooze"}</button></div>
   <p class="note" id="na-msg" style="margin:6px 0"></p>
   <div class="pcsec">Pichle 12 ghante</div>
   <p class="note">Notification: <b>${sm.buy}</b> BUY, <b>${sm.sell}</b> SELL, <b>${sm.done}</b> complete. App me <b>${sm.made}</b> order daale.${sm.missing?` <span class="warnline">Shayad ${sm.missing} order app me nahi daala. Check karo.</span>`:""}</p>
   <p class="note">Ye andaza hai. Notification ka time order ke asli time se alag ho sakta hai.</p>
   <div class="cpexp"><button type="button" class="mini ghost" id="na-clr">Log saaf karo</button><button type="button" class="mini ghost" data-close>Close</button></div></div>`,el=>{
    const q=x=>el.querySelector(x),msg=t=>{q("#na-msg").textContent=t};
    el.querySelectorAll("[data-na]").forEach(c=>c.onchange=()=>{
      const k=c.dataset.na;if(k==="on"&&c.checked&&!naRead().access){c.checked=false;msg("Pehle Notification access do (Setup ka step 1).");return}
      naSet({[k]:c.checked});if(k==="allday")q("#na-win").hidden=c.checked;toast(c.checked?"ON":"OFF")});
    q("#na-from").onchange=q("#na-to").onchange=()=>naSet({from:naMin(q("#na-from").value),to:naMin(q("#na-to").value)});
    q("#na-be").onchange=()=>naSet({buyEvery:+q("#na-be").value});
    q("#na-se").onchange=()=>naSet({sellEvery:+q("#na-se").value});
    q("#na-mx").onchange=()=>naSet({maxMin:+q("#na-mx").value});
    q("#na-acc").onclick=()=>{if(naRead().access){msg("Notification access mil gaya hai.");return}n.naOpenAccess();msg("List me Pexai dhundo aur ON karo, phir wapas aao.")};
    q("#na-bat").onclick=()=>{n.naOpenBattery();msg("Battery > Unrestricted chuno.")};
    q("#na-dnd").onclick=()=>{n.naOpenDnd();msg("Alarms ko allow rakho.")};
    q("#na-test").onclick=()=>{const s2=naRead();if(!s2.access){msg("Pehle Notification access do.");return}
      if(!s2.on){naSet({on:true});q("[data-na=on]").checked=true}
      msg(n.naTest()?"Alarm baj raha hai. Band karne ko 'Dekh liya' dabao.":"Alarm service abhi chalu nahi hai. Access ON karke app dobara kholo.")};
    q("#na-ack").onclick=()=>{n.naAck();msg("Alarm band.")};
    q("#na-snz").onclick=()=>{const on=naRead().snoozeUntil>Date.now();naSet({snoozeUntil:on?0:Date.now()+3600000});q("#na-snz").textContent=on?"1 ghanta snooze":"Snooze hatao";msg(on?"Snooze hata diya.":"1 ghante tak alarm nahi bajega.")};
    q("#na-clr").onclick=()=>{n.naClearLog();msg("Log saaf.")}});
};

// compact card at the top of the menu: status and an ON/OFF switch, always one tap away
function nalCard(){
  if(!NA()||!feat("nightalarm"))return"";const s=naRead();if(!s)return"";
  const snz=s.snoozeUntil>Date.now();
  const sub=!s.access?"Setup baaki: Notification access do":s.ringing?"Alarm baj raha hai":!s.on?"Band hai":snz?"Snooze me":"ON · BUY"+(s.sell?" + SELL":"")+" · "+(s.allday?"24 ghante":naHM(s.from)+"–"+naHM(s.to));
  return`<div class="nalc ${s.on&&s.access?"on":""}"><button type="button" class="nalb" id="nalOpen"><span class="nali">🔔</span><span><b>Night order alarm</b><small>${esc(sub)}</small></span></button>${s.ringing?'<button type="button" class="mini primary" id="nalAck">Dekh liya</button>':`<label class="tog"><input type="checkbox" id="nalTog" ${s.on&&s.access?"checked":""}><span></span></label>`}</div>`}
function nalBind(close){
  const n=NA();if(!n)return;
  const o=document.querySelector("#nalOpen");if(o)o.onclick=()=>{close();sheets.nalarm()};
  const a=document.querySelector("#nalAck");if(a)a.onclick=()=>{n.naAck();openDrawer()};
  const t=document.querySelector("#nalTog");if(t)t.onchange=()=>{
    if(t.checked&&!naRead().access){t.checked=false;toast("Pehle Notification access do");close();sheets.nalarm();return}
    naSet({on:t.checked});toast(t.checked?"Night alarm ON":"Night alarm OFF");openDrawer()}}

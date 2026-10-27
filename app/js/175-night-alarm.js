// ================= NIGHT ORDER ALARM (Android app) =================
// The phone app listens to KuCoin notifications only and rings a loud alarm for a new BUY or SELL order until you tap "Seen".
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
const NA_BELL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
function naAgo(t){if(!t)return"";const m=Math.round((Date.now()-t)/60000);return m<1?tr("just now","abhi abhi"):m<60?m+tr(" min ago"," min pehle"):m<1440?Math.round(m/60)+tr(" h ago"," ghante pehle"):Math.round(m/1440)+tr(" d ago"," din pehle")}
const NA_K={BUY:"BUY",SELL:"SELL",DONE:"Complete",TEST:"Test",CHAT:"Chat",OTHER:"Other"};
// the state shown at the top of the screen
function naState(s){
  if(!s.ver)return{c:"warn",t:tr("Old APK installed","Purana APK laga hai"),d:tr("Install the latest APK (0.0.0.00107 or newer) for the alarm to work properly.","Alarm sahi chalane ke liye latest APK (0.0.0.00107 ya naya) install karo.")};
  if(!s.access)return{c:"warn",t:tr("Setup needed","Setup baaki hai"),d:tr("Allow notification access to start.","Shuru karne ke liye Notification access do.")};
  if(!s.listening)return{c:"warn",t:tr("Not connected","Connect nahi hua"),d:tr("Access is given but the service is not running. Tap Reconnect.","Access mil gaya par service chalu nahi hai. Reconnect dabao.")};
  if(s.ringing)return{c:"bad",t:tr("Alarm ringing","Alarm baj raha hai"),d:tr("Tap Seen to stop it.","Band karne ke liye Seen dabao.")};
  if(!s.on)return{c:"off",t:tr("Alarm is off","Alarm band hai"),d:tr("Turn it on to hear new orders.","Naye order sunne ke liye ON karo.")};
  if(s.snoozeUntil>Date.now())return{c:"warn",t:tr("Snoozed","Snooze me"),d:tr("No alarm until ","Alarm nahi bajega: ")+new Date(s.snoozeUntil).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})};
  return{c:"ok",t:tr("Ready","Taiyaar"),d:"BUY"+(s.buy&&s.sell?" + SELL":s.sell&&!s.buy?" SELL only":"")+" · "+(s.allday?tr("24 hours","24 ghante"):naHM(s.from)+" – "+naHM(s.to))}}
sheets.nalarm=function(){
  const n=NA(),s=naRead();
  if(!n||!s){openSheet(`<div class="insw"><h3>${tr("Night order alarm","Raat ka order alarm")}</h3><p class="note">${tr("This alarm works only in the Android app. Install the latest APK, then come back here.","Ye alarm sirf Android app me chalta hai. Latest APK install karo, phir yahan aao.")}</p><div class="cpexp"><button type="button" class="mini ghost" data-close>${tr("Close","Band karo")}</button></div></div>`);return}
  try{naSet({lang:LANG()})}catch(e){}
  const st=naState(s);
  const tg=(k,t,d,on)=>`<div class="dqr fsr"><span><b>${esc(t)}</b><small>${esc(d)}</small></span><label class="tog"><input type="checkbox" data-na="${k}" ${on?"checked":""}><span></span></label></div>`;
  const opt=(arr,v,f)=>arr.map(x=>`<option value="${x}" ${x==v?"selected":""}>${f(x)}</option>`).join("");
  const since=Date.now()-12*3600000,all=naLogRead(),sm=naSummary(all,orders,since);
  const snz=s.snoozeUntil>Date.now();
  const row=(pill,cls,t,d,id,b)=>`<div class="dqr fsr nap-r"><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="nap-end"><em class="nap-pill ${cls}">${esc(pill)}</em>${id?`<button type="button" class="mini ghost" id="${id}">${esc(b)}</button>`:""}</span></div>`;
  const ev=all.slice(-8).reverse().map(x=>`<div class="nap-ev"><i class="k-${x.k}">${NA_K[x.k]||x.k}</i><span>${new Date(x.t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span><small>${x.r?tr("alarm rang","alarm baja"):tr("no alarm","alarm nahi")}</small></div>`).join("");
  const heard=s.seenAt?`${tr("KuCoin heard","KuCoin suna")} ${naAgo(s.seenAt)}${s.seenKind&&s.seenKind!=="OTHER"?" · "+(NA_K[s.seenKind]||s.seenKind):""}${s.seenPkg?` · <span class="nap-pkg">${esc(s.seenPkg)}</span>`:""}`:tr("No KuCoin notification heard yet.","Abhi tak KuCoin ki koi notification nahi suni.");
  openSheet(`<div class="insw nap"><h3>${tr("Night order alarm","Raat ka order alarm")}</h3>
   <div class="nap-hero ${st.c}"><span class="nap-ic">${NA_BELL}</span><span class="nap-tx"><b>${esc(st.t)}</b><small>${esc(st.d)}</small></span>${s.access&&!s.listening?'<button type="button" class="mini primary" id="na-rb">'+tr("Reconnect","Reconnect")+'</button>':`<label class="tog"><input type="checkbox" data-na="on" ${s.on?"checked":""}><span></span></label>`}</div>
   <p class="note nap-priv">${tr(`Rings a loud alarm for a new KuCoin BUY or SELL order until you tap Seen. Only the type and time of a notification are kept. Names and chat messages are never read.`,`KuCoin ka naya BUY ya SELL order aate hi tez alarm bajega, jab tak Seen na dabao. Sirf notification ka type aur time yaad rehta hai. Naam ya chat kabhi nahi padhi jaati.`)}</p>
   <div class="pcsec">${tr("Setup","Setup")}</div><div class="rml">
    ${row(s.access?tr("Granted","Mil gaya"):tr("Required","Zaroori"),s.access?"ok":"bad",tr("Notification access","Notification access"),tr("Lets Pexai see KuCoin notifications","Pexai ko KuCoin ki notification dekhne do"),"na-acc",s.access?tr("Check","Check"):tr("Open","Kholo"))}
    ${row(s.battery?tr("Unrestricted","Unrestricted"):tr("Restricted","Restricted"),s.battery?"ok":"warn",tr("Battery","Battery"),tr("Set to Unrestricted so the phone does not stop the app at night","Unrestricted rakho, warna phone raat me app band kar sakta hai"),"na-bat",tr("Open","Kholo"))}
    ${row(tr("Check","Check"),"info",tr("Do Not Disturb","Do Not Disturb"),tr("Keep Alarms allowed so it rings in silent or DND mode","Alarms allow rakho taaki silent ya DND me bhi bajey"),"na-dnd",tr("Open","Kholo"))}
   </div>
   <div class="pcsec">${tr("Alerts","Alerts")}</div><div class="rml">
    ${tg("buy",tr("BUY order","BUY order"),tr("You must pay: loud alarm every time","Payment karna hai: har baar tez alarm"),s.buy)}
    ${tg("sell",tr("SELL order","SELL order"),tr("Buyer is paying: alarm","Buyer pay kar raha hai: alarm"),s.sell)}
    ${tg("loud",tr("Full volume","Full awaaz"),tr("Alarm volume goes to maximum","Alarm ki awaaz apne aap max ho jati hai"),s.loud)}
   </div>
   <div class="pcsec">${tr("Schedule","Schedule")}</div><div class="rml">
    ${tg("allday",tr("24 hours","24 ghante"),tr("Turn off to use only the time below","Band karo to sirf neeche ka time"),s.allday)}
   </div>
   <div class="nap-win" id="na-win" ${s.allday?"hidden":""}><label><small>${tr("From","Se")}</small><input type="time" id="na-from" value="${naHM(s.from)}"></label><label><small>${tr("To","Tak")}</small><input type="time" id="na-to" value="${naHM(s.to)}"></label></div>
   <div class="nap-grid">
    <label><small>${tr("BUY rings every","BUY alarm har")}</small><select id="na-be">${opt([30,60,120,180],s.buyEvery,x=>x+" sec")}</select></label>
    <label><small>${tr("SELL rings every","SELL alarm har")}</small><select id="na-se">${opt([60,120,180,300],s.sellEvery,x=>x+" sec")}</select></label>
    <label><small>${tr("Stop after","Maximum")}</small><select id="na-mx">${opt([10,20,30,60],s.maxMin,x=>x+" min")}</select></label></div>
   <div class="nap-act"><button type="button" class="primary" id="na-test">${tr("Test alarm","Test alarm")}</button><button type="button" class="mini ghost" id="na-ack">${tr("Seen","Dekh liya")}</button><button type="button" class="mini ghost" id="na-snz">${snz?tr("Cancel snooze","Snooze hatao"):tr("Snooze 1 hour","1 ghanta snooze")}</button></div>
   <p class="note" id="na-msg" style="margin:6px 0"></p>
   <div class="pcsec">${tr("Activity","Activity")}</div>
   <p class="note nap-heard">${heard}</p>
   ${s.diag?`<p class="note">${tr("Sound check: ","Sound check: ")}${esc(s.diag)}</p>`:""}
   ${s.err?`<p class="note warnline">${tr("Last sound problem: ","Aakhri sound problem: ")}${esc(s.err)}</p>`:""}
   ${ev?`<div class="nap-evl">${ev}</div>`:""}
   <p class="note">${tr(`Last 12 hours — Notifications: <b>${sm.buy}</b> BUY, <b>${sm.sell}</b> SELL, <b>${sm.done}</b> complete. Orders added in the app: <b>${sm.made}</b>.`,`Pichle 12 ghante — Notification: <b>${sm.buy}</b> BUY, <b>${sm.sell}</b> SELL, <b>${sm.done}</b> complete. App me daale gaye order: <b>${sm.made}</b>.`)}${sm.missing?` <span class="warnline">${tr(`Maybe ${sm.missing} order(s) are not added in the app. Please check.`,`Shayad ${sm.missing} order app me nahi daale. Check karo.`)}</span>`:""}</p>
   <p class="note">${tr("This is only an estimate. The notification time can differ from the real order time.","Ye sirf andaza hai. Notification ka time order ke asli time se alag ho sakta hai.")}</p>
   <div class="cpexp"><button type="button" class="mini ghost" id="na-clr">${tr("Clear log","Log saaf karo")}</button><button type="button" class="mini ghost" data-close>${tr("Close","Band karo")}</button></div></div>`,el=>{
    const q=x=>el.querySelector(x),msg=t=>{q("#na-msg").textContent=t};
    el.querySelectorAll("[data-na]").forEach(c=>c.onchange=()=>{
      const k=c.dataset.na;if(k==="on"&&c.checked&&!naRead().access){c.checked=false;msg(tr("Give Notification access first (setup step 1).","Pehle Notification access do (setup ka step 1)."));return}
      naSet({[k]:c.checked});if(k==="allday")q("#na-win").hidden=c.checked;if(k==="on")setTimeout(()=>sheets.nalarm(),150);toast(c.checked?"ON":"OFF")});
    const rb=q("#na-rb");if(rb)rb.onclick=()=>{n.naRebind();msg(tr("Reconnecting…","Reconnect ho raha hai…"));setTimeout(()=>sheets.nalarm(),1500)};
    q("#na-from").onchange=q("#na-to").onchange=()=>naSet({from:naMin(q("#na-from").value),to:naMin(q("#na-to").value)});
    q("#na-be").onchange=()=>naSet({buyEvery:+q("#na-be").value});
    q("#na-se").onchange=()=>naSet({sellEvery:+q("#na-se").value});
    q("#na-mx").onchange=()=>naSet({maxMin:+q("#na-mx").value});
    q("#na-acc").onclick=()=>{if(naRead().access){msg(tr("Notification access is already given.","Notification access mil gaya hai."));return}n.naOpenAccess();msg(tr("Find Pexai in the list, turn it ON, then come back.","List me Pexai dhundo, ON karo, phir wapas aao."))};
    q("#na-bat").onclick=()=>{n.naOpenBattery();msg(tr("Choose Battery > Unrestricted, then come back.","Battery > Unrestricted chuno, phir wapas aao."))};
    q("#na-dnd").onclick=()=>{n.naOpenDnd();msg(tr("Keep Alarms allowed.","Alarms ko allow rakho."))};
    q("#na-test").onclick=()=>{const s2=naRead();if(!s2.access){msg(tr("Give Notification access first.","Pehle Notification access do."));return}
      msg(n.naTest()?tr("Alarm is ringing. Tap 'Seen' to stop it.","Alarm baj raha hai. Band karne ko 'Dekh liya' dabao."):tr("The alarm service is not running yet. Tap Reconnect or reopen the app.","Alarm service abhi chalu nahi hai. Reconnect dabao ya app dobara kholo."))};
    q("#na-ack").onclick=()=>{n.naAck();msg(tr("Alarm stopped.","Alarm band."))};
    q("#na-snz").onclick=()=>{const on=naRead().snoozeUntil>Date.now();naSet({snoozeUntil:on?0:Date.now()+3600000});q("#na-snz").textContent=on?tr("Snooze 1 hour","1 ghanta snooze"):tr("Cancel snooze","Snooze hatao");msg(on?tr("Snooze cancelled.","Snooze hata diya."):tr("No alarm for 1 hour.","1 ghante tak alarm nahi bajega."))};
    q("#na-clr").onclick=()=>{n.naClearLog();msg(tr("Log cleared.","Log saaf."));setTimeout(()=>sheets.nalarm(),400)}});
};
// compact card at the top of the menu: status and an ON/OFF switch, always one tap away
function nalCard(){
  if(!NA()||!feat("nightalarm"))return"";const s=naRead();if(!s)return"";
  const snz=s.snoozeUntil>Date.now();
  const sub=!s.access?tr("Setup pending: give Notification access","Setup baaki: Notification access do"):!s.listening?tr("Not connected: open to reconnect","Connect nahi hua: kholo aur Reconnect dabao"):s.ringing?tr("Alarm is ringing","Alarm baj raha hai"):!s.on?tr("Off","Band hai"):snz?tr("Snoozed","Snooze me"):"ON · BUY"+(s.sell?" + SELL":"")+" · "+(s.allday?tr("24 hours","24 ghante"):naHM(s.from)+"–"+naHM(s.to));
  return`<div class="nalc ${s.on&&s.access?"on":""}"><button type="button" class="nalb" id="nalOpen"><span class="nali">🔔</span><span><b>${tr("Night order alarm","Raat ka order alarm")}</b><small>${esc(sub)}</small></span></button>${s.ringing?'<button type="button" class="mini primary" id="nalAck">${tr("Seen","Dekh liya")}</button>':`<label class="tog"><input type="checkbox" id="nalTog" ${s.on&&s.access?"checked":""}><span></span></label>`}</div>`}
function nalBind(close){
  const n=NA();if(!n)return;
  const o=document.querySelector("#nalOpen");if(o)o.onclick=()=>{close();sheets.nalarm()};
  const a=document.querySelector("#nalAck");if(a)a.onclick=()=>{n.naAck();openDrawer()};
  const t=document.querySelector("#nalTog");if(t)t.onchange=()=>{
    if(t.checked&&!naRead().access){t.checked=false;toast(tr("Give Notification access first","Pehle Notification access do"));close();sheets.nalarm();return}
    naSet({on:t.checked});toast(t.checked?tr("Night alarm ON","Night alarm ON"):tr("Night alarm OFF","Night alarm OFF"));openDrawer()}}

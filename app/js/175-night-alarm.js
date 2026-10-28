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
  if(s.battery===false)return{c:"warn",t:tr("Almost ready","Lagbhag taiyaar"),d:tr("Set battery to Unrestricted so the phone does not stop the alarm at night.","Battery Unrestricted karo, warna phone raat me alarm band kar sakta hai.")};
  return{c:"ok",t:tr("Ready","Taiyaar"),d:"BUY"+(s.buy&&s.sell?" + SELL":s.sell&&!s.buy?" SELL only":"")+" · "+(s.allday?tr("24 hours","24 ghante"):naHM(s.from)+" – "+naHM(s.to))}}
const NS_IC={acc:'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',bat:'<rect x="3" y="8" width="16" height="9" rx="2"/><path d="M21 11v3M7 12v1M11 12v1"/>',dnd:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',buy:'<path d="M12 5v14M6 13l6 6 6-6"/>',sell:'<path d="M12 19V5M6 11l6-6 6 6"/>',vol:'<path d="M4 10v4h4l5 4V6l-5 4zM16.5 9a4 4 0 0 1 0 6"/>',clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',log:'<path d="M5 6h14M5 12h14M5 18h9"/>'};
const nsI=k=>`<span class="ns-ic">${BI(NS_IC[k])}</span>`;
sheets.nalarm=function(){
  const n=NA(),s=naRead();
  if(!n||!s){openSheet(`<div class="insw nap bp"><div class="bp-top"><h3>${tr("Night order alarm","Raat ka order alarm")}</h3><button type="button" class="bp-x" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="bp-card"><p class="bp-empty">${tr("This alarm works only in the Android app. Install the latest APK, then come back here.","Ye alarm sirf Android app me chalta hai. Latest APK install karo, phir yahan aao.")}</p></div></div>`);return}
  try{naSet({lang:LANG()})}catch(e){}
  try{if(s.notif===false&&typeof n.naAskNotif==="function")n.naAskNotif()}catch(e){}
  const st=naState(s);
  const opt=(arr,v,f)=>arr.map(x=>`<option value="${x}" ${x==v?"selected":""}>${f(x)}</option>`).join("");
  const since=Date.now()-12*3600000,all=naLogRead(),sm=naSummary(all,orders,since);
  const snz=s.snoozeUntil>Date.now();
  const tg=(k,ic,t,d,on)=>`<div class="ns-row">${nsI(ic)}<span class="ns-tx"><b>${esc(t)}</b><small>${esc(d)}</small></span><label class="tog"><input type="checkbox" data-na="${k}" ${on?"checked":""}><span></span></label></div>`;
  const go=(id,ic,t,d,pill,cls)=>`<button type="button" class="ns-row ns-go" id="${id}">${nsI(ic)}<span class="ns-tx"><b>${esc(t)}</b><small>${esc(d)}</small></span><em class="nap-pill ${cls}">${esc(pill)}</em><svg viewBox="0 0 24 24" class="bp-ch"><path d="M9 6l6 6-6 6"/></svg></button>`;
  const ev=all.slice(-6).reverse().map(x=>`<div class="bp-row bp-ev"><i class="k-${x.k}">${NA_K[x.k]||x.k}</i><span>${new Date(x.t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span><small>${x.r?tr("alarm rang","alarm baja"):tr("no alarm","alarm nahi")}</small></div>`).join("");
  const heard=s.seenAt?`${tr("KuCoin heard","KuCoin suna")} ${naAgo(s.seenAt)}${s.seenKind&&s.seenKind!=="OTHER"?" · "+(NA_K[s.seenKind]||s.seenKind):""}${s.seenPkg?` · <span class="nap-pkg">${esc(s.seenPkg)}</span>`:""}`:tr("No KuCoin notification heard yet.","Abhi tak KuCoin ki koi notification nahi suni.");
  openSheet(`<div class="insw nap bp"><div class="bp-top"><h3>${tr("Night order alarm","Raat ka order alarm")}</h3><button type="button" class="bp-x" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
   <div class="bp-card bp-al nap-hero ${st.c}"><div class="bp-alh"><span class="nap-ic">${NA_BELL}</span><span class="nap-tx"><b>${esc(st.t)}</b><small>${esc(st.d)}</small></span>${s.access&&!s.listening?'<button type="button" class="mini primary" id="na-rb">'+tr("Reconnect","Reconnect")+'</button>':`<label class="tog"><input type="checkbox" data-na="on" ${s.on?"checked":""}><span></span></label>`}</div>
    <p class="ns-cap">${tr("Rings a loud alarm for a new KuCoin BUY or SELL order until you tap Seen. Only the type and time of a notification are kept. Names and chat messages are never read.","KuCoin ka naya BUY ya SELL order aate hi tez alarm bajega, jab tak Seen na dabao. Sirf notification ka type aur time yaad rehta hai. Naam ya chat kabhi nahi padhi jaati.")}</p></div>
   <div class="ns-sec">${tr("Setup","Setup")}</div><div class="bp-card ns-card">
    ${go("na-acc","acc",tr("Notification access","Notification access"),tr("Lets Pexai see KuCoin notifications","Pexai ko KuCoin ki notification dekhne do"),s.access?tr("Granted","Mil gaya"):tr("Required","Zaroori"),s.access?"ok":"bad")}
    ${go("na-bat","bat",tr("Battery","Battery"),tr("Unrestricted, so the phone does not stop the app at night","Unrestricted rakho, warna phone raat me app band kar sakta hai"),s.battery?tr("Unrestricted","Unrestricted"):tr("Restricted","Restricted"),s.battery?"ok":"warn")}
    ${go("na-dnd","dnd",tr("Do Not Disturb","Do Not Disturb"),tr("Keep Alarms allowed so it rings in silent or DND mode","Alarms allow rakho taaki silent ya DND me bhi bajey"),tr("Check","Check"),"info")}</div>
   <div class="ns-sec">${tr("Alerts","Alerts")}</div><div class="bp-card ns-card">
    ${tg("buy","buy",tr("BUY order","BUY order"),tr("You must pay: loud alarm every time","Payment karna hai: har baar tez alarm"),s.buy)}
    ${tg("sell","sell",tr("SELL order","SELL order"),tr("Buyer is paying: alarm","Buyer pay kar raha hai: alarm"),s.sell)}
    ${tg("loud","vol",tr("Full volume","Full awaaz"),tr("Alarm volume goes to maximum","Alarm ki awaaz apne aap max ho jati hai"),s.loud)}</div>
   <div class="ns-sec">${tr("Schedule and timing","Schedule aur timing")}</div><div class="bp-card ns-card">
    ${tg("allday","clock",tr("24 hours","24 ghante"),tr("Turn off to ring only in the time window","Band karo to sirf neeche ke time me bajega"),s.allday)}
    <div class="nap-win ns-win" id="na-win" ${s.allday?"hidden":""}><label><small>${tr("From","Se")}</small><input type="time" id="na-from" value="${naHM(s.from)}"></label><label><small>${tr("To","Tak")}</small><input type="time" id="na-to" value="${naHM(s.to)}"></label></div>
    <div class="nap-grid ns-grid">
     <label><small>${tr("BUY rings every","BUY alarm har")}</small><select id="na-be">${opt([30,60,120,180],s.buyEvery,x=>x+" sec")}</select></label>
     <label><small>${tr("SELL rings every","SELL alarm har")}</small><select id="na-se">${opt([60,120,180,300],s.sellEvery,x=>x+" sec")}</select></label>
     <label><small>${tr("Stop after","Maximum")}</small><select id="na-mx">${opt([10,20,30,60],s.maxMin,x=>x+" min")}</select></label></div></div>
   <div class="bp-grid ns-act"><button type="button" id="na-test">${BP_IC.test}<span>${tr("Test alarm","Test alarm")}</span></button><button type="button" id="na-ack">${BP_IC.seen}<span>${tr("Seen","Dekh liya")}</span></button><button type="button" id="na-snz" class="${snz?"on":""}">${BP_IC.snz}<span>${snz?tr("Resume","Resume"):tr("Snooze 1h","Snooze 1h")}</span></button></div>
   <p class="note bp-msg" id="na-msg" hidden></p>
   <div class="ns-sec">${tr("Activity","Activity")}</div><div class="bp-card ns-card ns-act2">
    <p class="nap-heard">${heard}</p>
    <p class="note ns-diag" id="na-diag" ${s.diag?"":"hidden"}>${s.diag?tr("Sound check: ","Sound check: ")+esc(s.diag):""}</p>
    ${s.err?`<p class="note warnline">${tr("Last sound problem: ","Aakhri sound problem: ")}${esc(s.err)}</p>`:""}
    ${ev?`<div class="ns-evl">${ev}</div>`:""}
    <p class="note ns-sum">${tr(`Last 12 hours — Notifications: <b>${sm.buy}</b> BUY, <b>${sm.sell}</b> SELL, <b>${sm.done}</b> complete. Orders added in the app: <b>${sm.made}</b>.`,`Pichle 12 ghante — Notification: <b>${sm.buy}</b> BUY, <b>${sm.sell}</b> SELL, <b>${sm.done}</b> complete. App me daale gaye order: <b>${sm.made}</b>.`)}${sm.missing?` <span class="warnline">${tr(`Maybe ${sm.missing} order(s) are not added in the app. Please check.`,`Shayad ${sm.missing} order app me nahi daale. Check karo.`)}</span>`:""}</p>
    <p class="note ns-sum">${tr("This is only an estimate. The notification time can differ from the real order time.","Ye sirf andaza hai. Notification ka time order ke asli time se alag ho sakta hai.")}</p></div>
   <div class="ns-foot"><button type="button" class="mini ghost" id="na-clr">${tr("Clear log","Log saaf karo")}</button><button type="button" class="mini ghost" data-close>${tr("Close","Band karo")}</button></div></div>`,el=>{
    const q=x=>el.querySelector(x),msg=t=>{const m=q("#na-msg");m.textContent=t;m.hidden=!t};
    el.querySelectorAll("[data-na]").forEach(c=>c.onchange=()=>{
      const k=c.dataset.na;if(k==="on"&&c.checked&&!naRead().access){c.checked=false;msg(tr("Give Notification access first (setup step 1).","Pehle Notification access do (setup ka step 1)."));return}
      naSet({[k]:c.checked});if(k==="allday")q("#na-win").hidden=c.checked;if(k==="on")setTimeout(()=>{sheets.nalarm();nalHeader()},150);toast(c.checked?"ON":"OFF")});
    const rb=q("#na-rb");if(rb)rb.onclick=()=>{n.naRebind();msg(tr("Reconnecting…","Reconnect ho raha hai…"));setTimeout(()=>sheets.nalarm(),1500)};
    q("#na-from").onchange=q("#na-to").onchange=()=>naSet({from:naMin(q("#na-from").value),to:naMin(q("#na-to").value)});
    q("#na-be").onchange=()=>naSet({buyEvery:+q("#na-be").value});
    q("#na-se").onchange=()=>naSet({sellEvery:+q("#na-se").value});
    q("#na-mx").onchange=()=>naSet({maxMin:+q("#na-mx").value});
    q("#na-acc").onclick=()=>{if(naRead().access){msg(tr("Notification access is already given.","Notification access mil gaya hai."));return}n.naOpenAccess();msg(tr("Find Pexai in the list, turn it ON, then come back.","List me Pexai dhundo, ON karo, phir wapas aao."))};
    q("#na-bat").onclick=()=>{n.naOpenBattery();msg(tr("Choose Battery > Unrestricted, then come back.","Battery > Unrestricted chuno, phir wapas aao."))};
    q("#na-dnd").onclick=()=>{n.naOpenDnd();msg(tr("Keep Alarms allowed.","Alarms ko allow rakho."))};
    q("#na-test").onclick=()=>{const s2=naRead();if(!s2.access){msg(tr("Give Notification access first.","Pehle Notification access do."));return}
      setTimeout(()=>{try{const r=naRead(),d=q("#na-diag");if(d&&r){d.hidden=!r.diag&&!r.err;d.textContent=(r.diag?tr("Sound check: ","Sound check: ")+r.diag:"")+(r.err?" · "+tr("problem: ","problem: ")+r.err:"")}}catch(e){}},1600);
      msg(n.naTest()?tr("Alarm is ringing. Tap 'Seen' to stop it.","Alarm baj raha hai. Band karne ko 'Dekh liya' dabao."):tr("The alarm service is not running yet. Tap Reconnect or reopen the app.","Alarm service abhi chalu nahi hai. Reconnect dabao ya app dobara kholo."))};
    q("#na-ack").onclick=()=>{n.naAck();msg(tr("Alarm stopped.","Alarm band."))};
    q("#na-snz").onclick=()=>{const on=naRead().snoozeUntil>Date.now();naSet({snoozeUntil:on?0:Date.now()+3600000});q("#na-snz span").textContent=on?tr("Snooze 1h","Snooze 1h"):tr("Resume","Resume");msg(on?tr("Snooze cancelled.","Snooze hata diya."):tr("No alarm for 1 hour.","1 ghante tak alarm nahi bajega."));nalHeader()};
    q("#na-clr").onclick=()=>{n.naClearLog();msg(tr("Log cleared.","Log saaf."));setTimeout(()=>sheets.nalarm(),400)}});
};
// ---- the bell: alarm control, alerts and open orders in one panel
const BI=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const BP_IC={seen:BI('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),snz:BI('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M9 3h6"/>'),test:BI('<path d="M7 5l12 7-12 7z"/>'),set:BI('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),ok:BI('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/>'),warn:BI('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),ord:BI('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),sig:BI('<path d="M5 12a7 7 0 0 1 14 0M8.5 12a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="12" r="1"/>')};
const bpHead=(ic,t,n,tone)=>`<div class="bp-h"><span class="bp-hi ${tone||""}">${ic}</span><b>${esc(t)}</b>${n!=null&&n!==""?`<em class="bp-n ${tone||""}">${n}</em>`:""}</div>`;
sheets.bell=function(){
  const n=NA(),s=n?naRead():null,st=s?naState(s):null,A=(typeof lastAlerts!=="undefined"&&lastAlerts)||[];
  const allP=orders.filter(o=>o.status==="Pending"||o.status==="Appeal"),pend=allP.slice().sort((a,b)=>(b.time||0)-(a.time||0)).slice(0,5);
  const ev=(s?naLogRead():[]).filter(x=>x.k!=="TEST").slice(-5).reverse();
  const snz=s&&s.snoozeUntil>Date.now(),urgent=A.filter(a=>a.hi).length;
  const alarm=s?`<div class="bp-card bp-al ${st.c}"><div class="bp-alh"><span class="nap-ic">${NA_BELL}</span><span class="nap-tx"><b>${tr("Night order alarm","Raat ka order alarm")}</b><small><i class="bp-st ${st.c}"></i>${esc(st.t)} · ${esc(st.d)}</small></span>${s.access&&!s.listening?'<button type="button" class="mini primary" id="bl-rb">'+tr("Reconnect","Reconnect")+'</button>':`<label class="tog"><input type="checkbox" id="bl-on" ${s.on?"checked":""}><span></span></label>`}</div>
    <div class="bp-grid"><button type="button" id="bl-ack" ${s.ringing?"":"disabled"}>${BP_IC.seen}<span>${tr("Seen","Dekh liya")}</span></button><button type="button" id="bl-snz" class="${snz?"on":""}">${BP_IC.snz}<span>${snz?tr("Resume","Resume"):tr("Snooze 1h","Snooze 1h")}</span></button><button type="button" id="bl-test">${BP_IC.test}<span>${tr("Test","Test")}</span></button><button type="button" id="bl-set">${BP_IC.set}<span>${tr("Settings","Settings")}</span></button></div>
    ${(()=>{const L=[["access",s.access,tr("Notification access is off","Notification access band hai"),tr("Allow","Allow")],["service",!s.access||s.listening,tr("Alarm service is not connected","Alarm service connect nahi hai"),tr("Reconnect","Reconnect")],["battery",s.battery,tr("Battery is restricted","Battery restricted hai"),tr("Fix","Theek karo")],["notif",s.notif!==false,tr("App notifications are blocked","App notifications band hain"),tr("Allow","Allow")]],bad=L.filter(x=>!x[1]);
      return bad.length?`<div class="bp-hc">${bad.map(x=>`<div class="bp-fix"><span class="bp-hi warn">${BP_IC.warn}</span><span>${esc(x[2])}</span><button type="button" class="mini primary" data-fx="${x[0]}">${esc(x[3])}</button></div>`).join("")}</div>`
        :`<div class="bp-hc ok">${BP_IC.ok}<span>${tr("All checks passed","Saari checks pass")}</span><small>${tr("Access · Service · Battery · Notifications","Access · Service · Battery · Notifications")}</small></div>`})()}
    <p class="note bp-msg" id="bl-msg" hidden></p></div>`
   :`<div class="bp-card bp-al off"><div class="bp-alh"><span class="nap-ic">${NA_BELL}</span><span class="nap-tx"><b>${tr("Night order alarm","Raat ka order alarm")}</b><small>${tr("Works in the Android app only.","Sirf Android app me chalta hai.")}</small></span></div></div>`;
  const sum=`<div class="bp-sum"><div><b class="${urgent?"bad":A.length?"warn":"ok"}">${A.length}</b><span>${tr("Alerts","Alerts")}</span></div><div><b class="${allP.length?"warn":"ok"}">${allP.length}</b><span>${tr("Open orders","Open orders")}</span></div><div><b class="${s&&s.seenAt?"":"mut"}">${s?(s.seenAt?naAgo(s.seenAt).replace(" ago","").replace(" pehle",""):tr("Never","Kabhi nahi")):"–"}</b><span>${tr("KuCoin last heard","KuCoin last suna")}</span></div></div>`;
  const attn=`<div class="bp-card">${bpHead(A.length?BP_IC.warn:BP_IC.ok,tr("Needs attention","Dhyan do"),A.length||"",A.length?(urgent?"bad":"warn"):"ok")}${A.length?A.slice(0,6).map(a=>`<button type="button" class="bp-row bl-al ${a.hi?"hi":""}" ${aAttr(a)}><i class="bp-dot"></i><span>${esc(a.t)}</span><svg viewBox="0 0 24 24" class="bp-ch"><path d="M9 6l6 6-6 6"/></svg></button>`).join(""):`<p class="bp-empty">${tr("All clear. Nothing needs attention.","Sab theek hai. Kuch dhyan dene layak nahi.")}</p>`}</div>`;
  const po=`<div class="bp-card">${bpHead(BP_IC.ord,tr("Open orders","Open orders"),allP.length||"",allP.length?"warn":"")}${pend.length?pend.map(o=>`<button type="button" class="bp-row bl-ord" data-oid="${esc(o.id)}"><span class="bp-sd ${o.side==="BUY"?"b":"s"}">${esc(o.side)}</span><span class="bp-tx"><b>${esc(String(o.qty))} ${esc(o.coin||"USDT")}</b><small>${esc(o.cp||"")}${o.time?" · "+naAgo(o.time):""}</small></span><em class="nap-pill warn">${esc(o.status)}</em></button>`).join(""):`<p class="bp-empty">${tr("No open orders.","Koi open order nahi.")}</p>`}</div>`;
  const hv=s?`<div class="bp-card">${bpHead(BP_IC.sig,tr("KuCoin notifications","KuCoin notifications"))}${ev.length?ev.map(x=>`<div class="bp-row bp-ev"><i class="k-${x.k}">${NA_K[x.k]||x.k}</i><span>${new Date(x.t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span><small>${x.r?tr("alarm rang","alarm baja"):tr("no alarm","alarm nahi")}</small></div>`).join(""):`<p class="bp-empty">${s.seenAt?tr("KuCoin heard ","KuCoin suna ")+naAgo(s.seenAt)+".":tr("Waiting for the first KuCoin order notification. Nothing has been heard yet.","Pehli KuCoin order notification ka intezaar hai. Abhi tak kuch nahi suna.")}</p>`}</div>`:"";
  const calm=!A.length&&!allP.length;
  const calmCard=`<div class="bp-card bp-calm"><span class="bp-hi ok">${BP_IC.ok}</span><span class="bp-tx"><b>${tr("All clear","Sab theek hai")}</b><small>${tr("No alerts and no open orders.","Koi alert nahi aur koi open order nahi.")}</small></span></div>`;
  openSheet(`<div class="insw nap bp"><div class="bp-top"><h3>${tr("Alerts and alarm","Alerts aur alarm")}</h3><button type="button" class="bp-x" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>${alarm}${sum}${calm?calmCard:attn+po}${hv}</div>`,el=>{
    const q=x=>el.querySelector(x),msg=t=>{const m=q("#bl-msg");if(m){m.textContent=t;m.hidden=!t}};
    el.querySelectorAll(".bl-ord").forEach(b=>b.onclick=()=>{$("#sheetBg").hidden=true;document.body.style.overflow="";try{orderSheet(b.dataset.oid)}catch(e){}});
    if(!n)return;
    const on=q("#bl-on");if(on)on.onchange=()=>{if(on.checked&&!naRead().access){on.checked=false;msg(tr("Give Notification access first (open Settings).","Pehle Notification access do (Settings kholo)."));return}naSet({on:on.checked});toast(on.checked?"Night alarm ON":"Night alarm OFF");setTimeout(()=>{sheets.bell();nalHeader()},150)};
    const rb=q("#bl-rb");if(rb)rb.onclick=()=>{n.naRebind();msg(tr("Reconnecting…","Reconnect ho raha hai…"));setTimeout(()=>sheets.bell(),1500)};
    q("#bl-ack").onclick=()=>{n.naAck();setTimeout(()=>{sheets.bell();nalHeader()},300)};
    q("#bl-snz").onclick=()=>{const o=naRead().snoozeUntil>Date.now();naSet({snoozeUntil:o?0:Date.now()+3600000});setTimeout(()=>{sheets.bell();nalHeader()},150)};
    q("#bl-test").onclick=()=>{if(!naRead().access){msg(tr("Give Notification access first.","Pehle Notification access do."));return}msg(n.naTest()?tr("Alarm is ringing. Tap Seen to stop it.","Alarm baj raha hai. Band karne ko Dekh liya dabao."):tr("The alarm service is not running. Open Settings and tap Reconnect.","Alarm service chalu nahi hai. Settings me Reconnect dabao."));setTimeout(()=>{const b=q("#bl-ack");if(b)b.disabled=false},300)};
    el.querySelectorAll("[data-fx]").forEach(b=>b.onclick=()=>{const k=b.dataset.fx;
      if(k==="access"){n.naOpenAccess();msg(tr("Find Pexai in the list and turn it ON, then come back.","List me Pexai dhundo, ON karo, phir wapas aao."))}
      else if(k==="service"){n.naRebind();msg(tr("Reconnecting…","Reconnect ho raha hai…"));setTimeout(()=>sheets.bell(),1500)}
      else if(k==="battery"){n.naOpenBattery();msg(tr("Choose Battery > Unrestricted, then come back.","Battery > Unrestricted chuno, phir wapas aao."))}
      else{try{n.naAskNotif()}catch(e){}msg(tr("Allow notifications for Pexai when asked.","Poochne par Pexai ki notifications allow karo."))}});
    q("#bl-set").onclick=()=>sheets.nalarm()})};
// bell in the top bar: shows the alarm state at a glance and opens the alarm screen
function nalHeader(){
  const b=document.getElementById("alarmBtn"),d=document.getElementById("alarmDot");if(!b||!d)return;
  b.classList.remove("ih");b.hidden=false;
  const A=(typeof lastAlerts!=="undefined"&&lastAlerts)||[],hi=A.some(a=>a.hi);
  const s=NA()&&feat("nightalarm")?naRead():null;
  if(s){const st=naState(s);d.className="nadot "+(st.c==="ok"&&hi?"warn":st.c);b.title=st.t+" · "+st.d}
  else{d.className="nadot "+(A.length?(hi?"bad":"warn"):"off");b.title=A.length?A.length+" alerts":"Alerts"}}
(function(){const b=document.getElementById("alarmBtn");if(b){b.setAttribute("aria-label","Alerts and alarm");b.onclick=()=>sheets.bell()}
  [600,1500,3000,6000].forEach(t=>setTimeout(nalHeader,t));setInterval(nalHeader,20000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)nalHeader()})})();

// ---------- settings ----------
const PREF_DEF={biz:"",owner:"",coin:"USDT",mode:"P2P",plat:"Binance",liteDirect:false,pay:"UPI",status:"Completed",coins:["USDT","BTC","ETH","USDC"],plats:["Binance","Bybit","OKX","KuCoin","Other"],upi:"rolling",week:"Mon",pmin:30,lpct:90,alerts:{pending:true,limits:true,direct:true,unassigned:true,stock:true},lang:"English",len:"Short",learn:true,mem:true,autoIntake:false,night:true,nightAt:"23:00",bkDays:7};
function pref(k){const p=(settings&&settings.prefs)||{};return p[k]!=null?p[k]:PREF_DEF[k]}
const alertOn=k=>(pref("alerts")||{})[k]!==false;
let prefT=null,prefPending={};
function setPref(k,v){if(k==="owner"||k==="biz")setTimeout(()=>{try{updateChrome()}catch(e){}},0);prefPending[k]=v;settings={...settings,prefs:{...(settings.prefs||{}),...prefPending}};applyPrefs();clearTimeout(prefT);prefT=setTimeout(async()=>{prefPending={};try{await putRec({...settings,id:"s_main",kind:"setting"});toast("Settings saved")}catch(e){toast("Couldn't save settings")}},700)}
const devGet=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}};
const isFileCopy=/^(content|file):$/.test(location.protocol)&&!window.P2P_APK;
const pinHas=()=>!isFileCopy&&/^([0-9a-f]{64}|x-?\d+)$/.test(String(devGet("p2p_pin","")||""));
const devSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
function sysDark(){try{if(window.P2PNative&&typeof P2PNative.sysDark==="function")return !!P2PNative.sysDark()}catch(e){}return !matchMedia("(prefers-color-scheme: light)").matches}
window.P2PSys=function(){try{if(devGet("p2p_theme","dark")==="system")applyTheme()}catch(e){}};
try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>window.P2PSys())}catch(e){}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)window.P2PSys()});
function applyTheme(){const t=devGet("p2p_theme","dark");const want=t==="system"?(sysDark()?"dark":"light"):t;document.documentElement.setAttribute("data-theme",want);try{const nn=document.getElementById("st-themeNote");if(nn){const nat=!!(window.P2PNative&&typeof P2PNative.sysDark==="function");nn.textContent=t==="system"?"Auto · phone is "+(sysDark()?"dark":"light")+(window.P2PNative&&!nat?" · install the newest app (APK) so Auto works":""):"This device only"}}catch(e){}try{if(window.P2PNative&&typeof P2PNative.setTheme==="function")P2PNative.setTheme(want);if(window.P2PNative&&typeof P2PNative.setThemeMode==="function")P2PNative.setThemeMode(t)}catch(e){}try{renderCharts()}catch(e){}}
function fillSelect(el,list,cur){if(!el)return;const v=cur!=null?cur:el.value;el.innerHTML=list.map(x=>`<option>${esc(x)}</option>`).join("");if(list.includes(v))el.value=v}
function applyPrefs(){
  const coins=pref("coins"),plats=pref("plats");
  fillSelect($("#f-coin"),coins);fillSelect($("#f-plat"),plats);fillSelect($("#i-plat"),plats);fillSelect($("#st-coin"),coins,pref("coin"));fillSelect($("#st-plat"),plats,pref("plat"));
  updateChrome&&updateChrome();
}
function applyFormDefaults(){
  if($("#f-qty").value)return;
  const m=pref("mode");const mb=document.querySelector(`#modeSeg [data-m="${m}"]`);if(mb&&formMode!==m)mb.click();
  $("#f-coin").value=pref("coin");$("#f-plat").value=pref("plat");$("#f-pay").value=pref("pay");$("#f-status").value=pref("status");
}
function loadSettingsForm(){
  const v=(id,val)=>{const e=$("#"+id);if(e&&document.activeElement!==e)e.value=val};
  v("st-biz",pref("biz"));v("st-owner",pref("owner"));v("st-mode",pref("mode"));v("st-pay",pref("pay"));v("st-status",pref("status"));
  v("st-coins",pref("coins").join(", "));v("st-plats",pref("plats").join(", "));v("st-upi",pref("upi"));v("st-week",pref("week"));
  v("st-pmin",pref("pmin"));v("st-lpct",pref("lpct"));v("st-lang",pref("lang"));v("st-len",pref("len"));
  ["pending","limits","direct","unassigned","stock"].forEach(k=>$("#st-a-"+k).checked=alertOn(k));
  $("#st-learn").checked=!!pref("learn");$("#st-auto").checked=pref("autoIntake")!==false;$("#st-mem").checked=!!pref("mem");
  $("#st-lang").value=LANG();$("#st-theme").value=devGet("p2p_theme","dark");$("#st-hide").checked=devGet("p2p_hide_default","0")==="1";
  renderNotes();
  $("#aboutLine").textContent=`${APP_NAME} · ${orders.length} orders · ${banks.length} banks · ${parties.length} parties · ${exps.length} expenses`;
}
const bindPref=(id,k,map)=>{const e=$("#"+id);e.addEventListener("change",()=>setPref(k,map?map(e.value):e.value))};
bindPref("st-biz","biz",v=>v.trim().slice(0,40));bindPref("st-owner","owner",v=>v.trim().slice(0,40));
bindPref("st-mode","mode");bindPref("st-coin","coin");bindPref("st-plat","plat");bindPref("st-pay","pay");bindPref("st-status","status");
const listMap=v=>[...new Set(v.split(",").map(x=>x.trim()).filter(Boolean))].slice(0,20);
bindPref("st-coins","coins",v=>{const l=listMap(v).map(x=>x.toUpperCase());return l.length?l:PREF_DEF.coins});
bindPref("st-plats","plats",v=>{const l=listMap(v);return l.length?l:PREF_DEF.plats});
bindPref("st-upi","upi");bindPref("st-week","week");
bindPref("st-pmin","pmin",v=>Math.max(5,+v||30));bindPref("st-lpct","lpct",v=>Math.min(100,Math.max(50,+v||90)));
["pending","limits","direct","unassigned","stock"].forEach(k=>$("#st-a-"+k).addEventListener("change",e=>setPref("alerts",{...pref("alerts"),[k]:e.target.checked})));
bindPref("st-lang","lang");bindPref("st-len","len");
$("#st-learn").addEventListener("change",e=>setPref("learn",e.target.checked));$("#st-auto").addEventListener("change",e=>setPref("autoIntake",e.target.checked));$("#st-mem").addEventListener("change",e=>setPref("mem",e.target.checked));
$("#st-lang").onchange=e=>{try{localStorage.setItem("p2p_lang",e.target.value==="hi"?"hi":"en")}catch(err){}try{if(typeof naSet==="function"&&NA())naSet({lang:e.target.value==="hi"?"hi":"en"})}catch(er){}toast(e.target.value==="hi"?"Hinglish ON":"English ON")};
$("#st-theme").onchange=e=>{devSet("p2p_theme",e.target.value);applyTheme()};
$("#st-hide").onchange=e=>devSet("p2p_hide_default",e.target.checked?"1":"0");
document.addEventListener("click",e=>{if(e.target.closest('[data-go="settings"]'))setTimeout(loadSettingsForm,0)});

// ---------- AI learning ----------
let notes=[],reminds=[];
function aiStyle(){const l=pref("lang"),n=pref("len");return `Reply in ${l==="Hinglish"?"Hinglish (Hindi written in English letters, simple everyday words)":l==="Hindi"?"simple Hindi (Devanagari script)":"simple English"}, ${n==="Detailed"?"detailed, with clear short sections":"short and direct"}, sized for a phone screen.${pref("owner")?" The user's name is "+pref("owner")+".":""}${pref("biz")?" Business name: "+pref("biz")+".":""}${pref("nick")?" Their own exchange nickname is "+pref("nick")+" (that side of a trade is the user).":""}`}
function habits(){
  const done=orders.filter(o=>o.status==="Completed");if(!orders.length)return[];
  const out=[];const by={};orders.forEach(o=>{if(!o.cp)return;const k=o.cp.trim();const x=by[k]=by[k]||{n:0,c:0,ap:0,qty:0,v:0,side:{BUY:0,SELL:0},last:0,night:0};x.n++;if(o.status==="Cancelled")x.c++;if(o.status==="Appeal")x.ap++;if(o.status==="Completed"){x.qty+=+o.qty;x.v+=o.qty*o.rate}x.side[o.side]++;x.last=Math.max(x.last,o.time);const h=new Date(o.time).getHours();if(h<7||h>=23)x.night++});
  Object.entries(by).sort((a,b)=>b[1].n-a[1].n).slice(0,8).forEach(([k,x])=>{let t=`${k}: ${x.n} orders, mostly ${x.side.BUY>=x.side.SELL?"you BUY from them":"you SELL to them"}`;if(x.qty)t+=`, avg rate ₹${(x.v/x.qty).toFixed(2)}`;if(x.c)t+=`, ${x.c} cancelled${x.c/x.n>=0.3?" (high)":""}`;if(x.ap)t+=`, ${x.ap} appeal`;if(x.night>=2)t+=`, ${x.night} at night`;out.push(t)});
  ["BUY","SELL"].forEach(sd=>{const c={};done.filter(o=>o.side===sd).forEach(o=>(o.splits||[]).forEach(x=>c[x.bank]=(c[x.bank]||0)+1));const top=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];if(top)out.push(`Usually ${sd==="BUY"?"pays from":"receives in"} ${bankName(top[0])}`)});
  const qs=done.map(o=>+o.qty).sort((a,b)=>a-b);if(qs.length>=3)out.push(`Typical order size about ${fmtQ(qs[Math.floor(qs.length/2)])} ${done[0].coin}`);
  const hrs={};orders.forEach(o=>{const h=new Date(o.time).getHours();hrs[h]=(hrs[h]||0)+1});const bh=Object.entries(hrs).sort((a,b)=>b[1]-a[1])[0];if(bh&&orders.length>=5)out.push(`Busiest hour ${(bh[0]%12||12)}${bh[0]<12?" am":" pm"} (${bh[1]} orders)`);
  const pm={};orders.forEach(o=>pm[o.pay]=(pm[o.pay]||0)+1);const tp=Object.entries(pm).sort((a,b)=>b[1]-a[1])[0];if(tp&&orders.length>=5)out.push(`Most used payment method ${tp[0]}`);
  parties.forEach(p=>{const c={};ppays.filter(x=>x.party===p.id).forEach(x=>(x.splits||[]).forEach(sp=>c[sp.bank]=(c[sp.bank]||0)+1));const t=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];if(t)out.push(`${p.name} is usually paid from ${bankName(t[0])}`)});
  return out;
}
function aiMemory(){return{taught_by_user:notes.map(n=>n.text),learned_from_data:pref("learn")?habits():[]}}
function renderNotes(){
  $("#notesList").innerHTML=notes.length?[...notes].sort((a,b)=>b.time-a.time).map(n=>`<div class="nrow"><span>${esc(n.text)}</span><button type="button" class="link del" data-delnote="${n.id}">Delete</button><small>${n.source==="ai"?"Learned in chat":"Taught by you"} · ${new Date(n.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</small></div>`).join(""):'<div class="empty" style="padding:16px">Nothing taught yet.</div>';
  const h=pref("learn")?habits():[];
  $("#learnedList").innerHTML=h.length?h.map(t=>`<div class="nrow"><span>${esc(t)}</span></div>`).join(""):`<div class="empty" style="padding:16px">${pref("learn")?"Add more orders and payments, the AI will spot your habits.":"Learning from data is off."}</div>`;
  $("#notesList").querySelectorAll("[data-delnote]").forEach(b=>twoTap(b,async()=>{try{await delRec(b.dataset.delnote);toast("Removed")}catch(e){toast("Couldn't remove")}}));
}
$("#noteAdd").onclick=async()=>{const t=$("#noteIn").value.trim();if(!t){toast("Write something to teach");return}try{await putRec({id:newId("n_"),kind:"note",text:t.slice(0,200),source:"user",time:Date.now()});$("#noteIn").value="";toast("AI will remember this")}catch(e){toast("Couldn't save")}};
ACT.remember={d:a=>`Remember: “${a.note}”`,run:async a=>{if(!a.note)throw new Error("empty note");await putRec({id:newId("n_"),kind:"note",text:String(a.note).slice(0,200),source:"ai",time:Date.now()})}};

// ---------- data tools ----------
let dlApi=null;
var saveFile=async function(name,data){if(!dlApi){toast("Download isn't available here");return}try{await dlApi.save({filename:name,data});}catch(e){if(e&&e.code!=="cancelled"&&e.code!=="declined")toast("Couldn't download")}}
$("#bkExport").onclick=()=>saveFile(`Pexai-backup-${new Date().toLocaleDateString("en-CA")}.json`,JSON.stringify({app:"Pexai",version:1,exported:new Date().toISOString(),records:recs},null,1));
$("#csvExport").onclick=()=>{const head=["Date","Time","Mode","Side","Coin","Quantity","Rate","Total INR","Status","Platform","Payment","Counterparty","Banks","Note"];
  const q=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const rows=[...orders].sort((a,b)=>a.time-b.time).map(o=>{const d=new Date(o.time);return[d.toLocaleDateString("en-CA"),d.toLocaleTimeString("en-GB"),modeOf(o),o.side,o.coin,o.qty,o.rate,(orderTotal(o)).toFixed(2),o.status,o.platform,o.pay,o.cp,(o.splits||[]).map(x=>bankName(x.bank)+" "+x.amt+" "+(x.method||"")).join("; "),o.note].map(q).join(",")});
  saveFile(`Pexai-orders-${new Date().toLocaleDateString("en-CA")}.csv`,"﻿"+[head.join(","),...rows].join("\n"))};
try{$("#ix-auto").onchange=e=>setPref("ixAuto",e.target.checked?"1":"0")}catch(e){}
$("#bkImport").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;let data;try{data=JSON.parse(await f.text())}catch(err){$("#bkNote").textContent="This file isn't a valid backup.";return}
  const list=Array.isArray(data)?data:data&&Array.isArray(data.records)?data.records:null;if(!list){$("#bkNote").textContent="This file isn't a backup from this app.";return}
  const ok=list.filter(x=>x&&typeof x.id==="string"&&x.id.length<=200&&/^[A-Za-z0-9_\-.~]+$/.test(x.id));let n=0;
  if(col){let i=0;const w=async()=>{while(i<ok.length){const x=ok[i++];try{await col.doc(x.id).set(x)}catch(err){}n++;if(n%25===0)$("#bkNote").textContent=`Restoring ${n} of ${ok.length}…`}};await Promise.all([w(),w(),w(),w()])}
  else{const idx=new Map(recs.map((r,k)=>[r.id,k]));ok.forEach(x=>{if(idx.has(x.id))recs[idx.get(x.id)]=x;else recs.push(x)});n=ok.length;lsSave();splitRecs();applyPrefs();render()}
  $("#bkNote").textContent=`Restored ${n} records. Existing records with the same id were updated.`;};
$("#wipeBtn").onclick=()=>openSheet(`<h3>Delete all data?</h3><p class="note">This removes every order, bank, party, payment, expense, note and setting. It cannot be undone.</p><label style="margin-top:12px">Type DELETE to confirm<input id="wipeIn" autocomplete="off"></label><button type="button" class="primary" id="wipeGo" style="width:100%;margin-top:14px;background:var(--sell);color:#fff">Delete everything</button>`,el=>{
  el.querySelector("#wipeGo").onclick=async e=>{if($("#wipeIn").value.trim().toUpperCase()!=="DELETE"){toast("Type DELETE to confirm");return}const b=e.currentTarget;b.disabled=true;const all=recs.map(r=>r.id);let n=0;
    if(col){let i=0;const w=async()=>{while(i<all.length){const id=all[i++];try{await col.doc(id).delete();n++}catch(err){}if(n%25===0)b.textContent=`Deleting ${n} of ${all.length}…`}};await Promise.all([w(),w(),w(),w()])}
    else{n=all.length;recs=[];lsSave();splitRecs();render()}
    closeSheet();toast(`Deleted ${n} records`)}});

// ---------- on-phone OCR (reads screenshots when the AI can't see images) ----------
let ocrWorker=null,ocrPromise=null,ocrState="idle",ocrListeners=[];
function ocrStatus(t){ocrState=t;const el=$("#i2-ready");if(el)el.textContent=t;ocrListeners.forEach(f=>{try{f(t)}catch(e){}})}
async function fetchWithProgress(url,onp){
  const res=await fetch(url);if(!res.ok)throw new Error("ocr data "+res.status);
  const total=+res.headers.get("content-length")||4113088;
  if(!res.body||!res.body.getReader)return new Uint8Array(await res.arrayBuffer());
  const rd=res.body.getReader();const parts=[];let got=0;
  for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;onp&&onp(Math.min(99,Math.round(got/total*100)))}
  const out=new Uint8Array(got);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out;
}
// the engine files come from a CDN: try several mirrors (one blocked or slow mirror must not stop the reader), a few rounds
const OCR_BASES=[["https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/","https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1"],["https://fastly.jsdelivr.net/npm/tesseract.js@5.1.1/dist/","https://fastly.jsdelivr.net/npm/tesseract.js-core@5.1.1"],["https://gcore.jsdelivr.net/npm/tesseract.js@5.1.1/dist/","https://gcore.jsdelivr.net/npm/tesseract.js-core@5.1.1"],["https://unpkg.com/tesseract.js@5.1.1/dist/","https://unpkg.com/tesseract.js-core@5.1.1"]];
async function ocrPick(){let last=null;
  for(let round=0;round<3;round++){for(const [d,c] of OCR_BASES){
    try{ocrStatus("Screenshot reader: downloading (1 of 3)…");const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),12000);
      const r=await fetch(d+"worker.min.js",{signal:ctl.signal});clearTimeout(tm);if(!r.ok)throw new Error("http "+r.status);await r.arrayBuffer();
      return{script:d+"tesseract.min.js",worker:d+"worker.min.js",core:c}}catch(e){last=e}}
    await new Promise(r=>setTimeout(r,1500*(round+1)))}
  throw last||new Error("no mirror")}
function ocrInit(){
  if(ocrWorker)return Promise.resolve(ocrWorker);
  if(ocrPromise)return ocrPromise;
  const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error("timeout")),ms))]);
  ocrPromise=withTimeout((async()=>{
    ocrStatus("Screenshot reader: downloading (1 of 3)…");
    const B=await ocrPick();
    await loadScript(B.script);
    const data=await fetchWithProgress("ocr/eng-traineddata.wasm",p=>ocrStatus(`Screenshot reader: downloading language ${p}% (2 of 3)…`));
    ocrStatus("Screenshot reader: starting engine (3 of 3)…");
    ocrWorker=await Tesseract.createWorker([{code:"eng",data}],1,{
      workerPath:B.worker,
      corePath:B.core,
      gzip:false,cacheMethod:"none",
      logger:m=>{if(m&&m.status&&m.status!=="recognizing text"){ocrStatus("Screenshot reader: "+m.status+(m.progress?` ${Math.round(m.progress*100)}%`:"")+"…")}else if(m&&m.status==="recognizing text"){ocrListeners.forEach(f=>{try{f("reading "+Math.round((m.progress||0)*100)+"%")}catch(e){}})}}});
    ocrStatus("Screenshot reader ready ✓");
    return ocrWorker;
  })(),120000).catch(e=>{ocrPromise=null;ocrWorker=null;ocrStatus(e.message==="timeout"?"Screenshot reader took too long. Check internet and try again.":"Screenshot reader couldn't start on this browser ("+String(e&&e.message||e).slice(0,80)+").");throw e});
  return ocrPromise;
}
// OCR works better and faster on a grey, mid-size image
async function ocrPrep(file){
  try{const url=URL.createObjectURL(file);const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});
    const long=Math.max(img.width,img.height);const k=long>2200?2200/long:(Math.max(img.width,img.height)<1000?1.6:1);
    const c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
    const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    // dark-theme screenshots (light text on dark): tesseract reads dark-on-light, so measure and invert
    const d=g.getImageData(0,0,c.width,c.height),px=d.data;let sum=0,n=0;for(let y=0;y<c.height;y+=7)for(let x=0;x<c.width;x+=7){const o=(y*c.width+x)*4;sum+=px[o]*.299+px[o+1]*.587+px[o+2]*.114;n++}
    const dark=n&&sum/n<120;
    for(let o=0;o<px.length;o+=4){let v=px[o]*.299+px[o+1]*.587+px[o+2]*.114;if(dark)v=255-v;v=Math.max(0,Math.min(255,(v-128)*1.0+128));px[o]=px[o+1]=px[o+2]=v}
    g.putImageData(d,0,0);
    return await new Promise(ok=>c.toBlob(b=>ok(b||file),"image/png"))}catch(e){return file}}
async function ocrImage(blob,onp){const w=await ocrInit();if(onp)ocrListeners=[onp];try{const {data}=await Promise.race([w.recognize(await ocrPrep(blob)),new Promise((_,no)=>setTimeout(()=>no(new Error("timeout")),60000))]);return (data&&data.text||"").replace(/[ \t]+\n/g,"\n").trim()}finally{ocrListeners=[]}}
// ---------- auto-save with undo ----------
async function autoApply(actions,files){
  const card=document.createElement("div");card.className="acard";
  card.innerHTML=`<div class="ah">Saving…</div>${actions.map((a,i)=>`<div class="ai" data-i="${i}"><span class="st">…</span><span>${esc(ACT[a.type].d(a))}</span></div>`).join("")}`;
  let proofIds=[];
  if(files.length&&assetsApi&&actions.some(a=>["pay_party","add_order","add_expense","assign_banks"].includes(a.type))){try{proofIds=await uploadProofs(files)}catch(e){toast("Screenshot proof not saved")}}
  const hashes=await Promise.all(files.map(fileHash));actions.forEach(a=>{if(proofIds.length){a.__proofs=proofIds;a.__hashes=hashes}});
  __track=[];let ok=0;
  for(let i=0;i<actions.length;i++){const a=actions[i],el=card.querySelector(`.ai[data-i="${i}"] .st`);
    try{await ACT[a.type].run(a);el.textContent="Saved";el.className="st ok";ok++}
    catch(err){el.textContent="Skipped";el.className="st err";el.parentElement.insertAdjacentHTML("beforeend",`<span class="note" style="display:block">${esc(err.message||"Couldn't save")}</span>`)}}
  const changes=__track;__track=null;
  card.querySelector(".ah").textContent=ok?`Saved automatically · ${ok} of ${actions.length}`:"Nothing could be saved";
  if(changes.length){const row=document.createElement("div");row.className="row2";row.innerHTML=`<button class="mini ghost" type="button">Undo</button><button class="mini ghost" type="button" data-go="orders">View orders</button>`;card.appendChild(row);
    twoTap(row.firstChild,async()=>{for(const c of [...changes].reverse()){try{if(c.prev)await putRec(c.prev);else await delRec(c.id)}catch(e){}}card.querySelector(".ah").textContent="Undone · nothing kept";row.remove();card.querySelectorAll(".st.ok").forEach(s=>{s.textContent="Undone";s.className="st"});toast("Undone")})}
  if(ok)toast(`Saved ${ok} automatically`);
  return card;
}
// ---------- cloud reader: Claude reads screenshots in the background and saves records ----------
const READER_TRIG="trig_01GTtxkH9LHbHosT6cyH61Zt";
const cloudReady=()=>!!(assetsApi&&mcp&&col);
async function cloudIntake(files,text){
  const ids=await uploadProofs(files);
  const id=newId("ij_");
  await putRec({id,kind:"intakejob",status:"new",assets:ids,text:[text||"",pref("nick")?"My exchange nickname: "+pref("nick"):""].filter(Boolean).join("\n"),time:Date.now()});
  await mcp.callTool("Claude Code Remote","fire_trigger",{trigger_id:READER_TRIG,text:"Process intake job "+id},{cache:false});
  return id;
}
function renderJobs(){
  const el=$("#i2-jobs");if(!el)return;
  const jobs=recs.filter(r=>r.kind==="intakejob").sort((a,b)=>b.time-a.time).slice(0,6);
  el.innerHTML=jobs.map(j=>{const n=(j.assets||[]).length;const age=Math.round((Date.now()-j.time)/6e4);
    const head=j.status==="done"?((j.created||[]).length||(j.updated||[]).length?`Saved · ${(j.created||[]).length} new${(j.updated||[]).length?`, ${(j.updated||[]).length} updated`:""}`:"Nothing saved"):j.status==="undone"?"Undone":j.status==="working"?"Reading now…":(age>8?"Still waiting… (tap Retry)":"Sent · Claude will read it in 1–3 min");
    return `<div class="acard" data-job="${j.id}"><div class="ah">${esc(head)}</div>
      <div class="pvs">${(j.assets||[]).slice(0,6).map(a=>proofImg(a)).join("")}</div>
      ${j.summary?`<div style="white-space:pre-wrap;font-size:.88rem">${esc(j.summary)}</div>`:""}
      ${(j.questions||[]).length?`<div class="note">${j.questions.map(q=>"• "+esc(q)).join("<br>")}</div>`:""}
      <div class="o-meta" style="display:flex;justify-content:space-between;align-items:center"><span>${n} screenshot${n===1?"":"s"} · ${new Date(j.time).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})}</span><span>
      ${j.status==="done"&&((j.created||[]).length||(j.updated||[]).length)?`<button class="link del" type="button" data-jundo="${j.id}">Undo</button>`:""}
      ${(j.status==="new"&&age>8)?`<button class="link" type="button" data-jretry="${j.id}" style="color:var(--primary)">Retry</button>`:""}
      <button class="link" type="button" data-jdel="${j.id}">Hide</button></span></div></div>`}).join("");
  el.querySelectorAll("[data-jundo]").forEach(b=>twoTap(b,async()=>{const j=recs.find(x=>x.id===b.dataset.jundo);if(!j)return;
    for(const id of j.created||[]){try{await delRec(id)}catch(e){}}for(const u of j.updated||[]){try{if(u&&u.prev&&u.prev.id)await putRec(u.prev)}catch(e){}}
    await patchRec(j.id,{status:"undone"});toast("Undone")}));
  el.querySelectorAll("[data-jretry]").forEach(b=>b.onclick=async()=>{try{await mcp.callTool("Claude Code Remote","fire_trigger",{trigger_id:READER_TRIG,text:"Process intake job "+b.dataset.jretry},{cache:false});toast("Sent again")}catch(e){toast("Couldn't send. Try again.")}});
  el.querySelectorAll("[data-jdel]").forEach(b=>b.onclick=async()=>{try{await delRec(b.dataset.jdel)}catch(e){}});
}

// ================= ANDROID APP (APK) MODE — active only inside the P2P Order Book APK
const APK=!!window.P2PNative;window.P2P_APK=APK;
function apkInfo(){try{return JSON.parse(window.P2PNative.appInfo()||"{}")}catch(e){return{}}}
if(APK){const N=window.P2PNative;document.body.classList.add("apk");
  try{document.querySelector('#dAll .dgrp[data-g="app"] .dlist').insertAdjacentHTML("afterbegin",'<button type="button" class="dri" data-sheet="dbphone"><span class="qri t-green"><svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg></span><span class="qrt"><b>Database phone</b><small>Copy of all data on your 2nd phone</small></span><em class="dmeta" data-m="dbphone"></em><span class="dch"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button>')}catch(e){}
  const b64=b=>new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result).split(",")[1]||"");fr.onerror=no;fr.readAsDataURL(b)});
  // data lives in a file on the phone (no browser size limit)
  lsLoad=function(){let t="";try{t=N.loadData()||""}catch(e){}if(!t){try{t=localStorage.getItem(LS)||""}catch(e){}}try{recs=JSON.parse(t||"[]")}catch(e){recs=[]}splitRecs()};
  lsSave=function(){try{const r=N.saveData(JSON.stringify(recs));if(r!=="ok")toast("Couldn't save on phone: "+r)}catch(e){toast("Couldn't save on phone")}dbsSoon()};
  // downloads → phone Downloads folder
  dlApi={save:async({filename,data})=>{const blob=data instanceof Blob?data:new Blob([data],{type:/\.json$/i.test(filename)?"application/json":/\.csv$/i.test(filename)?"text/csv":"text/plain"});
    const r=N.saveFile(filename,await b64(blob),blob.type||"application/octet-stream");if(r!=="ok"){const e=new Error(r);e.code="failed";throw e}toast("Saved in Downloads: "+filename)}};
  // payment screenshots → app storage, shown at /_blob/<id>
  assetsApi={upload:async blob=>{const ext=((blob.type||"image/jpeg").split("/")[1]||"jpg").replace("jpeg","jpg").replace(/[^a-z0-9]/g,"").slice(0,5)||"bin";const id="a"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)+"."+ext;
      const r=N.saveBlob(id,await b64(blob));if(r!=="ok")throw new Error(r);return{id,url:"/_blob/"+id,sizeBytes:blob.size,contentType:blob.type}},
    list:async()=>{let a=[];try{a=JSON.parse(N.listBlobs()||"[]")}catch(e){}return{assets:a,usage:{}}},delete:async id=>{N.deleteBlob(String(id))}};
  // share sheet + clipboard through Android
  try{Object.defineProperty(navigator,"canShare",{value:d=>!!(d&&((d.files&&d.files.length)||d.text||d.url)),configurable:true});
    Object.defineProperty(navigator,"share",{value:async d=>{d=d||{};if(d.files&&d.files.length){const f=d.files[0];N.shareFile(f.name||"file",await b64(f),f.type||"application/octet-stream",d.text||d.title||"");return}N.shareText([d.title,d.text,d.url].filter(Boolean).join("\n"))},configurable:true})}catch(e){}
  try{Object.defineProperty(navigator,"clipboard",{value:{writeText:async t=>{N.copy(String(t))},readText:async()=>{try{return N.paste()||""}catch(e){return""}}},configurable:true})}catch(e){}
  // AI: Claude's built-in AI only exists inside Claude → P2P Brain (offline) or your own key
  try{const o=document.querySelector('#ai-prov option[value="builtin"]');if(o)o.remove();if(aiCfg.prov==="builtin"){aiCfg.prov="brain";localStorage.setItem(AIK,JSON.stringify(aiCfg))}$("#ai-prov").value=aiCfg.prov;aiFormSync()}catch(e){}
  // called by the Android side
  window.P2PUpdated=v=>{const t=document.createElement("div");t.className="apkup";t.innerHTML=`<b>✓ ${APP_NAME} updated · v${esc(String(v))}</b><button type="button">Reload</button>`;t.querySelector("button").onclick=()=>location.reload();document.body.appendChild(t);setTimeout(()=>t.remove(),20000)};
  window.P2PApkUpdate=info=>{info=info||{};openSheet(`<div class="insw"><div class="abh"><span class="dlogo dl2 abl">${PX_LOGO}</span><b>New ${APP_NAME} version</b><small>${esc(info.name||"")}</small></div>
    ${info.notes?`<div class="icard"><p class="note" style="margin:0;white-space:pre-wrap">${esc(info.notes)}</p></div>`:""}<p class="note">Download, then tap Install. It installs over this app — your data stays.</p>
    <div class="row2"><button type="button" class="mini ghost" data-close>Later</button><button type="button" class="mini psdl" id="apk-dl">Download update</button></div></div>`,el=>{el.querySelector("#apk-dl").onclick=()=>{N.openUrl(info.url||"");closeSheet()}})};
  window.P2PBack=()=>{const lk=$("#lock");if(lk&&!lk.hidden)return false;const fo=$("#dFold");if(fo&&!fo.hidden){closeFolder();return true}
    if(!$("#sheetBg").hidden){closeSheet();return true}if(!$("#drawer").hidden){$("#drawer").hidden=true;return true}const ap=$("#aiPop");if(ap&&!ap.hidden){closeAiPop();return true}
    const us=$("#us");if(us&&!us.hidden&&typeof closeUS==="function"){closeUS();return true}if($("#p-home").hidden){goPage("home");return true}return false};
  window.P2PCheckResult=msg=>{toast(msg);const b=document.getElementById("ab-chk");if(b){b.disabled=false;b.textContent="Check for updates"}};
}
// ---- Database phone sync (APK only): keeps a copy of every record on your always-on phone
const DBS_K="p2p_dbs";let dbsCfg={url:"",token:"",on:false,last:0,err:""};try{Object.assign(dbsCfg,JSON.parse(localStorage.getItem(DBS_K)||"{}"))}catch(e){}
let dbsHash={};try{dbsHash=JSON.parse(localStorage.getItem("p2p_dbs_h")||"{}")}catch(e){}
const dbsSaveCfg=()=>{try{localStorage.setItem(DBS_K,JSON.stringify(dbsCfg))}catch(e){}};
const dbsSaveHash=()=>{try{localStorage.setItem("p2p_dbs_h",JSON.stringify(dbsHash))}catch(e){}};
let dbsT=0,dbsBusy=false;function dbsSoon(){if(!APK||!dbsCfg.on)return;clearTimeout(dbsT);dbsT=setTimeout(()=>dbsSync(false),4000)}
async function dbsReq(path,opt){opt=opt||{};const ctl=new AbortController();const tt=setTimeout(()=>ctl.abort(),15000);
  try{const r=await fetch(dbsCfg.url.replace(/\/+$/,"")+path,{...opt,signal:ctl.signal,headers:{"X-Token":dbsCfg.token,"Content-Type":"application/json"}});if(r.status===401)throw new Error("Wrong token");if(!r.ok)throw new Error("Server error "+r.status);return r.status===204?null:r.json()}finally{clearTimeout(tt)}}
async function dbsSync(pull){if(!dbsCfg.on||!dbsCfg.url||dbsBusy)return;dbsBusy=true;let up=0,down=0,del=0;
  try{if(pull){const remote=await dbsReq("/records");const local=new Map(recs.map(r=>[r.id,r]));const rIds=new Set();let changed=false;
      remote.forEach(r=>{if(!r||!r.id)return;rIds.add(r.id);const l=local.get(r.id);const rh=impHash(JSON.stringify(r));
        if(!l){if(!dbsHash[r.id]){recs.push(r);dbsHash[r.id]=rh;changed=true;down++}}
        else{const lh=impHash(JSON.stringify(l));if(lh!==rh&&lh===dbsHash[r.id]){Object.assign(l,r);Object.keys(l).forEach(k=>{if(!(k in r))delete l[k]});dbsHash[r.id]=rh;changed=true;down++}}});
      recs=recs.filter(r=>{if(!rIds.has(r.id)&&dbsHash[r.id]&&impHash(JSON.stringify(r))===dbsHash[r.id]){delete dbsHash[r.id];changed=true;del++;return false}return true});
      if(changed){try{window.P2PNative.saveData(JSON.stringify(recs))}catch(e){}splitRecs();render()}}
    const cur=new Set();for(const r of recs){cur.add(r.id);const h=impHash(JSON.stringify(r));if(dbsHash[r.id]!==h){await dbsReq("/records/"+encodeURIComponent(r.id),{method:"PUT",body:JSON.stringify(r)});dbsHash[r.id]=h;up++}}
    for(const id of Object.keys(dbsHash))if(!cur.has(id)){await dbsReq("/records/"+encodeURIComponent(id),{method:"DELETE"});delete dbsHash[id];del++}
    dbsCfg.last=Date.now();dbsCfg.err="";dbsSaveHash();dbsSaveCfg();dbsBadge(true)}
  catch(e){dbsCfg.err=e&&e.name==="AbortError"?"Database phone not reachable":String(e&&e.message||e);dbsSaveCfg();dbsSaveHash();dbsBadge(false)}
  finally{dbsBusy=false}return{up,down,del}}
function dbsBadge(ok){const n=$("#syncNote");if(!n||!APK||!dbsCfg.on)return;n.textContent=ok?"Synced with database phone":"Database phone offline · saved on this phone";n.classList.toggle("ok",ok)}
if(APK&&dbsCfg.on){setTimeout(()=>dbsSync(true),2500);setInterval(()=>dbsSync(true),5*60e3);document.addEventListener("visibilitychange",()=>{if(!document.hidden)dbsSync(true)})}
sheets.dbphone=function(){const ago=dbsCfg.last?Math.round((Date.now()-dbsCfg.last)/6e4):null;
  openSheet(`<div class="insw"><div class="insh"><h3>Database phone</h3><span class="note">${dbsCfg.on?"On":"Off"}</span></div>
    <p class="note">Keeps a full copy of your data on your second phone (always on charge). If this phone is lost, nothing is lost.</p>
    ${dbsCfg.on?`<div class="wahero ${dbsCfg.err?"":"on"}"><span class="wadot"></span><div><b>${dbsCfg.err?"Not reachable":"Connected"}</b><small>${dbsCfg.err?esc(dbsCfg.err):ago!=null?`Last sync ${ago<1?"just now":ago+" min ago"}`:"Not synced yet"}</small></div><button type="button" class="mini ghost" id="dbp-now">Sync now</button></div>`:""}
    <div class="icard"><label class="pcl">Server address<input id="dbp-url" inputmode="url" value="${esc(dbsCfg.url)}" placeholder="http://100.x.x.x:8080"></label><label class="pcl">Token<input id="dbp-tok" type="password" autocomplete="off" value="${esc(dbsCfg.token)}" placeholder="From the database phone"></label>
      <div class="abbtn"><button type="button" class="mini ghost" id="dbp-test">Test</button><button type="button" class="mini psdl" id="dbp-save">${dbsCfg.on?"Save":"Save and turn on"}</button></div><p class="note wsst" id="dbp-st"></p></div>
    ${dbsCfg.on?'<button type="button" class="link del" id="dbp-off">Turn off sync</button>':""}
    <details class="wahelp"><summary>How to set up the database phone</summary><ol><li>On the second phone install <b>Termux</b> (from F-Droid) and <b>Tailscale</b> (Play Store).</li><li>Sign in to Tailscale with the same Gmail on both phones.</li><li>In Termux: <code>pkg install python</code>, copy <b>server.py</b>, run <code>python server.py</code>. It shows a token.</li><li>Here: address <code>http://100.x.x.x:8080</code> (from Tailscale) + that token → Save.</li></ol></details></div>`,el=>{const q=s=>el.querySelector(s),st=q("#dbp-st");
    const rd=()=>({url:q("#dbp-url").value.trim().replace(/\/+$/,""),token:q("#dbp-tok").value.trim()});
    q("#dbp-test").onclick=async()=>{const c=rd();if(!/^https?:\/\//.test(c.url)){st.textContent="Address must start with http://";return}st.className="note wsst";st.textContent="Testing…";const old={...dbsCfg};Object.assign(dbsCfg,c);
      try{await dbsReq("/ping");await dbsReq("/records");st.className="note wsst ok";st.textContent="✓ Connected"}catch(e){st.className="note wsst bad";st.textContent=e.name==="AbortError"?"Not reachable. Is Termux and Tailscale on?":e.message}Object.assign(dbsCfg,old)};
    q("#dbp-save").onclick=async()=>{const c=rd();if(!/^https?:\/\//.test(c.url)||!c.token){st.textContent="Enter the address and token";return}Object.assign(dbsCfg,c,{on:true});dbsSaveCfg();st.textContent="Syncing…";const r=await dbsSync(true);if(dbsCfg.err){st.className="note wsst bad";st.textContent=dbsCfg.err}else{toast(`Synced · ${r.up} sent, ${r.down} received`);sheets.dbphone()}};
    if(q("#dbp-now"))q("#dbp-now").onclick=async()=>{const r=await dbsSync(true);toast(dbsCfg.err?dbsCfg.err:`Synced · ${r.up} sent, ${r.down} received`);sheets.dbphone()};
    if(q("#dbp-off"))twoTap(q("#dbp-off"),()=>{dbsCfg.on=false;dbsSaveCfg();sheets.dbphone()});
  })};
// boot
applyTheme();if(devGet("p2p_hide_default","0")==="1")hideAmt=true;
lsLoad();applyPrefs();applyFormDefaults();render();updateChrome();
// Pictures shared from the phone gallery (Share > Pexai) go straight into Smart intake and are read at once
window.P2PCheckShared=async function(){
  try{
    if(!(window.P2PNative&&typeof P2PNative.takeShared==="function"))return;
    const names=JSON.parse(P2PNative.takeShared()||"[]");if(!names.length)return;
    const files=[];
    for(const n of names){try{const r=await fetch("/_blob/"+encodeURIComponent(n));if(!r.ok)continue;const b=await r.blob();files.push(new File([b],n,{type:b.type&&/^image\//.test(b.type)?b.type:"image/jpeg"}))}catch(e){}}
    try{P2PNative.dropShared(JSON.stringify(names))}catch(e){}
    if(!files.length){toast("Could not read the shared picture");return}
    if(!$("#sheetBg").hidden)closeSheet();
    goPage("intake");
    i2Add(files);
    toast(files.length>1?"Reading "+files.length+" screenshots…":"Reading your screenshot…");
    setTimeout(()=>{try{if(i2Files.length&&!ixS.busy)ixRun()}catch(e){}},500);
  }catch(e){console.error(e)}
};
setTimeout(()=>{try{P2PCheckShared()}catch(e){}},900);

(async()=>{
  const C=window.claude;
  if(!C||!C.use){($("#syncNote").classList.add("ok"),$("#syncNote").textContent="Saved on this device");if(aiCfg.prov==="builtin"||isBrain())setAiState(true,isBrain()?(aiOnline()?(aiCfg.prov==="braingemini"?"P2P Brain + Gemini (smart)":"P2P Brain + Claude (smart)"):"P2P Brain · offline"):"App assistant · offline");return}
  const [db,user,sample]=await Promise.all([C.use("db"),C.use("user"),C.use("sample")]);
  sampleFn=sample;
  if(sample&&sample.limits)sample.limits().then(l=>{i2Max=l&&l.images?Math.min(5,l.images.maxCount):0}).catch(()=>{});
  C.use("mcp").then(m=>{mcp=m;$("#nowBtn").hidden=!m});
  C.use("assets").then(a=>{assetsApi=a});C.use("downloads").then(d=>{dlApi=d});
  if(isBrain())setAiState(true,aiOnline()?(aiCfg.prov==="braingemini"?"P2P Brain + Gemini (smart)":"P2P Brain + Claude (smart)"):"P2P Brain · offline");else if(aiCfg.prov==="builtin")setAiState(true,sample?"Built-in connected":"App assistant · offline");
  else setAiState(null,PROV[aiCfg.prov].n+(aiCfg.key?" · key saved":" · add key"));
  if(db&&user){
    try{
      const uid=await user.id();
      col=db.collection("data/users/"+uid);
      reqCol=db.collection("requests");
      reqCol.onSnapshot(sn=>{reqs=sn.docs.map(d=>({...d.data(),id:d.id}));renderReqs()},()=>{reqCol=null;renderReqs()});
      col.onSnapshot(snap=>{recs=snap.docs.map(d=>({...d.data(),id:d.data().id||d.id}));splitRecs();applyPrefs();render();if(!$("#p-settings").hidden)loadSettingsForm();$("#syncNote").textContent="Cloud sync";$("#syncNote").classList.add("ok")},
        ()=>{col=null;lsLoad();render();($("#syncNote").classList.add("ok"),$("#syncNote").textContent="Saved on this device")});
    }catch(e){($("#syncNote").classList.add("ok"),$("#syncNote").textContent="Saved on this device")}
  }else ($("#syncNote").classList.add("ok"),$("#syncNote").textContent="Saved on this device");
})();

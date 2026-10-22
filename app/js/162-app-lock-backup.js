// ---------- app lock (PIN) ----------
async function sha(t){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("p2p:"+t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){let h=0;for(const c of "p2p:"+t)h=(h*31+c.charCodeAt(0))|0;return "x"+h}}
let lockMode="unlock",pinBuf="",pinFirst="",hiddenAt=0;
function lockDraw(){$("#lockDots").innerHTML=[0,1,2,3].map(i=>`<i class="${i<pinBuf.length?"on":""}"></i>`).join("")}
function showLock(mode){lockMode=mode;try{$("#lockBrand").innerHTML=`<span class="dlogo dl2 abl">${PX_LOGO.replace(/pxg/g,"pxl")}</span>${pxWord()}`}catch(e){}pinBuf="";pinFirst="";$("#lockTitle").textContent=mode==="set"?"Choose a 4-digit PIN":"Enter PIN";$("#lockForgot").hidden=mode!=="unlock";$("#lock").hidden=false;lockDraw()}
$("#lockPad").innerHTML=[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-k="${n}">${n}</button>`).join("")+`<button type="button" class="ghost" data-k="c">Cancel</button><button type="button" data-k="0">0</button><button type="button" class="ghost" data-k="b">⌫</button>`;
$("#lockPad").onclick=async e=>{const b=e.target.closest("[data-k]");if(!b)return;const k=b.dataset.k;
  if(k==="b"){pinBuf=pinBuf.slice(0,-1);lockDraw();return}
  if(k==="c"){if(lockMode==="unlock")return;$("#lock").hidden=true;return}
  if(pinBuf.length>=4)return;pinBuf+=k;lockDraw();if(pinBuf.length<4)return;
  const bad=()=>{const d=$("#lockDots");d.classList.remove("shake");void d.offsetWidth;d.classList.add("shake");setTimeout(()=>{pinBuf="";lockDraw()},300)};
  if(lockMode==="unlock"){if(await sha(pinBuf)===devGet("p2p_pin","")){$("#lock").hidden=true;pinBuf=""}else bad();return}
  if(!pinFirst){pinFirst=pinBuf;pinBuf="";$("#lockTitle").textContent="Enter the same PIN again";lockDraw();return}
  if(pinFirst===pinBuf){devSet("p2p_pin",await sha(pinBuf));$("#lock").hidden=true;toast("App lock on");pinState()}else{pinFirst="";$("#lockTitle").textContent="Didn't match. Choose a 4-digit PIN";bad()}};
$("#lockForgot").onclick=()=>{$("#lockTitle").textContent="Remove the lock on this device? Your data stays in your account.";if(!$("#lockForgot").dataset.c){$("#lockForgot").dataset.c="1";$("#lockForgot").textContent="Reset PIN on this device";return}
  devSet("p2p_pin","");$("#lock").hidden=true;$("#lockForgot").dataset.c="";$("#lockForgot").textContent="Forgot PIN?";toast("PIN removed. Set a new one in Settings");pinState()};
function pinState(){const on=pinHas();$("#pinState").textContent=on?"On · this device only":"Off · this device only";$("#pinBtn").textContent=on?"Turn off":"Set PIN"}
$("#pinBtn").onclick=()=>{if(pinHas()){devSet("p2p_pin","");pinState();toast("App lock off")}else showLock("set")};
$("#st-lockmin").value=devGet("p2p_lockmin","0");$("#st-lockmin").onchange=e=>devSet("p2p_lockmin",e.target.value);
document.addEventListener("visibilitychange",()=>{if(document.hidden){hiddenAt=Date.now()}else if(pinHas()&&hiddenAt&&Date.now()-hiddenAt>=(+devGet("p2p_lockmin","0"))*6e4){showLock("unlock")}});
if(pinHas())showLock("unlock");
pinState();

// ---------- backup reminder ----------
function backupDue(){const d=+pref("bkDays");if(!d)return false;const last=+devGet("p2p_lastbk","0");return recs.length>0&&Date.now()-last>d*DAY}
function bkLabel(){const last=+devGet("p2p_lastbk","0");$("#bkLast").textContent=last?"Last backup "+new Date(last).toLocaleDateString("en-IN",{day:"numeric",month:"short"})+" on this device":"Never backed up on this device"}
const _saveFile=saveFile;saveFile=async(name,data)=>{await _saveFile(name,data);if(/backup/.test(name)){devSet("p2p_lastbk",String(Date.now()));bkLabel();renderAlerts()}};
$("#st-bkdays").onchange=e=>setPref("bkDays",+e.target.value);


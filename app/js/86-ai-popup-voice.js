// ---------- AI pop-up on every page
const AP_CHIPS={home:["aaj ka profit","is hafte kitna kamaya","pending orders","aaj ka report"],orders:["pending orders","kis time order zyada aate hain","loss kitna hua","mera score"],wallet:["balance","limit","agle hafte paisa kam padega","usdt kitna bacha"],direct:["kis kis ko dena baki hai","agle hafte paisa kam padega","is mahine ka profit"],coins:["kis rate pe ad lagau","usdt kitna bacha","is mahine ka profit"],add:["kis rate pe ad lagau","usdt kitna bacha","limit"],_:["aaj ka profit","kis kis ko dena baki hai","balance","help"]};
function apPage(){return Object.keys(PAGE_NAMES).find(k=>{const el=$("#p-"+k);return el&&!el.hidden})||"home"}
function openAiPop(){const pg=apPage();$("#apChips").innerHTML=[...new Set([...brApqTop(2),...(AP_CHIPS[pg]||AP_CHIPS._)])].slice(0,5).map(q=>`<button type="button" data-apq="${esc(q)}">${esc(q)}</button>`).join("");
  $("#apSub").dataset.on=aiOnline()?"1":"0";$("#apSub").textContent=isBrain()?(aiOnline()?(aiCfg.prov==="braingemini"?"P2P Brain + Gemini (smart)":"P2P Brain + Claude (smart)"):"P2P Brain · offline"):aiOnline()?PROV[aiCfg.prov].n+" + P2P Brain":"P2P Brain · offline";
  if(!$("#apMsgs").children.length){const d=document.createElement("div");d.className="apwelmsg";{const nm=(function(){try{return(localStorage.getItem("p2p_botname")||"").trim()}catch(e){return""}})()||"Pexai";d.innerHTML=`<div class="apwel"><span class="apbot herobot"><span class="lg"><i></i></span></span><h3>${esc(LA.t("Hi, I'm "+nm,"Namaste, main "+nm+" hoon"))}</h3><p>${esc(LA.t("Ask about profit, banks, parties and stock, or tell me what happened.","Profit, bank, party aur stock ka jawab, ya bolo kya hua."))}</p><div class="apgrid"><button type="button" data-apq="aaj ka profit"><svg viewBox="0 0 24 24"><path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/></svg>Aaj ka profit</button><button type="button" data-apq="usdt kitna bacha"><svg viewBox="0 0 24 24"><path d="M12 3l8 4v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>USDT stock</button><button type="button" data-apq="balance"><svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 9l9-5 9 5M7 13v3M12 13v3M17 13v3"/></svg>Bank balance</button><button type="button" data-apq="pending orders"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Pending orders</button><button type="button" data-apq="kis kis ko dena baki hai"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 5"/></svg>Party ka baaki</button><button type="button" data-apq="freeze risk kisme zyada hai"><svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>Bank risk</button></div><small>${esc(LA.t("Try","Aise bolo"))}: \"500 usdt 93 pe becha Ravi ko\"<br>${esc(LA.t("Your data stays on this phone.","Aapka data sirf is phone me rehta hai."))}</small></div>`}$("#apMsgs").appendChild(d)}
  try{const old=$("#apIns");if(old)old.remove();const I=brInsights();if(I.length){const c=document.createElement("div");c.id="apIns";c.className="apins";c.innerHTML=`<b>${LA.t("Needs your attention","Dhyan dene wali baatein")}<button type="button" class="apnz" data-nz>${LA.t("Hide for today","Aaj ke liye chhupao")}</button></b>`+I.map(x=>`<button type="button" class="${x.k}" data-apq="${esc(x.q)}">${esc(x.t)} ›</button>`).join("");$("#apMsgs").appendChild(c)}}catch(e){console.error(e)}
  {const p=$("#aiPop");p.classList.remove("closing","dragging","swipe");p.style.removeProperty("--dy");try{const f=$("#aiFab");let ox="50%",oy="100%";if(f&&!f.hidden){const r=f.getBoundingClientRect(),W=innerWidth,H=innerHeight,bw=Math.min(W,520),bh=Math.min(H*.78,640);ox=(r.left+r.width/2-(W-bw)/2)+"px";oy=(r.top+r.height/2-(H-bh))+"px"}p.style.setProperty("--ox",ox);p.style.setProperty("--oy",oy)}catch(e){}document.documentElement.classList.add("aplock");p.hidden=false;void p.offsetHeight;requestAnimationFrame(()=>p.classList.add("open"));setTimeout(()=>{if(window.apSnap)window.apSnap()},620);{const f=$("#aiFab");if(f)f.classList.add("under")}}}
function closeAiPop(swipe){const p=$("#aiPop");if(p.hidden||p.classList.contains("closing"))return;try{document.activeElement&&document.activeElement.blur()}catch(e){}try{const f=$("#aiFab");if(f&&!f.hidden&&!swipe){const r=f.getBoundingClientRect(),W=innerWidth,H=innerHeight,bw=Math.min(W,520),bh=Math.min(H*.78,640);p.style.setProperty("--ox",(r.left+r.width/2-(W-bw)/2)+"px");p.style.setProperty("--oy",(r.top+r.height/2-(H-bh))+"px")}}catch(e){}p.classList.toggle("swipe",swipe===true);p.classList.add("closing");p.classList.remove("open","dragging");if(swipe!==true)p.style.removeProperty("--dy");setTimeout(()=>{const f=$("#aiFab");if(f)f.classList.remove("under")},swipe===true?160:200);setTimeout(()=>{p.hidden=true;p.classList.remove("closing","swipe","kb","kbgo","kbflip");p.style.removeProperty("--kb");p.style.removeProperty("--dy");document.documentElement.classList.remove("aplock")},320)}
(function(){const f=$("#aiFab");if(!f)return;const K="p2p_fabpos";let moved=false,want=null,FH=innerHeight,FW=innerWidth;
function full(){FH=Math.max(FH,innerHeight);FW=Math.max(FW,innerWidth)}
function clamp(x,y){const W=innerWidth,H=innerHeight,w=f.offsetWidth||46,h=f.offsetHeight||60;return[Math.min(Math.max(4,x),W-w-4),Math.min(Math.max(4,y),H-h-4)]}
function put(x,y){[x,y]=clamp(x,y);f.style.left=x+"px";f.style.top=y+"px";f.style.right="auto";f.style.bottom="auto"}
function apply(){if(!want)return;full();put(want.x*FW,want.y*FH)}
function load(){try{const v=JSON.parse(localStorage.getItem(K)||"null");if(v&&isFinite(v.x)&&isFinite(v.y)){want={x:v.x,y:v.y};apply()}}catch(e){}}
function save(){try{full();const r=f.getBoundingClientRect();want={x:r.left/FW,y:r.top/FH};localStorage.setItem(K,JSON.stringify(want))}catch(e){}}
let sx,sy,ox,oy,id=null;
f.addEventListener("pointerdown",e=>{id=e.pointerId;sx=e.clientX;sy=e.clientY;const r=f.getBoundingClientRect();ox=r.left;oy=r.top;moved=false;try{f.setPointerCapture(id)}catch(_){}});
f.addEventListener("pointermove",e=>{if(e.pointerId!==id)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(!moved&&Math.hypot(dx,dy)<8)return;moved=true;f.classList.add("drag");put(ox+dx,oy+dy)});
function snapEdge(){const r=f.getBoundingClientRect();f.style.transition="left .28s cubic-bezier(.3,.9,.3,1),translate .5s,opacity .4s";put(r.left+r.width/2<innerWidth/2?4:innerWidth-r.width-4,r.top);save();setTimeout(()=>{f.style.transition=""},330)}
window.fabSnapNow=snapEdge;
function end(e){if(e.pointerId!==id)return;id=null;f.classList.remove("drag");if(moved){if(localStorage.getItem("p2p_fabsnap")==="1")snapEdge();else save();setTimeout(()=>{moved=false},60)}}
f.addEventListener("pointerup",end);f.addEventListener("pointercancel",end);
f.addEventListener("click",e=>{if(moved){e.stopImmediatePropagation();e.preventDefault()}},true);
addEventListener("resize",()=>{if(want)apply()});addEventListener("orientationchange",()=>{FH=innerHeight;FW=innerWidth;setTimeout(apply,300)});
window.fabReset=function(){want=null;f.style.left=f.style.top=f.style.right=f.style.bottom="";try{localStorage.removeItem(K)}catch(e){}};
load()})();
(function(){const f=$("#aiFab");if(!f)return;let idle=Date.now(),lastN="",seen=null,tk=0,I=[],lastBub=0,tapT=null,lp=false,lpT=null,sx=0,sy=0,bub=null,menu=null;
const LSg=k=>{try{return localStorage.getItem(k)}catch(e){return null}},LSs=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const wake=()=>{idle=Date.now();if(f.classList.contains("sleep"))f.classList.remove("sleep","sleepL","sleepR")};
["pointerdown","keydown","touchstart","scroll","click"].forEach(ev=>addEventListener(ev,wake,{passive:true,capture:true}));
function nameSet(){const n=(LSg("p2p_botname")||"").trim().slice(0,16);const h=$("#apName");if(h)h.textContent=n||"Ask anything";return n}
nameSet();
function near(el,r){const W=innerWidth,H=innerHeight,w=el.offsetWidth,h=el.offsetHeight;let x=r.left+r.width/2>W/2?r.left-w-8:r.right+8;x=Math.min(Math.max(6,x),W-w-6);let y=Math.min(Math.max(6,r.top+r.height/2-h/2),H-h-6);el.style.left=x+"px";el.style.top=y+"px"}
function closeBub(){if(bub){bub.remove();bub=null}}
function closeMenu(){if(menu){menu.remove();menu=null}}
function say(t,ms){if(f.hidden)return;const pop=$("#aiPop");if(pop&&!pop.hidden)return;closeBub();const d=document.createElement("div");d.className="fabbub";const n=nameSet();d.innerHTML=(n?`<b>${esc(n)}</b>`:"")+esc(t);document.body.appendChild(d);near(d,f.getBoundingClientRect());d.onclick=()=>{closeBub();openAiPop()};bub=d;lastBub=Date.now();setTimeout(()=>{if(bub===d)closeBub()},ms||6000)}
function happy(big){wake();f.classList.add("happy");f.classList.toggle("hopbig",!!big);setTimeout(()=>f.classList.remove("happy","hopbig"),big?3600:2200)}
window.fabHappy=happy;window.fabSay=say;
function dbl(){closeBub();openAiPop();setTimeout(()=>{try{voiceMode()}catch(e){}},320)}
f.addEventListener("click",e=>{e.stopImmediatePropagation();e.preventDefault();if(lp){lp=false;return}closeBub();closeMenu();
  if(tapT){clearTimeout(tapT);tapT=null;dbl();return}tapT=setTimeout(()=>{tapT=null;openAiPop()},240)},true);
f.addEventListener("pointerdown",e=>{f.classList.add("tap");setTimeout(()=>f.classList.remove("tap"),340);sx=e.clientX;sy=e.clientY;clearTimeout(lpT);lpT=setTimeout(()=>{lp=true;if(navigator.vibrate)try{navigator.vibrate(15)}catch(_){}openMenu()},550)});
f.addEventListener("pointermove",e=>{if(lpT&&Math.hypot(e.clientX-sx,e.clientY-sy)>8){clearTimeout(lpT);lpT=null}});
["pointerup","pointercancel"].forEach(ev=>f.addEventListener(ev,()=>{clearTimeout(lpT);lpT=null;if(lp)setTimeout(()=>{lp=false},400)}));
function openMenu(){closeBub();closeMenu();const m=document.createElement("div");m.className="fabmenu";const snap=LSg("p2p_fabsnap")==="1";
  m.innerHTML=`<small>${LA.t("Bot name","Bot ka naam")}</small><input id="fbName" maxlength="16" placeholder="${LA.t("e.g. Pexi","jaise Pexi")}" value="${esc(nameSet())}"><button type="button" class="pr" data-fb="name">${LA.t("Save name","Naam save karo")}</button><button type="button" data-fb="snap">${LA.t("Stick to edge","Kinaare par chipko")}: ${snap?"ON":"OFF"}</button><button type="button" data-fb="reset">${LA.t("Reset position","Jagah reset karo")}</button>`;
  document.body.appendChild(m);near(m,f.getBoundingClientRect());menu=m;
  m.onclick=e=>{const b=e.target.closest("[data-fb]");if(!b)return;const k=b.dataset.fb;
    if(k==="name"){LSs("p2p_botname",($("#fbName").value||"").trim());nameSet();closeMenu();say(LA.t("Hi, I'm "+(nameSet()||"your assistant")+"!","Namaste, main "+(nameSet()||"aapka assistant")+" hoon!"),3500)}
    else if(k==="snap"){const on=LSg("p2p_fabsnap")!=="1";LSs("p2p_fabsnap",on?"1":"0");closeMenu();if(on&&window.fabSnapNow)window.fabSnapNow();toast(on?LA.t("Bot will stick to the edge","Bot kinaare par chipkega"):LA.t("Bot stays where you leave it","Bot jahan chhodoge wahin rahega"))}
    else if(k==="reset"){closeMenu();if(window.fabReset)window.fabReset()}};
  setTimeout(()=>{const off=e=>{if(menu&&!menu.contains(e.target)){closeMenu();document.removeEventListener("pointerdown",off,true)}};document.addEventListener("pointerdown",off,true)},50)}
function thinking(){const pop=$("#aiPop");if(!pop||pop.hidden)return false;const m=$("#apMsgs");const l=m&&m.lastElementChild;return !!(l&&l.querySelector&&l.querySelector(".thk"))}
function tick(){try{const th=thinking();f.classList.toggle("think",th);{const ab=$("#apBot");if(ab)ab.classList.toggle("think",th)}const hr=new Date().getHours();f.classList.toggle("night",hr>=23||hr<5);
 if(f.hidden){closeBub();closeMenu()}
 // happy: a new completed order
 try{const done=new Set(orders.filter(o=>o.status==="Completed").map(o=>o.id));if(seen===null)seen=done;else{const nw=orders.filter(o=>o.status==="Completed"&&!seen.has(o.id));seen=done;if(nw.length&&nw.length<=3){const big=nw.some(o=>orderTotal(o)>=5e4);happy(big);if(big)say(LA.t("Big order completed 🎉","Bada order complete ho gaya 🎉"),5000)}}}catch(e){}
 if(!document.hidden&&!f.hidden&&!th){if(tk++%6===0){try{I=brInsights()}catch(e){I=[]}
  const has=I.length>0,red=I.some(x=>x.k==="r");f.classList.toggle("alert",has);f.classList.toggle("amb",has&&!red);f.classList.toggle("warn",red);f.classList.toggle("ok",!has);
  const sig=I.map(x=>x.t).join("|");if(has&&sig!==lastN){lastN=sig;wake();f.classList.add("nudge");setTimeout(()=>f.classList.remove("nudge"),1500);if(Date.now()-lastBub>60000)say(I[0].t+(I.length>1?" (+"+(I.length-1)+")":""),6500)}if(!has)lastN="";
  // morning note about last night
  if(hr>=5&&hr<11){const day=new Date().toDateString();if(LSg("p2p_morning")!==day){try{const nw=brWin("kal raat order");const c=nw?orders.filter(o=>o.time>=nw.a&&o.time<nw.b&&o.status==="Cancelled").length:0;if(c>0&&Date.now()-lastBub>8000){LSs("p2p_morning",day);say(LA.t(`Good morning! ${c} order${c>1?"s":""} cancelled last night.`,`Good morning! Kal raat ${c} order cancel hue.`),8000)}}catch(e){}}}}}
 const pop=$("#aiPop");const idleMs=Date.now()-idle;
 if(idleMs>25000&&!f.hidden&&(!pop||pop.hidden)&&!f.classList.contains("sleep")&&!f.classList.contains("drag")){closeBub();f.classList.add("sleep");const r=f.getBoundingClientRect(),W=innerWidth;if(W-r.right<70)f.classList.add("sleepR");else if(r.left<70)f.classList.add("sleepL")}
}catch(e){}}
setInterval(tick,1000);setTimeout(tick,1500)})();
(function(){const box=document.getElementById("apMsgs");if(!box)return;
const IC={"⚠":'<svg class="wi" viewBox="0 0 24 24"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.4v.2"/></svg>',"✅":'<svg class="wi ok" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',"❌":'<svg class="wi no" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>'};
const RE=/(⚠️?|✅|❌|👋\s?)/g;let busy=false;
function fix(){if(busy)return;busy=true;try{box.querySelectorAll(".msg.a").forEach(m=>{const w=document.createTreeWalker(m,NodeFilter.SHOW_TEXT);const hits=[];let n;while((n=w.nextNode())){if(RE.test(n.nodeValue))hits.push(n);RE.lastIndex=0}
 hits.forEach(t=>{const html=t.nodeValue.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(RE,x=>{const k=x.replace("️","").trim();return IC[k]||""});const sp=document.createElement("span");sp.innerHTML=html;t.replaceWith(...sp.childNodes)})})}catch(e){}busy=false}
new MutationObserver(fix).observe(box,{childList:true,subtree:true,characterData:true})})();
(function(){const p=$("#aiPop"),h=p&&p.querySelector(".aphead");if(!h)return;let y0=0,t0=0,dy=0,on=false,id=null;
h.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;on=true;id=e.pointerId;y0=e.clientY;t0=Date.now();dy=0;try{h.setPointerCapture(id)}catch(_){}});
h.addEventListener("pointermove",e=>{if(!on||e.pointerId!==id)return;dy=Math.max(0,e.clientY-y0);if(dy>4){p.classList.add("dragging");p.style.setProperty("--dy",dy+"px");p.style.background="rgba(10,14,22,"+Math.max(0,.4*(1-dy/420))+")"}});
function end(e){if(!on||(e&&e.pointerId!==id))return;on=false;p.classList.remove("dragging");p.style.background="";const v=dy/Math.max(1,Date.now()-t0);if(dy>120||v>.7&&dy>30)closeAiPop(true);else p.style.setProperty("--dy","0px")}
h.addEventListener("pointerup",end);h.addEventListener("pointercancel",end)})();
(function(){const p=$("#aiPop"),box=p&&p.querySelector(".apbox");if(!box)return;let prev=null,full=innerHeight,tm=0;
function snap(){if(p.hidden)return;const r=box.getBoundingClientRect();if(r.height>0&&p.classList.contains("open"))prev={b:r.bottom,h:r.height}}
window.apSnap=snap;
addEventListener("resize",()=>{const H=innerHeight;full=Math.max(full,H);if(p.hidden){prev=null;return}
 const wasKb=p.classList.contains("kb");const nowKb=H<full*.8;if(wasKb===nowKb&&Math.abs(H-(prev?prev.b:H))<60){return}
 const old=prev;p.classList.toggle("kb",nowKb);
 if(!old||!p.classList.contains("open")){setTimeout(snap,350);return}
 p.classList.remove("kbgo");p.classList.add("kbflip");box.style.height=old.h+"px";p.style.setProperty("--kb","0px");void box.offsetHeight;
 const nb=box.getBoundingClientRect().bottom;p.style.setProperty("--kb",(old.b-nb)+"px");void box.offsetHeight;
 p.classList.remove("kbflip");p.classList.add("kbgo");box.style.height="";p.style.setProperty("--kb","0px");
 clearTimeout(tm);tm=setTimeout(()=>{p.classList.remove("kbgo");snap()},380)});
p.addEventListener("transitionend",e=>{if(e.target===box&&e.propertyName==="transform"&&!p.classList.contains("kbgo"))snap()})})();
$("#aiFab").onclick=openAiPop;$("#apClose").onclick=closeAiPop;$("#aiPop").addEventListener("click",e=>{if(e.target.id==="aiPop")closeAiPop()});
$("#apMax").onclick=()=>{closeAiPop();setTimeout(()=>goTo("ai"),230)};
$("#apForm").onsubmit=e=>{e.preventDefault();const q=$("#apIn").value.trim();if(!q){if($("#apSend").classList.contains("vcap")){try{voiceMode()}catch(err){}}return}if(window.apSendSync)setTimeout(window.apSendSync,0);$("#apIn").value="";ask(q)};
$("#apChips").onclick=e=>{const b=e.target.closest("[data-apq]");if(b)ask(b.dataset.apq)};
$("#apMsgs").addEventListener("click",e=>{const tl=e.target.closest(".apgrid [data-apq]");if(tl){ask(tl.dataset.apq);return}if(e.target.closest("#apIns [data-nz]")){document.querySelectorAll("#apIns [data-apq]").forEach(x=>brSnooze(x.dataset.apq,24));const c=$("#apIns");if(c)c.remove();return}const b=e.target.closest("#apIns [data-apq]");if(b){brSnooze(b.dataset.apq,12);b.remove();if(!document.querySelector("#apIns [data-apq]")){const c=$("#apIns");if(c)c.remove()}ask(b.dataset.apq)}});
document.addEventListener("click",e=>{if(e.target.closest("#apMsgs [data-go],#apMsgs [data-sheet]"))closeAiPop()});
// ================= VOICE ASSISTANT (talk to P2P Brain hands-free)
const VOICE={native:!!(window.P2PNative&&window.P2PNative.hasVoice),on:false,stage:"",_res:null,_spk:null};
VOICE.lang=()=>"en-IN";
VOICE.listen=function(){return new Promise((ok,no)=>{
  if(VOICE.native){VOICE._res=t=>{VOICE._res=null;if(String(t).startsWith("__ERR__:"))no(new Error(String(t).slice(8)));else ok(String(t||""))};try{window.P2PNative.listen(VOICE.lang())}catch(e){no(e)}return}
  if(window.P2PNative&&!VOICE.native){const e=new Error("Voice needs the new app version (0.0.0.00017). Tap Update app below.");e.code="old_apk";no(e);return}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){no(new Error("Voice isn't available here. Use the phone app."));return}
  let txt="",done=false;const rec=new SR();rec.lang=VOICE.lang();rec.interimResults=true;rec.maxAlternatives=1;VOICE._rec=rec;
  rec.onresult=ev=>{txt=[...ev.results].map(r=>r[0].transcript).join(" ");const l=$("#vaHeard");if(l)l.textContent=txt};
  rec.onerror=ev=>{if(done)return;done=true;ev.error==="no-speech"||ev.error==="aborted"?ok(""):no(new Error(ev.error==="not-allowed"?"Microphone not allowed. Allow it in phone settings.":"Couldn't hear. Try again."))};
  rec.onend=()=>{if(done)return;done=true;ok(txt)};try{rec.start()}catch(e){no(e)}})};
window.P2PVoiceResult=t=>{if(VOICE._res)VOICE._res(t)};
window.P2PVoicePartial=t=>{const l=$("#vaHeard");if(l)l.textContent=t};
window.P2PVoiceEvent=e=>{const o=$("#vaBox");if(o)o.dataset.ev=e};
VOICE.popup=()=>VOICE.native&&String(window.P2PNative.hasVoice())==="1";
function voiceSayMoney(v){const n=+String(v).replace(/,/g,"");if(!isFinite(n))return v+" rupees";let a=Math.abs(n);const fr=Math.round((a%1)*100);a=Math.floor(a);const P=[],cr=Math.floor(a/1e7);a%=1e7;const l=Math.floor(a/1e5);a%=1e5;const h=Math.floor(a/1e3);a%=1e3;if(cr)P.push(cr+" crore");if(l)P.push(l+" lakh");if(h)P.push(h+" hazaar");if(a||!P.length)P.push(a);return(n<0?"minus ":"")+P.join(" ")+" rupees"+(fr?" "+fr+" paise":"")}
VOICE.clean=(t,spk)=>String(t||"").replace(/P2P Brain\s*·?\s*(need one detail|from your data|bank advisor|thought it through)|P2P Brain[^\n]*works offline|P2P Brain · partial answer|🧠 Kaise socha[\s\S]*$/g,"").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu,"").replace(/([−-])?₹\s?([\d,]+(\.\d+)?)/g,(m,sg,n)=>spk?voiceSayMoney((sg?"-":"")+n):(sg?"−":"")+"₹"+n).replace(/[•·|*_#>]/g," ").replace(/\n+/g,". ").replace(/\s{2,}/g," ").trim().slice(0,600);
// a spoken answer stays short: the first few sentences, the rest is on the screen
VOICE.short=t=>{const s=VOICE.clean(t,true);if(s.length<=320)return s;const c=s.slice(0,320),i=Math.max(c.lastIndexOf(". "),c.lastIndexOf(", "));return(i>120?c.slice(0,i):c)+". Baaki screen par dekh lo."};
VOICE.speak=function(t){return new Promise(ok=>{const s=VOICE.short(t);if(!s){ok();return}
  if(VOICE.native&&window.P2PNative.speak){VOICE._spk=()=>{VOICE._spk=null;ok()};try{window.P2PNative.speak(s,VOICE.lang())}catch(e){ok()}setTimeout(()=>{if(VOICE._spk)VOICE._spk()},Math.min(45000,4000+s.length*90));return}
  if(!window.speechSynthesis){ok();return}try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(s);u.lang=VOICE.lang();u.rate=1.03;const v=speechSynthesis.getVoices().find(v=>/en[-_]IN/i.test(v.lang));if(v)u.voice=v;u.onend=u.onerror=()=>ok();speechSynthesis.speak(u)}catch(e){ok()}})};
window.P2PSpeakDone=()=>{if(VOICE._spk)VOICE._spk()};
VOICE.stop=function(){VOICE.on=false;try{VOICE._rec&&VOICE._rec.abort()}catch(e){}try{window.P2PNative&&window.P2PNative.stopListen&&window.P2PNative.stopListen()}catch(e){}try{window.P2PNative&&window.P2PNative.stopSpeak&&window.P2PNative.stopSpeak()}catch(e){}try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}const o=$("#vaBox");if(o){o.classList.remove("open");setTimeout(()=>o.remove(),280)}if(VOICE._res)VOICE._res("")};
function vaStage(st,txt){VOICE.stage=st;const o=$("#vaBox");if(!o)return;o.dataset.st=st;$("#vaState").textContent=txt||({listen:"Listening… bolo",think:"Soch raha hoon…",speak:"Bol raha hoon…",idle:"Tap the orb to talk"})[st]||""}
async function voiceMode(){if(VOICE.on)return;VOICE.on=true;
  const o=document.createElement("div");o.id="vaBox";o.className="vabox";o.innerHTML=`<div class="vacard"><button type="button" class="vax" id="vaX" aria-label="Close">✕</button>
    <div class="vasub">${esc(isBrain()?(aiOnline()?(aiCfg.prov==="braingemini"&&!sampleFn?"P2P Brain + Gemini":"P2P Brain + Claude"):"P2P Brain"):PROV[aiCfg.prov]?PROV[aiCfg.prov].n:"AI")}</div>
    <button type="button" class="vaorb" id="vaOrb" aria-label="Talk"><span class="vr1"></span><span class="vr2"></span><span class="vcore"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></span><span class="vwave"><i></i><i></i><i></i><i></i><i></i></span></button>
    <div class="vastate" id="vaState"></div><div class="vaheard" id="vaHeard"></div><div class="vareply" id="vaReply"></div>
    <div class="vafix" id="vaFix" hidden><input id="vaFixIn" placeholder="Type what you said"><button type="button" id="vaFixGo">Fix & learn</button></div>
    <div class="vachips" id="vaChips">${voiceChipsHtml(voiceChips(),VA_WARN)}</div>
    <div class="vahint">${voiceHint()}</div></div>`;
  document.body.appendChild(o);void o.offsetHeight;requestAnimationFrame(()=>o.classList.add("open"));
  if(VOICE.popup()){$("#vaState").insertAdjacentHTML("afterend",'<button type="button" class="vaupd vaupd2" id="vaUpd">Update app · listen without Google popup</button>');$("#vaUpd").onclick=()=>{try{window.P2PNative.openUrl("https://github.com/maxsahu8-alt/p2p-order-book/releases/latest/download/P2P-Order-Book.apk")}catch(err){}}}
  $("#vaX").onclick=VOICE.stop;o.addEventListener("click",e=>{if(e.target===o)VOICE.stop()});
  $("#vaOrb").onclick=()=>{if(VOICE.stage==="speak"){try{window.P2PNative&&window.P2PNative.stopSpeak&&window.P2PNative.stopSpeak()}catch(e){}try{speechSynthesis.cancel()}catch(e){}if(VOICE._spk)VOICE._spk();return}if(VOICE.stage==="idle")loop()};
  let empty=0,lastHeard="";
  $("#vaChips").onclick=e=>{const b=e.target.closest("[data-vq]");if(!b)return;if(VA_WARN.has(b.dataset.vq))brSnooze(b.dataset.vq,12);VOICE.stop();setTimeout(()=>{openAiPop();ask(b.dataset.vq)},250)};
  $("#vaHeard").onclick=()=>{if(!lastHeard)return;$("#vaFix").hidden=false;$("#vaFixIn").value=lastHeard;$("#vaFixIn").focus()};
  $("#vaFixGo").onclick=async()=>{const m=$("#vaFixIn").value.trim();if(!m)return;const n=await voiceLearn(lastHeard,m);$("#vaFix").hidden=true;toast(n?"Learned · next time I'll hear it right":"Got it");VOICE.stop();setTimeout(()=>{openAiPop();ask(m)},250)};
  const loop=async()=>{while(VOICE.on){vaStage("listen");$("#vaHeard").textContent="";let q="";
      try{q=(await VOICE.listen()).trim()}catch(e){vaStage("idle",e.message||"Couldn't hear");if(e.code==="old_apk"&&!$("#vaUpd")){$("#vaState").insertAdjacentHTML("afterend",'<button type="button" class="vaupd" id="vaUpd">Update app</button>');$("#vaUpd").onclick=()=>{try{window.P2PNative.openUrl("https://github.com/maxsahu8-alt/p2p-order-book/releases/latest/download/P2P-Order-Book.apk")}catch(err){}}}return}
      q=voiceNorm(q);
      if(!VOICE.on)return;if(!q){if(++empty>=2||VOICE.popup()){vaStage("idle");return}continue}empty=0;
      lastHeard=q;voiceUse(q);$("#vaHeard").innerHTML="“"+esc(q)+"” <small>· wrong? tap to fix</small>";if(/^(bas|stop|band karo|bye|ruk jao|thik hai bas|ok bye|thanks|thank you|shukriya|dhanyavad|dhanyawad)\b/i.test(q)){await VOICE.speak("Theek hai, bye!");VOICE.stop();return}
      vaStage("think");$("#vaReply").textContent="";const before=curMsgs().children.length;
      try{await ask(q)}catch(e){}
      let last=[...curMsgs().querySelectorAll(".msg.a")].pop();let tries=0;while(last&&last.querySelector(".thk")&&tries++<60){await new Promise(k=>setTimeout(k,500));last=[...curMsgs().querySelectorAll(".msg.a")].pop()}
      if(!VOICE.on)return;const ans=last&&curMsgs().children.length>before?last.innerText:"";$("#vaReply").textContent=VOICE.clean(ans).slice(0,320);
      try{const fl=voiceFollow(),base=voiceChips();$("#vaChips").innerHTML=voiceChipsHtml([...fl,...base].filter((v,i,a)=>a.indexOf(v)===i).slice(0,5),VA_WARN)}catch(e){}
      // an entry was prepared: say it, then wait for a spoken yes or no
      const card=[...curMsgs().querySelectorAll(".acard")].pop();
      if(card&&card.querySelector("[data-apply]")&&curMsgs().children.length>before){const what=[...card.querySelectorAll(".ai span:last-child")].map(e=>e.textContent).join(". ");
        vaStage("speak");await VOICE.speak((ans.split("\n")[0]||"")+". "+what+". Karun? Haan ya nahi bolo.");
        let done=false;for(let k=0;k<2&&VOICE.on&&!done;k++){vaStage("listen","Haan ya nahi bolo…");let a="";try{a=voiceNorm(await VOICE.listen())}catch(e){break}
          $("#vaHeard").textContent="“"+a+"”";
          if(/^(haan|han|ha|haa|yes|yeah|ok|okay|kar do|karo|kar de|confirm|theek hai|thik hai|sahi hai|laga do|save|done)\b/i.test(a)){card.querySelector("[data-apply]").click();await new Promise(r=>setTimeout(r,1500));const hd=(card.querySelector(".ah")||{}).textContent||"";vaStage("speak");await VOICE.speak(/Recorded ✓/.test(hd)?"Ho gaya, record kar diya.":"Kuch save nahi hua, screen par dekh lo.");done=true}
          else if(/^(nahi|nahin|no|na|mat karo|cancel|rehne do|ruko|ruk)\b/i.test(a)){const sk=card.querySelector("[data-skip]");if(sk)sk.click();vaStage("speak");await VOICE.speak("Theek hai, nahi kiya.");done=true}}
        if(!done&&VOICE.on){vaStage("speak");await VOICE.speak("Entry screen par taiyaar hai, aap khud confirm kar lena.")}
        if(VOICE.popup()){vaStage("idle","Tap the orb to talk again");return}continue}
      vaStage("speak");await VOICE.speak(ans);if(LA.pend&&Date.now()-LA.pend.t<12e4&&VOICE.on)continue;if(VOICE.popup()){vaStage("idle","Tap the orb to talk again");return}}};
  loop()}
// what the phone hears → what the user means (numbers, coin names, learned corrections)
const VN_PH=[[/\b(es+ bee? (ai|eye)|ess? bi ai|asbi|es b i)\b/g,"sbi"],[/\b(aksis|axes|exis|ek sis|aixs|acsis|axix)\b/g,"axis"],[/\b(aaisi aaisi|icic?i|aicici|i see i see i)\b/g,"icici"],[/\b(kotek|cotak|kotuk|kodak)\b/g,"kotak"],[/\b(aitch ?d ?f ?c|hdfc bank|edfc|h d f c)\b/g,"hdfc"],[/\b(pee en bee|pnb bank)\b/g,"pnb"]];
const VN_NUM={ek:1,do:2,teen:3,char:4,chaar:4,paanch:5,panch:5,chhe:6,che:6,saat:7,aath:8,nau:9,das:10,bees:20,pachas:50,pachaas:50};
function voiceNorm(q){let x=" "+String(q||"").toLowerCase()+" ";
  x=x.replace(/\b(you|u)\s*s\s*d\s*t\b|\busd\s*t\b|\busdts?\b|\byou sdt\b|\bu sdt\b|\btether\b/g," usdt ").replace(/\bbit ?coin\b/g," btc ").replace(/\brupay(e|ee|es)?\b|\brupees?\b|\brs\b/g," rupees ");
  x=x.replace(/\b(ek|do|teen|char|chaar|paanch|panch|chhe|che|saat|aath|nau|das|bees|pachas|pachaas) (sau|hazaar|hazar|hajar|lakh)\b/g,(m,a,b)=>" "+VN_NUM[a]*(b==="sau"?100:b==="lakh"?100000:1000)+" ");
  x=x.replace(/\b(\d+) (sau|hazaar|hazar|hajar|lakh|thousand|hundred)\b/g,(m,a,b)=>" "+(+a)*(/sau|hundred/.test(b)?100:b==="lakh"?100000:1000)+" ");
  x=x.replace(/(\d),(\d{3})/g,"$1$2");
  // letters said one by one: "s b i" -> "sbi", "h d f c" -> "hdfc"; and how people say bank names
  x=x.replace(/\b(?:[a-z]\s+){2,}[a-z]\b/g,m=>m.replace(/\s+/g,""));
  VN_PH.forEach(([r,to])=>{x=x.replace(r," "+to+" ")});
  try{x=brNumWords(x)}catch(e){}
  try{x=brainApply(x).q||x}catch(e){}
  return x.replace(/\s+/g," ").trim()}
// learn from corrections: user fixes what the phone heard → Brain remembers those words for next time
async function voiceLearn(heard,meant){const H=heard.toLowerCase().split(/\s+/),M=meant.trim().split(/\s+/);let n=0;
  if(H.length===M.length)for(let i=0;i<H.length;i++){if(H[i]&&M[i]&&H[i]!==M[i].toLowerCase()&&H[i].length>=2){try{await brainTeach("alias",H[i],M[i]);n++}catch(e){}}}
  else if(H.join(" ")!==meant.toLowerCase()){try{await brainTeach("phrase",heard,meant);n++}catch(e){}}
  const st=voiceStats();st.fixes=(st.fixes||0)+n;voiceSave(st);return n}
// smart suggestions: your habits, what needs attention now, time of day, real names from your data
function voiceChipsHtml(L,warn){return L.map(t=>`<button type="button" data-vq="${esc(t)}"${warn&&warn.has(t)?' class="w"':""}>${esc(t)}</button>`).join("")}
let VA_WARN=new Set();
function voiceChips(){const out=[],add=q=>{q=String(q||"").trim();if(q&&!out.includes(q)&&out.length<5)out.push(q)};VA_WARN=new Set();
  const junk=/^(hello|hi|hey|namaste|ok|okay|thik|theek|bas|bye|haan|nahi|test)\b/i,st=voiceStats();
  voiceTop(8).filter(q=>!junk.test(q)&&q.split(" ").length>=2&&(st.q[q]||0)>=2).slice(0,2).forEach(add);
  try{brInsights().filter(x=>x.q!=="usdt kitna bacha").slice(0,2).forEach(x=>{add(x.q);if(x.k==="r"||x.k==="a")VA_WARN.add(x.q)})}catch(e){}
  const h=new Date().getHours();if(h>=21||h<5)add("raat ko kaun se bank khule rakhu");else if(h<11)add("kal raat kitne order aaye");
  try{const pd=parties.map(p=>({n:p.name,v:partyOwed(p.id)-partyPaid(p.id)})).filter(x=>x.v>0.5).sort((a,b)=>b.v-a.v)[0];if(pd)add(pd.n+" ko kitna dena hai")}catch(e){}
  ["aaj ka profit","pending orders","kaun sa bank me paisa lu"].forEach(add);return out}
// after an answer: what you would likely ask next
function voiceFollow(){const C=LA.ctx||{},out=[];if(C.party)out.push(C.party+" ka record",C.party+" ko kitna dena hai");if(C.bank)out.push(C.bank+" ka limit",C.bank+" freeze risk");if(C.trader&&!C.party)out.push(C.trader+" ka record");if(/(profit|kamaya)/.test(C.lastQ||""))out.push("kal ka","is hafte kitna kamaya","sabse zyada profit kis se hua");return[...new Set(out)].slice(0,3)}
function voiceHint(){const st=voiceStats();let ex=[];try{const b=banks.find(x=>x.type!=="Cash"),p=parties[0];if(b)ex.push("“"+esc(b.name)+" ka limit”");if(p)ex.push("“"+esc(p.name)+" ko kitna dena hai”");if(banks.filter(x=>x.type!=="Cash").length>1){const L=banks.filter(x=>x.type!=="Cash");ex.push("“"+esc(L[0].name)+" se "+esc(L[1].name)+" me 30k transfer karo”")}}catch(e){}
  return (st.n?`<span class="vh1">I learn from you · ${st.n} voice questions · ${st.fixes||0} words corrected</span><br>`:"")+`<span class="vh2">Try: `+(ex.length?ex.join(" · "):"“aaj ka profit” · “500 USDT 93 pe becha Ravi ko”")+`</span><span class="vh3">Confirm bolna: “haan” / “nahi”</span>`}
function voiceStats(){try{return JSON.parse(localStorage.getItem("p2p_voice")||"{}")}catch(e){return{}}}
function voiceSave(st){try{localStorage.setItem("p2p_voice",JSON.stringify(st))}catch(e){}}
function voiceUse(q){const st=voiceStats();st.n=(st.n||0)+1;st.q=st.q||{};const k=q.toLowerCase().slice(0,60);st.q[k]=(st.q[k]||0)+1;const keys=Object.keys(st.q);if(keys.length>60){keys.sort((a,b)=>st.q[a]-st.q[b]).slice(0,keys.length-60).forEach(k=>delete st.q[k])}voiceSave(st)}
function voiceTop(n){const st=voiceStats();return Object.entries(st.q||{}).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0])}
function thinkHTML(t){return`<span class="thk"><span class="thk-orb"></span><span class="thk-txt">${esc(t)}</span><span class="thk-dots"><i></i><i></i><i></i></span></span>`}
(function(){const m=$("#apMic");if(!(VOICE.native||window.SpeechRecognition||window.webkitSpeechRecognition))return;m.hidden=false;
  m.onclick=async()=>{if(m.classList.contains("on"))return;m.classList.add("on");try{const q=voiceNorm((await VOICE.listen()).trim());if(q){$("#apIn").value="";ask(q)}}catch(e){toast(e.message||"Couldn't hear. Try again")}m.classList.remove("on")};
  // empty box: the right button becomes the voice assistant (wave); with text it sends
  const sb=$("#apSend"),sync=()=>{const e=!$("#apIn").value.trim();sb.classList.toggle("vmode",e);sb.setAttribute("aria-label",e?"Voice assistant":"Send")};$("#apIn").addEventListener("input",sync);sync();window.apSendSync=sync;sb.classList.add("vcap")})();
// headphone icon = support (feedback / report a problem)
(function(){const v=$("#apVoice");if(v){v.hidden=false;v.onclick=()=>{try{closeAiPop()}catch(e){}setTimeout(()=>sheets.feedback("send"),200)}}})();
function apFabSync(){const pg=apPage();$("#aiFab").hidden=pg==="ai"||!$("#sheetBg").hidden||!$("#drawer").hidden}
document.addEventListener("click",()=>setTimeout(apFabSync,0));setInterval(apFabSync,800);

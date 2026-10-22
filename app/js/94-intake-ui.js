// ---------- smart intake ----------
let i2Files=[],i2Max=0;
function ixRail(){try{const R=document.getElementById("ix-rail");if(!R)return;const G=(typeof ixS!=="undefined"&&ixS.groups)||[],busy=typeof ixS!=="undefined"&&ixS.busy;
  const saved=G.some(g=>g.save&&g.save.state==="saved");const add=i2Files.length>0||G.length>0,chk=G.length>0&&!busy;
  const set=(k,cls,sub)=>{const e=R.querySelector('[data-s="'+k+'"]');if(!e)return;e.className="ixst "+cls;if(sub)e.querySelector("small").textContent=sub};
  set("add",add?"done":"on",i2Files.length?i2Files.length+(i2Files.length===1?" screenshot":" screenshots"):(G.length?"Added":"Order + payment"));
  set("check",busy?"on busy":chk?"done":(add?"on":""),busy?"Reading…":chk?(G.length+(G.length===1?" transaction":" transactions")):"Match and verify");
  set("save",saved?"done":(chk?"on":""),saved?"Saved":(chk?"Your turn":"You confirm"));
 }catch(e){}}
const i2Url=new WeakMap();const i2U=f=>{let u=i2Url.get(f);if(!u){u=URL.createObjectURL(f);i2Url.set(f,u)}return u};
// what the app made of each picture (known after the check): so you can see which one is which
function i2Label(f){try{const it=(ixS.items||[]).find(x=>x.file===f);if(!it||!it.cls)return"";if(it.ledger)return"Wallet history";if(it.list)return"Order list";if(it.pay)return"Payment";if(it.ord)return"Exchange order";return it.cls.type==="UNKNOWN"?"Not sure":""}catch(e){return""}}
function i2Thumbs(){setTimeout(i2Dbg,0);const n=i2Files.length,dzE=$("#idrop");try{dzE.classList.toggle("has",n>0)}catch(e){}
  $("#i2-prev").innerHTML=i2Files.map((f,i)=>{const lb=i2Label(f);return`<span class="pv"><img data-pi="${i}" src="${i2U(f)}" alt="Screenshot ${i+1}"><i class="no">${i+1}</i><button type="button" data-ri="${i}" aria-label="Remove screenshot ${i+1}">×</button>${lb?`<em>${esc(lb)}</em>`:""}</span>`}).join("")+(n&&n<10?`<button type="button" class="addtile" data-addpic aria-label="Add more screenshots"><span>＋</span><small>Add more</small></button>`:"")}
// "What the reader saw": for each picture the engine, confidence and the text it produced, so a wrong or empty read can be seen (and sent) at once
function i2Dbg(){try{let d=document.getElementById("i2-dbg");const prev=$("#i2-prev");const its=(ixS.items||[]).filter(x=>x.ocr&&i2Files.includes(x.file));
  if(!its.length){if(d)d.remove();return}
  if(!d){d=document.createElement("details");d.id="i2-dbg";d.className="note";d.style.margin="8px 0";prev.after(d)}
  const open=d.open;d.innerHTML=`<summary style="cursor:pointer">What the reader saw (${its.map(x=>(x.ocr.text||"").length).join(" / ")} characters)</summary>`+its.map(x=>{const k=i2Files.indexOf(x.file)+1,t=(x.ocr.text||"").trim();return`<div style="margin:8px 0"><b>Screenshot ${k}</b> · ${esc(x.ocr.engine||"")} · ${x.ocr.conf!=null?x.ocr.conf+"% sure · ":""}${esc(x.cls&&x.cls.type||"")}${x.ocr.err?" · "+esc(x.ocr.err):""}<pre style="white-space:pre-wrap;font:500 .72rem var(--mono);margin:4px 0 0;max-height:160px;overflow:auto">${t?esc(t.slice(0,900)):"(nothing was read)"}</pre></div>`}).join("");d.open=open}catch(e){}}
function i2Lb(i){try{document.querySelectorAll(".i2lb").forEach(x=>x.remove());if(!i2Files.length)return;
  let pos=Math.max(0,Math.min(i,i2Files.length-1)),zoom=null,closing=false,g=null;const N=()=>i2Files.length;
  const el=document.createElement("div");el.className="i2lb";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Screenshot preview");
  el.innerHTML=`<div class="card"><div class="gr"></div><div class="top"><b></b><button type="button" class="x" data-x aria-label="Close">Close</button></div><div class="view"><div class="track"></div><button type="button" class="ar l" data-p aria-label="Previous">‹</button><button type="button" class="ar r" data-n aria-label="Next">›</button></div><div class="bot"><div class="dots"></div><button type="button" class="rm" data-d>Remove</button></div></div>`;
  const card=el.querySelector(".card"),view=el.querySelector(".view"),track=el.querySelector(".track"),ttl=el.querySelector(".top b"),dots=el.querySelector(".dots"),W=()=>view.clientWidth||360;
  const build=()=>{track.innerHTML=i2Files.map((f,k)=>`<div class="slide"><img src="${i2U(f)}" alt="Screenshot ${k+1}" draggable="false"></div>`).join("");dots.innerHTML=i2Files.map((f,k)=>`<i data-k="${k}"></i>`).join("")};
  const head=()=>{const k=Math.max(0,Math.min(N()-1,Math.round(pos))),f=i2Files[k];if(!f)return;const lb=i2Label(f);ttl.textContent=`Screenshot ${k+1} of ${N()}${lb?" · "+lb:""}`;[...dots.children].forEach((d,j)=>d.classList.toggle("on",j===k));el.querySelector("[data-p]").hidden=k<=0;el.querySelector("[data-n]").hidden=k>=N()-1};
  // every slide leans away from the centre like a card on a turntable; the one in front sits flat
  const render=(p,anim)=>{track.style.transition=anim?"":"none";track.style.transform=`translate3d(${-p*100}%,0,0)`;
    [...track.children].forEach((sl,k)=>{const d=k-p,a=Math.min(1,Math.abs(d)),im=sl.firstChild;im.style.transition=anim?"":"none";
      const z=zoom&&Math.round(p)===k?zoom:null;im.style.transform=z?`translate3d(${z.x}px,${z.y}px,0) scale(${z.s})`:`perspective(900px) rotateY(${(-d*38).toFixed(2)}deg) scale(${(1-a*0.18).toFixed(3)})`;im.style.opacity=String(+(1-a*0.45).toFixed(3))})};
  const go=k=>{pos=Math.max(0,Math.min(N()-1,k));zoom=null;render(pos,true);head()};
  const close=()=>{if(closing)return;closing=true;document.removeEventListener("keydown",key);el.style.background="";card.style.transition="";card.style.transform="";el.classList.remove("on");setTimeout(()=>{el.remove();document.body.style.overflow=""},420)};
  const key=e=>{if(e.key==="Escape")close();else if(e.key==="ArrowLeft")go(Math.round(pos)-1);else if(e.key==="ArrowRight")go(Math.round(pos)+1)};
  build();render(pos,false);head();document.body.appendChild(el);document.body.style.overflow="hidden";document.addEventListener("keydown",key);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("on")));
  view.addEventListener("pointerdown",e=>{if(closing||e.target.closest(".ar"))return;g={x:e.clientX,y:e.clientY,t:Date.now(),mode:"",p0:Math.round(pos),z0:zoom?{...zoom}:null,dx:0,dy:0};try{view.setPointerCapture(e.pointerId)}catch(x){}});
  view.addEventListener("pointermove",e=>{if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;g.dx=dx;g.dy=dy;
    if(!g.mode){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;g.mode=zoom?"pan":(Math.abs(dx)>Math.abs(dy)?"h":(dy>0?"v":"x"))}
    if(g.mode==="h"){let p=g.p0-dx/W();const L=N()-1;if(p<0)p*=0.3;else if(p>L)p=L+(p-L)*0.3;pos=p;render(pos,false)}
    else if(g.mode==="v"){const d=Math.max(0,dy);card.style.transition="none";card.style.transform=`translateY(${d}px) scale(${(1-Math.min(d,400)/4000).toFixed(3)})`;el.style.background=`rgba(8,10,14,${(0.62*Math.max(0,1-d/420)).toFixed(3)})`}
    else if(g.mode==="pan"){zoom={...g.z0,x:g.z0.x+dx,y:g.z0.y+dy};render(pos,false)}});
  const end=e=>{if(!g)return;const q=g;g=null;const t=Math.max(1,Date.now()-q.t);
    if(!q.mode){const cur=track.children[Math.round(pos)],im=cur&&cur.firstChild;if(im){const r=im.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
        if(zoom){zoom=null}else{const S=2.4;zoom={s:S,x:-(e.clientX-(r.left+r.width/2))*(S-1),y:-(e.clientY-(r.top+r.height/2))*(S-1)}}render(pos,true)}}return}
    if(q.mode==="h"){const thr=W()*0.17,v=q.dx/t;let k=q.p0;if(q.dx<-thr||v<-0.45)k=q.p0+1;else if(q.dx>thr||v>0.45)k=q.p0-1;go(k)}
    else if(q.mode==="v"){if(q.dy>110||q.dy/t>0.6)close();else{card.style.transition="";card.style.transform="";el.style.background=""}}
    else if(q.mode==="pan"){render(pos,true)}};
  view.addEventListener("pointerup",end);view.addEventListener("pointercancel",end);
  el.addEventListener("click",e=>{if(e.target===el){close();return}if(e.target.closest("[data-x]")){close();return}if(e.target.closest("[data-p]")){go(Math.round(pos)-1);return}if(e.target.closest("[data-n]")){go(Math.round(pos)+1);return}
    const dt=e.target.closest("[data-k]");if(dt){go(+dt.dataset.k);return}
    if(e.target.closest("[data-d]")){const k=Math.round(pos);i2Files.splice(k,1);i2Draw();if(!N()){close();return}build();pos=Math.min(k,N()-1);zoom=null;render(pos,false);head()}});
  }catch(e){console.error(e)}}
function i2Draw(){try{const n=i2Files.length;$("#i2-go").textContent=n?(n>1?"Analyze "+n+" screenshots":"Analyze"):"Add from text"}catch(e){}if(i2Files.length&&!ocrWorker&&!ocrPromise&&!(window.P2POcr&&P2POcr.recognize)){try{ocrInit().catch(()=>{})}catch(e){}}i2Thumbs();ixRail();}
function i2Add(list){const all=[...(list||[])];const imgs=all.filter(f=>/^image\//.test(f.type)||(!f.type&&/\.(png|jpe?g|webp|heic|heif|gif|bmp)$/i.test(f.name||""))||(!f.type&&f.size>0));
  if(!all.length)return;if(!imgs.length){toast("That file isn't a picture. Choose a screenshot.");return}const max=10;

  const before=i2Files.length;i2Files=i2Files.concat(imgs).slice(0,max);const added=i2Files.length-before;
  if(!added){toast(`Up to ${max} screenshots at a time`);return}i2Draw();
  clearTimeout(i2Auto);if(ixS.busy){ixS.again=true;ixS.run++}i2Auto=setTimeout(()=>{if(!ixS.busy)ixRun()},600)}
let i2Auto=null;
{const fi=$("#i2-file");let busy=false;const take=e=>{if(busy)return;busy=true;const fl=e.target.files;if(fl&&fl.length)i2Add(fl);else toast("No picture came through. Try again, or open this page in Chrome.");setTimeout(()=>{e.target.value="";busy=false},300)};fi.addEventListener("change",take);fi.addEventListener("input",take);}
{const cam=$("#i2-cam");if(cam){let b2=false;const t2=e=>{if(b2)return;b2=true;const fl=e.target.files;if(fl&&fl.length)i2Add(fl);setTimeout(()=>{e.target.value="";b2=false},300)};cam.addEventListener("change",t2)}}
$("#i2-pastebtn").onclick=async()=>{try{const items=await navigator.clipboard.read();const fl=[];for(const it of items){const ty=it.types.find(t=>/^image\//.test(t));if(ty){const bl=await it.getType(ty);fl.push(new File([bl],"pasted.png",{type:ty}))}}if(fl.length)i2Add(fl);else toast("No image on the clipboard")}catch(e){toast("Couldn't read the clipboard. Long-press in the box below and choose Paste.")}};
$("#i2-legacy").onclick=()=>{if(i2Files.length||$("#i2-text").value.trim())legacyIntake();else toast("Add screenshots first")};
try{document.getElementById("ix-txt").addEventListener("toggle",()=>{try{$("#i2-text").focus()}catch(e){}})}catch(e){}
$("#i2-prev").onclick=e=>{if(e.target.closest("[data-addpic]")){try{$("#i2-file").click()}catch(x){}return}const im=e.target.closest("[data-pi]");if(im){i2Lb(+im.dataset.pi);return}const b=e.target.closest("[data-ri]");if(b){i2Files.splice(+b.dataset.ri,1);i2Draw()}};
const dz=$("#idrop");try{ixRail()}catch(e){}["dragenter","dragover"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.add("drag")}));["dragleave","drop"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.remove("drag")}));
dz.addEventListener("drop",e=>i2Add(e.dataTransfer.files));
document.addEventListener("paste",e=>{if($("#p-intake").hidden)return;const f=[...(e.clipboardData||{}).files||[]];if(f.length){e.preventDefault();i2Add(f)}});
$("#i2-clear").onclick=()=>{i2Files=[];i2Draw();$("#i2-text").value="";$("#i2-out").innerHTML="";$("#i2-ix").innerHTML="";ixS.groups=[];ixS.run++};
async function legacyIntake(){
  const text=$("#i2-text").value.trim();if(!text&&!i2Files.length){toast("Add a screenshot or paste some text");return}
  const btn=$("#i2-go");btn.disabled=true;btn.textContent="Working…";const out=$("#i2-out");
  const res0=document.createElement("div");res0.className="ires";res0.textContent="Reading your "+(i2Files.length?i2Files.length+" screenshot"+(i2Files.length>1?"s":""):"")+(i2Files.length&&text?" and ":"")+(text?"text":"")+"…";out.prepend(res0);
  const shownUtr=new Set();let ocrJob=null,skipFn=null,tick=null,skipBtn=null;
  try{
    if(i2Files.length&&!(aiCfg.prov!=="builtin"||i2Max>0)&&cloudReady()){
      res0.textContent=`Uploading ${i2Files.length} screenshot${i2Files.length>1?"s":""}…`;
      try{await cloudIntake([...i2Files],text);res0.remove();i2Files=[];i2Draw();$("#i2-text").value="";toast("Sent. Orders will appear by themselves in 1–3 min");return}
      catch(e){res0.textContent=e&&e.code==="not_granted"?"Allow the Claude Code Remote permission so screenshots can be read, then try again.":e&&e.code==="quota_exceeded"?"Screenshot storage is full. Hide old jobs or delete old proofs.":"Couldn't send the screenshots. Try again.";return}
    }
    const blobs=await Promise.all(i2Files.map(f=>shrinkImage(f)));
    const vision=blobs.length&&(aiCfg.prov!=="builtin"||i2Max>0);
    let ocrText="";const ocrTexts=[];
    if(vision){ // read the payment on the phone at the same time, so the payment card appears without waiting for the AI
      ocrJob=(async()=>{try{if(!ocrWorker){ocrListeners=[()=>{}];await ocrInit()}
        const found=[];for(let i=0;i<i2Files.length;i++){const t=await ocrImage(i2Files[i],()=>{});const p=payParse(t||"");if(p.ok&&!shownUtr.has(normRef(p.utr))){shownUtr.add(normRef(p.utr));found.push([p,i2Files[i]])}}
        found.reverse().forEach(([p,fl])=>res0.after(payCard(p,fl,"phone")));return found.length}catch(e){console.error(e);return 0}})();
      const t0=Date.now(),base=res0.textContent;
      tick=setInterval(()=>{const sec=Math.round((Date.now()-t0)/1000);res0.textContent=base+" "+sec+"s";if(sec>=12&&!skipBtn){skipBtn=document.createElement("button");skipBtn.className="btn ghost";skipBtn.textContent="Skip AI · read on phone";skipBtn.onclick=()=>skipFn&&skipFn();res0.after(skipBtn)}},1000);
    }
    if(blobs.length&&!vision){
      for(let i=0;i<blobs.length;i++){
        res0.textContent=`Reading screenshot ${i+1} of ${blobs.length} on your phone…`;
        if(!ocrWorker){res0.textContent="Getting the screenshot reader ready (first time takes a little longer)…";const f=t=>{res0.textContent=t};ocrListeners=[f];const stop=()=>{};await ocrInit().finally(stop)}
        res0.textContent=`Reading screenshot ${i+1} of ${blobs.length}…`;
        try{const t=await ocrImage(i2Files[i],m=>{res0.textContent=`Reading screenshot ${i+1} of ${blobs.length}… ${m.replace("reading ","")}`});
          ocrTexts.push(t||"");ocrText+=`\n--- SCREENSHOT ${i+1} (text read by OCR, may contain small errors) ---\n${t||"(no text found)"}\n`}
        catch(e){console.error(e);throw Object.assign(new Error("ocr"),{text:e&&e.message==="timeout"?"Reading took too long. Try fewer screenshots at a time, or check your internet.":"Couldn't read the screenshot on this phone. Paste the text instead, or add your own AI key in Settings to read images."})}
      }
      res0.textContent="Matching with your orders, banks and parties…";
    }
    {const pl=[];ocrTexts.forEach((t,i)=>{const p=payParse(t);if(p.ok)pl.push([p,i2Files[i]])});if(text&&!pl.length){const p=payParse(text);if(p.ok)pl.push([p,null])}
     pl.reverse().forEach(([p,fl])=>res0.after(payCard(p,fl,"phone")))}
    const prompt=`You are the SMART INTAKE of "${APP_NAME}", an app for an Indian P2P crypto merchant. The user has given ${i2Files.length?i2Files.length+" screenshot(s)"+(vision?" (attached as images)":" (their text was read by OCR, see SCREENSHOT sections)"):"no screenshots"}${text?" and the pasted text below":""}. They can be: bank or UPI SMS/notifications, UPI app payment screenshots (GPay, PhonePe, Paytm, bank apps), exchange P2P order screenshots (Binance, Bybit, OKX, KuCoin…), bank statements, WhatsApp messages or a list of deals.
Read everything carefully and turn it into records. Rules:
- AUTO-LINK: if one screenshot is an exchange order and another is the payment for it (same amount ±₹1, or the payer/receiver name matches the counterparty's real name), create ONE add_order with "banks" filled from the payment (which of MY banks, amount, method UPI/IMPS) and the UTR/ref + order number in note. Do not create a separate payment record for it.
- If the order already exists in DATA.recent_orders (same order number in note, or same side+qty+rate within the last days) do NOT add it again: use assign_banks on that order_id (and set "status" if the screenshot shows completed/cancelled).
- Exchange order screenshot → add_order (side from the USER's point of view, coin, qty, rate/price, counterparty nickname, order number in note, status).
- Money SENT to a known party (see DATA.parties) → pay_party (to_account from the receiver bank/UPI shown, banks = which of MY banks it was sent from if shown, method, UTR/ref in note).
- Money sent/received that matches the total of an order with "unassigned" amount (DATA.recent_orders) → assign_banks for that order_id instead of creating a new record.
- Personal spending (food, petrol, rent, bills…) → add_expense.
- Money moved between my own banks → transfer.
- Records are SAVED AUTOMATICALLY without the user checking, so only output a record when its key numbers (side, quantity, rate or amount) are clearly readable. If something is unreadable or missing, skip that record and explain in "questions".
- Match my banks by name, bank name or last 4 digits; parties by name. Use exact names from DATA.
- Never create the same payment twice; if two screenshots show the same UTR/ref, use one.
${aiStyle()} Amounts in ₹. Keep JSON keys and action fields in English.
Action formats: add_order {"type":"add_order","side","coin","qty","rate","mode","status","platform","payment","counterparty","note","banks":[{"bank","amount","method"}]}; pay_party {"type":"pay_party","party","amount","to_account","paid_by","banks":[{"bank","amount","method"}],"note"}; assign_banks {"type":"assign_banks","order_id","banks":[...]}; add_expense {"type":"add_expense","amount","category","bank","note"}; transfer {"type":"transfer","from","to","amount","method"}; add_party_due {"type":"add_party_due","party","amount","note"}.
- PAYMENT DETAILS: for every screenshot that is a payment confirmation also fill "payments" with what is printed on it (never guess a number): {"shot":1,"amount","utr","sender","receiver","bank","last4" (for a UPI Lite payment there is no account number: put the bank shown by the small logo badge on the UPI Lite icon in "bank", e.g. SBI, and ignore "Powered by ... Bank" at the bottom. Otherwise the last 4 digits of the bank ACCOUNT the money was debited from, printed next to "Debited from" or "From". NEVER digits that belong to a UPI ID, anything with an @ sign is a UPI ID and is not an account number),"time":"YYYY-MM-DD HH:MM","status":"Success|Pending|Failed","direction":"in|out"}. The user checks these before anything is marked verified.
Respond ONLY with JSON: {"summary":"what you found, 1-3 lines","actions":[...],"questions":["..."],"payments":[...]}.
MEMORY: ${JSON.stringify(aiMemory())}
DATA: ${JSON.stringify(agentContext())}
${text?"PASTED TEXT:\n"+text.slice(0,12000):""}${ocrText?"\nSCREENSHOT TEXT:"+ocrText.slice(0,16000):""}`;
    let raw;
    if(vision){
      const skipP=new Promise((_,no)=>{skipFn=()=>no(Object.assign(new Error("skip"),{code:"skipped"}))});
      const capP=new Promise((_,no)=>setTimeout(()=>no(Object.assign(new Error("cap"),{code:"busy",text:"The AI is taking too long."})),75000));
      const aiP=aiCall([{role:"user",content:prompt}],null,blobs);aiP.catch(()=>{});
      try{raw=await Promise.race([aiP,skipP,capP])}
      finally{clearInterval(tick);if(skipBtn)skipBtn.remove()}
    }else raw=await aiCall([{role:"user",content:prompt}],null,[]);
    let res=null;try{const m=raw.match(/\{[\s\S]*\}/);res=m?JSON.parse(m[0]):null}catch(e){}
    if(!res){res0.textContent=raw||"Couldn't read that. Try a clearer screenshot or paste the text.";return}
    const acts=(Array.isArray(res.actions)?res.actions:[]).filter(a=>a&&ACT[a.type]&&a.type!=="remember").slice(0,15);
    if(ocrText){const d=document.createElement("details");d.className="note";d.innerHTML=`<summary style="cursor:pointer">Text read from screenshots</summary><pre style="white-space:pre-wrap;font:500 .74rem var(--mono);margin:6px 0 0">${esc(ocrText.trim())}</pre>`;res0.after(d)}
    res0.textContent=(res.summary||"")+((res.questions||[]).length?"\n\nNeeds your input:\n• "+res.questions.join("\n• "):"")+(acts.length?"":"\n\nNothing to record.");
    if(vision&&Array.isArray(res.payments))res.payments.slice(0,10).reverse().forEach(x=>{const t=x.time?Date.parse(String(x.time).replace(" ","T")):0;const p={amount:+x.amount||0,utr:String(x.utr||"").replace(/\s+/g,""),sender:String(x.sender||""),receiver:String(x.receiver||""),bank:String(x.bank||""),last4:String(x.last4||""),time:isNaN(t)?0:t,status:/fail/i.test(x.status)?"Failed":/pend/i.test(x.status)?"Pending":"Success",dir:x.direction==="in"?"in":x.direction==="out"?"out":"",method:"UPI"};
      if(p.amount>0&&p.utr&&!shownUtr.has(normRef(p.utr)))res0.after(payCard(p,i2Files[Math.max(0,(+x.shot||1)-1)]||null,"AI"))});
    if(acts.length){
      if(pref("autoIntake")!==false){const card=await autoApply(acts,[...i2Files]);res0.after(card);i2Files=[];i2Draw();$("#i2-text").value=""}
      else{const card=actionCard(acts,out,[...i2Files]);res0.after(card);card.querySelector("[data-apply]").addEventListener("click",()=>{i2Files=[];i2Draw();$("#i2-text").value=""})}}
  }catch(err){
    if(tick)clearInterval(tick);if(skipBtn)skipBtn.remove();
    let n=0;if(ocrJob){const st=()=>{res0.textContent=(err&&err.code==="skipped"?"AI skipped. ":"The AI is slow. ")+"Reading the payment on your phone… "+String(ocrState||"").replace(/^Screenshot reader: /,"")};st();ocrListeners=[st];const t=setInterval(st,1000);try{n=await Promise.race([ocrJob,new Promise(r=>setTimeout(()=>r(0),100000))])}catch(e){}clearInterval(t);ocrListeners=[]}
    if(err&&(err.code==="skipped"||err.code==="busy")){res0.textContent=n?"Payment read on your phone (below). "+(err.code==="skipped"?"AI skipped":"The AI was too slow")+", so no order was made from it. Try again later, or add the order by hand.":(err.code==="skipped"?"Skipped the AI.":"The AI is busy or slow right now.")+" Couldn't read a payment on the phone either"+(/couldn't start|took too long/.test(String(ocrState))?" ("+String(ocrState).replace(/^Screenshot reader /,"reader ")+")":". Make sure the screenshot shows the full payment")+". You can also paste the SMS text.";return}
    res0.textContent=err&&err.code==="images_unavailable"?"Screenshots can't be read in this view. Paste the text instead.":err&&err.code==="image_rejected"?"One of the images couldn't be read. Try a different screenshot.":(err&&err.text)||"Couldn't read that. Try again.";
    if(err&&["bad_key","no_key","no_model","no_url","unavailable","network"].includes(err.code)){if(out.querySelector(".paycard"))res0.textContent="Payment read on your phone (below). AI isn't connected, so no order was made from it.";else res0.textContent+="\nCheck Settings → AI connection."}
  }finally{btn.disabled=false;btn.textContent=i2Files.length?"Analyze":"Add from text"}
}
$("#i2-go").onclick=()=>{i2Files.length?ixRun():legacyIntake()};
// ---- Smart Intake: run, show, save
let ixS={groups:[],items:[],busy:false,run:0,skip:null,aiNote:"",hist:null};
const ixRes=(f)=>f.res==="AUTO"?"ℹ FROM PAYMENT":f.res==="UNCLEAR"?(f.k==="method"?"⚠ DIFFERENT METHOD":/name|buyer|seller/i.test(f.k)||f.k==="buyer"||f.k==="seller"?"⚠ PARTIAL MATCH":"⚠ UNCLEAR"):f.res==="MATCH"?"✓ MATCH":f.res==="FOUND"?"✓ FOUND":f.res==="MISMATCH"?"✕ MISMATCH":"— NOT FOUND";
function ixSide(g){if(g.side)return g.side;const O=g.X.ord,P=g.X.pay;const me=[pref("nick"),pref("owner")].filter(Boolean);
  for(const m of me){if(O.seller&&verName(m,O.seller)==="M")return"SELL";if(O.buyer&&verName(m,O.buyer)==="M")return"BUY";if(P.receiver&&verName(m,P.receiver)==="M")return"SELL";if(P.sender&&verName(m,P.sender)==="M")return"BUY"}
  if(O.side==="BUY"||O.side==="SELL")return O.side;
  const d=(g.pays[0]&&g.pays[0].pay&&g.pays[0].pay.dir)||"";return d==="in"?"SELL":d==="out"?"BUY":null}
function ixStatusOf(s){s=String(s||"").toLowerCase();return/cancel/.test(s)?"Cancelled":/appeal|dispute/.test(s)?"Appeal":/complet|release/.test(s)?"Completed":"Pending"}
// Save never throws: it returns {state:"saved"|"failed"|"skipped", msg}. Saving problems are shown as SAVE FAILED, not as a failed analysis.
async function ixSave(g,force){const X=g.X,P=X.pay,O=X.ord;
  if(P&&P.liteLoad&&P.amount>0&&!g.saved){try{const l4=ixL4(P.acct||"");let lb=payBank({last4:l4,bank:P.bank||""});if(!(lb&&lb.lite&&lb.lite.on))lb=ixLiteBank(P.amount,P.liteApp);
    if(!lb)return{state:"failed",msg:"This is a UPI Lite load, but no bank has UPI Lite on. Turn it on in Edit bank first."};
    if(+P.amount>5000-(+lb.lite.bal||0)+0.5)return{state:"failed",msg:"This load is more than the room left in UPI Lite on "+lb.name+". Check the Lite balance first."};
    if(P.utr&&recs.some(r=>r.kind==="litemove"&&r.utr&&normRef(r.utr)===normRef(P.utr)))return{state:"skipped",msg:"This Lite load is already recorded"};
    await liteApply(lb,"in",+P.amount,P.utr?"receipt "+P.utr:"from receipt",true);if(P.utr){const r=recs.filter(x=>x.kind==="litemove"&&x.bank===lb.id).sort((a,c)=>c.time-a.time)[0];if(r)await patchRec(r.id,{utr:P.utr})}
    g.saved=true;try{ixHistUpdate(g)}catch(e){}return{state:"saved",msg:"UPI Lite load recorded on "+lb.name}}catch(e){return{state:"failed",msg:"Couldn't save the Lite load"}}}
  if(g.saved)return{state:"saved",msg:"Already saved"};
  if(g.dups.length&&g.dups.every(d=>d.same))return{state:"skipped",msg:"Already recorded on your matching order"};
  if(g.dups.length&&!force){const c=await confirmRisk(g.dups.map(d=>({k:d.k,msg:d.msg})),"Possible duplicate","Save anyway");if(!c)return{state:"skipped",msg:"Not saved · possible duplicate"}}
  try{
    const pp=(g.pays.find(x=>!x.support)||g.pays[0]||{}).pay||{};const bk=P.amount!=null?ixBankOf({last4:pp.last4||"",bank:P.bank||"",dir:pp.dir||P.dir||"",vpa:pp.vpa||P.vpa||""},ixSide(g)):null;
    // a SELL paid to an account the app could place on one of your banks: saving it means it is yours, so next time the UPI ID and name are known
    try{const vp=String(pp.vpa||P.vpa||"").toLowerCase();
      if(bk&&ixSide(g)==="SELL"&&vp&&(pp.dir||P.dir)!=="out"&&P.amount>0&&g.risk&&g.risk.level!=="HIGH"&&!ixMyVpas().includes(vp)&&!(P.receiver&&ixIsMe(P.receiver))){
        await patchRec(bk.id,{vpas:[...new Set([...(bk.vpas||[]),vp])]});
        let V=[];try{V=JSON.parse(pref("myVpas")||"[]")}catch(e){}if(!V.includes(vp)){V.push(vp);setPref("myVpas",JSON.stringify(V))}
        let N=[];try{N=JSON.parse(pref("myNames")||"[]")}catch(e){}if(P.receiver&&!N.includes(P.receiver)){N.push(P.receiver);setPref("myNames",JSON.stringify(N))}
        g.learnedMine=vp;toast("Saved "+vp+" as yours on "+(bk.name||bk.bankName||"your bank"))}}catch(e){}
    let proofs=[];if(assetsApi){try{proofs=await uploadProofs(g.items.map(x=>x.file))}catch(e){}}
    const shots=g.items.map(x=>x.hash);const pv=g.cmp.overall==="VERIFIED"?"verified":"ai";const method=METHODS.includes(String(verMeth(P.method)))?verMeth(P.method):"UPI";
    const split=bk&&P.amount?[{bank:bk.id,amt:+P.amount,method,...(P.lite?{lite:true}:{})}]:[];const notes=[];if(P.amount&&!bk)notes.push("Bank not matched · assign it later");
    // part payments (several payments that together make this order): each one becomes its own bank split
    if(g.partSum){try{split.length=0;notes.length=0;let lost=0;const seen=new Set();
      g.pays.filter(x=>x.part&&x.pay&&x.pay.amount>0).forEach(x=>{const q=x.pay,b2=ixPartBank(x,ixSide(g));
        if(!b2){lost++;return}const k=b2.id+"|"+(+q.amount);if(seen.has(k))return;seen.add(k);
        split.push({bank:b2.id,amt:+q.amount,method:METHODS.includes(String(verMeth(q.method)))?verMeth(q.method):"UPI"})});
      if(lost)notes.push(lost+" part payment"+(lost>1?"s":"")+" had no matching bank · assign later");
      if(split.length>1)notes.push("Paid from "+split.length+" banks")}catch(e){}}
    if(g.target){const t=g.target;
      if(P.utr&&t.utr&&normRef(t.utr)===normRef(P.utr))return{state:"skipped",msg:"Already recorded on that order"};
      const vpaN=(ixSide(g)==="BUY"||t.side==="BUY")?(P.vpa||pp.vpa||""):"";const patch={...(vpaN&&!t.vpa?{vpa:vpaN}:{}),...(t.side==="SELL"&&P.sender&&!t.payer?{payer:String(P.sender).slice(0,60)}:{}),shots:[...new Set([...(t.shots||[]),...shots])],proofs:[...(t.proofs||[]),...proofs],pv,...(P.utr&&!t.utr?{utr:P.utr}:{}),...(((g.tdsSet!=null?g.tdsSet:O.tds)>0)&&t.side==="SELL"&&!t.tds?{tds:g.tdsSet!=null?g.tdsSet:O.tds,...(O.tdsQ>0&&g.tdsSet==null?{tdsQ:O.tdsQ}:{})}:{}),...(!exIdOf(t)&&O.id?{exId:O.id}:{}),...(P.date?{payAt:verWhen(P.date,P.time)||undefined}:{})};
      if(split.length&&allocated(t)<orderTotal(t)-0.5){const have=new Set((t.splits||[]).map(x=>x.bank+"|"+x.amt));patch.splits=[...(t.splits||[]),...split.filter(x=>!have.has(x.bank+"|"+x.amt))]}
      await patchRec(t.id,patch);await auditLog(t,"intake_attach",{result:g.cmp.overall,risk:g.risk.level});g.savedId=t.id;notes.unshift("Added to your existing order")}
    else{const side=ixSide(g);if(!side)return{state:"failed",msg:"Choose whether you bought or sold, then save"};
      const fiat=O.fiat!=null?O.fiat:P.amount,qty=O.crypto||(fiat&&O.price?+(fiat/O.price).toFixed(2):null),rate=O.price||(fiat&&O.crypto?+(fiat/O.crypto).toFixed(2):null);
      if(!g.order){return{state:"failed",msg:"There is no order screenshot for this payment. Use the payment card to attach it to an order."}}
      let qty2=qty,rate2=rate,estNote="";
      if(!(qty2>0&&rate2>0)&&ixStatusOf(O.status)==="Cancelled"&&fiat>0){const tr=rate2>0?rate2:ixTypRate();if(tr>0){rate2=rate2>0?rate2:tr;qty2=qty2>0?qty2:+(fiat/rate2).toFixed(2);estNote="Cancelled order. "+(rate?"":"Rate estimated from your recent orders")}}
      if(!(qty2>0&&rate2>0))return{state:"failed",msg:"Order quantity or price couldn't be read. Run Deep AI check or add the order by hand."}
      const cp=side==="SELL"?(O.buyer||P.sender||""):(O.seller||P.receiver||"");
      const no={id:newId("o"),...(side==="SELL"&&P.sender?{payer:String(P.sender).slice(0,60)}:{}),side,coin:O.coin||"USDT",qty:qty2,rate:rate2,status:ixStatusOf(O.status),mode:"P2P",pay:method,platform:O.platform?(O.platform[0].toUpperCase()+O.platform.slice(1).toLowerCase()):(pref("plat")||"Binance"),cp,note:[estNote,O.why?"Reason: "+O.why:""].filter(Boolean).join(" · "),splits:split,proofs,shots,pv,time:ixOrdTime(X,P.date?verWhen(P.date,P.time):0)||Date.now(),src:"ai"};
      {const td=g.tdsSet!=null?g.tdsSet:O.tds;if(side==="SELL"&&td>0){no.tds=td;if(O.tdsQ>0&&g.tdsSet==null)no.tdsQ=O.tdsQ;no.tdsSrc="order"}}if(O.id)no.exId=String(O.id).slice(0,40);if(P.utr)no.utr=String(P.utr).slice(0,40);if(side==="BUY"&&(P.vpa||pp.vpa))no.vpa=P.vpa||pp.vpa;if(P.date)no.payAt=verWhen(P.date,P.time)||undefined;
      await putRec(no);await auditLog(no,"create",{by:"intake",result:g.cmp.overall,risk:g.risk.level});g.savedId=no.id}
    try{const nk=(g.order&&g.order.ord&&g.order.ord.nick)||O.nick||"";const real=g.target?g.target.cp:(O.buyer&&ixSide(g)==="SELL"?O.buyer:O.seller)||"";if(nk&&real&&ixlN(nk)!==ixlN(real))await ixLinkNames(nk,real)}catch(e){}
    try{const ln=await ixlOnSave(g);if(ln)notes.push(ln)}catch(e){}
    try{if(P.lite&&bk&&P.amount>0&&!g.liteDone){g.liteDone=true;const lb=banks.find(x=>x.id===bk.id);if(lb&&lb.lite&&lb.lite.on){const nb=await liteApply(lb,"spend",+P.amount,"from payment screenshot");notes.push("Paid from UPI Lite · Lite balance now "+inr(nb))}}}catch(e){}
    g.saved=true;ixHistUpdate(g);return{state:"saved",msg:notes.join(" · ")||"Saved"}
  }catch(e){console.error(e);return{state:"failed",msg:"Couldn't save: "+(e&&e.message||"unknown error")}}}
const ixHistWhy=g=>{try{return ixWhy(g).map(x=>String(x).slice(0,140)).slice(0,6)}catch(e){return[]}};
async function ixHistAdd(g){try{const P=g.X.pay,O=g.X.ord;const key=g.items.map(x=>x.hash).sort().join("");const old=recs.find(r=>r.kind==="ix"&&r.key===key);if(old){g.histId=old.id;await patchRec(old.id,{overall:g.cmp.overall,risk:g.risk.level,ai:g.ai==="ok",side:ixSide(g)||"",amount:P.amount!=null?P.amount:O.fiat,time:Date.now(),why:ixHistWhy(g)});return}const rec={id:newId("ix_"),kind:"ix",key,why:ixHistWhy(g),amount:P.amount!=null?P.amount:O.fiat,name:(ixSide(g)==="BUY"?(O.seller||P.receiver):ixSide(g)==="SELL"?(O.buyer||P.sender):null)||O.buyer||O.seller||P.sender||P.receiver||"",orderRef:O.id||"",overall:g.cmp.overall,risk:g.risk.level,ai:g.ai==="ok",side:ixSide(g)||"",types:g.items.map(x=>x.cls.type),saved:false,orderId:null,time:Date.now()};g.histId=rec.id;await putRec(rec)}catch(e){}}
async function ixHistUpdate(g){try{if(g.histId)await patchRec(g.histId,{saved:true,orderId:g.savedId||null})}catch(e){}}
function ixChip(l,s,t){const ic={ok:"✓",warn:"⚠",bad:"✕",na:"—"}[s];return`<span class="ixc ${s}" title="${esc(t||"")}">${ic} ${l}</span>`}
function ixStatuses(g){const its=g.items;
  const ocr=its.every(x=>x.ocr&&x.ocr.status==="ok")?"ok":its.some(x=>x.ocr&&x.ocr.status!=="fail")?"warn":"bad";
  const cls=its.every(x=>x.cls.type!=="UNKNOWN")?"ok":"warn";
  const ext=its.every(x=>x.ext==="ok")?"ok":its.some(x=>x.ext!=="fail")?"warn":"bad";
  const ai=g.ai==="ok"?"ok":g.ai==="unavailable"?"warn":"na";
  const ver=g.cmp.overall==="VERIFIED"?"ok":g.cmp.overall==="REVIEW"?"warn":"bad";
  const sv=g.save?(g.save.state==="saved"?"ok":g.save.state==="failed"?"bad":"warn"):"na";
  return{ocr,cls,ext,ai,ver,sv}}
const IX_SRC={amount:["pay.amount","ord.fiat"],buyer:["pay.sender","ord.buyer"],seller:["pay.receiver","ord.seller"],utr:["pay.utr"],orderid:["ord.id"],method:["pay.method","ord.method"],time:["pay.date","pay.time","ord.when"],acct:["pay.bank","pay.acct","ord.acct"],status:["pay.status"]};
const ixSrc=(g,k)=>{const a=g.aiFilled;return a&&(IX_SRC[k]||[]).some(x=>a.has(x))?'<span class="ixsrc ai">✨ AI</span>':'<span class="ixsrc">📷 phone</span>'};
function ixWhy(g){const F=g.cmp.fields,out=[];
  F.filter(f=>f.res==="MISMATCH").forEach(f=>out.push(`${f.label}: ${f.note||"does not match"}${f.pay!=="—"&&f.ord!=="—"?` (${f.pay} vs ${f.ord})`:""}`));
  g.cmp.local.forEach(x=>out.push(x));
  if(!out.length)F.filter(f=>f.major&&(f.res==="NOTFOUND"||f.res==="UNCLEAR")).forEach(f=>out.push(`${f.label}: ${f.note||(f.res==="NOTFOUND"?"not found in the screenshots":"unclear")}`));
  if(g.conflicts&&g.conflicts.length)out.push("Phone and AI read different values for: "+g.conflicts.join(", ")+". The AI value is shown; please confirm it.");
  g.risk.reasons.forEach(r=>{if(out.length<5&&!out.some(o=>o.toLowerCase().includes(r.toLowerCase().slice(0,12))))out.push(r)});
  if(!out.length&&g.cmp.overall==="VERIFIED")out.push("All key fields agree across the screenshots");
  if(g.cmp.overall!=="VERIFIED"&&g.ai!=="ok"&&g.items.some(x=>x.ocr&&x.ocr.conf!=null&&x.ocr.conf<85))out.push("Phone reading confidence is low, so this could be a reading error");
  return out.slice(0,5)}
function ixOwnRow(l4){const c=banks.filter(b=>b.type!=="Cash"&&!String(b.accNo||"").replace(/\D/g,""));
  return c.length?`<div class="ixown"><select data-ixown aria-label="Which bank is this?">${c.map(b=>`<option value="${esc(b.id)}">${esc(b.name||b.bankName)}</option>`).join("")}</select><button type="button" class="mini" data-ix="own:${esc(l4)}">Yes, it's mine</button></div>`:`<div class="ixown"><button type="button" class="mini ghost" data-ix="addbank">Add ••${esc(l4)} in Bank</button></div>`}
// part payments: which of YOUR banks each part came out of / went into (auto from the account digits or UPI id, or picked here)
function ixPartBank(x,sd){if(x.bankPick){const b=banks.find(k=>k.id===x.bankPick);if(b)return b}const q=x.pay||{};return ixBankOf(q,sd)||ixVpaBank(q.vpa)||null}
function ixPartsHtml(g){if(!g.partSum)return"";const sd=ixSide(g),mine=banks.filter(b=>b.type!=="Cash"),parts=g.pays.filter(x=>x.part&&x.pay&&x.pay.amount>0);if(!parts.length)return"";
  const tot=parts.reduce((t,x)=>t+(+x.pay.amount),0);
  return`<div class="ixmine"><b>Part payments</b><div class="note" style="margin:2px 0 6px">${sd==="SELL"?"Each part goes into the bank it was received in":"Each part is taken out of the bank it was paid from"}. Total ${inr(+tot.toFixed(2))}.</div>`+parts.map(x=>{const q=x.pay,b=ixPartBank(x,sd),acct=q.last4?"••"+q.last4:q.fromLast4?"••"+q.fromLast4:"";
    return`<div class="ixpart" style="display:flex;gap:8px;align-items:center;margin:6px 0"><div style="min-width:0;flex:1"><b>${inr(+(+q.amount).toFixed(2))}</b><div class="note" style="margin:0">${[q.time?q.time:"",acct,q.bank||"",q.vpa||""].filter(Boolean).map(esc).join(" · ")||"account not read"}</div></div>`
      +(mine.length?`<select class="ssel" data-ixpart="${esc(x.hash)}" style="flex:1;min-width:0"><option value="">Which bank?</option>${mine.map(k=>`<option value="${esc(k.id)}"${b&&b.id===k.id?" selected":""}>${esc(k.name||k.bankName)}</option>`).join("")}</select>`:'<span class="note">Add your banks first</span>')+`</div>`}).join("")+`</div>`}
function ixCardHtml(g,many){const X=g.X,P=X.pay,O=X.ord,T=VER_TXT[g.cmp.overall],S=ixStatuses(g);const amt=P.amount!=null?P.amount:O.fiat;
  const yn=v=>v==null||v===""?"—":"✓";const ck=(l,v)=>`<div class="ixk ${v==null||v===""?"na":""}"><span>${v==null||v===""?"—":"✓"}</span> ${l}</div>`;
  const partial=!(P.amount!=null&&P.utr&&(!g.order||(O.id&&(O.fiat!=null||O.crypto!=null))))&&g.cmp.overall!=="VERIFIED";
  const aiNote=g.ai==="unavailable"?"LOCAL ANALYSIS COMPLETE · Cloud AI unavailable. Results below are based on on-device analysis.":partial?"PARTIAL READING · Some information could not be confidently read.":"";
  const side=g.target||ixSide(g)||!g.order?"":`<div class="note" style="margin:6px 0">Did you buy or sell?</div><div class="row2"><button class="mini ghost" type="button" data-ix="side:BUY">I bought</button><button class="mini ghost" type="button" data-ix="side:SELL">I sold</button></div>`;
  const saveLbl=g.saved?"SAVED ✓":g.save&&g.save.state==="failed"?"SAVE AGAIN":"SAVE TRANSACTION";
  const M=ixMine(g),you=pref("owner")||"You",sd=M.side;const ini=n=>String(n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase()||"?";
  const other=sd==="BUY"?(O.seller||P.receiver):sd==="SELL"?(O.buyer||P.sender):null;
  const L=sd==="BUY"?{n:you,sub:M.acct||(P.acct&&ixAcctOk(P.acct)?"Account "+P.acct:P.bank)||"Your account",me:1}:sd==="SELL"?{n:other||"Buyer",sub:"Buyer"+(O.platform?" · "+O.platform:"")}:{n:P.sender||O.buyer||"Sender",sub:"Sender"};
  const R=sd==="BUY"?{n:other||"Seller",sub:"Seller"+(O.platform?" · "+O.platform:"")}:sd==="SELL"?{n:you,sub:M.acct||(P.dir==="out"?(P.vpa||""):(P.acct&&ixAcctOk(P.acct)?"Account "+P.acct:P.bank))||"Your account",me:1}:{n:P.receiver||O.seller||"Receiver",sub:"Receiver"};
  const party=x=>`<div class="ixp${x.me?" me":""}"><span class="av">${esc(ini(x.n))}</span><b>${esc(x.n)}</b><small>${esc(x.sub)}</small></div>`;
  const C=2*Math.PI*19,off=C*(1-Math.max(0,Math.min(100,g.conf))/100),col=g.cmp.overall==="VERIFIED"?"var(--accent)":g.cmp.overall==="REVIEW"?"var(--warn)":"var(--sell)";
  const deal0=O.crypto&&O.price?`${sd==="SELL"?"Selling":sd==="BUY"?"Buying":"Trade"} ${O.crypto} ${O.coin||"USDT"} @ ₹${O.price}`:"";const partL=g.partSum?g.pays.filter(x=>x.part).map(x=>"₹"+(+(+x.pay.amount).toFixed(2)).toLocaleString("en-IN")).join(" + "):"";const deal=deal0+(partL?(deal0?" · ":"")+"Paid in "+g.pays.filter(x=>x.part).length+" parts: "+partL:"");
  return`<div class="vres ${g.cmp.overall}"><div class="ixtop">${sd?`<button type="button" class="ixside ${sd}" data-ix="flip" title="Wrong? Tap to switch">${sd} <i>⇄</i></button>`:""}<span class="vchip">${g.cancelOnly?"⛔ CANCELLED ORDER":T[0]+" "+(g.cmp.overall==="VERIFIED"?"VERIFIED":T[1])}</span><span class="ixring" title="${g.conf}% overall trust"><svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="19" fill="none" stroke="var(--line)" stroke-width="4"/><circle class="rg" cx="24" cy="24" r="19" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" style="--c:${C.toFixed(1)}" transform="rotate(-90 24 24)"/></svg><b>${g.conf}</b></span></div>
    <div class="ixflow">${party(L)}<div class="ixmid"><div class="ixamt">${amt!=null?inr(amt):"Amount not read"}</div><div class="ixline"><span></span></div>${O.fiat!=null&&P.amount!=null&&Math.abs(O.fiat-P.amount)>1?`<small>order says ${inr(O.fiat)}</small>`:""}</div>${party(R)}</div>
    <div class="vt">${deal?esc(deal)+" · ":""}${g.cancelOnly?"Nothing to verify, no money moves on a cancelled order":g.cmp.overall==="VERIFIED"?"Screenshots appear consistent":g.cmp.overall==="REVIEW"?"Needs your review":"Potential inconsistency detected"}${g.order?"":" · payment only"}</div>
    ${ixScoreHtml(g)}
    ${ixPartsHtml(g)}
    ${g.unknown&&g.unknown.length&&!g.order&&!g.pays.length?`<div class="ixmine warn"><b>Couldn't tell what this picture is</b><div style="margin:6px 0">Is it a payment, or an exchange order (a cancelled order is an order too)?</div><div class="row2">${g.unknown.map(u=>`<button class="mini ghost" data-ix="type:${u.hash}:PAY_RECEIPT">Payment</button><button class="mini ghost" data-ix="type:${u.hash}:EX_ORDER">Order</button>`).join("")}</div></div>`:""}
    ${ixLinkHtml(g)}
    ${ixLiteHtml(g)}
    ${g.roleFix?`<div class="ixmine ok"><b>Who is who</b><ul><li class="ok">${esc(g.roleFix)}</li></ul></div>`:""}
    ${(g.fixes||[]).length?`<div class="ixmine warn"><b>Numbers fixed for you</b><ul>${g.fixes.map(x=>`<li class="warn">${esc(x)}</li>`).join("")}</ul></div>`:""}
    ${g.autoT&&g.target?`<div class="ixmine ok"><b>Matched to your open order</b><ul><li class="ok">${esc(shortO(g.target))} · ${inr(orderTotal(g.target))}</li></ul></div>`:g.autoTHint?`<div class="ixmine warn"><b>Which order?</b><ul><li class="warn">${g.autoTHint} open orders have this amount. Choose the right one below.</li></ul></div>`:""}
    ${g.auto&&g.saved?`<div class="ixmine ok"><b>Saved automatically</b><ul><li class="ok">Verified and low risk. Use Undo auto-save at the top if it is wrong.</li></ul></div>`:""}
    ${M.lines.length?`<div class="ixmine ${M.verdict}"><b>Your account check</b><ul>${M.lines.map(l=>`<li class="${l.s}">${esc(l.t)}${l.own?ixOwnRow(l.own):""}${l.mine?ixMineRow(l.mine):""}</li>`).join("")}</ul></div>`:""}
    <div class="ixwhy"><b>WHY</b><ul>${ixWhy(g).map(w=>`<li>${esc(w)}</li>`).join("")}</ul></div>
    <div class="ixai">${g.ai==="ok"?"✨ Checked by AI vision on top of the phone reading":g.ai==="unavailable"?"⚠ Cloud AI unavailable"+(g.aiErr==="bad_key"?" (key rejected)":g.aiErr==="rate_limited"?" (no free requests left)":g.aiErr==="busy"?" (busy or slow)":g.aiMsg&&g.aiMsg!=="slow"?" ("+esc(g.aiMsg)+")":"")+": results below are from on-device analysis":g.ai==="na"?"AI not connected: results are from on-device analysis":"📷 Read on your phone"}${g.items[0]&&g.items[0].ocr?` · ${esc(g.items.map(x=>x.ocr&&x.ocr.engine).filter((v,i,a)=>v&&a.indexOf(v)===i).join(" + "))}`:""}${(()=>{const A=[...new Set(g.items.map(x=>x.app).filter(Boolean))];return A.length?" · "+esc(A.join(" + ")):""})()}</div>
    ${aiNote&&g.ai!=="unavailable"&&g.ai!=="na"&&partial?`<div class="note" style="margin:6px 0 0"><b>PARTIAL READING</b><br>Some information could not be confidently read.</div>`:""}
    <div class="ixchips">${ixChip("OCR",S.ocr,"OCR_STATUS")}${ixChip("Type",S.cls,"CLASSIFICATION_STATUS")}${ixChip("Extract",S.ext,"EXTRACTION_STATUS")}${ixChip("AI",S.ai,"AI_STATUS")}${ixChip("Verify",S.ver,"VERIFICATION_STATUS")}${ixChip("Save",S.sv,"SAVE_STATUS")}</div></div>
    <div class="pvs">${g.items.map(x=>`<span class="pv"><img src="${URL.createObjectURL(x.file)}" alt=""><small class="ixt">${esc(IX_TYPES[x.cls.type])}</small></span>`).join("")}</div>
    ${g.unknown&&g.unknown.length&&(g.order||g.pays.length)?`<div class="note">Couldn't tell what ${g.unknown.length>1?"some pictures are":"one picture is"}. Tell me: ${g.unknown.map(u=>`<button class="mini ghost" data-ix="type:${u.hash}:PAY_RECEIPT">${"Payment"}</button><button class="mini ghost" data-ix="type:${u.hash}:EX_ORDER">Order</button>`).join(" ")}</div>`:""}
    ${g.dups.length?`<div class="ixdup"><b>⚠ POSSIBLE DUPLICATE</b>${g.dups.map(d=>`<div>${esc(d.msg)}</div>`).join("")}</div>`:""}
    ${g.pays.length||g.order?`<div class="pcsec">Payment</div><div class="ixks">${ck("Amount",P.amount)}${ck("UTR",P.utr)}${ck("Sender",P.sender)}${ck("Receiver",P.receiver)}${ck("Status",P.status)}</div>`:""}
    ${g.order?`<div class="pcsec">Order</div><div class="ixks">${ck("Order ID",O.id)}${ck("Amount",O.fiat)}${ck("Buyer",O.buyer)}${ck("Seller",O.seller)}</div>`:""}
    ${(()=>{if(!(g.order||g.target)||ixSide(g)!=="SELL")return"";const v=g.tdsSet!=null?g.tdsSet:O.tds,fi=O.fiat!=null?O.fiat:(g.target?orderTotal(g.target):P.amount);
      return`<div class="ixtds"><span>TDS (cut after the order completes)</span><b>${v>0?inr(v)+(O.tdsQ>0&&g.tdsSet==null?" · "+fmtQ(O.tdsQ)+" USDT":""):"not read"}</b>${fi>0?`<button class="mini ghost" data-ix="tds1">${v>0?"Reset to 1%":"Add 1%"}</button>`:""}${v>0?`<button class="mini ghost" data-ix="tds0">Remove</button>`:""}</div>`})()}
    <div class="pcsec">Match analysis</div><div class="vtab">${g.cmp.fields.filter(f=>g.order||!["buyer","seller","method","acct"].includes(f.k)).map(f=>`<div class="vrow ${f.res}"><div class="vk">${esc(f.label)} ${ixSrc(g,f.k)}</div><div class="vv"><span>${esc(f.pay)}</span><span>${esc(f.ord)}</span></div><div class="vr">${ixRes(f)}</div>${f.note?`<div class="vn">${esc(f.note)}</div>`:""}</div>`).join("")}</div>
    <div class="pcsec">Risk analysis</div><div class="ixrisk ${g.risk.level}"><b>${g.risk.level} RISK</b>${g.risk.reasons.length?`<ul>${g.risk.reasons.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>`:"<div>No warning signs found in what is visible.</div>"}</div>
    <p class="note">Screenshot analysis cannot independently prove that a payment actually settled. Check your bank app or SMS before releasing coins.</p>
    ${g.save?`<div class="ixsave ${g.save.state}"><b>${g.save.state==="saved"?"RECORDED 1 OF 1":g.save.state==="failed"?"ANALYSIS COMPLETE · SAVE FAILED":"NOT SAVED"}</b><div>${esc(g.save.msg||"")}</div></div>`:""}
    ${side}
    <div class="row2" style="margin-top:10px">${g.order||g.target?`<button class="primary" type="button" data-ix="save" ${g.saved?"disabled":""}>${saveLbl}</button>`:""}<button class="mini ghost" type="button" data-ix="recheck">RECHECK</button></div>${!g.order&&!g.target?`<div class="note" style="margin-top:6px">Payment only: choose the order it belongs to below, then confirm.</div><div data-paycard></div>`:""}
    <div class="row2" style="margin-top:6px"><button class="mini ${g.cmp.overall!=="VERIFIED"&&g.ai!=="ok"?"":"ghost"}" type="button" data-ix="deep">${g.ai==="ok"?"DEEP AI CHECK AGAIN":"DEEP AI CHECK"}</button><button class="mini ghost" type="button" data-ix="raw">VIEW RAW DATA</button>${pref("dev")?'<button class="mini ghost" type="button" data-ix="debug">DEBUG</button>':""}</div>
    <div class="ixraw" hidden><pre>${esc(JSON.stringify({ocr:g.items.map(x=>({type:x.cls.type,engine:x.ocr&&x.ocr.engine,conf:x.ocr&&x.ocr.conf,text:x.ocr&&x.ocr.text})),payment:P,order:O,flags:g.cmp.flags,risk:g.risk,duplicates:g.dups.map(d=>d.msg),aiReasons:g.reasonsAI,aiConflicts:g.conflicts||[]},null,1))}</pre></div>`}
function ixDraw(){try{ixRail()}catch(e){}try{i2Thumbs()}catch(e){}const out=$("#i2-ix");if(!out)return;out.innerHTML="";const G=ixS.groups;try{const ca=$("#ix-auto");if(ca)ca.checked=pref("ixAuto")!=="0";ixDrawExtras(out)}catch(e){console.error(e)}
  if(G.length>1){const h=document.createElement("div");h.className="acard ixhead";h.innerHTML=`<div class="ah">${G.length} TRANSACTIONS DETECTED</div><div class="row2"><button class="primary" type="button" data-ixall="save">SAVE ALL</button><button class="mini ghost" type="button" data-ixall="review">REVIEW INDIVIDUALLY</button></div><div class="note" data-ixallmsg></div>`;
    h.querySelector('[data-ixall="save"]').onclick=ixSaveAll;h.querySelector('[data-ixall="review"]').onclick=()=>{out.querySelectorAll(".ixg").forEach((e,i)=>{e.open=i===0});h.querySelector("[data-ixallmsg]").textContent="Open each transaction below and check it before saving."};out.appendChild(h)}
  G.forEach((g,i)=>{const d=document.createElement(G.length>1?"details":"div");d.className="acard ixg";d.dataset.gid=g.id;if(G.length>1){d.open=ixS.open===g.id||G.length<=2;d.innerHTML=`<summary><b>TRANSACTION ${i+1}</b> · ${g.items.length} screenshot${g.items.length>1?"s":""} · ${g.X.pay.amount!=null?inr(g.X.pay.amount):g.X.ord.fiat!=null?inr(g.X.ord.fiat):"?"} · ${VER_TXT[g.cmp.overall][1]}${g.saved?" · saved":""}</summary><div class="ixb">${ixCardHtml(g,true)}</div>`}else d.innerHTML=`<div class="ixb"><div class="pcsec" style="margin-top:0">TRANSACTION 1 · ${g.items.length} screenshot${g.items.length>1?"s":""}</div>${ixCardHtml(g,false)}</div>`;
    d.addEventListener("click",e=>{const b=e.target.closest("[data-ix]");if(!b)return;ixAct(g,b.dataset.ix,b)});d.addEventListener("change",e=>{const ls=e.target.closest("[data-ixlite]");if(ls){g.liteBank=ls.value||null;try{ixVerify(g)}catch(x){}ixDraw();return}const sel=e.target.closest("[data-ixpart]");if(!sel)return;const it=g.pays.find(p=>p.hash===sel.dataset.ixpart);if(it){it.bankPick=sel.value||null}});out.appendChild(d);
    const slot=d.querySelector("[data-paycard]");if(slot){const it=g.pays.find(x=>!x.support)||g.pays[0];try{if(it&&it.ocr&&it.ocr.text){const pp=payParse(it.ocr.text);if(pp.ok||pp.amount)slot.appendChild(payCard(pp,it.file,"phone"))}}catch(e){console.error(e)}}})}
async function ixAct(g,a,btn){
  if(a==="linknames"){const c=ixLinkCand(g);if(c){await ixLinkNames(c.nick,c.real);ixS.groups.forEach(x=>{try{ixVerify(x)}catch(e){}});ixDraw();toast(`Linked ${c.nick} = ${c.real}`)}return}
  if(a==="tds1"||a==="tds0"){const fi=g.X.ord.fiat!=null?g.X.ord.fiat:(g.target?orderTotal(g.target):g.X.pay.amount);g.tdsSet=a==="tds0"?0:+(fi*0.01).toFixed(2);ixDraw();return}
  if(a==="debug"){sheets.ixdebug(g.id);return}
  if(a==="raw"){const r=btn.closest(".ixb").querySelector(".ixraw");r.hidden=!r.hidden;return}
  if(a==="addbank"){sheets.bank();return}
  if(a.startsWith("own:")){const l4=a.slice(4),sel=btn.closest(".ixown").querySelector("[data-ixown]"),bk=banks.find(x=>x.id===(sel&&sel.value));if(bk){await patchRec(bk.id,{accNo:"XXXXXX"+l4});toast(`Saved ••${l4} on ${bk.name||bk.bankName}`);ixS.groups.forEach(x=>{try{ixVerify(x)}catch(e){}});ixDraw()}return}
  if(a==="mine"){const nm=btn.dataset.nm||"",vp=(btn.dataset.vp||"").toLowerCase(),sel=btn.closest(".ixmrow").querySelector("[data-ixmbank]"),bid=sel&&sel.value;
    try{const bk=bid?banks.find(x=>x.id===bid):null;if(bk&&vp)await patchRec(bk.id,{vpas:[...new Set([...(bk.vpas||[]),vp])]}); // save the bank first: it reloads settings, so the preferences go in after
      if(nm){let L=[];try{L=JSON.parse(pref("myNames")||"[]")}catch(e){}if(!L.includes(nm)){L.push(nm);setPref("myNames",JSON.stringify(L))}}
      if(vp){let V=[];try{V=JSON.parse(pref("myVpas")||"[]")}catch(e){}if(!V.includes(vp)){V.push(vp);setPref("myVpas",JSON.stringify(V))}}
      toast("Saved as your account");ixS.groups.forEach(x=>{try{ixVerify(x)}catch(e){}});ixDraw()}catch(e){console.error(e)}return}
  if(a==="flip"){g.side=ixSide(g)==="BUY"?"SELL":"BUY";try{ixVerify(g)}catch(e){}ixDraw();return}
  if(a.startsWith("side:")){g.side=a.slice(5);try{ixVerify(g)}catch(e){}ixDraw();return}
  if(a.startsWith("type:")){const [,h,t]=a.split(":");const it=g.unknown.find(u=>u.hash===h);if(it){ixItem(it,t);ixS.groups=ixGroup(ixS.items);await ixFinish(ixS.groups,false);ixDraw()}return}
  if(a==="save"){btn.disabled=true;btn.textContent="Saving…";g.save=await ixSave(g);if(g.save.state==="saved"){toast("Recorded 1 of 1");try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}}ixDraw();renderIxHist();return}
  if(a==="recheck"){btn.disabled=true;btn.textContent="Rechecking…";g.aiPay=g.aiOrd=null;g.conflicts=null;g.ai=null;g.items.forEach(it=>{ixOcrCache.delete(it.hash);it.ocr=null});await ixOcrAll(g.items);g.items.forEach(it=>ixItem(it));ixReconcile(ixS.items);ixS.groups=ixGroup(ixS.items);await ixFinish(ixS.groups,false);ixDraw();return}
  if(a==="deep"){btn.disabled=true;btn.textContent="Asking AI…";await ixDeep(g);try{if(g.histId&&g.ai==="ok")await patchRec(g.histId,{ai:true})}catch(e){}ixDraw();renderIxHist();return}}
async function ixSaveAll(){const msg=document.querySelector("[data-ixallmsg]");let ok=0,skip=0,fail=0;const b=document.querySelector('[data-ixall="save"]');if(b){b.disabled=true;b.textContent="Saving…"}
  for(const g of ixS.groups){if(g.saved){ok++;continue}
    if(g.risk.level==="HIGH"||g.dups.length||(!g.target&&!ixSide(g))||(!g.order&&!g.target)){skip++;g.save={state:"skipped",msg:"Left for you to review"};continue}
    g.save=await ixSave(g,true);if(g.save.state==="saved")ok++;else if(g.save.state==="failed")fail++;else skip++}
  ixDraw();renderIxHist();const m=document.querySelector("[data-ixallmsg]");if(m)m.textContent=`RECORDED ${ok} OF ${ixS.groups.length}`+(skip?` · ${skip} left for review (high risk, duplicate, or details missing)`:"")+(fail?` · ${fail} could not be saved`:"");toast(`Recorded ${ok} of ${ixS.groups.length}`)}
// AI vision for one group: only the group's pictures are sent
async function ixDeep(g){const pay=(g.pays.find(x=>!x.support)||g.pays[0]),ord=g.order;const files=[pay,ord].filter(Boolean).concat(g.pays.filter(p=>p!==pay).slice(0,1));
  if(!files.length)return;
  try{const out=await Promise.race([verExtract(files.map(f=>f.blob)),new Promise((_,no)=>setTimeout(()=>no(aiErr("busy","slow")),85000))]);
    const m1=ixMerge(g.pays[0]?g.pays[0].pay:{},out.X.pay,pay&&pay.ocr?pay.ocr.conf/100:null),m2=ixMerge(ord?ord.ord:{},out.X.ord,ord&&ord.ocr?ord.ocr.conf/100:null);
    g.aiPay=m1.v;g.aiOrd=m2.v;g.aiFlags=out.X.flags;g.aiFilled=new Set([...m1.filled.map(k=>"pay."+k),...m2.filled.map(k=>"ord."+k)]);g.conflicts=[...m1.diffs.map(k=>"payment "+k),...m2.diffs.map(k=>"order "+k)];g.ai="ok";await ixlLearnLayout(g);ixVerify(g)}
  catch(e){g.ai="unavailable";g.aiErr=e&&e.code;g.aiMsg=String(e&&(e.text||e.message)||"").slice(0,140);ixVerify(g)}
  // part payments: each part picture is read on its own, so every part has its own amount, account and time (the AI only fills what the phone missed)
  if(g.partSum){for(const x of g.pays.filter(k=>k.part&&k.blob).slice(0,4)){const q=x.pay||{};if(q.amount>0&&(q.last4||q.bank||q.vpa)&&q.time&&q.date)continue;
    try{const r=(await verExtract([x.blob])).X.pay||{};const m=ixMerge(q,r,x.ocr&&x.ocr.conf!=null?x.ocr.conf/100:null);x.pay={...q,...m.v};if(!x.pay.last4&&r.acct)x.pay.last4=ixL4(r.acct);if(!x.pay.time&&r.time)x.pay.time=r.time;if(!x.pay.date&&r.date)x.pay.date=r.date}catch(e){}}}}
async function ixOcrAll(items,prog){let n=0;const skip=new Promise((_,no)=>{ixS.skip=()=>no(new Error("skip"))});skip.catch(()=>{});
  for(const it of items){if(prog)prog(n,items.length);it.ocr=await ixOcr(it,skip);n++;await new Promise(r=>setTimeout(r,0))}}
async function ixFinish(groups,useAI){for(const g of groups){ixVerify(g);
    if(useAI&&g.reasonsAI.length&&ixAiReady()&&(g.pays.length||g.order)&&!g.ai){await ixDeep(g);g.needAI=false}
    else if(g.reasonsAI.length&&!ixAiReady())g.ai="na";
    if(!g.histId)await ixHistAdd(g)}}
// when the phone reader is down, the AI reads each picture alone; this turns its answer into the same item the phone reader would have made
function ixAiItem(it,X){const P=X.pay||{},O=X.ord||{};const nP=[P.amount,P.utr,P.receiver,P.sender,P.status,P.date].filter(v=>v!=null&&v!=="").length,nO=[O.id,O.fiat,O.crypto,O.price,O.buyer,O.seller,O.when].filter(v=>v!=null&&v!=="").length;
  it.ocr={text:"",conf:null,engine:"AI",status:"ok"};it.list=null;it.ledger=null;it.pay=null;it.ord=null;
  if(nO>nP||(nO&&nO===nP&&(O.id||O.fiat))){it.ord={...O,cp:O.side==="SELL"?O.buyer:(O.seller||O.buyer),nick:null,tds:null,tdsQ:null,why:[],whenAlt:null,whenAlts:null,platform:null,conf:O.conf};it.cls={type:"EX_ORDER",conf:0.6};it.ext=O.fiat!=null&&O.id?"ok":"partial"}
  else if(nP){const l4=ixL4(P.acct||"");it.pay={...P,last4:l4,ok:!!(P.amount&&P.utr),vpa:(String(P.acct||P.bank||"").match(/\S+@\S+/)||[])[0]||null,fromLabel:null,fromLast4:null,amountAlts:null,alts:null};it.cls={type:"PAY_RECEIPT",conf:0.6};it.ext=P.amount!=null&&P.utr?"ok":P.amount!=null||P.utr?"partial":"fail"}
  else{it.cls={type:"UNKNOWN",conf:0};it.ext="fail"}
  return it}
// the whole run
async function ixRun(){if(ixS.busy)return;const files=[...i2Files];if(!files.length)return;const run=++ixS.run;ixS.T={};setTimeout(()=>{try{ixRail()}catch(e){}},0);ixS.busy=true;ixS.groups=[];
  const out=$("#i2-ix");out.innerHTML="";const card=document.createElement("div");card.className="acard ixprog";out.appendChild(card);const t0=Date.now();let msg="Getting your screenshots ready…";let skipShown=false;
  const paint=()=>{const sec=Math.round((Date.now()-t0)/1000);card.innerHTML=`<div class="ah">ANALYSING ${files.length} SCREENSHOT${files.length>1?"S":""}</div><div class="ires">${esc(msg)} ${sec}s</div>${sec>=15&&!ixS.ocrReady&&!skipShown?"":""}`+(sec>=15&&ixS.stage==="ocr"?`<div class="note">${ixAiReady()?"The phone reader is slow to start. You can skip it and let your AI read the pictures.":"The phone reader is still starting (first use downloads about 10 MB). Please keep this page open."}</div>${ixAiReady()?'<button class="mini ghost" type="button" data-skipocr>Skip phone reader</button>':""}`:"")+ixLiveHtml()+'<button class="mini ghost" type="button" data-ixcancel style="margin-top:8px">Cancel analysis</button>';const cb=card.querySelector("[data-ixcancel]");if(cb)cb.onclick=()=>{ixS.run++;clearInterval(tick);card.remove();ixS.busy=false;try{ixRail()}catch(e){}toast("Analysis cancelled")};const sb=card.querySelector("[data-skipocr]");if(sb)sb.onclick=()=>ixS.skip&&ixS.skip()};
  const tick=setInterval(paint,1000);paint();
  try{
    ixS.stage="prep";const items=await Promise.all(files.map(async(f,i)=>({i,file:f,blob:await shrinkImage(f),hash:await fileHash(f)})));
    if(run!==ixS.run)return;ixS.items=items;ixS.T.prep=Date.now()-t0;
    ixS.stage="ocr";ocrListeners=[t=>{if(/Screenshot reader/.test(t))msg=t.replace("Screenshot reader: ","Reader: ")}];
    // the phone reader can hang for minutes (slow phone, no data, app in the background): with an AI connected, give it 25 s, then let the AI read
    const autoSk=setTimeout(()=>{try{if(ixAiReady()&&!items.some(x=>x.ocr&&x.ocr.status==="ok")&&ixS.skip){ixS.skip();msg="Phone reader is slow. Your AI is reading the pictures…"}}catch(e){}},25000);
    await ixOcrAll(items,(n,m)=>{msg=`Reading screenshot ${n+1} of ${m} on your phone…`});clearTimeout(autoSk);ocrListeners=[];
    if(run!==ixS.run)return;
    if(items.every(x=>x.ocr.status==="fail")&&!ixAiReady()&&!items.some(x=>x.ocr.err==="skipped")){ocrPromise=null;ocrWorker=null;items.forEach(x=>ixOcrCache.delete(x.hash));msg="Reader didn't start, trying again…";await ixOcrAll(items,(n,m)=>{msg=`Reading screenshot ${n+1} of ${m} on your phone (2nd try)…`});ocrListeners=[];if(run!==ixS.run)return}
    ixS.T.ocr=Date.now()-t0;const failed=items.filter(x=>x.ocr.status==="fail");
    if(failed.length===items.length){ // phone reader unavailable → let the AI read everything, if one is connected
      if(!ixAiReady()){clearInterval(tick);card.innerHTML=`<div class="ah">OCR UNAVAILABLE</div><div class="note">The phone reader couldn't start (${esc(items[0].ocr.err==="timeout"?"it took too long to download":items[0].ocr.err==="empty"?"it started but read no text from the pictures":"not available here")}). Your screenshots are kept. You can paste the payment SMS text instead, connect an AI in Settings, or try again on a better connection.</div><button class="mini" type="button" data-retry>Try again</button>`;card.querySelector("[data-retry]").onclick=()=>{ocrPromise=null;ixOcrCache.clear();ixS.busy=false;ixRun()};return}
      ixS.stage="ai";msg="Phone reader unavailable. Your AI is reading the pictures…";
      const used=items.slice(0,6);let errMsg="";
      for(let k=0;k<used.length;k++){msg=`Phone reader unavailable. Your AI is reading picture ${k+1} of ${used.length}…`;
        try{const o=await verExtract([used[k].blob]);ixAiItem(used[k],o.X)}catch(e){errMsg=e&&e.message||"AI could not read it";used[k].cls={type:"UNKNOWN",conf:0};used[k].ocr={text:"",conf:null,engine:"AI",status:"fail"}}
        if(run!==ixS.run)return}
      if(used.every(x=>!x.pay&&!x.ord))throw new Error(errMsg||"The AI could not read these pictures.");
      ixS.items=items;
      ixS.stage="match";msg="Matching payments with orders…";ixS.groups=ixGroup(used.filter(x=>x.pay||x.ord));ixS.groups.forEach(g=>{g.ai="ok"});
      ixS.stage="verify";msg="Verifying…";await ixFinish(ixS.groups,false);
      if(items.length>used.length)toast("Only the first "+used.length+" pictures were read without the phone reader");
    }else{
      ixS.stage="extract";msg="Identifying and extracting…";items.forEach(it=>ixItem(it));try{await ixZoomIds(items)}catch(e){}ixReconcile(items);
      ixS.stage="match";msg="Matching payments with orders…";ixS.groups=ixGroup(items);
      ixS.stage="verify";msg="Verifying…";
      const needAI=ixAiReady();if(needAI){const gs=ixS.groups;gs.forEach(g=>ixVerify(g));if(gs.some(g=>g.reasonsAI.length))msg="Double-checking unclear parts with AI…"}
      await ixFinish(ixS.groups,true);
    }
    if(run!==ixS.run)return;ixS.T.done=Date.now()-t0;ixS.groups.forEach(g=>{g.T={...ixS.T}});
    clearInterval(tick);card.remove();ixS.autoOff=false;ixDraw();renderIxHist();try{await ixAutoSafe()}catch(e){console.error(e)}
    try{const first=out.querySelector(".ixg, .ixhead");if(first)first.scrollIntoView({block:"start",behavior:"smooth"})}catch(e){}
  }catch(e){console.error(e);clearInterval(tick);card.innerHTML=`<div class="ah">ANALYSIS INTERRUPTED</div><div class="note">${esc(e&&e.code==="busy"?"The AI is busy or slow right now.":e&&e.code==="bad_json"?e.text:"Something went wrong while reading. Your screenshots are kept.")}</div><button class="mini" type="button" data-retry>Try again</button>`;card.querySelector("[data-retry]").onclick=()=>{ixS.busy=false;ixRun()}}
  finally{clearInterval(tick);if(run===ixS.run)ixS.busy=false;try{ixRail()}catch(e){}ocrListeners=[];if(ixS.again){ixS.again=false;setTimeout(()=>ixRun(),60)}}}
// ---- Recent intakes
function renderIxHist(){const el=$("#i2-hist");if(!el)return;const L=recs.filter(r=>r.kind==="ix").sort((a,b)=>b.time-a.time).slice(0,40);if(!L.length){el.innerHTML="";return}
  const d0=new Date();d0.setHours(0,0,0,0);const t0=d0.getTime(),sec=[["Today",x=>x.time>=t0],["Yesterday",x=>x.time<t0&&x.time>=t0-DAY],["This week",x=>x.time<t0-DAY&&x.time>=t0-6*DAY]];
  const cls=x=>(x.saved?"sv ":"")+({VERIFIED:"v",REVIEW:"r",MISMATCH:"m"}[x.overall]||""),pill=x=>x.saved?"✓ Saved":((VER_TXT[x.overall]||[])[1]||"Checked"),tm=x=>new Date(x.time).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"});
  const td=L.filter(x=>x.time>=t0),nv=td.filter(x=>x.overall==="VERIFIED").length,nr=td.filter(x=>x.overall&&x.overall!=="VERIFIED").length,ns=td.filter(x=>x.saved).length;
  const aiK=td.filter(x=>x.ai===true).length,aiM=td.filter(x=>typeof x.ai==="boolean").length;
  const sum=td.length?`<div class="ixhsum"><span><b>${td.length}</b>checked today</span><span><b>${nv}</b>verified</span>${nr?`<span><b>${nr}</b>to review</span>`:""}<span><b>${ns}</b>saved</span>${aiM?`<span><b>${aiK}/${aiM}</b>used AI</span>`:""}${ixlGet().n?`<span data-ixmem class="ixmemchip"><b>🧠 ${ixlGet().n}</b>learned</span>`:""}</div>`:"";
  const nu=L.filter(x=>!x.saved).length;el.innerHTML=`<div class="pcsec" style="display:flex;justify-content:space-between;align-items:center">Recent intakes${nu?`<button type="button" class="mini ghost" data-ixclr style="margin:0">Clear ${nu} not saved</button>`:""}</div>${sum}`+sec.map(([n,f])=>{const a=L.filter(f);return a.length?`<div class="ixhl">${n}</div><div class="ixrc">${a.map(x=>`<div class="ixr ${cls(x)}" data-ixh="${esc(x.id)}" role="button" tabindex="0"><div><div>${x.side?`<span class="sd ${x.side}">${x.side}</span>`:""}<span class="a">${x.amount!=null?inr(x.amount):"—"}</span><span class="n">${esc(x.name||"No name")}</span></div><div class="t">${x.orderRef?"<span>Order …"+esc(String(x.orderRef).slice(-6))+"</span>":""}<span>${tm(x)}</span>${x.risk?`<i class="${esc(String(x.risk).toLowerCase())}">${esc(x.risk)} risk</i>`:""}</div></div><span class="p">${pill(x)}</span></div>`).join("")}</div>`:""}).join("")}



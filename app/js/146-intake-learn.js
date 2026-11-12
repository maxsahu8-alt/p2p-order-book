// Smart Intake learning loop. The AI is only for pictures the phone could not read, so every time it is used we
// (1) count why and for which app, (2) keep a small case file with the screenshot text, so the cause can be turned into a permanent
// local rule (send it to Claude and it becomes a test), and (3) remember screen types the user picked by hand.
const IXJ={st:"p2p_ix_stats",cs:"p2p_ix_cases",ty:"p2p_ix_types"};
function ixjGet(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function ixjSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function ixjAppsOf(g){return [...new Set(g.items.map(x=>x.app).filter(Boolean))]}
// count one group once: did the phone read it alone, or was the AI needed, and why
function ixStatNote(g,usedAI){if(g.statDone)return;g.statDone=true;try{const S=ixjGet(IXJ.st,{since:Date.now(),groups:0,ai:0,targeted:0,byReason:{},byApp:{}});S.groups++;const apps=ixjAppsOf(g);(apps.length?apps:["Other"]).forEach(a=>{const r=S.byApp[a]||(S.byApp[a]={n:0,ai:0});r.n++;if(usedAI)r.ai++});
  if(usedAI){S.ai++;(g.reasonsAI||[]).forEach(r=>{S.byReason[r]=(S.byReason[r]||0)+1})}ixjSet(IXJ.st,S)}catch(e){}}
function ixStatTargeted(){try{const S=ixjGet(IXJ.st,{since:Date.now(),groups:0,ai:0,targeted:0,byReason:{},byApp:{}});S.targeted=(S.targeted||0)+1;ixjSet(IXJ.st,S)}catch(e){}}
function ixCaseSave(g){try{const C=ixjGet(IXJ.cs,[]);C.unshift({t:Date.now(),apps:ixjAppsOf(g),reasons:g.reasonsAI||[],ai:g.ai||null,filled:[...(g.aiFilled||[])],conflicts:g.conflicts||[],targeted:!!g.aiTargeted,
  shots:g.items.map(x=>({type:x.cls&&x.cls.type,app:x.app||"",text:String(x.ocr&&x.ocr.text||"").slice(0,2500)}))});ixjSet(IXJ.cs,C.slice(0,12))}catch(e){}}
// remembered screen types: a screenshot that was "unclear" and the user told us what it is
function ixSig(text){const L=String(text||"").split(/\n+/).map(x=>x.toLowerCase().replace(/[^a-z ]/g,"").replace(/\s+/g," ").trim()).filter(x=>x.length>3).slice(0,6);return L.length>=3?L.join("|").slice(0,90):""}
function ixTypeOf(text){const s=ixSig(text);if(!s)return"";const m=ixjGet(IXJ.ty,{})[s];return m?m.t:""}
function ixTypeLearn(it,t){try{const s=ixSig(it.ocr&&it.ocr.text);if(!s||!t)return;const m=ixjGet(IXJ.ty,{});m[s]={t,n:((m[s]||{}).n||0)+1,at:Date.now(),app:it.app||""};const ks=Object.keys(m);if(ks.length>60)delete m[ks[0]];ixjSet(IXJ.ty,m)}catch(e){}}
// the Intake memory sheet gets three more sections
(function(){const base=sheets.ixmem;if(typeof base!=="function")return;
  sheets.ixmem=function(){base.apply(this,arguments);try{const body=document.querySelector("#sheetBody .insw");if(!body)return;const S=ixjGet(IXJ.st,null),C=ixjGet(IXJ.cs,[]),Ty=ixjGet(IXJ.ty,{});
    const free=S?S.groups-S.ai:0,pct=S&&S.groups?Math.round(100*free/S.groups):null;
    const rs=S?Object.entries(S.byReason).sort((a,b)=>b[1]-a[1]).slice(0,6):[],ap=S?Object.entries(S.byApp).sort((a,b)=>b[1].n-a[1].n).slice(0,6):[];
    const d=document.createElement("div");d.id="ixlearn";
    d.innerHTML=`<div class="pcsec">AI use</div><div class="rml">
      <div class="dqr"><span>Read on the phone alone<small>${S?`${free} of ${S.groups} deals`:"No deals counted yet"}${S&&S.targeted?` · ${S.targeted} AI checks sent only the needed screenshot`:""}</small></span><b>${pct==null?"—":pct+"%"}</b></div>
      ${rs.length?rs.map(([r,n])=>`<div class="dqr"><span>${esc(r)}<small>why the AI was needed</small></span><b>${n}</b></div>`).join(""):'<div class="dqr"><span class="note" style="margin:0">The AI has not been needed yet.</span></div>'}
      ${ap.length?`<div class="dqr"><span class="note" style="margin:0">By app: ${ap.map(([a,v])=>`${esc(a)} ${v.ai}/${v.n}`).join(" · ")}</span></div>`:""}</div>
    <div class="pcsec">Cases to turn into rules (${C.length})</div><div class="rml">${C.length?C.map((c,i)=>`<div class="dqr"><span>${esc(new Date(c.t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))} · ${esc((c.apps.join(", "))||"Unknown app")}<small>${esc(c.reasons.join("; ")||"AI check")}</small></span><button type="button" class="mini ghost" data-ixlcopy="${i}">Copy</button></div>`).join("")+`<div class="dqr"><span class="note" style="margin:0">Copy a case and send it to Claude. It becomes a fixed rule and a test, so the AI is not needed for it again. The copy holds the screenshot text, so it contains names and numbers.</span><button type="button" class="mini ghost" data-ixlclr="1">Clear</button></div>`:'<div class="dqr"><span class="note" style="margin:0">Nothing yet. When the AI is used, the screenshot text is kept here.</span></div>'}</div>
    <div class="pcsec">Screens you taught (${Object.keys(Ty).length})</div><div class="rml">${Object.keys(Ty).length?Object.entries(Ty).map(([s,v])=>`<div class="dqr"><span>${esc(IX_TYPES[v.t]||v.t)}<small>${esc(v.app||"screen")} · picked ${v.n} time${v.n>1?"s":""}</small></span><button type="button" class="mini ghost" data-ixlty="${esc(s)}">Forget</button></div>`).join(""):'<div class="dqr"><span class="note" style="margin:0">Nothing yet. When a screenshot is “unclear” and you pick its type, it is remembered.</span></div>'}</div>`;
    const dev=[...body.querySelectorAll(".pcsec")].find(x=>/Developer/.test(x.textContent));body.insertBefore(d,dev||null);
    d.addEventListener("click",async e=>{const cp=e.target.closest("[data-ixlcopy]"),cl=e.target.closest("[data-ixlclr]"),ty=e.target.closest("[data-ixlty]");
      if(cp){const c=ixjGet(IXJ.cs,[])[+cp.dataset.ixlcopy];if(!c)return;const tx="Pexai Smart Intake case\n"+JSON.stringify(c,null,1);try{await navigator.clipboard.writeText(tx);toast("Copied. Send it to Claude")}catch(x){toast("Could not copy")}return}
      if(cl){try{localStorage.removeItem(IXJ.cs)}catch(x){}sheets.ixmem();return}
      if(ty){const m=ixjGet(IXJ.ty,{});delete m[ty.dataset.ixlty];ixjSet(IXJ.ty,m);sheets.ixmem()}})}catch(e){console.error(e)}}})();

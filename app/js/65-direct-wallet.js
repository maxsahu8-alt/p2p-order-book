let proofBack=null;
let lastParty=null;
document.addEventListener("click",e=>{const t=e.target.closest("[data-sheet]");if(!t)return;const [k,id]=t.dataset.sheet.split(":");sheets[k]&&sheets[k](id)});

// direct parties & weekly payments
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function weekStart(t){const d=new Date(t||Date.now());const k=pref("week")==="Sun"?d.getDay():(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-k);return d.getTime()}
const inWeek=t=>{const w=weekStart();return t>=w&&t<w+7*DAY};
const partyPaidWeek=id=>ppays.filter(x=>x.party===id&&inWeek(x.time)).reduce((t,x)=>t+(+x.amt||0),0);
const partyOwed=id=>pdues.filter(x=>x.party===id).reduce((t,x)=>t+(+x.amt||0),0);
const partyPaid=id=>ppays.filter(x=>x.party===id).reduce((t,x)=>t+(+x.amt||0),0);
const payerName=x=>x.paidBy&&x.paidBy!=="me"?x.paidBy:"Me";
const proofImg=(id,cls)=>`<img class="${cls||"thumb"}" src="/_blob/${encodeURIComponent(id)}" alt="Payment screenshot" loading="lazy" data-proof="${esc(id)}">`;
async function shrinkImage(file){
  try{const url=URL.createObjectURL(file);const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});
    const k=Math.min(1,1600/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    return await new Promise(ok=>c.toBlob(b=>ok(b||file),"image/jpeg",.82))}catch(e){return file}}
async function uploadProofs(files){const ids=[];for(const f of files){const b=await shrinkImage(f);const res=await assetsApi.upload(b);ids.push(res.id)}return ids}
function proofPicker(el,prefix){ // returns getter for chosen files
  let files=[];const box=el.querySelector("#"+prefix+"-prev");const inp=el.querySelector("#"+prefix+"-file");
  inp.onchange=()=>{files=files.concat([...inp.files]).slice(0,3);inp.value="";draw()};
  function draw(){box.innerHTML=files.map((f,i)=>`<span class="pv"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-rp="${i}" aria-label="Remove">×</button></span>`).join("")}
  box.onclick=e=>{const b=e.target.closest("[data-rp]");if(b){files.splice(+b.dataset.rp,1);draw()}};
  return()=>files;
}
const proofField=prefix=>assetsApi?`<div class="flabel" style="margin:14px 0 8px">Payment screenshot (proof)</div><div class="filebtn" style="position:relative;flex-direction:row">Add screenshot<input id="${prefix}-file" type="file" accept="image/*" multiple class="cover-input" aria-label="Add screenshot"></div><div class="pvs" id="${prefix}-prev"></div>`:"";
function accLines(a){return[["Account holder",a.holder],["Bank",a.bankName],["Account no.",a.accNo],["IFSC",a.ifsc],["UPI ID",a.upi]].filter(x=>x[1])}
function upiText(a,amt){return(amt?[`Amount: ₹${Number(amt).toLocaleString("en-IN")}`]:[]).concat([a.holder?"Name: "+a.holder:"","UPI ID: "+a.upi]).filter(Boolean).join("\n")}
function bankText(a,amt){return(amt?[`Amount: ₹${Number(amt).toLocaleString("en-IN")}`,""]:[]).concat([["Account holder",a.holder],["Bank",a.bankName],["Account no.",a.accNo],["IFSC",a.ifsc]].filter(x=>x[1]).map(([l,v])=>l+": "+v)).join("\n")}
function accText(a,amt){return(amt?[`Amount: ₹${Number(amt).toLocaleString("en-IN")}`,""]:[]).concat(accLines(a).map(([l,v])=>l+": "+v)).join("\n")}
async function copyText(t,fallbackEl){try{await navigator.clipboard.writeText(t);toast("Copied")}catch(e){if(fallbackEl){const r=document.createRange();r.selectNodeContents(fallbackEl);const sel=getSelection();sel.removeAllRanges();sel.addRange(r)}toast("Long-press to copy")}}
function renderDirect(){
  const w=weekStart();
  $("#dWeek").textContent=new Date(w).toLocaleDateString("en-IN",{day:"numeric",month:"short"})+" – "+new Date(w+6*DAY).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  const due=parties.reduce((t,p)=>t+Math.max(0,(+p.weekly||0)-partyPaidWeek(p.id)),0);
  const paidAll=ppays.filter(x=>inWeek(x.time)).reduce((t,x)=>t+(+x.amt||0),0);
  const left=parties.reduce((t,p)=>t+Math.max(0,partyOwed(p.id)-partyPaid(p.id)),0);
  $("#dDue").textContent=inr(Math.round(due));$("#dPaid").textContent=inr(Math.round(paidAll));$("#dLeft").textContent=inr(Math.round(left));
  try{renderDirectPlus(due,paidAll,left)}catch(e){console.error(e)}
  $("#dCount").textContent=parties.length?parties.length+(parties.length===1?" party":" parties"):"";
  const today=(new Date().getDay()+6)%7;
  $("#partyList").innerHTML=parties.length?parties.map(p=>{const paid=partyPaidWeek(p.id),wk=+p.weekly||0,lf=Math.max(0,wk-paid),pc=wk?Math.min(100,paid/wk*100):0;
    const owed=partyOwed(p.id),tp=partyPaid(p.id),bl=owed-tp;
    const dd=p.dueDay!=null&&p.dueDay!==""?+p.dueDay:null;
    const tag=wk&&lf>0.5&&dd!=null?`<span class="due ${dd===today?"today":""}">${dd===today?"Due today":dd<today?"Overdue":"Due "+DAYS[dd]}</span>`:"";
    return `<button class="party" type="button" data-sheet="partyView:${p.id}"><span class="bico">${esc((p.name||"?").slice(0,2).toUpperCase())}</span><span class="pname">${esc(p.name)} ${tag}</span><span class="pleft ${owed?(bl<=0.5?"done":""):(wk&&lf<=0.5?"done":"")}">${owed?(bl>0.5?inr(bl)+" left":bl<-0.5?inr(-bl)+" extra":"Settled ✓"):wk?(lf<=0.5?"Paid ✓":inr(lf)+" left"):inr(tp)+" paid"}</span>
      ${wk?`<span class="lb"><i style="width:${pc}%"></i></span>`:""}<span class="psub"><span>${(()=>{const lp=ppays.filter(x=>x.party===p.id).sort((a,b)=>b.time-a.time)[0];return lp?"Last paid "+new Date(lp.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})+" · ":""})()}${owed?"To pay "+inr(owed)+" · paid "+inr(tp):""}${owed&&wk?" · ":""}${wk?"Week "+inr(paid)+"/"+inr(wk):""}${!owed&&!wk?"Tap to add amount to pay":""}</span></span></button>`}).join("")
    :'<div class="empty"><strong>No parties yet</strong>Add the people you pay directly every week, with their bank accounts and weekly amount.</div>';
  const rec=[...ppays].sort((a,b)=>b.time-a.time).slice(0,15);
  $("#ppList").innerHTML=rec.length?rec.map(x=>{const p=parties.find(k=>k.id===x.party)||{};const a=(p.accounts||[]).find(k=>k.id===x.account)||{};
    return `<div class="exp" data-sheet="partyView:${x.party}" style="cursor:pointer"><span><b>${esc(p.name||"Deleted party")}</b>${a.bankName||a.upi?" → "+esc(a.bankName||a.upi):""}${(x.proofs||[]).length?' <span class="mtag">Proof</span>':""}</span><span class="amt">−${inr(x.amt)}</span><div class="o-meta"><span>${new Date(x.time).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span><span>By ${esc(payerName(x))}${(x.splits||[]).length?" · "+(x.splits||[]).map(sp=>esc(bankName(sp.bank))).join(", "):""}</span></div></div>`}).join("")
    :'<div class="empty" style="padding:18px">No payments yet.</div>';
}
Object.assign(sheets,{
  party(id){const p=parties.find(x=>x.id===id)||{};let accs=(p.accounts||[]).map(a=>({...a}));
    const drawAcc=()=>{$("#pa-list").innerHTML=accs.map((a,i)=>`<div class="acc-ed"><label class="full">Account holder<input data-a="${i}" data-k="holder" value="${esc(a.holder||"")}"></label><label class="full">Bank name<input data-a="${i}" data-k="bankName" value="${esc(a.bankName||"")}"></label><label>Account no.<input data-a="${i}" data-k="accNo" inputmode="numeric" value="${esc(a.accNo||"")}"></label><label>IFSC<input data-a="${i}" data-k="ifsc" value="${esc(a.ifsc||"")}" style="text-transform:uppercase"></label><label>UPI ID<input data-a="${i}" data-k="upi" value="${esc(a.upi||"")}"></label><label>WhatsApp no.<input data-a="${i}" data-k="phone" inputmode="tel" value="${esc(a.phone||"")}" placeholder="Optional"></label><label>Amount to pay (₹)<input data-a="${i}" data-k="target" type="number" inputmode="decimal" value="${a.target||""}" placeholder="Optional"></label><label>Pay by<input data-a="${i}" data-k="due" type="date" value="${esc(a.due||"")}"></label><button type="button" class="link del full" data-ra="${i}" style="justify-self:start">Remove this account</button></div>`).join("")||'<p class="note">No accounts yet.</p>'};
    openSheet(`<h3>${id?"Edit party":"Add party"}</h3><form id="sf" style="grid-template-columns:1fr 1fr">
      <label class="full">Name<input id="pa-name" required value="${esc(p.name||"")}" placeholder="Person or business name"></label>
      <label>Phone<input id="pa-phone" inputmode="tel" value="${esc(p.phone||"")}" placeholder="Optional"></label>
      <label>Payment day<select id="pa-day"><option value="">Any day</option>${DAYS.map((d,i)=>`<option value="${i}" ${String(p.dueDay)===String(i)?"selected":""}>${d}</option>`).join("")}</select></label>
      <label class="full">Weekly amount to pay (₹)<input id="pa-weekly" type="number" inputmode="decimal" step="any" value="${p.weekly||""}" placeholder="Leave empty if it changes every week"></label>
      <label class="full">Note<input id="pa-note" value="${esc(p.note||"")}" placeholder="e.g. pay by Friday evening"></label>
      <div class="flabel">Their bank accounts / people to pay</div><div class="full" id="pa-list" style="display:flex;flex-direction:column;gap:10px"></div>
      <button type="button" class="link full" id="pa-add" style="color:var(--primary);justify-self:start">+ Add account</button>
      <button class="primary" type="submit">Save party</button>${id?'<button class="primary" type="button" id="pa-del" style="background:var(--soft);color:var(--sell)">Delete party</button>':""}</form>`,el=>{
      drawAcc();
      el.querySelector("#pa-list").addEventListener("input",e=>{const i=e.target.dataset.a;if(i!=null)accs[i][e.target.dataset.k]=e.target.value});
      el.querySelector("#pa-list").addEventListener("click",e=>{const b=e.target.closest("[data-ra]");if(b){accs.splice(+b.dataset.ra,1);drawAcc()}});
      el.querySelector("#pa-add").onclick=()=>{accs.push({id:newId("a_")});drawAcc()};
      el.querySelector("#sf").onsubmit=async e=>{e.preventDefault();const name=$("#pa-name").value.trim();if(!name){toast("Enter a name");return}
        const clean=accs.map(a=>({id:a.id||newId("a_"),holder:(a.holder||"").trim().slice(0,80),bankName:(a.bankName||"").trim().slice(0,80),accNo:(a.accNo||"").replace(/\s+/g,"").slice(0,30),ifsc:(a.ifsc||"").trim().toUpperCase().slice(0,15),upi:(a.upi||"").trim().slice(0,80),target:+a.target||0,due:a.due||""})).filter(a=>a.accNo||a.upi);
        try{await putRec({...p,id:id||newId("p_"),kind:"party",name:name.slice(0,60),phone:$("#pa-phone").value.trim().slice(0,20),dueDay:$("#pa-day").value,weekly:+$("#pa-weekly").value||0,note:$("#pa-note").value.trim().slice(0,120),accounts:clean,time:p.time||Date.now()});toast("Party saved");id?sheets.partyView(id):closeSheet()}catch(err){toast("Couldn't save")}};
      if(id)twoTap(el.querySelector("#pa-del"),async()=>{try{await delRec(id);toast("Party deleted");closeSheet()}catch(err){toast("Couldn't delete")}});
    })},
  partyView(id){const p=parties.find(x=>x.id===id);if(!p)return;lastParty=id;const wkPaid=partyPaidWeek(id),wk=+p.weekly||0,owed=partyOwed(id),tp=partyPaid(id),bl=owed-tp;
    const pays=ppays.filter(x=>x.party===id);
    const hist=[...pays.map(x=>({...x,_t:"pay"})),...pdues.filter(x=>x.party===id).map(x=>({...x,_t:"due"}))].sort((a,b)=>b.time-a.time).slice(0,60);
    const byAcc=a=>pays.filter(x=>x.account===a.id).reduce((t,x)=>t+(+x.amt||0),0);
    const byPerson={};pays.forEach(x=>{const n=payerName(x);byPerson[n]=(byPerson[n]||0)+(+x.amt||0)});
    const today=(new Date().getDay()+6)%7,dd=p.dueDay!==""&&p.dueDay!=null?+p.dueDay:null;
    const pct=owed?Math.min(100,tp/owed*100):0;
    const tm=t=>new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
    const accName=x=>{const a=(p.accounts||[]).find(k=>k.id===x.account)||{};return a.bankName||a.upi||"account"};
    const status=bl>0.5?(wk&&dd!=null&&dd<today&&wkPaid<wk?["Overdue","bad"]:["Due "+inr(Math.round(bl)),"warn"]):owed?(bl<-0.5?["Extra paid "+inr(Math.round(-bl)),"ok"]:["Settled","ok"]):["No dues","mute"];
    openSheet(`<div class="pv2">
      <div class="pvh"><span class="pva">${esc(p.name.slice(0,2).toUpperCase())}</span><div class="pvn"><b>${esc(p.name)}</b><small>${esc([p.phone,dd!=null?"Pay day "+DAYS[dd]:"",wk?"Weekly "+inr(wk):""].filter(Boolean).join(" · ")||"Direct party")}</small></div><span class="pvs ${status[1]}">${status[0]}</span></div>
      ${p.note?`<p class="note" style="margin:0">${esc(p.note)}</p>`:""}
      <div class="pvk"><div><span>To pay</span><b>${inr(Math.round(owed))}</b></div><div><span>Paid</span><b class="pos">${inr(Math.round(tp))}</b></div><div><span>${bl<-0.5?"Extra":"Left"}</span><b class="${bl>0.5?"neg":"pos"}">${inr(Math.abs(Math.round(bl)))}</b></div></div>
      ${owed?`<div class="pvbar"><i style="width:${pct.toFixed(1)}%"></i></div><div class="pvbl"><span>${Math.round(pct)}% paid</span>${wk?`<span>This week ${inr(Math.round(wkPaid))} / ${inr(wk)}</span>`:""}</div>`:""}
      <div class="pva2"><button class="primary" type="button" id="pv-pay">Pay now</button><button class="primary ghost2" type="button" id="pv-due">+ Amount to pay</button></div>
      <div class="pvsec pvsech"><span>${(p.accounts||[]).some(a=>+a.target)?"People to pay":"Their accounts"}</span><button type="button" class="link" id="pv-payee">+ Add person</button></div>
      ${(()=>{const T=(p.accounts||[]).filter(a=>+a.target);if(!T.length)return"";const tt=T.reduce((t,a)=>t+(+a.target),0),pd=T.reduce((t,a)=>t+Math.min(+a.target,byAcc(a)),0);const od=T.filter(a=>a.due&&byAcc(a)<+a.target-0.5&&daysTo(a.due)<0).length;
        return`<div class="pvplan"><div><span>Payout plan</span><b>${inr(Math.round(pd))} <small>of ${inr(Math.round(tt))}</small></b></div><div><span>Left</span><b class="neg">${inr(Math.round(tt-pd))}</b></div><div><span>People</span><b>${T.filter(a=>byAcc(a)>=+a.target-0.5).length}/${T.length} done</b>${od?`<small class="neg">${od} overdue</small>`:""}</div><div class="pvbar" style="grid-column:1/-1"><i style="width:${tt?Math.min(100,pd/tt*100).toFixed(1):0}%"></i></div></div>`})()}
      ${(p.accounts||[]).map((a,i)=>`<div class="pvacc"><div class="pvah"><span class="qri t-blue">${a.upi&&!a.accNo?"@":"₹"}</span><div><b>${esc(a.bankName||(a.upi?"UPI":"Account"))}</b><small>${esc(a.holder||"")}</small></div><span class="pvrcv">${inr(Math.round(byAcc(a)))}<small>received</small></span></div>
        ${+a.target?(()=>{const got=byAcc(a),lf=+a.target-got,dt=a.due?new Date(a.due+"T23:59"):null,dl=dt?daysTo(a.due):null;const done=lf<=0.5;
          return`<div class="pvtg ${done?"done":dl!=null&&dl<0?"over":dl!=null&&dl<=1?"soon":""}"><div class="pvtgr"><span>${done?"✓ Paid in full":`Left <b>${inr(Math.round(lf))}</b> of ${inr(+a.target)}`}</span><span>${dt?(done?"by "+dt.toLocaleDateString("en-IN",{day:"numeric",month:"short"}):dl<0?`Overdue ${-dl}d`:dl===0?"Due today":`Pay by ${dt.toLocaleDateString("en-IN",{day:"numeric",month:"short"})} · ${dl}d`):""}</span></div><div class="pvbar"><i style="width:${Math.min(100,got/(+a.target)*100).toFixed(1)}%"></i></div></div>`})():""}
        <div class="pvf">${[["Account no.",a.accNo],["IFSC",a.ifsc],["UPI ID",a.upi]].filter(x=>x[1]).map(([l,v])=>`<div><span>${l}</span><b>${esc(v)}</b></div>`).join("")}</div>
        <div class="pvcp">${a.upi?`<button class="mini ghost" type="button" data-copyupi="${i}">Copy UPI</button>`:""}${a.accNo?`<button class="mini ghost" type="button" data-copybank="${i}">Copy bank details</button>`:""}<button class="mini ghost pvcard" type="button" data-pcard="${i}">Share card</button><button class="mini ghost pvwa" type="button" data-pwa="${i}">WhatsApp</button><button class="mini ghost" type="button" data-pyed="${i}">Edit</button></div></div>`).join("")||'<div class="pvacc"><p class="note" style="margin:0">No accounts saved. Tap Edit party to add bank or UPI details.</p></div>'}
      ${Object.keys(byPerson).length?`<div class="pvsec">Paid by</div><div class="pvacc">${Object.entries(byPerson).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="pvby"><span class="pva sm">${esc(n.slice(0,2).toUpperCase())}</span><b>${esc(n)}</b><span>${inr(Math.round(v))}</span></div>`).join("")}</div>`:""}
      ${(()=>{const C=orders.filter(o=>o.client===id&&o.status!=="Cancelled").sort((a,b)=>b.time-a.time);if(!C.length)return"";const q=C.reduce((t,o)=>t+(o.side==="BUY"?-1:1)*(+o.qty),0),amt=C.reduce((t,o)=>t+(o.side==="SELL"?1:-1)*orderTotal(o),0);
        return`<div class="pvsec">As client</div><div class="pvdeal"><div><span>Deals</span><b>${C.length}</b></div><div><span>${q>=0?"Bought from you":"Sold to you"}</span><b>${fmtQ(Math.abs(+q.toFixed(2)))}</b></div><div><span>Value</span><b>${inr(Math.abs(Math.round(amt)))}</b></div></div><div class="pvsl">${C.slice(0,10).map(o=>{const pp=ppays.filter(x=>x.order===o.id);const sup=o.party?(parties.find(x=>x.id===o.party)||{}).name:"";const to=pp.map(x=>{const pr=parties.find(k=>k.id===x.party)||{};const ac=(pr.accounts||[]).find(k=>k.id===x.account);return (ac?(ac.holder||ac.bankName||ac.upi):pr.name||"")+" "+inr(Math.round(x.amt))}).join(", ");return`<div><b>${o.side==="SELL"?"Bought":"Sold"} ${fmtQ(o.qty)} ${esc(o.coin)} @ ₹${fmtR(o.rate)}</b><span>${inr(Math.round(orderTotal(o)))}</span><small>${tfmt(o.time)}${sup?` · ${o.side==="SELL"?"paid to":"from"} ${esc(sup)}`:""}${to?` · ${esc(to)}`:""}</small></div>`}).join("")}</div>`})()}
      ${(()=>{const D=orders.filter(o=>o.party===id&&o.status!=="Cancelled");if(!D.length)return"";const B=D.filter(o=>o.side==="BUY"),S=D.filter(o=>o.side==="SELL");
        const q=L=>L.reduce((t,o)=>t+(+o.qty),0),av=L=>{const x=q(L);return x?L.reduce((t,o)=>t+o.qty*o.rate,0)/x:0};const bq=q(B),sq=q(S),ba=av(B),sa=av(S);const coin=(D[0]||{}).coin||"USDT";
        return`<div class="pvsec">USDT deals</div><div class="pvdeal"><div><span>Received</span><b>${fmtQ(+bq.toFixed(2))} ${esc(coin)}</b><small>${ba?"@ ₹"+ba.toFixed(2):""}</small></div><div><span>Sold to others</span><b>${fmtQ(+sq.toFixed(2))}</b><small>${sa?"@ ₹"+sa.toFixed(2):""}</small></div><div><span>Left to sell</span><b class="${bq-sq<-1e-6?"neg":""}">${fmtQ(+(bq-sq).toFixed(2))}</b><small>${ba&&sa?`spread ${(sa-ba>=0?"+":"")+(sa-ba).toFixed(2)}`:""}</small></div></div>
          ${S.length?`<div class="pvsl">${S.sort((a,b)=>b.time-a.time).slice(0,10).map(o=>{const pp=ppays.filter(x=>x.order===o.id);const to=pp.map(x=>{const ac=(p.accounts||[]).find(k=>k.id===x.account);return ac?(ac.holder||ac.bankName||ac.upi):"unassigned"}).join(", ");return`<div><b>${esc(o.cp||"Buyer")}</b> bought ${fmtQ(o.qty)} @ ₹${fmtR(o.rate)}<span>${inr(Math.round(orderTotal(o)))}${ba?` · ${(o.rate-ba>=0?"+":"−")}${inr(Math.abs(Math.round((o.rate-ba)*o.qty)))}`:""}</span>${to?`<small>Paid to: ${esc(to)}</small>`:""}</div>`}).join("")}</div>`:""}`})()}
      <div class="pvsec">History <span>${hist.length}</span></div>
      <div class="tl">${hist.length?hist.map(x=>x._t==="due"?`<div class="tli tdue"><span class="tld"></span><div class="tlb"><div class="tlr"><b>Amount to pay added</b><span class="amt">+${inr(Math.round(x.amt))}</span></div><small>${tm(x.time)}${x.note?" · "+esc(x.note):""}</small><div class="tla"><button class="link del" type="button" data-delrec="${x.id}">Delete</button></div></div></div>`
        :`<div class="tli pay"><span class="tld"></span><div class="tlb"><div class="tlr"><b>${x.order?(x.account?"Buyer paid → "+esc(accName(x)):"Buyer paid directly"):"Paid → "+esc(accName(x))}</b><span class="amt neg">−${inr(Math.round(x.amt))}</span></div><small>${tm(x.time)} · by ${esc(payerName(x))}${(x.splits||[]).length?" from "+(x.splits||[]).map(sp=>esc(bankName(sp.bank))+" ("+sp.method+")").join(", "):""}${x.note?" · "+esc(x.note):""}</small>
          ${(x.proofs||[]).length?`<div class="pvs2">${x.proofs.map(i=>proofImg(i)).join("")}</div>`:""}
          <div class="tla"><button class="link pvwal" type="button" data-wpay="${x.id}">WhatsApp</button>${assetsApi?`<label class="link" style="color:var(--fg);cursor:pointer">+ Proof<input type="file" accept="image/*" hidden data-addproof="${x.id}"></label>`:""}<button class="link del" type="button" data-delrec="${x.id}">Delete</button></div></div></div>`).join(""):'<p class="note">Nothing yet. Add the amount you have to pay, then record payments.</p>'}</div>
      <div class="pvfoot"><button class="mini ghost pvwa" type="button" id="pv-wa">WhatsApp</button><button class="mini ghost" type="button" id="pv-pdf">Statement</button><button class="mini ghost" type="button" id="pv-edit">Edit party</button><button class="mini ghost" type="button" data-close>Close</button></div></div>`,el=>{
      el.querySelector("#pv-wa").onclick=()=>sheets.wasend({party:id});el.querySelectorAll("[data-pwa]").forEach(b=>b.onclick=()=>sheets.wasend({party:id,acc:+b.dataset.pwa,kind:"update"}));el.querySelectorAll("[data-wpay]").forEach(b=>b.onclick=()=>sheets.wasend({party:id,pay:b.dataset.wpay}));
      el.querySelector("#pv-pay").onclick=()=>sheets.pay(id);el.querySelector("#pv-pdf").onclick=()=>sheets.pstmt(id);el.querySelector("#pv-edit").onclick=()=>sheets.party(id);el.querySelector("#pv-due").onclick=()=>sheets.due(id);
      el.querySelector("#pv-payee").onclick=()=>sheets.payee(id);el.querySelectorAll("[data-pyed]").forEach(b=>b.onclick=()=>sheets.payee(id,+b.dataset.pyed));
      el.querySelectorAll("[data-pcard]").forEach(b=>b.onclick=()=>{const L=(p.accounts||[]).filter(a=>a.accNo||a.upi);const ix=L.indexOf(p.accounts[+b.dataset.pcard]);sheets.paycard({party:id,acc:Math.max(0,ix)})});
      el.querySelectorAll("[data-copyupi]").forEach(b=>b.onclick=()=>copyText(upiText(p.accounts[+b.dataset.copyupi]),b.closest(".pvacc")));
      el.querySelectorAll("[data-copybank]").forEach(b=>b.onclick=()=>copyText(bankText(p.accounts[+b.dataset.copybank]),b.closest(".pvacc")));
      el.querySelectorAll("[data-delrec]").forEach(b=>twoTap(b,async()=>{try{await delRec(b.dataset.delrec);toast("Deleted");sheets.partyView(id)}catch(err){toast("Couldn't delete")}}));
      el.querySelectorAll("[data-addproof]").forEach(inp=>inp.onchange=async()=>{const f=[...inp.files].slice(0,3);if(!f.length)return;toast("Uploading…");
        try{const ids=await uploadProofs(f);const x=ppays.find(k=>k.id===inp.dataset.addproof);await patchRec(x.id,{proofs:[...(x.proofs||[]),...ids]});toast("Proof saved");sheets.partyView(id)}catch(err){toast(err&&err.code==="quota_exceeded"?"Storage full. Delete old screenshots.":"Couldn't upload. Try again.")}});
    })},
  pstmt(id,per){const p=parties.find(x=>x.id===id);if(!p)return;per=per||"all";
    const R=partyStmt(p,per);
    openSheet(`<h2>PDF statement</h2><p class="note" style="margin-top:-4px">${esc(p.name)} · pick the period</p>
      <div class="seg psper" id="ps-per" style="grid-template-columns:repeat(4,1fr)">${[["week","This week"],["month","This month"],["d30","30 days"],["all","All time"]].map(([k,l])=>`<button type="button" data-p="${k}" class="${k===per?"on":""}">${l}</button>`).join("")}</div>
      <div class="pvk" style="grid-template-columns:1fr 1fr;margin-top:12px"><div><span>Opening</span><b>${inr(Math.round(R.open))}</b></div><div><span>Added</span><b>${inr(Math.round(R.added))}</b></div><div><span>Paid</span><b class="pos">${inr(Math.round(R.paid))}</b></div><div><span>${R.close<-0.5?"Extra paid":"Closing left"}</span><b class="${R.close>0.5?"neg":"pos"}">${inr(Math.abs(Math.round(R.close)))}</b></div></div>
      <p class="note">${R.rows.length} entr${R.rows.length===1?"y":"ies"} · ${esc(R.label)}</p>
      <label class="chk" style="display:flex;gap:8px;align-items:center;margin:4px 0 12px"><input type="checkbox" id="ps-acc" checked> Include their account details</label>
      <div class="psgo"><button class="mini ghost" type="button" id="ps-back">Back</button><button class="mini psdl" type="button" id="ps-go">Download PDF</button></div><button type="button" class="mini ghost pvwa" id="ps-wa" style="width:100%;margin-top:8px;padding:12px">Send on WhatsApp</button>`,el=>{
      el.querySelectorAll("#ps-per button").forEach(b=>b.onclick=()=>sheets.pstmt(id,b.dataset.p));
      el.querySelector("#ps-back").onclick=()=>sheets.partyView(id);el.querySelector("#ps-wa").onclick=()=>sheets.wasend({party:id,kind:"stmt",back:()=>sheets.pstmt(id,per)});
      el.querySelector("#ps-go").onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent="Making PDF…";
        try{await partyPdf(p,R,el.querySelector("#ps-acc").checked);b.textContent="Download PDF"}catch(err){toast("Couldn't make PDF. Try again.");b.textContent="Download PDF"}b.disabled=false};
    })},
  profile(){const P=k=>pref(k)||"";let photo=P("avatar"),color=P("avColor")||"#8b5cf6";
    const COLS=["#8b5cf6","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899","#0ea5e9","#64748b"];
    openSheet(`<div class="pfw"><h3>Edit profile</h3>
      <div class="pfh"><div class="pfav" id="pf-av"></div><div class="pfhb"><b id="pf-pn"></b><small id="pf-ps"></small>
        <div class="pfbtn">${assetsApi?`<label class="mini ghost" style="cursor:pointer">${photo?"Change photo":"Add photo"}<input type="file" accept="image/*" hidden id="pf-file"></label>`:""}<button type="button" class="mini ghost" id="pf-rm" ${photo?"":"hidden"}>Remove</button></div></div></div>
      <div class="pfcol" id="pf-col">${COLS.map(c=>`<button type="button" data-c="${c}" style="--c:${c}" class="${c===color?"on":""}" aria-label="Colour"></button>`).join("")}</div>
      <form id="sf" style="grid-template-columns:1fr 1fr">
        <label class="full">Your name<input id="pf-owner" value="${esc(P("owner"))}" placeholder="e.g. Deepak Sahu" autocomplete="name"></label>
        <label class="full">Business name<input id="pf-biz" value="${esc(P("biz"))}" placeholder="Shown as the app title on Home"></label>
        <label>Role<select id="pf-role">${["P2P merchant","Trader","Direct dealer","Agent","Business owner"].map(r=>`<option ${(P("role")||"P2P merchant")===r?"selected":""}>${r}</option>`).join("")}</select></label>
        <label>Phone<input id="pf-phone" inputmode="tel" value="${esc(P("phone"))}" placeholder="Optional"></label>
        <label class="full">My UPI ID<input id="pf-upi" value="${esc(P("myUpi"))}" placeholder="name@bank · for sharing"></label>
        <label>City<input id="pf-city" value="${esc(P("city"))}" placeholder="Optional"></label>
        <label>Exchange nickname<input id="pf-nick" value="${esc(P("nick"))}" placeholder="Your Binance name"></label>
        <p class="note full" style="margin:0">Exchange nickname helps Smart intake and AI know which side of a screenshot is you.</p>
        <div class="pfact full"><button type="button" class="mini ghost" id="pf-share">Copy my details</button><button type="submit" class="mini psdl">Save profile</button></div>
      </form></div>`,el=>{
      const q=x=>el.querySelector(x);
      const draw=()=>{const n=q("#pf-owner").value.trim()||q("#pf-biz").value.trim()||"My account";const ini=n.split(/\s+/).map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
        q("#pf-av").innerHTML=photo?`<img src="/_blob/${encodeURIComponent(photo)}" alt="">`:esc(ini);q("#pf-av").style.setProperty("--c",color);
        q("#pf-pn").textContent=n;q("#pf-ps").textContent=[q("#pf-owner").value.trim()&&q("#pf-biz").value.trim()?q("#pf-biz").value.trim():"",q("#pf-role").value,q("#pf-city").value.trim()].filter(Boolean).join(" · ")};
      draw();el.querySelectorAll("input,select").forEach(i=>i.addEventListener("input",draw));
      q("#pf-col").onclick=e=>{const b=e.target.closest("[data-c]");if(!b)return;color=b.dataset.c;el.querySelectorAll("#pf-col button").forEach(x=>x.classList.toggle("on",x===b));draw()};
      const f=q("#pf-file");if(f)f.onchange=async()=>{const file=f.files[0];if(!file)return;toast("Uploading photo…");try{photo=(await uploadProofs([file]))[0];q("#pf-rm").hidden=false;draw();toast("Photo ready. Tap Save profile")}catch(err){toast("Couldn't upload photo")}};
      q("#pf-rm").onclick=()=>{photo="";q("#pf-rm").hidden=true;draw()};
      q("#pf-share").onclick=()=>{const t=[q("#pf-owner").value.trim(),q("#pf-biz").value.trim(),q("#pf-phone").value.trim()?"Phone: "+q("#pf-phone").value.trim():"",q("#pf-upi").value.trim()?"UPI: "+q("#pf-upi").value.trim():"",q("#pf-city").value.trim()].filter(Boolean).join("\n");if(!t){toast("Fill your details first");return}copyText(t,q(".pfh"))};
      q("#sf").onsubmit=e=>{e.preventDefault();const up=q("#pf-upi").value.trim();if(up&&!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(up)){toast("UPI ID looks wrong");return}
        const v={owner:q("#pf-owner").value.trim(),biz:q("#pf-biz").value.trim(),role:q("#pf-role").value,phone:q("#pf-phone").value.trim(),myUpi:up,city:q("#pf-city").value.trim(),nick:q("#pf-nick").value.trim(),avatar:photo,avColor:color};
        Object.entries(v).forEach(([k,x])=>setPref(k,x));toast("Profile saved");closeSheet();try{updateChrome();renderMenuAva()}catch(err){}};
    })},
  upiqr(){const ids=[];if(pref("myUpi"))ids.push({v:pref("myUpi"),l:"My UPI · "+pref("myUpi"),n:pref("owner")||""});banks.forEach(b=>{if(b.upi&&!ids.some(x=>x.v===b.upi))ids.push({v:b.upi,l:b.name+" · "+b.upi,n:b.holder||pref("owner")||""})});
    openSheet(`<h3>UPI QR maker</h3><form id="sf" style="grid-template-columns:1fr 1fr" onsubmit="return false">
      <label class="full">UPI ID${ids.length?`<select id="uq-sel">${ids.map((x,i)=>`<option value="${i}">${esc(x.l)}</option>`).join("")}<option value="o">Other UPI ID…</option></select>`:""}<input id="uq-id" placeholder="name@bank" ${ids.length?"hidden":""} autocomplete="off"></label>
      <label class="full">Name on QR<input id="uq-name" value="${esc(ids[0]?ids[0].n:pref("owner")||"")}" placeholder="Payee name"></label>
      <label>Amount (₹)<input id="uq-amt" type="number" inputmode="decimal" step="any" placeholder="Optional"></label>
      <label>Note<input id="uq-note" placeholder="e.g. Order 4471" maxlength="40"></label></form>
      <div class="uqbox"><div class="uqcard" id="uq-card"><div id="uq-qr" class="uqqr"><span class="note">Loading…</span></div><b id="uq-amtL"></b><small id="uq-idL"></small></div></div>
      <div class="uqact"><button type="button" class="mini ghost" id="uq-cid">Copy UPI ID</button><button type="button" class="mini ghost" id="uq-clink">Copy pay link</button><button type="button" class="mini psdl" id="uq-save">Save QR image</button></div>
      <p class="note">Buyer scans with any UPI app. The amount and note are filled in for them.</p>`,async el=>{
      const q=x=>el.querySelector(x);let qr=null;
      try{await loadQR()}catch(err){q("#uq-qr").innerHTML='<span class="note">QR tool could not load. Check internet.</span>';return}
      const cur=()=>{const sv=q("#uq-sel");const id=sv&&sv.value!=="o"?ids[+sv.value].v:q("#uq-id").value.trim();return{id,name:q("#uq-name").value.trim(),amt:+q("#uq-amt").value||0,note:q("#uq-note").value.trim()}};
      const link=c=>"upi://pay?"+[["pa",c.id],["pn",c.name],c.amt?["am",c.amt.toFixed(2)]:null,["cu","INR"],c.note?["tn",c.note]:null].filter(x=>x&&x[1]).map(([k,v])=>k+"="+encodeURIComponent(v)).join("&");
      const ok=id=>/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(id);
      const draw=()=>{const c=cur();q("#uq-amtL").textContent=c.amt?inr(c.amt):"Any amount";q("#uq-idL").textContent=[c.name,c.id].filter(Boolean).join(" · ");
        if(!ok(c.id)){q("#uq-qr").innerHTML='<span class="note">Enter a valid UPI ID</span>';qr=null;return}
        qr=qrcode(0,"M");qr.addData(link(c));qr.make();q("#uq-qr").innerHTML=qr.createSvgTag({cellSize:4,margin:2,scalable:true})};
      draw();el.querySelectorAll("input,select").forEach(i=>i.addEventListener("input",draw));
      const sv=q("#uq-sel");if(sv)sv.addEventListener("change",()=>{const o=sv.value==="o";q("#uq-id").hidden=!o;if(!o&&ids[+sv.value].n)q("#uq-name").value=ids[+sv.value].n;draw()});
      q("#uq-cid").onclick=()=>{const c=cur();ok(c.id)?copyText(c.id,q("#uq-card")):toast("Enter a valid UPI ID")};
      q("#uq-clink").onclick=()=>{const c=cur();ok(c.id)?copyText(link(c),q("#uq-card")):toast("Enter a valid UPI ID")};
      q("#uq-save").onclick=()=>{const c=cur();if(!qr){toast("Enter a valid UPI ID");return}
        const n=qr.getModuleCount(),cs=12,pad=48,W=n*cs+pad*2,H=W+150,cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
        g.fillStyle="#fff";g.fillRect(0,0,W,H);g.fillStyle="#111";for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(qr.isDark(r,k))g.fillRect(pad+k*cs,pad+r*cs,cs,cs);
        g.textAlign="center";g.font="bold 40px sans-serif";g.fillText(c.amt?"₹"+c.amt.toLocaleString("en-IN"):"Scan to pay",W/2,W+30);
        g.font="24px sans-serif";g.fillStyle="#444";g.fillText([c.name,c.id].filter(Boolean).join(" · "),W/2,W+72);if(c.note)g.fillText(c.note,W/2,W+108);
        cv.toBlob(b=>saveFile("Pexai-upi-qr-"+(c.amt?Math.round(c.amt)+"-":"")+new Date().toLocaleDateString("en-CA")+".png",b),"image/png")};
    })},
  conv(){let dir="inr",coin=pref("coin")||"USDT";const r0=convRate(coin);
    openSheet(`<h3>₹ ⇄ ${esc(coin)} converter</h3>
      <div class="seg" id="cv-dir"><button type="button" class="on" data-d="inr">₹ → ${esc(coin)}</button><button type="button" data-d="coin">${esc(coin)} → ₹</button></div>
      <form id="sf" style="grid-template-columns:1fr 1fr;margin-top:12px" onsubmit="return false">
        <label>Rate (₹ per ${esc(coin)})<input id="cv-rate" type="number" inputmode="decimal" step="any" value="${r0||""}" placeholder="e.g. 91.50"></label>
        <label>Fee % <input id="cv-fee" type="number" inputmode="decimal" step="any" placeholder="0"></label>
        <label class="full"><span id="cv-lbl">Amount in ₹</span><input id="cv-amt" type="number" inputmode="decimal" step="any" placeholder="Type amount" autofocus></label></form>
      <div class="cvchips" id="cv-chips"></div>
      <div class="cvres"><span id="cv-rl">You get</span><b id="cv-out">—</b><small id="cv-sub"></small></div>
      <div class="cvrates" id="cv-rates"></div>
      <div class="uqact" style="grid-template-columns:1fr 1fr"><button type="button" class="mini ghost" id="cv-swap">Swap</button><button type="button" class="mini psdl" id="cv-copy">Copy result</button></div>`,el=>{
      const q=x=>el.querySelector(x);let out="";
      const lb=lastRate(coin,"BUY"),ls=lastRate(coin,"SELL");
      q("#cv-rates").innerHTML=[lb?["Last buy",lb]:null,ls?["Last sell",ls]:null].filter(Boolean).map(([l,v])=>`<button type="button" data-r="${v}">${l} ₹${fmtR(v)}</button>`).join("");
      const chips=()=>{q("#cv-chips").innerHTML=(dir==="inr"?[10000,25000,50000,100000]:[100,500,1000,5000]).map(v=>`<button type="button" data-v="${v}">${dir==="inr"?inr(v):v+" "+esc(coin)}</button>`).join("")};
      const calc=()=>{const r=+q("#cv-rate").value,a=+q("#cv-amt").value,f=(+q("#cv-fee").value||0)/100;q("#cv-lbl").textContent=dir==="inr"?"Amount in ₹":"Amount in "+coin;
        if(!(r>0)||!(a>0)){q("#cv-out").textContent="—";q("#cv-sub").textContent=r>0?"":"Enter a rate";out="";return}
        if(dir==="inr"){const c=a/r,net=c*(1-f);out=fmtQ(+net.toFixed(4))+" "+coin;q("#cv-rl").textContent="You get";q("#cv-out").textContent=out;q("#cv-sub").textContent=`${inr(a)} at ₹${fmtR(r)}${f?` · fee ${fmtQ(+(c*f).toFixed(4))} ${coin}`:""}`}
        else{const v=a*r,net=v*(1-f);out=inr(+net.toFixed(2));q("#cv-rl").textContent="You get";q("#cv-out").textContent=out;q("#cv-sub").textContent=`${fmtQ(a)} ${coin} at ₹${fmtR(r)}${f?` · fee ${inr(+(v*f).toFixed(2))}`:""}`}};
      chips();calc();el.querySelectorAll("input").forEach(i=>i.addEventListener("input",calc));
      const setDir=d=>{dir=d;el.querySelectorAll("#cv-dir button").forEach(x=>x.classList.toggle("on",x.dataset.d===d));chips();calc()};
      q("#cv-dir").onclick=e=>{const b=e.target.closest("[data-d]");if(b){q("#cv-amt").value="";setDir(b.dataset.d)}};
      q("#cv-chips").onclick=e=>{const b=e.target.closest("[data-v]");if(b){q("#cv-amt").value=b.dataset.v;calc()}};
      q("#cv-rates").onclick=e=>{const b=e.target.closest("[data-r]");if(b){q("#cv-rate").value=b.dataset.r;calc()}};
      q("#cv-swap").onclick=()=>{const t=out.replace(/[^\d.]/g,"");setDir(dir==="inr"?"coin":"inr");if(t){q("#cv-amt").value=t;calc()}};
      q("#cv-copy").onclick=()=>out?copyText(out,q(".cvres")):toast("Nothing to copy");
    })},
  gallery(f){f=f||{k:"all",q:""};const all=allProofs();
    const draw=el=>{const W=f.q.toLowerCase();const L=all.filter(x=>(f.k==="all"||x.k===f.k)&&(!W||(x.label+" "+x.sub).toLowerCase().includes(W)));
      el.querySelector("#gl-grid").innerHTML=L.length?L.slice(0,120).map(x=>`<div class="glit"><img src="/_blob/${encodeURIComponent(x.id)}" loading="lazy" alt="" data-proof="${esc(x.id)}"><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></div>`).join(""):`<p class="note" style="grid-column:1/-1">${all.length?"No screenshots match.":"No payment screenshots yet. Add proof on a payment or use Smart intake."}</p>`;
      el.querySelector("#gl-n").textContent=L.length+" of "+all.length};
    openSheet(`<h3>Proof gallery <small id="gl-n" class="note"></small></h3>
      <input id="gl-q" class="glq" placeholder="Search party, trader, amount…" value="${esc(f.q)}">
      <div class="cvchips" id="gl-k">${[["all","All"],["order","Orders"],["direct","Direct"],["intake","Intake"]].map(([k,l])=>`<button type="button" data-k="${k}" class="${f.k===k?"on":""}">${l} <em>${k==="all"?all.length:all.filter(x=>x.k===k).length}</em></button>`).join("")}</div>
      <div class="glgrid" id="gl-grid"></div>`,el=>{draw(el);
      el.querySelector("#gl-q").addEventListener("input",e=>{f.q=e.target.value;draw(el)});
      el.querySelector("#gl-k").onclick=e=>{const b=e.target.closest("[data-k]");if(!b)return;f.k=b.dataset.k;el.querySelectorAll("#gl-k button").forEach(x=>x.classList.toggle("on",x===b));draw(el)};
      proofBack=()=>sheets.gallery(f);
    })},
  notes(){const fmtAt=t=>{const d=new Date(t),td=new Date();const day=d.toDateString()===td.toDateString()?"Today":d.toDateString()===new Date(Date.now()+864e5).toDateString()?"Tomorrow":d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});return day+", "+d.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})};
    const now=Date.now(),open=reminds.filter(r=>!r.done).sort((a,b)=>(a.at||9e15)-(b.at||9e15)),done=reminds.filter(r=>r.done).sort((a,b)=>(b.doneAt||0)-(a.doneAt||0)).slice(0,10);
    const item=r=>{const over=r.at&&r.at<=now&&!r.done;return `<div class="rmi ${over?"over":""} ${r.done?"done":""}"><button type="button" class="rmc" data-tg="${r.id}" aria-label="Done">${r.done?'<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>':""}</button><div class="rmt"><b>${esc(r.text)}</b><small>${r.at?(over?"Due · ":"")+fmtAt(r.at):"No time"}</small></div><button type="button" class="link del" data-rdel="${r.id}">Delete</button></div>`};
    const pad=n=>String(n).padStart(2,"0"),loc=t=>{const d=new Date(t);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())};
    const tonight=(()=>{const d=new Date();d.setHours(21,0,0,0);if(d<=new Date())d.setDate(d.getDate()+1);return d.getTime()})(),tmr=(()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(10,0,0,0);return d.getTime()})();
    openSheet(`<h3>Notes & reminders</h3>
      <form id="sf" onsubmit="return false" style="grid-template-columns:1fr"><label>What to remember<input id="rm-t" placeholder="e.g. Pay Amit ₹20,000" maxlength="140" autocomplete="off"></label></form>
      <div class="cvchips" id="rm-w"><button type="button" data-w="${now+36e5}" class="on">In 1 hour</button><button type="button" data-w="${tonight}">Tonight 9 PM</button><button type="button" data-w="${tmr}">Tomorrow 10 AM</button><button type="button" data-w="pick">Pick time</button><button type="button" data-w="0">No time</button></div>
      <input type="datetime-local" id="rm-dt" class="glq" hidden value="${loc(now+36e5)}">
      <button type="button" class="mini psdl" id="rm-add" style="width:100%;padding:12px;margin:4px 0 14px">Add reminder</button>
      <div class="pvsec">Open <span>${open.length}</span></div><div class="rml">${open.map(item).join("")||'<p class="note">Nothing pending.</p>'}</div>
      ${done.length?`<div class="pvsec">Done</div><div class="rml">${done.map(item).join("")}</div>`:""}
      <p class="note">Reminders show in alerts and pop up while the app is open.</p>`,el=>{
      const q=x=>el.querySelector(x);let when=now+36e5;
      q("#rm-w").onclick=e=>{const b=e.target.closest("[data-w]");if(!b)return;el.querySelectorAll("#rm-w button").forEach(x=>x.classList.toggle("on",x===b));q("#rm-dt").hidden=b.dataset.w!=="pick";when=b.dataset.w==="pick"?"pick":+b.dataset.w};
      q("#rm-add").onclick=async()=>{const t=q("#rm-t").value.trim();if(!t){toast("Type what to remember");q("#rm-t").focus();return}
        const at=when==="pick"?new Date(q("#rm-dt").value).getTime()||0:when;
        try{await putRec({id:"rm_"+Date.now().toString(36),kind:"remind",text:t,at,done:false,time:Date.now()});toast(at?"Reminder set · "+fmtAt(at):"Note saved");sheets.notes()}catch(err){toast("Couldn't save")}};
      el.querySelectorAll("[data-tg]").forEach(b=>b.onclick=async()=>{const r=reminds.find(x=>x.id===b.dataset.tg);if(!r)return;try{await patchRec(r.id,{done:!r.done,doneAt:Date.now()});sheets.notes();renderAlerts()}catch(err){toast("Couldn't update")}});
      el.querySelectorAll("[data-rdel]").forEach(b=>twoTap(b,async()=>{try{await delRec(b.dataset.rdel);sheets.notes();renderAlerts()}catch(err){toast("Couldn't delete")}}));
    })},
  paycard(pre){pre=pre||{};
    const mine=banks.filter(b=>b.type!=="Cash"&&(b.accNo||b.upi)).map(b=>({l:b.name,holder:b.holder||pref("owner")||"",bank:b.bankName||b.name,acc:b.accNo||"",ifsc:b.ifsc||"",upi:b.upi||"",branch:b.branch||""}));
    if(pref("myUpi")&&!mine.some(x=>x.upi===pref("myUpi")))mine.push({l:"My UPI",holder:pref("owner")||"",bank:"",acc:"",ifsc:"",upi:pref("myUpi"),branch:""});
    const pl=parties.filter(p=>(p.accounts||[]).some(a=>a.accNo||a.upi));
    let mode=pre.party&&pl.some(p=>p.id===pre.party)?"party":mine.length?"mine":pl.length?"party":"";
    if(!mode){toast("Add bank details or your UPI ID first");sheets.profile();return}
    const pAcc=p=>(p.accounts||[]).filter(a=>a.accNo||a.upi).map(a=>({l:a.bankName||a.upi||"Account",holder:a.holder||p.name,bank:a.bankName||"",acc:a.accNo||"",ifsc:a.ifsc||"",upi:a.upi||"",branch:""}));
    const THEMES=[["#0f172a","#334155"],["#4c1d95","#7c3aed"],["#064e3b","#059669"],["#7c2d12","#ea580c"],["#1e3a8a","#2563eb"]];
    const O={bank:true,upi:true,qr:true,warn:mode==="mine"};let th=0,cv=null,party=pre.party||(pl[0]||{}).id,acc=+pre.acc||0,src=0;
    openSheet(`<div class="pc2"><div class="pch"><h3>Payment card</h3><span class="note">Share details as one image</span></div>
      ${mine.length&&pl.length?`<div class="seg" id="pc-mode"><button type="button" data-m="mine">My accounts</button><button type="button" data-m="party">Direct parties</button></div>`:""}
      <div id="pc-pick"></div>
      <div class="pcrow"><label>Amount (₹)<input id="pc-amt" type="number" inputmode="decimal" step="any" placeholder="Optional"></label><label>Note<input id="pc-note" placeholder="e.g. Week 40" maxlength="30"></label></div>
      <div id="pc-due"></div>
      <div class="pcsec">Show on card</div>
      <div class="pcchips" id="pc-opt">${[["bank","Bank details"],["upi","UPI ID"],["qr","QR code"],["warn","Safety line"]].map(([k,l])=>`<button type="button" data-o="${k}"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>${l}</button>`).join("")}</div>
      <div class="pcsec">Colour</div>
      <div class="pfcol" id="pc-th">${THEMES.map((t,i)=>`<button type="button" data-t="${i}" style="--c:${t[1]}" class="${i?"":"on"}" aria-label="Colour"></button>`).join("")}</div>
      <div class="pcprev"><img id="pc-img" alt="Payment card preview"></div>
      <div class="pcact"><button type="button" class="mini ghost" id="pc-copy"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>Copy text</button><button type="button" class="mini ghost" id="pc-save"><svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Save</button><button type="button" class="mini psdl" id="pc-share"><svg viewBox="0 0 24 24"><path d="M12 15V4M7 9l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/></svg>Share</button></div></div>`,async el=>{
      const q=x=>el.querySelector(x);
      try{await loadQR()}catch(err){}
      const list=()=>mode==="mine"?mine:pAcc(parties.find(p=>p.id===party)||{});
      const cur=()=>{const L=list();const x=L[mode==="mine"?src:acc]||L[0]||{};return{...x,amt:+q("#pc-amt").value||0,note:q("#pc-note").value.trim(),mode,pname:mode==="party"?(parties.find(p=>p.id===party)||{}).name:""}};
      const pick=()=>{el.querySelectorAll("#pc-mode button").forEach(b=>b.classList.toggle("on",b.dataset.m===mode));
        if(mode==="mine")q("#pc-pick").innerHTML=`<label class="pcl">Account<select id="pc-src">${mine.map((x,i)=>`<option value="${i}" ${i===src?"selected":""}>${esc(x.l)}${x.upi&&x.acc?" · bank + UPI":x.upi?" · UPI":" · bank"}</option>`).join("")}</select></label>`;
        else{const L=pAcc(parties.find(p=>p.id===party)||{});q("#pc-pick").innerHTML=`<div class="pcrow"><label>Party<select id="pc-party">${pl.map(p=>`<option value="${p.id}" ${p.id===party?"selected":""}>${esc(p.name)}</option>`).join("")}</select></label><label>Account<select id="pc-acc">${L.map((x,i)=>`<option value="${i}" ${i===acc?"selected":""}>${esc(x.l)}</option>`).join("")}</select></label></div>`}
        const ps=q("#pc-src");if(ps)ps.onchange=()=>{src=+ps.value;draw()};
        const pp=q("#pc-party");if(pp)pp.onchange=()=>{party=pp.value;acc=0;pick();draw()};
        const pa=q("#pc-acc");if(pa)pa.onchange=()=>{acc=+pa.value;draw()};
        const p=mode==="party"&&parties.find(x=>x.id===party);const left=p?partyOwed(p.id)-partyPaid(p.id):0;
        q("#pc-due").innerHTML=left>0.5?`<button type="button" class="pcdue" id="pc-usedue">Use amount left · ${inr(Math.round(left))}</button>`:"";
        const ud=q("#pc-usedue");if(ud)ud.onclick=()=>{q("#pc-amt").value=Math.round(left);draw()}};
      const optUI=()=>el.querySelectorAll("#pc-opt button").forEach(b=>b.classList.toggle("on",!!O[b.dataset.o]));
      const draw=()=>{const c=cur();cv=drawPayCard(c,{bank:O.bank&&!!c.acc,upi:O.upi&&!!c.upi,qr:O.qr&&!!c.upi&&!!window.qrcode,warn:O.warn},THEMES[th]);q("#pc-img").src=cv.toDataURL("image/png")};
      pick();optUI();draw();
      q("#pc-amt").addEventListener("input",draw);q("#pc-note").addEventListener("input",draw);
      const md=q("#pc-mode");if(md)md.onclick=e=>{const b=e.target.closest("[data-m]");if(!b||b.dataset.m===mode)return;mode=b.dataset.m;O.warn=mode==="mine";q("#pc-amt").value="";pick();optUI();draw()};
      q("#pc-opt").onclick=e=>{const b=e.target.closest("[data-o]");if(!b)return;O[b.dataset.o]=!O[b.dataset.o];optUI();draw()};
      q("#pc-th").onclick=e=>{const b=e.target.closest("[data-t]");if(!b)return;th=+b.dataset.t;el.querySelectorAll("#pc-th button").forEach(x=>x.classList.toggle("on",x===b));draw()};
      const fname=()=>{const c=cur();return("payment-"+(c.pname||c.holder||"details")+(c.amt?"-"+Math.round(c.amt):"")).replace(/[^\w-]+/g,"-")+".png"};
      q("#pc-save").onclick=()=>cv.toBlob(b=>saveFile(fname(),b),"image/png");
      q("#pc-share").onclick=()=>cv.toBlob(async b=>{const f=new File([b],fname(),{type:"image/png"});
        try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"Payment details"});return}}catch(err){if(err&&err.name==="AbortError")return}
        toast("Sharing not allowed here. Saving image instead");saveFile(fname(),b)},"image/png");
      q("#pc-copy").onclick=()=>{const c=cur();const t=[c.amt?"Amount: ₹"+c.amt.toLocaleString("en-IN"):"",O.bank&&c.acc?bankText({holder:c.holder,bankName:c.bank,accNo:c.acc,ifsc:c.ifsc}):"",O.upi&&c.upi?"UPI ID: "+c.upi:"",c.note?"Note: "+c.note:""].filter(Boolean).join("\n");copyText(t,q(".pcprev"))};
    })},
  due(id){const p=parties.find(x=>x.id===id);if(!p)return;
    openSheet(`<h3>Amount to pay ${esc(p.name)}</h3><form id="sf" style="grid-template-columns:1fr">
      <label>Amount (₹)<input id="du-amt" type="number" inputmode="decimal" step="any" required></label>
      <label>Note<input id="du-note" placeholder="e.g. USDT deal 3 Oct, 500 @ 92"></label>
      <button class="primary" type="submit">Add</button></form>`,el=>{el.querySelector("#sf").onsubmit=async e=>{e.preventDefault();const amt=+$("#du-amt").value;if(!(amt>0)){toast("Enter an amount");return}
      try{await putRec({id:newId("pd_"),kind:"pdue",party:id,amt,note:$("#du-note").value.trim().slice(0,120),time:Date.now()});toast("Added");sheets.partyView(id)}catch(err){toast("Couldn't save")}}})},
  pay(id,preset,presetAmt){const p=parties.find(x=>x.id===id);if(!p)return;const bl=partyOwed(id)-partyPaid(id);const left=presetAmt||(bl>0.5?bl:Math.max(0,(+p.weekly||0)-partyPaidWeek(id)));const accs=p.accounts||[];
    const people=[...new Set(ppays.map(x=>x.paidBy).filter(n=>n&&n!=="me"))];
    openSheet(`<h3>Pay ${esc(p.name)}</h3>
      <label>Amount (₹)<input id="py-amt" type="number" inputmode="decimal" step="any" value="${left?+left.toFixed(2):""}" required></label>
      ${accs.length?`<div class="flabel" style="margin:14px 0 8px">To their account</div><div class="radio">${accs.map((a,i)=>`<label><input type="radio" name="py-acc" value="${a.id}" ${i===0?"checked":""}><span>${esc(a.bankName||"Account")} ${a.accNo?"••"+esc(a.accNo.slice(-4)):""}${a.upi?" · "+esc(a.upi):""}</span></label>`).join("")}</div>`:""}
      <div class="flabel" style="margin:14px 0 8px">Paid by</div>
      <div class="seg" id="py-by"><button type="button" class="on" data-b="me">Me</button><button type="button" data-b="other">Someone else</button></div>
      <div id="py-otherw" hidden style="margin-top:10px"><label>Person's name<input id="py-other" list="py-people" placeholder="Who paid on your behalf"></label><datalist id="py-people">${people.map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>
      <div id="py-mine"><div class="flabel" style="margin:14px 0 8px">From my banks</div>
      <div class="splitwrap"><div id="py-rows"></div><div class="splitbar"><button type="button" class="link" id="py-add">+ Add bank</button><button type="button" class="link" id="py-sug">Suggest banks</button></div><p class="note" id="py-rem"></p></div></div>
      ${proofField("py")}
      <label style="margin-top:12px">Note<input id="py-note" placeholder="Optional"></label>
      <div class="row2" style="margin-top:14px"><button class="primary" type="button" id="py-save">Save payment</button></div>${accs.length?'<div class="row2" style="margin-top:10px"><button class="mini ghost" type="button" id="py-cupi">Copy UPI + name</button><button class="mini ghost" type="button" id="py-cbank">Copy bank details</button></div>':""}`,el=>{
      const ed=makeSplit(el.querySelector("#py-rows"),el.querySelector("#py-rem"),()=>+$("#py-amt").value||0,()=>"pay",()=>"IMPS");ed.set(preset||[]);
      el.querySelector("#py-amt").oninput=()=>ed.refresh();
      el.querySelector("#py-add").onclick=()=>ed.add();el.querySelector("#py-sug").onclick=()=>ed.suggest(false);
      const acc=()=>accs.find(a=>a.id===(el.querySelector("input[name=py-acc]:checked")||{}).value);
      let by="me";el.querySelector("#py-by").onclick=e=>{const b=e.target.closest("button");if(!b)return;by=b.dataset.b;el.querySelectorAll("#py-by button").forEach(x=>x.classList.toggle("on",x===b));$("#py-otherw").hidden=by!=="other";$("#py-mine").hidden=by==="other"};
      const getFiles=assetsApi?proofPicker(el,"py"):()=>[];
      if(accs.length){el.querySelector("#py-cupi").onclick=()=>{const a=acc();if(!a||!a.upi){toast("No UPI ID saved for this account");return}copyText(upiText(a,$("#py-amt").value))};
        el.querySelector("#py-cbank").onclick=()=>{const a=acc();if(!a||!a.accNo){toast("No bank account saved for this account");return}copyText(bankText(a,$("#py-amt").value))}}
      el.querySelector("#py-save").onclick=async()=>{const amt=+$("#py-amt").value;if(!(amt>0)){toast("Enter an amount");return}
        const g=by==="me"?ed.get():{splits:[],sum:0};if(g.sum>amt+0.5){toast("Bank amounts are more than the payment");return}
        const other=$("#py-other").value.trim();if(by==="other"&&!other){toast("Enter who paid");return}
        const btn=el.querySelector("#py-save");btn.disabled=true;btn.textContent="Saving…";
        let proofs=[];const fl=getFiles();
        if(fl.length){try{proofs=await uploadProofs(fl)}catch(err){btn.disabled=false;btn.textContent="Save payment";toast(err&&err.code==="quota_exceeded"?"Storage full. Delete old screenshots.":"Screenshot upload failed. Try again.");return}}
        try{await putRec({id:newId("pp_"),kind:"ppay",party:id,account:(acc()||{}).id||"",amt,paidBy:by==="me"?"me":other.slice(0,40),splits:g.splits,proofs,note:$("#py-note").value.trim().slice(0,100),time:Date.now()});toast("Payment saved");sheets.partyView(id)}catch(err){btn.disabled=false;btn.textContent="Save payment";toast("Couldn't save")}};
    })}
});

let expCat="all";
function partyDueNow(p){const owed=partyOwed(p.id)-partyPaid(p.id);const wk=Math.max(0,(+p.weekly||0)-partyPaidWeek(p.id));return Math.max(owed>0.5?owed:0,wk)}
let dtrP="month";
function renderDirectTrade(){const el=$("#dTrade");if(!el)return;const d0=new Date();d0.setHours(0,0,0,0);
  const from=dtrP==="week"?weekStart():dtrP==="month"?new Date(d0.getFullYear(),d0.getMonth(),1).getTime():0;
  const coin=pref("coin")||"USDT";const L=orders.filter(o=>noBank(o)&&o.coin===coin&&o.time>=from&&o.status==="Completed");
  const st=stats(L);const spread=st.b.avg&&st.s.avg?st.s.avg-st.b.avg:0;const pairP=0;
  const stockAll=orders.filter(o=>noBank(o)&&o.coin===coin&&o.status==="Completed").reduce((t,o)=>t+(o.side==="BUY"?1:-1)*(+o.qty),0);
  const parts={};L.forEach(o=>{const k=o.party?((parties.find(p=>p.id===o.party)||{}).name||"Party"):(o.cp||"—");const x=parts[k]=parts[k]||{b:0,s:0};if(o.side==="BUY")x.b+=+o.qty;else x.s+=+o.qty});
  el.innerHTML=`<div class="ch-head"><b>Direct trading · ${esc(coin)}</b><div class="dtp">${[["week","Week"],["month","Month"],["all","All"]].map(([k,l])=>`<button type="button" data-dtp="${k}" class="${k===dtrP?"on":""}">${l}</button>`).join("")}</div></div>
    <div class="dtg"><div><span>Bought</span><b>${fmtQ(+st.b.q.toFixed(2))}</b><small>${st.b.avg?"avg ₹"+st.b.avg.toFixed(2):"—"}</small></div><div><span>Sold</span><b>${fmtQ(+st.s.q.toFixed(2))}</b><small>${st.s.avg?"avg ₹"+st.s.avg.toFixed(2):"—"}</small></div><div><span>Spread</span><b class="${spread>0?"pos":spread<0?"neg":""}">${spread?(spread>0?"+":"")+spread.toFixed(2):"—"}</b><small>per ${esc(coin)}</small></div></div>
    <div class="dtr2"><div><span>Direct profit</span><b class="${st.profit>0?"pos":st.profit<0?"neg":""}">${sgn(st.profit)}</b></div>${pairP?`<div><span>Sold vs exchange avg</span><b class="${pairP>0?"pos":"neg"}">${sgn(pairP)}</b></div>`:""}<div><span>Direct stock now</span><b class="${stockAll<-1e-6?"neg":""}">${fmtQ(+stockAll.toFixed(2))} ${esc(coin)}</b></div></div>
    ${Object.keys(parts).length?`<div class="dtl">${Object.entries(parts).sort((a,b)=>(b[1].b+b[1].s)-(a[1].b+a[1].s)).slice(0,5).map(([n,x])=>`<div><span>${esc(n)}</span><span>${x.b?`<em class="pos">+${fmtQ(+x.b.toFixed(2))}</em>`:""}${x.s?` <em class="neg">−${fmtQ(+x.s.toFixed(2))}</em>`:""}</span></div>`).join("")}</div>`:`<p class="note" style="margin:6px 0 0">No Direct trades in this period. Add one from New → Direct.</p>`}
    <p class="note" style="margin:8px 0 0">Direct deals don't change your bank balances. Bulk buys from a party are added to what you have to pay them.</p>`;
  el.querySelectorAll("[data-dtp]").forEach(b=>b.onclick=()=>{dtrP=b.dataset.dtp;renderDirectTrade()})}
function renderDirectPlus(due,paidWeek,left){
  try{renderDirectTrade()}catch(e){console.error(e)}
  const today=(new Date().getDay()+6)%7;const ws=weekStart();const mondayFirst=pref("week")!=="Sun";
  // overdue badge
  const over=parties.filter(p=>{const wk=+p.weekly||0,lf=wk-partyPaidWeek(p.id);const dd=p.dueDay!==""&&p.dueDay!=null?+p.dueDay:null;return wk&&lf>0.5&&dd!=null&&dd<today});
  $("#dOver").textContent=over.length?`${over.length} overdue`:"";
  // paid vs owed bar (all time)
  const owedAll=parties.reduce((t,p)=>t+partyOwed(p.id),0),paidAll=parties.reduce((t,p)=>t+partyPaid(p.id),0);
  const tot=Math.max(owedAll,paidAll+Math.max(0,left))||1;
  $("#dBar").innerHTML=owedAll||paidAll?`<i style="width:${(Math.min(paidAll,tot)/tot*100).toFixed(1)}%;background:var(--accent)"></i><i style="width:${(Math.max(0,left)/tot*100).toFixed(1)}%;background:var(--sell)"></i>`:"";
  $("#dLeg").innerHTML=owedAll||paidAll?`<span><i class="lgd" style="background:var(--accent)"></i>Paid <b>${inr(Math.round(paidAll))}</b></span><span><i class="lgd" style="background:var(--sell)"></i>Left <b>${inr(Math.round(Math.max(0,left)))}</b></span><span>of <b>${inr(Math.round(owedAll))}</b> total</span>`:`<span>Add parties and what you owe them to track it here</span>`;
  // week calendar
  const names=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  $("#dCal").innerHTML=[...Array(7)].map((_,i)=>{const dayStart=ws+i*DAY;const d=new Date(dayStart);const idx=(d.getDay()+6)%7;
    const dueP=parties.filter(p=>p.dueDay!==""&&p.dueDay!=null&&+p.dueDay===idx&&(+p.weekly||0));
    const amt=dueP.reduce((t,p)=>t+Math.max(0,(+p.weekly||0)-partyPaidWeek(p.id)),0);
    const paid=ppays.filter(x=>x.time>=dayStart&&x.time<dayStart+DAY).reduce((t,x)=>t+(+x.amt||0),0);
    const isT=d.toDateString()===new Date().toDateString(),past=dayStart+DAY<=Date.now();
    const st=amt>0.5?(past?"over":isT?"today":"due"):dueP.length?"done":"";
    return `<div class="wd ${isT?"t":""} ${st}"><span>${names[idx]}</span><b>${d.getDate()}</b><em>${amt>0.5?short(Math.round(amt)):dueP.length?"✓":paid?"":"·"}</em>${paid?`<small>−${short(Math.round(paid))}</small>`:""}</div>`}).join("");
  // KPIs
  $("#dPaidS").textContent=(n=>`${n} payment${n===1?"":"s"}`)(ppays.filter(x=>inWeek(x.time)).length);
  const wkTot=parties.reduce((t,p)=>t+(+p.weekly||0),0);$("#dDueS").textContent=wkTot?`of ${inr(Math.round(wkTot))} weekly`:"No weekly targets";
  const n=new Date();const mStart=new Date(n.getFullYear(),n.getMonth(),1).getTime();const mp=ppays.filter(x=>x.time>=mStart);
  $("#dMonth").textContent=inr(Math.round(mp.reduce((t,x)=>t+(+x.amt||0),0)));$("#dMonthS").textContent=`${mp.length} payment${mp.length===1?"":"s"}`;
  const oth=ppays.filter(x=>x.paidBy&&x.paidBy!=="me");const ob={};oth.forEach(x=>ob[x.paidBy]=(ob[x.paidBy]||0)+(+x.amt||0));
  $("#dOthers").textContent=inr(Math.round(oth.reduce((t,x)=>t+(+x.amt||0),0)));$("#dOthersS").textContent=Object.keys(ob).length?Object.entries(ob).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,v])=>`${k} ${short(Math.round(v))}`).join(" · "):"All paid by you";
  // smart plan: who to pay first and from which banks
  const dueList=parties.map(p=>{const amt=partyDueNow(p);const dd=p.dueDay!==""&&p.dueDay!=null?+p.dueDay:null;const pri=dd==null?5:dd<today?0:dd===today?1:2+(dd-today)/10;return{p,amt,dd,pri}}).filter(x=>x.amt>0.5).sort((a,b)=>a.pri-b.pri||b.amt-a.amt);
  $("#dPlanCard").hidden=!dueList.length;
  if(dueList.length){const {bal}=balances();const tmpBal={...bal};const use=limitUse();
    $("#dPlan").innerHTML=dueList.slice(0,5).map(x=>{let left=x.amt;const parts=[];
      banks.filter(b=>b.type!=="Cash").map(b=>({b,v:Math.min(tmpBal[b.id],limitLeft(b,"IMPS",use))})).filter(k=>k.v>0).sort((a,b)=>b.v-a.v).forEach(k=>{if(left<=0.5)return;const t=Math.floor(Math.min(k.v,left));if(t<=0)return;parts.push({bank:k.b.id,amt:t,method:"IMPS"});tmpBal[k.b.id]-=t;left-=t});
      const when=x.dd==null?"Any day":x.dd<today?`Overdue (${DAYS[x.dd]})`:x.dd===today?"Due today":`Due ${DAYS[x.dd]}`;
      return `<div class="pl2"><div><b>${esc(x.p.name)}</b><small class="${x.dd!=null&&x.dd<=today?"warn":""}">${when} · ${inr(Math.round(x.amt))}</small><small>${parts.length?parts.map(k=>esc(bankName(k.bank))+" "+inr(k.amt)).join(" + "):"No bank balance available"}${left>0.5?` · <span class="warn">short ${inr(Math.round(left))}</span>`:""}</small></div><button type="button" class="mini" data-plan="${x.p.id}" data-amt="${Math.round(x.amt-Math.max(0,left))}" data-sp='${esc(JSON.stringify(parts))}'>Pay</button></div>`}).join("");
  }
  // paid per week chart (8 weeks)
  try{const c1=cssv("--c1")||"#3987e5";const wks=[...Array(8)].map((_,i)=>{const a=ws-(7-i)*7*DAY;return{a,b:a+7*DAY,lab:new Date(a).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}});
    const vals=wks.map(w=>Math.round(ppays.filter(x=>x.time>=w.a&&x.time<w.b).reduce((t,x)=>t+(+x.amt||0),0)));
    $("#chWeeks-sub").textContent="8 weeks · "+inr(vals.reduce((a,b)=>a+b,0));
    barChart($("#chWeeks"),{labels:wks.map(w=>w.lab.split(" ")[0]),series:[{name:"Paid",values:vals,color:c1,tipFmt:v=>inr(v)}],tipTitle:i=>"Week of "+wks[i].lab,every:1})}catch(e){console.error(e)}
}
let wP=(()=>{try{return localStorage.getItem("p2p_wP")||"today"}catch(e){return "today"}})();
function bankTag(b,mv){if(b.status==="frozen")return ' <span class="cpb idle" style="background:var(--sell);color:#fff">Frozen</span>';if(b.status==="paused")return ' <span class="cpb idle">Paused</span>';const l=mv.filter(x=>x.bank===b.id).sort((a,c)=>c.time-a.time)[0];if(!l)return ' <span class="cpb idle">New</span>';const d=Math.floor((Date.now()-l.time)/DAY);return d>=7?` <span class="cpb idle">Idle ${d}d</span>`:""}
function renderWalletPlus(bal,mv,total){
  document.querySelectorAll("#wSeg button").forEach(b=>b.classList.toggle("on",b.dataset.p===wP));
  const n=new Date(),d0=new Date(n);d0.setHours(0,0,0,0);const days=wP==="today"?1:+wP;const a=wP==="today"?d0.getTime():Date.now()-days*DAY;
  const fl=mv.filter(x=>x.time>=a&&x.kind!=="TR");const inn=fl.filter(x=>x.amt>0),out=fl.filter(x=>x.amt<0);
  const sIn=inn.reduce((t,x)=>t+x.amt,0),sOut=-out.reduce((t,x)=>t+x.amt,0);
  $("#wIn").textContent="+"+inr(Math.round(sIn));$("#wOut").textContent="−"+inr(Math.round(sOut));
  const kinds=l=>{const g={};l.forEach(x=>{const k=x.kind==="SELL"?"sales":x.kind==="BUY"?"buys":x.kind==="EXP"?"expenses":x.kind==="PP"?"party pay":"other";g[k]=(g[k]||0)+Math.abs(x.amt)});return Object.entries(g).sort((p,q)=>q[1]-p[1]).slice(0,2).map(([k,v])=>`${k} ${inr(Math.round(v))}`).join(" · ")||"No movement"};
  $("#wInS").textContent=kinds(inn);$("#wOutS").textContent=kinds(out);
  try{const LB=liteBanks();let le=document.getElementById("wLite");if(!le){le=document.createElement("div");le.id="wLite";le.className="note";le.style.cssText="margin:-2px 0 8px;font-weight:600";const tt=document.getElementById("wTotal");tt&&tt.insertAdjacentElement("afterend",le)}
    le.hidden=!LB.length;le.innerHTML=LB.length?`<span class="mtag litetag">UPI Lite</span> ${inr(Math.round(LB.reduce((t,b)=>t+(+b.lite.bal||0),0)))}${LB.length>1?" in "+LB.length+" banks":" in "+esc(LB[0].name)}`:""}catch(e){}
  const net=sIn-sOut;const ch=$("#wNetChg");ch.textContent=(sIn||sOut)?`${net>=0?"+":"−"}${inr(Math.abs(Math.round(net)))} ${wP==="today"?"today":wP+"D"}`:"";ch.className="h2chg"+(net<0?" neg":"");
  // bank split bar
  const C=["var(--c1)","var(--c2)","var(--c3)","var(--c4)","var(--c5)"];const pos=banks.map(b=>({n:b.name,v:Math.max(0,bal[b.id])})).sort((p,q)=>q.v-p.v);
  const sh=pos.slice(0,4);const rest=pos.slice(4).reduce((t,x)=>t+x.v,0);if(rest)sh.push({n:"Others",v:rest});const tot=sh.reduce((t,x)=>t+x.v,0)||1;
  $("#wBar").innerHTML=sh.filter(x=>x.v>0).map((x,i)=>`<i style="width:${(x.v/tot*100).toFixed(2)}%;background:${C[i]}"></i>`).join("");
  $("#wBarLeg").innerHTML=sh.filter(x=>x.v>0).map((x,i)=>`<span><i class="lgd" style="background:${C[i]}"></i>${esc(x.n)} <b>${inr(Math.round(x.v))}</b></span>`).join("");
  // can send now (balance capped by limit left), per method
  const use=limitUse();const nb=banks.filter(b=>b.type!=="Cash");
  const cap=m=>nb.reduce((t,b)=>t+Math.max(0,Math.min(bal[b.id],limitLeft(b,m,use))),0);
  const ms=["UPI","IMPS","NEFT"].map(m=>({m,v:cap(m)}));
  $("#wLimCard").hidden=!nb.length;$("#wLimSub").textContent="balance within today's limits";
  $("#wLims").innerHTML=ms.map(x=>`<div><span>${x.m}</span><b>${inr(Math.round(x.v))}</b></div>`).join("");
  // weekly direct dues vs money
  const due=parties.reduce((t,p)=>t+Math.max(0,(+p.weekly||0)-partyPaidWeek(p.id)),0),owed=parties.reduce((t,p)=>t+Math.max(0,partyOwed(p.id)-partyPaid(p.id)),0);
  const need=Math.max(due,owed);const cv=$("#wCover");
  if(!need){cv.hidden=true}else{cv.hidden=false;const ok=total>=need;const pct=Math.min(100,total/need*100);
    cv.innerHTML=`<div class="ch-head"><b>Direct dues cover</b><span>${ok?"Covered ✓":"Short by "+inr(Math.round(need-total))}</span></div><div class="lb" style="height:8px"><i style="width:${pct.toFixed(1)}%;background:${ok?"var(--accent)":"var(--sell)"}"></i></div><div class="ks">You owe parties ${inr(Math.round(need))} · you have ${inr(Math.round(total))}</div>`}
  // cash flow chart
  try{const s1=cssv("--buy")||"#23c58f",s2=cssv("--sell")||"#f0596b";const ND=wP==="30"?30:wP==="7"?7:7;const dk=t=>new Date(t).toLocaleDateString("en-CA");
    const ds=[...Array(ND)].map((_,i)=>{const t=Date.now()-(ND-1-i)*DAY;return{k:dk(t),lab:new Date(t).getDate()+"",full:new Date(t).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}});
    const vin=ds.map(d=>Math.round(mv.filter(x=>x.kind!=="TR"&&x.amt>0&&dk(x.time)===d.k).reduce((t,x)=>t+x.amt,0)));
    const vout=ds.map(d=>-Math.round(mv.filter(x=>x.kind!=="TR"&&x.amt<0&&dk(x.time)===d.k).reduce((t,x)=>t-x.amt,0)));
    legend("chFlow",[["In",s1],["Out",s2]]);$("#chFlowT").textContent=`Cash flow · last ${ND} days`;
    flowChart($("#chFlow"),{labels:ds.map(d=>d.lab),vin,vout,full:ds.map(d=>d.full),c1:s1,c2:s2,every:ND>20?5:1})}catch(e){console.error(e)}
}
// diverging bars: money in above the line, money out below

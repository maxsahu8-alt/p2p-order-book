// ================= WHATSAPP
const WAK="p2p_wa";let waCfg={mode:"app",pid:"",token:"",ver:"v21.0",tpl:"",tlang:"en",cc:"91",sig:"",ml:"hi"};
try{waCfg=Object.assign(waCfg,JSON.parse(localStorage.getItem(WAK)||"{}"))}catch(e){}
function waSaveCfg(){try{localStorage.setItem(WAK,JSON.stringify(waCfg))}catch(e){}}
const waApiOn=()=>waCfg.mode==="api"&&!!waCfg.pid&&!!waCfg.token;
const waT=(en,hi)=>waCfg.ml==="en"?en:hi;
function waNum(ph){let d=String(ph||"").replace(/\D/g,"").replace(/^0+/,"");if(d.length===10)d=(waCfg.cc||"91")+d;return d.length>=11&&d.length<=15?d:""}
function waShowNum(n){return n?"+"+n.slice(0,n.length-10)+" "+n.slice(-10,-5)+" "+n.slice(-5):""}
function waLogs(){try{return JSON.parse(localStorage.getItem("p2p_walog")||"[]")}catch(e){return[]}}
function waLog(x){const L=[{t:Date.now(),...x},...waLogs()].slice(0,60);try{localStorage.setItem("p2p_walog",JSON.stringify(L))}catch(e){}}
function waSig(){const s=(waCfg.sig||"").trim()||pref("biz")||pref("owner")||"";return s?"\n\n— "+s:""}
const waD=t=>new Date(t).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
const waDT=t=>new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
const waAcc=a=>[a.holder,a.bankName&&a.accNo?a.bankName+" ••"+String(a.accNo).slice(-4):a.bankName||(a.accNo?"A/c ••"+String(a.accNo).slice(-4):""),!a.accNo&&a.upi?a.upi:""].filter(Boolean).join(" · ");
function waPaidTo(p,a){return ppays.filter(x=>x.party===p.id&&x.account===a.id).reduce((t,x)=>t+(+x.amt||0),0)}
// ---- message builders
const WA_MSG={
  update(p){const owed=partyOwed(p.id),paid=partyPaid(p.id),left=owed-paid;const T=(p.accounts||[]).filter(a=>+a.target);
    let s=`${waT("Hello","Namaste")} ${p.name} 🙏\n*${waT("Payment update","Payment update")}* · ${waD(Date.now())}\n\n${waT("Total","Total")}: ${inr(Math.round(owed))}\n${waT("Paid","Paid")}: ${inr(Math.round(paid))}\n${left<-0.5?waT("Extra paid","Extra paid")+": "+inr(Math.round(-left)):waT("Left","Baki")+": "+inr(Math.round(Math.max(0,left)))}`;
    if(T.length){s+="\n\n"+T.map(a=>{const g=waPaidTo(p,a),t=+a.target,lf=t-g;return lf<=0.5?`✅ ${waAcc(a)}: ${inr(Math.round(t))} ${waT("paid","done")}`:`⏳ ${waAcc(a)}: ${inr(Math.round(g))} / ${inr(Math.round(t))}${a.due?" · "+waT("by","by")+" "+new Date(a.due+"T00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"}):""}`}).join("\n")}
    return s+waSig()},
  paid(p,x){const a=(p.accounts||[]).find(k=>k.id===x.account);const left=partyOwed(p.id)-partyPaid(p.id);
    return`✅ *${waT("Payment done","Payment ho gaya")}*\n\n${waT("Amount","Amount")}: ${inr(Math.round(+x.amt))}\n${a?waT("To","Kisko")+": "+waAcc(a)+"\n":""}${waT("Date","Date")}: ${waDT(x.time)}${x.note?"\n"+waT("Note","Note")+": "+x.note:""}${left>0.5?"\n\n"+waT("Balance left","Baki")+": "+inr(Math.round(left)):left>-0.5?"\n\n"+waT("All settled ✓","Sab clear ✓"):""}`+waSig()},
  payee(p,a){const g=waPaidTo(p,a),t=+a.target||0,lf=t-g;const nm=a.holder||"";
    return`${waT("Hello","Namaste")}${nm?" "+nm:""} 🙏\n${t?(lf<=0.5?waT(`Your full payment of ${inr(Math.round(t))} has been sent ✅`,`Aapka pura payment ${inr(Math.round(t))} bhej diya hai ✅`):waT(`Sent so far: ${inr(Math.round(g))} of ${inr(Math.round(t))}\nLeft: ${inr(Math.round(lf))}`,`Ab tak bheja: ${inr(Math.round(g))} / ${inr(Math.round(t))}\nBaki: ${inr(Math.round(lf))}`)+(a.due?"\n"+waT("Will be paid by","Baki payment")+" "+new Date(a.due+"T00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})+waT(""," tak ho jayega"):"")):waT(`Sent so far: ${inr(Math.round(g))}`,`Ab tak bheja: ${inr(Math.round(g))}`)}\n${waT("Account","Account")}: ${waAcc(a)}\n(${waT("on behalf of","on behalf of")} ${p.name})`+waSig()},
  payeePaid(p,a,x){return`${waT("Hello","Namaste")}${a.holder?" "+a.holder:""} 🙏\n✅ ${inr(Math.round(+x.amt))} ${waT("sent to your account","aapke account me bhej diya hai")}\n${waAcc(a)}\n${waDT(x.time)}${x.note?"\n"+x.note:""}\n(${waT("on behalf of","on behalf of")} ${p.name})`+waSig()},
  stmt(p,R){return`📄 *${waT("Statement","Statement")}* · ${p.name}\n${R.label}\n\n${waT("Opening","Opening")}: ${inr(Math.round(R.open))}\n${waT("Added","Added")}: ${inr(Math.round(R.added))}\n${waT("Paid","Paid")}: ${inr(Math.round(R.paid))}\n${R.close<-0.5?waT("Extra paid","Extra paid")+": "+inr(Math.round(-R.close)):waT("Closing left","Baki")+": "+inr(Math.round(R.close))}`+waSig()},
  receipt(o){const bought=o.side==="SELL";const sp=o.party?parties.find(x=>x.id===o.party):null;const pp=ppays.filter(x=>x.order===o.id);
    const to=pp.map(x=>{const pr=parties.find(k=>k.id===x.party)||{};const ac=(pr.accounts||[]).find(k=>k.id===x.account);return"• "+(ac?waAcc(ac):pr.name||"")+": "+inr(Math.round(+x.amt))}).join("\n");
    return`🧾 *${waT("Deal confirmation","Deal confirmation")}*\n\n${bought?waT("You bought","Aapne liya"):waT("You sold","Aapne becha")}: ${fmtQ(o.qty)} ${o.coin}\n${waT("Rate","Rate")}: ₹${fmtR(o.rate)}\n${waT("Total","Total")}: ${inr(Math.round(orderTotal(o)))}\n${waT("Date","Date")}: ${waDT(o.time)}\n${waT("Status","Status")}: ${o.status}${to?"\n\n"+(bought?waT("Payment to","Payment kahan karna hai"):waT("Paid to","Payment gaya"))+":\n"+to:""}`+waSig()}
};
// ---- sending
async function waGraph(path,body,form){const h={Authorization:"Bearer "+waCfg.token};if(!form)h["content-type"]="application/json";
  const r=await fetch(`https://graph.facebook.com/${waCfg.ver||"v21.0"}/${path}`,{method:"POST",headers:h,body:form?body:JSON.stringify(body)});
  let j={};try{j=await r.json()}catch(e){}if(!r.ok||j.error){const er=j.error||{};const e=new Error(er.error_user_msg||(er.error_data&&er.error_data.details)||er.message||"HTTP "+r.status);e.code=er.code;e.api=true;throw e}return j}
async function waApiText(to,text){
  try{return await waGraph(waCfg.pid+"/messages",{messaging_product:"whatsapp",recipient_type:"individual",to,type:"text",text:{preview_url:false,body:text.slice(0,4096)}})}
  catch(e){if(e.api&&waCfg.tpl&&[131047,131026,470].includes(+e.code))return waApiTpl(to,text);throw e}}
async function waApiTpl(to,text){const flat=text.replace(/[*_]/g,"").replace(/\s*\n+\s*/g," · ").replace(/ {4,}/g," ").slice(0,1000);
  return waGraph(waCfg.pid+"/messages",{messaging_product:"whatsapp",to,type:"template",template:{name:waCfg.tpl,language:{code:waCfg.tlang||"en"},components:[{type:"body",parameters:[{type:"text",text:flat}]}]}})}
async function waApiFile(to,blob,name,caption){const fd=new FormData();fd.append("messaging_product","whatsapp");fd.append("type",blob.type||"application/octet-stream");fd.append("file",blob,name);
  const up=await waGraph(waCfg.pid+"/media",fd,true);const img=/^image\//.test(blob.type);
  return waGraph(waCfg.pid+"/messages",{messaging_product:"whatsapp",to,type:img?"image":"document",[img?"image":"document"]:img?{id:up.id,caption:(caption||"").slice(0,1024)}:{id:up.id,filename:name,caption:(caption||"").slice(0,1024)}})}
const waLink=(num,text)=>"https://wa.me/"+(num||"")+"?text="+encodeURIComponent(text||"");
async function waShareFiles(files,text){try{if(navigator.canShare&&navigator.canShare({files})){await navigator.share({files,text});return"shared"}}catch(e){if(e&&e.name==="AbortError")return"cancel"}return""}
function waErrText(e){if(!e||!e.api)return waT("Couldn't reach WhatsApp API from here (works in the APK app). Use the WhatsApp app button.","Yahan se WhatsApp API tak nahi pahunch paya (APK app me chalega). WhatsApp app wala button use karo.");
  const c=+e.code;if(c===190)return waT("Access token expired or wrong. Update it in WhatsApp settings.","Access token expire ya galat hai. WhatsApp settings me naya daalo.");
  if(c===131047||c===470)return waT("24h window closed. Add an approved template in WhatsApp settings.","24 ghante ki window band hai. WhatsApp settings me approved template daalo.");
  if(c===131030)return waT("This number isn't on your allowed test list in Meta.","Ye number Meta test list me add nahi hai.");return e.message}
// ---- send sheet
sheets.wasend=function(c){c=c||{};const p=c.party?parties.find(x=>x.id===c.party):null;const o=c.order?orders.find(x=>x.id===c.order):null;
  const x=c.pay?ppays.find(k=>k.id===c.pay):null;const cp=o&&o.client?parties.find(k=>k.id===o.client):null;
  // recipients
  const R=[];const add=(id,label,ph)=>{const n=waNum(ph);R.push({id,label,n})};
  if(o){if(cp)add("cl",cp.name,cp.phone);else add("cl",o.cp||waT("Client","Client"),"")}
  if(p){add("p",p.name,p.phone);(p.accounts||[]).forEach((a,i)=>{if(a.phone||(c.acc===i))add("a"+i,a.holder||a.bankName||"Person",a.phone)})}
  if(!R.length)add("x","Other","");
  let rcp=c.acc!=null&&R.find(r=>r.id==="a"+c.acc)?"a"+c.acc:(x&&x.account&&p&&R.find(r=>r.id==="a"+(p.accounts||[]).findIndex(a=>a.id===x.account))&&c.to==="payee"?"a"+(p.accounts||[]).findIndex(a=>a.id===x.account):R[0].id);
  const kinds=o?[["receipt","Receipt"],["free","Custom"]]:x?[["paid","Payment done"],["update","Update"],["free","Custom"]]:p?[["update","Update"],["stmt","Statement PDF"],["free","Custom"]]:[["free","Message"]];
  let kind=c.kind&&kinds.some(k=>k[0]===c.kind)?c.kind:kinds[0][0],per="month",attach=!!(x&&(x.proofs||[]).length),edited=false;
  const accOf=id=>id&&id[0]==="a"&&p?(p.accounts||[])[+id.slice(1)]:null;
  const build=()=>{const ac=accOf(rcp);
    if(kind==="receipt"&&o)return WA_MSG.receipt(o);
    if(kind==="paid"&&x)return ac?WA_MSG.payeePaid(p,ac,x):WA_MSG.paid(p,x);
    if(kind==="update"&&p)return ac?WA_MSG.payee(p,ac):WA_MSG.update(p);
    if(kind==="stmt"&&p)return WA_MSG.stmt(p,partyStmt(p,per));
    return c.text||(waT("Hello","Namaste")+(p?" "+p.name:"")+" 🙏\n")+waSig()};
  const back=c.back||(p?()=>sheets.partyView(p.id):o?()=>orderSheet(o.id):null);
  openSheet(`<div class="insw wsw"><div class="insh"><h3><span class="wsi">${WA_ICON}</span>WhatsApp</h3><button type="button" class="wsmode ${waApiOn()?"on":""}" id="ws-mode">${waApiOn()?"Business API":"WhatsApp app"} ›</button></div>
    <div class="pcsec">To</div><div class="cvchips wsr" id="ws-r">${R.map(r=>`<button type="button" data-r="${r.id}" class="${r.id===rcp?"on":""}">${esc(r.label)}${r.n?"":" <em>no no.</em>"}</button>`).join("")}</div>
    <label class="pcl">WhatsApp number<input id="ws-n" inputmode="tel" placeholder="10-digit mobile number"></label>
    <label class="wssv" id="ws-svw" hidden><input type="checkbox" id="ws-sv" checked> Save this number</label>
    <div class="pcsec">Message</div><div class="cvchips" id="ws-k">${kinds.map(([k,l])=>`<button type="button" data-k="${k}" class="${k===kind?"on":""}">${l}</button>`).join("")}</div>
    <div class="seg psper" id="ws-per" style="grid-template-columns:repeat(4,1fr);margin-bottom:10px" hidden>${[["week","This week"],["month","This month"],["d30","30 days"],["all","All time"]].map(([k,l])=>`<button type="button" data-p="${k}" class="${k===per?"on":""}">${l}</button>`).join("")}</div>
    <div class="wsbub"><textarea id="ws-t" rows="9"></textarea><small id="ws-f"></small></div>
    ${x&&(x.proofs||[]).length?`<label class="wssv"><input type="checkbox" id="ws-pf" checked> Attach payment screenshot (${x.proofs.length})</label>`:""}
    <p class="note wsst" id="ws-st"></p>
    <div class="row2 wsgo">${back?'<button type="button" class="mini ghost" id="ws-back">Back</button>':'<button type="button" class="mini ghost" id="ws-c">Copy</button>'}<a class="primary wa" id="ws-go" href="#" target="_blank" rel="noopener"></a></div>
    ${back?'<button type="button" class="link wscp" id="ws-c">Copy text</button>':""}</div>`,el=>{
    const q=s=>el.querySelector(s);const ta=q("#ws-t"),num=q("#ws-n"),go=q("#ws-go"),st=q("#ws-st");
    const cur=()=>R.find(r=>r.id===rcp)||R[0];
    const setNum=()=>{const r=cur();num.value=r.n?r.n.replace(new RegExp("^"+(waCfg.cc||"91")),""):"";q("#ws-svw").hidden=true};
    const fill=()=>{if(!edited)ta.value=build();q("#ws-per").hidden=kind!=="stmt";upd()};
    const upd=()=>{const n=waNum(num.value);const r=cur();q("#ws-svw").hidden=!(n&&n!==r.n&&r.id!=="x"&&(r.id!=="cl"||cp));
      const file=kind==="stmt"||(q("#ws-pf")&&q("#ws-pf").checked);
      q("#ws-f").textContent=(kind==="stmt"?"📎 PDF statement will be attached · ":file?"📎 Screenshot attached · ":"")+ta.value.length+" chars";
      go.textContent=waApiOn()?(n?"Send now":"Add number"):file?"Share on WhatsApp":"Open WhatsApp";
      go.href=!waApiOn()&&!file?waLink(n,ta.value):"#"};
    setNum();fill();
    q("#ws-r").onclick=e=>{const b=e.target.closest("[data-r]");if(!b)return;rcp=b.dataset.r;el.querySelectorAll("#ws-r button").forEach(k=>k.classList.toggle("on",k===b));setNum();edited=false;fill()};
    q("#ws-k").onclick=e=>{const b=e.target.closest("[data-k]");if(!b)return;kind=b.dataset.k;el.querySelectorAll("#ws-k button").forEach(k=>k.classList.toggle("on",k===b));edited=false;fill()};
    q("#ws-per").onclick=e=>{const b=e.target.closest("[data-p]");if(!b)return;per=b.dataset.p;el.querySelectorAll("#ws-per button").forEach(k=>k.classList.toggle("on",k===b));edited=false;fill()};
    ta.oninput=()=>{edited=true;upd()};num.oninput=upd;if(q("#ws-pf"))q("#ws-pf").onchange=upd;
    q("#ws-c").onclick=()=>copyText(ta.value);if(q("#ws-back"))q("#ws-back").onclick=back;
    q("#ws-mode").onclick=()=>sheets.wa();
    const saveNum=async n=>{if(!q("#ws-sv")||q("#ws-svw").hidden||!q("#ws-sv").checked)return;const r=cur();const ph=n.replace(new RegExp("^"+(waCfg.cc||"91")),"");
      try{if(r.id==="p")await patchRec(p.id,{phone:ph});else if(r.id==="cl"&&cp)await patchRec(cp.id,{phone:ph});else if(r.id[0]==="a"){const accs=[...(p.accounts||[])];const i=+r.id.slice(1);accs[i]={...accs[i],phone:ph};await patchRec(p.id,{accounts:accs})}r.n=n;q("#ws-svw").hidden=true}catch(e){}};
    const label=()=>({receipt:"Receipt",paid:"Payment done",update:"Update",stmt:"Statement",free:"Message"})[kind];
    const getFile=async()=>{if(kind==="stmt"){const S=partyStmt(p,per);const f=await partyPdf(p,S,true,true);return{blob:f.blob,name:f.name}}
      if(q("#ws-pf")&&q("#ws-pf").checked){const id=x.proofs[0];const b=await (await fetch("/_blob/"+encodeURIComponent(id))).blob();return{blob:b,name:"payment-"+new Date(x.time).toLocaleDateString("en-CA")+"."+((b.type.split("/")[1]||"jpg").replace("jpeg","jpg"))}}return null};
    go.onclick=async e=>{const n=waNum(num.value),text=ta.value.trim();const r=cur();const needFile=kind==="stmt"||(q("#ws-pf")&&q("#ws-pf").checked);
      if(!text){e.preventDefault();toast("Message is empty");return}
      if(!waApiOn()&&!needFile){saveNum(n);waLog({to:r.label,n,k:label(),via:"app",ok:true});return}
      e.preventDefault();
      if(waApiOn()&&!n){toast("Enter the WhatsApp number");num.focus();return}
      go.classList.add("busy");const old=go.textContent;go.textContent=waApiOn()?"Sending…":"Preparing…";st.className="note wsst";st.textContent="";
      try{if(waApiOn()){const f=needFile?await getFile():null;if(f)await waApiFile(n,f.blob,f.name,text);else await waApiText(n,text);
          saveNum(n);waLog({to:r.label,n,k:label(),via:"api",ok:true});st.className="note wsst ok";st.textContent="✓ "+waT("Sent to","Bhej diya")+" "+waShowNum(n);toast("Sent on WhatsApp");go.textContent="Send again"}
        else{const f=await getFile();const file=new File([f.blob],f.name,{type:f.blob.type});const s=await waShareFiles([file],text);
          if(s==="shared"){saveNum(n);waLog({to:r.label,n,k:label(),via:"share",ok:true});st.className="note wsst ok";st.textContent="✓ "+waT("Shared. Pick the chat in WhatsApp.","Share ho gaya. WhatsApp me chat chuno.")}
          else if(s!=="cancel"){await saveFile(f.name,f.blob);st.innerHTML=esc(waT("File saved. Now open WhatsApp and attach it:","File save ho gayi. Ab WhatsApp kholo aur attach karo:"))+` <a href="${waLink(n,text)}" target="_blank" rel="noopener">Open chat ›</a>`;waLog({to:r.label,n,k:label(),via:"app",ok:true})}
          go.textContent=old}}
      catch(err){waLog({to:r.label,n,k:label(),via:waApiOn()?"api":"app",ok:false,err:String(err&&err.message||err).slice(0,120)});st.className="note wsst bad";
        st.innerHTML=esc(waErrText(err))+(n||!waApiOn()?` <a href="${waLink(n,text)}" target="_blank" rel="noopener">${waT("Open in WhatsApp app","WhatsApp app me kholo")} ›</a>`:"");go.textContent=old}
      go.classList.remove("busy")};
  })};
const WA_ICON='<svg viewBox="0 0 24 24"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1-.4-2.3-1.7-2.7-2.7l.8-1-1-2z"/></svg>';
// ---- hub + settings
sheets.wa=function(tab){tab=tab||"home";const due=parties.map(p=>({p,l:partyOwed(p.id)-partyPaid(p.id)})).filter(r=>r.l>0.5).sort((a,b)=>b.l-a.l);
  const payees=[];parties.forEach(p=>(p.accounts||[]).forEach((a,i)=>{const t=+a.target;if(!t)return;const g=waPaidTo(p,a);if(t-g>0.5)payees.push({p,a,i,l:t-g})}));
  const L=waLogs();const api=waApiOn();
  openSheet(`<div class="insw wsw"><div class="insh"><h3><span class="wsi">${WA_ICON}</span>WhatsApp</h3><span class="note">${L.filter(x=>x.ok&&x.t>Date.now()-864e5).length} sent today</span></div>
    <div class="seg iseg" id="wa-tab" style="grid-template-columns:1fr 1fr 1fr">${[["home","Send"],["log","History"],["set","Setup"]].map(([k,l])=>`<button type="button" data-t="${k}" class="${k===tab?"on":""}">${l}</button>`).join("")}</div>
    ${tab==="home"?`<div class="wahero ${api?"on":""}"><span class="wadot"></span><div><b>${api?"Business API connected":"WhatsApp app mode"}</b><small>${api?"Messages go out directly from your business number":"Opens WhatsApp with the message ready. Set up Business API to send in one tap."}</small></div>${api?"":`<button type="button" class="mini ghost" data-wt="set">Set up</button>`}</div>
      <div class="pcsec">Parties with dues <span class="note">${due.length}</span></div>
      <div class="rml">${due.map(({p,l})=>`<div class="rmi"><span class="pva sm">${esc(p.name.slice(0,2).toUpperCase())}</span><div class="rmt"><b>${esc(p.name)}</b><small>Left ${inr(Math.round(l))}${p.phone?" · "+esc(p.phone):" · no number"}</small></div><button type="button" class="mini ghost" data-wu="${p.id}">Update</button></div>`).join("")||'<p class="note" style="padding:8px 0">No dues right now.</p>'}</div>
      ${api&&due.filter(r=>waNum(r.p.phone)).length>1?`<button type="button" class="mini psdl" id="wa-bulk" style="width:100%;padding:12px;margin-top:8px">Send update to all ${due.filter(r=>waNum(r.p.phone)).length} parties</button>`:""}
      ${payees.length?`<div class="pcsec">People waiting for payment <span class="note">${payees.length}</span></div><div class="rml">${payees.slice(0,12).map(r=>`<div class="rmi"><span class="pva sm">${esc((r.a.holder||r.a.bankName||"?").slice(0,2).toUpperCase())}</span><div class="rmt"><b>${esc(r.a.holder||r.a.bankName||"Person")}</b><small>${esc(r.p.name)} · left ${inr(Math.round(r.l))}${r.a.due?" · by "+new Date(r.a.due+"T00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"}):""}</small></div><button type="button" class="mini ghost" data-wp="${r.p.id}:${r.i}">Status</button></div>`).join("")}</div>`:""}
      <div class="pcsec">Quick</div><div class="cvchips" style="flex-wrap:wrap"><button type="button" id="wa-free">New message</button><button type="button" data-dq="share">Due list</button><button type="button" data-sheet="nightrep">Day report</button><button type="button" data-sheet="paycard">Pay card</button></div>
      <p class="note">Tip: open any party → <b>WhatsApp</b>, or any order → <b>WhatsApp</b> for a deal receipt. Ask P2P Brain: “Vineet ko WhatsApp update bhejo”.</p>`
    :tab==="log"?`<div class="rml">${L.slice(0,40).map(x=>`<div class="rmi ${x.ok?"":"over"}"><span class="wlv ${x.via}">${x.via==="api"?"API":x.via==="share"?"Share":"App"}</span><div class="rmt"><b>${esc(x.k)} → ${esc(x.to||"")}</b><small>${waDT(x.t)}${x.n?" · "+waShowNum(x.n):""}${x.ok?"":" · ✕ "+esc(x.err||"failed")}</small></div></div>`).join("")||'<p class="note" style="padding:10px 0">Nothing sent yet.</p>'}</div>${L.length?'<button type="button" class="link del" id="wa-clr">Clear history</button>':""}<p class="note">History is kept on this device only.</p>`
    :`<div class="pcsec">How to send</div><div class="seg iseg" id="wa-m" style="grid-template-columns:1fr 1fr"><button type="button" data-m="app" class="${waCfg.mode!=="api"?"on":""}">WhatsApp app</button><button type="button" data-m="api" class="${waCfg.mode==="api"?"on":""}">Business API</button></div>
      <div id="wa-api" ${waCfg.mode==="api"?"":"hidden"}><div class="icard">
        <label class="pcl">Phone number ID<input id="wa-pid" inputmode="numeric" value="${esc(waCfg.pid)}" placeholder="e.g. 109876543210987"></label>
        <label class="pcl">Access token<input id="wa-tok" type="password" autocomplete="off" value="${esc(waCfg.token)}" placeholder="EAAG…"></label>
        <div class="pcrow"><label>Template name<input id="wa-tpl" value="${esc(waCfg.tpl)}" placeholder="Optional"></label><label>Language<input id="wa-tl" value="${esc(waCfg.tlang||"en")}" placeholder="en"></label></div>
        <label class="pcl">API version<input id="wa-ver" value="${esc(waCfg.ver||"v21.0")}"></label>
        <div class="pcrow"><label>Test to number<input id="wa-tn" inputmode="tel" value="${esc(pref("phone")||"")}" placeholder="Your number"></label><button type="button" class="mini ghost" id="wa-test" style="align-self:end;padding:12px">Send test</button></div>
        <p class="note wsst" id="wa-tst"></p></div>
        <details class="wahelp"><summary>How to get these (5 min)</summary><ol><li>Open <b>developers.facebook.com</b> → My Apps → Create app → type <b>Business</b> → add <b>WhatsApp</b>.</li><li>WhatsApp → <b>API Setup</b>: copy <b>Phone number ID</b>. Add your business number (or use the free test number and add recipients).</li><li>Business settings → System users → create one → <b>Generate token</b> with <i>whatsapp_business_messaging</i> permission (permanent token).</li><li>WhatsApp only allows free text within 24 h after the party last messaged you. For other times create a <b>Utility template</b> with one variable <code>{{1}}</code> (e.g. “Update: {{1}}”), get it approved, and put its name above. The app switches to it automatically.</li></ol><p class="note">Meta charges per conversation after the free tier. The token is saved on this device only, never in your synced data.</p></details></div>
      <div class="pcsec">Message style</div><div class="icard">
        <div class="seg iseg" id="wa-ml" style="grid-template-columns:1fr 1fr"><button type="button" data-l="hi" class="${waCfg.ml!=="en"?"on":""}">Hinglish</button><button type="button" data-l="en" class="${waCfg.ml==="en"?"on":""}">English</button></div>
        <div class="pcrow"><label>Signature<input id="wa-sig" value="${esc(waCfg.sig)}" placeholder="${esc(pref("biz")||pref("owner")||"Your name")}"></label><label>Country code<input id="wa-cc" inputmode="numeric" value="${esc(waCfg.cc||"91")}"></label></div></div>
      <button type="button" class="mini psdl" id="wa-save" style="width:100%;padding:13px;margin-top:10px">Save</button>`}
  </div>`,el=>{const q=s=>el.querySelector(s);
    q("#wa-tab").onclick=e=>{const b=e.target.closest("[data-t]");if(b)sheets.wa(b.dataset.t)};
    el.querySelectorAll("[data-wt]").forEach(b=>b.onclick=()=>sheets.wa(b.dataset.wt));
    el.querySelectorAll("[data-wu]").forEach(b=>b.onclick=()=>sheets.wasend({party:b.dataset.wu,kind:"update",back:()=>sheets.wa()}));
    el.querySelectorAll("[data-wp]").forEach(b=>b.onclick=()=>{const [pid,i]=b.dataset.wp.split(":");sheets.wasend({party:pid,acc:+i,back:()=>sheets.wa()})});
    if(q("#wa-free"))q("#wa-free").onclick=()=>sheets.wasend({back:()=>sheets.wa()});
    if(q("#wa-clr"))twoTap(q("#wa-clr"),()=>{try{localStorage.removeItem("p2p_walog")}catch(e){}sheets.wa("log")});
    if(q("#wa-bulk"))q("#wa-bulk").onclick=async e=>{const b=e.currentTarget;const T=due.filter(r=>waNum(r.p.phone));b.disabled=true;let ok=0,bad=0;
      for(const [i,r] of T.entries()){b.textContent=`Sending ${i+1}/${T.length}…`;const n=waNum(r.p.phone);try{await waApiText(n,WA_MSG.update(r.p));ok++;waLog({to:r.p.name,n,k:"Update",via:"api",ok:true})}catch(err){bad++;waLog({to:r.p.name,n,k:"Update",via:"api",ok:false,err:String(err.message||err).slice(0,120)});if(!err.api)break}}
      b.textContent=`✓ ${ok} sent${bad?` · ${bad} failed (see History)`:""}`;toast(ok?ok+" updates sent":"Couldn't send. See History")};
    if(tab==="set"){let mode=waCfg.mode,ml=waCfg.ml;
      q("#wa-m").onclick=e=>{const b=e.target.closest("[data-m]");if(!b)return;mode=b.dataset.m;el.querySelectorAll("#wa-m button").forEach(k=>k.classList.toggle("on",k===b));q("#wa-api").hidden=mode!=="api"};
      q("#wa-ml").onclick=e=>{const b=e.target.closest("[data-l]");if(!b)return;ml=b.dataset.l;el.querySelectorAll("#wa-ml button").forEach(k=>k.classList.toggle("on",k===b))};
      const read=()=>{waCfg={...waCfg,mode,ml,pid:q("#wa-pid").value.replace(/\D/g,""),token:q("#wa-tok").value.trim(),tpl:q("#wa-tpl").value.trim(),tlang:q("#wa-tl").value.trim()||"en",ver:(q("#wa-ver").value.trim()||"v21.0").replace(/^(\d)/,"v$1"),sig:q("#wa-sig").value.trim().slice(0,60),cc:q("#wa-cc").value.replace(/\D/g,"")||"91"};waSaveCfg()};
      q("#wa-save").onclick=()=>{read();if(mode==="api"&&!waApiOn()){toast("Add Phone number ID and token");return}toast("WhatsApp settings saved");sheets.wa("home")};
      q("#wa-test").onclick=async e=>{read();const b=e.currentTarget,s=q("#wa-tst");const n=waNum(q("#wa-tn").value);if(!waApiOn()){s.textContent="Fill Phone number ID and token first.";return}if(!n){s.textContent="Enter a valid number.";return}
        b.disabled=true;b.textContent="Sending…";s.className="note wsst";s.textContent="";
        try{const msg=(pref("biz")||APP_NAME)+" · WhatsApp connected ✅";if(waCfg.tpl)await waApiTpl(n,msg);else await waApiText(n,msg);s.className="note wsst ok";s.textContent="✓ Test sent to "+waShowNum(n)+". Check WhatsApp.";waLog({to:"Test",n,k:"Test",via:"api",ok:true})}
        catch(err){s.className="note wsst bad";s.textContent=waErrText(err)+(err.api&&!waCfg.tpl&&+err.code===131047?"":(err.api?"":""));waLog({to:"Test",n,k:"Test",via:"api",ok:false,err:String(err.message||err).slice(0,120)})}
        b.disabled=false;b.textContent="Send test"}}
  })};
ACT.wa_send={d:a=>`WhatsApp ${a.kind==="stmt"?"statement":"update"} → ${(parties.find(p=>p.id===a.party)||{}).name||"party"}`,run:async a=>{const p=parties.find(x=>x.id===a.party);if(!p)throw new Error("party not found");try{closeAiPop()}catch(e){}setTimeout(()=>sheets.wasend({party:p.id,kind:a.kind==="stmt"?"stmt":"update"}),200)}};

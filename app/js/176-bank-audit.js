// ===== Bank audit: checks every order against your banks, and lets UPI Lite / GPay payments come out of the bank =====
(function(){
const dm=t=>new Date(t).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
const sgn=o=>o.side==="SELL"?1:-1;
// balances of every bank as they would be with the switch on or off, without changing anything
function baBal(direct){const keep=__liteOv;__liteOv=direct;mvCache=null;let r;try{r=balances().bal}finally{__liteOv=keep;mvCache=null}return r}
// what is wrong with one order, if anything
function baIssues(o){
  if(o.status==="Cancelled"||noBank(o))return[];
  const sp=o.splits||[],tot=orderTotal(o),got=allocated(o),out=[];
  if(!sp.length)out.push("nobank");
  else{
    if(sp.some(x=>!x.bank||!allBanks.some(b=>b.id===x.bank)))out.push("badbank");
    if(tot-got>=1)out.push("gap");
    if(got-tot>=1)out.push("over");
  }
  if(sp.some(x=>x.lite))out.push("lite");
  return out;
}
const ISS={nobank:["No bank","bad"],badbank:["Bank missing or deleted","bad"],gap:["Part not assigned","warn"],over:["More than the order","warn"],lite:["UPI Lite","info"]};
function baFix(o,bankId){
  const sp=(o.splits||[]).map(x=>({...x})),tot=+orderTotal(o).toFixed(2);
  if(!sp.length)return[{bank:bankId,amt:tot,method:methodOf(o.pay)}];
  const bad=x=>!x.bank||!allBanks.some(b=>b.id===x.bank);
  sp.forEach(x=>{if(bad(x))x.bank=bankId});
  const gap=+(tot-allocated({splits:sp})).toFixed(2);
  if(gap>=1)sp.push({bank:bankId,amt:gap,method:methodOf(o.pay)});
  return sp;
}
async function baBackup(){try{await saveFile(`Pexai-backup-${new Date().toLocaleDateString("en-CA")}.json`,JSON.stringify({app:"Pexai",version:1,exported:new Date().toISOString(),records:recs},null,1))}catch(e){}}
sheets.bankaudit=function(){
  const rows=orders.filter(o=>baIssues(o).length).sort((a,b)=>(b.time||0)-(a.time||0));
  const cnt=k=>rows.filter(o=>baIssues(o).includes(k)).length;
  const direct=liteDirect(),b0=baBal(false),b1=baBal(true);
  const diff=allBanks.filter(b=>Math.abs((b1[b.id]||0)-(b0[b.id]||0))>=1);
  const BL=banks.filter(b=>b.type!=="Cash");
  const bankBtns=(attr,cur)=>BL.map(b=>`<button type="button" ${attr}="${esc(b.id)}" class="${cur&&cur.includes(b.id)?"on":""}">${esc(b.name||b.bankName||"Bank")}</button>`).join("");
  const need=rows.filter(o=>baIssues(o).some(k=>k==="nobank"||k==="badbank"||k==="gap"));
  openSheet(`<div class="baw"><h3>Bank audit</h3>
   <p class="note" style="margin:0 0 10px">Checks every order against your banks. Nothing changes until you turn the switch on or confirm a bank. A backup is saved first.</p>
   <div class="bacard"><div class="barow"><span><b>UPI Lite and GPay come out of the bank</b><small>Lite payments reduce the bank directly. The separate Lite balance is not counted.</small></span><label class="tog"><input type="checkbox" id="ba-direct" ${direct?"checked":""}><span></span></label></div>
    <div id="ba-prev">${diff.length?`<table class="batab"><tr><th>Bank</th><th>Now</th><th>With this on</th></tr>${diff.map(b=>`<tr><td>${esc(b.name||b.bankName||"Bank")}</td><td>${inr(Math.round(direct?b1[b.id]:b0[b.id]))}</td><td>${inr(Math.round(direct?b0[b.id]:b1[b.id]))}</td></tr>`).join("")}</table><p class="note" style="margin:6px 0 0">${direct?"The right column shows the balance if you turn it off.":"The right column shows the new balance if you turn it on."}</p>`:`<p class="note" style="margin:8px 0 0">No bank balance changes either way.</p>`}</div></div>
   <div class="bacard"><div class="bah"><b>Orders to check</b><em>${rows.length}</em></div>
    <div class="bachips"><span>No bank ${cnt("nobank")}</span><span>Part not assigned ${cnt("gap")}</span><span>Bank missing ${cnt("badbank")}</span><span>UPI Lite ${cnt("lite")}</span></div>
    ${need.length?`<div class="bapick" id="ba-bk">${bankBtns("data-bulk")}</div><button type="button" class="mini babig" id="ba-all" disabled>Choose a bank, then set on ${need.length} order${need.length>1?"s":""}</button><p class="note" id="ba-msg" style="margin:6px 0 0">This fills only what is missing. Orders that already have a bank are not moved.</p>`:`<p class="note" style="margin:8px 0 0">${rows.length?"Every order has a bank. The UPI Lite ones are listed below so you can see them.":"Every order has a bank. Nothing to fix."}</p>`}
    <div class="balist">${rows.slice(0,80).map(o=>{const I=baIssues(o);return`<div class="baor" data-id="${esc(o.id)}"><div><b>${esc(o.side)} ${esc(fmtQ(o.qty))} ${esc(o.coin||"")} · ${inr(Math.round(orderTotal(o)))}</b><small>${dm(o.time)}${o.cp?" · "+esc(o.cp):""}${(o.splits||[]).length?" · "+esc((o.splits||[]).map(x=>bankName(x.bank)).join(", ")):""}</small><div class="baiss">${I.map(k=>`<i class="${ISS[k][1]}">${ISS[k][0]}</i>`).join("")}</div></div><button type="button" class="mini ghost bachg" data-bachg>${I.some(k=>k==="nobank"||k==="badbank"||k==="gap")?"Set bank":"Change bank"}</button></div><div class="bapick bapk1" data-pk hidden>${bankBtns("data-pick",(o.splits||[]).map(x=>x.bank))}</div>`}).join("")}${rows.length>80?`<p class="note">Showing the latest 80 of ${rows.length}.</p>`:""}</div></div></div>`,el=>{
    const q=x=>el.querySelector(x);
    q("#ba-direct").onchange=async e=>{const on=e.target.checked;await baBackup();setPref("liteDirect",on);mvCache=null;accCache=null;try{render()}catch(err){}toast(on?"UPI Lite now comes out of the bank":"UPI Lite is a separate balance again");setTimeout(()=>sheets.bankaudit(),150)};
    const bk={value:""},all=q("#ba-all"),upd=()=>{all.disabled=!bk.value;all.textContent=bk.value?`Set ${bankName(bk.value)} on ${need.length} order${need.length>1?"s":""}`:`Choose a bank, then set on ${need.length} order${need.length>1?"s":""}`};
    el.querySelectorAll("[data-bulk]").forEach(b=>b.onclick=()=>{bk.value=b.dataset.bulk;el.querySelectorAll("[data-bulk]").forEach(x=>x.classList.toggle("on",x===b));delete all.dataset.sure;upd()});
    if(all)all.onclick=async()=>{if(!bk.value)return;if(!all.dataset.sure){all.dataset.sure="1";all.textContent="Tap again to confirm";setTimeout(()=>{if(all.isConnected){delete all.dataset.sure;upd()}},4000);return}
      all.disabled=true;all.textContent="Saving…";await baBackup();let n=0;for(const o of need){try{await patchRec(o.id,{splits:baFix(o,bk.value)});n++}catch(e){}}
      toast(`Updated ${n} order${n===1?"":"s"}`);setTimeout(()=>sheets.bankaudit(),150)};
    el.querySelectorAll("[data-bachg]").forEach(b=>b.onclick=()=>{const w=b.closest("[data-id]").nextElementSibling;if(w&&w.hasAttribute("data-pk"))w.hidden=!w.hidden});
    el.querySelectorAll("[data-pick]").forEach(s=>s.onclick=async()=>{const id=s.closest("[data-pk]").previousElementSibling.dataset.id,o=orders.find(x=>x.id===id);if(!o)return;s.value=s.dataset.pick;const miss=baIssues(o).some(k=>k==="nobank"||k==="badbank"||k==="gap");
      await patchRec(id,{splits:miss?baFix(o,s.value):(o.splits||[]).map(x=>x.lite?{...x,bank:s.value}:x)});toast("Bank set");setTimeout(()=>sheets.bankaudit(),150)});
  })};
})();

// ================= BANK CHARGES (SMS, IMPS fee, card fee, penalty…) — saved as a business-cost expense on that bank
const CHG_TYPES=["SMS alert","IMPS / NEFT fee","UPI fee","Debit card fee","Min balance penalty","Cash deposit / withdrawal","ATM fee","Account maintenance","Cheque / DD","GST on charges","Other"];
const isChg=x=>x&&x.cat==="Bank charges";
function chgMonth(bankId){const n=new Date();return exps.filter(x=>isChg(x)&&(!bankId||x.bank===bankId)&&new Date(x.time).getMonth()===n.getMonth()&&new Date(x.time).getFullYear()===n.getFullYear())}
sheets.bankcharge=function(bankId,id,preAmt){const x=exps.find(e=>e.id===id)||(preAmt>0?{amt:Math.round(preAmt*100)/100}:{});let ty=x.chg||"";
  const bk=x.bank||bankId||((banks.find(b=>b.type!=="Cash"&&b.status!=="paused")||banks[0])||{}).id;
  const recent=bid=>{const L=chgMonth(bid).filter(e=>e.id!==id).sort((a,b)=>b.time-a.time);if(!L.length)return"";
    return`<div class="chgr"><div class="chgrh"><span>This month on this bank</span><b>−${inr(Math.round(L.reduce((t,e)=>t+(+e.amt||0),0)))}</b></div>${L.slice(0,4).map(e=>`<button type="button" class="chgi" data-ce="${e.id}"><span>${esc(e.chg||"Other")}<small>${new Date(e.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}${e.note?" · "+esc(e.note):""}</small></span><b>−${inr(+e.amt||0)}</b></button>`).join("")}</div>`};
  openSheet(`<h3>${id?"Edit bank charge":"Bank charges"}</h3><p class="note" style="margin:-4px 0 10px">Money the bank cut from your account. It lowers this bank's balance and counts as a business cost in profit.</p>
    <form id="sf" style="grid-template-columns:1fr">
    <div class="chgl">Type of charge</div>
    <div class="chgc" id="c-ty">${CHG_TYPES.map(t=>`<button type="button" class="chip" aria-pressed="${t===ty}" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    <label>Amount (₹)<input id="c-amt" type="number" inputmode="decimal" step="any" required value="${x.amt??""}" placeholder="e.g. 17.70"></label>
    <label>Bank<select id="c-bank">${bankOpts(bk,false)}</select></label>
    <label>Note<input id="c-note" value="${esc(x.note||"")}" placeholder="optional, e.g. quarterly SMS"></label>
    <label>Date<input id="c-date" type="date" value="${new Date((x.time||Date.now())-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10)}"></label>
    <button class="primary" type="submit">Save charge</button>${id?'<button class="primary" type="button" id="c-del" style="background:var(--soft);color:var(--sell)">Delete charge</button>':""}</form>
    <div id="c-rec">${recent(bk)}</div>`,el=>{
    const tyBox=el.querySelector("#c-ty"),bs=el.querySelector("#c-bank");
    tyBox.onclick=e=>{const b=e.target.closest("[data-t]");if(!b)return;ty=b.dataset.t;tyBox.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",c===b));if(!el.querySelector("#c-amt").value)el.querySelector("#c-amt").focus()};
    bs.onchange=()=>{el.querySelector("#c-rec").innerHTML=recent(bs.value)};
    el.querySelector("#c-rec").onclick=e=>{const b=e.target.closest("[data-ce]");if(b)sheets.bankcharge(null,b.dataset.ce)};
    el.querySelector("#sf").onsubmit=async e=>{e.preventDefault();const amt=+el.querySelector("#c-amt").value;
      if(!ty){toast("Choose the type of charge");tyBox.classList.add("shake");setTimeout(()=>tyBox.classList.remove("shake"),400);return}
      if(!(amt>0)){toast("Enter an amount");return}if(!bs.value){toast("Choose a bank");return}
      const d=el.querySelector("#c-date").value;const t=d?new Date(d+"T"+new Date(x.time||Date.now()).toTimeString().slice(0,8)).getTime():Date.now();
      try{await putRec({id:id||newId("x_"),kind:"expense",amt,cat:"Bank charges",chg:ty,biz:true,bank:bs.value,note:el.querySelector("#c-note").value.trim().slice(0,100),time:t});toast("Charge saved · "+bankName(bs.value)+" −"+inr(amt));closeSheet()}catch(err){toast("Couldn't save")}};
    if(id)twoTap(el.querySelector("#c-del"),async()=>{try{await delRec(id);toast("Charge deleted");closeSheet()}catch(err){toast("Couldn't delete")}});
  })};
// editing a bank charge from anywhere opens this sheet, not the personal-expense form
(function(){const _exp=sheets.expense;sheets.expense=function(id){const x=exps.find(e=>e.id===id);if(isChg(x))return sheets.bankcharge(x.bank,id);return _exp.apply(this,arguments)}})();
// tap a charge line in a bank's ledger to edit it
document.addEventListener("click",e=>{const r=e.target.closest("#sheetBody [data-chg]");if(r)sheets.bankcharge(null,r.dataset.chg)});

// ---------- order edit / repeat ----------
let editingId=null;
function lastRate(coin,sd){const o=orders.filter(x=>x.coin===coin&&x.side===sd&&x.status!=="Cancelled").sort((a,b)=>b.time-a.time)[0];return o?o.rate:null}
function cpSpecial(){if(!feat("counterparties"))return 0;const n=$("#f-cp").value.trim(),x=n&&cpx(n);return x&&+x.rate>0?+x.rate:0}
function rateHintUpd(){const r=lastRate($("#f-coin").value,side);$("#rateHint").textContent=r?`last ${side==="BUY"?"buy":"sell"} ₹${r}`:"";if(!editingId&&!$("#f-rate").value){const v=cpSpecial()||r;if(v){$("#f-rate").value=v;$("#f-rate").dataset.auto="1";upd()}}}
function fillForm(o,edit){
  editingId=edit?o.id:null;
  $("#t-add").click();
  const mb=document.querySelector(`#modeSeg [data-m="${o.via==="ex"?"Pair":modeOf(o)}"]`);if(o.via==="ex"){const pm=document.querySelector(`#pb-mode [data-pm="${modeOf(o)}"]`);if(pm)pm.click()}if(mb)mb.click();
  const sb=document.querySelector(`#sideSeg [data-v="${o.side}"]`);if(sb)sb.click();
  if(o.via==="ex"&&edit){pbManual=true;$("#pb-rate").value=o.exRate||""}
  dirUpd();if(edit&&o.party){$("#dir-party").value=o.party;$("#dir-due").checked=!!o.dueLink;dirUpd();if(o.payAcc!=null){$("#dir-acc").dataset.u="1";$("#dir-acc").value=o.payAcc;dirUpd()}}
  $("#f-coin").value=o.coin;$("#f-status").value=edit?o.status:pref("status");$("#f-qty").value=o.qty;$("#f-rate").value=edit?o.rate:(lastRate(o.coin,o.side)||o.rate);
  if(o.pay)$("#f-pay").value=o.pay;if(o.platform)$("#f-plat").value=o.platform;
  $("#f-cp").value=o.cp||"";$("#f-note").value=edit?(o.note||""):"";
  $("#f-exid").value=edit?exIdOf(o):"";$("#f-utr").value=edit?(o.utr||""):"";$("#f-fee").value=edit?(o.fee||""):"";$("#f-tds").value=edit?(o.tds||""):"";$("#f-pv").value=edit?pvOf(o):"";$("#pdet").open=!!(edit&&(exIdOf(o)||o.utr||o.fee||o.tds||o.pv));dupHint();
  formSplit.set(edit?o.splits:[]);upd();cpCheck();pairUpd();
  $("#formTitle").textContent=edit?"Edit order":"Repeat order";$("#formTitle").classList.toggle("editing",edit);$("#editCancel").hidden=!edit;$("#saveBtn").textContent=edit?"Update order":"Save order";
  if(!edit)toast("Copied. Change the quantity if needed and save");
}
function endEdit(clear){editingId=null;if(clear)formProof=null;try{$("#dir-acc").dataset.u=""}catch(e){}$("#formTitle").textContent="New order";$("#formTitle").classList.remove("editing");$("#editCancel").hidden=true;$("#saveBtn").textContent="Save order";
  if(clear){["#f-qty","#f-cp","#f-note","#f-rate","#f-exid","#f-utr","#f-fee","#f-tds"].forEach(s=>$(s).value="");$("#f-pv").value="";$("#pdet").open=false;$("#dupWarn").hidden=true;formSplit.reset();upd();applyFormDefaults();rateHintUpd();cpCheck()}}
$("#editCancel").onclick=()=>{endEdit(true);$("#t-orders").click()};
function dupHint(){const el=$("#dupWarn");if(!el)return;const D=dupFlags({id:editingId||"__new",exId:$("#f-exid").value.trim(),utr:$("#f-utr").value.trim(),status:"Pending"});
  if(!D.length){el.hidden=true;return}el.hidden=false;el.textContent=D.map(d=>d.k==="utr"?`⚠️ This UTR was already used in ${shortO(d.o)}.`:`⚠️ This order ID is already saved: ${shortO(d.o)}.`).join(" ")}
["#f-exid","#f-utr"].forEach(q=>$(q).addEventListener("input",dupHint));
$("#f-tds1").onclick=()=>{const q=+$("#f-qty").value,r=+$("#f-rate").value;if(!(q>0&&r>0)){toast("Enter quantity and rate first");return}$("#f-tds").value=+(q*r*0.01).toFixed(2)};
$("#f-coin").addEventListener("change",()=>{$("#f-rate").value="";rateHintUpd()});
$("#sideSeg").addEventListener("click",()=>setTimeout(()=>{if(!editingId){$("#f-rate").value="";rateHintUpd()}},0));
$("#t-add").addEventListener("click",()=>setTimeout(()=>{if(!editingId&&!$("#f-qty").value)rateHintUpd()},0));


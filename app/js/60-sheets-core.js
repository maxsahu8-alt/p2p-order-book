function openSheet(html,onReady){$("#sheetBody").innerHTML=html;$("#sheetBg").hidden=false;document.body.style.overflow="hidden";onReady&&onReady($("#sheetBody"))}
function closeSheet(){$("#sheetBg").hidden=true;$("#sheetBody").innerHTML="";document.body.style.overflow=""}
$("#sheetBg").addEventListener("click",e=>{if(e.target.id==="sheetBg"||e.target.closest("[data-close]"))closeSheet()});
// swipe a sheet down to close it
(function(){const bg=$("#sheetBg"),sh=bg.querySelector(".sheet"),bd=$("#sheetBody");let y0=0,t0=0,dy=0,on=false,go=false;
 const soft=()=>{sh.style.transition="";sh.style.transform=""};const reset=()=>{soft();sh.style.animation=""};
 new MutationObserver(()=>{if(bg.hidden)reset()}).observe(bg,{attributes:true,attributeFilter:["hidden"]});
 sh.addEventListener("touchstart",e=>{if(e.touches.length!==1){on=false;return}const t=e.target;if(t.closest&&t.closest("input,textarea,select,[contenteditable],canvas,.chart"))return on=false;on=true;go=false;dy=0;y0=e.touches[0].clientY;t0=Date.now()},{passive:true});
 sh.addEventListener("touchmove",e=>{if(!on)return;const d=e.touches[0].clientY-y0;if(!go){if(d>14&&bd.scrollTop<=0){go=true;y0=e.touches[0].clientY-d;sh.style.animation="none";sh.style.transition="none"}else if(d<-8||bd.scrollTop>0){on=false;return}else return}
  dy=Math.max(0,e.touches[0].clientY-y0);sh.style.transform=`translateY(${dy}px)`;if(e.cancelable)e.preventDefault()},{passive:false});
 const end=()=>{if(!on||!go){on=false;return}on=false;go=false;const v=dy/Math.max(1,Date.now()-t0);
  if(dy>sh.offsetHeight*.38||(v>1.3&&dy>90)){sh.style.transition="transform .22s ease-out";sh.style.transform="translateY(105%)";setTimeout(()=>{closeSheet();reset()},200)}
  else{sh.style.transition="transform .25s cubic-bezier(.2,.8,.2,1)";sh.style.transform="";setTimeout(soft,260)}};
 sh.addEventListener("touchend",end);sh.addEventListener("touchcancel",end)})();
const bankOpts=(sel,withNone)=>(withNone?'<option value="">Not from a bank</option>':"")+banks.map(b=>`<option value="${b.id}" ${b.id===sel?"selected":""}>${esc(b.name)}</option>`).join("");
const twoTap=(btn,fn)=>{btn.onclick=()=>{if(btn.dataset.c!=="1"){btn.dataset.c="1";const t=btn.textContent;btn.textContent="Tap again to confirm";setTimeout(()=>{btn.dataset.c="";btn.textContent=t},3000);return}fn()}};
const sheets={
  coinledger(c){c=c||"USDT";const L=coinLedger(c);const f=t=>new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
    const tax=L.rows.filter(r=>r.label==="Tax").reduce((a,r)=>a+r.q,0);
    const row=r=>`<div class="lrow" style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><div><b>${r.label}</b>${r.est?' <span class="mtag">from order</span>':""}<div class="note" style="margin:2px 0 0">${f(r.t)}${r.o&&r.label!=="Tax"?" · ₹"+(+r.o.rate||0).toFixed(2):""}</div></div><div style="text-align:right"><b class="${r.q<0?"neg":"pos"}">${r.q>0?"+":"−"}${fmtQ(+Math.abs(r.q).toFixed(6))}</b><div class="note" style="margin:2px 0 0">Balance ${fmtQ(+r.bal.toFixed(4))}</div></div></div>`;
    openSheet(`<h3>${esc(c)} wallet history</h3><div class="pvk" style="grid-template-columns:1fr 1fr;margin:8px 0"><div><span>${esc(c)} left</span><b>${fmtQ(+L.bal.toFixed(4))}</b></div><div><span>Tax (TDS) cut</span><b class="neg">${tax?"−"+fmtQ(+Math.abs(tax).toFixed(4)):"0"}</b></div></div>
      ${L.rows.length?L.rows.slice().reverse().map(row).join(""):'<p class="note">No completed orders yet.</p>'}
      ${L.open?`<div class="lrow" style="display:flex;justify-content:space-between;padding:10px 0"><div><b>Opening stock</b></div><b class="pos">+${fmtQ(+L.open.toFixed(4))}</b></div>`:""}
      <p class="note">Like the exchange wallet: each completed SELL takes out the coins sold and, on its own line, the TDS the exchange cut after the order. Tax taken from the order page is an estimate until wallet history confirms it.</p>`)},
  bank(id){const b=banks.find(x=>x.id===id)||{};openSheet(`<h3>${id?"Edit bank":"Add bank"}</h3><form id="sf" style="grid-template-columns:1fr">
    <label>Name<input id="s-name" required placeholder="e.g. SBI 4521" value="${esc(b.name||"")}"></label>
    <label>Type<select id="s-type"><option ${b.type!=="Cash"?"selected":""}>Bank</option><option ${b.type==="Cash"?"selected":""}>Cash</option></select></label>
    <label>Status<select id="s-status" onchange="document.getElementById('s-fatw').hidden=this.value!=='frozen'"><option value="" ${!b.status?"selected":""}>Active</option><option value="paused" ${b.status==="paused"?"selected":""}>Paused (not using now)</option><option value="frozen" ${b.status==="frozen"?"selected":""}>Frozen / blocked</option></select></label>
    <label>Opening balance (₹)<input id="s-open" type="number" inputmode="decimal" step="any" value="${b.opening??""}" placeholder="Balance before tracking started"></label>
    <div class="flabel" style="margin:4px 0 -4px">Daily sending limits</div>
    <div class="limgrid">
      <label>UPI limit (₹)<input id="s-lupi" type="number" inputmode="decimal" step="any" value="${(b.limits||{}).UPI||""}" placeholder="e.g. 100000"></label>
      <label>IMPS limit (₹)<input id="s-limps" type="number" inputmode="decimal" step="any" value="${(b.limits||{}).IMPS||""}" placeholder="e.g. 500000"></label>
      <label>NEFT limit (₹)<input id="s-lneft" type="number" inputmode="decimal" step="any" value="${(b.limits||{}).NEFT||""}" placeholder="e.g. 1000000"></label>
      <label>Total bank limit (₹)<input id="s-lall" type="number" inputmode="decimal" step="any" value="${(b.limits||{}).ALL||""}" placeholder="All methods / day"></label>
    </div>
    <div class="flabel" data-feat="lite" style="margin:4px 0 -4px">UPI Lite</div>
    <div class="limgrid" data-feat="lite">
      <label>UPI Lite<select id="s-lite"><option value="" ${!(b.lite&&b.lite.on)?"selected":""}>Not used</option><option value="1" ${b.lite&&b.lite.on?"selected":""}>Active on this bank</option></select></label>
      <label>Lite is in app<select id="s-liteapp">${["",...LITE_APPS].map(a=>`<option value="${a}" ${((b.lite&&b.lite.app)||"")===a?"selected":""}>${a||"Not sure"}</option>`).join("")}</select></label>
      <label>Lite balance now (₹)<input id="s-litebal" type="number" inputmode="decimal" step="any" min="0" value="${(b.lite&&b.lite.bal)||""}" placeholder="Max 5,000"></label>
    </div>
    ${id&&b.lite&&b.lite.on?`<button type="button" class="mini" data-sheet="lite:${id}">Load / withdraw UPI Lite</button>`:""}<div class="limgrid" data-feat="lite">
      <label>Auto top-up<select id="s-lauto"><option value="" ${!(b.lite&&b.lite.auto&&b.lite.auto.on)?"selected":""}>Off</option><option value="1" ${b.lite&&b.lite.auto&&b.lite.auto.on?"selected":""}>On in bank app</option></select></label>
      <label>When Lite is below (₹)<input id="s-lbelow" type="number" inputmode="decimal" step="any" min="0" value="${(b.lite&&b.lite.auto&&b.lite.auto.below)||""}" placeholder="e.g. 200"></label>
      <label>Add each time (₹)<input id="s-lamt" type="number" inputmode="decimal" step="any" min="0" value="${(b.lite&&b.lite.auto&&b.lite.auto.amt)||""}" placeholder="e.g. 1000"></label>
    </div>
    <p class="note" data-feat="lite" style="margin:-6px 0 0">UPI Lite is a small wallet inside your bank app: up to ₹5,000 balance, ₹1,000 per payment, no PIN. To move money from the bank into Lite, use Load, Withdraw or Spent. Load takes money out of the bank, Withdraw puts it back in the same bank, Spent lowers the Lite balance only. Lite is counted in your net worth.</p>
    <label>Daily receive comfort limit (₹)<input id="s-rcap" type="number" inputmode="decimal" step="any" value="${b.rcvCap||""}" placeholder="Most you like to receive here in 24 hours (optional)"></label>
    <label id="s-fatw" ${b.status==="frozen"?"":"hidden"}>When did it freeze? (optional)<input id="s-fat" type="datetime-local" value="${b.frozenAt?new Date(b.frozenAt-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16):""}"></label>
    <p class="note" style="margin:-6px 0 0">When you mark a bank frozen, the app remembers how busy it was just before and warns you earlier next time. Leave limits empty for no limit. UPI is counted over the last 24 hours: each payment frees up 24 hours after it was sent. IMPS, NEFT and Total reset at midnight.</p>
    <div class="flabel" style="margin:4px 0 -4px">Account details (for sharing)</div>
    <label>Account holder name<input id="s-holder" value="${esc(b.holder||"")}" placeholder="Name as in bank" autocomplete="off"></label>
    <label>Bank name<input id="s-bname" value="${esc(b.bankName||"")}" placeholder="e.g. State Bank of India" autocomplete="off"></label>
    <label>Account number<input id="s-acc" inputmode="numeric" value="${esc(b.accNo||"")}" placeholder="Account number" autocomplete="off"></label>
    <label>IFSC code<input id="s-ifsc" value="${esc(b.ifsc||"")}" placeholder="e.g. SBIN0001234" autocomplete="off" style="text-transform:uppercase"></label>
    <label>Account type<select id="s-atype">${["Savings","Current","Other"].map(t=>`<option ${t===(b.accType||"Savings")?"selected":""}>${t}</option>`).join("")}</select></label>
    <label>Branch<input id="s-branch" value="${esc(b.branch||"")}" placeholder="Branch name / city" autocomplete="off"></label>
    <label>UPI ID<input id="s-upi" value="${esc(b.upi||"")}" placeholder="name@bank (several: separate with a comma)" autocomplete="off" autocapitalize="off"><small class="note" style="display:block;margin:2px 0 0">A payment you receive on this UPI ID is matched to this bank. A hidden ID like ••7529@ptsbi works too.</small></label>
    <label>Registered phone<input id="s-phone" inputmode="tel" value="${esc(b.phone||"")}" placeholder="Optional" autocomplete="off"></label>
    <label>Note<input id="s-note" value="${esc(b.note||"")}" placeholder="e.g. daily limit 1 lakh"></label>
    <button class="primary" type="submit">Save</button>${id?'<button class="primary" type="button" id="s-del" style="background:var(--soft);color:var(--sell)">Delete bank</button>':""}</form>`,el=>{
    el.querySelector("#sf").onsubmit=async e=>{e.preventDefault();const name=$("#s-name").value.trim();if(!name){toast("Enter a name");return}
      const fz={};try{if($("#s-status").value==="frozen"&&b.id){const fv=$("#s-fat").value,at=fv?new Date(fv).getTime():(b.status==="frozen"&&b.frozenAt?b.frozenAt:Date.now());if(b.status!=="frozen"||fv){fz.frozenAt=at;fz.frozenPts=bankInsight({...b,status:""},movements(),0,{},at).pts}}}catch(e){}
      try{await putRec({...b,...fz,rcvCap:+$("#s-rcap").value||0,lite:($("#s-lite").value==="1"?{on:true,app:$("#s-liteapp").value,auto:{on:$("#s-lauto").value==="1",below:+$("#s-lbelow").value||0,amt:+$("#s-lamt").value||0},bal:Math.min(5e3,Math.max(0,+$("#s-litebal").value||0)),t:Date.now()}:null),id:id||newId("b_"),kind:"bank",name:name.slice(0,40),type:$("#s-type").value,status:$("#s-status").value,opening:+$("#s-open").value||0,note:$("#s-note").value.trim().slice(0,100),holder:$("#s-holder").value.trim().slice(0,80),bankName:$("#s-bname").value.trim().slice(0,80),accNo:$("#s-acc").value.replace(/\s+/g,"").slice(0,30),ifsc:$("#s-ifsc").value.trim().toUpperCase().slice(0,15),accType:$("#s-atype").value,branch:$("#s-branch").value.trim().slice(0,80),upi:$("#s-upi").value.trim().slice(0,80),phone:$("#s-phone").value.trim().slice(0,20),limits:{UPI:+$("#s-lupi").value||0,IMPS:+$("#s-limps").value||0,NEFT:+$("#s-lneft").value||0,ALL:+$("#s-lall").value||0},time:b.time||Date.now()});try{const sv=banks.find(x=>x.id===(id||""))||null;const lt=($("#s-lite").value==="1")?{on:true,bal:Math.min(5e3,Math.max(0,+$("#s-litebal").value||0)),auto:{on:$("#s-lauto").value==="1",below:+$("#s-lbelow").value||0,amt:+$("#s-lamt").value||0}}:null;if(sv&&lt&&lt.auto.on){const at=await liteAutoTop({id:sv.id,name:sv.name,lite:{...sv.lite,...lt}},Math.max(0,(balances().bal[sv.id])||0),lt.bal);if(at!==lt.bal)toast("Bank saved · Lite topped up by auto top-up")}}catch(e){}
      toast("Bank saved");closeSheet()}catch(err){toast("Couldn't save. Try again.")}};
    if(id)twoTap(el.querySelector("#s-del"),async()=>{try{const A=ACC();const v=A.bal[id]||0;if(Math.abs(v)>=1){toast(`Balance is ${inr(Math.round(v))}. Move it out first, then delete.`);return}
      const used=movements().some(x=>x.bank===id);const bk=allBanks.find(b=>b.id===id);
      if(used&&bk){await putRec({...bk,archived:true,archivedAt:Date.now()});toast("Bank removed · its history is kept")}else{await delRec(id);toast("Bank deleted")}closeSheet()}catch(err){toast("Couldn't delete")}});
  })},
  transfer(){if(banks.length<2){toast("Add at least two banks first");return}
    openSheet(`<h3>Transfer between banks</h3><form id="sf" style="grid-template-columns:1fr">
    <label>From<select id="s-from">${bankOpts(banks[0].id)}</select></label><label>To<select id="s-to">${bankOpts(banks[1].id)}</select></label>
    <label>Amount (₹)<input id="s-amt" type="number" inputmode="decimal" step="any" required></label>
    <label>Sent by<select id="s-meth"><option>IMPS</option><option>UPI</option><option>NEFT</option><option>Cash</option></select></label><label>Bank charges (₹, optional)<input id="s-cost" type="number" inputmode="decimal" step="any" placeholder="0"></label><label>Note<input id="s-note" placeholder="Optional"></label>
    <button class="primary" type="submit">Save transfer</button></form>`,el=>{el.querySelector("#sf").onsubmit=async e=>{e.preventDefault();const amt=+$("#s-amt").value;
      if(!(amt>0)){toast("Enter an amount");return}if($("#s-from").value===$("#s-to").value){toast("Choose two different banks");return}
      try{await putRec({id:newId("m_"),kind:"move",from:$("#s-from").value,to:$("#s-to").value,amt,method:$("#s-meth").value,cost:Math.max(0,+$("#s-cost").value||0),note:$("#s-note").value.trim(),time:Date.now()});toast("Transfer saved");closeSheet()}catch(err){toast("Couldn't save")}}})},
  expense(id){const x=exps.find(e=>e.id===id)||{};const cash=banks.find(b=>b.type==="Cash");
    openSheet(`<h3>${id?"Edit expense":"Personal expense"}</h3><form id="sf" style="grid-template-columns:1fr">
    <label>Amount (₹)<input id="s-amt" type="number" inputmode="decimal" step="any" required value="${x.amt??""}"></label>
    <label>Category<select id="s-cat">${CATS.map(c=>`<option ${c===x.cat?"selected":""}>${c}</option>`).join("")}</select></label>
    <label>Type<select id="s-biz"><option value="" ${!x.biz?"selected":""}>Personal</option><option value="1" ${x.biz?"selected":""}>Business cost (reduces profit)</option></select></label>
    <label>Paid from<select id="s-bank">${bankOpts(x.bank??(cash?cash.id:(banks[0]||{}).id),true)}</select></label>
    <label>Note<input id="s-note" value="${esc(x.note||"")}" placeholder="e.g. dinner, petrol"></label>
    <label>Date<input id="s-date" type="date" value="${new Date((x.time||Date.now())-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10)}"></label>
    <button class="primary" type="submit">Save expense</button>${id?'<button class="primary" type="button" id="s-del" style="background:var(--soft);color:var(--sell)">Delete expense</button>':""}</form>`,el=>{
    el.querySelector("#sf").onsubmit=async e=>{e.preventDefault();const amt=+$("#s-amt").value;if(!(amt>0)){toast("Enter an amount");return}
      const d=$("#s-date").value;const t=d?new Date(d+"T"+new Date(x.time||Date.now()).toTimeString().slice(0,8)).getTime():Date.now();
      try{await putRec({id:id||newId("x_"),kind:"expense",amt,cat:$("#s-cat").value,biz:$("#s-biz").value==="1",bank:$("#s-bank").value,note:$("#s-note").value.trim().slice(0,100),time:t});toast("Expense saved");closeSheet()}catch(err){toast("Couldn't save")}};
    if(id)twoTap(el.querySelector("#s-del"),async()=>{try{await delRec(id);toast("Expense deleted");closeSheet()}catch(err){toast("Couldn't delete")}});
  })},
  which(){openSheet(`<h3>Which bank should I use?</h3><form id="sf" style="grid-template-columns:1fr 1fr">
    <label class="full">Amount (₹)<input id="s-amt" type="number" inputmode="decimal" step="any" required></label>
    <div class="seg full" id="s-dir"><button type="button" class="on" data-d="pay">I have to pay</button><button type="button" data-d="receive">I will receive</button></div>
    <div class="seg full" id="s-meth" style="grid-template-columns:repeat(4,1fr)"><button type="button" class="on" data-m="UPI">UPI</button><button type="button" data-m="IMPS">IMPS</button><button type="button" data-m="NEFT">NEFT</button><button type="button" data-m="">Any</button></div>
    <button class="primary" type="submit">Show options</button></form><div id="s-plans" class="chat" style="margin-top:14px"></div>`,el=>{
    let dir="pay",meth="UPI";el.querySelector("#s-meth").onclick=e=>{const b=e.target.closest("button");if(!b)return;meth=b.dataset.m;el.querySelectorAll("#s-meth button").forEach(x=>x.classList.toggle("on",x===b))};
    el.querySelector("#s-dir").onclick=e=>{const b=e.target.closest("button");if(!b)return;dir=b.dataset.d;el.querySelectorAll("#s-dir button").forEach(x=>x.classList.toggle("on",x===b))};
    el.querySelector("#sf").onsubmit=e=>{e.preventDefault();const amt=+$("#s-amt").value;if(!(amt>0)){toast("Enter an amount");return}
      const ps=plans(amt,dir,false,meth);
      const lt=(dir==="pay"&&amt<=1000&&(meth==="UPI"||meth===""))?liteBanks().filter(b=>(+b.lite.bal||0)>=amt):[];
      const ltTip=lt.length?`<div class="plan"><b>Pay with UPI Lite</b><span class="note">Up to ₹1,000, no PIN, and it does not use the bank's UPI daily limit.</span>${lt.map(b=>`<div class="pl"><span>${esc(b.name)}${b.lite.app?" · "+esc(b.lite.app):""}</span><span>Lite ${inr(b.lite.bal||0)}</span></div>`).join("")}</div>`:"";
      $("#s-plans").innerHTML=ltTip+ps.length?ps.map(p=>`<div class="plan"><b>${p.title}</b><span class="note">${p.why}</span>${p.parts.map(x=>`<div class="pl"><span>${esc(x.name)}</span><span>${inr(x.amt)}</span></div>`).join("")}${p.left>0.5?`<div class="pl" style="color:var(--sell)"><span>Short by</span><span>${inr(p.left)}</span></div>`:""}</div>`).join(""):'<p class="note">Add your banks with their balances first.</p>'}})},
  stock(){const st=settings.stock||{};const coins=[...new Set(["USDT","BTC","ETH","USDC",...Object.keys(st),...orders.map(o=>o.coin)])];
    openSheet(`<h3>Opening crypto stock</h3><p class="note" style="margin:-6px 0 12px">How much you held before you started tracking orders here.</p><form id="sf">${coins.map(c=>`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>${esc(c)}<input data-c="${esc(c)}" type="number" inputmode="decimal" step="any" value="${st[c]??""}" placeholder="0"></label><label>Avg cost ₹<input data-k="${esc(c)}" type="number" inputmode="decimal" step="any" value="${(settings.stockCost||{})[c]??""}" placeholder="auto"></label></div>`).join("")}<p class="note" style="margin:-4px 0 12px">Avg cost is what you paid per coin for that opening stock. Leave empty to use your average buy rate.</p><button class="primary" type="submit">Save</button></form>`,el=>{
    el.querySelector("#sf").onsubmit=async e=>{e.preventDefault();const stock={};el.querySelectorAll("[data-c]").forEach(i=>{if(+i.value)stock[i.dataset.c]=+i.value});const stockCost={};el.querySelectorAll("[data-k]").forEach(i=>{if(+i.value>0)stockCost[i.dataset.k]=+i.value});
      try{await putRec({...settings,id:"s_main",kind:"setting",stock,stockCost});toast("Stock saved");closeSheet()}catch(err){toast("Couldn't save")}}})},
  assign(id){const o=orders.find(x=>x.id===id);if(!o)return;
    openSheet(`<h3>Assign banks</h3><p class="note" style="margin:-6px 0 12px">${o.side} ${fmtQ(o.qty)} ${esc(o.coin)} @ ₹${fmtR(o.rate)} = <b>${inr(orderTotal(o))}</b> · ${o.side==="BUY"?"paid from":"received in"}</p>
    <div class="splitwrap"><div id="a-rows"></div><div class="splitbar"><button type="button" class="link" id="a-add">+ Add bank</button><button type="button" class="link" id="a-sug">Suggest banks</button></div><p class="note" id="a-rem"></p></div>
    <button class="primary" type="button" id="a-save" style="width:100%;margin-top:12px">Save</button>`,el=>{
    const ed=makeSplit(el.querySelector("#a-rows"),el.querySelector("#a-rem"),()=>orderTotal(o),()=>o.side==="BUY"?"pay":"receive",()=>methodOf(o.pay));ed.set(o.splits);
    el.querySelector("#a-add").onclick=()=>ed.add();el.querySelector("#a-sug").onclick=()=>ed.suggest(modeOf(o)==="Cash");
    el.querySelector("#a-save").onclick=async()=>{const g=ed.get();if(g.sum>orderTotal(o)+0.5){toast("Bank amounts are more than the order total");return}
      try{await patchRec(id,{splits:g.splits});toast("Banks assigned");closeSheet()}catch(err){toast("Couldn't save")}}})},
  bankmgr(){const L=banks.slice();const hidN=L.filter(b=>b.hidden).length;
    openSheet(`<h3>Manage banks</h3><p class="note" style="margin:-6px 0 8px">📌 pins a bank to the top (it is also first in every bank picker). ▲ ▼ change the order. Hide removes a bank from the list only; its money still counts in your totals.</p>
    <div>${L.map((b,i)=>`<div class="bmg" data-id="${b.id}">${bankBadge(b)}<div style="min-width:0"><b style="font-size:.92rem">${esc(b.name)}</b>${b.hidden?' <span class="cpb idle">Hidden</span>':""}<div class="note" style="margin:0">${b.accNo?"A/c ••"+esc(String(b.accNo).slice(-4)):""}${b.upi?" · "+esc(b.upi):""}</div></div><div class="mb"><button type="button" data-a="pin" class="${b.pinned?"on":""}" aria-label="Pin">📌</button><button type="button" data-a="up" ${i===0?"disabled":""} aria-label="Move up">▲</button><button type="button" data-a="dn" ${i===L.length-1?"disabled":""} aria-label="Move down">▼</button><button type="button" data-a="hide" class="${b.hidden?"on":""}" aria-label="Hide">${b.hidden?"Show":"Hide"}</button></div></div>`).join("")}</div>`,el=>{
      el.onclick=async e=>{const bt=e.target.closest("button[data-a]");if(!bt)return;const row=bt.closest(".bmg"),id=row.dataset.id,a=bt.dataset.a,i=L.findIndex(x=>x.id===id);if(i<0)return;
        try{
          if(a==="pin")await patchRec(id,{pinned:!L[i].pinned});
          else if(a==="hide")await patchRec(id,{hidden:!L[i].hidden});
          else{const j=a==="up"?i-1:i+1;if(j<0||j>=L.length)return;const o=L.slice();[o[i],o[j]]=[o[j],o[i]];
            // moving across the pinned line would not show; a moved bank takes the pinned state of the one it swapped with
            const pj=!!L[j].pinned;for(let k=0;k<o.length;k++){const patch={};if(o[k].pos!==k*10)patch.pos=k*10;if(o[k].id===L[i].id&&!!o[k].pinned!==pj)patch.pinned=pj;if(Object.keys(patch).length)await patchRec(o[k].id,patch)}}
          sheets.bankmgr()}catch(err){toast("Couldn't save")}}})},
  lite(id,mode0){const b=banks.find(x=>x.id===id);if(!b||!(b.lite&&b.lite.on)){toast("Turn on UPI Lite for this bank first");return}
    let mode=mode0||"in";const {bal}=balances();
    openSheet(`<h3>UPI Lite · ${esc(b.name)}</h3><div class="calc" style="margin-bottom:10px"><span>Lite balance</span><b class="num" id="l-bal"></b></div>
    <div class="litebox" id="l-auto" style="margin:0 0 10px"><span><b>Auto top-up</b><small id="l-aus"></small></span><button type="button" class="mini" id="l-aut"></button></div>
    <div class="limgrid" id="l-aud" style="margin:-4px 0 10px" hidden><label>When Lite is below (₹)<input id="l-ab" type="number" inputmode="decimal" step="any" min="0" placeholder="e.g. 200"></label><label>Add each time (₹)<input id="l-aa" type="number" inputmode="decimal" step="any" min="0" placeholder="e.g. 1000"></label></div>
    <div class="seg" id="l-mode" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px"><button type="button" data-m="in">Load</button><button type="button" data-m="out">Withdraw</button><button type="button" data-m="spend">Spent</button></div>
    <p class="note" id="l-note" style="margin:0 0 10px"></p>
    <form id="sf" style="grid-template-columns:1fr"><label>Amount (₹)<input id="s-amt" type="number" inputmode="decimal" step="any" required placeholder="e.g. 1000"></label>
    <div class="chips" id="s-q"></div><button class="primary" type="submit" id="l-go">Save</button></form>
    <div class="pcsec" style="margin-top:16px">Lite history</div><div id="l-hist"></div>`,el=>{
      const au0=()=>b.lite.auto||{on:false,below:0,amt:0};
      const drawAu=()=>{const a=au0();el.querySelector("#l-aut").textContent=a.on?"Turn off":"Turn on";el.querySelector("#l-aut").className="mini"+(a.on?" ghost":"");
        el.querySelector("#l-aus").textContent=a.on?(+a.below>0&&+a.amt>0?`ON · below ${inr(a.below)} it adds ${inr(a.amt)} from the bank`:"ON · set the two amounts below"):"OFF · Lite is not topped up by itself";
        el.querySelector("#l-aud").hidden=!a.on;el.querySelector("#l-ab").value=a.below||"";el.querySelector("#l-aa").value=a.amt||""};
      const saveAu=async(patch)=>{try{const lite={...b.lite,auto:{...au0(),...patch}};await patchRec(id,{lite});b.lite=lite;drawAu()}catch(e){toast("Couldn't save")}};
      el.querySelector("#l-aut").onclick=async()=>{const on=!au0().on;await saveAu({on});toast(on?"Auto top-up ON":"Auto top-up OFF")};
      el.querySelector("#l-ab").onchange=e=>saveAu({below:Math.max(0,+e.target.value||0)});el.querySelector("#l-aa").onchange=e=>saveAu({amt:Math.max(0,+e.target.value||0)});
      drawAu();
      const hist=()=>{const L=recs.filter(r=>r.kind==="litemove"&&r.bank===id).sort((x,y)=>y.time-x.time).slice(0,15);el.querySelector("#l-hist").innerHTML=L.length?L.map(r=>{const d=r.dir==="out"?"Withdrawn to bank":r.dir==="spend"?"Spent":(r.note==="auto top-up"?"Auto top-up":"Loaded");const neg=r.dir==="spend"||r.dir==="out";return`<div class="dqr"><span>${d}<small>${new Date(r.time).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}${r.note&&r.note!=="auto top-up"?" · "+esc(r.note):""}</small></span><b class="${neg?"neg":"pos"}">${neg?"−":"+"}${inr(r.amt)}</b></div>`}).join(""):'<p class="note">No Lite activity yet.</p>'};hist();
      const cur=()=>+b.lite.bal||0,room=()=>Math.max(0,5e3-cur());
      const draw=()=>{const c=cur(),r=room();el.querySelector("#l-bal").textContent=inr(c);
        el.querySelectorAll("#l-mode button").forEach(x=>x.classList.toggle("on",x.dataset.m===mode));
        const bb=Math.max(0,Math.floor(bal[id]||0)),max=mode==="in"?Math.min(r,bb):mode==="out"?c:Math.min(c,1000);
        el.querySelector("#l-note").innerHTML=mode==="in"?`Money goes from <b>${esc(b.name)}</b> (${inr(bal[id]||0)}) into Lite. Room for <b>${inr(r)}</b> more (Lite holds max ₹5,000).${bb<=0?` <b style="color:var(--sell)">Low balance: this bank has no money to load.</b>`:bb<r?` <b style="color:var(--sell)">Low balance: you can load only ${inr(bb)} now.</b>`:""}`:mode==="out"?`Money goes back to <b>${esc(b.name)}</b>, the same bank you loaded it from. You can take out up to <b>${inr(c)}</b>.`:`Used Lite to pay someone. Lite balance goes down; the bank is not touched. One Lite payment is up to ₹1,000.`;
        el.querySelector("#l-go").textContent=mode==="in"?"Load to Lite":mode==="out"?"Withdraw to bank":"Save payment";
        el.querySelector("#s-q").innerHTML=[100,500,1000,2000,max].filter((v,i,a)=>v>0&&v<=max&&a.indexOf(v)===i).map(v=>`<button type="button" class="chip" data-v="${v}">${v===max&&mode!=="spend"?(mode==="in"?"Fill to max · ":"All · "):""}${inr(v)}</button>`).join("")};
      draw();
      el.querySelector("#l-mode").onclick=e=>{const x=e.target.closest("[data-m]");if(!x)return;mode=x.dataset.m;draw()};
      el.querySelector("#s-q").onclick=e=>{const c=e.target.closest("[data-v]");if(c)el.querySelector("#s-amt").value=c.dataset.v};
      el.querySelector("#sf").onsubmit=async e=>{e.preventDefault();const amt=+$("#s-amt").value;if(!(amt>0)){toast("Enter an amount");return}
        const c=cur();
        if(mode==="in"&&amt>(bal[id]||0)+0.5){toast(`Low balance: ${b.name} has only ${inr(Math.round(Math.max(0,bal[id]||0)))}`);return}
        if(mode==="in"&&amt>room()+0.5){toast(room()>0?`UPI Lite can take only ${inr(room())} more`:"UPI Lite is already full (₹5,000)");return}
        if(mode!=="in"&&amt>c+0.5){toast(`Lite has only ${inr(c)}`);return}
        if(mode==="spend"&&amt>1000){toast("One UPI Lite payment is up to ₹1,000");return}
        try{await liteApply(b,mode,amt);
          toast(mode==="in"?"Loaded "+inr(amt)+" to UPI Lite":mode==="out"?inr(amt)+" back in "+b.name:"Lite payment saved");closeSheet()}catch(err){toast("Couldn't save")}}})},
  ledger(id,all){const b=banks.find(x=>x.id===id);if(!b)return;const {bal,mv}=balances();const full=mv.filter(x=>x.bank===id).sort((a,c)=>c.time-a.time),list=all?full:full.slice(0,60);const S=bankStats(b,mv,bal[id]);const lc=S.checks[0];
    const dt=t=>new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
    openSheet(`<h3>${esc(b.name)} <span class="cpb ${S.tone==="bad"?"":"idle"}" style="${S.tone==="bad"?"background:var(--sell);color:#fff":""}">${esc(S.status)}</span></h3><div class="calc" style="margin-bottom:12px"><span>Balance now</span><b class="num">${inr(bal[id])}</b></div>
    <div class="kpis" style="margin-bottom:10px"><div class="kpi"><span class="kl">In today</span><b class="pos">${inr(S.inn)}</b></div><div class="kpi"><span class="kl">Out today</span><b class="neg">${inr(S.out)}</b></div></div>
    <div class="bstats"><div><span>Today's volume</span><b>${inr(S.volume)}</b></div><div><span>Txns today / total</span><b>${S.todayN} / ${S.total}</b></div><div><span>Pending</span><b>${S.pendN?S.pendN+" · "+inr(S.pendIn+S.pendOut):"None"}</b></div><div><span>Last txn</span><b>${S.last?dt(S.last):"—"}</b></div></div>
    ${(()=>{if(b.type==="Cash")return"";const I=bankInsight(b,mv,bal[id]||0,limitUse());return `<div class="binf" style="margin:2px 0 8px">${bankSpark(I.line)}${bankChips(b,I)}</div><p class="note" style="margin:0 0 8px">Freeze risk (estimate): <b>${I.level}</b> · ${I.ppl} people and ${inr(Math.round(I.flow))} received in the last 24 hours${I.why.length?" — "+esc(I.why.join("; ")):""}. The line shows the balance of the last 7 days.</p>`})()}${b.lite&&b.lite.on?`<div class="litebox"><span><b>UPI Lite</b><small>${inr(b.lite.bal||0)} of ₹5,000 · room ${inr(Math.max(0,5e3-(b.lite.bal||0)))} · Auto top-up ${b.lite.auto&&b.lite.auto.on?"ON":"OFF"}</small></span><button type="button" class="mini" data-sheet="lite:${b.id}">Load · Withdraw</button></div>`:""}<p class="note" style="margin:6px 0 10px">${lc?`Last check ${dt(lc.time)}: real ${inr(lc.real)} · ${Math.abs(lc.diff)<1?"matched ✓":"difference "+(lc.diff>0?"+":"−")+inr(Math.abs(lc.diff))}`:"Not checked against the real bank balance yet."}</p>
    ${limBar(b,limitUse()).replace('class="lims"','class="lims" style="margin-bottom:12px"')}
    <div class="ledger">${list.length?list.map(x=>`<div class="lg"${x.kind==="CHG"?` data-chg="${x.id}" style="cursor:pointer"`:""}><span>${esc(x.label)}${x.pend?' <span class="mtag">Pending</span>':""}</span><span class="a ${x.amt>=0?"in":"out"}">${x.amt>=0?"+":"−"}${inr(Math.abs(x.amt))}</span><div class="o-meta">${dt(x.time)}</div></div>`).join("")+(!all&&full.length>60?`<button type="button" class="link" id="l-all" style="padding:10px;width:100%">Show all ${full.length} ›</button>`:""):'<p class="note">No transactions yet. Opening balance '+inr(b.opening||0)+'.</p>'}</div>
    <div class="row2" style="margin-top:14px"><button class="mini" type="button" id="l-rec">Check balance</button><button class="mini ghost" type="button" id="l-stmt">Match statement</button><button class="mini ghost" type="button" id="l-share">Share details</button><button class="mini ghost" type="button" id="l-edit">Edit / limits</button><button class="mini ghost" type="button" id="l-chg">Bank charge</button></div>`,el=>{el.querySelector("#l-edit").onclick=()=>sheets.bank(id);el.querySelector("#l-chg").onclick=()=>sheets.bankcharge(id);el.querySelector("#l-share").onclick=()=>sheets.share(id);el.querySelector("#l-stmt").onclick=()=>sheets.stmt(id);el.querySelector("#l-rec").onclick=()=>sheets.bankrec(id);const la=el.querySelector("#l-all");if(la)la.onclick=()=>sheets.ledger(id,true)})},
  bankrec(id){const b=banks.find(x=>x.id===id);if(!b)return;const {bal}=balances();const app=bal[id]||0;const S=bankStats(b,null,app);
    openSheet(`<h3>Check ${esc(b.name)}</h3><p class="note" style="margin:-6px 0 12px">Type the balance your real bank app shows right now. The app compares it with its own number.</p>
    <div class="calc" style="margin-bottom:10px"><span>App balance</span><b class="num">${inr(app)}</b></div>
    <label>Real bank balance (₹)<input id="br-real" type="number" inputmode="decimal" step="any" placeholder="From your bank app"></label>
    <div class="calc" id="br-diff" style="margin:10px 0"><span>Difference</span><b class="num">—</b></div>
    <p class="note" id="br-hint" style="margin:0 0 10px">Pending orders are already counted in the app balance${S.pendN?" ("+S.pendN+" pending now)":""}. If the bank has not received a payment yet, the difference can be that.</p>
    <label>Note (optional)<input id="br-note" placeholder="e.g. checked after night orders"></label>
    <div class="row2" style="margin-top:12px"><button class="primary" type="button" id="br-save">Save check</button><button class="mini ghost" type="button" id="br-fix" hidden>Save &amp; fix balance</button></div><button class="mini ghost" type="button" id="br-chg" hidden style="width:100%;margin-top:8px">Bank cut this? Save as bank charge</button>
    ${S.checks.length?`<div class="flabel" style="margin:16px 0 4px">Earlier checks</div><div class="ledger">${S.checks.slice(0,8).map(c=>`<div class="lg"><span>Real ${inr(c.real)} · app ${inr(c.app)}</span><span class="a ${Math.abs(c.diff)<1?"in":"out"}">${Math.abs(c.diff)<1?"matched":(c.diff>0?"+":"−")+inr(Math.abs(c.diff))}</span><div class="o-meta">${new Date(c.time).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}${c.fixed?" · balance fixed":""}${c.note?" · "+esc(c.note):""}</div></div>`).join("")}</div>`:""}`,el=>{
      const real=()=>{const v=el.querySelector("#br-real").value;return v===""?null:+v};
      el.querySelector("#br-real").oninput=()=>{const r=real();const d=r==null?null:Math.round((r-app)*100)/100;el.querySelector("#br-diff").innerHTML=r==null?"<span>Difference</span><b class=\"num\">—</b>":`<span>Difference</span><b class="num ${Math.abs(d)<1?"pos":"neg"}">${Math.abs(d)<1?"Matched ✓":(d>0?"+":"−")+inr(Math.abs(d))}</b>`;el.querySelector("#br-fix").hidden=r==null||Math.abs(d)<1;const bc=el.querySelector("#br-chg");bc.hidden=r==null||!(d<=-1);if(!bc.hidden)bc.textContent=`Bank cut ${inr(Math.abs(d))}? Save as bank charge`};el.querySelector("#br-chg").onclick=()=>{const r=real();if(r!=null&&r<app)sheets.bankcharge(id,null,app-r)};
      const save=async fix=>{const r=real();if(r==null){toast("Enter the real balance");return}const diff=Math.round((r-app)*100)/100;
        try{
          if(fix&&Math.abs(diff)>=1){if(!confirm(`Change the opening balance of ${b.name} by ${diff>0?"+":"−"}₹${Math.abs(diff).toLocaleString("en-IN")} so the app matches your bank?`))return;await putRec({...allBanks.find(x=>x.id===id),opening:(+b.opening||0)+diff});auditLog(id,"bank_fix",{diff,real:r,app})}
          await putRec({id:newId("br_"),kind:"bankrec",bank:id,real:r,app,diff,fixed:!!(fix&&Math.abs(diff)>=1),note:el.querySelector("#br-note").value.trim().slice(0,100),time:Date.now()});
          toast(Math.abs(diff)<1?"Matched ✓":fix?"Balance fixed":"Check saved");sheets.ledger(id)}catch(e){toast("Couldn't save")}};
      el.querySelector("#br-save").onclick=()=>save(false);el.querySelector("#br-fix").onclick=()=>save(true)})},
  share(id){const b=banks.find(x=>x.id===id);if(!b)return;
    const F=[["holder","Account holder"],["bankName","Bank"],["accNo","Account no."],["ifsc","IFSC"],["accType","Account type"],["branch","Branch"],["upi","UPI ID"],["phone","Phone"]].filter(([k])=>b[k]);
    if(!F.length){toast("Add account details first");sheets.bank(id);return}
    let amt="";
    const text=()=>{const on=[...document.querySelectorAll("#sh-f input:checked")].map(i=>i.value);const lines=F.filter(([k])=>on.includes(k)).map(([k,l])=>`${l}: ${b[k]}`);
      if(amt)lines.unshift(`Please pay ₹${Number(amt).toLocaleString("en-IN")}`,"");return lines.join("\n")};
    openSheet(`<h3>Share ${esc(b.name)}</h3><p class="note" style="margin:-6px 0 12px">Choose what to send. Only share with people you trust.</p>
    <div id="sh-f" class="shf">${F.map(([k,l])=>`<label class="chk"><input type="checkbox" value="${k}" ${k==="phone"?"":"checked"}><span>${l}</span><b>${esc(b[k])}</b></label>`).join("")}</div>
    <label style="margin-top:12px">Amount to ask (optional)<input id="sh-amt" type="number" inputmode="decimal" step="any" placeholder="₹"></label>
    <pre class="shprev" id="sh-prev"></pre>
    <div class="row2"><button class="primary" type="button" id="sh-copy">Copy</button><a class="primary wa" id="sh-wa" href="#" target="_blank" rel="noopener">WhatsApp</a></div>`,el=>{
      const upd=()=>{const t=text();$("#sh-prev").textContent=t;$("#sh-wa").href="https://wa.me/?text="+encodeURIComponent(t)};
      el.querySelector("#sh-f").onchange=upd;el.querySelector("#sh-amt").oninput=e=>{amt=e.target.value;upd()};upd();
      el.querySelector("#sh-copy").onclick=async()=>{const t=text();try{await navigator.clipboard.writeText(t);toast("Copied. Paste it in any chat")}catch(e){const r=document.createRange();r.selectNodeContents($("#sh-prev"));const sel=getSelection();sel.removeAllRanges();sel.addRange(r);toast("Text selected. Long-press to copy")}};
    })}
};
document.addEventListener("click",e=>{const im=e.target.closest("[data-proof]");if(im){e.stopPropagation();const gBack=im.closest("#gl-grid")?proofBack:null;
  openSheet(`<h3>Payment proof</h3>${proofImg(im.dataset.proof,"full")}<div class="row2" style="margin-top:14px"><button class="mini ghost" type="button" id="pf-back">Back</button><button class="mini ghost" type="button" id="pf-dl">Download</button></div>`,el=>{el.querySelector("#pf-back").onclick=()=>{if(gBack){gBack();return}const v=lastParty;lastParty=null;v?sheets.partyView(v):closeSheet()};const dl=el.querySelector("#pf-dl");dl.onclick=async()=>{try{const b=await (await fetch("/_blob/"+encodeURIComponent(im.dataset.proof))).blob();await saveFile("proof-"+new Date().toLocaleDateString("en-CA")+"."+((b.type.split("/")[1]||"jpg").replace("jpeg","jpg")),b)}catch(err){toast("Couldn't download")}}});return}},true);

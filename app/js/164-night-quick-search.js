// ---------- night checklist ----------
function nightNow(){if(!pref("night"))return false;const [h,m]=String(pref("nightAt")||"23:00").split(":").map(Number);const n=new Date();const mins=n.getHours()*60+n.getMinutes(),st=h*60+(m||0);return mins>=st||mins<6*60}
const nightKey=()=>{const n=new Date();if(n.getHours()<6)n.setDate(n.getDate()-1);return "p2p_night_"+n.toLocaleDateString("en-CA")};
function renderNight(){const el=$("#nightCard");if(!el)return;if(!nightNow()){el.hidden=true;return}
  let done={};try{done=JSON.parse(devGet(nightKey(),"{}"))}catch(e){}
  const pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal");
  const items=[["ads","Ads switched off on every exchange"],["pend","No pending order left open"+(pend.length?` (${pend.length} pending now)`:"")],["pay","All payments released / confirmed"],["phone","Phone on charge, sound on for urgent calls"]];
  const all=items.every(([k])=>done[k]);
  el.hidden=false;el.innerHTML=`<b>🌙 Night check ${all?"· all done ✓":""}</b>${pend.length?`<span class="warnline">⚠ ${pend.length} order${pend.length>1?"s":""} still pending or in appeal</span>`:""}${items.map(([k,t])=>`<label><input type="checkbox" data-nk="${k}" ${done[k]?"checked":""}>${esc(t)}</label>`).join("")}`;
  el.querySelectorAll("[data-nk]").forEach(c=>c.onchange=()=>{done[c.dataset.nk]=c.checked;devSet(nightKey(),JSON.stringify(done));renderNight()})}
$("#st-night").addEventListener("change",e=>setPref("night",e.target.checked));
$("#st-nightat").addEventListener("change",e=>setPref("nightAt",e.target.value||"23:00"));
document.addEventListener("click",e=>{if(e.target.closest('[data-go="settings"]'))setTimeout(()=>{$("#st-night").checked=!!pref("night");$("#st-nightat").value=pref("nightAt");$("#st-bkdays").value=String(pref("bkDays"));bkLabel();pinState()},0)});
setInterval(()=>{try{renderNight()}catch(e){}},60000);

// ---------- + button: quick actions ----------
const QA_HTML=`<div class="qwrap"><div class="qhead"><h3>Add</h3><button type="button" class="qx" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="qheroes"><button type="button" class="qh t-green" data-q="q-order"><span class="qhi"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2"/><path d="M7.8 10.2h8.4l-2.5-2.5M16.2 13.8H7.8l2.5 2.5"/></svg></span><span class="qht"><b>New order</b><small>Buy or sell crypto</small><em class="qhv" data-v="q-order"></em></span></button><button type="button" class="qh t-blue" data-q="q-intake"><span class="qhi"><svg viewBox="0 0 24 24"><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16"/><path d="M12 8.2l1.15 2.65 2.65 1.15-2.65 1.15L12 15.8l-1.15-2.65L8.2 12l2.65-1.15z"/></svg></span><span class="qht"><b>Smart intake</b><small>Save from screenshots</small><em class="qhv" data-v="q-intake"></em></span></button></div><div class="qrep" id="qrep"></div><div class="qsec">Payments</div><div class="qlist"><button type="button" class="qr" data-q="q-pay"><span class="qri t-violet"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M17 8h5M19.5 5.5 22 8l-2.5 2.5"/></svg></span><span class="qrt"><b>Pay a party</b><small>Record a direct payment</small></span><span class="qrv" data-v="q-pay"></span><span class="qrc"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button><button type="button" class="qr" data-q="q-due"><span class="qri t-amber"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="8.5"/></svg></span><span class="qrt"><b>Amount to pay</b><small>Add what you owe a party</small></span><span class="qrv" data-v="q-due"></span><span class="qrc"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button><button type="button" class="qr" data-q="q-tr"><span class="qri t-blue"><svg viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg></span><span class="qrt"><b>Transfer</b><small>Between my banks</small></span><span class="qrv" data-v="q-tr"></span><span class="qrc"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button></div><div class="qsec">More</div><div class="qlist"><button type="button" class="qr" data-q="q-exp"><span class="qri t-red"><svg viewBox="0 0 24 24"><path d="M6 3h12M6 8h12M14 21 6 12h3a4 4 0 0 0 0-8"/></svg></span><span class="qrt"><b>Expense</b><small>Personal spending</small></span><span class="qrv" data-v="q-exp"></span><span class="qrc"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button><button type="button" class="qr" data-q="q-bank"><span class="qri t-gray"><svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg></span><span class="qrt"><b>Add bank</b><small>New bank or cash account</small></span><span class="qrv" data-v="q-bank"></span><span class="qrc"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button><button type="button" class="qr" data-q="q-ai"><span class="qri t-green"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg></span><span class="qrt"><b>Tell AI</b><small>Type what happened, AI records it</small></span><span class="qrv" data-v="q-ai"></span><span class="qrc"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button><button type="button" class="qr" data-q="q-file"><span class="qri t-gray"><svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 17v-6M9 14l3 3 3-3"/></svg></span><span class="qrt"><b>Import file</b><small>Excel, CSV or PDF order history</small></span><span class="qrv" data-v="q-file"></span><span class="qrc"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button></div></div>`;
function pickParty(then){if(!parties.length){toast("Add a party first");sheets.party();return}if(parties.length===1){then(parties[0].id);return}
  openSheet(`<h3>Choose party</h3><div class="list">${parties.map(p=>{const bl=partyOwed(p.id)-partyPaid(p.id);return `<button type="button" class="party" data-pp="${p.id}"><span class="bico">${esc(p.name.slice(0,2).toUpperCase())}</span><span class="pname">${esc(p.name)}</span><span class="pleft">${bl>0.5?inr(bl)+" left":""}</span></button>`}).join("")}</div>`,el=>el.querySelectorAll("[data-pp]").forEach(b=>b.onclick=()=>then(b.dataset.pp)))}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".tabs button");if(!b)return;b.classList.remove("tp");void b.offsetWidth;b.classList.add("tp");clearTimeout(b._tp);b._tp=setTimeout(()=>b.classList.remove("tp"),700)},true);
function goPage(t){document.querySelectorAll(".tabs button").forEach(x=>x.setAttribute("aria-selected",x.dataset.tab===t));["home","orders","add","coins","wallet","direct","ai","ideas","settings","intake"].forEach(n=>$("#p-"+n).hidden=n!==t);window.scrollTo({top:0});setTimeout(updateChrome,0)}
function quickFill(el){
  const set=(k,t,cls)=>{const n=el.querySelector(`[data-v="${k}"]`);if(n){n.textContent=t||"";n.className=n.className.split(" ")[0]+(cls?" "+cls:"")}};
  const last=[...orders].sort((a,b)=>b.time-a.time)[0];
  set("q-order",last?`Last · ${last.side} ${fmtQ(last.qty)} @ ₹${fmtR(last.rate)}`:"No orders yet");
  const jobs=recs.filter(r=>r.kind==="intakejob"&&(r.status==="new"||r.status==="working")).length;
  set("q-intake",jobs?`${jobs} batch${jobs>1?"es":""} reading now`:"Up to 10 at once");
  const due=parties.reduce((t,p)=>t+Math.max(0,partyOwed(p.id)-partyPaid(p.id)),0);
  set("q-pay",due>0.5?inr(Math.round(due))+" due":"",due>0.5?"warn":"");
  set("q-due",parties.length?parties.length+(parties.length===1?" party":" parties"):"");
  const {bal}=balances();set("q-tr",banks.length?inr(Math.round(banks.reduce((t,b)=>t+bal[b.id],0))):"");
  const n=new Date();const me=exps.filter(x=>{const d=new Date(x.time);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).reduce((t,x)=>t+(+x.amt||0),0);
  set("q-exp",me?inr(Math.round(me))+" this month":"");
  set("q-bank",banks.length?banks.length+" added":"Start here","");
  set("q-ai",aiCfg.prov==="builtin"&&!sampleFn?"App assistant":"","");
  const seen=new Set(),rep=[];[...orders].sort((a,b)=>b.time-a.time).forEach(o=>{const k=o.side+o.coin+(o.cp||"")+modeOf(o);if(seen.has(k)||rep.length>=4)return;seen.add(k);rep.push(o)});
  const box=el.querySelector("#qrep");
  box.innerHTML=rep.length?`<div class="qsec">Quick repeat</div><div class="qchips">${rep.map(o=>`<button type="button" class="qchip" data-rep="${o.id}"><span class="dot ${o.side}"></span><b>${o.side} ${fmtQ(o.qty)} ${esc(o.coin)}</b><small>@ ₹${fmtR(o.rate)}${o.cp?" · "+esc(o.cp):""}</small></button>`).join("")}</div>`:"";
}
function openQuick(){openSheet(QA_HTML,el=>{quickFill(el);el.querySelectorAll(".qh,.qr,.qchip").forEach((b,i)=>b.style.setProperty("--d",(i*28)+"ms"));
  el.querySelector("#qrep").onclick=e=>{const b=e.target.closest("[data-rep]");if(!b)return;const o=orders.find(x=>x.id===b.dataset.rep);closeSheet();if(o)fillForm(o,false)};el.querySelector(".qwrap").onclick=e=>{const b=e.target.closest("[data-q]");if(!b)return;const q=b.dataset.q;closeSheet();
  if(q==="q-order"){goPage("add");if(typeof endEdit==="function"&&editingId)endEdit(true);setTimeout(()=>$("#f-qty").focus(),150)}
  else if(q==="q-intake"){goPage("intake");setTimeout(()=>{try{$("#i2-file").click()}catch(e){}},150)}
  else if(q==="q-pay")pickParty(id=>sheets.pay(id));
  else if(q==="q-due")pickParty(id=>sheets.due(id));
  else if(q==="q-exp")sheets.expense();
  else if(q==="q-tr")sheets.transfer();
  else if(q==="q-bank")sheets.bank();
  else if(q==="q-ai"){goPage("ai");setTimeout(()=>$("#askIn").focus(),150)}
  else if(q==="q-file"){goPage("add");setTimeout(()=>$("#imp").scrollIntoView({behavior:"smooth",block:"start"}),80)}}})}
{const tAdd=$("#t-add");const orig=tAdd.onclick;tAdd.onclick=function(e){if(e&&e.isTrusted){openQuick();return}return orig.call(this,e)}}

$("#dashP").onclick=e=>{const b=e.target.closest("[data-p]");if(!b)return;dashP=b.dataset.p;try{localStorage.setItem("p2p_dashP",dashP)}catch(err){}renderDash();try{renderCharts()}catch(err){}};
$("#wSeg").onclick=e=>{const b=e.target.closest("[data-p]");if(!b)return;wP=b.dataset.p;try{localStorage.setItem("p2p_wP",wP)}catch(err){}renderWallet()};
// ---------- universal search ----------
const US_PAGES=[["Home","home","dashboard net worth"],["Orders","orders","list history"],["New order","add","buy sell create"],["Wallet","wallet","bank balance money cash flow"],["Direct payments","direct","party parties weekly"],["Coins","coins","coin performance spread usdt"],["AI Agent","ai","chat ask assistant"],["Smart intake","intake","screenshot photo upload read"],["Settings","settings","pin lock theme backup language"],["Ideas","ideas","feature request"]];
const US_ACTS=[["Feedback","feedback","feedback problem bug idea feature update version"],["WhatsApp","wa","whatsapp message send update receipt statement api"],["Report","report","daily monthly summary whatsapp"],["Verify screenshots","verify","payment order screenshot check compare fraud utr"],["Risk checks","risk","duplicate utr screenshot mismatch unusual size fraud"],["Profit analytics","profit","net profit fees spread munafa kharcha per usdt"],["Counterparties","cps","block trusted star fraud"],["Add bank","bank","new account"],["Transfer","transfer","move money"],["Expense","expense","spend kharcha"],["Which bank?","which","suggest pay limit"]];
function usParse(q){
  const f={text:[],chips:[]};let t=" "+q.toLowerCase().replace(/₹|rs\.?|inr/g," ").replace(/,/g,"")+" ";
  const take=(re,fn)=>{t=t.replace(re,(...m)=>{fn(...m);return " "})};
  take(/\s(buy|bought|kharida)\s/g,()=>{f.side="BUY";f.chips.push("Buy")});
  take(/\s(sell|sold|becha)\s/g,()=>{f.side="SELL";f.chips.push("Sell")});
  take(/\s(completed?|done)\s/g,()=>{f.status="Completed";f.chips.push("Completed")});
  take(/\s(pending|open)\s/g,()=>{f.status="Pending";f.chips.push("Pending")});
  take(/\s(appeal|dispute)\s/g,()=>{f.status="Appeal";f.chips.push("Appeal")});
  take(/\s(cancel+ed|cancel|cancelled)\s/g,()=>{f.status="Cancelled";f.chips.push("Cancelled")});
  take(/\s(p2p|direct|cash)\s/g,(m,w)=>{f.mode=w==="p2p"?"P2P":w[0].toUpperCase()+w.slice(1);f.chips.push(f.mode)});
  take(/\s(today|aaj)\s/g,()=>{f.period="today";f.chips.push("Today")});
  take(/\s(yesterday|kal)\s/g,()=>{f.period="yesterday";f.chips.push("Yesterday")});
  take(/\s(this week|week|hafte)\s/g,()=>{f.period="week";f.chips.push("This week")});
  take(/\s(this month|month|mahina|mahine)\s/g,()=>{f.period="month";f.chips.push("This month")});
  take(/\s(upi|imps|neft|paytm)\s/g,(m,w)=>{f.pay=w.toUpperCase();f.chips.push(f.pay)});
  take(/\s(>=?|above|over|more than)\s*(\d+(?:\.\d+)?)(k)?\s/g,(m,o,n,k)=>{f.min=+n*(k?1000:1);f.chips.push("> "+n+(k||""))});
  take(/\s(<=?|below|under|less than)\s*(\d+(?:\.\d+)?)(k)?\s/g,(m,o,n,k)=>{f.max=+n*(k?1000:1);f.chips.push("< "+n+(k||""))});
  take(/\s(\d+(?:\.\d+)?)(k)?\s*-\s*(\d+(?:\.\d+)?)(k)?\s/g,(m,a,k1,b,k2)=>{f.min=+a*(k1?1000:1);f.max=+b*(k2?1000:1);f.chips.push(a+(k1||"")+"–"+b+(k2||""))});
  const coins=[...new Set(orders.map(o=>o.coin.toLowerCase()))];
  take(new RegExp("\\s("+(coins.join("|")||"usdt")+")\\s","g"),(m,c)=>{f.coin=c.toUpperCase();f.chips.push(f.coin)});
  take(/\s(\d{1,7}(?:\.\d+)?)(k|l|lakh)?\s/g,(m,n,u)=>{f.num=+n*(u==="k"?1e3:u?1e5:1);f.chips.push("≈ "+n+(u||""))});
  f.text=t.split(/\s+/).filter(w=>w.length>0);
  return f;
}
function usRange(p){const n=new Date(),d0=new Date(n);d0.setHours(0,0,0,0);if(p==="today")return[d0.getTime(),Infinity];if(p==="yesterday")return[d0.getTime()-DAY,d0.getTime()];if(p==="week")return[weekStart(),Infinity];if(p==="month")return[new Date(n.getFullYear(),n.getMonth(),1).getTime(),Infinity];return[0,Infinity]}
const usHas=(hay,words)=>{const h=hay.toLowerCase();return words.every(w=>h.includes(w))};
const near=(v,n)=>n!=null&&Math.abs(v-n)<=Math.max(1,n*0.01);
const hl=(t,words)=>{let x=esc(t);words.filter(w=>w.length>1).forEach(w=>{x=x.replace(new RegExp("("+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig"),"<mark>$1</mark>")});return x};
function usSearch(q){
  const f=usParse(q),[ra,rb]=usRange(f.period),W=f.text;const res={pages:[],orders:[],parties:[],banks:[],pays:[],exps:[],cps:[],notes:[]};
  const inT=t=>t>=ra&&t<rb;const amtOK=v=>(f.min==null||v>=f.min)&&(f.max==null||v<=f.max);
  if(W.length&&!f.chips.length){US_PAGES.forEach(([n,k,kw])=>{if(usHas(n+" "+kw,W))res.pages.push({n,go:k})});US_ACTS.forEach(([n,k,kw])=>{if(usHas(n+" "+kw,W))res.pages.push({n,sheet:k})})}
  res.orders=orders.filter(o=>{if(f.side&&o.side!==f.side)return false;if(f.status&&o.status!==f.status)return false;if(f.mode&&modeOf(o)!==f.mode)return false;if(f.coin&&o.coin!==f.coin)return false;if(!inT(o.time))return false;
    if(f.pay&&!String(o.pay||"").toUpperCase().includes(f.pay)&&!(o.splits||[]).some(x=>x.method===f.pay))return false;const tot=orderTotal(o);
    if((f.min!=null||f.max!=null)&&!amtOK(tot)&&!amtOK(+o.qty))return false;
    if(f.num!=null&&!(near(tot,f.num)||near(+o.qty,f.num)||near(+o.rate,f.num)||(o.splits||[]).some(x=>near(+x.amt,f.num))||String(o.note||"").includes(String(f.num))))return false;
    if(W.length&&!usHas([o.cp,o.note,o.platform,o.pay,o.coin,exIdOf(o),o.utr,(o.splits||[]).map(x=>bankName(x.bank)).join(" ")].join(" "),W))return false;return true}).sort((a,b)=>b.time-a.time);
  const onlyOrderFilters=f.side||f.status||f.mode||f.coin;
  if(!onlyOrderFilters){
    res.parties=parties.filter(p=>W.length&&usHas([p.name,p.phone,p.note,...(p.accounts||[]).flatMap(a=>[a.holder,a.bankName,a.accNo,a.upi,a.ifsc])].join(" "),W));
    res.banks=banks.filter(b=>(W.length||f.num!=null)&&(!W.length||usHas([b.name,b.bankName,b.holder,b.accNo,b.upi,b.ifsc,b.branch,b.note].join(" "),W))&&(f.num==null||String(b.accNo||"").includes(String(f.num))));
    res.pays=ppays.filter(x=>{const p=parties.find(k=>k.id===x.party)||{};if(!inT(x.time)||!amtOK(+x.amt))return false;if(f.num!=null&&!near(+x.amt,f.num))return false;return !W.length||usHas([p.name,x.note,x.paidBy,(x.splits||[]).map(s=>bankName(s.bank)).join(" ")].join(" "),W)}).sort((a,b)=>b.time-a.time);
    res.exps=exps.filter(x=>{if(!inT(x.time)||!amtOK(+x.amt))return false;if(f.num!=null&&!near(+x.amt,f.num))return false;return !W.length||usHas([x.cat,x.note,x.bank?bankName(x.bank):""].join(" "),W)}).sort((a,b)=>b.time-a.time);
    res.notes=W.length?notes.filter(n=>usHas(n.text,W)):[];
    if(W.length){const st=cpStats();res.cps=Object.values(st).filter(x=>usHas(x.name,W)).slice(0,6)}
    if(f.period||f.min!=null||f.max!=null||f.num!=null){if(!W.length){res.parties=[];res.banks=f.num!=null?res.banks:[]}}
  }
  return{f,res};
}
let usT=null,usLast=null,usAll=false;
function usRecent(){try{return JSON.parse(localStorage.getItem("p2p_us_recent")||"[]")}catch(e){return[]}}
function usSaveRecent(q){q=q.trim();if(!q)return;const r=[q,...usRecent().filter(x=>x!==q)].slice(0,8);try{localStorage.setItem("p2p_us_recent",JSON.stringify(r))}catch(e){}}
function usRender(){
  const q=$("#usIn").value.trim();const body=$("#usBody");
  if(!q){$("#usChips").innerHTML="";const rec=usRecent();
    const tips=["today","sell >50000","pending","raju","upi this week","9800","cancelled yesterday","direct month"];
    body.innerHTML=(rec.length?`<div class="us-h">Recent</div><div class="us-tags">${rec.map(x=>`<button type="button" data-us="${esc(x)}">${esc(x)}</button>`).join("")}</div>`:"")+
      `<div class="us-h">Try</div><div class="us-tags">${tips.map(x=>`<button type="button" data-us="${esc(x)}">${esc(x)}</button>`).join("")}</div>
      <div class="us-h">Go to</div><div class="list">${[...US_PAGES.slice(0,6).map(([n,k])=>`<button type="button" class="us-r" data-go="${k}" data-usgo><span class="us-i">↗</span><span><b>${n}</b></span></button>`),...US_ACTS.slice(0,2).map(([n,k])=>`<button type="button" class="us-r" data-sheet="${k}" data-usgo><span class="us-i">↗</span><span><b>${n}</b></span></button>`)].join("")}</div>`;return}
  const {f,res}=usSearch(q);usLast=res;const W=f.text;
  $("#usChips").innerHTML=f.chips.length?`<span class="us-cl">Understood:</span>`+f.chips.map(c=>`<span class="us-c">${esc(c)}</span>`).join("")+(W.length?`<span class="us-c t">“${esc(W.join(" "))}”</span>`:""):"";
  const total=Object.values(res).reduce((t,a)=>t+a.length,0);
  const sec=(title,arr,fn,n=8)=>{if(usAll)n=200;return arr.length?`<div class="us-h">${title} <span>${arr.length}</span></div><div class="list">${arr.slice(0,n).map(fn).join("")}${arr.length>n?`<button type="button" class="us-more" data-more="${title}">Show all ${arr.length}</button>`:""}</div>`:""};
  const tm=t=>new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  let ordSum="";if(res.orders.length>1){const st=stats(res.orders);const v=res.orders.filter(o=>o.status==="Completed").reduce((t,o)=>t+orderTotal(o),0);ordSum=`<div class="us-sum"><span><b>${res.orders.length}</b> orders</span><span>Volume <b>${inr(Math.round(v))}</b></span>${st.b.q?`<span>Buy <b>${fmtQ(+st.b.q.toFixed(2))}</b> @ ₹${st.b.avg.toFixed(2)}</span>`:""}${st.s.q?`<span>Sell <b>${fmtQ(+st.s.q.toFixed(2))}</b> @ ₹${st.s.avg.toFixed(2)}</span>`:""}${st.profit?`<span>Profit <b>${inr(Math.round(st.profit))}</b></span>`:""}</div>`}
  body.innerHTML=(total?"":`<div class="empty"><strong>Nothing found</strong>Try a name, an amount, or words like buy, sell, today, pending.</div>`)+
    sec("Pages & actions",res.pages,x=>`<button type="button" class="us-r" ${x.go?`data-go="${x.go}"`:`data-sheet="${x.sheet}"`} data-usgo><span class="us-i">↗</span><span><b>${x.n}</b></span></button>`)+
    (res.orders.length?ordSum:"")+
    sec("Orders",res.orders,o=>`<button type="button" class="us-r" data-uso="${o.id}"><span class="us-i ${o.side}">${o.side==="BUY"?"B":"S"}</span><span><b>${o.side} ${fmtQ(o.qty)} ${esc(o.coin)} @ ₹${fmtR(o.rate)}</b><small>${tm(o.time)} · ${esc(o.status)} · ${modeOf(o)}${o.cp?" · "+hl(o.cp,W):""}${o.note?" · "+hl(o.note,W):""}</small></span><span class="us-v">${inr(Math.round(orderTotal(o)))}</span></button>`,12)+
    sec("Parties",res.parties,p=>{const bl=partyOwed(p.id)-partyPaid(p.id);return `<button type="button" class="us-r" data-sheet="partyView:${p.id}" data-usgo><span class="us-i">P</span><span><b>${hl(p.name,W)}</b><small>${(p.accounts||[]).map(a=>hl([a.bankName,a.upi].filter(Boolean).join(" "),W)).join(" · ")||"No accounts"}</small></span><span class="us-v">${bl>0.5?inr(Math.round(bl))+" due":""}</span></button>`})+
    sec("Banks",res.banks,b=>`<button type="button" class="us-r" data-sheet="ledger:${b.id}" data-usgo><span class="us-i">₹</span><span><b>${hl(b.name,W)}</b><small>${[b.bankName,b.accNo?"••"+b.accNo.slice(-4):"",b.upi].filter(Boolean).map(x=>hl(x,W)).join(" · ")}</small></span><span class="us-v">${inr(Math.round(balances().bal[b.id]))}</span></button>`)+
    sec("Party payments",res.pays,x=>{const p=parties.find(k=>k.id===x.party)||{};return `<button type="button" class="us-r" data-sheet="partyView:${x.party}" data-usgo><span class="us-i">→</span><span><b>${hl(p.name||"Party",W)}</b><small>${tm(x.time)} · by ${esc(payerName(x))}${x.note?" · "+hl(x.note,W):""}</small></span><span class="us-v neg">−${inr(Math.round(x.amt))}</span></button>`})+
    sec("Expenses",res.exps,x=>`<button type="button" class="us-r" data-sheet="expense:${x.id}" data-usgo><span class="us-i">E</span><span><b>${hl(x.cat,W)}</b><small>${tm(x.time)}${x.note?" · "+hl(x.note,W):""}</small></span><span class="us-v neg">−${inr(Math.round(x.amt))}</span></button>`)+
    sec("Counterparties",res.cps,x=>`<button type="button" class="us-r" data-uscp="${esc(x.name)}"><span class="us-i">C</span><span><b>${hl(x.name,W)}${cpBadge(x.name)}</b><small>${x.n} orders · ${x.c} cancelled · ${inr(Math.round(x.vol))} done</small></span></button>`)+
    sec("AI memory",res.notes,n=>`<div class="us-r"><span class="us-i">✦</span><span><small style="color:var(--fg)">${hl(n.text,W)}</small></span></div>`)+
    `<div class="us-h">Ask AI</div><div class="list"><button type="button" class="us-r" data-usai="${esc(q)}"><span class="us-i">✦</span><span><b>Ask AI: “${esc(q)}”</b><small>Get an answer from all your data</small></span></button></div>`;
}
function openUS(){$("#us").hidden=false;document.body.style.overflow="hidden";$("#usIn").value="";usRender();setTimeout(()=>$("#usIn").focus(),50)}
function closeUS(){$("#us").hidden=true;document.body.style.overflow=""}
function orderSheet(id){const o=orders.find(x=>x.id===id);if(!o)return;
  openSheet(`<h3>${o.side} ${fmtQ(o.qty)} ${esc(o.coin)}</h3><div class="acc">${[["Rate","₹"+fmtR(o.rate)],["Total",inr(orderTotal(o))],["Status",o.status],["Type",modeOf(o)],["Platform",o.platform],["Payment",o.pay],["Counterparty",o.cp],["Banks",(o.splits||[]).map(x=>bankName(x.bank)+" "+inr(x.amt)+" "+(x.method||"")).join(", ")||"Not assigned"],["Note",o.note],["Time",new Date(o.time).toLocaleString("en-IN")]].filter(x=>x[1]).map(([l,v])=>`<div class="ar"><span>${l}</span><span>${esc(v)}</span></div>`).join("")}</div>
    ${(o.proofs||[]).length?`<div class="pvs">${o.proofs.map(i=>proofImg(i)).join("")}</div>`:""}
    <div class="row2" style="margin-top:14px"><button class="mini" type="button" id="os-edit">Edit</button><button class="mini ghost" type="button" id="os-rep">Repeat</button><button class="mini ghost pvwa" type="button" id="os-wa">WhatsApp</button><button class="mini ghost" type="button" data-close>Close</button></div>`,el=>{el.querySelector("#os-wa").onclick=()=>sheets.wasend({order:o.id,kind:"receipt"});
    el.querySelector("#os-edit").onclick=()=>{closeSheet();fillForm(o,true)};el.querySelector("#os-rep").onclick=()=>{closeSheet();fillForm(o,false)}})}
$("#usClose").onclick=closeUS;
$("#usIn").addEventListener("input",()=>{usAll=false;clearTimeout(usT);usT=setTimeout(usRender,120)});
$("#usIn").addEventListener("keydown",e=>{if(e.key==="Escape")closeUS();if(e.key==="Enter"){usSaveRecent($("#usIn").value);const first=$("#usBody").querySelector(".us-r[data-uso],.us-r[data-usgo],.us-r[data-uscp]");if(first)first.click()}});
$("#usBody").addEventListener("click",e=>{
  const tag=e.target.closest("[data-us]");if(tag){$("#usIn").value=tag.dataset.us;usRender();return}
  const more=e.target.closest("[data-more]");if(more){usAll=true;usRender();return}
  const q=$("#usIn").value;
  const o=e.target.closest("[data-uso]");if(o){usSaveRecent(q);closeUS();orderSheet(o.dataset.uso);return}
  const c=e.target.closest("[data-uscp]");if(c){usSaveRecent(q);closeUS();sheets.cps();setTimeout(()=>{const i=$("#cpq");if(i){i.value=c.dataset.uscp;i.dispatchEvent(new Event("input"))}},50);return}
  const a=e.target.closest("[data-usai]");if(a){usSaveRecent(q);closeUS();goPage("ai");setTimeout(()=>ask(a.dataset.usai),100);return}
  const g=e.target.closest("[data-usgo]");if(g){usSaveRecent(q);closeUS()}
});
// "show all" just raises the limit


$("#dPlan").addEventListener("click",e=>{const b=e.target.closest("[data-plan]");if(!b)return;let sp=[];try{sp=JSON.parse(b.dataset.sp)}catch(err){}sheets.pay(b.dataset.plan,sp,+b.dataset.amt||undefined)});
document.addEventListener("click",e=>{const b=e.target.closest("[data-dq]");if(!b)return;const k=b.dataset.dq;
  if(k==="pay")pickParty(id=>sheets.pay(id));else if(k==="due")pickParty(id=>sheets.due(id));
  else if(k==="share"){const lines=parties.map(p=>({p,a:partyDueNow(p)})).filter(x=>x.a>0.5).map(x=>`• ${x.p.name}: ${inr(Math.round(x.a))}`);
    const t=lines.length?`Direct payments due (${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"})})\n`+lines.join("\n")+`\nTotal: ${inr(Math.round(parties.reduce((s,p)=>s+partyDueNow(p),0)))}`:"No payments due right now.";
    openSheet(`<h3>Share due list</h3><pre class="shprev" id="dsh"></pre><div class="row2"><button class="primary" type="button" id="dshc">Copy</button><a class="primary wa" href="https://wa.me/?text=${encodeURIComponent(t)}" target="_blank" rel="noopener">WhatsApp</a></div>`,el=>{el.querySelector("#dsh").textContent=t;el.querySelector("#dshc").onclick=()=>copyText(t,el.querySelector("#dsh"))})}});

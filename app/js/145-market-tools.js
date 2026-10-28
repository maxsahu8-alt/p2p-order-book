// ===== Live market: USDT/INR, P2P ads, coins in USDT and INR =====
var MK={usdtInr:null,chg:null,p2pBuy:null,p2pSell:null,coins:null,t:0,src:"",err:""},mkBusy=false,mkTimer=null;
(function(){try{const j=JSON.parse(localStorage.getItem("p2p_mk")||"null");if(j)Object.assign(MK,j)}catch(e){}
 if(!document.getElementById("mkcss")){const s=document.createElement("style");s.id="mkcss";s.textContent=`.xhead.mk{grid-template-columns:auto minmax(0,1fr) auto auto}.xhead.mk #todayLbl{display:none}.mkchip{display:flex;flex-direction:column;align-items:flex-end;gap:0;border:1px solid var(--line);background:var(--surface);color:var(--fg,inherit);border-radius:12px;padding:4px 9px 5px;cursor:pointer;font-family:var(--body);line-height:1.15;min-width:0}.mkchip small{display:flex;align-items:center;gap:5px;font:700 .56rem var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap}.mkchip b{font:800 .98rem var(--display);letter-spacing:-.01em;white-space:nowrap}.mkchip em{font-style:normal;font-weight:800}.mkchip em.up{color:var(--accent)}.mkchip em.dn{color:var(--sell)}.mkdot{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 55%,transparent);animation:mkp 2s infinite}.mkdot.old{background:var(--muted);animation:none}@keyframes mkp{70%{box-shadow:0 0 0 6px transparent}100%{box-shadow:0 0 0 0 transparent}}@media(prefers-reduced-motion:reduce){.mkdot{animation:none}}.mkhero{text-align:center;padding:6px 0 10px}.mkhero b{display:block;font:800 2rem var(--display)}.mkhero span{font:700 .8rem var(--body)}.mkc{display:grid;grid-template-columns:1.1fr 1fr 1fr .8fr;gap:6px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font:500 .8rem var(--body)}.mkc.h{color:var(--muted);font:700 .64rem var(--body);text-transform:uppercase;padding:4px 0}.mkc b{font-weight:700}.mkc .r{text-align:right}.mkad{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font:500 .78rem var(--body)}.mkad small{display:block;color:var(--muted);font:500 .66rem var(--body)}`;document.head.appendChild(s)}})();
const mkP=n=>n==null||!isFinite(n)?"—":n>=1000?Number(n).toLocaleString("en-IN",{maximumFractionDigits:2}):n>=1?Number(n).toFixed(2):Number(n).toFixed(4);
const mkPct=v=>v==null||!isFinite(v)?"":(v>=0?"▲":"▼")+Math.abs(v).toFixed(2)+"%";
async function mkJson(url,opt,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||8000);try{const r=await fetch(url,{...(opt||{}),signal:c.signal});if(!r.ok)throw new Error("http "+r.status);return await r.json()}finally{clearTimeout(t)}}
const MK_COINS=[["BTC","bitcoin"],["ETH","ethereum"],["BNB","binancecoin"],["SOL","solana"],["XRP","ripple"],["TRX","tron"],["DOGE","dogecoin"],["USDC","usd-coin"]];
async function mkP2P(tradeType){const r=await mkJson("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fiat:"INR",page:1,rows:5,tradeType,asset:"USDT",countries:[],proMerchantAds:false,shieldMerchantAds:false,publisherType:null,payTypes:[],classifies:["mass","profession"]})},8000);
 return(Array.isArray(r&&r.data)?r.data:[]).map(d=>({price:+(d.adv||{}).price,min:+(d.adv||{}).minSingleTransAmount,max:+((d.adv||{}).dynamicMaxSingleTransAmount||(d.adv||{}).maxSingleTransAmount),name:(d.advertiser||{}).nickName||"",pay:((d.adv||{}).tradeMethods||[]).map(m=>m.tradeMethodShortName||m.identifier).filter(Boolean).slice(0,3)})).filter(a=>a.price>0).slice(0,5)}
async function mkRefresh(){if(mkBusy||(typeof navigator!=="undefined"&&navigator.onLine===false))return;mkBusy=true;let got=false;
 try{
  let cg=null;try{cg=await mkJson("https://api.coingecko.com/api/v3/simple/price?ids=tether,"+MK_COINS.map(c=>c[1]).join(",")+"&vs_currencies=inr,usd&include_24hr_change=true")}catch(e){}
  if(cg&&cg.tether&&cg.tether.inr>0){MK.usdtInr=cg.tether.inr;MK.chg=cg.tether.inr_24h_change;MK.src="CoinGecko";got=true}
  const[pb,ps]=await Promise.all([mkP2P("BUY").catch(()=>null),mkP2P("SELL").catch(()=>null)]);
  if(pb&&pb.length){MK.p2pBuy=pb;got=true}if(ps&&ps.length){MK.p2pSell=ps;got=true}
  if(!(cg&&cg.tether&&cg.tether.inr>0)&&MK.p2pBuy&&MK.p2pSell&&MK.p2pBuy[0]&&MK.p2pSell[0]){MK.usdtInr=(MK.p2pBuy[0].price+MK.p2pSell[0].price)/2;MK.chg=null;MK.src="Binance P2P"}
  let bn={};try{const sy=MK_COINS.filter(c=>c[0]!=="USDC").map(c=>c[0]+"USDT");const b=await mkJson("https://api.binance.com/api/v3/ticker/24hr?symbols="+encodeURIComponent(JSON.stringify(sy)));(Array.isArray(b)?b:[]).forEach(x=>{bn[x.symbol]={p:+x.lastPrice,c:+x.priceChangePercent}})}catch(e){}
  if(MK.usdtInr){MK.coins=MK_COINS.map(([s,id])=>{const x=bn[s+"USDT"],g=cg&&cg[id];const usdt=s==="USDC"?(g?g.usd:1):x?x.p:g?g.usd:null;if(usdt==null)return null;return{s,usdt,inr:usdt*MK.usdtInr,chg:x?x.c:g?g.inr_24h_change:null}}).filter(Boolean)}
  if(got){MK.t=Date.now();MK.err="";try{localStorage.setItem("p2p_mk",JSON.stringify({usdtInr:MK.usdtInr,chg:MK.chg,p2pBuy:MK.p2pBuy,p2pSell:MK.p2pSell,coins:MK.coins,t:MK.t,src:MK.src}))}catch(e){}}else MK.err="offline"
 }catch(e){MK.err="error"}finally{mkBusy=false}
 mkStrip();return got}
function mkStrip(){const el=document.getElementById("mkStrip");if(!el)return;const off=typeof navigator!=="undefined"&&navigator.onLine===false;
 if(!MK.usdtInr){el.innerHTML=`<small><i class="mkdot old"></i>USDT</small><b><svg class="mkusd" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#26a17b"/><path fill="#fff" d="M6.4 6.8h11.2v2.5h-4.4v1.2c2.7.13 4.7.7 4.7 1.4s-2 1.27-4.7 1.4v5.4h-2.4v-5.4c-2.7-.13-4.7-.7-4.7-1.4s2-1.27 4.7-1.4V9.3H6.4z"/></svg>${off?"Offline":"…"}</b>`;return}
 const stale=Date.now()-MK.t>10*60e3,up=(MK.chg||0)>=0;
 el.title=stale?"Old price":"Live USDT price in rupees";
 const pr=MK.usdtInr,prev=el._p;el._p=pr;
 el.innerHTML=`<small><i class="mkdot${stale?" old":""}"></i>USDT${stale?" · old":MK.chg!=null?` <em class="${up?"up":"dn"}">${mkPct(MK.chg)}</em>`:""}</small><b><svg class="mkusd" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#26a17b"/><path fill="#fff" d="M6.4 6.8h11.2v2.5h-4.4v1.2c2.7.13 4.7.7 4.7 1.4s-2 1.27-4.7 1.4v5.4h-2.4v-5.4c-2.7-.13-4.7-.7-4.7-1.4s2-1.27 4.7-1.4V9.3H6.4z"/></svg>₹${mkP(pr)}</b>`;
 if(prev!=null&&Math.abs(prev-pr)>=0.005){const bb=el.querySelector("b");if(bb)bb.classList.add(pr>prev?"tkup":"tkdn")}}
sheets.market=function(){const draw=()=>{const m=MK,ago=m.t?Math.max(0,Math.round((Date.now()-m.t)/1000)):null;const yb=lastRate("USDT","BUY"),ys=lastRate("USDT","SELL");
  const ads=(L,lab)=>L&&L.length?`<div class="pcsec">${lab}</div>`+L.slice(0,4).map(a=>`<div class="mkad"><span><b>₹${mkP(a.price)}</b><small>${esc(a.name||"")}${a.pay&&a.pay.length?" · "+esc(a.pay.join(", ")):""}</small></span><span style="text-align:right"><small>₹${mkP(a.min)} – ₹${mkP(a.max)}</small></span></div>`).join(""):"";
  const cmp=(y,lab)=>y&&m.usdtInr?`<div class="dqr"><span>${lab}<small>market ₹${mkP(m.usdtInr)}</small></span><b>₹${mkP(y)} <small class="${y-m.usdtInr>=0?"p7pos":"p7neg"}">${y-m.usdtInr>=0?"+":""}${(y-m.usdtInr).toFixed(2)}</small></b></div>`:"";
  openSheet(`<div class="insw"><div class="insh"><h3>Live market</h3><button type="button" class="mini ghost" id="mk-r">${mkBusy?"Updating…":"Refresh"}</button></div>
   ${m.usdtInr?`<div class="mkhero"><span class="note">1 USDT =</span><b>₹${mkP(m.usdtInr)}</b>${m.chg!=null?`<span class="${m.chg>=0?"p7pos":"p7neg"}">${mkPct(m.chg)} · 24h</span>`:""}<div class="note" style="margin-top:4px">${ago==null?"":ago<90?"updated just now":ago<3600?"updated "+Math.round(ago/60)+" min ago":"old price, updated "+new Date(m.t).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})} · ${esc(m.src||"")}${m.err?" · offline":""}</div></div>`:`<p class="note">${m.err==="offline"||navigator.onLine===false?"No internet. The price will show when you are online.":"Loading the price…"}</p>`}
   ${cmp(ys,"Your last sell rate")}${cmp(yb,"Your last buy rate")}
   ${ads(m.p2pBuy,"P2P: buy USDT from (lowest first)")}${ads(m.p2pSell,"P2P: sell USDT to (highest first)")}
   ${m.coins&&m.coins.length?`<div class="pcsec">Coins</div><div class="mkc h"><span>Coin</span><span class="r">In USDT</span><span class="r">In ₹</span><span class="r">24h</span></div>${m.coins.map(c=>`<div class="mkc"><b>${c.s}</b><span class="r">${mkP(c.usdt)}</span><span class="r">₹${mkP(c.inr)}</span><span class="r ${c.chg>=0?"p7pos":"p7neg"}">${c.chg==null?"":mkPct(c.chg)}</span></div>`).join("")}`:""}
   <p class="note">Market prices only, not your trade rates. ₹ price of a coin = its USDT price × USDT/INR. P2P ads may not load on some networks.</p></div>`,el=>{el.querySelector("#mk-r").onclick=async()=>{await mkRefresh();if($("#sheetBody").querySelector("#mk-r"))draw()}})};
 draw();if(!mkBusy&&Date.now()-MK.t>15e3)mkRefresh().then(()=>{if($("#sheetBody")&&$("#sheetBody").querySelector("#mk-r")&&!$("#sheetBg").hidden)draw()})};
function mkStart(){try{const h=document.querySelector("header.xhead"),sb=document.getElementById("searchBtn");if(h&&sb&&!document.getElementById("mkStrip")){const d=document.createElement("button");d.type="button";d.className="mkchip";d.id="mkStrip";d.setAttribute("data-sheet","market");d.setAttribute("aria-label","Live USDT price in rupees");h.insertBefore(d,sb.closest(".xr")||sb);h.classList.add("mk")}mkStrip();mkRefresh();clearInterval(mkTimer);mkTimer=setInterval(()=>{if(!document.hidden)mkRefresh()},60e3);document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-MK.t>45e3)mkRefresh()});window.addEventListener("online",()=>mkRefresh())}catch(e){}}

sheets.ixhist=function(id){const x=recs.find(r=>r.id===id&&r.kind==="ix");if(!x)return;const T=VER_TXT[x.overall]||["","Checked",""],o=x.orderId?orders.find(y=>y.id===x.orderId):null;
  const row=(k,v)=>v?`<div class="dqr"><span>${k}<small>${v}</small></span></div>`:"";
  openSheet(`<div class="insw"><div class="insh"><h3>${x.side?esc(x.side)+" ":""}${x.amount!=null?inr(x.amount):"—"} · ${esc(x.name||"No name")}</h3><span class="note">${x.saved?"Saved as an order":"Checked only. Nothing was saved to your orders."}</span></div>
    <div class="rml">${row("Result",`${T[0]} ${esc(T[1])} · ${esc(T[2])}`)}${row("Checked",esc(new Date(x.time).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})))}${row("Order number",esc(x.orderRef||""))}${row("Risk",x.risk?esc(x.risk)+" risk":"")}${row("AI",x.ai===true?"Used":x.ai===false?"Not used (phone reading only)":"")}${row("Pictures",(x.types||[]).length?esc((x.types||[]).length+" screenshot"+((x.types||[]).length>1?"s":"")):"")}</div>
    ${(x.why||[]).length?`<div class="pcsec">Why it needs a look</div><div class="rml">${x.why.map(w=>`<div class="dqr"><span class="note" style="margin:0;color:var(--fg)">${esc(w)}</span></div>`).join("")}</div>`:(!x.saved&&x.overall&&x.overall!=="VERIFIED"?'<p class="note">The reason was not kept for this older check. Scan the screenshots again to see it.</p>':"")}
    <div class="row2" style="margin-top:14px">${o?'<button class="mini" type="button" id="ixh-open">Open order</button>':!x.saved?'<button class="mini" type="button" id="ixh-scan">Scan again</button>':""}<button class="mini ghost" type="button" id="ixh-del">Remove from list</button></div></div>`,el=>{
    const q=s=>el.querySelector(s);if(q("#ixh-open"))q("#ixh-open").onclick=()=>{closeSheet();orderSheet(o.id)};if(q("#ixh-scan"))q("#ixh-scan").onclick=()=>{closeSheet();goPage("intake");setTimeout(()=>{const f=$("#i2-file");if(f)f.click()},250)};
    q("#ixh-del").onclick=async()=>{await delRec(x.id);closeSheet();renderIxHist();toast("Removed from the list")}})}
sheets.ixmem=function(){const R=recs.filter(r=>r.kind==="ixl").sort((a,b)=>(b.last||0)-(a.last||0)),al=R.filter(r=>r.t==="alias"),lb=R.filter(r=>r.t==="lab"),ac=R.filter(r=>r.t==="acct");
  const FN={id:"Order ID",cp:"The other person's name",fiat:"Total amount",price:"Price",crypto:"Coin amount",receiver:"Receiver name",sender:"Sender name",utr:"UTR",amount:"Amount"};
  const row=(r,t,sm)=>`<div class="dqr"><span>${t}<small>${sm}</small></span><button type="button" class="mini ghost" data-ixdel="${esc(r.id)}" aria-label="Forget this">Forget</button></div>`;
  const empty=m=>`<div class="dqr"><span class="note" style="margin:0">${m}</span></div>`,seen=r=>`Seen ${r.n||1} time${(r.n||1)>1?"s":""}`;
  openSheet(`<div class="insw"><div class="insh"><h3>Intake memory</h3><span class="note">What Smart Intake learned. It stays on this phone, and every item can be forgotten.</span></div>
    <div class="pcsec">Same person, different spelling (${al.length})</div><div class="rml">${al.length?al.map(r=>row(r,`${esc(r.da||r.a)} = ${esc(r.db||r.b)}`,seen(r))).join(""):empty("Nothing yet. Save a deal where the payment name and the order name are similar and I will learn them.")}</div>
    <div class="pcsec">Where details sit on a screen (${lb.length})</div><div class="rml">${lb.length?lb.map(r=>row(r,`${esc(FN[r.f]||r.f)} comes ${r.m==="below"?"under":"after"} “${esc(r.l)}”`,`${r.s==="ord"?"Exchange order":"Payment"} · ${seen(r).toLowerCase()}`)).join(""):empty("Nothing yet. When the AI reads something the phone missed, I remember where it was.")}</div>
    <div class="pcsec">Your accounts (${ac.length})</div><div class="rml">${ac.length?ac.map(r=>row(r,`••${esc(r.l4)} is ${esc(r.bank)}`,seen(r))).join(""):empty("Nothing yet. A bank the AI recognises from a logo is remembered by its last 4 digits.")}</div>
    <div class="pcsec">Developer</div><div class="rml"><div class="dqr"><span>Developer details<small>Shows a DEBUG button on each intake result</small></span><label class="tog"><input type="checkbox" id="ixl-dev" ${pref("dev")?"checked":""}><span></span></label></div></div>
    ${R.length?'<button type="button" class="mini ghost" id="ixl-all" style="margin-top:10px">Forget everything</button>':""}</div>`,()=>{
    $("#sheetBody").onchange=e=>{if(e.target.id==="ixl-dev"){setPref("dev",e.target.checked);toast(e.target.checked?"Developer details on":"Developer details off");try{ixDraw()}catch(x){}}};
    $("#sheetBody").onclick=async e=>{const d=e.target.closest("[data-ixdel]");if(d){await delRec(d.dataset.ixdel);if(IXL)IXL.dirty=true;sheets.ixmem();renderIxHist();return}
      const all=e.target.closest("#ixl-all");if(all){if(all.dataset.sure!=="1"){all.dataset.sure="1";all.textContent="Tap again to forget everything";return}
        for(const r of recs.filter(x=>x.kind==="ixl"))await delRec(r.id);if(IXL)IXL.dirty=true;toast("Intake memory cleared");sheets.ixmem();renderIxHist()}}})}
{const b=$("#st-ixmem");if(b)b.onclick=()=>sheets.ixmem();const h=$("#i2-hist");if(h)h.addEventListener("click",async e=>{if(e.target.closest("[data-ixmem]")){sheets.ixmem();return}const c=e.target.closest("[data-ixclr]");if(c){if(c.dataset.sure!=="1"){c.dataset.sure="1";c.textContent="Tap again to clear";return}for(const r of recs.filter(x=>x.kind==="ix"&&!x.saved))await delRec(r.id);renderIxHist();toast("Cleared. Saved ones are kept");return}const r=e.target.closest("[data-ixh]");if(r)sheets.ixhist(r.dataset.ixh)})}

sheets.cashflow=function(wp){wp=wp===undefined?pref("cfProfit")!==false:wp;const F=cashFlow(wp);const mn=Math.min(...F.days.map(d=>d.bal));
  const lv=F.short?"bad":mn<F.money*0.15?"warn":"ok";
  openSheet(`<div class="insw"><div class="insh"><h3>Cash flow · next 7 days</h3></div>
    <div class="rsug"><div><span>Money now</span><b>${inr(Math.round(F.money))}</b></div><div><span>To pay · 7 days</span><b class="${F.totOut?"neg":""}">${inr(Math.round(F.totOut))}</b></div><div><span>Lowest point</span><b class="${mn<0?"neg":"pos"}">${sgn(mn)}</b></div></div>
    ${insList([F.short?["bad",`<b>Money runs short on ${new Date(F.short.t).toLocaleDateString("en-IN",{weekday:"long"})}</b> by ${inr(Math.round(-F.short.bal))}. ${F.stk&&F.rate?`Selling ${fmtQ(Math.ceil(-F.short.bal/F.rate))} ${F.coin} (you have ${fmtQ(+F.stk.toFixed(2))}) would cover it.`:"Plan sells or move money before then."}`]:["ok",`<b>Covered for 7 days.</b> Lowest balance ${inr(Math.round(mn))}.`]])}
    <div class="icard"><div class="ich"><b>Balance after payments</b><span>₹</span></div><div class="chart" id="cf-c"></div></div>
    <div class="pcsec">Day by day</div><div class="cfl">${F.days.map((d,i)=>`<div class="cfd ${d.bal<0?"bad":""}"><div class="cfh"><b>${i===0?"Today":i===1?"Tomorrow":new Date(d.t).toLocaleDateString("en-IN",{weekday:"short",day:"numeric"})}</b><span class="${d.bal<0?"neg":""}">${sgn(d.bal)}</span></div>${d.items.map(([n,v,w])=>`<div class="cfi"><span>${esc(n)}${w?` <em class="${w==="overdue"?"neg":""}">${w}</em>`:""}</span><span class="neg">−${inr(Math.round(v))}</span></div>`).join("")||'<div class="cfi"><span class="note" style="margin:0">No party payments</span></div>'}</div>`).join("")}</div>
    ${F.noDate.length?`<div class="pcsec">Dues without a pay day</div><div class="rml">${F.noDate.map(([n,v])=>`<div class="dqr"><span>${esc(n)}</span><b class="neg">${inr(Math.round(v))}</b></div>`).join("")}</div>`:""}
    <div class="tgn"><span>Add expected trading profit (${inr(Math.round(F.pDay))}/day)</span><label class="tog"><input type="checkbox" id="cf-p" ${wp?"checked":""}><span></span></label></div>
    <p class="note">Uses weekly amounts and pay days of your Direct parties, average personal expenses (${inr(Math.round(F.exDay))}/day) and your last 14 days of profit.</p></div>`,el=>{
    el.querySelector("#cf-p").onchange=e=>{setPref("cfProfit",e.target.checked);sheets.cashflow(e.target.checked)};
    barChart(el.querySelector("#cf-c"),{labels:F.days.map((d,i)=>i?new Date(d.t).toLocaleDateString("en-IN",{weekday:"short"}):"Today"),series:[{name:"Balance",values:F.days.map(d=>d.bal),color:cssv("--s1")||"#2a78d6"}],fmt:short});
  })};

// ---- 3. Loss finder
function lossData(per){const from=INS_FROM(per);const L=orders.filter(o=>o.time>=from);const out=[];const coins=[...new Set(L.map(o=>o.coin))];
  coins.forEach(c=>{const A=L.filter(o=>o.coin===c&&o.status==="Completed");const ab=avgBuyRate(A,c);let q=0,v=0;A.forEach(o=>{if(o.side==="SELL"){q+=+o.qty;v+=o.qty*o.rate}});const as=q?v/q:0;
    A.forEach(o=>{if(o.side==="SELL"&&ab&&o.rate<ab-1e-9)out.push({o,loss:(ab-o.rate)*o.qty,why:`Sold at ₹${fmtR(o.rate)} · your avg buy ₹${ab.toFixed(2)}`});
      if(o.side==="BUY"&&as&&o.rate>as+1e-9)out.push({o,loss:(o.rate-as)*o.qty,why:`Bought at ₹${fmtR(o.rate)} · your avg sell ₹${as.toFixed(2)}`})})});
  out.sort((a,b)=>b.loss-a.loss);const canc=L.filter(o=>o.status==="Cancelled");const cv=canc.reduce((t,o)=>t+orderTotal(o),0);
  const ex=exps.filter(x=>x.time>=from);const exT=ex.reduce((t,x)=>t+(+x.amt||0),0);const cat={};ex.forEach(x=>cat[x.cat||"Other"]=(cat[x.cat||"Other"]||0)+(+x.amt||0));
  const byCp={};out.forEach(x=>{const n=x.o.cp||"Unknown";byCp[n]=(byCp[n]||0)+x.loss});
  const night=out.filter(x=>new Date(x.o.time).getHours()<6).reduce((t,x)=>t+x.loss,0);const tot=out.reduce((t,x)=>t+x.loss,0);
  return{out,tot,canc,cv,exT,cat,byCp,night,L}}
sheets.loss=function(per){per=per||"30";const D=lossData(per);
  const topCp=Object.entries(D.byCp).sort((a,b)=>b[1]-a[1]).slice(0,5),topCat=Object.entries(D.cat).sort((a,b)=>b[1]-a[1]).slice(0,5);
  openSheet(`<div class="insw"><div class="insh"><h3>Loss finder</h3><span class="note">${D.L.length} orders</span></div>
    ${insSeg("lf-per",[["7","7 days"],["30","30 days"],["90","90 days"],["all","All"]],per)}
    <div class="msgr">${[["Loss trades",D.out.length,D.out.length?"neg":""],["Lost on rate",inr(Math.round(D.tot)),D.tot?"neg":""],["Cancelled",D.canc.length,""],["Volume lost",inr(Math.round(D.cv)),""],["Expenses",inr(Math.round(D.exT)),""],["Total leak",inr(Math.round(D.tot+D.exT)),"neg"]].map(([l,v,c])=>`<div><span>${l}</span><b class="${c}">${v}</b></div>`).join("")}</div>
    <div class="pcsec">What this means</div>${insList([
      D.out.length?["bad",`<b>${D.out.length} trade${D.out.length>1?"s":""} lost ${inr(Math.round(D.tot))}</b> because the rate was worse than your average. Check <b>Best rate finder</b> before setting ads.`]:["ok","No trades below your average rate in this period."],
      D.night>D.tot*0.4&&D.night>0?["bad",`${Math.round(D.night/D.tot*100)}% of rate losses happened between 12–6 AM.`]:null,
      D.canc.length?["warn",`${D.canc.length} cancelled orders · ${inr(Math.round(D.cv))} of business that did not happen.`]:null,
      topCat[0]?["warn",`Biggest expense: <b>${esc(topCat[0][0])}</b> ${inr(Math.round(topCat[0][1]))}.`]:null])}
    ${D.out.length?`<div class="pcsec">Worst trades</div><div class="tl">${D.out.slice(0,12).map(x=>`<div class="tli tdue" data-oid="${x.o.id}" style="cursor:pointer"><span class="tld"></span><div class="tlb"><div class="tlr"><b>${x.o.side==="BUY"?"Bought":"Sold"} ${fmtQ(x.o.qty)} ${esc(x.o.coin)}${x.o.cp?" · "+esc(x.o.cp):""}</b><span class="amt neg">−${inr(Math.round(x.loss))}</span></div><small>${tfmt(x.o.time)} · ${x.why}</small></div></div>`).join("")}</div>`:""}
    ${topCp.length?`<div class="icard"><div class="ich"><b>Loss by trader</b></div><div class="chart" id="lf-cp"></div></div>`:""}
    ${topCat.length?`<div class="icard"><div class="ich"><b>Expenses by type</b></div><div class="chart" id="lf-ex"></div></div>`:""}</div>`,el=>{
    bindSeg(el,"lf-per",k=>sheets.loss(k));
    if(topCp.length)hbarChart(el.querySelector("#lf-cp"),topCp.map(([n,v])=>({label:n,value:Math.round(v),fmt:inr})),cssv("--sell")||"#ef4444");
    if(topCat.length)hbarChart(el.querySelector("#lf-ex"),topCat.map(([n,v])=>({label:n,value:Math.round(v)})),cssv("--warn")||"#d97706");
    el.querySelectorAll("[data-oid]").forEach(r=>r.onclick=()=>orderSheet(r.dataset.oid));
  })};

// ---- 4. Custom alerts
let arules=[];
const RULE_T={bal:"Bank balance below",lim:"Limit used above",pend:"Order pending longer than",stock:"Coin stock below",loss:"Today's loss more than",big:"Order bigger than"};
function ruleText(r){const bn=r.bank&&r.bank!=="all"?bankName(r.bank):"Total of all banks";return r.type==="bal"?`${bn} below ${inr(r.v)}`:r.type==="lim"?`${r.bank&&r.bank!=="all"?bankName(r.bank):"Any bank"} ${r.m||"UPI"} limit above ${r.v}%`:r.type==="pend"?`Order pending more than ${r.v} min`:r.type==="stock"?`${r.coin||"USDT"} stock below ${fmtQ(r.v)}`:r.type==="loss"?`Today's loss more than ${inr(r.v)}`:`Order bigger than ${inr(r.v)}`}
function evalRules(){const out=[];if(!arules.length)return out;const {bal}=balances();const use=limitUse();const now=Date.now();
  arules.filter(r=>r.on!==false).forEach(r=>{let hit=null;
    if(r.type==="bal"){const v=r.bank==="all"||!r.bank?banks.reduce((t,b)=>t+bal[b.id],0):bal[r.bank];if(v!=null&&v<r.v)hit=`${r.bank==="all"||!r.bank?"Total money":bankName(r.bank)} is ${inr(Math.round(v))} (below ${inr(r.v)})`}
    else if(r.type==="lim"){(r.bank==="all"||!r.bank?banks:banks.filter(b=>b.id===r.bank)).forEach(b=>{const L=+(b.limits||{})[r.m||"UPI"];if(!L)return;const u=((use[b.id]||{})[r.m||"UPI"])||0;if(u/L*100>=r.v&&!hit)hit=`${b.name} ${r.m||"UPI"} limit ${Math.round(u/L*100)}% used`})}
    else if(r.type==="pend"){const o=orders.filter(o=>(o.status==="Pending"||o.status==="Appeal")&&now-o.time>r.v*6e4);if(o.length)hit=`${o.length} order${o.length>1?"s":""} pending over ${r.v} min`}
    else if(r.type==="stock"){const q=stockLeft()[r.coin||"USDT"]||0;if(q<r.v)hit=`${r.coin||"USDT"} stock ${fmtQ(+q.toFixed(2))} (below ${fmtQ(r.v)})`}
    else if(r.type==="loss"){const st=stats(orders.filter(o=>isToday(o.time)));if(st.profit<-r.v)hit=`Today's loss ${inr(Math.round(-st.profit))}`}
    else if(r.type==="big"){const o=orders.filter(o=>isToday(o.time)&&orderTotal(o)>r.v);if(o.length)hit=`${o.length} order${o.length>1?"s":""} above ${inr(r.v)} today`}
    if(hit)out.push({r,t:hit})});return out}
const ruleSeen=new Set();
function ruleTick(){evalRules().forEach(x=>{const k=x.r.id+new Date().toDateString();if(!ruleSeen.has(k)){ruleSeen.add(k);toast("🔔 "+x.t);try{navigator.vibrate&&navigator.vibrate(150)}catch(e){}}})}
setInterval(()=>{try{ruleTick()}catch(e){}},30000);
sheets.rules=function(){const hits=evalRules();const hitIds=new Set(hits.map(x=>x.r.id));
  const bankOpts=`<option value="all">All banks</option>${banks.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join("")}`;
  openSheet(`<div class="insw"><div class="insh"><h3>Custom alerts</h3><span class="note">${arules.length} rule${arules.length===1?"":"s"}</span></div>
    <div class="rml">${arules.map(r=>`<div class="rmi ${hitIds.has(r.id)?"over":""}"><label class="tog"><input type="checkbox" data-ron="${r.id}" ${r.on!==false?"checked":""}><span></span></label><div class="rmt"><b>${esc(ruleText(r))}</b><small>${r.on===false?"Off":hitIds.has(r.id)?"⚠ "+esc(hits.find(x=>x.r.id===r.id).t):"OK right now"}</small></div><button type="button" class="link del" data-rdl="${r.id}">Delete</button></div>`).join("")||'<p class="note" style="padding:10px 0">No rules yet. Add one below.</p>'}</div>
    <div class="pcsec">New alert</div>
    <div class="icard"><label class="pcl">When<select id="ru-t">${Object.entries(RULE_T).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></label><div id="ru-f"></div>
    <button type="button" class="mini psdl" id="ru-add" style="width:100%;padding:12px;margin:6px 0 4px">Add alert</button></div>
    <div class="pcsec">Quick add</div><div class="cvchips" style="flex-wrap:wrap">${[["pend",15,"Pending > 15 min"],["lim",90,"UPI limit 90%"],["stock",100,(pref("coin")||"USDT")+" below 100"],["bal",20000,"Total money < ₹20k"]].map(([t,v,l])=>`<button type="button" data-qa="${t}:${v}">${l}</button>`).join("")}</div>
    <p class="note">Alerts show on the menu badge and Home, and pop up while the app is open.</p></div>`,el=>{
    const q=x=>el.querySelector(x);
    const fields=()=>{const t=q("#ru-t").value;q("#ru-f").innerHTML=t==="bal"?`<div class="pcrow"><label>Bank<select id="ru-b">${bankOpts}</select></label><label>Amount (₹)<input id="ru-v" type="number" inputmode="numeric" placeholder="20000"></label></div>`
      :t==="lim"?`<div class="pcrow"><label>Bank<select id="ru-b">${bankOpts}</select></label><label>Method<select id="ru-m"><option>UPI</option><option>IMPS</option><option>NEFT</option><option value="ALL">Total</option></select></label></div><label class="pcl">Used above (%)<input id="ru-v" type="number" inputmode="numeric" value="90"></label>`
      :t==="stock"?`<div class="pcrow"><label>Coin<select id="ru-c">${(pref("coins")||["USDT"]).map(c=>`<option>${esc(c)}</option>`).join("")}</select></label><label>Quantity<input id="ru-v" type="number" inputmode="decimal" placeholder="100"></label></div>`
      :`<label class="pcl">${t==="pend"?"Minutes":"Amount (₹)"}<input id="ru-v" type="number" inputmode="numeric" placeholder="${t==="pend"?"15":t==="loss"?"500":"100000"}"></label>`};
    fields();q("#ru-t").onchange=fields;
    const save=async r=>{try{await putRec({id:"ar_"+Date.now().toString(36),kind:"arule",on:true,time:Date.now(),...r});toast("Alert added");sheets.rules();renderAlerts()}catch(e){toast("Couldn't save")}};
    q("#ru-add").onclick=()=>{const t=q("#ru-t").value,v=+(q("#ru-v")||{}).value;if(!(v>0)){toast("Enter a value");return}const r={type:t,v};if(q("#ru-b"))r.bank=q("#ru-b").value;if(q("#ru-m"))r.m=q("#ru-m").value;if(q("#ru-c"))r.coin=q("#ru-c").value;save(r)};
    el.querySelectorAll("[data-qa]").forEach(b=>b.onclick=()=>{const [t,v]=b.dataset.qa.split(":");save(t==="lim"?{type:t,v:+v,bank:"all",m:"UPI"}:t==="stock"?{type:t,v:+v,coin:pref("coin")||"USDT"}:t==="bal"?{type:t,v:+v,bank:"all"}:{type:t,v:+v})});
    el.querySelectorAll("[data-ron]").forEach(i=>i.onchange=async()=>{try{await patchRec(i.dataset.ron,{on:i.checked});sheets.rules();renderAlerts()}catch(e){toast("Couldn't save")}});
    el.querySelectorAll("[data-rdl]").forEach(b=>twoTap(b,async()=>{try{await delRec(b.dataset.rdl);sheets.rules();renderAlerts()}catch(e){toast("Couldn't delete")}}));
  })};

// ---- 5. Bank risk meter
function bankRisk(){const now=Date.now(),use=limitUse();const firstSeen={};orders.forEach(o=>{if(!o.cp)return;const k=cpKey(o.cp);firstSeen[k]=Math.min(firstSeen[k]||9e15,o.time)});
  return banks.filter(b=>b.type!=="Cash").map(b=>{const inc=orders.filter(o=>o.side==="SELL"&&o.status!=="Cancelled"&&now-o.time<DAY&&(o.splits||[]).some(x=>x.bank===b.id));
    const cr=inc.length,amt=inc.reduce((t,o)=>t+(o.splits||[]).filter(x=>x.bank===b.id).reduce((s2,x)=>s2+(+x.amt||0),0),0);
    const payers=new Set(inc.map(o=>o.cp?cpKey(o.cp):o.id)),newP=[...payers].filter(k=>firstSeen[k]&&now-firstSeen[k]<DAY).length;
    const blk=orders.filter(o=>now-o.time<7*DAY&&o.cp&&(cpTag(o.cp)||{}).tag==="block"&&(o.splits||[]).some(x=>x.bank===b.id)).length;
    const lim=b.limits||{};const pct=Math.max(0,...["UPI","IMPS","NEFT","ALL"].map(m=>+lim[m]?((((use[b.id]||{})[m])||0)/+lim[m]):0));
    const wk=[...Array(7)].map((_,i)=>{const a=new Date();a.setHours(0,0,0,0);const t=a.getTime()-(6-i)*DAY;return orders.filter(o=>o.side==="SELL"&&o.status!=="Cancelled"&&o.time>=t&&o.time<t+DAY&&(o.splits||[]).some(x=>x.bank===b.id)).length});
    const score=Math.min(100,Math.round(Math.min(35,cr*1.75)+Math.min(20,payers.size*1.4)+Math.min(20,newP*4)+Math.min(15,pct*15)+Math.min(10,blk*10)));
    return{b,cr,amt,payers:payers.size,newP,blk,pct,wk,score,lv:score>=60?"bad":score>=35?"warn":"ok"}}).sort((x,y)=>y.score-x.score)}
sheets.bankrisk=function(){const R=bankRisk();
  openSheet(`<div class="insw"><div class="insh"><h3>Bank risk meter</h3><span class="note">last 24 hours</span></div>
    ${R.length?R.map(x=>`<div class="icard brk ${x.lv}"><div class="brh"><div><b>${esc(x.b.name)}</b><small>${x.cr} credit${x.cr===1?"":"s"} · ${inr(Math.round(x.amt))}</small></div><span class="pvs ${x.lv}">${x.lv==="ok"?"Low risk":x.lv==="warn"?"Medium":"High risk"} · ${x.score}</span></div>
      <div class="brbar"><i style="width:${x.score}%;background:${lvlCol(x.lv)}"></i></div>
      <div class="brg"><div><span>Payers</span><b>${x.payers}</b></div><div><span>New payers</span><b class="${x.newP>2?"neg":""}">${x.newP}</b></div><div><span>Limit used</span><b class="${x.pct>=0.9?"neg":""}">${Math.round(x.pct*100)}%</b></div><div><span>Blocked (7d)</span><b class="${x.blk?"neg":""}">${x.blk}</b></div></div>
      <div class="brw">${x.wk.map((n,i)=>`<span title="${n}"><i style="height:${n?Math.max(14,n/Math.max(1,...x.wk)*100):6}%;background:${n?(i===6?lvlCol(x.lv):"color-mix(in srgb,var(--accent) 40%,transparent)"):"var(--soft)"}"></i></span>`).join("")}</div><small class="note" style="margin:0">Credits per day · last 7 days</small>
      ${x.lv!=="ok"?`<p class="brt">${x.lv==="bad"?"Rest this account: switch new buyers to another bank for today.":"Getting busy. Spread new orders across other banks."}${x.newP>2?" Many first-time payers today.":""}${x.blk?" A blocked trader paid into this account.":""}</p>`:""}</div>`).join(""):'<p class="note">Add a bank to see its risk.</p>'}
    <p class="note">Score uses credits today, how many different and new people paid, limit used and blocked traders. It is a guide, not the bank's rule.</p></div>`)};

// ---- 6. Weekly AI coach
function coachFacts(){const ws=weekStart(),a=ws-7*DAY;const cur=orders.filter(o=>o.time>=ws),prev=orders.filter(o=>o.time>=a&&o.time<ws);
  const f=L=>{const st=stats(L);const d=L.filter(o=>o.status==="Completed").length,c=L.filter(o=>o.status==="Cancelled").length,ap=L.filter(o=>o.status==="Appeal").length;return{orders:L.length,completed:d,cancelled:c,appeals:ap,profit:Math.round(st.profit),buy_avg:+st.b.avg.toFixed(2),sell_avg:+st.s.avg.toFixed(2),volume:Math.round(L.filter(o=>o.status==="Completed").reduce((t,o)=>t+orderTotal(o),0))}};
  const ld=lossData("7"),sc=scoreData("7"),sg=rateSuggest(pref("coin")||"USDT"),cf=cashFlow(true),ti=targetInfo(),br=bankRisk();
  return{this_week:f(cur),last_week:f(prev),busiest_time:bestTimeTop("30"),suggested_sell:+sg.sell.toFixed(2),suggested_buy:+sg.buy.toFixed(2),loss_trades:ld.out.length,lost_on_rate:Math.round(ld.tot),expenses:Math.round(ld.exT),merchant_score:sc.score,
    month_target:ti.T,month_earned:Math.round(ti.earned),money_short_day:cf.short?new Date(cf.short.t).toDateString():null,risky_banks:br.filter(x=>x.lv!=="ok").map(x=>x.b.name),
    top_traders:Object.values(cpStats()).sort((x,y)=>y.vol-x.vol).slice(0,5).map(x=>({name:x.name,orders:x.n,cancelled:x.c})),open_orders:orders.filter(o=>o.status==="Pending"||o.status==="Appeal").length}}
function coachFallback(F){const t=F.this_week,l=F.last_week;const W=[],M=[],P=[],X=[];
  if(t.profit>l.profit)W.push(`Profit up: ₹${t.profit} vs ₹${l.profit} last week.`);else M.push(`Profit down: ₹${t.profit} vs ₹${l.profit} last week.`);
  if(t.cancelled>l.cancelled)M.push(`${t.cancelled} cancels this week (last week ${l.cancelled}).`);else if(t.orders)W.push(`Fewer cancels than last week.`);
  if(F.loss_trades)M.push(`${F.loss_trades} trades below your average rate cost ₹${F.lost_on_rate}.`);
  if(F.busiest_time)P.push(`Keep ads live around ${F.busiest_time}.`);if(F.suggested_sell)P.push(`Sell ads near ₹${F.suggested_sell}, buy near ₹${F.suggested_buy}.`);
  if(F.money_short_day)X.push(`Money may run short on ${F.money_short_day}.`);F.risky_banks.forEach(b=>X.push(`${b} looks busy. Rest it.`));
  return{headline:t.profit>=l.profit?"Good week. Keep the rhythm.":"Slower week. Small fixes below.",wins:W,mistakes:M,plan:P,watch:X}}
let coachRecs=[];
sheets.coach=function(id){const list=coachRecs.slice().sort((a,b)=>b.time-a.time);const C=id?list.find(x=>x.id===id):list[0];
  const sec=(t,arr,cls)=>arr&&arr.length?`<div class="pcsec">${t}</div>${insList(arr.map(x=>[cls,esc(String(x))]))}`:"";
  openSheet(`<div class="insw"><div class="insh"><h3>Weekly AI coach</h3><span class="note">${C?"Week of "+dfmt(C.week):""}</span></div>
    ${C?`<div class="cohl"><span class="qri t-amber"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg></span><b>${esc(C.r.headline||"")}</b></div>
      <div class="rsug"><div><span>Profit</span><b class="${C.f.this_week.profit>=0?"pos":"neg"}">${sgn(C.f.this_week.profit)}</b><small>last ${sgn(C.f.last_week.profit)}</small></div><div><span>Orders</span><b>${C.f.this_week.orders}</b><small>last ${C.f.last_week.orders}</small></div><div><span>Score</span><b>${C.f.merchant_score||"—"}</b><small>${C.ai?"AI review":"Quick review"}</small></div></div>
      ${sec("What went well",C.r.wins,"ok")}${sec("Mistakes",C.r.mistakes,"bad")}${sec("Plan for next week",C.r.plan,"ok")}${sec("Watch out",C.r.watch,"warn")}`:`<p class="note">No review yet. Generate one: AI reads this week's numbers and writes a short review and plan.</p>`}
    <button type="button" class="mini psdl" id="co-gen" style="width:100%;padding:13px;margin:12px 0">${C&&C.week===weekStart()?"Refresh this week's review":"Generate this week's review"}</button>
    ${list.length>1?`<div class="pcsec">Past weeks</div><div class="cvchips">${list.slice(0,8).map(x=>`<button type="button" data-cw="${x.id}" class="${C&&x.id===C.id?"on":""}">${dfmt(x.week)}</button>`).join("")}</div>`:""}</div>`,el=>{
    el.querySelectorAll("[data-cw]").forEach(b=>b.onclick=()=>sheets.coach(b.dataset.cw));
    el.querySelector("#co-gen").onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent="AI is reviewing your week…";const F=coachFacts();let r=null,ai=true;
      try{r=await aiJson(`You are a sharp, friendly business coach for an Indian P2P crypto merchant. Here are this week's numbers (Mon to now) and last week's, as JSON:\n${JSON.stringify(F)}\n\nWrite a short weekly review. ${aiStyle()}\nReturn JSON: {"headline":"one line verdict","wins":["2-3 short points"],"mistakes":["2-3 short points with numbers"],"plan":["3 concrete actions for next week: times, rates, banks, traders"],"watch":["0-2 risks"]}. Use only the numbers given; do not invent figures.`)}catch(err){r=coachFallback(F);ai=false;toast("AI not available. Made a quick review instead")}
      try{await putRec({id:"coach_"+weekStart(),kind:"coach",week:weekStart(),f:F,r,ai,time:Date.now()});setTimeout(()=>sheets.coach("coach_"+weekStart()),60)}catch(err){toast("Couldn't save");b.disabled=false}};
  })};

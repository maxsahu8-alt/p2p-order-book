// ================= APP ASSISTANT (offline, no AI) =================
function aiOnline(){return isBrain()?!!brainVia():aiCfg.prov==="builtin"?!!sampleFn:!!(aiCfg.key||aiCfg.prov==="custom")}
const LA={
  hi:false,
  t(en,hi){return this.hi?hi:en},
  nums(q){const out=[];const re=/(\d[\d,]*(?:\.\d+)?)\s*(k|l|lakh|lac|cr|crore|hazar|hazaar|hajar|thousand)?\b/gi;let m;while((m=re.exec(q))){let v=+m[1].replace(/,/g,"");const u=(m[2]||"").toLowerCase();if(u==="k"||/haz|haj|thousand/.test(u))v*=1e3;else if(/^l|lakh|lac/.test(u))v*=1e5;else if(/cr/.test(u))v*=1e7;out.push({v,i:m.index,raw:m[0]})}return out},
  period(q){return /\b(aaj|today|aj)\b/.test(q)?"today":/\b(kal|yesterday)\b/.test(q)&&!/\bkal\s+\d|\bkal\s+(subah|shaam|raat|dopahar)/.test(q)?"yesterday":/(pichle|last)\s*(mahine|month)/.test(q)?"lastmonth":/(mahine|month|mahina)/.test(q)?"month":/(hafte|week|hafta)/.test(q)?"week":/(\btotal\b|ab tak|all time|overall|\bkul\b)/.test(q)?"all":null},
  pname(p){return{today:this.t("Today","Aaj"),yesterday:this.t("Yesterday","Kal"),week:this.t("This week","Is hafte"),month:this.t("This month","Is mahine"),lastmonth:this.t("Last month","Pichle mahine"),all:this.t("All time","Ab tak")}[p]},
  findIn(q,list,key){const L=list.filter(x=>(x[key]||"").length>=2).sort((a,b)=>b[key].length-a[key].length);return L.find(x=>new RegExp("(^|[^a-z0-9])"+x[key].toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^a-z0-9]|$)").test(q))||null},
  party(q){return this.findIn(q,parties,"name")},
  bank(q){const ex=this.findIn(q,banks,"name");if(ex)return ex;const w=s=>String(s||"").toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>=3);return banks.find(b=>[...w(b.name),...w(b.bankName)].some(x=>new RegExp("(^|[^a-z0-9])"+x+"([^a-z0-9]|$)").test(q)))||null},
  trader(q){const L=Object.values(cpStats()).map(x=>({name:x.name}));return this.findIn(q,L,"name")},
  coin(q){const m=q.match(/\b(usdt|usdc|btc|eth|bnb)\b/);return m?m[1].toUpperCase():null},
};
function laReply(q0){const q=" "+q0.toLowerCase().replace(/\s+/g," ")+" ";LA.hi=LA.keepHi||pref("lang")!=="English"||/\b(kitna|kitni|kya|hai|ko|se|diya|aaj|kal|mera|mere|batao|bata|kaun|kab|kaise|hua|bacha|baki|baaki|dena|lena|karo|kar|kaisa|kaise|chal|raha|rha|ka|ki|ke|me|mein|nahi|tha|aur|bhai|matlab|kyu|kitne)\b/.test(q);
  const t=(a,b)=>LA.t(a,b),N=LA.nums(q),coin=LA.coin(q),P=LA.party(q),B=LA.bank(q),per=LA.period(q);
  const R=(text,actions)=>({ok:true,text,actions:actions||[]});
  // ---------- help
  if(/\b(help|madad|kya kar sakte|what can you|commands|kaise use)\b/.test(q))return R(t("I can answer from your data and prepare entries, without internet. Try:","Main aapke data se jawab de sakta hoon aur entry bana sakta hoon, bina internet ke. Aise poocho:")+"\n• aaj ka profit\n• is hafte kitna kamaya\n• Vineet ko kitna dena hai\n• SBI balance / UPI limit\n• USDT kitna bacha\n• Raju ka record\n• kis time order zyada aate hain\n• kis rate pe ad lagau\n• target kitna hua\n• 500 usdt 93 pe becha Ravi ko\n• Vineet ko 20000 diya SBI se IMPS\n• 300 kharcha khana\n• Raju fraud hai block karo\n• kal 11 baje Amit ko payment yaad dilana\n• profit aur balance batao\n• is hafte vs pichle hafte\n• top 5 traders · sabse bade orders\n• 2 oct ka profit · monday ka profit\n• 500 usdt 93 pe kitne ka · 1 lakh me kitne usdt 92 pe\n• uska record (pichle naam ka)");
  // ---------- COMMANDS
  // whatsapp
  if(/(whats ?app|watsapp|whatsap|watsap|\bwa\b|व्हाट्सएप)/.test(q)){const st=/(statement|pdf|hisab|hisaab)/.test(q);
    if(P)return R(t(`WhatsApp ${st?"statement":"payment update"} for ${P.name} is ready. Check and send:`,`${P.name} ka WhatsApp ${st?"statement":"payment update"} taiyaar hai. Check karke bhejo:`),[{type:"wa_send",party:P.id,kind:st?"stmt":"update"}]);
    return R(t("Which party? Say e.g. “Vineet ko WhatsApp update bhejo”, or open Menu → Tools → WhatsApp.","Kis party ko? Jaise bolo “Vineet ko WhatsApp update bhejo”, ya Menu → Tools → WhatsApp kholo."))}
  // reminder
  if(/(yaad|remind|reminder|alarm)/.test(q)){const now=new Date();let at=null;const d=new Date();
    if(/\bkal\b|tomorrow/.test(q))d.setDate(d.getDate()+1);const hm=q.match(/(\d{1,2})(?::(\d{2}))?\s*(baje|bje|am|pm|o'?clock)/);
    if(hm){let h=+hm[1];if(/pm/.test(hm[3])&&h<12)h+=12;if(/shaam|raat|evening|night/.test(q)&&h<12)h+=12;d.setHours(h,+(hm[2]||0),0,0);at=d.getTime()}
    else if(/(\d+)\s*(min|minute)/.test(q)){at=Date.now()+(+q.match(/(\d+)\s*(min|minute)/)[1])*6e4}
    else if(/(\d+)\s*(ghante|ghanta|hour|hr)/.test(q)){at=Date.now()+(+q.match(/(\d+)\s*(ghante|ghanta|hour|hr)/)[1])*36e5}
    else{const H=/subah|morning/.test(q)?10:/dopahar|afternoon/.test(q)?14:/shaam|evening/.test(q)?18:/raat|night/.test(q)?21:null;if(H!=null){d.setHours(H,0,0,0);at=d.getTime()}else if(/\bkal\b|tomorrow/.test(q)){d.setHours(10,0,0,0);at=d.getTime()}}
    if(at&&at<now.getTime())at+=DAY;
    const text=q0.replace(/\b(mujhe|muje|yaad|dilana|dila|dena|remind|me|reminder|set|karo|kar|do)\b/gi,"").replace(/\bkal\b|\btomorrow\b|\d{1,2}(:\d{2})?\s*(baje|bje|am|pm)|subah|shaam|raat|dopahar/gi,"").replace(/\s+/g," ").trim()||q0;
    return R(t("Reminder ready. Check and save:","Reminder taiyaar hai, check karke save karo:"),[{type:"add_reminder",text:text.slice(0,120),at:at||0}])}
  // block / trust
  const tr=LA.trader(q)||(P?{name:P.name}:null);
  if(tr&&/(block|fraud|chor|scam|dhoka|mat karna|blacklist)/.test(q))return R(t(`Block ${tr.name}?`,`${tr.name} ko block karna hai?`),[{type:"tag_counterparty",name:tr.name,tag:"block",note:q0.slice(0,100)}]);
  if(tr&&/(trusted|trust|bharosa|bharose|accha banda|achha banda|reliable)/.test(q)&&!/\?|kaisa|record/.test(q))return R(t(`Mark ${tr.name} as trusted?`,`${tr.name} ko trusted mark karu?`),[{type:"tag_counterparty",name:tr.name,tag:"star",note:""}]);
  // expense
  if(/(kharcha|kharch|expense|spent|kharche)/.test(q)&&N.length){const amt=N[0].v;const cat=/khana|food|chai|nashta|hotel|dinner|lunch/.test(q)?"Food":/petrol|diesel|travel|auto|cab|uber|ola|bus|train|ticket/.test(q)?"Travel":/rent|kiraya|kiraaya/.test(q)?"Rent":/bill|recharge|bijli|light|wifi|mobile/.test(q)?"Bills":/family|ghar|mummy|papa|bhai|wife/.test(q)?"Family":/shopping|kapde|clothes|amazon|flipkart/.test(q)?"Shopping":/dawai|doctor|medicine|hospital|health/.test(q)?"Health":"Other";
    return R(t("Expense ready:","Kharcha taiyaar:"),[{type:"add_expense",amount:amt,category:cat,bank:B?B.name:"",note:q0.slice(0,80)}])}
  // order
  const sellW=/(becha|bech|bechi|beche|sell|sold|bika)/.test(q),buyW=/(kharida|kharidi|kharide|khareeda|buy|bought|liya|liye|lia)/.test(q);
  if((sellW||buyW)&&N.length>=1&&!(P&&/(diya|de diya|bheja|pay|paid)/.test(q)&&!coin)){const side=sellW&&!buyW?"SELL":buyW&&!sellW?"BUY":/(becha|sell|sold)/.test(q)?"SELL":"BUY";
    let rate=null,qty=null;const rm=N.find(n=>new RegExp("(@|pe|par|at|rate|bhav|ke bhav)\\s*$").test(q.slice(Math.max(0,n.i-12),n.i))||/^\s*(pe|par|ke bhav|rs|₹)/.test(q.slice(n.i+n.raw.length,n.i+n.raw.length+8)));
    const cm=N.find(n=>/^\s*(usdt|usdc|btc|eth|coin)/.test(q.slice(n.i+n.raw.length,n.i+n.raw.length+6)));
    if(rm)rate=rm.v;if(cm)qty=cm.v;const rest=N.filter(n=>n!==rm&&n!==cm);
    if(rate==null){const c=rest.find(n=>n.v>=50&&n.v<=200&&(coin||"USDT")==="USDT");if(c){rate=c.v;rest.splice(rest.indexOf(c),1)}}
    if(qty==null&&rest.length)qty=rest[0].v;
    if(rate==null&&rest.length>1)rate=rest[1].v;
    let filled=[];if(qty&&rate==null){const lr=lastRate(coin||"USDT",sellW&&!buyW?"SELL":"BUY");if(lr){rate=lr;filled.push(LA.t("last rate","pichla rate")+" ₹"+lr)}}
    if(qty&&rate){const who=(q.match(side==="SELL"?/([a-z][a-z0-9]{1,20})\s+(ko|to)\b/:/([a-z][a-z0-9]{1,20})\s+(se|from)\b/)||[])[1];const bad=/^(usdt|usdc|btc|eth|pe|par|rate|direct|cash|p2p|ne|maine|mene|aaj|kal|bank|upi|imps)$/;
      const cpN=who&&!bad.test(who)?who:"";const hb=brHabit(cpN);let mode=/\bdirect\b/.test(q)?"Direct":/\bcash\b/.test(q)?"Cash":null;if(!mode){mode=hb&&hb.mode?hb.mode:"P2P";if(hb&&hb.mode&&hb.mode!=="P2P")filled.push(LA.t("usual type","hamesha wala type")+" "+mode)}
      let bk=B;if(!bk&&hb&&hb.bank&&mode!=="Direct"){bk=banks.find(x=>x.id===hb.bank)||null;if(bk)filled.push(LA.t("usual bank","hamesha wala bank")+" "+bk.name)}const st=/pending|baki|baaki/.test(q)?"Pending":"Completed";
      return R(t(`${side==="SELL"?"Sell":"Buy"} order ready (${fmtQ(qty)} × ₹${rate} = ${inr(Math.round(qty*rate))}).${filled.length?" "+LA.t("Filled from your habits","Aapki aadat se bhara")+": "+filled.join(", ")+".":""} Check and save:`,`${side==="SELL"?"Sell":"Buy"} order taiyaar (${fmtQ(qty)} × ₹${rate} = ${inr(Math.round(qty*rate))}).${filled.length?" "+LA.t("Filled from your habits","Aapki aadat se bhara")+": "+filled.join(", ")+".":""} Check karke save karo:`),[{type:"add_order",side,coin:coin||"USDT",qty,rate,mode,status:st,counterparty:who&&!bad.test(who)?who.replace(/^./,c=>c.toUpperCase()):"",banks:bk&&mode!=="Direct"?[{bank:bk.name,amount:Math.round(qty*rate*100)/100,method:/imps/.test(q)?"IMPS":/neft/.test(q)?"NEFT":"UPI"}]:[]}])}}
  // party payment
  if(P&&N.length&&/(diya|de diya|dia|bheja|bhej|pay|paid|transfer|dala|daal|jama)/.test(q)&&!/(kitna|kitni|\?)/.test(q)){const amt=Math.max(...N.map(n=>n.v));const acc=(P.accounts||[]).find(a=>[a.holder,a.upi].some(v=>v&&v.length>=3&&q.includes(v.toLowerCase())));
    const by=(q.match(/([a-z]{2,20})\s+ne\b/)||[])[1];const me=!by||/^(maine|mene|main|mai)$/.test(by);
    let pb=B,ph="";if(me&&!pb){const hh=brPartyHabit(P.id);if(hh.bank){pb=banks.find(x=>x.id===hh.bank)||null;if(pb)ph=" "+LA.t(`(usual bank ${pb.name})`,`(hamesha wala bank ${pb.name})`)}}
    return R(t(`Payment to ${P.name} ready:${ph}`,`${P.name} ka payment taiyaar:${ph}`),[{type:"pay_party",party:P.name,amount:amt,to_account:acc?(acc.holder||acc.bankName||acc.upi):"",paid_by:me?"me":by.replace(/^./,c=>c.toUpperCase()),banks:me&&pb?[{bank:pb.name,amount:amt,method:/upi/.test(q)?"UPI":/neft/.test(q)?"NEFT":"IMPS"}]:[],note:""}])}
  // ---------- QUESTIONS
  // party dues
  if(P&&/(dena|dene|baki|baaki|bacha|due|kitna|kitni|hisab|hisaab|left|payment|kab|kisko|kis ko)/.test(q)){const owed=partyOwed(P.id),paid=partyPaid(P.id),left=owed-paid;const lf=accLefts(P);
    const pe=(P.accounts||[]).filter(a=>+a.target).map(a=>`• ${a.holder||a.bankName||a.upi}: ${lf[a.id]>0.5?t("left ","baki ")+inr(Math.round(lf[a.id])):"✓ "+t("done","ho gaya")}${a.due&&lf[a.id]>0.5?` (${t("by ","")}${new Date(a.due).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}${t(""," tak")}${daysTo(a.due)<0?" ⚠ "+t("overdue","date nikal gayi"):""})`:""}`).join("\n");
    const wk=+P.weekly?`\n${t("This week","Is hafte")}: ${inr(Math.round(partyPaidWeek(P.id)))} / ${inr(+P.weekly)}`:"";
    return R(`${P.name}: ${t("to pay","dena tha")} ${inr(Math.round(owed))}, ${t("paid","diya")} ${inr(Math.round(paid))}, ${left>=0?t("left","baki")+" "+inr(Math.round(left)):t("extra paid","zyada diya")+" "+inr(Math.round(-left))}.${wk}${pe?"\n"+pe:""}`)}
  if(/(kis kis ko|kisko|kis ko|kaun kaun|sab party|all parties|parties)/.test(q)&&/(dena|baki|baaki|due|pay)/.test(q)){const L=parties.map(p=>[p.name,partyOwed(p.id)-partyPaid(p.id)]).filter(x=>x[1]>0.5).sort((a,b)=>b[1]-a[1]);
    return R(L.length?t("Left to pay:","Baki payment:")+"\n"+L.map(([n,v])=>`• ${n}: ${inr(Math.round(v))}`).join("\n")+`\n${t("Total","Kul")}: ${inr(Math.round(L.reduce((t,x)=>t+x[1],0)))}`:t("Nothing left to pay.","Kisi ka kuch baki nahi."))}
  // limits
  if(/limit/.test(q)){const use=limitUse();const L=(B?[B]:banks).filter(b=>b.type!=="Cash").map(b=>{const lim=b.limits||{};const parts=["UPI","IMPS","NEFT"].filter(m=>+lim[m]).map(m=>`${m} ${inr(Math.round(Math.max(0,+lim[m]-(((use[b.id]||{})[m])||0))))}`);return`• ${b.name}: ${parts.length?parts.join(", "):t("no limit set","limit set nahi")}`});
    return R(t("Limit left:","Bachi limit:")+"\n"+L.join("\n"))}
  // balance
  if(B||/(balance|bank me|account me|paisa kitna|kitna paisa|net worth|total paisa|money)/.test(q)&&!/(profit|kamaya)/.test(q)){const {bal}=balances();if(B)return R(`${B.name}: ${inr(Math.round(bal[B.id]))}`);
    const tot=banks.reduce((t,b)=>t+bal[b.id],0);const A=ACC();return R(t("Balances:","Balance:")+"\n"+banks.map(b=>`• ${b.name}: ${inr(Math.round(bal[b.id]))}`).join("\n")+`\n${t("Total","Kul")}: ${inr(Math.round(tot))}`+`\n${t("Net worth (money + coins − dues)","Net worth (paisa + coin − udhaar)")}: ${inr(Math.round(A.netWorth))}`)}
  // stock
  if((coin||/stock|bacha|baki usdt|coin/.test(q))&&/(kitna|kitni|bacha|stock|left|hai|how much)/.test(q)&&!/(profit|rate|bhav)/.test(q)){const st=stockLeft();const L=Object.entries(st).filter(([c,v])=>!coin||c===coin);
    return R(L.length?L.map(([c,v])=>`${c}: ${fmtQ(+v.toFixed(4))}${v<0?" ⚠ "+t("below zero, check opening stock","zero se kam, opening stock check karo"):""}`).join("\n"):t("No stock data yet.","Abhi stock ka data nahi."))}
  // trader record
  if(tr&&/(record|history|kaisa|kesa|trust|cancel|kitne order|details|info|bharosa)/.test(q)){const D=traderData(tr.name);if(!D.total)return R(t(`No orders with ${tr.name}.`,`${tr.name} ke saath koi order nahi.`));
    return R(`${tr.name}: ${D.total} ${t("orders","orders")}, ${D.canc} ${t("cancelled","cancel")}, ${D.ap} appeal, ${t("completion","completion")} ${Math.round(D.comp*100)}%.\n${t("Volume","Volume")} ${inr(Math.round(D.vol))} · ${t("trust score","trust score")} ${D.score}/100${D.tag&&D.tag.tag==="block"?" ⛔ blocked":D.tag&&D.tag.tag==="star"?" ★ trusted":""}.\n${t("Last order","Last order")}: ${dfmt(D.last)}.`)}
  // best time
  if(/(time|kab|kis waqt|kis samay|ghante|hour)/.test(q)&&/(order|trade|ad|cancel|zyada|jada|best)/.test(q)){const {G}=bestTimeData("90");const byB=[...Array(12)].map((_,h)=>G.reduce((t,r)=>({n:t.n+r[h].n,c:t.c+r[h].c}),{n:0,c:0}));const tot=byB.reduce((t,x)=>t+x.n,0);if(!tot)return R(t("Not enough orders yet.","Abhi orders kam hain."));
    const w=i=>hLab(i*2)+"–"+hLab(i*2+2);const top=byB.map((x,i)=>[x.n,i]).sort((a,b)=>b[0]-a[0]).slice(0,3);const c=byB.map((x,i)=>[x.c,i]).sort((a,b)=>b[0]-a[0])[0];
    return R(t("Busiest times (90 days):","Sabse zyada orders (90 din):")+"\n"+top.map(([n,i])=>`• ${w(i)}: ${n} orders`).join("\n")+(c[0]?`\n${t("Most cancels","Sabse zyada cancel")}: ${w(c[1])} (${c[0]})`:""))}
  // rate suggestion
  if(/(rate|bhav|price)/.test(q)&&/(ad|lagau|lagaun|lagana|suggest|kya rakhu|kitna rakhu|best|sahi)/.test(q)){const g=rateSuggest(coin||pref("coin")||"USDT");if(!g.sell&&!g.buy)return R(t("Not enough recent orders.","Haal ke orders kam hain."));
    return R(`${t("Based on where your orders filled (7 days)","Pichle 7 din me jahan orders bhare")}:\n• Sell ad: ₹${g.sell?g.sell.toFixed(2):"—"}\n• Buy ad: ₹${g.buy?g.buy.toFixed(2):"—"}${g.sell&&g.buy?`\n• Spread: ${(g.sell-g.buy).toFixed(2)} / USDT`:""}`)}
  // target
  if(/target/.test(q)){const I=targetInfo();if(!I.T)return R(t("No monthly target set. Open Insights → Target.","Mahine ka target set nahi. Insights → Target me set karo."));
    return R(`${t("Target","Target")} ${inr(I.T)}: ${inr(Math.round(I.earned))} ${t("earned","kamaya")} (${Math.round(I.pct)}%).\n${I.earned<I.T?`${t("Need","Roz chahiye")} ${inr(Math.round(I.perDay))}${t("/day","")} · ${t("month end at this pace","is speed se mahina khatam")} ${inr(Math.round(I.proj))}`:t("Target done!","Target poora ho gaya!")}`)}
  // score
  if(/(score|rating|grade|completion)/.test(q)){const D=scoreData("30");if(!D.closed)return R(t("Not enough orders.","Orders kam hain."));return R(`${t("Merchant score (30 days)","Merchant score (30 din)")}: ${D.score}/100 (${grade(D.score)[0]}).\nCompletion ${Math.round(D.comp*100)}%, cancel ${Math.round(D.cr*100)}%, appeals ${D.app}.`)}
  // cash flow
  if(/(cash flow|cashflow|paisa kam|kam padega|agle hafte|next week|aage)/.test(q)){const F=cashFlow(true);return R(F.short?t(`Money may run short on ${new Date(F.short.t).toLocaleDateString("en-IN",{weekday:"long"})} by ${inr(Math.round(-F.short.bal))}.`,`${new Date(F.short.t).toLocaleDateString("en-IN",{weekday:"long"})} ko ${inr(Math.round(-F.short.bal))} kam pad sakta hai.`):t(`Covered for 7 days. To pay: ${inr(Math.round(F.totOut))}.`,`7 din ka paisa poora hai. Dena hai: ${inr(Math.round(F.totOut))}.`))}
  // loss
  if(/(loss|nuksan|nuksaan|ghata|ghaata)/.test(q)){const D=lossData(per==="week"?"7":per==="all"?"all":"30");return R(`${t("Loss trades","Loss wale trade")}: ${D.out.length} (${inr(Math.round(D.tot))}).\n${t("Cancelled","Cancel")}: ${D.canc.length} · ${t("expenses","kharcha")} ${inr(Math.round(D.exT))}.${D.out[0]?`\n${t("Worst","Sabse bura")}: ${D.out[0].o.side} ${fmtQ(D.out[0].o.qty)} @ ₹${fmtR(D.out[0].o.rate)} (−${inr(Math.round(D.out[0].loss))})`:""}`)}
  // pending
  if(/(pending|appeal|open order|atka|ruka)/.test(q)){const L=orders.filter(o=>o.status==="Pending"||o.status==="Appeal").sort((a,b)=>a.time-b.time);return R(L.length?t(`${L.length} open:`,`${L.length} order khule:`)+"\n"+L.slice(0,8).map(o=>`• ${o.status} ${o.side} ${fmtQ(o.qty)} ${o.coin}${o.cp?" · "+o.cp:""} · ${tfmt(o.time)}`).join("\n"):t("No pending orders.","Koi pending order nahi."))}
  // report
  if(/(report|hisab|hisaab|summary)/.test(q)){return R(nightReport(per==="yesterday"?1:0).text)}
  // profit / volume / orders
  if(/(profit|munafa|munafe|kamaya|kamai|kamaai|earning|income|volume|kitne order|orders)/.test(q)||(per&&btok(q).length<=4)){const p=per||"today";const [a,b]=periodRange(p);const ol=orders.filter(o=>o.time>=a&&o.time<b);const st=stats(ol);const ex=exps.filter(x=>x.time>=a&&x.time<b).reduce((t,x)=>t+(+x.amt||0),0);const done=ol.filter(o=>o.status==="Completed");
    return R(`${LA.pname(p)}: ${t("profit","profit")} ${sgn(st.profit)}${ex?` · ${t("after expenses","kharche ke baad")} ${sgn(st.profit-ex)}`:""}\n${ol.length} orders (${done.length} done, ${ol.filter(o=>o.status==="Cancelled").length} cancel)\n${t("Bought","Kharida")} ${fmtQ(+st.b.q.toFixed(2))}${st.b.avg?" @ ₹"+st.b.avg.toFixed(2):""} · ${t("Sold","Becha")} ${fmtQ(+st.s.q.toFixed(2))}${st.s.avg?" @ ₹"+st.s.avg.toFixed(2):""}`)}
  return{ok:false}}
ACT.add_reminder={d:a=>`Reminder: ${a.text}${a.at?" · "+new Date(a.at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}):""}`,run:async a=>{if(!a.text)throw new Error("empty");await putRec({id:"rm_"+Date.now().toString(36),kind:"remind",text:String(a.text).slice(0,140),at:+a.at||0,done:false,time:Date.now()})}};
// ---- P2P Brain memory: words and phrases the user teaches
const BRAIN_CHIPS=[["aaj ka profit","Today's profit"],["is hafte kitna kamaya","This week"],["kis kis ko dena baki hai","Parties to pay"],["balance","Balances"],["limit","Limits"],["usdt kitna bacha","Stock"],["pending orders","Pending"],["kis time order zyada aate hain","Best time"],["kis rate pe ad lagau","Ad rate"],["target kitna hua","Target"],["mera score","Score"],["agle hafte paisa kam padega","Cash flow"],["loss kitna hua","Loss"],["aaj ka report","Report"]];
const brainRecs=()=>recs.filter(r=>r.kind==="brain");
const btok=t=>String(t||"").toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]/g," ").split(/\s+/).filter(Boolean);
function brainApply(q){let x=" "+q.toLowerCase()+" ";brainRecs().filter(r=>r.type==="alias").sort((a,b)=>b.from.length-a.from.length).forEach(r=>{x=x.replace(new RegExp("(^|[^a-z0-9])"+r.from.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?=[^a-z0-9]|$)","g"),"$1"+r.to.toLowerCase())});
  const T=btok(x);let best=null,bs=0;brainRecs().filter(r=>r.type==="phrase").forEach(r=>{const F=btok(r.from);const inter=F.filter(w=>T.includes(w)).length;const sc=inter/Math.max(F.length,T.length);if(sc>bs){bs=sc;best=r}});
  if(best&&(bs>=0.75||(bs>=0.6&&btok(best.from).length>=3))&&!BR_GREET.test(x.trim()))return{q:best.to,learned:best};return{q:x.trim(),learned:null}}
async function brainTeach(type,from,to){from=String(from).trim().toLowerCase().slice(0,80);to=String(to).trim().slice(0,120);if(!from||!to)return;const id="br_"+type+"_"+from.replace(/[^a-z0-9]+/g,"_").slice(0,40);await putRec({id,kind:"brain",type,from,to,time:Date.now()})}
function brainMeta(q0,out){const q=q0.toLowerCase().trim();
  // teach alias: "X matlab Y" / "X means Y" / "X = Y"
  let m=q.match(/^(.{1,30}?)\s+(?:ka\s+)?(?:matlab|means|mtlb|=)\s+(.{1,60})$/);
  if(m&&!/\d{3,}/.test(m[1])&&!/^(kya|what|kaun|kaise|kab|kyu|why|how)\b/.test(m[2])&&!/\?$/.test(q)){brainTeach("alias",m[1],m[2]).then(()=>{out.textContent=LA.t(`Learned: "${m[1]}" = "${m[2]}"`,`Seekh liya: "${m[1]}" matlab "${m[2]}"`);out.insertAdjacentHTML("beforeend",'<span class="labadge">P2P Brain · learned</span>')});return true}
  if(/^(kya seekha|kya sikha|what did you learn|brain|memory|yaad kya hai)\b/.test(q)){const B=brainRecs();out.textContent=B.length?LA.t("I have learned:","Maine ye seekha hai:")+"\n"+B.map(r=>`• "${r.from}" → ${r.to}`).join("\n")+"\n"+LA.t('Say "forget <word>" to remove.','Hatana ho to "bhool jao <shabd>" likho.')+"\n"+LA.t("Open Brain page: menu → Tools → P2P Brain","Brain page: menu → Tools → P2P Brain"):LA.t('Nothing taught yet. Teach me like: "sb matlab SBI".','Abhi kuch nahi seekha. Aise sikhao: "sb matlab SBI".');out.insertAdjacentHTML("beforeend",'<span class="labadge">P2P Brain</span>');return true}
  m=q.match(/^(?:bhool jao|bhul jao|forget)\s+(.{1,60})$/);if(m){const B=brainRecs().filter(r=>r.from===m[1].trim());Promise.all(B.map(r=>delRec(r.id))).then(()=>{out.textContent=B.length?LA.t(`Forgot "${m[1]}".`,`"${m[1]}" bhool gaya.`):LA.t(`I didn't know "${m[1]}".`,`"${m[1]}" mujhe yaad hi nahi tha.`)});return true}
  return false}
function brainAsk(q,out){out.textContent=LA.t("I didn't get that yet. What did you mean? Tap one and I'll remember it next time:","Ye abhi samajh nahi aaya. Aapka matlab kya tha? Ek chuno, agli baar se main yaad rakhunga:");
  const w=document.createElement("div");w.className="brchips";w.innerHTML=BRAIN_CHIPS.map(([k,l])=>`<button type="button" data-bq="${esc(k)}">${esc(l)}</button>`).join("");out.appendChild(w);
  w.onclick=async e=>{const b=e.target.closest("[data-bq]");if(!b)return;w.remove();const ik=Object.keys(BR_INTENTS).find(k=>BR_INTENTS[k][0]===b.dataset.bq);if(ik)brLearn(ik,q,3);try{await brainTeach("phrase",q,b.dataset.bq)}catch(err){}const o2=addMsg("a","…");laAnswer(b.dataset.bq,o2);o2.insertAdjacentHTML("beforeend",'<span class="labadge">P2P Brain · learned this phrase</span>')}}
// ---- P2P Brain v2: intent learning (naive Bayes), fuzzy names, habits, feedback
const BR_INTENTS={
  profit_today:["aaj ka profit",["aaj kitna kamaya","aaj ka munafa","today profit","aaj kaisa raha","aaj ki kamai","aaj kitna bana"]],
  profit_week:["is hafte kitna kamaya",["hafte ka profit","week profit","is week kamai","dhanda kaisa chal raha","hafta kaisa gaya"]],
  profit_month:["is mahine ka profit",["mahine ki kamai","month profit","is mahine kitna bana","mahina kaisa gaya"]],
  dues_all:["kis kis ko dena baki hai",["kiska paisa dena hai","baki payment","udhaar kitna","sabko kitna dena","party ka baki"]],
  balance:["balance",["paisa kitna hai","account me kitna","bank balance","total paisa","net worth"]],
  limit:["limit",["upi limit","imps limit","kitni limit bachi","limit khatam","limit kitni hai"]],
  stock:["usdt kitna bacha",["stock kitna","coin kitne hai","usdt balance","kitna usdt hai","maal kitna bacha"]],
  pending:["pending orders",["kaun sa order atka","open order","appeal wale","ruka hua order","pending kitne"]],
  besttime:["kis time order zyada aate hain",["kab trade karu","best time","kis samay order aate","raat ko cancel","kab order aate"]],
  rate:["kis rate pe ad lagau",["ad ka rate","bhav kya rakhu","sell rate kya","buy rate kitna","rate suggest"]],
  target:["target kitna hua",["mahine ka target","goal kitna","target status"]],
  score:["mera score",["merchant score","completion rate","rating kaisi","performance"]],
  cashflow:["agle hafte paisa kam padega",["cash flow","paisa kab kam","aage ka hisaab","agle 7 din"]],
  loss:["loss kitna hua",["nuksaan","ghata","galat trade","kahan loss"]],
  report:["aaj ka report",["hisaab do","summary","din ka report","aaj ka hisaab"]]};
const BR_LABEL={profit_today:"Today's profit",profit_week:"This week",profit_month:"This month",dues_all:"Parties to pay",balance:"Balances",limit:"Limits",stock:"Stock",pending:"Pending",besttime:"Best time",rate:"Ad rate",target:"Target",score:"Score",cashflow:"Cash flow",loss:"Loss",report:"Report"};
const BR_STOP=new Set("ka ki ke ko se me mein hai h tha the hu ho kya kitna kitni bhai yaar please plz do de batao bata the a an is of to".split(" "));
const brTok=t=>btok(t).filter(w=>w.length>1&&!BR_STOP.has(w));
function brStats(){return recs.find(r=>r.id==="br_stats")||{id:"br_stats",kind:"brainstat",tc:{},dc:{},fb:{up:0,down:0},answered:0,fuzzy:0}}
let brPending=null,brT=null;function brSave(st){brPending=st;clearTimeout(brT);brT=setTimeout(()=>{const x=brPending;brPending=null;
  Object.keys(x.tc).forEach(k=>{const e=Object.entries(x.tc[k]);if(e.length>250)x.tc[k]=Object.fromEntries(e.sort((a,b)=>b[1]-a[1]).slice(0,250))});putRec({...x,time:Date.now()}).catch(()=>{})},800)}
function brLearn(intent,q,w){const st=JSON.parse(JSON.stringify(brPending||brStats()));st.tc[intent]=st.tc[intent]||{};brTok(q).forEach(t=>st.tc[intent][t]=(st.tc[intent][t]||0)+(w||1));st.dc[intent]=(st.dc[intent]||0)+1;brSave(st);return st}
function brClassify(q){const T=brTok(q);if(!T.length)return null;const st=brPending||brStats();const scores={};let V=new Set();
  const data={};Object.entries(BR_INTENTS).forEach(([k,[c,seeds]])=>{const m={};[c,...seeds].forEach(s=>brTok(s).forEach(t=>m[t]=(m[t]||0)+2));Object.entries(st.tc[k]||{}).forEach(([t,n])=>m[t]=(m[t]||0)+n);data[k]=m;Object.keys(m).forEach(t=>V.add(t))});
  const known=T.filter(t=>V.has(t));if(!known.length)return null;
  Object.entries(data).forEach(([k,m])=>{const tot=Object.values(m).reduce((a,b)=>a+b,0);let lp=Math.log(1+(st.dc[k]||0)+seedsN(k));known.forEach(t=>lp+=Math.log(((m[t]||0)+0.2)/(tot+0.2*V.size)));scores[k]=lp});
  const arr=Object.entries(scores).sort((a,b)=>b[1]-a[1]);const mx=arr[0][1];const ex=arr.map(([k,v])=>[k,Math.exp(v-mx)]);const sum=ex.reduce((a,x)=>a+x[1],0);
  return{intent:arr[0][0],p:ex[0][1]/sum,second:arr[1][0],cover:known.length/T.length}}
function seedsN(k){return BR_INTENTS[k][1].length+1}
// fuzzy name match (typos)
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m||!n)return m||n;const d=[...Array(m+1)].map((_,i)=>[i,...Array(n).fill(0)]);for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){const c=a[i-1]===b[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}return d[m][n]}
function brFuzzy(q){const names=[...parties.map(p=>p.name),...banks.map(b=>b.name),...Object.values(cpStats()).map(x=>x.name)].filter(n=>n&&n.length>=4);const words=btok(q).filter(w=>w.length>=4&&!/^\d+$/.test(w));
  const hits=[];words.forEach(w=>{if(names.some(n=>n.toLowerCase().split(/\s+/).includes(w)))return;let best=null,bd=9;names.forEach(n=>{n.toLowerCase().split(/\s+/).forEach(nw=>{if(nw.length<4)return;const d=lev(w,nw);const lim=nw.length>=7?2:1;if(d<=lim&&d<bd){bd=d;best=nw}})});if(best)hits.push([w,best])});
  const VOC=["batao","record","profit","balance","limit","pending","target","report","history","becha","kharida","kharcha","expense","payment","stock","score","nuksaan","munafa","remind","block","bacha","hafte","mahine","appeal","cancel","report","hisaab"];
  words.forEach(w=>{if(w.length<5||VOC.includes(w)||hits.some(h=>h[0]===w)||names.some(n=>n.toLowerCase().split(/\s+/).includes(w)))return;const v=VOC.find(x=>Math.abs(x.length-w.length)<=1&&lev(w,x)<=1);if(v)hits.push([w,v])});return hits}
// habits used to fill missing details
function brHabit(cp){const L=orders.filter(o=>o.cp&&cp&&o.cp.toLowerCase()===cp.toLowerCase());if(!L.length)return null;const cnt=f=>{const c={};L.forEach(o=>{const v=f(o);if(v)c[v]=(c[v]||0)+1});const t=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];return t?t[0]:null};
  return{mode:cnt(o=>modeOf(o)),bank:cnt(o=>(o.splits||[])[0]&&o.splits[0].bank),side:cnt(o=>o.side),n:L.length}}
function brPartyHabit(pid){const c={},by={};ppays.filter(x=>x.party===pid).forEach(x=>{(x.splits||[]).forEach(sp=>c[sp.bank]=(c[sp.bank]||0)+1);by[x.paidBy||"me"]=(by[x.paidBy||"me"]||0)+1});const t=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];return{bank:t?t[0]:null}}
function brFeedback(out,intent,q){const f=document.createElement("div");f.className="brfb";f.innerHTML=`<button type="button" data-fb="up">👍</button><button type="button" data-fb="down">👎</button>`;out.appendChild(f);
  f.onclick=e=>{const b=e.target.closest("[data-fb]");if(!b)return;const st=JSON.parse(JSON.stringify(brPending||brStats()));st.fb=st.fb||{up:0,down:0};
    if(b.dataset.fb==="up"){st.fb.up++;brSave(st);if(intent)brLearn(intent,q,2);f.innerHTML=`<span>${LA.t("Thanks, learned","Shukriya, yaad rakhunga")} ✓</span>`}
    else{st.fb.down++;brSave(st);f.remove();brAskFix(q,out)}}}
function brAskFix(q,out){const w=document.createElement("div");w.className="brchips";w.innerHTML=`<small>${LA.t("What did you mean?","Aapka matlab kya tha?")}</small>`+Object.keys(BR_INTENTS).map(k=>`<button type="button" data-bi="${k}">${BR_LABEL[k]}</button>`).join("");out.appendChild(w);
  w.onclick=async e=>{const b=e.target.closest("[data-bi]");if(!b)return;w.remove();const k=b.dataset.bi;brLearn(k,q,3);try{await brainTeach("phrase",q,BR_INTENTS[k][0])}catch(err){}const o2=addMsg("a","…");const r=laReply(BR_INTENTS[k][0]);o2.textContent=r.ok?r.text:"…";o2.insertAdjacentHTML("beforeend",`<span class="labadge">P2P Brain · ${LA.t("learned this","ye seekh liya")}</span>`)}}
function brCount(){const st=JSON.parse(JSON.stringify(brPending||brStats()));st.answered=(st.answered||0)+1;brSave(st)}
// Brain page
sheets.brain=function(){const st=brPending||brStats(),B=brainRecs(),al=B.filter(r=>r.type==="alias"),ph=B.filter(r=>r.type==="phrase");const fb=st.fb||{up:0,down:0},acc=fb.up+fb.down?Math.round(fb.up/(fb.up+fb.down)*100):null;
  const learnedWords=Object.values(st.tc||{}).reduce((t,m)=>t+Object.keys(m).length,0);const H=habits();
  const lvl=Math.min(100,Math.round(10+al.length*4+ph.length*5+learnedWords*0.4+(st.answered||0)*0.5+fb.up*2+(st.fromAi||0)*3));
  openSheet(`<div class="insw"><div class="insh"><h3>P2P Brain</h3><span class="note">${isBrain()?"active":"backup when AI is off"}</span></div>
    <div class="tgh">${ring(lvl,100,"#8b5cf6",lvl,"brain level")}<div class="tgk"><div><span>Questions answered</span><b>${st.answered||0}</b></div><div><span>Accuracy (your 👍/👎)</span><b>${acc==null?"—":acc+"%"}</b></div></div></div>
    <div class="msgr">${[["Words taught",al.length],["Phrases taught",ph.length],["Words learned",learnedWords],["Typos fixed",st.fuzzy||0],["Learned from Claude",st.fromAi||0],["👍 / 👎",fb.up+" / "+fb.down]].map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join("")}</div>
    <div class="rml" style="margin-bottom:12px"><div class="dqr"><span>Smart mode<small>${sampleFn||brainKeyMode()?"Hard questions go to "+(aiCfg.prov==="braingemini"&&!sampleFn?"Gemini":"Claude")+", and I learn from its answers":"Pick “P2P Brain + Gemini” (free) or “P2P Brain + Claude” in Settings → AI and add the key"}</small></span><label class="tog"><input type="checkbox" id="br-smart" ${pref("brainSmart")!==false?"checked":""} ${sampleFn||brainKeyMode()?"":"disabled"}><span></span></label></div></div>
    <div class="pcsec">What I learned from your business</div>${insList(H.slice(0,10).map(h=>["ok",esc(h)]))}
    <div class="pcsec">Words & phrases you taught <span>${B.length}</span></div>
    <div class="rml">${B.length?B.sort((a,b)=>b.time-a.time).map(r=>`<div class="rmi" style="grid-template-columns:1fr auto"><div class="rmt"><b>"${esc(r.from)}"</b><small>${r.type==="alias"?"means":"answers as"} ${esc(r.to)}</small></div><button type="button" class="link del" data-brdel="${r.id}">Forget</button></div>`).join(""):'<p class="note" style="padding:10px 0">Nothing yet. In AI Agent type e.g. "sb matlab SBI".</p>'}</div>
    <div class="pcsec">How I learn</div>${insList([["ok","<b>Smart mode</b>: questions I can't answer go to Claude. I watch the answer and learn, so next time I answer offline."],["ok","Teach a word: <b>vinu matlab Vineet</b>"],["ok","Tap 👍 / 👎 under my answers. 👎 lets you pick the right meaning."],["ok","Spelling mistakes in names are fixed and remembered."],["ok","Missing rate, bank or deal type in a command is filled from your past orders."]])}
    <div class="pcact" style="grid-template-columns:1fr 1fr"><button type="button" class="mini ghost" id="br-exp">Export brain</button><button type="button" class="mini ghost" id="br-reset" style="color:var(--sell)">Reset brain</button></div></div>`,el=>{
    const sm=el.querySelector("#br-smart");if(sm)sm.onchange=()=>{setPref("brainSmart",sm.checked);toast(sm.checked?"Smart mode on":"Smart mode off");setTimeout(()=>{$("#apSub")&&($("#apSub").textContent=aiOnline()?"P2P Brain + Claude":"P2P Brain · offline")},50)};
    el.querySelectorAll("[data-brdel]").forEach(b=>b.onclick=async()=>{try{await delRec(b.dataset.brdel);sheets.brain()}catch(e){}});
    el.querySelector("#br-exp").onclick=()=>saveFile("Pexai-brain-"+new Date().toLocaleDateString("en-CA")+".json",JSON.stringify({brain:brainRecs(),stats:brPending||brStats()},null,1));
    twoTap(el.querySelector("#br-reset"),async()=>{for(const r of [...brainRecs(),...recs.filter(r=>r.id==="br_stats")])await delRec(r.id);brPending=null;toast("Brain reset");sheets.brain()});
  })};
// ---- P2P Brain v3: conversation, context, maths, compare, multi-ask, dates
LA.ctx={party:null,trader:null,bank:null,lastQ:null};
const BR_GREET=/^(hi+|hello+|hey+|helo|namaste|namaskar|ram ram|jai shree ram|good (morning|evening|afternoon|night)|gm|salam|hii+)\b/;
function brGreetBrief(q){const n=(pref("owner")||"").split(" ")[0];const h=new Date().getHours();const said=String(q||"").match(/good (morning|afternoon|evening|night)|\bgm\b|\bgn\b/);const g=said?(said[0]==="gm"?"Good morning":said[0]==="gn"?"Good night":said[0].replace(/^g/,"G")):h<12?LA.t("Good morning","Good morning"):h<17?LA.t("Good afternoon","Namaste"):LA.t("Good evening","Good evening");
  const st=stats(orders.filter(o=>isToday(o.time)));const pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal").length;const dues=parties.map(p=>[p.name,partyOwed(p.id)-partyPaid(p.id)]).filter(x=>x[1]>0.5).sort((a,b)=>b[1]-a[1]);
  const urg=(lastAlerts||[]).filter(a=>a.hi).length;const L=[`${g}${n?" "+n:""}! 👋`,LA.t(`Today: profit ${sgn(st.profit)}, ${orders.filter(o=>isToday(o.time)).length} orders.`,`Aaj: profit ${sgn(st.profit)}, ${orders.filter(o=>isToday(o.time)).length} orders.`)];
  if(pend)L.push(LA.t(`${pend} order${pend>1?"s":""} still open.`,`${pend} order abhi khule hain.`));if(dues[0])L.push(LA.t(`Biggest due: ${dues[0][0]} ${inr(Math.round(dues[0][1]))}.`,`Sabse bada baki: ${dues[0][0]} ${inr(Math.round(dues[0][1]))}.`));if(urg)L.push(LA.t(`${urg} urgent alert${urg>1?"s":""} on Home.`,`Home pe ${urg} zaroori alert.`));
  L.push(LA.t("What would you like to know?","Kya jaanna hai?"));return L.join("\n")}
// vague "kya hua / kya chal raha / update" → activity brief
const BR_VAGUE=/^(kya\s*hu+a+|kya\s*hua\s*aaj|aaj\s*kya\s*hua|kya\s*chal\s*raha|kya\s*chal\s*rha|kya\s*update|update\s*(do|batao|kya)?|status|kya\s*naya|kuch\s*naya|aur\s*batao|aur\s*bata|kya\s*scene|kya\s*haal|business\s*kaisa|sab\s*th[ei]+k|kya\s*khabar|what'?s\s*up|what\s*happened|news|summary\s*do|haal\s*chaal|kya\s*hal)\b/;
function brActivity(){const now=Date.now(),ev=[];
  orders.forEach(o=>ev.push([o.time,`${o.side==="BUY"?"🟢":"🔴"} ${o.side} ${fmtQ(o.qty)} ${o.coin} @ ₹${fmtR(o.rate)}${o.cp?" · "+o.cp:""}${o.status!=="Completed"?" ("+o.status+")":""}`]));
  ppays.forEach(x=>ev.push([x.time,`🤝 ${LA.t("Paid","Payment")} ${(parties.find(p=>p.id===x.party)||{}).name||"party"} ${inr(Math.round(+x.amt||0))}${x.paidBy&&x.paidBy!=="me"?" · by "+x.paidBy:""}`]));
  pdues.forEach(x=>ev.push([x.time,`📥 ${(parties.find(p=>p.id===x.party)||{}).name||"party"}: +${inr(Math.round(+x.amt||0))} ${LA.t("to pay","dena")}`]));
  exps.forEach(x=>ev.push([x.time,`🧾 ${x.cat||LA.t("Expense","Kharcha")} ${inr(Math.round(+x.amt||0))}`]));
  ev.sort((a,b)=>b[0]-a[0]);const ago=t=>{const m=Math.round((now-t)/6e4);return m<60?m+"m":m<1440?Math.round(m/60)+"h":Math.round(m/1440)+"d"};
  const st=stats(orders.filter(o=>isToday(o.time)));const tdN=orders.filter(o=>isToday(o.time)).length;const pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal").length;const urg=(lastAlerts||[]).filter(a=>a.hi);
  const L=[LA.t(`Today: ${tdN} orders · profit ${sgn(st.profit)}`,`Aaj: ${tdN} orders · profit ${sgn(st.profit)}`)];
  if(pend)L.push(LA.t(`⏳ ${pend} order${pend>1?"s":""} open`,`⏳ ${pend} order khule hain`));urg.slice(0,3).forEach(a=>L.push("⚠ "+a.t));
  if(ev.length){L.push("",LA.t("Latest activity:","Taaza activity:"));ev.slice(0,6).forEach(([t,x])=>L.push(`• ${x} · ${ago(t)} ${LA.t("ago","pehle")}`))}else L.push(LA.t("No activity yet.","Abhi koi activity nahi."));
  return L.join("\n")}
function brClock(q){if(/(order|profit|trade|ad\b|cancel|kamaya|rate|kab tak|pay|dena)/.test(q))return null;
  const n=new Date(),day=n.toLocaleDateString("en-IN",{weekday:"long"}),dt=n.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}),tm=n.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"});
  if(/(kal kon sa din|kal kya din|tomorrow)/.test(q)){const t=new Date(n.getTime()+864e5);return LA.t(`Tomorrow is ${t.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}.`,`Kal ${t.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})} hai.`)}
  if(/(time|samay|kitne baje|kya baja|baje hai|clock|waqt)/.test(q))return LA.t(`It's ${tm}, ${day} ${dt}.`,`Abhi ${tm} baje hain · ${day}, ${dt}.`);
  if(/(kon sa din|konsa din|kaun sa din|kaunsa din|kon sa day|konsa day|kaunsa day|which day|what day|day hai|din hai|vaar|aaj kya hai)/.test(q))return LA.t(`Today is ${day}, ${dt}.`,`Aaj ${day} hai · ${dt}.`);
  if(/(date|tarikh|tareekh|taarikh)/.test(q)&&!/\d/.test(q))return LA.t(`Today's date: ${dt} (${day}).`,`Aaj ki tarikh: ${dt} (${day}).`);
  return null}
function brSmall(q){if(BR_GREET.test(q)||/^gn\b/.test(q))return brGreetBrief(q);
  const n=(pref("owner")||"").split(" ")[0];
  if(/^(kya|kia) ?(kar|kr) ?(rahe|rhe|raha|rha) ?(ho|h)\b|what are you doing|wyd\b/.test(q))return LA.t("Keeping an eye on your orders, dues and banks 🙂 Ask me anything about your business.","Aapke orders, dues aur banks pe nazar rakh raha hoon 🙂 Business ka kuch bhi poocho.");
  if(/^(kaise|kese|kaisa) ?(ho|h|hai)\b|how are you|kya haal|kaisa chal/.test(q))return LA.t("All good! Ready to help"+(n?", "+n:"")+".","Ekdum badhiya! Batao"+(n?" "+n:"")+", kya madad karun?");
  if(/^(tum|aap|tu) ?(kaun|kon) ?(ho|h|hai)|who are you|tumhara naam|your name/.test(q))return LA.t("I'm P2P Brain, this app's own assistant. I learn from your data and from the words you teach me.","Main P2P Brain hoon, is app ka apna dimaag. Aapke data se aur aapke sikhaye shabdon se seekhta hoon.");
  if(/^(thanks|thank you|thx|shukriya|dhanyavad|dhanyawad|ty)\b/.test(q))return LA.t("Anytime! 🙌","Koi baat nahi! 🙌");
  if(/^(ok|okay|acha|accha|achha|thik hai|theek hai|hmm+|k)\s*$/.test(q))return LA.t("👍","👍");const ck=brClock(q);if(ck)return ck;
  if(BR_VAGUE.test(q.replace(/[?!.]+$/,"").trim()))return brActivity();
  if(/^(thanks|thank you|thx|shukriya|dhanyavad|dhanyawad|ok thanks|thnx|tq)\b/.test(q))return LA.t("You're welcome 🙏","Koi baat nahi 🙏 Aur kuch?");
  if(/(kaun ho|who are you|tum kya ho|apna naam|your name)/.test(q))return LA.t("I'm P2P Brain, this app's own brain. I read your orders, banks and parties, answer in seconds without internet, and learn the words you teach me.","Main P2P Brain hoon, is app ka apna dimaag. Aapke orders, bank aur parties padh ke turant jawab deta hoon, bina internet ke, aur jo sikhao wo yaad rakhta hoon.");
  if(/^(bye|by|alvida|chalo bye|good night|gn)\b/.test(q))return LA.t("Bye! Switch off your ads before sleeping 🌙","Bye! Sone se pehle ads band kar dena 🌙");
  if(/^(kaise ho|how are you|kya haal|sab theek)/.test(q))return LA.t("All good! Your numbers are ready. Ask me anything.","Main badhiya! Aapka hisaab ready hai, kuch bhi poocho.");
  return null}
// maths & conversions
function brMath(q){const x=q.replace(/[,₹]/g,"").replace(/\b(kitna|kitne|hota|hoga|hai|batao|=|equals|ka|ki)\b/g," ").replace(/[x×]/g,"*").replace(/÷/g,"/").trim();
  if(/^[\d\s.+\-*/()%]+$/.test(x)&&/\d\s*[+\-*/%]\s*\d/.test(x)){try{const v=Function("return ("+x.replace(/%/g,"/100")+")")();if(isFinite(v))return`${x} = ${(+v.toFixed(4)).toLocaleString("en-IN")}`}catch(e){}}
  const N=LA.nums(q);
  if(/(me|mein|main)\s+kitne/.test(q)&&N.length>=2){const amt=N[0].v,r=N[1].v;if(amt&&r)return LA.t(`${inr(amt)} at ₹${r} = ${fmtQ(+(amt/r).toFixed(4))} USDT`,`${inr(amt)} me ₹${r} ke rate se ${fmtQ(+(amt/r).toFixed(4))} USDT`)}
  if(/(kitne|kitna)\s*(ka|ke|ki|rupay|rs|₹)|total kitna|amount kitna|kitne ka/.test(q)&&/(usdt|usdc|coin)/.test(q)&&N.length>=2){const qn=N[0].v,r=N[1].v;return`${fmtQ(qn)} USDT × ₹${r} = ${inr(+(qn*r).toFixed(2))}`}
  return null}
// specific dates: "2 oct ka profit", "monday ka profit"
function brDate(q){const MO={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11};let d=null;
  let m=q.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\b/);if(m){d=new Date();d.setMonth(MO[m[2]],+m[1]);if(d>new Date())d.setFullYear(d.getFullYear()-1)}
  const W={monday:1,somvar:1,tuesday:2,mangalvar:2,wednesday:3,budhvar:3,thursday:4,guruvar:4,friday:5,shukravar:5,saturday:6,shanivar:6,sunday:0,ravivar:0};
  if(!d){const w=Object.keys(W).find(k=>new RegExp("\\b"+k+"\\b").test(q));if(w){d=new Date();const diff=(d.getDay()-W[w]+7)%7||7;d.setDate(d.getDate()-diff)}}
  if(!d)return null;d.setHours(0,0,0,0);const a=d.getTime(),b=a+DAY;const ol=orders.filter(o=>o.time>=a&&o.time<b),st=stats(ol);const ex=exps.filter(x=>x.time>=a&&x.time<b).reduce((t,x)=>t+(+x.amt||0),0);
  return`${d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}: profit ${sgn(st.profit)}${ex?` · ${LA.t("after expenses","kharche ke baad")} ${sgn(st.profit-ex)}`:""}\n${ol.length} orders · ${LA.t("bought","kharida")} ${fmtQ(+st.b.q.toFixed(2))} · ${LA.t("sold","becha")} ${fmtQ(+st.s.q.toFixed(2))}`}
// compare two periods
function brCompare(q){if(!/(vs|versus|compare|mukabla|muqabla|tulna|se zyada|se kam|farak|difference|better)/.test(q))return null;
  const pairs=[[/hafte|week/,"week",()=>{const b=weekStart();return[b-7*DAY,b]},LA.t("last week","pichla hafta")],[/mahine|month/,"month",()=>{const n=new Date();return[new Date(n.getFullYear(),n.getMonth()-1,1).getTime(),new Date(n.getFullYear(),n.getMonth(),1).getTime()]},LA.t("last month","pichla mahina")],[/aaj|today|kal|yesterday/,"today",()=>{const d=new Date();d.setHours(0,0,0,0);return[d.getTime()-DAY,d.getTime()]},LA.t("yesterday","kal")]];
  const pr=pairs.find(p=>p[0].test(q))||pairs[0];const [a,b]=periodRange(pr[1]);const [pa,pb]=pr[2]();
  const f=(x,y)=>{const L=orders.filter(o=>o.time>=x&&o.time<y);const s=stats(L);return{p:s.profit,n:L.length,v:L.filter(o=>o.status==="Completed").reduce((t,o)=>t+orderTotal(o),0)}};const A=f(a,b),P=f(pa,pb);
  const ch=(x,y)=>y?` (${x>=y?"▲":"▼"} ${Math.abs(Math.round((x-y)/Math.abs(y)*100))}%)`:"";
  return`${LA.pname(pr[1])} vs ${pr[3]}:\n• Profit ${sgn(A.p)} vs ${sgn(P.p)}${ch(A.p,P.p)}\n• Orders ${A.n} vs ${P.n}${ch(A.n,P.n)}\n• Volume ${inr(Math.round(A.v))} vs ${inr(Math.round(P.v))}${ch(A.v,P.v)}`}
// top lists
function brTop(q){if(!/(top|sabse zyada|sabse jada|sabse bada|sabse bade|best|biggest|most)/.test(q))return null;const n=+(q.match(/top\s*(\d+)/)||[])[1]||5;
  if(/(order|trade|deal)/.test(q)&&!/(trader|buyer|seller|bande|log|party)/.test(q)){const L=orders.filter(o=>o.status==="Completed").sort((a,b)=>orderTotal(b)-orderTotal(a)).slice(0,n);return LA.t("Biggest orders:","Sabse bade orders:")+"\n"+L.map(o=>`• ${o.side} ${fmtQ(o.qty)} ${o.coin} @ ₹${fmtR(o.rate)} = ${inr(Math.round(orderTotal(o)))}${o.cp?" · "+o.cp:""} · ${dfmt(o.time)}`).join("\n")}
  if(/(cancel)/.test(q)){const L=Object.values(cpStats()).filter(x=>x.c).sort((a,b)=>b.c-a.c).slice(0,n);return LA.t("Most cancels:","Sabse zyada cancel:")+"\n"+(L.map(x=>`• ${x.name}: ${x.c} of ${x.n}`).join("\n")||"—")}
  if(/(party|parties|dena|baki)/.test(q)){const L=parties.map(p=>[p.name,partyOwed(p.id)-partyPaid(p.id)]).filter(x=>x[1]>0.5).sort((a,b)=>b[1]-a[1]).slice(0,n);return LA.t("Biggest dues:","Sabse bade baki:")+"\n"+(L.map(([a,v])=>`• ${a}: ${inr(Math.round(v))}`).join("\n")||"—")}
  if(/(trader|buyer|seller|customer|bande|log|kisne|client)/.test(q)){const sd=/(buyer|kharida|kisne kharida)/.test(q)?"SELL":/(seller|becha|kisne becha)/.test(q)?"BUY":null;const m={};orders.filter(o=>o.cp&&o.status==="Completed"&&(!sd||o.side===sd)).forEach(o=>{const k=o.cp.trim();m[k]=(m[k]||0)+orderTotal(o)});
    const L=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);return LA.t(`Top ${L.length} traders by volume:`,`Top ${L.length} traders (volume):`)+"\n"+(L.map(([k,v],i)=>`${i+1}. ${k}: ${inr(Math.round(v))}`).join("\n")||"—")}
  return null}
// context: pronouns and follow-ups
function brContext(q){const C=LA.ctx;if(C.bank&&/\b(us|is|wahi|usi|isi)\s+bank\b/.test(q)&&!LA.bank(q))q=q.replace(/\b(us|is|wahi|usi|isi)\s+bank\b/,C.bank);const pron=/\b(uska|uski|uske|usko|use|unka|unki|unko|isko|iska|iski|woh?|that one|him|her|them)\b/;
  if(pron.test(q)&&!LA.party(q)&&!LA.trader(q)){const ent=C.party||C.trader;if(ent)return q.replace(pron,ent)}
  const per=/^(aur|and|or|what about)?\s*(aaj|kal|today|yesterday|is hafte|pichle hafte|is mahine|pichle mahine|hafte|mahine|week|month|total|ab tak)\s*(ka|ki|ke|ko)?\s*\??$/;
  if(per.test(q.trim())&&C.lastQ){const p=q.trim().match(per)[2];return C.lastQ.replace(/\b(aaj|kal|today|yesterday|is hafte|pichle hafte|is mahine|pichle mahine|hafte|mahine|week|month|total|ab tak)\b/g,"").trim()+" "+p}
  return q}
function brRemember(q){const P=LA.party(" "+q+" "),T=LA.trader(" "+q+" "),B=LA.bank(" "+q+" ");if(P)LA.ctx.party=P.name;if(T)LA.ctx.trader=T.name;if(B)LA.ctx.bank=B.name;LA.ctx.lastQ=q}
// ---- P2P Brain v4: thinking (entities → reasoning → answer, with visible steps)
function brParseDate(q){const MO={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11};const now=new Date();let d=null,how="";
  let m=q.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);if(m){let y=+m[3];if(y<100)y+=2000;d=new Date(y,+m[2]-1,+m[1]);how=`${m[0]} → ${LA.t("day-month-year","din-mahina-saal")}`}
  if(!d){m=q.match(/\b(\d{1,2})[-/.](\d{1,2})\b/);if(m&&+m[2]<=12&&!/[*x×]/.test(q)){d=new Date(now.getFullYear(),+m[2]-1,+m[1]);if(d>now)d.setFullYear(d.getFullYear()-1);how=`${m[0]} → ${LA.t("day-month","din-mahina")}`}}
  if(!d){m=q.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\s*(\d{4})?\b/)||q.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/);
    if(m){const day=/^\d/.test(m[1])?+m[1]:+m[2],mon=MO[(/^\d/.test(m[1])?m[2]:m[1]).slice(0,4).replace(/t$/,"")]??MO[(/^\d/.test(m[1])?m[2]:m[1]).slice(0,3)];d=new Date(m[3]?+m[3]:now.getFullYear(),mon,day);if(!m[3]&&d>now)d.setFullYear(d.getFullYear()-1);how=m[0]}}
  if(!d&&/\bparso\b/.test(q)){d=new Date(now);d.setDate(d.getDate()-2);how="parso → 2 din pehle"}
  if(!d){m=q.match(/(\d+)\s*(din|days?)\s*(pehle|ago|pahle)/);if(m){d=new Date(now);d.setDate(d.getDate()-+m[1]);how=m[0]}}
  if(!d){const W={monday:1,somvar:1,tuesday:2,mangalvar:2,wednesday:3,budhvar:3,thursday:4,guruvar:4,friday:5,shukravar:5,saturday:6,shanivar:6,sunday:0,ravivar:0};const w=Object.keys(W).find(k=>new RegExp("\\b"+k+"\\b").test(q));if(w){d=new Date(now);const diff=(d.getDay()-W[w]+7)%7||7;d.setDate(d.getDate()-diff);how=`${w} → ${LA.t("last","pichla")} ${w}`}}
  if(!d||isNaN(d))return null;d.setHours(0,0,0,0);return{a:d.getTime(),b:d.getTime()+DAY,d,how}}
function brDayRecord(D,steps){const {a,b,d}=D;const ol=orders.filter(o=>o.time>=a&&o.time<b).sort((x,y)=>x.time-y.time);const lbl=d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short",year:"numeric"});
  steps.push(LA.t(`Looked at orders, expenses and payments on ${lbl}`,`${lbl} ke orders, kharche aur payments dekhe`));
  if(!ol.length){const days={};orders.forEach(o=>{const k=new Date(o.time).toDateString();days[k]=(days[k]||0)+1});const near=Object.entries(days).map(([k,n])=>[new Date(k),n]).sort((x,y)=>Math.abs(x[0]-d)-Math.abs(y[0]-d)).slice(0,3);
    steps.push(LA.t("No orders that day → searched nearest days with orders","Us din koi order nahi → paas wale din dhundhe"));
    return LA.t(`No orders on ${lbl}.`,`${lbl} ko koi order nahi.`)+(near.length?"\n"+LA.t("Nearest days with orders:","Paas ke din jab orders the:")+"\n"+near.map(([x,n])=>`• ${x.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}: ${n} orders`).join("\n"):"")}
  const st=stats(ol),done=ol.filter(o=>o.status==="Completed"),canc=ol.filter(o=>o.status==="Cancelled").length;const ex=exps.filter(x=>x.time>=a&&x.time<b).reduce((t,x)=>t+(+x.amt||0),0);const pp=ppays.filter(x=>x.time>=a&&x.time<b).reduce((t,x)=>t+(+x.amt||0),0);
  const vol=done.reduce((t,o)=>t+orderTotal(o),0);steps.push(LA.t(`${ol.length} orders found · matched buys with sells for profit`,`${ol.length} orders mile · buy aur sell mila ke profit nikala`));
  return`📅 ${lbl}\n• Profit ${sgn(st.profit)}${ex?` · ${LA.t("after expenses","kharche ke baad")} ${sgn(st.profit-ex)}`:""}\n• ${ol.length} orders (${done.length} done${canc?`, ${canc} cancel`:""}) · volume ${inr(Math.round(vol))}\n• ${LA.t("Bought","Kharida")} ${fmtQ(+st.b.q.toFixed(2))}${st.b.avg?" @ ₹"+st.b.avg.toFixed(2):""} · ${LA.t("Sold","Becha")} ${fmtQ(+st.s.q.toFixed(2))}${st.s.avg?" @ ₹"+st.s.avg.toFixed(2):""}${ex?`\n• ${LA.t("Expenses","Kharcha")} ${inr(Math.round(ex))}`:""}${pp?`\n• ${LA.t("Party payments","Party payment")} ${inr(Math.round(pp))}`:""}\n${LA.t("Orders","Orders")}:\n`+ol.slice(0,8).map(o=>`  ${new Date(o.time).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})} ${o.side} ${fmtQ(o.qty)} @ ₹${fmtR(o.rate)}${o.cp?" · "+o.cp:""}${o.status!=="Completed"?" ("+o.status+")":""}`).join("\n")+(ol.length>8?`\n  +${ol.length-8} more`:"")}
// "why" reasoning
function brWhy(q,steps){if(!/(kyu|kyon|kyun|why|reason|wajah|vajah|kaise hua)/.test(q))return null;
  const per=/aaj|today/.test(q)?"today":/mahine|month/.test(q)?"month":"week";const [a,b]=periodRange(per);let pa,pb;
  if(per==="today"){pa=a-DAY;pb=a}else if(per==="week"){pa=a-7*DAY;pb=a}else{const n=new Date();pa=new Date(n.getFullYear(),n.getMonth()-1,1).getTime();pb=a}
  const S=(x,y)=>{const L=orders.filter(o=>o.time>=x&&o.time<y);const s=stats(L);const q=Math.min(s.b.q,s.s.q);return{p:s.profit,q,sp:s.b.avg&&s.s.avg?s.s.avg-s.b.avg:0,c:L.filter(o=>o.status==="Cancelled").length,n:L.length,ex:exps.filter(e=>e.time>=x&&e.time<y).reduce((t,e)=>t+(+e.amt||0),0)}};
  const A=S(a,b),P=S(pa,pb);const prev={today:LA.t("yesterday","kal"),week:LA.t("last week","pichle hafte"),month:LA.t("last month","pichle mahine")}[per];
  steps.push(LA.t(`Compared ${LA.pname(per).toLowerCase()} with ${prev}`,`${LA.pname(per)} ko ${prev} se milaya`));steps.push(LA.t("Split the profit change into: how much you traded × your spread","Profit ke badlav ko toda: kitna trade hua × spread kitna mila"));
  const dP=A.p-P.p,eSp=(A.sp-P.sp)*P.q,eQ=(A.q-P.q)*A.sp;const L=[`${LA.t("Profit","Profit")} ${sgn(A.p)} vs ${sgn(P.p)} (${dP>=0?"▲":"▼"} ${inr(Math.abs(Math.round(dP)))})`];
  if(/(kam|down|less|gira|ghata)/.test(q)&&dP>0)L.push(LA.t("Actually profit went UP, not down.","Asal me profit kam nahi, badha hai."));
  if(/(zyada|jada|badha|up|more)/.test(q)&&dP<0)L.push(LA.t("Actually profit went DOWN.","Asal me profit kam hua hai."));
  if(!A.q){const L2=orders.filter(o=>o.time>=a&&o.time<b&&o.status==="Completed");const bq=L2.filter(o=>o.side==="BUY").reduce((t,o)=>t+(+o.qty),0),sq=L2.filter(o=>o.side==="SELL").reduce((t,o)=>t+(+o.qty),0);steps.push(LA.t("No matched buy + sell in this period","Is samay me buy aur sell ka match nahi"));
    L.push(bq&&!sq?LA.t(`You only bought (${fmtQ(bq)}) and sold nothing. Profit shows once you sell.`,`Sirf kharida (${fmtQ(bq)}), becha kuch nahi. Bechne pe profit dikhega.`):sq&&!bq?LA.t(`You only sold (${fmtQ(sq)}) and bought nothing in this period.`,`Sirf becha (${fmtQ(sq)}), is samay kharida kuch nahi.`):LA.t("No completed trades yet.","Abhi koi trade complete nahi hua."));
    return"🔎 "+L.join("\n• ")}
  if(Math.abs(eQ)>=Math.abs(eSp))L.push(LA.t(`Main reason: volume. Matched ${fmtQ(+A.q.toFixed(0))} vs ${fmtQ(+P.q.toFixed(0))} USDT → ${eQ>=0?"+":"−"}${inr(Math.abs(Math.round(eQ)))}`,`Asli wajah: volume. ${fmtQ(+A.q.toFixed(0))} vs ${fmtQ(+P.q.toFixed(0))} USDT ka buy-sell match hua → ${eQ>=0?"+":"−"}${inr(Math.abs(Math.round(eQ)))}`));
  else L.push(LA.t(`Main reason: spread. ${A.sp.toFixed(2)} vs ${P.sp.toFixed(2)} per USDT → ${eSp>=0?"+":"−"}${inr(Math.abs(Math.round(eSp)))}`,`Asli wajah: spread. ${A.sp.toFixed(2)} vs ${P.sp.toFixed(2)} per USDT → ${eSp>=0?"+":"−"}${inr(Math.abs(Math.round(eSp)))}`));
  if(A.c!==P.c)L.push(LA.t(`Cancels ${A.c} vs ${P.c}`,`Cancel ${A.c} vs ${P.c}`)+(A.c>P.c?LA.t(" → lost orders"," → orders haath se gaye"):""));
  if(Math.round(A.ex)!==Math.round(P.ex))L.push(LA.t(`Expenses ${inr(Math.round(A.ex))} vs ${inr(Math.round(P.ex))}`,`Kharcha ${inr(Math.round(A.ex))} vs ${inr(Math.round(P.ex))}`));
  if(A.q<P.q*0.8)L.push(LA.t("Tip: keep ads live in your busy hours ("+bestTimeTop("30")+").","Tip: busy time ("+bestTimeTop("30")+") me ads on rakho."));else if(A.sp<P.sp)L.push(LA.t("Tip: check Best rate finder before setting ads.","Tip: ad lagane se pehle Best rate finder dekho."));
  return"🔎 "+L.join("\n• ")}
// advice
function brAdvice(q,steps){if(!/(kya karu|kya karun|advice|suggest|salah|tips|kaise badhau|kaise badhaye|improve|badhana|plan bata|aage kya)/.test(q))return null;steps.push(LA.t("Checked time, rates, traders, banks, dues and stock","Time, rate, traders, bank, dues aur stock check kiye"));
  const T=[];const bt=bestTimeTop("30");if(bt)T.push(LA.t(`Trade more around ${bt}, your busiest window.`,`${bt} me zyada trade karo, tab sabse zyada order aate hain.`));
  const g=rateSuggest(pref("coin")||"USDT");if(g.sell&&g.buy)T.push(LA.t(`Set ads near sell ₹${g.sell.toFixed(2)} / buy ₹${g.buy.toFixed(2)} (spread ${(g.sell-g.buy).toFixed(2)}).`,`Ad rate: sell ₹${g.sell.toFixed(2)} / buy ₹${g.buy.toFixed(2)} ke aas-paas (spread ${(g.sell-g.buy).toFixed(2)}).`));
  const risky=Object.values(cpStats()).filter(x=>x.n>=3&&x.c/x.n>=0.3&&!(cpTag(x.name)&&cpTag(x.name).tag==="block")).slice(0,3);if(risky.length)T.push(LA.t(`Be careful with ${risky.map(x=>x.name).join(", ")} (many cancels).`,`${risky.map(x=>x.name).join(", ")} se dhyan se (cancel zyada).`));
  try{const br=bankRisk().filter(x=>x.lv!=="ok");if(br.length)T.push(LA.t(`Rest ${br.map(x=>x.b.name).join(", ")} today (freeze risk).`,`${br.map(x=>x.b.name).join(", ")} ko aaj aaram do (freeze risk).`))}catch(e){}
  try{const F=cashFlow(true);if(F.short)T.push(LA.t(`Arrange money before ${new Date(F.short.t).toLocaleDateString("en-IN",{weekday:"long"})}: short by ${inr(Math.round(-F.short.bal))}.`,`${new Date(F.short.t).toLocaleDateString("en-IN",{weekday:"long"})} se pehle paisa arrange karo: ${inr(Math.round(-F.short.bal))} kam.`))}catch(e){}
  const ld=lossData("30");if(ld.out.length)T.push(LA.t(`${ld.out.length} trades below your average rate cost ${inr(Math.round(ld.tot))} this month.`,`Is mahine ${ld.out.length} trade average se kharab rate pe hue, ${inr(Math.round(ld.tot))} ka nuksaan.`));
  const pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal").length;if(pend)T.push(LA.t(`Close ${pend} open order${pend>1?"s":""}.`,`${pend} khule order band karo.`));
  return"💡 "+LA.t("My suggestions:","Meri salah:")+"\n"+T.map((x,i)=>`${i+1}. ${x}`).join("\n")}
// entity summary when nothing else matched
function brAbout(q,steps){const P=LA.party(" "+q+" "),T=LA.trader(" "+q+" "),B=LA.bank(" "+q+" ");if(!P&&!T&&!B)return null;const L=[];
  if(P){steps.push(LA.t(`Found party "${P.name}"`,`Party "${P.name}" mili`));const l=partyOwed(P.id)-partyPaid(P.id);L.push(`${P.name}: ${LA.t("left to pay","baki")} ${inr(Math.round(Math.max(0,l)))}${(P.accounts||[]).length?` · ${(P.accounts||[]).length} ${LA.t("accounts","accounts")}`:""}`)}
  if(T&&(!P||T.name.toLowerCase()!==P.name.toLowerCase())){steps.push(LA.t(`Found trader "${T.name}"`,`Trader "${T.name}" mila`));const D=traderData(T.name);L.push(`${T.name}: ${D.total} orders, ${D.canc} cancel, trust ${D.score}/100`)}
  if(B){steps.push(LA.t(`Found bank "${B.name}"`,`Bank "${B.name}" mila`));L.push(`${B.name}: ${inr(Math.round(balances().bal[B.id]))}`)}
  return LA.t("Here's what I know:","Mujhe ye pata hai:")+"\n"+L.join("\n")}
function brShowThink(out,steps){if(!steps||!steps.length)return;const d=document.createElement("details");d.className="brthink";d.innerHTML=`<summary>🧠 ${LA.t("How I thought","Kaise socha")}</summary><ol>${steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`;out.appendChild(d)}
function brThinkFirst(ql){const steps=[];const q=" "+ql+" ";
  const D=brParseDate(q);if(D&&/(record|recod|recode|rekord|hisab|hisaab|report|profit|orders?|kya hua|details|batao|bata|data|kitna|trade)/.test(q)){steps.push(LA.t(`Found a date: ${D.how}`,`Date mili: ${D.how}`));steps.push(LA.t("Words like record/report/profit → full day record","record/report/profit jaise shabd → us din ka poora hisaab"));return{text:brDayRecord(D,steps),steps}}
  let t=brWhy(q,steps);if(t)return{text:t,steps};t=brAdvice(q,steps);if(t)return{text:t,steps};return null}
// ================= Ask anything, next level (offline, from your own data)
const BR_NUMW={dedh:1.5,dhai:2.5,dhaai:2.5,ek:1,do:2,teen:3,char:4,chaar:4,paanch:5,panch:5,chhe:6,cheh:6,chhah:6,saat:7,aath:8,nau:9,das:10,gyarah:11,barah:12,terah:13,chaudah:14,pandrah:15,solah:16,satrah:17,atharah:18,unnis:19,bees:20,pachees:25,tees:30,chalis:40,pachas:50,pachaas:50,saath:60,sattar:70,assi:80,nabbe:90};
const BR_MULT={sau:100,hazaar:1e3,hazar:1e3,hajar:1e3,lakh:1e5,lac:1e5,crore:1e7};
// "paanch hazaar" -> 5000, "dedh lakh" -> 150000, "do sau" -> 200 (only when a multiplier follows, so plain "do" = give stays a word)
function brNumWords(q){return String(q).replace(/\b(dedh|dhai|dhaai|ek|do|teen|chaar|char|paanch|panch|chhe|cheh|chhah|saat|aath|nau|das|gyarah|barah|terah|chaudah|pandrah|solah|satrah|atharah|unnis|bees|pachees|tees|chalis|pachas|pachaas|saath|sattar|assi|nabbe)\s+(sau|hazaar|hazar|hajar|lakh|lac|crore)\b/gi,(m,w,u)=>String(Math.round(BR_NUMW[w.toLowerCase()]*BR_MULT[u.toLowerCase()])))}
function brBanksIn(ql){const L=[];banks.forEach(b=>{const ws=[b.name,b.bankName].filter(Boolean).map(s=>String(s).toLowerCase());const toks=new Set();ws.forEach(s=>{toks.add(s);s.split(/[^a-z0-9]+/).filter(x=>x.length>=3&&x!=="bank").forEach(x=>toks.add(x))});let i=-1;toks.forEach(t=>{const m=new RegExp("(^|[^a-z0-9])"+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^a-z0-9]|$)").exec(ql);if(m){const p=m.index+m[1].length;if(i<0||p<i)i=p}});if(i>=0)L.push({b,i})});return L.sort((a,c)=>a.i-c.i)}
function brDone(q,out,text,badge){out.textContent=text;out.insertAdjacentHTML("beforeend",`<span class="labadge">${badge||"P2P Brain · from your data"}</span>`);brCount();brRemember(q.toLowerCase());aiHistory.push({role:"user",content:q},{role:"assistant",content:text});return true}
function brWin(ql){const n=new Date(),d0=h=>{const d=new Date(n);d.setHours(h,0,0,0);return d.getTime()},Y=864e5;const yest=/(kal|yesterday|last night)/.test(ql);
  if(/(raat|night)/.test(ql)){if(yest||n.getHours()<14)return{a:d0(20)-Y,b:Math.min(d0(8),n.getTime()),l:LA.t("last night (8 pm to 8 am)","kal raat (8 baje se subah 8 tak)")};return{a:d0(20),b:n.getTime(),l:LA.t("tonight","aaj raat")}}
  const sl=(h1,h2,l,h)=>{const k=yest?-Y:0;return{a:d0(h1)+k,b:Math.min(d0(h2)+k,n.getTime()),l:(yest?LA.t("yesterday ","kal "):LA.t("today ","aaj "))+LA.t(l,h)}};
  if(/(subah|morning)/.test(ql))return sl(5,12,"morning","subah");if(/(dopahar|afternoon)/.test(ql))return sl(12,16,"afternoon","dopahar");if(/(shaam|evening)/.test(ql))return sl(16,21,"evening","shaam");return null}
function brBankCard(rows){return `<div class="brcard">${rows.map(r=>`<div class="brrow">${bankBadge(r.b)}<div class="brmid"><b>${esc(r.b.name)}</b><span>${r.sub}</span></div><div class="brend">${r.end}</div></div>`).join("")}<button type="button" class="mini ghost" data-go="wallet" style="margin-top:8px;width:100%">Open Wallet ›</button></div>`}
// ---- missing details: the assistant asks back ("Ravi ko kitna diya?") and finishes the command with your next answer
function brAsk(q,out,ask,build){LA.pend={t:Date.now(),build,n:(LA.pendN||0)+1,base:q};return brDone(q,out,ask,"P2P Brain · need one detail")}
function brPend(q,out){const P=LA.pend;if(!P){LA.pendN=0;return null}LA.pend=null;if(Date.now()-P.t>12e4||P.n>2)return null;const ql=q.toLowerCase().trim();
  if(/^(nahi|nahin|no|cancel|rehne do|chhodo|chod do|stop|mat karo)\b/.test(ql)){LA.pend=null;return brDone(q,out,LA.t("Okay, dropped it.","Theek hai, chhod diya."),"P2P Brain")}
  if(ql.split(/\s+/).length>8)return null;const nq=P.build(q);if(!nq)return null;LA.pendN=P.n;return{rerun:nq}}
function brMissing(q,ql,out,named,N){const t=LA.t.bind(LA),has=r=>r.test(ql);
  if(has(/(kitna|kitne|kya|kab|balance|bacha|limit|total|history|record|\?)/)&&!has(/(becha|kharida|bech diya|kharid liya)/))return false;
  const Pty=LA.party(" "+ql+" ");
  // paid someone, no amount
  if(Pty&&has(/(diya|diye|pay kiya|paid|bheja|bhej diya|payment kiya|de diya|de diye|di hai|bhej di)/)&&!N.length)
    return brAsk(q,out,t(`How much did you pay ${Pty.name}?`,`${Pty.name} ko kitna diya?`),r=>{const n=LA.nums(brNumWords(r));if(!n.length)return null;const bk=brBanksIn(r.toLowerCase());return `${Pty.name} ko ${n[0].v} diya${bk.length?" "+bk[0].b.name+" se":""}`});
  // transfer between my banks with a detail missing
  if(has(/(transfer|bhej|bhejo|bhejna|shift|move)/)&&named.length>=1&&!Pty&&!has(/(becha|kharida|usdt)/)&&(named.length<2||!N.length)){
    const need=!N.length&&named.length<2?t("How much, and into which bank?","Kitna, aur kis bank me?"):!N.length?t("How much?","Kitna bhejna hai?"):t("Into which bank?","Kis bank me?");
    return brAsk(q,out,need,r=>{const rr=brNumWords(r);return(LA.nums(rr).length||brBanksIn(rr.toLowerCase()).length)?q+" "+rr:null})}
  // expense without an amount
  if(has(/(kharcha|kharch|expense|spent)/)&&!N.length&&!has(/(aaj|kal|mahine|month|hafte|week|today|list|dikhao|batao|sabse)/))
    return brAsk(q,out,t("How much was the expense?","Kharcha kitne ka tha?"),r=>{const n=LA.nums(brNumWords(r));return n.length?n[0].v+" "+q:null});
  // buy / sell with the quantity missing ("usdt kharida 93 pe")
  if(has(/(becha|kharida|bech diya|kharid liya|sold|bought)/)&&has(/(usdt|usdc|btc|eth)/)&&(!N.length||(N.length===1&&has(/\b(pe|par|@|rate|bhav)\b/))))
    return brAsk(q,out,t("How many USDT?","Kitne USDT?"),r=>{const n=LA.nums(brNumWords(r));return n.length?n[0].v+" "+q:null});
  return false}
function brPlus(q,out){const ql=q.toLowerCase().replace(/\s+/g," ").trim();
  LA.hi=pref("lang")!=="English"||LA.keepHi||/\b(kitna|kya|hai|ko|se|me|mein|kaun|konsa|kaunsa|kis|raat|karo|lu|lun|dena|bhej|bhejo|bhejun|kisse|kisme|rakhu|khule|paisa|paise|zyada|sabse|daal|dalo|kal|aaj|batao|kharida|becha|diya|kiya|kharcha|pe|karo)\b/.test(ql);const t=LA.t.bind(LA);
  const use=limitUse();let bal={},mv=[];try{const bb=balances();bal=bb.bal;mv=bb.mv}catch(e){}
  const named=brBanksIn(ql),N=LA.nums(ql).filter(x=>x.v>0);
  if(brMissing(q,ql,out,named,N))return true;
  // UPI Lite: balance and quick load / withdraw
  if(/\blite\b/.test(ql)){const LB=liteBanks();
    const ask=/(kitna|balance|bacha|how much|total|kya hai|show|dikha|batao)/.test(ql)&&!N.length;
    if(!LB.length){out.textContent=t("UPI Lite is not on for any bank yet. Turn it on in Edit bank.","Kisi bank par UPI Lite ON nahi hai. Edit bank me ON karo.");brCount();return true}
    if(ask||(!N.length&&!/(load|daal|dal|top|withdraw|nikal|wapas|spent)/.test(ql))){out.textContent="UPI Lite:\n"+LB.map(b=>`• ${b.name}${b.lite.app?" ("+b.lite.app+")":""}: ${inr(Math.round(+b.lite.bal||0))}`).join("\n")+"\n"+t("Total","Kul")+" "+inr(Math.round(LB.reduce((a,b)=>a+(+b.lite.bal||0),0)));brCount();aiHistory.push({role:"user",content:q},{role:"assistant",content:"lite balance"});return true}
    if(N.length){const amt=Math.max(...N.map(x=>x.v));const bk=(named.find(x=>x.b.lite&&x.b.lite.on)||{}).b||(LB.length===1?LB[0]:null);
      const typ=/(withdraw|nikal|wapas|back)/.test(ql)?"lite_out":/(spent|kharch|payment kiya|pay kiya)/.test(ql)?"lite_spend":"lite_load";
      if(!bk){out.textContent=t("Which bank's UPI Lite? Say the bank name too.","Kis bank ke UPI Lite me? Bank ka naam bhi bolo.");brCount();return true}
      out.textContent=t("UPI Lite ready, check and apply:","UPI Lite taiyaar hai, check karke apply karo:");actionCard([{type:typ,bank:bk.name,amount:amt}]);brCount();aiHistory.push({role:"user",content:q},{role:"assistant",content:"lite prepared"});return true}}
  // 1) money moved between two of my banks: "Axis se SBI me 30000 transfer karo"
  if(named.length>=2&&N.length&&/(transfer|bhej|bhejo|bhejna|daal|dalo|dal do|shift|send|move|bhijwa)/.test(ql)&&!/(kitna|balance|bacha|limit|becha|kharida|usdt|sell|buy|kharcha)/.test(ql)&&!LA.party(" "+ql+" ")&&!LA.trader(" "+ql+" ")){
    let from=named[0].b,to=named[1].b;const m=/(^|\s)se(\s|$)/.exec(ql);if(m){const s=named.filter(x=>x.i<m.index+1);const e=named.filter(x=>x.i>m.index+1);if(s.length&&e.length){from=s[s.length-1].b;to=e[0].b}}else if(/\b(to|->|→)\b/.test(ql)){}
    const amt=Math.max(...N.map(x=>x.v)),meth=/neft/.test(ql)?"NEFT":/upi/.test(ql)?"UPI":/cash/.test(ql)?"Cash":"IMPS";
    if(from.id===to.id)return false;
    const warn=[];if((bal[from.id]||0)<amt-0.5)warn.push(t(`${from.name} has only ${inr(Math.round(bal[from.id]||0))}.`,`${from.name} me sirf ${inr(Math.round(bal[from.id]||0))} hai.`));const ll=limitLeft(from,meth,use);if(isFinite(ll)&&ll<amt-0.5)warn.push(t(`${meth} limit left on ${from.name} is ${inr(Math.round(ll))}.`,`${from.name} ki ${meth} limit sirf ${inr(Math.round(ll))} bachi hai.`));
    out.textContent=t("Transfer ready, check and apply:","Transfer taiyaar hai, check karke apply karo:")+(warn.length?"\n⚠ "+warn.join(" "):"");out.insertAdjacentHTML("beforeend",`<span class="labadge">P2P Brain · from your data</span>`);
    actionCard([{type:"transfer",from:from.name,to:to.name,amount:amt,method:meth}]);brCount();aiHistory.push({role:"user",content:q},{role:"assistant",content:"transfer prepared"});return true}
  // 2) which bank to use / which is safe / freeze risk / night plan
  if(/(bank|banks|banko|freeze)/.test(ql)||named.length||/(freeze|khatra|bhejun|bhej du|paisa lu|paise lu|payment lu|nikalu|pay from|receive in|send from)/.test(ql)){const kind=/(raat|night|sone|so jau|so raha|khule rakhu|khula rakhu|band karu|tonight)/.test(ql)&&/(bank|khule|khula|rakhu|band|open|keep|close)/.test(ql)?"night":/(freeze|risk|khatra|safe|safest|surakshit|block ho|band ho jayega)/.test(ql)?"risk":/(paisa lu|paise lu|payment lu|receive|lena|lun|leni|lu\b|kisme mangau|kis bank me mangau|ad me|ad pe|get paid|collect)/.test(ql)?"recv":/(pay karu|bhejun|bhej du|nikalu|dena|de du|payment karu|kisse bhejun|kis se bhejun|pay from|send from|pay with|pay out|send money)/.test(ql)?"pay":null;
    if(kind&&/(kaun|konsa|kaunsa|kon sa|kis|which|what|kisme|kisse|sabse|kaise|kaha|kahan|khule|zyada|kam|safe|risk|freeze|should|best|most|highest)/.test(ql)){
      const live=banks.filter(b=>b.type!=="Cash");if(!live.length)return false;
      const ok=live.filter(b=>b.status!=="frozen"&&b.status!=="paused"),I={};live.forEach(b=>I[b.id]=bankInsight(b,mv,bal[b.id]||0,use));
      const lvl=b=>I[b.id].level,pts=b=>I[b.id].pts,ul=b=>{const v=limitLeft(b,"UPI",use);return isFinite(v)?v:null};
      const rowFor=(b,end)=>({b,sub:`${t("risk","risk")} ${lvl(b).toLowerCase()} · ${t("balance","balance")} ${inr(Math.round(bal[b.id]||0))}${ul(b)!=null?" · UPI "+inr(Math.round(ul(b)))+" left":""}`,end:end||`<span class="bchip ${lvl(b)==="High"?"r":lvl(b)==="Medium"?"a":"g"}"><i></i>${lvl(b)}</span>`});
      let lines=[],rows=[];
      if(kind==="risk"&&!named.length){const hiQ=/(zyada|jyada|high|sabse khatra|khatra)/.test(ql),s=[...live].sort((a,c)=>hiQ?pts(c)-pts(a):pts(a)-pts(c));
        lines.push(hiQ?t(`Highest freeze risk: ${s[0].name} (${lvl(s[0]).toLowerCase()}, ${pts(s[0])} points)${I[s[0].id].why.length?" — "+I[s[0].id].why.join("; "):""}.`,`Sabse zyada freeze risk: ${s[0].name} (${lvl(s[0]).toLowerCase()}, ${pts(s[0])} points)${I[s[0].id].why.length?" — "+I[s[0].id].why.join("; "):""}.`):t(`Safest now: ${s[0].name} (${lvl(s[0]).toLowerCase()}, ${pts(s[0])} points).`,`Abhi sabse safe: ${s[0].name} (${lvl(s[0]).toLowerCase()}, ${pts(s[0])} points).`));rows=s.map(b=>rowFor(b))}
      else if(kind==="recv"){const s=[...ok].sort((a,c)=>pts(a)-pts(c)||I[a.id].flow-I[c.id].flow);if(!s.length)return false;
        lines.push(t(`Receive in ${s[0].name}: freeze risk ${lvl(s[0]).toLowerCase()}, ${inr(Math.round(I[s[0].id].flow))} came in the last 24 hours${I[s[0].id].cap?", "+inr(Math.round(I[s[0].id].capLeft))+" left under your cap":""}.`,`Paisa ${s[0].name} me lo: freeze risk ${lvl(s[0]).toLowerCase()} hai, pichle 24 ghante me ${inr(Math.round(I[s[0].id].flow))} aaya${I[s[0].id].cap?", cap me ${inr(Math.round(I[s[0].id].capLeft))} bacha":""}.`));
        const hi=live.filter(b=>lvl(b)==="High");if(hi.length)lines.push(t("Careful with: ","Inse bacho: ")+hi.map(b=>b.name).join(", ")+".");rows=s.map(b=>rowFor(b))}
      else if(kind==="pay"){const s=[...ok].map(b=>({b,v:Math.min(bal[b.id]||0,limitLeft(b,"UPI",use))})).filter(x=>x.v>0).sort((a,c)=>c.v-a.v);if(!s.length)return false;
        lines.push(t(`Pay from ${s[0].b.name}: it can send ${inr(Math.round(s[0].v))} now (balance and UPI limit).`,`${s[0].b.name} se bhejo: abhi ${inr(Math.round(s[0].v))} tak bhej sakte ho (balance aur UPI limit dekhkar).`));rows=s.map(x=>rowFor(x.b,`<b>${inr(Math.round(x.v))}</b>`))}
      else if(kind==="night"){const safe=ok.filter(b=>lvl(b)!=="High"&&(ul(b)==null||ul(b)>20000));const bad=live.filter(b=>!safe.includes(b));
        lines.push(safe.length?t("Keep these open tonight: ","Raat ke liye ye khule rakho: ")+safe.map(b=>b.name).join(", ")+".":t("No bank looks comfortable for tonight.","Raat ke liye koi bank aaram wala nahi dikh raha."));
        if(bad.length)lines.push(t("Close or watch: ","Band karo ya nazar rakho: ")+bad.map(b=>b.name+(b.status==="frozen"?" (frozen)":b.status==="paused"?" (paused)":lvl(b)==="High"?" (risk high)":" (limit low)")).join(", ")+".");rows=live.map(b=>rowFor(b,`<span class="bchip ${safe.includes(b)?"g":"r"}">${safe.includes(b)?"Open":"Watch"}</span>`))}
      else{const tg=named.length?named.map(x=>x.b):live;const s=[...tg].sort((a,c)=>pts(c)-pts(a));
        lines.push(s.map(b=>t(`${b.name}: freeze risk ${lvl(b).toLowerCase()} (${pts(b)} points)`,`${b.name}: freeze risk ${lvl(b).toLowerCase()} (${pts(b)} points)`)+(I[b.id].why.length?" — "+I[b.id].why.join("; "):"")).join("\n"));
        const safest=[...ok].sort((a,c)=>pts(a)-pts(c))[0];if(safest&&!named.length)lines.push(t(`Safest now: ${safest.name}.`,`Abhi sabse safe: ${safest.name}.`));rows=s.map(b=>rowFor(b))}
      lines.push(t("(This is the app's own estimate, not a bank rule.)","(Ye app ka apna andaza hai, bank ka rule nahi.)"));
      brDone(q,out,lines.join("\n"),"P2P Brain · bank advisor");const card=document.createElement("div");card.innerHTML=brBankCard(rows);out.appendChild(card.firstChild);return true}}
  // 3) who earned me the most / lost me the most
  if(/(profit|kamaya|kamai|munafa|fayda|loss|nuksan|ghata|earn|earned|made me|made)/.test(ql)&&/(kis|kisse|kaun|trader|bande|bande se|client|party|log|customer|who|whom|which)/.test(ql)&&/(sabse|zyada|top|best|jyada|kam|worst|most|least|highest|lowest|biggest)/.test(ql)){
    const per=LA.period(" "+ql+" "),n0=new Date();let a=0,b=Infinity;if(per==="today"){a=new Date(n0.getFullYear(),n0.getMonth(),n0.getDate()).getTime()}else if(per==="yesterday"){b=new Date(n0.getFullYear(),n0.getMonth(),n0.getDate()).getTime();a=b-864e5}else if(per==="week"){a=Date.now()-7*864e5}else if(per==="month"){a=new Date(n0.getFullYear(),n0.getMonth(),1).getTime()}else if(per==="lastmonth"){a=new Date(n0.getFullYear(),n0.getMonth()-1,1).getTime();b=new Date(n0.getFullYear(),n0.getMonth(),1).getTime()}
    const P=ACC().sellP,m={};orders.filter(o=>o.cp&&o.status==="Completed"&&o.side==="SELL"&&o.time>=a&&o.time<b).forEach(o=>{const k=o.cp.trim();const x=m[k]=m[k]||{n:0,p:0};x.n++;x.p+=P[o.id]||0});
    const asc=/(loss|nuksan|ghata|kam|worst|least)/.test(ql)&&!/(sabse zyada profit|zyada profit)/.test(ql);const L=Object.entries(m).sort((x,y)=>asc?x[1].p-y[1].p:y[1].p-x[1].p).slice(0,5);
    if(!L.length)return brDone(q,out,t("No completed sells in that period.","Us samay koi poori hui sell nahi mili."));
    return brDone(q,out,(asc?t("Lowest profit by trader","Sabse kam profit (trader ke hisaab se)"):t("Most profit by trader","Sabse zyada profit (trader ke hisaab se)"))+(per?" · "+LA.pname(per):"")+":\n"+L.map(([k,v],i)=>`${i+1}. ${k}: ${v.p<0?"−":""}${inr(Math.round(Math.abs(v.p)))} (${v.n} ${t("sells","sell")})`).join("\n"))}
  // 4) night / morning windows: "kal raat kitne order aaye"
  const W=brWin(ql);if(W&&/(order|aaye|aaya|hua|hue|kya hua|kitne|cancel|profit|kamaya|trade|deal|happen|happened|came|how many)/.test(ql)){
    const L=orders.filter(o=>o.time>=W.a&&o.time<W.b).sort((x,y)=>x.time-y.time),dn=L.filter(o=>o.status==="Completed"),cn=L.filter(o=>o.status==="Cancelled"),pn=L.filter(o=>o.status==="Pending"||o.status==="Appeal");
    if(!L.length)return brDone(q,out,t(`No orders ${W.l}.`,`${W.l}: koi order nahi aaya.`));const P=ACC().sellP,pr=dn.reduce((s,o)=>s+(P[o.id]||0),0),tm=o=>new Date(o.time).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"});
    return brDone(q,out,t(`${W.l}: ${L.length} orders · ${dn.length} done · ${cn.length} cancelled · ${pn.length} open · profit ${pr<0?"−":""}${inr(Math.round(Math.abs(pr)))}`,`${W.l}: ${L.length} order · ${dn.length} poore · ${cn.length} cancel · ${pn.length} khule · profit ${pr<0?"−":""}${inr(Math.round(Math.abs(pr)))}`)+"\n"+L.slice(0,8).map(o=>`• ${tm(o)} ${o.side} ${fmtQ(o.qty)} ${o.coin}${o.cp?" · "+o.cp:""} · ${o.status}`).join("\n")+(L.length>8?`\n… +${L.length-8}`:"")+(cn.length?"\n"+t("Cancelled: ","Cancel hue: ")+cn.map(o=>o.cp||"?").join(", "):""))}
  return false}
// small chart under a profit answer
function brMaybeCard(out,q){try{if(!/(profit|kamaya|kamai|munafa)/.test(q)||!/(hafte|week|hafta|7 din|din)/.test(q)||/(kis|kaun|trader)/.test(q))return;
  const P=ACC().sellP,days=[];for(let i=6;i>=0;i--){const a=new Date();a.setHours(0,0,0,0);a.setDate(a.getDate()-i);const b=a.getTime()+864e5;const v=orders.filter(o=>o.status==="Completed"&&o.side==="SELL"&&o.time>=a.getTime()&&o.time<b).reduce((s,o)=>s+(P[o.id]||0),0);days.push({l:a.toLocaleDateString("en-IN",{weekday:"short"}).slice(0,2),v})}
  const mx=Math.max(1,...days.map(d=>Math.abs(d.v)));const el=document.createElement("div");el.className="brcard";el.innerHTML=`<div class="brbars">${days.map(d=>`<div class="brbar"><i style="height:${Math.max(3,Math.abs(d.v)/mx*44)}px;background:${d.v<0?"var(--sell)":"var(--buy)"}"></i><span>${d.l}</span><small>${d.v<0?"−":""}${Math.abs(d.v)>=1000?(Math.abs(d.v)/1000).toFixed(1)+"k":Math.round(Math.abs(d.v))}</small></div>`).join("")}</div><button type="button" class="mini ghost" data-go="home" style="margin-top:8px;width:100%">Open Home ›</button>`;out.appendChild(el)}catch(e){}}
// what needs your attention right now (shown when the chat opens)
function brSnz(){try{return JSON.parse(localStorage.getItem("p2p_insnz")||"{}")}catch(e){return{}}}
function brSnooze(q,h){try{const m=brSnz();m[q]=Date.now()+(h||24)*36e5;localStorage.setItem("p2p_insnz",JSON.stringify(m))}catch(e){}}
function brInsights(){const L=[],now=Date.now();try{const {bal,mv}=balances(),use=limitUse();
  banks.filter(b=>b.status==="frozen").forEach(b=>L.push({t:LA.t(`${b.name} is frozen`,`${b.name} frozen hai`),q:"kaun sa bank safe hai",k:"r"}));
  banks.filter(b=>b.type!=="Cash"&&b.status!=="frozen").forEach(b=>{const I=bankInsight(b,mv,bal[b.id]||0,use);if(I.level==="High")L.push({t:LA.t(`${b.name}: freeze risk is high`,`${b.name}: freeze risk high`),q:"freeze risk kisme zyada hai",k:"r"});if(I.lp>=90)L.push({t:LA.t(`${b.name}: ${I.lm==="ALL"?"total":I.lm} limit almost full`,`${b.name}: ${I.lm==="ALL"?"total":I.lm} limit lagbhag full`),q:`${b.name} ka limit kitna bacha`,k:"a"})});
  liteBanks().forEach(b=>{const au=b.lite.auto;if((+b.lite.bal||0)<100&&!(au&&au.on))L.push({t:LA.t(`UPI Lite on ${b.name}: only ${inr(Math.round(+b.lite.bal||0))} left`,`${b.name} ke UPI Lite me sirf ${inr(Math.round(+b.lite.bal||0))} bacha`),q:"upi lite balance",k:"a"})});
  const old=orders.filter(o=>(o.status==="Pending"||o.status==="Appeal")&&now-o.time>3*36e5);if(old.length)L.push({t:LA.t(`${old.length} order${old.length>1?"s":""} open for over 3 hours`,`${old.length} order 3 ghante se zyada khule hain`),q:"pending orders",k:"a"});
  const un=orders.filter(o=>o.status!=="Cancelled"&&!noBank(o)&&Math.abs(orderTotal(o)-allocated(o))>0.5);if(un.length)L.push({t:LA.t(`${un.length} order${un.length>1?"s":""} without a bank assigned`,`${un.length} order ka bank assign nahi hua`),q:"balance",k:"a"});
  const due=parties.map(p=>partyOwed(p.id)-partyPaid(p.id)).filter(v=>v>0.5);if(due.length)L.push({t:LA.t(`${inr(Math.round(due.reduce((a,v)=>a+v,0)))} still to pay to ${due.length} part${due.length>1?"ies":"y"}`,`${due.length} party ko ${inr(Math.round(due.reduce((a,v)=>a+v,0)))} dena baki`),q:"kis kis ko dena baki hai",k:""});
  const st=stockLeft();if((st.USDT||0)<-0.0001)L.push({t:LA.t(`USDT stock is below zero (${fmtQ(+(st.USDT).toFixed(2))})`,`USDT stock minus me hai (${fmtQ(+(st.USDT).toFixed(2))})`),q:"usdt kitna bacha",k:"r"});
  const nw=brWin("kal raat order");if(nw){const c=orders.filter(o=>o.time>=nw.a&&o.time<nw.b&&o.status==="Cancelled").length;if(c)L.push({t:LA.t(`${c} order${c>1?"s":""} cancelled last night`,`kal raat ${c} order cancel hue`),q:"kal raat kitne order aaye",k:"a"})}}catch(e){console.error(e)}
  const nz=brSnz();return L.filter(x=>!(nz[x.q]>Date.now())).slice(0,5)}
function brApqBump(q){try{const k=String(q).toLowerCase().trim().slice(0,60);if(!k||k.length<4)return;const m=JSON.parse(localStorage.getItem("p2p_apq")||"{}");m[k]=(m[k]||0)+1;const E=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,40);localStorage.setItem("p2p_apq",JSON.stringify(Object.fromEntries(E)))}catch(e){}}
function brApqTop(n){try{const m=JSON.parse(localStorage.getItem("p2p_apq")||"{}");return Object.entries(m).filter(x=>x[1]>=2).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0])}catch(e){return[]}}
function laAnswer(q,out){if(brainMeta(q,out))return true;
  try{q=brNumWords(q);const pp=brPend(q,out);if(pp===true)return true;if(pp&&pp.rerun)q=pp.rerun;if(brPlus(q,out))return true}catch(e){console.error(e)}
  const ql=q.toLowerCase().trim();LA.hi=pref("lang")!=="English"||/\b(kitna|kya|hai|ko|se|aaj|kal|kaise|namaste|shukriya|batao|ka|ki|me|hua|huaa|kyu|kyun|karu|nahi|mera|mere|kaisa|chal|raha|batao|aur|sab|theek|thik|do)\b/.test(ql)||/^(hi|hello|namaste)/.test(ql);LA.keepHi=LA.hi;
  let qlc=ql;try{brFuzzy(ql).forEach(([w,n])=>{qlc=qlc.replace(new RegExp("(^|[^a-z0-9])"+w+"(?=[^a-z0-9]|$)"),"$1"+n)})}catch(e){}
  const th=brThinkFirst(qlc);if(th){out.textContent=th.text;out.insertAdjacentHTML("beforeend",`<span class="labadge">P2P Brain · thought it through</span>`);brShowThink(out,th.steps);brCount();brRemember(ql);aiHistory.push({role:"user",content:q},{role:"assistant",content:th.text});return true}
  const quick=brSmall(ql)||brMath(ql)||brCompare(ql)||brTop(ql);
  if(quick){out.textContent=quick;out.insertAdjacentHTML("beforeend",`<span class="labadge">P2P Brain · works offline</span>`);brCount();aiHistory.push({role:"user",content:q},{role:"assistant",content:quick});return true}
  // several questions in one: "profit aur balance batao"
  const parts=ql.split(/\s+(?:aur|and|&|,|plus)\s+|,\s*/).map(x=>x.trim()).filter(x=>x.length>2);
  if(parts.length>1&&parts.length<=4&&!/(becha|kharida|diya|sell|buy|paid|kharcha)/.test(ql)){const ans=parts.map(pq=>{const r=laReply(brainApply(brContext(pq)).q);return r.ok&&!r.actions.length?r.text:null});
    if(ans.filter(Boolean).length>=2){const t=ans.filter(Boolean).join("\n\n");out.textContent=t;out.insertAdjacentHTML("beforeend",`<span class="labadge">P2P Brain · ${ans.filter(Boolean).length} answers</span>`);brCount();return true}}
  q=brContext(q);
  let fz=[];try{fz=brFuzzy(q)}catch(e){}let q1=q;fz.forEach(([w,n])=>{q1=q1.replace(new RegExp("(^|[^a-zA-Z0-9])"+w+"(?=[^a-zA-Z0-9]|$)","i"),"$1"+n)});
  const ap=brainApply(q1);let r=laReply(ap.q),intent=null,note="";
  if(!r.ok){const c=brClassify(ap.q);if(c&&c.p>=0.55&&c.cover>=0.34){intent=c.intent;r=laReply(BR_INTENTS[c.intent][0]);if(r.ok)note=`\n(${LA.t("understood as","samjha")}: ${BR_LABEL[c.intent]} · ${Math.round(c.p*100)}%)`}}
  if(r.ok){if(ap.learned)note+="\n("+LA.t("from what you taught me","aapke sikhaaye matlab se")+")";
    if(fz.length){note+=`\n(${fz.map(([w,n])=>w+" → "+n).join(", ")})`;fz.forEach(([w,n])=>brainTeach("alias",w,n).catch(()=>{}));const st=JSON.parse(JSON.stringify(brPending||brStats()));st.fuzzy=(st.fuzzy||0)+fz.length;brSave(st)}
    out.textContent=r.text+note;out.insertAdjacentHTML("beforeend",`<span class="labadge">${isBrain()?"P2P Brain":"App assistant"} · works offline</span>`);brMaybeCard(out,ap.q.toLowerCase());
    {const st=[];if(fz.length)st.push(LA.t("Fixed spelling: ","Spelling sudhari: ")+fz.map(([w,n])=>w+"→"+n).join(", "));if(ap.learned)st.push(LA.t(`Used a phrase you taught: "${ap.learned.from}"`,`Aapka sikhaya vaakya use kiya: "${ap.learned.from}"`));if(intent)st.push(LA.t(`Guessed the topic: ${BR_LABEL[intent]}`,`Topic ka andaza: ${BR_LABEL[intent]}`));const e=[LA.party(" "+ap.q+" "),LA.trader(" "+ap.q+" "),LA.bank(" "+ap.q+" ")].filter(Boolean).map(x=>x.name);if(e.length)st.push(LA.t("Names found: ","Naam mile: ")+[...new Set(e)].join(", "));const pr=LA.period(" "+ap.q+" ");if(pr)st.push(LA.t("Period: ","Samay: ")+LA.pname(pr));if(r.actions.length)st.push(LA.t("Prepared an entry for you to confirm","Entry taiyaar ki, aap confirm karo"));brShowThink(out,st)}if(r.actions.length)actionCard(r.actions);else brFeedback(out,intent,q);
    brCount();if(!r.actions.length)brRemember(ap.q);aiHistory.push({role:"user",content:q},{role:"assistant",content:r.text});return true}
  return false}
async function ask(q){
  q=q.trim();if(!q)return;brApqBump(q);
  addMsg("u",q);$("#askIn").value="";$("#askBtn").disabled=true;
  const out=addMsg("a","");out.innerHTML=thinkHTML(LA.t("Thinking","Soch raha hoon"));
  const online=aiOnline();
  if(pref("laFirst")!==false||!online){let done=false;try{done=laAnswer(q,out)}catch(e){console.error(e)}
    if(done){$("#askBtn").disabled=false;return}
    if(!online){const stx=[];const ab=brAbout(q.toLowerCase(),stx);if(ab){out.textContent=ab;out.insertAdjacentHTML("beforeend",`<span class="labadge">P2P Brain · partial answer</span>`);brShowThink(out,stx);const d=document.createElement("div");out.appendChild(d);brainAsk(q,d);$("#askBtn").disabled=false;return}
      if(btok(q).length<=3){out.textContent=LA.t("Not sure what you meant, so here is the latest:","Pakka samajh nahi aaya, isliye abhi ka haal bata raha hoon:")+"\n"+brActivity();out.insertAdjacentHTML("beforeend",`<span class="labadge">P2P Brain</span>`);const d=document.createElement("div");out.appendChild(d);brainAsk(q,d);if(d.firstChild&&d.firstChild.nodeType===3)d.firstChild.textContent=LA.t("Or did you mean:","Ya aapka matlab tha:");$("#askBtn").disabled=false;return}
      brainAsk(q,out);$("#askBtn").disabled=false;return;out.textContent=LA.t("I can't answer that offline. Ask about profit, parties, banks, limits, stock, traders, rates, target, or give a command like \"500 usdt 93 pe becha Ravi ko\". Type help for examples.","Ye main bina AI ke nahi samajh paaya. Profit, party, bank, limit, stock, trader, rate, target ke baare me poocho, ya command do jaise \"500 usdt 93 pe becha Ravi ko\". Examples ke liye help likho.");$("#askBtn").disabled=false;return}}
  const prompt=`You are the AI agent inside "${APP_NAME}", an app for an Indian P2P crypto merchant (exchange P2P, direct deals, cash deals). ${aiStyle()} Amounts in ₹ with Indian formatting. Keep JSON keys and action fields in English.
Follow the user's taught rules in MEMORY.
You can ANSWER questions from the data, and you can PREPARE ACTIONS when the user tells you something happened or asks you to record/change something. The user confirms actions before they are saved, so prepare them when the intent is clear; if a key detail is missing (side, quantity, rate, amount, which party), ask for it instead of guessing. Use exact bank and party names from the data. Never invent numbers. Do not give firm investment advice.
Allowed actions (JSON objects):
- {"type":"add_order","side":"BUY|SELL","coin":"USDT","qty":number,"rate":number,"mode":"P2P|Direct|Cash","status":"Completed|Pending|Appeal|Cancelled","platform":"Binance|Bybit|OKX|KuCoin|Other","payment":"UPI|IMPS|Bank Transfer|Paytm|Cash","counterparty":"","note":"","banks":[{"bank":"my bank name","amount":number,"method":"UPI|IMPS|NEFT|Cash"}]}
- {"type":"set_order_status","order_id":"id from recent_orders","status":"Completed|Pending|Appeal|Cancelled"}
- {"type":"assign_banks","order_id":"id","banks":[{"bank":"","amount":number,"method":""}]}
- {"type":"add_expense","amount":number,"category":"Food|Travel|Rent|Bills|Family|Shopping|Health|Other","bank":"my bank name or empty","note":""}
- {"type":"transfer","from":"bank","to":"bank","amount":number,"method":"IMPS|UPI|NEFT|Cash"}
- {"type":"lite_load","bank":"my bank with UPI Lite","amount":number}  (also "lite_out" to withdraw back to the bank, "lite_spend" for a Lite payment up to 1000)
- {"type":"add_party_due","party":"name","amount":number,"note":""}
- {"type":"pay_party","party":"name","amount":number,"to_account":"their bank or UPI","paid_by":"me or person's name","banks":[{"bank":"my bank","amount":number,"method":"IMPS|UPI|NEFT"}],"note":""}
- {"type":"tag_counterparty","name":"counterparty name","tag":"star|block","note":"why"} — when the user says someone is trusted, a fraud, or should be blocked.
For BUY the banks are where the user paid from; for SELL where money was received. Bank amounts must add up to at most qty×rate. When the user says "rest" from a bank, calculate it. Check bank balances and limits and warn in the reply if something looks short.
${pref("mem")?`- {"type":"remember","note":"short fact"} — when the user states a lasting rule, preference or fact about their business or a person (e.g. which bank to use for someone, a person's reliability). Do not remember one-time events or numbers already saved as records.
`:""}Respond ONLY with JSON: {"reply":"text for the user","actions":[...],"topic":"one of: ${Object.keys(BR_INTENTS).join("|")}|other — the kind of question, for the app's own brain to learn"} (actions can be empty).
MEMORY: ${JSON.stringify(aiMemory())}
DATA: ${JSON.stringify(agentContext())}`;
  const turns=[...aiHistory.slice(-8),{role:"user",content:prompt+"\n\nUSER: "+q}];
  try{
    out.innerHTML=thinkHTML(LA.t(`New for me · asking ${aiName()}`,`Naya sawaal · ${aiName()} se pooch raha hoon`));
    const text=await Promise.race([aiCall(turns),new Promise((_,rej)=>setTimeout(()=>rej(aiErr("timeout",aiName()+" took too long.")),25000))]);
    let res=null;try{const m=text.match(/\{[\s\S]*\}/);res=m?JSON.parse(m[0]):null}catch(e){}
    const reply=res?String(res.reply||""):text;
    out.textContent=reply||"Done.";
    try{if(res&&res.topic&&BR_INTENTS[res.topic]){brLearn(res.topic,q,2);brainTeach("phrase",q,BR_INTENTS[res.topic][0]).catch(()=>{});out.insertAdjacentHTML("afterend","");const st=JSON.parse(JSON.stringify(brPending||brStats()));st.fromAi=(st.fromAi||0)+1;brSave(st);setTimeout(()=>out.insertAdjacentHTML("beforeend",`<span class="labadge">🧠 ${LA.t("P2P Brain learned this from Claude. Next time it answers offline.","P2P Brain ne ye Claude se seekh liya. Agli baar bina internet jawab dega.")}</span>`),0)}}catch(e){}
    const acts=res&&Array.isArray(res.actions)?res.actions.filter(a=>a&&ACT[a.type]&&(a.type!=="remember"||pref("mem"))).slice(0,10):[];
    if(acts.length)actionCard(acts);
    aiHistory.push({role:"user",content:q},{role:"assistant",content:reply+(acts.length?" [prepared "+acts.length+" action(s) for confirmation]":"")});
    setAiState(true,PROV[aiCfg.prov].n+" connected");
  }catch(err){
    try{if(laAnswer(q,out)){$("#askBtn").disabled=false;return}}catch(e){}
    if(err&&(err.code==="timeout"||err.code==="brain"||err.code==="unavailable"||(isBrain()&&(err.code==="busy"||err.code==="rate_limited")))){out.textContent="";brainAsk(q,out);const nm=aiName();const why=err.code==="busy"?LA.t(`${nm} is busy right now.`,`${nm} abhi busy hai.`):err.code==="rate_limited"?LA.t(`Today's free ${nm} limit is used up.`,`${nm} ki aaj ki free limit poori ho gayi.`):LA.t(`${nm} didn't answer in time.`,`${nm} ne time pe jawab nahi diya.`);if(out.firstChild&&out.firstChild.nodeType===3)out.firstChild.textContent=why+" "+LA.t("Pick what you meant and I'll remember it:","Aapka matlab chuno, main yaad rakhunga:");$("#askBtn").disabled=false;return}
    out.textContent=err&&err.code==="not_granted"?"AI permission was not granted. Allow it and ask again.":err&&err.code==="rate_limited"?(err.text&&aiCfg.prov!=="builtin"?err.text:"Too many requests. Wait a moment and ask again."):(err&&err.text)||"Couldn't get an answer. Try again.";
    if(err&&["bad_key","no_key","no_model","no_url","unavailable","network"].includes(err.code)){setAiState(false,"Not connected");$("#aiSet").open=true}
  }
  $("#askBtn").disabled=false;
}

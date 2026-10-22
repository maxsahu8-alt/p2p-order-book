// ===== Smart Intake extras: live fields, two scores, debug screen =====
(function(){if(!document.getElementById("p7css2")){const s=document.createElement("style");s.id="p7css2";s.textContent=`.ixlive{display:grid;gap:8px;margin-top:8px}.ixlv{border:1px solid var(--line);border-radius:12px;padding:8px 10px}.ixlv>b{display:block;font:700 .72rem var(--body);margin-bottom:4px}.ixlv div{display:flex;justify-content:space-between;gap:10px;font:500 .78rem var(--body);padding:2px 0}.ixlv span{color:var(--muted)}.ixlv em{font-style:normal;color:var(--accent);font-weight:600;text-align:right}.ixlv i{font-style:normal;color:var(--warn);text-align:right}.ixsc{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}.ixsc1{border:1px solid var(--line);border-radius:12px;padding:8px 10px}.ixsc1 span{display:block;font:600 .66rem var(--body);color:var(--muted)}.ixsc1 b{font:800 1.1rem var(--body)}.ixsc1 u{display:block;height:5px;border-radius:5px;background:var(--soft);margin-top:5px;text-decoration:none;overflow:hidden}.ixsc1 u i{display:block;height:100%;background:var(--accent)}.ixdbg pre{white-space:pre-wrap;word-break:break-word;font:500 .7rem/1.4 ui-monospace,monospace;background:var(--soft);border-radius:10px;padding:8px;max-height:220px;overflow:auto}`;document.head.appendChild(s)}})();
function ixAcctOk(s){return/\d{2,}|x{3,}|\*{2,}|•{2,}/i.test(String(s||""))}
function ixLiveHtml(){const its=(ixS.items||[]).filter(x=>x.ocr&&x.ocr.text);if(!its.length)return"";
 its.forEach(it=>{if(!it.__live){try{ixItem(it)}catch(e){}it.__live=1}});
 const money=v=>"₹"+Number(v).toLocaleString("en-IN",{maximumFractionDigits:2});
 return`<div class="ixlive">`+its.map(it=>{const P=it.pay,O=it.ord,f=[];
  if(P)f.push(["Amount",P.amount!=null?money(P.amount):null],["UTR",P.utr],["Sender",P.sender],["Receiver",P.receiver],["Status",P.status]);
  else if(O)f.push(["Amount",O.fiat!=null?money(O.fiat):null],["Order ID",O.id?String(O.id).slice(0,12)+(String(O.id).length>12?"…":""):null],["Buyer",O.buyer],["Seller",O.seller]);
  else f.push(["Details",null]);
  return`<div class="ixlv"><b>${esc(IX_TYPES[it.cls.type]||"Screenshot")}</b>${f.map(([k,v])=>`<div><span>${k}</span>${v?`<em>${esc(v)} ✓</em>`:`<i>Not confidently detected ⚠</i>`}</div>`).join("")}</div>`}).join("")+`</div>`}
function ixLinkCand(g){try{const X=g.X,P=X.pay,O=X.ord;const sd=ixSide(g);if(!g.order||!sd)return null;const nick=sd==="BUY"?O.seller:O.buyer,real=sd==="BUY"?P.receiver:P.sender;if(!nick||!real)return null;if(cpKey(nick)===cpKey(real)||verName(nick,real)==="M")return null;return{nick,real}}catch(e){return null}}
function ixLiteHtml(g){try{if(!feat("lite"))return"";const L=banks.filter(b=>b.type!=="Cash"&&b.lite&&b.lite.on);if(!(g.X&&g.X.pay&&g.X.pay.lite)||!L.length||g.saved)return"";const cur=g.liteBank||g.liteCur||"";
  return`<div class="ixmine ${g.liteAmbig&&!g.liteBank?"warn":"ok"}"><b>UPI Lite bank</b><div style="margin:4px 0 6px;font:500 .84rem var(--body)">${g.liteBank?"You chose this bank.":g.liteAmbig?"The receipt does not name the bank. Pick the one your UPI Lite is on.":"Read from the bank logo on the receipt."}</div><div class="ixown"><select data-ixlite aria-label="Which bank has this UPI Lite?">${L.map(b=>`<option value="${esc(b.id)}" ${b.id===cur?"selected":""}>${esc(b.name||b.bankName)} · Lite ${inr(+b.lite.bal||0)}</option>`).join("")}</select></div></div>`}catch(e){return""}}
function ixLinkHtml(g){const c=ixLinkCand(g);return c?`<div class="ixmine warn"><b>Two names for one person?</b><div style="margin:4px 0 8px;font:500 .84rem var(--body)">Order page shows <b>${esc(c.nick)}</b>. Payment shows <b>${esc(c.real)}</b>.</div><button type="button" class="mini" data-ix="linknames">Link as same person</button></div>`:""}
async function ixLinkNames(nick,real){const a=ixlN(nick),b=ixlN(real);if(a&&b&&a!==b){const[x,y]=a<b?[a,b]:[b,a];try{await ixlSet("ixl_alias_"+ixlH(x+"|"+y),{t:"alias",a:x,b:y,da:nick,db:real})}catch(e){}}return identMerge(cpKey(nick),cpKey(real),[nick,real],real)}
function akaNames(name){const k=cpKey(name);const me=String(name||"").toLowerCase();return[...new Set(recs.filter(r=>r.kind==="ident"&&r.to===k).flatMap(r=>r.names||[]).filter(n=>n&&String(n).toLowerCase()!==me))]}
const IX_W={amount:30,orderid:15,buyer:10,seller:10,utr:10,method:10,time:10,acct:5,status:5},IX_S={MATCH:1,FOUND:1,UNCLEAR:.4,NOTFOUND:0,MISMATCH:0};
function ixScores(g){const X=g.X,P=X.pay,O=X.ord;
 const all=[P.amount,P.utr,P.sender,P.receiver,P.status,P.date||P.time,...(g.order?[O.id,O.fiat!=null?O.fiat:O.crypto,O.buyer||O.seller,O.when]:[])];
 const frac=all.filter(v=>v!=null&&v!=="").length/all.length;
 const oc=g.items.map(x=>x.ocr&&x.ocr.conf).filter(c=>typeof c==="number"),ocr=oc.length?oc.reduce((a,b)=>a+b,0)/oc.length:null;
 const ext=Math.round(ocr==null?frac*100:0.5*ocr+0.5*frac*100);
 let mt=null,rows=[];
 if(g.order){let sw=0,sc=0,amtOk=false;g.cmp.fields.forEach(f=>{const w=IX_W[f.k];if(!w||f.res==="AUTO")return;const s=IX_S[f.res]==null?0:IX_S[f.res];sw+=w;sc+=w*s;if(f.k==="amount")amtOk=s===1;rows.push({k:f.k,label:f.label,res:f.res,w,pts:Math.round(w*s*10)/10})});
  mt=sw?Math.round(sc/sw*100):null;if(mt!=null&&!amtOk)mt=Math.min(mt,40)}
 return{ext,match:mt,rows,frac:Math.round(frac*100),ocr:ocr==null?null:Math.round(ocr)}}
function ixScoreHtml(g){let s;try{s=ixScores(g)}catch(e){return""}const bar=(l,v,t)=>`<div class="ixsc1" title="${t}"><span>${l}</span><b>${v==null?"—":v+"%"}</b><u><i style="width:${v||0}%"></i></u></div>`;
 return`<div class="ixsc">${bar("Extraction confidence",s.ext,"How sure we are that we read the screenshots correctly")}${bar("Transaction match",s.match,"How strongly the payment and the order belong together")}</div>`}
sheets.ixdebug=function(id){const g=(ixS.groups||[]).find(x=>x.id===id)||ixS.groups[0];if(!g)return toast("Nothing to show");
 let S={rows:[]};try{S=ixScores(g)}catch(e){}const T=g.T||{},ms=v=>v==null?"—":(v/1000).toFixed(1)+" s";
 const idx=x=>{const i=g.items.indexOf(x);return i<0?"—":"Screenshot "+(i+1)};const payIt=g.pays[0],ordIt=g.order;
 const F=[];const add=(src,o,keys)=>keys.forEach(k=>{if(o&&o[k]!=null&&o[k]!=="")F.push([k,o[k],src])});
 add(idx(payIt)+(g.aiFilled&&g.aiFilled.size?" + AI":""),g.X.pay,["amount","utr","sender","receiver","status","method","bank","date","time","acct"]);add(idx(ordIt)+(g.aiFilled&&g.aiFilled.size?" + AI":""),g.X.ord,["id","fiat","crypto","coin","price","buyer","seller","when","method","platform"]);
 const aiTxt=JSON.stringify({status:g.ai||null,error:g.aiErr||null,reasons:g.reasonsAI||[],conflicts:g.conflicts||[],aiPay:g.aiPay||null,aiOrd:g.aiOrd||null},null,1);
 openSheet(`<div class="insw ixdbg"><div class="insh"><h3>Debug</h3><span class="note">developer details</span></div>
  <div class="pcsec">Processing time</div><div class="dqr"><span>Reading photos<small>${ms(T.prep)} prep · ${ms(T.ocr!=null&&T.prep!=null?T.ocr-T.prep:null)} OCR</small></span><b>${ms(T.done)}</b></div>
  <div class="pcsec">Screenshots</div>${g.items.map((x,i)=>`<div class="p7c"><h4>Screenshot ${i+1} · ${esc(IX_TYPES[x.cls.type]||x.cls.type)}</h4><small class="note">classified ${Math.round((x.cls.conf||0)*100)}% · engine ${esc((x.ocr&&x.ocr.engine)||"—")} · OCR confidence ${x.ocr&&x.ocr.conf!=null?Math.round(x.ocr.conf)+"%":"—"}</small><pre>${esc((x.ocr&&x.ocr.text)||"(no text)")}</pre></div>`).join("")}
  <div class="pcsec">Detected fields</div>${F.map(([k,v,s])=>`<div class="dqr"><span>${esc(k)}<small>${esc(s)}</small></span><b style="max-width:55%;text-align:right;word-break:break-word">${esc(String(v))}</b></div>`).join("")||'<p class="note">Nothing detected.</p>'}
  <div class="pcsec">Match calculation</div>${S.rows.map(r=>`<div class="dqr"><span>${esc(r.label)}<small>${esc(r.res)} · weight ${r.w}</small></span><b>${r.pts}</b></div>`).join("")||'<p class="note">No order, so no match score.</p>'}
  <div class="dqr"><span>Extraction ${S.ext}% = half OCR confidence${S.ocr!=null?" ("+S.ocr+"%)":" (not available)"} + half fields read (${S.frac}%)<small>Match ${S.match==null?"—":S.match+"%"} = points ÷ weights${S.match!=null&&S.match<=40?" · capped at 40 when the amount does not match":""}</small></span></div>
  <div class="pcsec">Risk flags</div><pre>${esc(JSON.stringify({level:g.risk.level,reasons:g.risk.reasons,flags:g.cmp.flags,local:g.cmp.local,duplicates:g.dups.map(d=>d.msg)},null,1))}</pre>
  <div class="pcsec">AI response</div><pre>${esc(aiTxt)}</pre>
  <div class="pcsec">Boxes</div><p class="note">Bounding boxes are not recorded: the phone reader returns text only.</p></div>`)};


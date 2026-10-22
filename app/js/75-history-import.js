// ================= CLIENT HISTORY BOOK (old history kept as per-client summaries, not orders)
var cbCache=null,csCache=null;
function cpBook(){if(cbCache)return cbCache;const m={};recs.filter(r=>r.kind==="cpbook").forEach(r=>Object.assign(m,r.c||{}));
  if(identGet().size)Object.keys(m).forEach(k=>{const t=identRes(k);if(t===k)return;const f=m[k];delete m[k];const x=m[t];if(!x){m[t]=f;return}Object.keys(f).forEach(q=>{if(q==="n")return;if(q==="f")x.f=Math.min(x.f||f.f,f.f);else if(q==="l")x.l=Math.max(x.l||0,f.l||0);else if(q==="h")x.h=Object.assign({},f.h,x.h);else if(typeof f[q]==="number")x[q]=(x[q]||0)+f[q]})});
  return cbCache=m}
function cpSeen(){if(csCache)return csCache;const S=new Set();recs.filter(r=>r.kind==="cpseen").forEach(r=>String(r.h||"").split(",").forEach(x=>x&&S.add(x)));return csCache=S}
function impHash(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function cbAdd(m,o){const nm=(o.cp||"").trim();if(!nm)return false;const k=cpKey(nm);const x=m[k]=m[k]||{n:nm,o:0,d:0,c:0,a:0,bn:0,bq:0,bv:0,sn:0,sq:0,sv:0,f:o.time,l:o.time,h:{}};
  x.o++;if(o.status==="Cancelled")x.c++;else if(o.status==="Appeal")x.a++;else if(o.status==="Completed"){x.d++;const v=o.qty*o.rate;if(o.side==="BUY"){x.bn++;x.bq=+(x.bq+o.qty).toFixed(2);x.bv=Math.round(x.bv+v)}else{x.sn++;x.sq=+(x.sq+o.qty).toFixed(2);x.sv=Math.round(x.sv+v)}}
  x.f=Math.min(x.f,o.time);x.l=Math.max(x.l,o.time);const hr=new Date(o.time).getHours();x.h[hr]=(x.h[hr]||0)+1;return true}
async function cbSave(m,hashes){
  const keys=Object.keys(m).sort();const chunks=[];for(let i=0;i<keys.length;i+=600)chunks.push(Object.fromEntries(keys.slice(i,i+600).map(k=>[k,m[k]])));
  const H=[...hashes];const hch=[];for(let i=0;i<H.length;i+=28000)hch.push(H.slice(i,i+28000).join(","));
  const oldB=recs.filter(r=>r.kind==="cpbook").map(r=>r.id),oldS=recs.filter(r=>r.kind==="cpseen").map(r=>r.id);
  const docs=[...chunks.map((c,i)=>({id:"cb_"+i,kind:"cpbook",c,time:Date.now()})),...hch.map((h,i)=>({id:"cs_"+i,kind:"cpseen",h,time:Date.now()}))];
  const keep=new Set(docs.map(d=>d.id));const del=[...oldB,...oldS].filter(id=>!keep.has(id));
  if(col){for(const d of docs){let ok=false;for(let a=0;a<3&&!ok;a++){try{await col.doc(d.id).set(d);ok=true}catch(e){if(e&&(e.code==="quota_exceeded"||e.code==="invalid_argument"))throw e;await new Promise(k=>setTimeout(k,500*(a+1)))}}if(!ok)throw new Error("save")}for(const id of del){try{await col.doc(id).delete()}catch(e){}}}
  else{recs=recs.filter(r=>!(r.kind==="cpbook"||r.kind==="cpseen"));recs.push(...docs);lsSave();splitRecs();render()}
  cbCache=null;csCache=null}
// import
const FIELDS=[["orderNo","Order number",/order.?(no|num|id)|^order$|^id$|order.?#/i],["side","Buy / Sell",/order.?type|side|^type$|direction|trade.?type|buy.?\/?.?sell/i],["coin","Coin",/^(?!.*(quantity|amount|qty|price|volume|value|total|fiat)).*(asset|coin|crypto|token|currency)/i],["qty","Quantity (coin)",/quantity|^qty|amount.*(crypto|coin|asset)|(crypto|coin|asset|usdt).?(amount|qty)|^amount$|^volume$/i],["rate","Price / rate",/^price|unit.?price|^rate$|rate.?\(|order.?price|^price.?\(/i],["total","Total (₹)",/total|fiat.?amount|inr|amount.?\(?(₹|inr|fiat)/i],["status","Status",/status|state/i],["time","Date / time",/time|date|created/i],["cp","Counterparty",/counter.?part|couterparty|nick|merchant|^user|buyer|seller/i],["pay","Payment method",/pay(ment)?.?(method|mode|type)?$|^pay/i]];
const IMP_REQ=["side","qty","time"];
let IMP={files:[],rows:[],tz:"ist",fix:{}};let impWhat=(()=>{try{return localStorage.getItem("p2p_impwhat")||"client"}catch(e){return"client"}})();let impOrders=[];
const loadScript=src=>new Promise((ok,no)=>{if(document.querySelector(`script[src="${src}"]`))return ok();const t=document.createElement("script");t.src=src;t.onload=ok;t.onerror=()=>no(new Error("load"));document.head.appendChild(t)});
const num=v=>{if(typeof v==="number")return v;let s=String(v??"").replace(/[₹$,\s]|INR|USDT|rs\.?/gi,"");const n=parseFloat(s.replace(/[^0-9.\-]/g,""));return isFinite(n)?n:0};
function normSide(v){v=String(v||"").toLowerCase();return /sell|^s$|sold|बेच/.test(v)?"SELL":/buy|purchase|^b$|bought/.test(v)?"BUY":""}
function normStatusX(v){v=String(v||"").toLowerCase().replace(/\s+/g," ").trim();if(!v)return"Completed";if(/cancel|expire|fail|reject|timeout|timed out|closed by|refund/.test(v))return"Cancelled";if(/appeal|dispute|complain/.test(v))return"Appeal";if(/^paid$|unpaid|not paid|buyer paid|marked paid|^paid,? ?(waiting|pending)/.test(v))return"Pending";if(/^compl|complet|charged|success|done|finish|releas|paid|filled|settled|^ok$/.test(v))return"Completed";if(/pending|processing|in progress|unpaid|waiting|to be paid|ongoing|created|open/.test(v))return"Pending";return null}
function normStatus(v){v=String(v||"").toLowerCase();if(/cancel|expire|fail|reject|timeout/.test(v))return"Cancelled";if(/appeal|dispute/.test(v))return"Appeal";if(/complet|charged|success|done|finish|released|paid|filled/.test(v)||!v)return"Completed";return"Pending"}
// date: decides day-first vs month-first from all samples, returns NaN when unreadable (never "now")
function impDateMode(samples){let dmy=0,mdy=0;samples.forEach(s=>{const m=String(s||"").match(/^\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);if(!m)return;if(+m[1]>12)dmy++;else if(+m[2]>12)mdy++});return mdy>dmy?"mdy":"dmy"}
function normTime(v,mode){if(v instanceof Date)return isNaN(v)?NaN:v.getTime();if(typeof v==="number"&&v>20000&&v<80000)return Math.round((v-25569)*864e5+new Date().getTimezoneOffset()*6e4);if(typeof v==="number"&&v>1e11&&v<1e13)return v;if(typeof v==="number"&&v>1e9&&v<1e10)return v*1000;
  const s=String(v||"").trim().replace(/\s+/g," ");if(!s)return NaN;
  let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if(m){let [_,a,b,y,h,mi,se,ap]=m;y=+y<100?2000+ +y:+y;let d=+a,mo=+b;if(mode==="mdy"||(+a<=12&&+b>12)){d=+b;mo=+a}h=+(h||0);if(ap&&/pm/i.test(ap)&&h<12)h+=12;if(ap&&/am/i.test(ap)&&h===12)h=0;const t=new Date(y,mo-1,d,h,+(mi||0),+(se||0)).getTime();return mo>=1&&mo<=12&&d>=1&&d<=31?t:NaN}
  m=s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m)return new Date(+m[1],m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0)).getTime();
  const t=Date.parse(s);return isNaN(t)?NaN:t}
function safeId(s){return String(s).replace(/[^A-Za-z0-9_\-.~]/g,"").slice(0,120)}
function impAutoMap(head){const map={};FIELDS.forEach(([k,,re])=>{const i=head.findIndex(h=>re.test(String(h).trim())&&!Object.values(map).includes(h));map[k]=i>=0?head[i]:""});if(map.total&&map.total===map.qty)map.total="";if(map.rate&&/exchange.?rate/i.test(map.rate)){const i=head.findIndex(h=>/^price/i.test(h));map.rate=i>=0?head[i]:map.rate}return map}
// ---- readers: every file → {name, head, rows:[{cells:{}, src}], map, via, note}
function impPlat(t){t=String(t||"").toLowerCase();return /kucoin/.test(t)?"KuCoin":/binance/.test(t)?"Binance":/bybit/.test(t)?"Bybit":/\bokx\b|okex/.test(t)?"OKX":/bitget/.test(t)?"Bitget":/\bmexc\b/.test(t)?"MEXC":""}
async function impReadSheet(file){
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
  const isTxt=/\.(csv|txt|tsv)$/i.test(file.name);const wb=isTxt?XLSX.read(await file.text(),{type:"string",raw:true,dense:false}):XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});const out=[];
  for(const n of wb.SheetNames){const a=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:"",raw:true});if(!a.length)continue;
    let hi=a.findIndex(r=>r.filter(c=>String(c).trim()).length>=3&&FIELDS.filter(([,,re])=>r.some(c=>re.test(String(c).trim()))).length>=3);if(hi<0)continue;
    const head=a[hi].map((h,i)=>String(h).trim()||"Column "+(i+1));const hs=head.join("|");
    const rows=[];a.slice(hi+1).forEach((r,ri)=>{if(!r.some(c=>String(c).trim()))return;if(r.map(c=>String(c).trim()).join("|")===hs)return;rows.push({cells:Object.fromEntries(head.map((h,i)=>[h,r[i]])),src:`${n} · row ${hi+ri+2}`})});
    out.push({name:file.name+(wb.SheetNames.length>1?" › "+n:""),head,rows,map:impAutoMap(head),via:"sheet",plat:impPlat(file.name+" "+a.slice(0,hi+1).flat().join(" "))})}
  if(!out.length)out.push({name:file.name,head:[],rows:[],map:{},via:"sheet",note:"No order table found in this file."});
  return out}
async function impPdfLib(){const v="3.11.174";await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.min.js`);pdfjsLib.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.js`}
function impPdfLines(items){const L=[];items.filter(t=>t.str&&t.str.trim()).map(t=>({s:t.str.trim(),x:t.transform[4],y:t.transform[5],w:t.width||t.str.length*4})).sort((a,b)=>b.y-a.y||a.x-b.x).forEach(it=>{const l=L.find(l=>Math.abs(l.y-it.y)<=3);if(l)l.items.push(it);else L.push({y:it.y,items:[it]})});L.forEach(l=>l.items.sort((a,b)=>a.x-b.x));return L}
async function impReadPdf(file){await impPdfLib();
  const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;const pages=[];
  for(let i=1;i<=pdf.numPages;i++){$("#i-status").textContent=`Reading ${file.name} · page ${i} of ${pdf.numPages}…`;const c=await(await pdf.getPage(i)).getTextContent();pages.push(impPdfLines(c.items))}
  // 1) offline table reader — rows are vertical bands around each "anchor" line (the line that has Buy/Sell),
  //    so cells that wrap above or below (long order IDs, names) stay with their own order
  let cols=null,head=[];const rows=[];
  const hdrWord=s=>/^(order|release|time|date|name|amount|quantity|status|currency|side|type|price|fiat|crypto|counterparty|tax|fee|total|coin|asset|\(?utc[^\s]*\)?|time\(utc[^)]*\)|\(.*\))$/i.test(s.trim());
  const mkCols=(H)=>H.map(h=>({s:h.s,c:h.x+h.w/2,x:h.x,w:h.w}));
  const nearest=(it)=>{const cx=it.x+it.w/2;let best=0,bd=1e9;cols.forEach((c,ci)=>{const d=Math.min(Math.abs(cx-c.c),Math.abs(it.x-c.x));if(d<bd){bd=d;best=ci}});return best};
  pages.forEach((lines,pi)=>{let hi=-1;
    lines.forEach((l,li)=>{const txt=l.items.map(i=>i.s).join(" ");const hits=FIELDS.filter(([,,re])=>l.items.some(i=>re.test(i.s))||re.test(txt)).length;
      if(hi<0&&hits>=4&&!/\d{6,}/.test(txt.replace(/utc[+\-]\d+:\d+/ig,""))){hi=li;const H=[];l.items.forEach(it=>{const p=H[H.length-1];if(p&&it.x-(p.x+p.w)<6){p.s+=" "+it.s;p.w=it.x+it.w-p.x}else H.push({...it})});
        // header words printed just above/below the header line (two-line headers like "Release / Time(UTC+08:00)")
        [lines[li-1],lines[li+1]].forEach((x,k)=>{if(!x||Math.abs(x.y-l.y)>18||!x.items.every(it=>it.s.split(/\s+/).every(hdrWord)))return;x.hdr=true;
          x.items.forEach(it=>{const cx=it.x+it.w/2;const m=H.find(h=>Math.abs(h.x+h.w/2-cx)<24||Math.abs(h.x-it.x)<12);if(m)m.s=k===0?it.s+" "+m.s:m.s+" "+it.s;else H.push({...it})})});
        H.sort((a,b)=>a.x-b.x);cols=mkCols(H);head=cols.map(c=>c.s)}});
    if(!cols)return;
    const sideCol=cols.findIndex(c=>FIELDS[1][2].test(c.s)),noCol=cols.findIndex(c=>FIELDS[0][2].test(c.s));
    const data=lines.filter((l,li)=>li>hi&&hi>=0&&!l.hdr||hi<0&&!l.hdr).map(l=>({y:l.y,items:l.items.map(it=>({...it,ci:nearest(it)}))}));
    const isAnchor=l=>sideCol>=0?l.items.some(it=>it.ci===sideCol&&normSide(it.s)):(l.items.length>=3&&(noCol<0||l.items.some(it=>it.ci===noCol)));
    const anchors=data.filter(isAnchor);if(!anchors.length)return;
    const gaps=anchors.slice(1).map((a,i)=>Math.abs(anchors[i].y-a.y)).sort((a,b)=>a-b);const gap=gaps.length?gaps[gaps.length>>1]:30;
    const bands=anchors.map(a=>({a,lines:[]}));
    const colW=ci=>{const c=cols[ci],n=cols[ci+1];return n?n.x-c.x:Math.max(80,c.w*2)};
    const top=anchors[0].y,orphans=[];
    data.forEach(l=>{if(rows.length&&l.y>top+gap*0.45&&!isAnchor(l)){orphans.push(l);return}let best=null,bd=1e9;bands.forEach(b=>{const d=Math.abs(b.a.y-l.y);if(d<bd){bd=d;best=b}});if(best&&bd<=gap*0.75)best.lines.push(l)});
    // lines above the first order of this page = end of the last order of the previous page
    if(orphans.length){const pr=rows[rows.length-1];orphans.sort((p,q)=>q.y-p.y).forEach(l=>{const per={};l.items.forEach(it=>{(per[it.ci]=per[it.ci]||[]).push(it)});Object.entries(per).forEach(([ci,its])=>{its.sort((p,q)=>p.x-q.x);const k=cols[ci].s,t=its.map(i=>i.s).join(" ");const w=its[its.length-1].x+its[its.length-1].w-its[0].x;
      const wrapped=+ci===noCol||(pr._w&&pr._w[k]||0)>=colW(+ci)*0.72;pr.cells[k]=pr.cells[k]?pr.cells[k]+(wrapped?"":" ")+t:t;pr._w=pr._w||{};pr._w[k]=w})})}
    bands.forEach(b=>{const parts={};b.lines.sort((p,q)=>q.y-p.y).forEach(l=>{const per={};l.items.forEach(it=>{(per[it.ci]=per[it.ci]||[]).push(it)});
        Object.entries(per).forEach(([ci,its])=>{its.sort((p,q)=>p.x-q.x);(parts[ci]=parts[ci]||[]).push({s:its.map(i=>i.s).join(" "),w:its[its.length-1].x+its[its.length-1].w-its[0].x})})});
      const cells={},_w={};Object.entries(parts).forEach(([ci,frs])=>{let s="",prevW=0;frs.forEach(f=>{if(!s)s=f.s;else{const wrapped=+ci===noCol||prevW>=colW(+ci)*0.72;s+=(wrapped?"":" ")+f.s}prevW=f.w});cells[cols[ci].s]=s;_w[cols[ci].s]=prevW});
      rows.push({cells,_w,src:`page ${pi+1}`})})});
  const all=pages.map(L=>L.map(l=>l.items.map(i=>i.s).join(" ")).join("\n")).join("\n");
  const ids=new Set((all.match(/\b\d{15,22}\b/g)||[]));
  if(rows.length&&head.length){const map=impAutoMap(head);return[{name:file.name,head,rows,map,via:"pdf",plat:impPlat(file.name+" "+all.slice(0,3000)),note:ids.size&&ids.size!==rows.length?`${ids.size} order numbers seen in the PDF, ${rows.length} rows read. Check the list below.`:""}]}
  // 2) AI reader, with a recount check against order numbers in the text
  if(!(sampleFn||((aiCfg.prov!=="builtin"&&aiCfg.prov!=="brain"&&aiCfg.key||aiOnline()))))return[{name:file.name,head:[],rows:[],map:{},via:"pdf",note:"This PDF is not a table I can read offline. Download the Excel/CSV export from the exchange, or turn on AI."}];
  const chunks=[];let c0="";all.split("\n").forEach(l=>{if((c0+l).length>9000&&c0){chunks.push(c0);c0=""}c0+=l+"\n"});if(c0)chunks.push(c0);
  const got=[];for(let i=0;i<chunks.length;i++){$("#i-status").textContent=`Reading ${file.name} with AI · part ${i+1} of ${chunks.length}…`;
    const ask=async extra=>{const r=await aiJson(`Extract EVERY P2P crypto order row from this exchange order-history text. Do not skip any row, including cancelled ones. Return JSON: {"orders":[{"orderNo":string,"side":"BUY"|"SELL","coin":string,"qty":number,"rate":number,"total":number,"status":string,"time":"YYYY-MM-DD HH:mm:ss","cp":string,"pay":string}]}. side is the user's side (BUY = user bought crypto). Numbers without commas or currency signs. If a field is unclear leave it "".${extra||""}\n\nTEXT:\n${chunks[i]}`);return(r&&r.orders)||[]};
    let part=await ask();const want=(chunks[i].match(/\b\d{15,22}\b/g)||[]);const have=new Set(part.map(o=>String(o.orderNo||"")));const miss=[...new Set(want)].filter(x=>!have.has(x));
    if(miss.length&&miss.length<=60){const more=await ask(`\nThese order numbers were missed last time, include them: ${miss.join(", ")}`);more.forEach(o=>{if(!have.has(String(o.orderNo)))part.push(o)})}
    part.forEach(o=>got.push({cells:o,src:`AI · part ${i+1}`}))}
  const head2=FIELDS.map(f=>f[0]);return[{name:file.name,head:head2,rows:got,map:Object.fromEntries(head2.map(k=>[k,k])),via:"ai",note:ids.size&&ids.size>got.length?`${ids.size} order numbers in PDF but only ${got.length} read. Prefer the Excel export for this one.`:"Read with AI. Check a few rows below."}]}
// ---- classify every row: new / update / same / dupe / fix / notorder
function impBuild(){const plat=$("#i-plat").value,mode=$("#i-mode").value,tzo0=IMP.tz==="utc"?-new Date().getTimezoneOffset()*6e4:0;
  IMP.smap=IMP.smap||{};IMP.unk={};const have=new Map(orders.map(o=>[o.id,o]));const haveEx=new Map();orders.forEach(o=>{const x=normRef(exIdOf(o));if(x.length>=8&&!haveEx.has(x))haveEx.set(x,o)});const seen=new Set();const out=[];
  IMP.files.forEach((f,fi)=>{const g0=(row,k)=>f.map[k]?row.cells[f.map[k]]:"";const tzm=String(f.map.time||"").match(/(?:UTC|GMT)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?/i);const tzo=tzm?(-new Date().getTimezoneOffset()-(tzm[1]==="-"?-1:1)*(+tzm[2]*60+ +(tzm[3]||0)))*6e4:tzo0;const dm=impDateMode(f.rows.map(r=>g0(r,"time")));
    f.rows.forEach((row,ri)=>{const g=k=>g0(row,k);const key=fi+":"+ri;const fx=IMP.fix[key]||{};
      if(fx.ignore){out.push({st:"ignored",row,f,key});return}
      const side=fx.side||normSide(g("side"));let qty=fx.qty!=null?+fx.qty:num(g("qty")),rate=fx.rate!=null?+fx.rate:num(g("rate"));const total=num(g("total"));
      if(!rate&&total&&qty)rate=+(total/qty).toFixed(4);if(!qty&&total&&rate)qty=+(total/rate).toFixed(6);
      const tRaw=fx.time||g("time");let time=normTime(tRaw,dm);if(!isNaN(time)&&!fx.time)time+=tzo;
      const filled=["side","qty","rate","total","time","orderNo"].filter(k=>String(g(k)??"").trim()).length;
      const isTot=!side&&Object.values(row.cells).some(c=>/^\s*(grand\s*)?(total|sum|subtotal)\b/i.test(String(c)));
      if(!fx.side&&((filled<=1&&!side&&!(qty>0))||isTot)){out.push({st:"notorder",row,f,key,why:"Not an order row (title, total or note)"});return}
      const why=[!side&&"Buy/Sell missing",!(qty>0)&&"Quantity missing",!(rate>0)&&"Price missing",isNaN(time)&&"Date not readable"].filter(Boolean);
      if(why.length){out.push({st:"fix",row,f,key,why:why.join(" · "),side,qty,rate,tRaw});return}
      const rawNo=g("orderNo");const lossy=typeof rawNo==="number"&&!Number.isSafeInteger(rawNo);const no=lossy?"":String(rawNo||"").replace(/\s+/g,"").replace(/^#/,"").trim();
      const fp=f.plat||plat;const id="imp_"+safeId(fp+"_"+(no||side+"_"+time+"_"+qty+"_"+rate));
      if(seen.has(id)){out.push({st:"dupe",row,f,key,why:"Same order already in another file/row"});return}seen.add(id);
      const rawSt=String(g("status")??"").replace(/\s+/g," ").trim();let stv=IMP.smap[rawSt.toLowerCase()]||normStatusX(rawSt);if(!stv){IMP.unk[rawSt]=(IMP.unk[rawSt]||0)+1;stv="Pending"}
      const o={id,side,coin:String(g("coin")||"USDT").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12)||"USDT",qty,rate,status:stv,mode,pay:mode==="Cash"?"Cash":String(g("pay")||"").slice(0,40),platform:mode==="P2P"?fp:"",cp:String(g("cp")||"").trim().slice(0,80),note:no?"#"+no:"",time};if(no)o.exId=no;
      if(impWhat==="client"){const hs=impHash(id);if(have.has(id)||cpSeen().has(hs)){out.push({st:"same",row,f,key,o});return}out.push({st:"new",row,f,key,o,hs});return}
      if(!have.has(id)&&no){const m=haveEx.get(normRef(no));if(m&&m.id!==id){out.push({st:"same",row,f,key,o,ex:m,why:"Already in app (entered by hand with the same exchange order ID)"});return}}
      const ex=have.get(id);if(ex){const ch=["status","time","cp","qty","rate"].some(k=>String(ex[k]??"")!==String(o[k]??""));out.push({st:ch?"update":"same",row,f,key,o,ex});return}
      out.push({st:"new",row,f,key,o})})});
  IMP.rows=out;return out}
function impReport(){const R=IMP.rows;const c=k=>R.filter(r=>r.st===k).length;const tot=R.length;
  const ok=R.filter(r=>r.o);const sum=s=>ok.filter(r=>r.o.side===s&&r.o.status!=="Cancelled");const q=L=>L.reduce((t,r)=>t+r.o.qty,0),v=L=>L.reduce((t,r)=>t+r.o.qty*r.o.rate,0);
  const ts=ok.map(r=>r.o.time).sort((a,b)=>a-b);const df=t=>new Date(t).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
  const fix=R.filter(r=>r.st==="fix");const CL=impWhat==="client";const cn=new Set(R.filter(r=>r.st==="new"&&r.o.cp).map(r=>cpKey(r.o.cp))).size,nn=R.filter(r=>r.st==="new"&&!r.o.cp).length;
  const parts=[["new",CL?`New orders → ${cn} clients`:"New orders",c("new")],["update","Already in app · will update",c("update")],["same",CL?"Already counted before":"Already in app · no change",c("same")],["dupe","Same order twice in files",c("dupe")],["fix","Need your check",fix.length],["ignored","You ignored",c("ignored")],["notorder","Not orders (titles, totals)",c("notorder")]];
  const sumAll=parts.reduce((t,p)=>t+p[2],0);
  $("#i-rep").hidden=!tot;$("#i-rep").innerHTML=`<div class="irh"><b>${tot} rows read</b><span class="${sumAll===tot?"ok":"bad"}">${sumAll===tot?"✓ every row accounted for":"⚠ count mismatch"}</span></div>
    <div class="irg">${parts.filter(p=>p[2]).map(([k,l,n])=>`<button type="button" class="iri ${k}" data-ir="${k}"><b>${n}</b><span>${l}</span></button>`).join("")}</div>
    ${Object.keys(IMP.unk||{}).length?`<div class="pcsec">Status words to check</div><div class="icard"><p class="note" style="margin:0 0 8px">Your file uses these status words. Tell me what each means:</p>${Object.entries(IMP.unk).map(([w,n])=>`<div class="abr"><span>“${esc(w||"(empty)")}” · ${n}</span><select data-smap="${esc(w.toLowerCase())}"><option value="">Choose…</option>${["Completed","Cancelled","Pending","Appeal"].map(x=>`<option>${x}</option>`).join("")}</select></div>`).join("")}</div>`:""}
    ${ok.length?`<p class="note">Status: ${["Completed","Cancelled","Pending","Appeal"].map(x=>[x,ok.filter(r=>r.o.status===x).length]).filter(x=>x[1]).map(([x,n])=>`<b>${n}</b> ${x}`).join(" · ")}</p>`:""}
    ${ok.length?`<div class="irt"><div><span>Buy</span><b>${fmtQ(+q(sum("BUY")).toFixed(2))}</b><small>${inr(Math.round(v(sum("BUY"))))}</small></div><div><span>Sell</span><b>${fmtQ(+q(sum("SELL")).toFixed(2))}</b><small>${inr(Math.round(v(sum("SELL"))))}</small></div><div><span>Dates</span><b>${ts.length?df(ts[0]):""}</b><small>to ${ts.length?df(ts[ts.length-1]):""}</small></div></div><p class="note">Totals leave out cancelled orders (${ok.filter(r=>r.o.status==="Cancelled").length}). Match them with your exchange to be sure.</p>`:""}
    ${(()=>{const names=new Set(IMP.files.map(f=>f.name.split(" › ")[0]));const L=recs.filter(r=>r.kind==="implog"&&(r.files||[]).some(n=>names.has(String(n).split(" › ")[0])));const old=L.map(l=>({l,n:orders.filter(o=>o.impB===l.batch).length})).filter(x=>x.n);if(!old.length)return"";const tot=old.reduce((t,x)=>t+x.n,0);
      return`<div class="icard irold"><b>This file was imported before</b><p class="note" style="margin:4px 0 8px">${tot} orders from the earlier import are still in the app. If that import was wrong, remove them first so nothing is doubled.</p><button type="button" class="mini ghost" id="i-rmold" data-b="${esc(old.map(x=>x.l.batch).join(","))}" style="color:var(--sell)">Remove ${tot} old orders</button></div>`})()}
    ${IMP.files.filter(f=>f.note).map(f=>`<p class="note irw">⚠ ${esc(f.name)}: ${esc(f.note)}</p>`).join("")}
    ${fix.length?`<div class="pcsec">Need your check <span class="note">${fix.length}</span><button type="button" class="link" id="i-ignall">Ignore all</button></div><div class="ifl">${fix.slice(0,40).map(r=>`<div class="ifi" data-key="${r.key}"><small>${esc(r.f.name)} · ${esc(r.row.src)}</small><p>${esc(Object.values(r.row.cells).filter(x=>String(x).trim()).map(x=>x instanceof Date?x.toLocaleString("en-IN"):String(x)).join(" | ").slice(0,220))}</p><em>${esc(r.why)}</em>
      <div class="ifx"><div class="seg ifs"><button type="button" data-fs="BUY" class="${r.side==="BUY"?"on":""}">Buy</button><button type="button" data-fs="SELL" class="${r.side==="SELL"?"on":""}">Sell</button></div><input data-ff="qty" type="number" inputmode="decimal" placeholder="Qty" value="${r.qty>0?r.qty:""}"><input data-ff="rate" type="number" inputmode="decimal" placeholder="Price" value="${r.rate>0?r.rate:""}"><input data-ff="time" type="datetime-local" value=""></div>
      <div class="ifa"><button type="button" class="link del" data-fi="1">Ignore</button><button type="button" class="mini psdl" data-fo="1">Save fix</button></div></div>`).join("")}${fix.length>40?`<p class="note">+ ${fix.length-40} more. Fix these first, or tap Ignore all.</p>`:""}</div>`:""}`;
  const go=$("#i-go");const n=c("new")+c("update");$("#i-preview").hidden=!tot;
  const unkN=Object.keys(IMP.unk||{}).length;go.disabled=!!fix.length||!n||!!unkN;go.textContent=unkN?`Choose meaning of ${unkN} status word${unkN>1?"s":""} first`:fix.length?`Check ${fix.length} row${fix.length>1?"s":""} first`:n?(CL?`Save client data (${cn} clients)`:`Import ${c("new")} new${c("update")?" + update "+c("update"):""}`):"Nothing new to import";
  if(CL&&nn)$("#i-rep").insertAdjacentHTML("beforeend",`<p class="note irw">${nn} orders have no client name, so they only count in totals, not for any client.</p>`);
  $("#i-list").innerHTML=ok.filter(r=>r.st==="new"||r.st==="update").slice(0,5).map(({o,st})=>`<div class="order"><span class="side ${o.side}">${o.side}</span><div class="o-main"><b>${fmtQ(o.qty)} ${esc(o.coin)}</b> @ <span class="num">₹${o.rate}</span><div class="o-meta">${new Date(o.time).toLocaleString("en-IN",{day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})} · ${esc(o.status)}${o.cp?" · "+esc(o.cp):""}${st==="update"?" · update":""}</div></div><span></span></div>`).join("");
  const cap=recs.length+c("new");$("#i-cap").hidden=CL||!(col&&cap>23000);$("#i-cap").textContent=`⚠ Your app would have ${cap.toLocaleString("en-IN")} records. The limit here is 25,000. Import in parts (one year at a time), or use the APK app (no limit).`}
function impFilesUI(){$("#i-files").innerHTML=IMP.files.map((f,i)=>{const miss=IMP_REQ.filter(k=>!f.map[k]).concat(!f.map.rate&&!f.map.total?["rate"]:[]);return`<details class="iff ${miss.length&&f.via!=="ai"&&f.rows.length?"warn":""}" ${miss.length&&f.via!=="ai"&&f.rows.length?"open":""}><summary><b>${esc(f.name)}</b><span>${f.rows.length} rows · ${f.via==="ai"?"AI":f.via==="pdf"?"PDF table":"Excel/CSV"}${f.plat?" · "+f.plat:""}${miss.length&&f.via!=="ai"&&f.rows.length?" · set columns":""}</span></summary>
    ${f.via!=="ai"&&f.head.length?`<div class="imp-map">${FIELDS.map(([k,l])=>`<label>${l}${IMP_REQ.includes(k)?" *":""}<select data-fm="${i}" data-k="${k}"><option value="">— none —</option>${f.head.map(h=>`<option ${h===f.map[k]?"selected":""}>${esc(h)}</option>`).join("")}</select></label>`).join("")}</div>`:""}</details>`}).join("")}
function impRefresh(){impBuild();impFilesUI();impReport()}
$("#i-files").addEventListener("change",e=>{const s=e.target.closest("[data-fm]");if(!s)return;IMP.files[+s.dataset.fm].map[s.dataset.k]=s.value;impBuild();impReport()});
$("#i-plat").onchange=$("#i-mode").onchange=()=>{if(IMP.files.length)impRefresh()};
function impWhatUI(){document.querySelectorAll("#i-what button").forEach(b=>b.classList.toggle("on",b.dataset.w===impWhat));$("#i-whatn").textContent=impWhat==="client"?"Best for old history. Orders are not added to your list; each client's record (orders, cancels, volume, rates, usual time) is saved and shows in Trader 360, client search and P2P Brain. 50,000 orders take very little space.":"Every order is added to your order list, like entries you make yourself. Best for recent months."}
impWhatUI();$("#i-what").onclick=e=>{const b=e.target.closest("[data-w]");if(!b)return;impWhat=b.dataset.w;try{localStorage.setItem("p2p_impwhat",impWhat)}catch(err){}impWhatUI();if(IMP.files.length)impRefresh()};
$("#i-tz").onchange=e=>{IMP.tz=e.target.value;if(IMP.files.length)impRefresh()};
$("#i-rep").addEventListener("change",e=>{const sm=e.target.closest("[data-smap]");if(!sm||!sm.value)return;IMP.smap[sm.dataset.smap]=sm.value;impBuild();impReport()});
$("#i-rep").addEventListener("click",async e=>{const rb=e.target.closest("#i-rmold");if(!rb)return;if(rb.dataset.c!=="1"){rb.dataset.c="1";rb.textContent="Tap again to remove";return}
  const B=new Set(rb.dataset.b.split(","));const ids=orders.filter(o=>B.has(o.impB)).map(o=>o.id);rb.disabled=true;rb.textContent="Removing…";
  if(col){let i=0;const w=async()=>{while(i<ids.length){const id=ids[i++];try{await col.doc(id).delete()}catch(err){}}};await Promise.all([w(),w(),w()])}else{const S=new Set(ids);recs=recs.filter(r=>!S.has(r.id));lsSave();splitRecs();render()}
  toast(ids.length+" old orders removed");setTimeout(()=>{impBuild();impReport()},500)});
$("#i-rep").addEventListener("click",e=>{
  const ia=e.target.closest("#i-ignall");if(ia){if(ia.dataset.c!=="1"){ia.dataset.c="1";ia.textContent="Tap again: ignore all";return}IMP.rows.filter(r=>r.st==="fix").forEach(r=>IMP.fix[r.key]={ignore:true});impBuild();impReport();return}
  const card=e.target.closest(".ifi");if(!card)return;const key=card.dataset.key;
  const sb=e.target.closest("[data-fs]");if(sb){card.querySelectorAll("[data-fs]").forEach(x=>x.classList.toggle("on",x===sb));return}
  if(e.target.closest("[data-fi]")){IMP.fix[key]={ignore:true};impBuild();impReport();return}
  if(e.target.closest("[data-fo]")){const r=IMP.rows.find(x=>x.key===key);const s=(card.querySelector("[data-fs].on")||{}).dataset;const q=card.querySelector('[data-ff=qty]').value,ra=card.querySelector('[data-ff=rate]').value,t=card.querySelector('[data-ff=time]').value;
    const fx={};if(s&&s.fs)fx.side=s.fs;if(q)fx.qty=+q;if(ra)fx.rate=+ra;if(t)fx.time=t.replace("T"," ");
    IMP.fix[key]=fx;impBuild();const r2=IMP.rows.find(x=>x.key===key);if(r2&&r2.st==="fix"){toast(r2.why);}else toast("Fixed");impReport()}});
$("#i-rep").addEventListener("click",e=>{const b=e.target.closest("[data-ir]");if(!b)return;const k=b.dataset.ir;const L=IMP.rows.filter(r=>r.st===k);
  openSheet(`<div class="insw"><div class="insh"><h3>${esc(b.querySelector("span").textContent)}</h3><span class="note">${L.length}</span></div><div class="ifl">${L.slice(0,200).map(r=>`<div class="ifi"><small>${esc(r.f.name)} · ${esc(r.row.src)}</small>${r.o?`<p><b>${r.o.side} ${fmtQ(r.o.qty)} ${esc(r.o.coin)} @ ₹${r.o.rate}</b> · ${new Date(r.o.time).toLocaleString("en-IN",{day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})} · ${esc(r.o.status)}${r.o.note?" · "+esc(r.o.note):""}</p>`:`<p>${esc(Object.values(r.row.cells).filter(x=>String(x).trim()).map(String).join(" | ").slice(0,220))}</p>`}${r.why?`<em>${esc(r.why)}</em>`:""}</div>`).join("")}${L.length>200?`<p class="note">+ ${L.length-200} more</p>`:""}</div><button type="button" class="mini ghost" data-close style="width:100%;margin-top:10px">Close</button></div>`)});
$("#i-file").onchange=async e=>{
  const fl=[...e.target.files];e.target.value="";if(!fl.length)return;
  IMP={files:[],rows:[],tz:$("#i-tz").value,fix:{},smap:{},unk:{}};$("#i-rep").hidden=true;$("#i-preview").hidden=true;$("#i-files").innerHTML="";
  for(const f of fl){$("#i-status").textContent="Reading "+f.name+"…";
    try{IMP.files.push(...(/\.pdf$/i.test(f.name)?await impReadPdf(f):await impReadSheet(f)))}
    catch(err){IMP.files.push({name:f.name,head:[],rows:[],map:{},via:"sheet",note:err&&err.message&&err.message!=="load"?err.message:err&&err.code==="not_granted"?"Allow AI permission to read this PDF, then try again.":"Couldn't open this file. Try the Excel or CSV export."})}}
  const n=IMP.files.reduce((t,f)=>t+f.rows.length,0);
  $("#i-status").textContent=n?`${fl.length} file${fl.length>1?"s":""} read · ${n} rows. Check the summary, then import.`:"No orders found. Check that it is the P2P order history export.";
  impRefresh()};
$("#i-go").onclick=async()=>{
  if(impWhat==="client"){const nw=IMP.rows.filter(r=>r.st==="new");if(!nw.length)return;const b=$("#i-go");b.disabled=true;b.textContent="Saving client data…";
    const m=JSON.parse(JSON.stringify(cpBook()));const H=new Set(cpSeen());const before=Object.keys(m).length;let named=0;nw.forEach(r=>{if(cbAdd(m,r.o))named++;H.add(r.hs)});
    try{await cbSave(m,H);const nc=Object.keys(m).length-before;const upd=new Set(nw.filter(r=>r.o.cp).map(r=>cpKey(r.o.cp))).size;
      try{await putRec({id:"il_ib_"+Date.now().toString(36),kind:"implog",mode:"client",time:Date.now(),files:IMP.files.map(f=>f.name).slice(0,20),rows:IMP.rows.length,created:nw.length,clients:upd,newClients:nc,same:IMP.rows.filter(r=>r.st==="same").length,ignored:IMP.rows.filter(r=>r.st==="ignored").length,updated:0,failed:0})}catch(err){}
      $("#i-preview").hidden=true;$("#i-rep").hidden=true;$("#i-files").innerHTML="";$("#i-status").innerHTML=`✓ Client data saved from ${nw.length} orders: ${upd} clients (${nc} new). <button type="button" class="link" data-sheet="cps">See clients</button>`;toast("Client data saved");IMP={files:[],rows:[],tz:IMP.tz,fix:{}}}
    catch(err){b.disabled=false;b.textContent="Try again";$("#i-status").textContent=err&&err.code==="quota_exceeded"?"Storage is full. Delete some old data and try again.":"Couldn't save. Check internet and try again."}
    return}
  const todo=IMP.rows.filter(r=>r.st==="new"||r.st==="update");if(!todo.length)return;const b=$("#i-go");b.disabled=true;
  const batch="ib_"+Date.now().toString(36);let done=0,fail=[],quota=false;
  const write=async r=>{const o=r.st==="update"?{...r.ex,status:r.o.status,time:r.o.time,cp:r.o.cp||r.ex.cp,qty:r.o.qty,rate:r.o.rate}:{...r.o,impB:batch};
    for(let a=0;a<3;a++){try{await col.doc(o.id).set(o);return true}catch(err){if(err&&err.code==="quota_exceeded"){quota=true;throw err}if(err&&err.code==="invalid_argument")throw err;await new Promise(k=>setTimeout(k,400*(a+1)+Math.random()*300))}}throw new Error("retry")};
  let wi=0;if(col){const worker=async()=>{while(wi<todo.length&&!quota){const r=todo[wi++];try{await write(r);done++}catch(err){fail.push(r)}b.textContent=`Importing ${done+fail.length} of ${todo.length}…`}};await Promise.all([worker(),worker(),worker()]);if(quota)fail.push(...todo.slice(wi))}
  else{const idx=new Map(recs.map((x,i)=>[x.id,i]));todo.forEach(r=>{const o=r.st==="update"?{...r.ex,status:r.o.status,time:r.o.time,cp:r.o.cp||r.ex.cp,qty:r.o.qty,rate:r.o.rate}:{...r.o,impB:batch};if(idx.has(o.id))recs[idx.get(o.id)]=o;else recs.push(o);done++});lsSave();splitRecs();render()}
  const log={id:"il_"+batch,kind:"implog",batch,time:Date.now(),files:IMP.files.map(f=>f.name).slice(0,20),rows:IMP.rows.length,created:todo.filter(r=>r.st==="new").length-fail.filter(r=>r.st==="new").length,updated:todo.filter(r=>r.st==="update").length-fail.filter(r=>r.st==="update").length,same:IMP.rows.filter(r=>r.st==="same").length,ignored:IMP.rows.filter(r=>r.st==="ignored").length,failed:fail.length};
  try{await putRec(log)}catch(err){}
  b.disabled=false;
  if(fail.length){const failIds=new Set(fail.map(r=>r.key));IMP.rows.forEach(r=>{if(!failIds.has(r.key)&&(r.st==="new"||r.st==="update"))r.st="same"});impReport();
    $("#i-status").textContent=quota?`Imported ${done}. Storage limit reached: ${fail.length} not saved. Delete old data or import in parts.`:`Imported ${done}. ${fail.length} couldn't save. Tap Import again to retry them.`;b.textContent=`Retry ${fail.length}`;b.disabled=false;toast(`Imported ${done} · ${fail.length} left`)}
  else{$("#i-preview").hidden=true;$("#i-rep").hidden=true;$("#i-files").innerHTML="";$("#i-status").innerHTML=`✓ Imported ${log.created} new${log.updated?` and updated ${log.updated}`:""} from ${log.rows} rows. <button type="button" class="link" data-sheet="imphist">Import history</button>`;toast(`Imported ${done} orders`);IMP={files:[],rows:[],tz:IMP.tz,fix:{}}}
};
sheets.imphist=function(){const L=recs.filter(r=>r.kind==="implog").sort((a,b)=>b.time-a.time);
  openSheet(`<div class="insw"><div class="insh"><h3>Import history</h3><span class="note">${L.length}</span></div><div class="rml">${L.map(l=>{const n=orders.filter(o=>o.impB===l.batch).length;return`<div class="rmi"><div class="rmt"><b>${new Date(l.time).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"})}</b><small>${esc((l.files||[]).join(", ").slice(0,80))}<br>${l.mode==="client"?`Client data · ${l.created} orders → ${l.clients} clients (${l.newClients} new)`:`${l.rows} rows · ${l.created} new · ${l.updated} updated`}${l.ignored?` · ${l.ignored} ignored`:""}${l.failed?` · ${l.failed} failed`:""}</small></div>${n?`<button type="button" class="link del" data-undo="${esc(l.batch)}">Undo (${n})</button>`:""}</div>`}).join("")||'<p class="note" style="padding:10px 0">No imports yet.</p>'}</div><p class="note">Undo removes only the orders that import added. Orders you edited later are removed too, so check first.</p>${Object.keys(cpBook()).length?`<div class="pcsec">Client history</div><div class="rml"><div class="rmi"><div class="rmt"><b>${Object.keys(cpBook()).length} clients</b><small>${cpSeen().size} old orders counted</small></div><button type="button" class="link del" id="cb-clr">Clear</button></div></div>`:""}</div>`,el=>{
    const cc=el.querySelector("#cb-clr");if(cc)twoTap(cc,async()=>{cc.textContent="Clearing…";try{await cbSave({},new Set());toast("Client history cleared");sheets.imphist()}catch(e){toast("Couldn't clear")}});
    el.querySelectorAll("[data-undo]").forEach(bt=>twoTap(bt,async()=>{const ids=orders.filter(o=>o.impB===bt.dataset.undo).map(o=>o.id);bt.textContent="Removing…";
      if(col){let i=0;const w=async()=>{while(i<ids.length){const id=ids[i++];try{await col.doc(id).delete()}catch(e){}}};await Promise.all([w(),w(),w()])}else{const S=new Set(ids);recs=recs.filter(r=>!S.has(r.id));lsSave();splitRecs();render()}
      toast(ids.length+" imported orders removed");setTimeout(()=>sheets.imphist(),600)}))})};

// AI engine (works with built-in Claude or the user's own provider)
const AIK="p2p_ai_cfg_v1";
let aiCfg={prov:"builtin",key:"",model:"",url:""};
try{aiCfg=Object.assign(aiCfg,JSON.parse(localStorage.getItem(AIK)||"{}"))}catch(e){}
const PROV={braingemini:{n:"P2P Brain + Gemini",help:"Free. P2P Brain answers first, offline. Questions it can't answer go to Google Gemini with your free key, and the Brain learns each answer. Get a free key at aistudio.google.com → Get API key. Free use has a daily limit, and Google may use free-tier questions to improve its products, so don't ask it anything private."},brainclaude:{n:"P2P Brain + Claude",help:"Best of both. P2P Brain answers first, offline and free. Questions it can't answer go to Claude with your API key, and the Brain learns each answer so next time it replies by itself. Get a key at console.anthropic.com (pay per use, usually a few paise per question).",def:"claude-sonnet-5-5"},brain:{n:"P2P Brain",help:"The app's own brain. Answers from your data and records entries, works offline, and learns the words and phrases you teach it. No AI, no key, nothing leaves your phone."},builtin:{n:"Built-in",help:"Uses Claude through this app link. No key needed."},
  anthropic:{n:"Anthropic Claude",help:"Get a key at console.anthropic.com. Leave Model empty to use the default.",def:"claude-sonnet-5-5"},
  openai:{n:"OpenAI",help:"Get a key at platform.openai.com and type the model name you want to use."},
  gemini:{n:"Google Gemini",help:"Get a key at aistudio.google.com and type the model name you want to use."},
  custom:{n:"Custom",help:"Any OpenAI-compatible service. Enter its base URL, key and model."}};
function aiFormSync(){const p=$("#ai-prov").value;
  $("#ai-key-w").hidden=p==="builtin"||p==="brain";$("#ai-model-w").hidden=p==="builtin"||p==="brain"||p==="brainclaude"||p==="braingemini";$("#ai-url-w").hidden=p!=="custom";
  $("#ai-help").textContent=PROV[p].help+(p!=="builtin"&&p!=="brain"?" Your key stays on this device.":"");}
function aiErr(code,text){const e=new Error(text||code);e.code=code;e.text=text;return e}
async function postJSON(url,headers,body){
  let res;const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),40000);
  try{res=await fetch(url,{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify(body),signal:ac.signal});clearTimeout(tm)}
  catch(e){clearTimeout(tm);if(ac.signal.aborted)throw aiErr("busy","The AI took too long to answer.");throw aiErr("network",window.claude?"This app link can only use Built-in AI. Your own key works in the Android app.":"Can't reach the AI service. Check your internet.")}
  const j=await res.json().catch(()=>({}));
  if(res.status===401||res.status===403)throw aiErr("bad_key","The API key was rejected. Check it in AI connection.");
  if(res.status===429)throw aiErr("rate_limited","Too many requests or no credit left on this key.");
  const em=String(j.error&&(j.error.message||j.error)||"");if([500,502,503,504,529].includes(res.status)||/high demand|overloaded|try again later|unavailable/i.test(em))throw aiErr("busy",em||"The AI service is busy. Try again later.");
  if(!res.ok)throw aiErr("api",(j.error&&(j.error.message||j.error))||("AI service error "+res.status));
  return j;
}
function aiName(){return aiCfg.prov==="braingemini"&&!sampleFn?"Gemini":aiCfg.prov==="openai"?"ChatGPT":aiCfg.prov==="gemini"?"Gemini":"Claude"}
function isBrain(){return aiCfg.prov==="brain"||aiCfg.prov==="brainclaude"||aiCfg.prov==="braingemini"}
const brainKeyMode=()=>(aiCfg.prov==="brainclaude"||aiCfg.prov==="braingemini")&&!!aiCfg.key;
function brainVia(){if(!isBrain()||pref("brainSmart")===false)return null;if(sampleFn)return{prov:"builtin"};if(aiCfg.prov==="brainclaude"&&aiCfg.key)return{prov:"anthropic",key:aiCfg.key,model:aiCfg.model||""};if(aiCfg.prov==="braingemini"&&aiCfg.key)return{prov:"gemini",key:aiCfg.key,model:aiCfg.model||"",auto:true};return null}
async function aiCall(turns,onText,images){images=images||[];if(isBrain()&&!brainVia())throw aiErr("brain",aiCfg.prov==="brainclaude"?"Add your Claude API key in Settings → AI so P2P Brain can ask Claude.":aiCfg.prov==="braingemini"?"Add your free Gemini key in Settings → AI so P2P Brain can ask Gemini.":"P2P Brain is on. Pick “P2P Brain + Claude” in Settings → AI to let it learn from Claude.");
  const c=isBrain()?brainVia():aiCfg;
  if(c.prov==="builtin"){
    if(!sampleFn)throw aiErr("unavailable","Built-in AI isn't available here. Choose a provider and add your API key.");
    const o={cache:false,modelTier:"default",onText:onText?({text})=>onText(text):undefined};if(images.length)o.images=images;
    const r=await sampleFn(turns,o);return r.text;
  }
  if(!c.key)throw aiErr("no_key","Add your API key in AI connection.");
  let text="";
  const imgs=await Promise.all(images.map(async b=>({type:b.type||"image/jpeg",data:await new Promise(ok=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result).split(",")[1]);fr.readAsDataURL(b)})})));
  if(imgs.length){const last=turns[turns.length-1];turns=[...turns.slice(0,-1),{...last,_imgs:imgs}]}
  if(c.prov==="anthropic"){
    const j=await postJSON("https://api.anthropic.com/v1/messages",{"x-api-key":c.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},{model:c.model||PROV.anthropic.def,max_tokens:2000,messages:turns.map(t=>t._imgs?{role:t.role,content:[...t._imgs.map(i=>({type:"image",source:{type:"base64",media_type:i.type,data:i.data}})),{type:"text",text:t.content}]}:{role:t.role,content:t.content})});
    text=(j.content||[]).map(x=>x.text||"").join("");
  }else if(c.prov==="gemini"){
    if(!c.model&&!c.auto)throw aiErr("no_model","Type the Gemini model name in AI connection.");
    const body={contents:turns.map(t=>({role:t.role==="assistant"?"model":"user",parts:[...(t._imgs||[]).map(i=>({inline_data:{mime_type:i.type,data:i.data}})),{text:t.content}]}))};
    // free-tier models change names over time: try the saved one, then known free Flash models, and remember what works
    const tryM=c.auto?[...new Set([c.model,"gemini-flash-latest","gemini-3.8-flash","gemini-3.5-flash","gemini-3.5-flash-lite","gemini-3.1-flash-lite"].filter(Boolean))]:[c.model];let j=null,last=null;
    for(const m of tryM){try{j=await postJSON("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(m)+":generateContent",{"x-goog-api-key":c.key},body);if(c.auto&&aiCfg.model!==m){aiCfg.model=m;try{localStorage.setItem(AIK,JSON.stringify(aiCfg))}catch(e){}}break}
      catch(e){last=e;if(!c.auto||e.code==="bad_key"||e.code==="network"||!(e.code==="busy"||e.code==="rate_limited"||/not found|not supported|404|unknown|no longer|deprecat/i.test(String(e.text||e.message))))throw e}}
    if(!j)throw last||aiErr("api","No Gemini model available on this key.");
    text=((j.candidates||[])[0]?.content?.parts||[]).map(x=>x.text||"").join("");
  }else{
    if(!c.model)throw aiErr("no_model","Type the model name in AI connection.");
    const base=c.prov==="openai"?"https://api.openai.com/v1":(c.url||"").replace(/\/+$/,"");
    if(!/^https?:\/\//.test(base))throw aiErr("no_url","Enter the API base URL in AI connection.");
    const j=await postJSON(base+"/chat/completions",{"Authorization":"Bearer "+c.key},{model:c.model,messages:turns.map(t=>t._imgs?{role:t.role,content:[{type:"text",text:t.content},...t._imgs.map(i=>({type:"image_url",image_url:{url:"data:"+i.type+";base64,"+i.data}}))]}:{role:t.role,content:t.content})});
    text=(j.choices||[])[0]?.message?.content||"";
  }
  if(onText)onText(text);return text;
}
async function aiJson(prompt){
  const t=await aiCall([{role:"user",content:prompt+"\n\nReply with JSON only, no other text."}]);
  const m=t.match(/\{[\s\S]*\}/);if(!m)throw aiErr("api","The AI didn't return readable data. Try again.");
  return JSON.parse(m[0]);
}
function setAiState(ok,msg){const e=$("#aiState");e.className="aistate"+(ok===true?" on":ok===false?" err":"");e.textContent=msg;$("#aiProvLbl").textContent=PROV[aiCfg.prov].n}
async function testAi(){
  setAiState(null,"Connecting…");
  if((aiCfg.prov==="brainclaude"||aiCfg.prov==="braingemini")&&!sampleFn){const nm=aiCfg.prov==="braingemini"?"Gemini":"Claude";if(!aiCfg.key){setAiState(false,"Add your "+nm+" key");return aiErr("no_key",nm==="Gemini"?"Paste your free Gemini key (aistudio.google.com → Get API key).":"Paste your Claude API key (from console.anthropic.com).")}
    try{await aiCall([{role:"user",content:"Reply with the single word: OK"}]);setAiState(true,"P2P Brain + "+nm+" (smart)");return true}catch(e){setAiState(false,nm+" key not working");return e}}
  if(isBrain()){setAiState(true,aiOnline()?(aiCfg.prov==="braingemini"?"P2P Brain + Gemini (smart)":"P2P Brain + Claude (smart)"):"P2P Brain · offline");return true}
  try{await aiCall([{role:"user",content:"Reply with the single word: OK"}]);setAiState(true,PROV[aiCfg.prov].n+" connected");return true}
  catch(e){setAiState(false,"Not connected");return e}
}
$("#ai-prov").value=aiCfg.prov;$("#ai-key").value=aiCfg.key;$("#ai-model").value=aiCfg.model;$("#ai-url").value=aiCfg.url;aiFormSync();
$("#ai-prov").onchange=aiFormSync;
$("#ai-connect").onclick=async()=>{
  const pv=$("#ai-prov").value;aiCfg={prov:pv,key:$("#ai-key").value.trim(),model:pv==="braingemini"?(aiCfg.prov===pv?aiCfg.model:""):$("#ai-model").value.trim(),url:$("#ai-url").value.trim()};
  try{localStorage.setItem(AIK,JSON.stringify(aiCfg))}catch(e){}
  const b=$("#ai-connect");b.disabled=true;b.textContent="Connecting…";
  const r=await testAi();b.disabled=false;b.textContent="Connect";
  if(r===true){toast("AI connected");$("#aiSet").open=false}else{toast(r.text||r.message||"Couldn't connect");$("#ai-help").textContent=r.text||r.message||"Couldn't connect."}
};
setAiState(null,"Checking…");$("#aiProvLbl").textContent=PROV[aiCfg.prov].n;


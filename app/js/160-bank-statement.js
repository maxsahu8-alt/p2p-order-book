// ---------- bank statement match ----------
sheets.stmt=function(bid){const b=banks.find(x=>x.id===bid);if(!b)return;
  openSheet(`<h3>Match statement · ${esc(b.name)}</h3><div class="smt"><p class="note" style="margin:0">Download this account's statement from your bank (Excel or CSV) and choose it. The app finds entries that are in the bank but not in the app, and the other way round.</p>
    <div class="filebtn" style="position:relative;flex-direction:row">Choose statement (.xlsx, .xls, .csv)<input type="file" id="smf" accept=".xlsx,.xls,.csv" class="cover-input"></div>
    <p class="note" id="smn"></p><div id="smo" class="smt"></div><div class="row2"><button class="mini ghost" type="button" id="smBack">Back</button></div></div>`,el=>{
    el.querySelector("#smBack").onclick=()=>sheets.ledger(bid);
    el.querySelector("#smf").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const n=el.querySelector("#smn");n.textContent="Reading "+f.name+"…";
      try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
        const wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:true});let rows=[];for(const sn of wb.SheetNames){const a=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:"",raw:true});if(a.length>rows.length)rows=a}
        const hi=rows.findIndex(r=>r.some(c=>/date/i.test(c))&&r.some(c=>/debit|withdraw|dr\b|credit|deposit|cr\b|amount/i.test(c)));if(hi<0)throw new Error("Couldn't find the Date / Debit / Credit columns in this file.");
        const H=rows[hi].map(c=>String(c).trim());const ix=re=>H.findIndex(h=>re.test(h));
        const iD=ix(/^(txn|transaction|value)?\s*date|^date/i),iDr=ix(/debit|withdraw|^dr\b|dr amount/i),iCr=ix(/credit|deposit|^cr\b|cr amount/i),iAmt=ix(/^amount|amount\s*\(?inr/i),iTy=ix(/dr\s*\/\s*cr|type|cr\/dr/i),iDesc=ix(/narration|description|particular|remark|details/i);
        const ent=[];rows.slice(hi+1).forEach(r=>{const t=normTime(r[iD]);if(!r[iD]||isNaN(t))return;let amt=0;
          if(iDr>=0||iCr>=0){const dr=num(r[iDr]),cr=num(r[iCr]);amt=cr?Math.abs(cr):dr?-Math.abs(dr):0}else if(iAmt>=0){amt=num(r[iAmt]);if(iTy>=0&&/dr|debit/i.test(r[iTy]))amt=-Math.abs(amt)}
          if(amt)ent.push({t,amt,desc:String(iDesc>=0?r[iDesc]:"").slice(0,80)})});
        if(!ent.length)throw new Error("No transactions found in this file.");
        const lo=Math.min(...ent.map(x=>x.t))-DAY,hiT=Math.max(...ent.map(x=>x.t))+2*DAY;
        const app=balances().mv.filter(x=>x.bank===bid&&x.time>=lo&&x.time<=hiT).map(x=>({...x,used:false}));
        const missingInApp=[];
        ent.sort((a,c)=>a.t-c.t).forEach(s=>{const m=app.find(x=>!x.used&&Math.abs(x.amt-s.amt)<=1&&Math.abs(x.time-s.t)<=3*DAY);if(m)m.used=true;else missingInApp.push(s)});
        const missingInBank=app.filter(x=>!x.used);
        const sum=a=>inr(Math.round(a.reduce((t,x)=>t+Math.abs(x.amt),0)));
        n.textContent=`${ent.length} bank entries checked (${new Date(lo+DAY).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} – ${new Date(hiT-2*DAY).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}). ${ent.length-missingInApp.length} matched.`;
        el.querySelector("#smo").innerHTML=`<div class="flabel" style="margin:4px 0 0">In bank, not in app · ${missingInApp.length} · ${sum(missingInApp)}</div><div class="list">${missingInApp.slice(0,60).map(x=>`<div class="exp"><span>${esc(x.desc||"(no description)")}</span><span class="amt" style="color:${x.amt>0?"var(--buy)":"var(--sell)"}">${x.amt>0?"+":"−"}${inr(Math.abs(x.amt))}</span><div class="o-meta"><span>${new Date(x.t).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span></div></div>`).join("")||'<div class="empty" style="padding:14px">Nothing missing ✓</div>'}</div>
          <div class="flabel" style="margin:8px 0 0">In app, not in bank · ${missingInBank.length} · ${sum(missingInBank)}</div><div class="list">${missingInBank.slice(0,60).map(x=>`<div class="exp"><span>${esc(x.label)}</span><span class="amt" style="color:${x.amt>0?"var(--buy)":"var(--sell)"}">${x.amt>0?"+":"−"}${inr(Math.abs(x.amt))}</span><div class="o-meta"><span>${new Date(x.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span></div></div>`).join("")||'<div class="empty" style="padding:14px">Everything in the app is in the bank ✓</div>'}</div>
          <p class="note">Missing in app? Paste those lines into Smart intake to add them. Missing in bank? Check if the order or payment really went through, or if it used a different bank.</p>`;
      }catch(err){n.textContent=err&&err.message&&!/^load$/.test(err.message)?err.message:"Couldn't read this file. Try the Excel or CSV statement."}}})};


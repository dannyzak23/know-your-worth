// ===================== MODULE: opening hours =====================
// A day is {open, from, to, bFrom?, bTo?} (bFrom/bTo = one break). A staff member with their own
// week keeps it in m.openHours; without it they follow the business hours.
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function defaultOpenHours(){ return DAYS.map((d,i)=>({open:i<5, from:'09:00', to:'17:00'})); }
function openHours(){ const s=state.setup; if(!Array.isArray(s.openHours)||s.openHours.length!==7) s.openHours=defaultOpenHours(); return s.openHours; }
const staffById=pid=>pid&&pid!=='me'?(state.setup.staff||[]).find(x=>x.id===pid):null;
const ownHours=m=>!!m&&Array.isArray(m.openHours)&&m.openHours.length===7;
function hoursFor(pid){ const m=staffById(pid); return ownHours(m)?m.openHours:openHours(); }
const dayIdx=dateStr=>(dt(dateStr).getDay()+6)%7;
const breakMins=h=>h.open&&h.bFrom&&h.bTo?Math.max(0,Math.min(toMin(h.bTo),toMin(h.to))-Math.max(toMin(h.bFrom),toMin(h.from))):0; // only the part inside the day counts
const dayMins=h=>h.open?Math.max(0,toMin(h.to)-toMin(h.from)-breakMins(h)):0;
const openMinutesWeek=(hs=openHours())=>hs.reduce((a,h)=>a+dayMins(h),0);
const openDays=(hs=openHours())=>hs.filter(h=>dayMins(h)>0).length;
const weekHours=hs=>Math.round(openMinutesWeek(hs)/6)/10;
function fmtT(t){ const [h,m]=(t||'0:0').split(':').map(Number); return `${((h+11)%12)+1}${m?'.'+pad2(m):''}${h<12?'am':'pm'}`; }
const dayText=(h,brk)=>dayMins(h)>0?`${fmtT(h.from)} to ${fmtT(h.to)}${breakMins(h)>0?`${brk} ${fmtT(h.bFrom)} to ${fmtT(h.bTo)}`:''}`:'';
function syncHours(){ const s=state.setup; s.daysPerWeek=Math.max(1,openDays()); s.hours=weekHours(); s._hoursSet=true;
  if(s.daysOff!=null) s.weeksOff=Math.min(51,(+s.daysOff||0)/s.daysPerWeek); // she types days off; the sums still run on weeks
  (s.staff||[]).forEach(m=>{ if(ownHours(m)) m.hours=weekHours(m.openHours);
    if(m.daysOff!=null) m.weeksOff=Math.min(51,(+m.daysOff||0)/Math.max(1,openDays(hoursFor(m.id)))); }); }
function hoursSummary(hs=openHours()){ // "Monday to Friday 9am to 5pm, closed 1pm to 2pm", "Saturday and Sunday closed"
  const key=h=>dayText(h,', closed')||'closed', out=[]; let i=0;
  while(i<7){ let j=i; while(j+1<7 && key(hs[j+1])===key(hs[i])) j++;
    out.push(`${j===i?DAYS[i]:j===i+1?`${DAYS[i]} and ${DAYS[j]}`:`${DAYS[i]} to ${DAYS[j]}`} ${key(hs[i])}`); i=j+1; }
  return out; }
function openLine(dateStr){ // one line for a diary day; anyone with their own hours gets a mention
  const i=dayIdx(dateStr), t=dayText(openHours()[i],' · break');
  const away=m=>(state.holidays||[]).some(h=>h.staffId===m.id&&h.from<=dateStr&&h.to>=dateStr); // the day already says who is off, so do not also print their hours
  const team=(state.setup.staff||[]).filter(m=>ownHours(m)&&!away(m)).map(m=>{ const x=dayText(m.openHours[i],', break'); return ` · ${esc(m.name||'Team member')} ${x||'not in'}`; }).join('');
  return (t?`Open ${t}`:'Closed')+team; }
// copy the first open day's times and break to every other open day
function copyHours(hs){ const m=hs.find(x=>x.open); if(!m) return;
  hs.forEach(x=>{ if(x.open&&x!==m){ x.from=m.from; x.to=m.to; delete x.bFrom; delete x.bTo; if(m.bFrom&&m.bTo){ x.bFrom=m.bFrom; x.bTo=m.bTo; } } }); }
// change one time on a day; if the day no longer makes sense, put the old value back and say why
function setHour(h,f,v){ const old=h[f]; h[f]=v; const brk=h.bFrom&&h.bTo;
  const bad= toMin(h.to)<=toMin(h.from) ? 'Closing time has to be after opening time'
    : brk&&toMin(h.bTo)<=toMin(h.bFrom) ? 'A break has to end after it starts'
    : brk&&!(dayMins({...h,open:true})>0) ? 'A break has to be shorter than the day'
    : brk&&(toMin(h.bFrom)<toMin(h.from)||toMin(h.bTo)>toMin(h.to)) ? (f==='from'||f==='to'?'Your break is outside those times. Move or remove the break first':'A break has to be inside your opening times') : '';
  if(bad) h[f]=old; return bad; }
function hoursEditor(hs=openHours(), who='me'){
  const first=hs.findIndex(h=>h.open), tm=(i,f,lab)=>`<input type="time" id="hr-${f}-${who}-${i}" aria-label="${DAYS[i]} ${lab}" value="${esc(hs[i][f]||'')}" data-hr="${i}" data-who="${who}" data-f="${f}" style="width:auto">`;
  return `<div class="stack">
    <div class="list">${hs.map((h,i)=>`<div class="item" style="flex-wrap:wrap;gap:8px">
      <label class="row" style="flex:1 1 130px;font-weight:600;gap:10px"><input type="checkbox" id="hr-open-${who}-${i}" data-hr="${i}" data-who="${who}" data-f="open" ${h.open?'checked':''}> ${DAYS[i]}</label>
      ${h.open?`<span class="row" style="flex-wrap:nowrap;gap:6px">${tm(i,'from','opens')}<span class="muted">to</span>${tm(i,'to','closes')}</span>
        <span class="row small" style="flex-basis:100%;flex-wrap:nowrap;gap:6px">${h.bFrom&&h.bTo
          ?`<span class="muted">Break</span>${tm(i,'bFrom','break starts')}<span class="muted">to</span>${tm(i,'bTo','break ends')}<button class="iconbtn" aria-label="Remove the ${DAYS[i]} break" data-act="hr-brk-del" data-hr="${i}" data-who="${who}">✕</button>`
          :`<button class="btn small ghost" data-act="hr-brk" data-hr="${i}" data-who="${who}">+ Break</button>`}</span>`
        :`<span class="muted">${who==='me'?'Closed':'Not in'}</span>`}</div>`).join('')}</div>
    ${hs.filter(h=>h.open).length>1?`<button class="btn small ghost" data-act="hr-copy" data-who="${who}">Use ${DAYS[first]}'s times for every ${who==='me'?'open':'working'} day</button>`:''}
    <p class="live">${who==='me'?'Open':'Works'} ${openDays(hs)} day${openDays(hs)===1?'':'s'}, <span class="num">${nf(weekHours(hs))}</span> hours a week${hs.some(h=>breakMins(h)>0)?' (breaks taken off)':''}.</p>
    ${who==='me'?`<label class="field">Days you take off a year<span class="hint">Days you would normally work: holidays, bank holidays and sick days</span><input id="hr-daysOff" type="number" inputmode="numeric" min="0" max="300" step="1" value="${esc(state.setup.daysOff??Math.round((+state.setup.weeksOff||0)*Math.max(1,openDays())))}" data-set="daysOff"></label>`:''}</div>`;
}
// staff card: the tick box, and their own week once it is ticked
function staffHoursBlock(m){
  return `<label class="row small" style="flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" id="st-own-${m.id}" data-sth="${m.id}" ${ownHours(m)?'checked':''} style="flex:none"><span>Works different days or times from your opening hours</span></label>
    ${ownHours(m)?hoursEditor(m.openHours,m.id):''}`;
}
// does the target fit into the hours worked?
function fitLine(c,p){
  const team=(state.setup.staff||[]).reduce((a,m)=>a+(+m.hours||0),0), wkOpen=openMinutesWeek()/60+team; if(!(wkOpen>0)||!p) return '';
  const mix=c.treatments.filter(t=>(+t.perWeek||0)>0), list=mix.length?mix:c.treatments.filter(t=>!t.addon), w=t=>mix.length?(+t.perWeek||0):1;
  const tot=list.reduce((a,t)=>a+w(t),0)||1, avgH=list.reduce((a,t)=>a+w(t)*t.mins,0)/tot/60, need=p.perWeek*avgH, open=nf(Math.round(wkOpen*10)/10);
  const have=team>0?`${open} hours you and your team work`:`${open} hours you are open`;
  return need>wkOpen ? `<div class="notice warn">That is about <b>${Math.round(need)} hours</b> of ${W().many} a week, which is more than the ${have}. To get there you would need higher prices, longer hours or lower costs.</div>`
    : `<p class="small muted">That is about ${Math.round(need)} hours of ${W().many} a week. ${team>0?`You and your team work ${open} hours.`:`You are open ${open} hours.`}</p>`;
}

// set-up: one extra question
const wizStepsBeauty=wizSteps;
wizSteps=function(){ const st=wizStepsBeauty().slice(), i=st.findIndex(x=>x.type==='targetq'); st.splice(i<0?st.length:i,0,{type:'openq'}); return st; };
const quickStepBeauty=quickStep;
quickStep=function(st){
  if(st.type==='openq') return {q:'When are you open?', why:'Tick the days you work and set the times. Add a break if you stop for lunch. Your diary uses them, and we check your target fits into your week. You can change them any time under More.', body:hoursEditor()};
  return quickStepBeauty(st);
};

// diary: warn about bookings outside the hours of whoever is doing them
const bkWarningsBase=bkWarnings;
bkWarnings=function(d){
  const w=bkWarningsBase(d); if(!d.date||!d.time) return w;
  const m=staffById(d.staffId), own=ownHours(m), h=hoursFor(d.staffId)[dayIdx(d.date)], nm=own?(m.name||'This person'):'';
  if(!(dayMins(h)>0)) w.unshift(own?`${nm} does not work on ${DAYS[dayIdx(d.date)]}s.`:`You are closed on ${DAYS[dayIdx(d.date)]}s.`);
  else { const start=toMin(d.time), end=start+bkMins(d);
    if(start<toMin(h.from)||end>toMin(h.to)) w.unshift(`This is outside ${own?nm+"'s hours":'your opening hours'} (${fmtT(h.from)} to ${fmtT(h.to)}).`);
    else if(breakMins(h)>0 && start<toMin(h.bTo) && end>toMin(h.bFrom)) w.unshift(`This runs into ${own?nm+"'s":'your'} break (${fmtT(h.bFrom)} to ${fmtT(h.bTo)}).`); }
  return w;
};

document.addEventListener('click', e=>{
  const el=e.target.closest && e.target.closest('[data-act]'); if(!el) return; const act=el.dataset.act, hs=hoursFor(el.dataset.who), h=hs[+el.dataset.hr];
  const done=msg=>{ syncHours(); save(); render(); if(msg) toast(msg); };
  if(act==='hr-copy'){ copyHours(hs); done('Times copied'); }
  else if(act==='hr-brk' && h){ const mid=Math.round((toMin(h.from)+toMin(h.to))/60)*30; h.bFrom=fromMin(mid-30); h.bTo=fromMin(mid+30); done(); } // an hour in the middle of the day
  else if(act==='hr-brk-del' && h){ delete h.bFrom; delete h.bTo; done(); }
  else if(act==='bk-new' && bkDraft && !bkDraft.id){ const d=hoursFor(bkDraft.staffId)[dayIdx(bkDraft.date)]; if(dayMins(d)>0){ // start a new booking at the first free time after opening
      const taken=state.bookings.filter(b=>b.date===bkDraft.date && b.staffId===bkDraft.staffId && b.status!=='cancelled').map(b=>toMin(b.time)+(+b.mins||0));
      let start=Math.max(toMin(d.from), ...taken); if(breakMins(d)>0 && start>=toMin(d.bFrom) && start<toMin(d.bTo)) start=toMin(d.bTo);
      bkDraft.time=fromMin(Math.min(start, Math.max(toMin(d.from),toMin(d.to)-15))); }
    renderBkForm(); }
});
document.addEventListener('change', e=>{
  const el=e.target;
  if(el.dataset.set==='daysOff'||(el.dataset.st&&el.dataset.f==='daysOff')){ syncHours(); save(); return; } // the box itself is saved by the general handler; this turns it into weeks
  if(el.dataset.sth){ const m=staffById(el.dataset.sth); if(!m) return;
    if(el.checked) m.openHours=JSON.parse(JSON.stringify(openHours())); else delete m.openHours;
    syncHours(); save(); render(); return; }
  if(el.dataset.hr==null) return;
  const h=hoursFor(el.dataset.who)[+el.dataset.hr], f=el.dataset.f; if(!h) return;
  if(f==='open') h.open=el.checked; else if(el.value){ const bad=setHour(h,f,el.value); if(bad){ render(); toast(bad); return; } }
  syncHours(); save(); render();
});

// ===================== classes: several clients in one session =====================
// A treatment with more than one place is a class. It runs at set times each week; each person booked is one booking at that time.
const isClass=t=>!!t&&+t.places>1;
const DAYS3=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const classCount=(sid,date,time,skip)=>state.bookings.filter(b=>b.id!==skip&&b.serviceId===sid&&b.date===date&&b.time===time&&b.status!=='cancelled').length;
function classTag(b){ const t=svc(b.serviceId); return isClass(t)?` <span class="pill info">${classCount(t.id,b.date,b.time)} of ${+t.places} booked</span>`:''; }
const classTimesOn=(t,x)=>(t.times||[]).filter(([d,h])=>d===dayIdx(x)&&h).map(([,h])=>h);
// the sessions coming up, with places left: [[date, minutes, left]]
function classSessions(t,days){ const out=[]; for(let i=1;i<=days;i++){ const x=addDays(todayStr(),i); if(onHoliday('me',x)) continue;
  classTimesOn(t,x).forEach(h=>{ const left=+t.places-classCount(t.id,x,h); if(left>0) out.push([x,toMin(h),left]); }); } return out; }

const vTreatmentsBeforeClasses=vTreatments;
vTreatments=function(){ let h=vTreatmentsBeforeClasses(); const t=state.treatments.find(x=>x.id===openTreat); if(!t||t.addon) return h;
  const at=`<label class="row small"><input type="checkbox" id="tad-${t.id}"`, i=h.indexOf(at); if(i<0) return h;
  const block=`<div class="stack" style="gap:8px">
    <label class="field">Places in each session<span class="hint">For group classes. Leave empty if you see one ${W().cust} at a time</span><input id="tpl-${t.id}" type="number" inputmode="numeric" min="0" step="1" value="${+t.places>1?t.places:''}" data-tf="${t.id}" data-f="places"></label>
    ${isClass(t)?`<label class="field">How many usually come<span class="hint">Your price is for each person, so the running costs are shared across this many</span><input id="tfi-${t.id}" type="number" inputmode="numeric" min="1" step="1" value="${t.fill||''}" placeholder="${t.places}" data-tf="${t.id}" data-f="fill"></label>
    <span class="small" style="font-weight:600">When it runs each week</span>
    ${(t.times||[]).map(([d,hh],k)=>`<div class="row" style="flex-wrap:nowrap"><select aria-label="Day" data-ct="${t.id}" data-i="${k}" data-k="0">${DAYS3.map((n,j)=>`<option value="${j}" ${j===d?'selected':''}>${n}</option>`).join('')}</select><input type="time" aria-label="Start time" value="${esc(hh||'')}" data-ct="${t.id}" data-i="${k}" data-k="1"><button type="button" class="iconbtn" aria-label="Remove this time" data-act="ct-del" data-id="${t.id}" data-i="${k}">✕</button></div>`).join('')||`<p class="small muted">No times yet. Clients can only book online once it has a time.</p>`}
    <button type="button" class="btn small ghost" data-act="ct-add" data-id="${t.id}">Add a time</button>`:''}</div>`;
  return h.slice(0,i)+block+h.slice(i); };
const syncClassWeek=t=>{ if(isClass(t)) t.perWeek=(t.times||[]).filter(x=>x[1]).length; };
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act="ct-add"],[data-act="ct-del"]'); if(!el) return;
  const t=state.treatments.find(x=>x.id===el.dataset.id); if(!t) return; t.times=t.times||[];
  if(el.dataset.act==='ct-add') t.times.push([0,'18:00']); else t.times.splice(+el.dataset.i,1);
  syncClassWeek(t); save(); render(); });
document.addEventListener('change',e=>{ const el=e.target, d=el.dataset||{}; if(!d.ct) return; const t=state.treatments.find(x=>x.id===d.ct); if(!t||!t.times||!t.times[+d.i]) return;
  t.times[+d.i][+d.k]= d.k==='0'?+el.value:el.value; syncClassWeek(t); save(); render(); });



// ===================== product costs in set-up, and order links =====================
// only web links are allowed as order links, so a typed 'javascript:' can never run
function orderHref(u){ u=String(u||'').trim(); if(!u) return ''; if(!/^[a-z][a-z0-9+.-]*:/i.test(u)) u='https://'+u; return /^https?:\/\/[^\s]+\.[^\s]+/i.test(u)?u:''; }
const orderBtn=(p,cls)=>{ const h=orderHref(p.url); return h?`<a class="btn small ${cls||'ghost'}" href="${esc(h)}" target="_blank" rel="noopener noreferrer">Order</a>`:''; };
const urlField=(id,p)=>`<label class="field">Link to order it<span class="hint">Paste the page you buy it from, to reorder in one tap</span><input id="${id}" type="url" inputmode="url" autocomplete="off" placeholder="e.g. salonservices.com/..." value="${esc(p.url||'')}" data-pf="${p.id}" data-f="url"></label>`;

// set-up: each treatment lists what it uses, picked from a dropdown. Nothing is filled in for her.
let qlNew=null; // the treatment whose 'something else' box is open
const suggestFor=t=>((ALLCAT.find(c=>c.id===t.id)||{}).recipe||[]);
function tradeProducts(){ const ids=new Set(); selInds().forEach(k=>(CATALOGUES[k]||[]).forEach(c=>c.recipe.forEach(r=>ids.add(r.productId)))); return LIBRARY.filter(p=>ids.has(p.id)); }
function qlProduct(t,p){ const r=t.recipe.find(x=>x.productId===p.id), owner=state.treatments.find(x=>x.recipe.some(y=>y.productId===p.id));
  const fields=owner.id!==t.id?`<p class="small muted" style="margin:0">Size and cost are under ${esc(owner.name)}.</p>`:`<div class="fields"><label class="field">Size you buy<span class="row" style="flex-wrap:nowrap;gap:8px"><input id="wp-z-${p.id}" type="number" inputmode="decimal" min="0" step="any" aria-label="Size of ${esc(p.name)}" value="${esc(p.size)}" data-pf="${p.id}" data-f="size" style="flex:1"><select id="wp-u-${p.id}" aria-label="Unit for ${esc(p.name)}" data-pf="${p.id}" data-f="unit" style="flex:1">${UNITS.map(u=>`<option ${u===p.unit?'selected':''}>${u}</option>`).join('')}</select></span></label>
      ${moneyField('wp-c-'+p.id,'What one costs you','',p.packCost,`data-pf="${p.id}" data-f="packCost"`)}
      <label class="field">Where you buy it<input id="wp-s-${p.id}" list="sup-list" placeholder="Pick one or type your own" value="${esc(p.supplier||'')}" data-pf="${p.id}" data-f="supplier"></label>
      ${urlField('wp-l-'+p.id,p)}</div>`;
  return `<div class="stack" style="gap:8px;padding-top:10px;border-top:1px solid var(--line)"><div class="treat-head"><b>${esc(p.name)}</b><button type="button" class="iconbtn" aria-label="${esc(p.name)} is not used for ${esc(t.name)}" data-act="wiz-rm-prod" data-t="${t.id}" data-p="${p.id}">✕</button></div>
    ${fields}<label class="field">How many ${esc(t.name)} do you get from one ${esc(packLabel(p).replace(/^1 /,''))}?<input id="wp-n-${p.id}-${t.id}" type="number" inputmode="decimal" min="0" step="1" value="${esc(r.perPack||'')}" data-ru="${t.id}" data-p="${p.id}"></label></div>`; }
function qlAdd(t){ const have=new Set(t.recipe.map(r=>r.productId)), sug=suggestFor(t).map(r=>r.productId).filter(id=>!have.has(id));
  const mine=state.products.map(p=>p.id).filter(id=>!have.has(id)&&!sug.includes(id)), lib=tradeProducts().map(p=>p.id).filter(id=>!have.has(id)&&!sug.includes(id)&&!mine.includes(id));
  const opt=id=>{ const p=state.products.find(x=>x.id===id)||LIBRARY.find(x=>x.id===id); return p?`<option value="${p.id}">${esc(p.name)}</option>`:''; };
  const grp=(l,ids)=>ids.length?`<optgroup label="${esc(l)}">${ids.map(opt).join('')}</optgroup>`:'';
  return `<select id="ql-add-${t.id}" aria-label="Add something you use for ${esc(t.name)}" data-qladd="${t.id}" style="margin-top:4px"><option value="">+ Add a product</option>${sug.length?`<optgroup label="Often used for this">${sug.length>1?`<option value="__all">Add all of these (${sug.length})</option>`:''}${sug.map(opt).join('')}</optgroup>`:''}${grp('Already added',mine)}${grp('Others',lib)}<option value="__new">Something else (type it in)</option></select>
    ${qlNew===t.id?`<div class="row" style="flex-wrap:nowrap"><input id="add-new-${t.id}" placeholder="Name it, e.g. ${esc(IND().newItem)}" style="flex:1"><button type="button" class="btn small" data-act="wiz-new-prod" data-t="${t.id}">Add</button></div>`:''}`; }
const quickStepBeforeProd=quickStep;
quickStep=function(st){ const r=quickStepBeforeProd(st); if(st.type!=='quicklist'||!r||state.setup.quickMode) return r; let b=r.body;
  state.treatments.forEach(t=>{ const i=b.indexOf(`<input id="ql-w-${t.id}"`); if(i<0) return; const j=b.indexOf('</article>',i);
    const ps=t.recipe.map(x=>state.products.find(p=>p.id===x.productId)).filter(Boolean);
    b=b.slice(0,j)+`<span class="small" style="font-weight:600;margin-top:4px">What you use${ps.length?'':': nothing added yet'}</span>${ps.map(p=>qlProduct(t,p)).join('')}${qlAdd(t)}`+b.slice(j); });
  return {...r, q:`Your prices and ${W().items}`, why:r.why+` Then add the ${W().items} you use for each one: what you pay, and how many you get out of one.`, body:supData()+b}; };
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act="wiz-new-prod"]'), i=el&&document.getElementById('add-new-'+el.dataset.t); if(i&&i.value.trim()) qlNew=null; },true); // before it redraws
// picking a treatment in set-up starts it with nothing in it
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a!=='pick-treat'||wizFull||!el.checked) return; const t=state.treatments.find(x=>x.id===el.dataset.id); if(!t||t._r) return;
  t._r=1; t.recipe=[]; state.products=state.products.filter(p=>state.treatments.some(x=>x.recipe.some(r=>r.productId===p.id))); save(); });
document.addEventListener('change',e=>{ const el=e.target, tid=el.dataset&&el.dataset.qladd; if(!tid) return; const t=state.treatments.find(x=>x.id===tid), v=el.value; if(!t||!v) return;
  if(v==='__new'){ qlNew=t.id; render(); setTimeout(()=>{ const i=document.getElementById('add-new-'+t.id); if(i) i.focus(); },0); return; }
  const add=id=>{ if(!state.products.some(p=>p.id===id)){ const l=LIBRARY.find(x=>x.id===id); if(!l) return; state.products.push(clone(l)); }
    const s=suggestFor(t).find(r=>r.productId===id); if(!t.recipe.some(r=>r.productId===id)) t.recipe.push({productId:id,perPack:s?s.perPack:0}); };
  if(v==='__all') suggestFor(t).forEach(r=>add(r.productId)); else add(v); save(); render(); });

const vStockBeforeUrl=vStock;
vStock=function(){ let h=vStockBeforeUrl();
  state.products.forEach(p=>{ const b=orderBtn(p); if(!b) return; const a=`data-act="prod-open" data-id="${p.id}">`, i=h.indexOf(a); if(i<0) return; const j=h.indexOf('</button>',i); if(j<0) return; h=h.slice(0,j+9)+b+h.slice(j+9); });
  const p=state.products.find(x=>x.id===openProd); if(p){ const a='<div class="row" style="justify-content:space-between"><button class="btn" data-act="prod-close">', i=h.indexOf(a);
    if(i>=0) h=h.slice(0,i)+`<div class="stack" style="gap:8px">${urlField('pl-'+p.id,p)}${orderBtn(p)?`<div>${orderBtn(p)}</div>`:''}</div>`+h.slice(i); }
  return h; };


// ===================== client booking page: month calendar, like Calendly =====================
// Choose a treatment, then a highlighted day on a month calendar, then a time from the list, then your details.
let bfMonth=null; // {t: treatment id, m: 'YYYY-MM'} so a new treatment starts on its own first free month
const BF_CSS=`.bf-list{display:flex;flex-direction:column;gap:8px}
.bf-item{display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left;width:100%;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);font:inherit;cursor:pointer}
.bf-item small{display:block;color:var(--muted);font-size:.85rem;margin-top:2px;font-weight:400}
.bf-item:hover,.bf-item:focus-visible{border-color:var(--accent)}
.bf-price{font-weight:700;white-space:nowrap}
.card.bf-sum{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:12px}
.card.bf-sum .grow{flex:1;min-width:0}
.bf-sum small{display:block;color:var(--muted)}
.bf-sum .bf-when{color:var(--accent);font-weight:700;margin-top:2px}
.bf-cal-head{display:flex;align-items:center;justify-content:space-between;margin:4px 0}
.bf-cal-head b{font-size:1.05rem}
.bf-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}
.bf-cal .wd{font-size:.72rem;color:var(--muted);font-weight:600;padding:4px 0}
.bf-day{aspect-ratio:1/1;width:100%;max-width:46px;margin:auto;border-radius:50%;border:0;background:transparent;color:var(--muted);font:600 .95rem var(--body);display:flex;align-items:center;justify-content:center;opacity:.45}
button.bf-day{background:var(--accent-soft);color:var(--accent);opacity:1;cursor:pointer}
button.bf-day[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink,#fff)}
.bf-day.today{box-shadow:inset 0 0 0 1.5px var(--muted)}
.bf-times{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.bf-slot{padding:12px 8px;border:1.5px solid var(--accent);color:var(--accent);background:transparent;border-radius:10px;font:700 1rem var(--body);cursor:pointer}
.bf-slot small{display:block;font-weight:500;font-size:.75rem;color:var(--muted)}
.bf-slot:hover,.bf-slot:focus-visible{background:var(--accent-soft)}`;
if(typeof document!=='undefined'&&document.head&&document.head.insertAdjacentHTML) document.head.insertAdjacentHTML('beforeend',`<style>${BF_CSS}</style>`);
const longDay=x=>dt(x).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
const monthName=m=>dt(m+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
const addMonth=(m,n)=>{ const d=new Date(+m.slice(0,4),+m.slice(5,7)-1+n,1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); };

bookFace=function(){ const B=BK, live=B.d.filter(([x])=>x>todayStr()), tr=B.t.find(t=>t[0]===bf.t), len=tr?tr[3]+tr[4]:0;
  const head=`<div><h2>${esc(B.b||'Book an appointment')}</h2><p class="muted">Book an appointment</p></div>`;
  if(!live.length) return `<section class="stack">${head}<div class="notice warn">This booking link is out of date. Send a message to ask for a time.</div></section>`;
  const each=t=>t[5]>0?' each':'';
  if(!tr) return `<section class="stack">${head}<article class="card"><h3>Choose a treatment</h3><div class="bf-list">${B.t.map(t=>`<button class="bf-item" data-act="bf-t" data-v="${esc(t[0])}"><span><b>${esc(t[1])}</b><small>${t[3]} min${t[5]>0?' · group class':''}</small></span><span class="bf-price">${money(t[2])}${each(t)}</span></button>`).join('')}</div></article>
    <p class="small muted">Free times as of ${fmtDay(B.m)}.</p></section>`;
  const cls=tr[5]>0, ks=cls?((B.k||{})[tr[0]]||[]).filter(([x])=>x>todayStr()):[];
  const avail=cls?[...new Set(ks.map(([x])=>x))]:live.filter(([,f])=>slots(f,len).length).map(([x])=>x);
  const timesOn=x=>cls?ks.filter(([d])=>d===x).map(([,m])=>m):slots((live.find(([d])=>d===x)||[0,[]])[1],len);
  const leftOf=m=>{ const k=ks.find(([d,mm])=>d===bf.d&&mm===m); return k?k[2]:0; };
  const sum=`<article class="card bf-sum"><div class="grow"><b>${esc(tr[1])}</b><small>${tr[3]} min · ${money(tr[2])}${each(tr)}${cls?' · group class':''}</small>${bf.time!=null?`<small class="bf-when">${longDay(bf.d)}, ${fmtT(fromMin(bf.time))}</small>`:''}</div>
    <button class="btn small ghost" data-act="${bf.time!=null?'bf-retime':'bf-reset'}">Change</button></article>`;
  let body='';
  if(bf.time==null){
    if(!avail.length) body=`<article class="card" id="bf-days"><h3>Choose a day and time</h3><p class="muted">${cls?'No classes with places left at the moment':'No free times for this one at the moment'}. Send a message to ask.</p></article>`;
    else { const first=avail[0].slice(0,7), last=avail[avail.length-1].slice(0,7);
      let m=bfMonth&&bfMonth.t===bf.t?bfMonth.m:(bf.d||avail[0]).slice(0,7); if(m<first) m=first; if(m>last) m=last;
      const on=new Set(avail), start=dayIdx(m+'-01'), n=new Date(+m.slice(0,4),+m.slice(5,7),0).getDate(), td=todayStr();
      const cells=Array.from({length:start},()=>'<span></span>').concat(Array.from({length:n},(_,i)=>{ const x=m+'-'+String(i+1).padStart(2,'0');
        return on.has(x)?`<button class="bf-day${x===td?' today':''}" data-act="bf-d" data-v="${x}" aria-pressed="${bf.d===x}" aria-label="${longDay(x)}, times free">${i+1}</button>`:`<span class="bf-day${x===td?' today':''}" aria-hidden="true">${i+1}</span>`; }));
      const times=bf.d&&on.has(bf.d)?timesOn(bf.d):[];
      body=`<article class="card" id="bf-days"><h3>Choose a day and time</h3>
        <div class="bf-cal-head"><button class="iconbtn" data-act="bf-m" data-v="${addMonth(m,-1)}" aria-label="Previous month" ${m<=first?'disabled':''}>‹</button><b>${monthName(m)}</b><button class="iconbtn" data-act="bf-m" data-v="${addMonth(m,1)}" aria-label="Next month" ${m>=last?'disabled':''}>›</button></div>
        <div class="bf-cal">${['M','T','W','T','F','S','S'].map(d=>`<span class="wd" aria-hidden="true">${d}</span>`).join('')}${cells.join('')}</div>
        <div id="bf-times">${times.length?`<p style="margin:10px 0 6px"><b>${longDay(bf.d)}</b></p><div class="bf-times">${times.map(t=>{ const l=cls?leftOf(t):0; return `<button class="bf-slot" data-act="bf-time" data-v="${t}">${fmtT(fromMin(t))}${cls?`<small>${l} place${l>1?'s':''} left</small>`:''}</button>`; }).join('')}</div>`
          :`<p class="small muted" style="margin-top:8px">Tap a highlighted day to see the times.</p>`}</div></article>`; } }
  else body=`<article class="card" id="bf-you"><h3>Your details</h3>
    <label class="field">Your name<input id="bf-name" autocomplete="name" value="${esc(bf.name)}" data-bf="name"></label>
    <label class="field">Your mobile number<input id="bf-phone" type="tel" autocomplete="tel" value="${esc(bf.phone)}" data-bf="phone"></label>
    <label class="field">Anything we should know?<span class="hint">Optional</span><input id="bf-note" value="${esc(bf.note)}" data-bf="note"></label>
    <div class="stack">${B.w?`<button class="btn" data-act="bf-send" data-via="wa">Send by WhatsApp</button><button class="btn ghost" data-act="bf-send" data-via="sms">Send by text</button>`:''}${B.e?`<button class="btn ghost" data-act="bf-send" data-via="email">Send by email</button>`:''}</div>
    ${bf.sent?`<div class="notice ok">Once you have sent the message, that is it. ${esc(B.b||'They')} will reply to confirm.</div>`:'<p class="small muted">This sends a booking request. It is not booked until you hear back.</p>'}</article>`;
  return `<section class="stack">${head}${sum}${body}<p class="small muted">Free times as of ${fmtDay(B.m)}.</p></section>`; };

document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act="bf-m"],[data-act="bf-reset"],[data-act="bf-retime"]'); if(!el||el.disabled) return; const a=el.dataset.act;
  if(a==='bf-m') bfMonth={t:bf.t,m:el.dataset.v}; else if(a==='bf-reset'){ bf.t=null; bf.d=null; bf.time=null; bfMonth=null; } else bf.time=null;
  render(); if(a!=='bf-m'&&window.scrollTo) window.scrollTo(0,0); });



// ===================== end of day check-in, reminders for clients, and a nudge to reorder =====================
const rems=()=>state.reminders||(state.reminders=[]);
const remsFor=cid=>cid?rems().filter(r=>r.clientId===cid):[];
function addReminder(cid,text){ text=String(text||'').trim(); if(!text) return null; const r={id:uid(),clientId:cid||'',text,date:todayStr()}; rems().push(r); return r; }
// what to buy: counted stock at its reorder level, or anything she said she finished (or ran out of)
const toBuyList=()=>compute(state).products.filter(p=>state.setup.trackStock?p.reorder:p.toBuy);
function reorderNudge(was){ const fresh=toBuyList().filter(p=>!was.has(p.id)); if(fresh.length) setTimeout(()=>{ const t=document.getElementById('toast'), pre=t&&!t.hidden&&t.textContent?t.textContent.replace(/\.?$/,'. '):''; toast(`${pre}Running low: ${fresh.map(p=>p.name).join(', ')}. Time to reorder.`); },0); }
const buyIds=()=>new Set(toBuyList().map(p=>p.id));

// paid bookings take stock off; running out puts it on the list even with no reorder level set
const useStockBeforeNudge=useStock;
useStock=function(b,sign){ const was=buyIds(), before=new Map(state.products.map(p=>[p.id,+p.inStock||0]));
  useStockBeforeNudge(b,sign);
  if(sign>0&&state.setup.trackStock){ state.products.forEach(p=>{ if(before.get(p.id)>0&&(+p.inStock||0)<=0) p.toBuy=true; }); reorderNudge(was); } };
// shortcut: assumes the open pack is the one that ran out, so the part-used bit goes; two finished in one day takes one more. Upgrade if counts drift.
function finishPack(p,n){ n=+n||0; if(n<=0) return;
  if(!state.setup.trackStock){ p.toBuy=true; return; }
  p.inStock=Math.max(0,Math.floor((+p.inStock||0)+0.001)-(n-1)); if(p.inStock<=0) p.toBuy=true; }

function payBooking(b,m){ b.status='done'; b.method=m; const cl=clientById(b.clientId);
  state.income.push({id:uid(),date:b.date,desc:`${bookingLabel(b)}${cl?' · '+cl.name:''}`,amount:+b.price||0,method:m,bookingId:b.id}); useStock(b,1); }
function noShowBooking(b){ b.status='noshow'; if(+b.deposit>0) state.income.push({id:uid(),date:b.date,desc:'Deposit kept (no-show)',amount:+b.deposit,method:payDefault(),bookingId:b.id}); }

// ---- the check-in ----
let eod=null;
const PAYS=[['Card','Card'],['Cash','Cash'],['Bank transfer','Transfer']];
function eodTotals(e){ const bks=state.bookings.filter(b=>b.date===e.date);
  let n=0, money=0; bks.forEach(b=>{ const m=b.status==='booked'?e.marks[b.id]:b.status; if(m==='done'||PAYS.some(([v])=>v===m)){ n++; money+=+b.price||0; } });
  e.extra.forEach(x=>{ const t=svc(x.svc), q=Math.max(0,Math.round(+x.qty||0)); n+=q; money+=q*unitPrice(t); }); return {n,money}; }
function applyEod(e){ const was=buyIds();
  state.bookings.filter(b=>b.date===e.date&&b.status==='booked').forEach(b=>{ const m=e.marks[b.id]; if(m==='noshow') noShowBooking(b); else if(PAYS.some(([v])=>v===m)) payBooking(b,m); });
  const tm=new Date().toTimeString().slice(0,5);
  e.extra.forEach(x=>{ const t=svc(x.svc); if(!t) return; for(let i=0;i<Math.round(+x.qty||0);i++){ const b={id:uid(),date:e.date,time:tm,staffId:'me',clientId:'',serviceId:t.id,addons:[],mins:+t.clientMin||0,price:unitPrice(t),deposit:0,notes:'Added at the end of the day',status:'booked'}; state.bookings.push(b); payBooking(b,x.m||'Card'); } });
  Object.entries(e.used).forEach(([id,n])=>{ const p=state.products.find(x=>x.id===id); if(p) finishPack(p,n); });
  addReminder(e.who,e.text);
  const tot=eodTotals({...e,marks:{},extra:[]}); reorderNudge(was); return tot; }

function renderEod(){ const o=document.getElementById('overlay'); if(!eod){ o.hidden=true; return; } const e=eod, cust=W().cust;
  const bks=state.bookings.filter(b=>b.date===e.date&&b.status!=='cancelled').sort((a,b)=>a.time.localeCompare(b.time));
  const mains=state.treatments.filter(t=>!t.addon), tot=eodTotals(e);
  const sel=(attrs,opts,v)=>`<select ${attrs}>${opts.map(([k,l])=>`<option value="${esc(k)}" ${k===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  const who=[...new Set(bks.map(b=>b.clientId).filter(Boolean))].map(clientById).filter(Boolean), others=state.clients.filter(c=>!who.includes(c)).sort((a,b)=>a.name.localeCompare(b.name));
  o.innerHTML=`<form class="card" id="form-eod" style="max-width:560px;width:100%;max-height:90vh;overflow:auto">
    <div class="treat-head"><h3>End of day</h3><button type="button" class="iconbtn" aria-label="Close" data-act="eod-close">✕</button></div>
    <p class="small muted" style="margin-top:-6px">${fmtDay(e.date)}. Answer what applies and tap Save.</p>
    <h3 style="font-size:1.02rem">Who came in?</h3>
    ${bks.length?`<div class="list">${bks.map(b=>{ const cl=clientById(b.clientId); return `<div class="item" style="flex-wrap:wrap"><div class="grow"><p style="white-space:normal"><b>${fmtT(b.time)}</b> ${esc(bookingLabel(b))}</p><p class="small muted">${esc(cl?cl.name:'No name')} · ${gbp(+b.price)}</p></div>
      ${b.status==='booked'?sel(`aria-label="What happened at ${fmtT(b.time)}" data-eodm="${b.id}" style="width:auto"`,[['','Not sorted yet'],...PAYS.map(([v,l])=>[v,'Paid · '+l]),['noshow','Did not come']],e.marks[b.id]||''):`<span class="pill ${(STATUS[b.status]||STATUS.booked)[0]}">${(STATUS[b.status]||STATUS.booked)[1]}</span>`}</div>`; }).join('')}</div>`:`<p class="small muted">Nothing was in the diary today.</p>`}
    <span class="small" style="font-weight:600">Anyone not in the diary?</span>
    ${e.extra.map((x,i)=>`<div class="stack" style="gap:6px;padding:8px 0;border-bottom:1px solid var(--line)">${sel(`aria-label="${W().One}" data-eodx="${i}" data-k="svc"`,mains.map(t=>[t.id,t.name]),x.svc)}<div class="row" style="flex-wrap:nowrap;gap:6px"><label class="small" style="display:flex;align-items:center;gap:6px">How many<input type="number" min="1" step="1" inputmode="numeric" value="${esc(x.qty)}" data-eodx="${i}" data-k="qty" style="width:60px"></label>${sel(`aria-label="Paid by" data-eodx="${i}" data-k="m" style="flex:1;min-width:0"`,PAYS.map(([v,l])=>[v,'Paid · '+l]),x.m)}<button type="button" class="iconbtn" aria-label="Remove" data-act="eod-xdel" data-i="${i}">✕</button></div></div>`).join('')}
    ${mains.length?`<button type="button" class="btn small ghost" data-act="eod-xadd">+ Add ${cust}s not in the diary</button>`:''}
    <div class="notice ok">That makes <b>${tot.n} ${cust}${tot.n===1?'':'s'}</b> and <b>${gbp(tot.money)}</b> taken today.</div>
    <h3 style="font-size:1.02rem">Did you finish any ${W().items}?</h3>
    <p class="small muted" style="margin-top:-6px">A whole pack or bottle used up${state.setup.trackStock?'. Your count goes down and it goes on your list to reorder when low':'. It goes on your list to reorder'}.</p>
    ${state.products.length?`<div class="list">${state.products.map(p=>{ const n=+e.used[p.id]||0; return `<div class="item"><div class="grow"><p><b>${esc(p.name)}</b></p><p class="small muted">${esc(packLabel(p))}</p></div><button type="button" class="iconbtn" aria-label="One fewer ${esc(p.name)}" data-act="eod-u" data-id="${p.id}" data-d="-1" ${n?'':'disabled'}>−</button><span class="num" style="min-width:24px;text-align:center" aria-label="${n} finished">${n}</span><button type="button" class="iconbtn" aria-label="Finished one ${esc(p.name)}" data-act="eod-u" data-id="${p.id}" data-d="1">+</button></div>`; }).join('')}</div>`:`<p class="small muted">No ${W().items} added yet.</p>`}
    <h3 style="font-size:1.02rem">Anything to remember?</h3>
    <label class="field">About<select id="eod-who" data-eodf="who"><option value="">Just a reminder for me</option>${who.length?`<optgroup label="In today">${who.map(c=>`<option value="${c.id}" ${c.id===e.who?'selected':''}>${esc(c.name)}</option>`).join('')}</optgroup>`:''}${others.length?`<optgroup label="Everyone else">${others.map(c=>`<option value="${c.id}" ${c.id===e.who?'selected':''}>${esc(c.name)}</option>`).join('')}</optgroup>`:''}</select></label>
    <label class="field">Reminder<span class="hint">Shows on their next booking until you tick it off</span><input id="eod-text" placeholder="e.g. wants green hair dye next time" value="${esc(e.text)}" data-eodf="text"></label>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="eod-close">Cancel</button><button type="button" class="btn" data-act="eod-save">Save my day</button></div></form>`;
  o.hidden=false; }

document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='eod-open'){ eod={date:todayStr(),marks:{},extra:[],used:{},who:'',text:''}; renderEod(); }
  else if(!/^(eod-|nt-|buy-got|stock-inc)/.test(a)) return;
  else if(a==='eod-close'){ eod=null; renderEod(); }
  else if(a==='eod-xadd'){ const t=state.treatments.find(x=>!x.addon); if(t) eod.extra.push({svc:t.id,qty:1,m:'Card'}); renderEod(); }
  else if(a==='eod-xdel'){ eod.extra.splice(+el.dataset.i,1); renderEod(); }
  else if(a==='eod-u'){ const id=el.dataset.id; eod.used[id]=Math.max(0,(+eod.used[id]||0)+(+el.dataset.d)); renderEod(); }
  else if(a==='eod-save'){ const t=applyEod(eod); eod=null; renderEod(); save(); render(); toast(`Day saved: ${t.n} ${W().cust}${t.n===1?'':'s'}, ${gbp(t.money)} taken`); }
  else if(a==='nt-done'){ state.reminders=rems().filter(r=>r.id!==el.dataset.id); save(); render(); }
  else if(a==='nt-add'){ const i=document.getElementById('nt-new-'+el.dataset.id); if(addReminder(el.dataset.id,i&&i.value)){ save(); render(); toast('Saved. It shows on their next booking'); } else toast('Type the reminder first'); }
  else if(a==='buy-got'){ const p=state.products.find(x=>x.id===el.dataset.id); if(!p) return; p.toBuy=false;
    if(state.setup.trackStock){ p.inStock=Math.round((+p.inStock||0)+1); toast(`Added 1 ${p.name}. Change the count on Products if you got more`); } save(); render(); }
  else if(a==='stock-inc'){ const p=state.products.find(x=>x.id===el.dataset.id); if(p&&p.toBuy){ p.toBuy=false; save(); render(); } } });
document.addEventListener('change',e=>{ const el=e.target, d=el.dataset||{};
  if(d.f==='inStock'&&d.pf){ const p=state.products.find(x=>x.id===d.pf); if(p&&p.toBuy&&+p.inStock>0){ p.toBuy=false; save(); } return; }
  if(!eod) return;
  if(d.eodm){ eod.marks[d.eodm]=el.value; renderEod(); }
  else if(d.eodx!=null){ const x=eod.extra[+d.eodx]; if(x){ x[d.k]=d.k==='qty'?Math.max(1,Math.round(+el.value||1)):el.value; renderEod(); } }
  else if(d.eodf) eod[d.eodf]=el.value; });
document.addEventListener('input',e=>{ const d=(e.target.dataset||{}); if(eod&&d.eodf) eod[d.eodf]=e.target.value; });
['eod-save','nt-done','buy-got'].forEach(a=>UNDOABLE.add(a));

// ---- where it shows ----
const remRow=(r,withName)=>{ const c=withName&&r.clientId&&clientById(r.clientId); return `<div class="item"><div class="grow"><p style="white-space:normal">${c?`<b>${esc(c.name)}</b>: `:''}${esc(r.text)}</p><p class="small muted">${fmtDay(r.date)}</p></div><button class="iconbtn" aria-label="Done, remove this reminder" data-act="nt-done" data-id="${r.id}">✓</button></div>`; };
function remLine(b){ const rs=b.status==='booked'?remsFor(b.clientId):[]; return rs.length?`<p class="small" style="white-space:normal;color:var(--accent);font-weight:600">Remember: ${rs.map(r=>esc(r.text)).join('; ')}</p>`:''; }
function todayCard(){ const buy=toBuyList(), rs=rems(), ts=!!state.setup.trackStock;
  return `<article class="card"><div class="treat-head"><h3>Today</h3><button class="btn small" data-act="eod-open">End of day check-in</button></div>
    ${buy.length?`<span class="small" style="font-weight:600">Time to reorder</span><div class="list">${buy.map(p=>`<div class="item"><div class="grow"><p><b>${esc(p.name)}</b></p><p class="small muted">${ts?`${nf(Math.round((+p.inStock||0)*10)/10)} left`:'You finished one'}${p.supplier?' · '+esc(p.supplier):''}</p></div>${orderBtn(p)}<button class="btn small ghost" data-act="buy-got" data-id="${p.id}">Got it</button></div>`).join('')}</div>`:''}
    ${rs.length?`<span class="small" style="font-weight:600">Reminders</span><div class="list">${rs.map(r=>remRow(r,true)).join('')}</div>`:''}
    ${!buy.length&&!rs.length?`<p class="small muted">At the end of the day, tap the button to log who came in, what you used up and anything to remember.</p>`:''}</article>`; }
const vDiaryBeforeToday=vDiary;
vDiary=function(){ const h=vDiaryBeforeToday(), i=h.indexOf('<article'); return i<0?h:h.slice(0,i)+todayCard()+h.slice(i); };
const clientCardBeforeRem=clientCard;
clientCard=function(c){ const h=clientCardBeforeRem(c), a='<article class="card"><h3>Visits</h3>', i=h.indexOf(a); if(i<0) return h;
  const rs=remsFor(c.id), card=`<article class="card"><h3>For next time</h3><p class="small muted">Shows on their bookings until you tick it off.</p>
    ${rs.length?`<div class="list">${rs.map(r=>remRow(r,false)).join('')}</div>`:''}
    <div class="row" style="flex-wrap:nowrap"><input id="nt-new-${c.id}" aria-label="New reminder for ${esc(c.name)}" placeholder="e.g. wants green hair dye next time" style="flex:1"><button class="btn small" data-act="nt-add" data-id="${c.id}">Add</button></div></article>`;
  return h.slice(0,i)+card+h.slice(i); };
const vClientsBeforeRem=vClients;
vClients=function(){ let h=vClientsBeforeRem(); if(clOpen) return h;
  state.clients.forEach(c=>{ const n=remsFor(c.id).length; if(!n) return; const a=`<button class="btn small ghost" data-act="cl-open" data-id="${c.id}">`; h=h.replace(a,`<span class="pill info">Remember</span>`+a); }); return h; };

// ===================== tester round 2: card reader list, bills with invoices, price slider, target by month or hour, health questions online =====================
// ---- card readers: a list, or her own with no fees filled in ----
Object.assign(APPS,{ sumup:{label:'SumUp',pct:.0169,fixed:0,note:'In-person card payments 1.69%'}, square:{label:'Square',pct:.0175,fixed:0,note:'In-person card payments 1.75%'}, zettle:{label:'Zettle',pct:.0175,fixed:0,note:'In-person card payments 1.75%'} });
APPS.other={label:'Add your own card reader',pct:0,fixed:0,note:'Type in its fees'};
const READERS=['fresha','booksy','timely','sumup','square','zettle','other','none'];
function cardStep(){ const s=state.setup, a=APPS[s.app];
  const fee=(id,label,hint,val,key,scale)=>`<label class="field">${label}<span class="hint">${hint}</span><input id="${id}" type="number" inputmode="decimal" min="0" step="0.01" value="${+val?esc(Math.round(val*scale*100)/100):''}" placeholder="0" data-set="${key}" data-scale="${scale}"></label>`;
  return {q:'How do clients mostly pay you?', why:'Card fees come off every payment, so they are part of what a treatment costs you.',
    body:`<label class="field">Card reader or booking app<select id="wiz-appsel" data-appsel="1"><option value="" ${a?'':'selected'}>Choose one</option>${READERS.map(k=>`<option value="${k}" ${s.app===k?'selected':''}>${esc(APPS[k].label)}</option>`).join('')}</select></label>
      ${s.app==='other'?`<label class="field">Its name<span class="hint">Optional</span><input id="wiz-appname" value="${esc(s.appName||'')}" placeholder="e.g. Dojo" data-appname="1"></label>`:''}
      ${a&&s.app!=='none'?`<div class="fields">${fee('wiz-cardPct','Card fee (%)',s.app==='other'?'It is on your card reader\'s price list':'Filled in from their price list. Change it if yours is different',s.cardPct,'cardPct',100)}${fee('wiz-cardFixed','Plus pence per payment','0 if there is none',s.cardFixed,'cardFixed',100)}</div>`:''}
      ${a?`<p class="small muted">${esc(a.note)}</p>`:''}`}; }
const quickStepBeforeCard=quickStep;
quickStep=function(st){ return st.type==='app'?cardStep():quickStepBeforeCard(st); };
// the target is set on the Prices screen now, not in set-up
const wizStepsBeforeTarget=wizSteps;
wizSteps=function(){ return wizFull?wizStepsBeforeTarget():wizStepsBeforeTarget().filter(x=>x.type!=='targetq'); };

// ---- bills and invoices: a photo saved as money out, for any month ----
const billCat=o=>o.group==='equipment'?'Equipment (lamps, drills, furniture)':/rent|rates|utilit|electric|gas|water|heat|insur/i.test(o.name)?'Rent, rates, power and insurance':/phone|internet|broadband|app|software|design|admin|website/i.test(o.name)?'Phone, software and office':/market|advert|ads/i.test(o.name)?'Advertising and marketing':/account|licen|registr|member|professional/i.test(o.name)?'Accountant and professional fees':/card|booking|bank/i.test(o.name)?'Bank, card and booking app fees':/fuel|van|car|mot/i.test(o.name)?'Car, van and travel':/repair|sharpen|servic/i.test(o.name)?'Repairs and maintenance':'Training and other costs';
const billsFor=(o,m)=>state.expenses.filter(e=>e.ohId===o.id&&(!m||(e.date||'').slice(0,7)===m));
function addBill(o,date,receiptId){ const e={id:uid(),date,supplier:o.title||o.name||'Running cost',amount:+o.amount||0,category:billCat(o),receiptId:receiptId||null,ohId:o.id}; state.expenses.push(e); return e; }
const billBtn=(o,month,label)=>`<label class="btn small ghost" style="cursor:pointer">${label}<input type="file" accept="image/*" hidden data-ohinv="${o.id}" ${month?`data-month="${month}"`:''}></label>`;
function billLine(o){ if(!o.name&&!+o.amount) return ''; const n=billsFor(o).length;
  return `<div class="row" style="flex-basis:100%;gap:8px">${billBtn(o,'',o.group==='equipment'?'Add the receipt':'Add an invoice')}${n?`<span class="small muted">${n} saved in Money out</span>`:''}</div>`; }
function billsCard(ty){ const list=(state.setup.overheads||[]).filter(o=>o.group!=='equipment'&&(o.name||+o.amount)); if(!list.length) return '';
  const months=[...Array(12)].map((_,i)=>{ const d=new Date(ty,3+i,1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }), now=todayStr().slice(0,7);
  return `<article class="card"><h3>Bills each month</h3><p class="small muted">Tap a month to add that month's invoice or bill. It goes into Money out with the date of that month. A tick means it is saved.</p>
    <div class="list">${list.map(o=>`<div class="item" style="flex-wrap:wrap"><div class="grow"><p><b>${esc(o.title||o.name||'Running cost')}</b></p><p class="small muted">${gbp(+o.amount)} ${(PERIOD.find(p=>p[0]===o.group)||['',''])[1]}</p></div>
      <div class="chips" style="flex-basis:100%">${months.filter(m=>m<=now).map(m=>{ const lab=dt(m+'-01').toLocaleDateString('en-GB',{month:'short'}); return billsFor(o,m).length?`<span class="chip" aria-pressed="true">✓ ${lab}</span>`:`<label class="chip" style="cursor:pointer">${lab}<input type="file" accept="image/*" hidden data-ohinv="${o.id}" data-month="${m}"></label>`; }).join('')}</div></div>`).join('')}</div>
    <p class="small muted">No photo? Add it under Money out on the Money tab instead.</p></article>`; }
document.addEventListener('change',async e=>{ const el=e.target, d=(el&&el.dataset)||{};
  if(d.appsel){ const a=APPS[el.value]; if(!a) return; state.setup.app=el.value; state.setup.cardPct=a.pct; state.setup.cardFixed=a.fixed; save(); render(); return; }
  if(d.appname){ state.setup.appName=el.value.trim(); save(); return; }
  if(d.bpc){ state.setup.bookPage={...bookPage(),consult:el.checked}; save(); return; }
  if(!d.ohinv||!el.files||!el.files[0]) return; const o=(state.setup.overheads||[]).find(x=>x.id===d.ohinv); if(!o) return;
  let rid=null; try{ rid=uid(); await putReceipt(rid,await shrink(el.files[0])); }catch(_){ rid=null; toast('Could not save the photo on this device'); return; }
  const date=d.month?d.month+'-15':(o.group==='equipment'&&o.bought?o.bought:todayStr()); addBill(o,date,rid); save(); render();
  toast(d.month?`Saved for ${dt(date).toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`:'Saved in Money out. Change its date there if it is for another month'); });
const vTaxYearBeforeBills=vTaxYear;
vTaxYear=function(){ const h=vTaxYearBeforeBills(), i=h.lastIndexOf('</section>'); return i<0?h:h.slice(0,i)+billsCard(moneyYear ?? taxYearOf(todayStr()))+h.slice(i); };

// ---- prices: slide from break-even up, see each price, use them ----
const typicalUK=t=>+((ALLCAT.find(c=>c.id===t.id)||{}).price)||0;
function pricesAt(rate){ const s=state.setup, keep=s.profitHour; s.profitHour=rate; const c=compute(state); s.profitHour=keep; return c.treatments; }
// each price can be typed in here; the suggested one is shown beside it
function slideRows(rate){ return pricesAt(rate).map(t=>{ const uk=typicalUK(t); return `<div class="item"><div class="grow"><p style="white-space:normal"><b>${esc(t.name)}</b></p><p class="small muted" style="white-space:normal">Suggested <b style="color:var(--accent)">${money(t.suggested)}</b> · break even ${money(t.minimum)}${uk?` · typical UK guide ${money(uk)}`:''}</p></div><span class="money-in" style="flex:0 0 104px"><input id="sl-pr-${t.id}" type="number" inputmode="decimal" min="0" step="0.5" value="${+t.price>0?esc(+t.price):''}" placeholder="${esc(nf(t.suggested))}" aria-label="Your price for ${esc(t.name)}" data-tf="${t.id}" data-f="price"></span></div>`; }).join(''); }
const slideLabel=r=>+r>0?`${gbp0(+r)} an hour on top of your costs`:'Break even: just cover your costs';
// the hourly amount and the monthly take-home are tied through her realistic hours with clients in a month
const fullHours=c=>c.capacity>0?c.capacity:c.billable;
const regionOf=s=>s.region==='sco'?'sco':'ruk';
function takeHomeAt(rate,c){ const s=state.setup, yr=Math.max(0,rate*fullHours(c)*12); return (yr-taxOnProfit(yr,regionOf(s),RULES,taxOpts(s)))/12; }
function rateFor(takeHome,c){ const s=state.setup, h=fullHours(c); return h>0&&takeHome>0?profitNeeded(takeHome*12,regionOf(s),RULES,taxOpts(s))/12/h:0; }
const slideMax=r=>Math.max(60,Math.ceil((+r+10)/10)*10);
function slideLive(r){ const c=compute(state), set=(id,v)=>{ const n=document.getElementById(id); if(n) n.textContent=v; };
  set('sl-val',slideLabel(r)); set('sl-hour',gbp0(c.overheadRate+r)); set('sl-hour-sub',`${gbp0(c.overheadRate)} for running costs, ${gbp0(r)} for you`); set('sl-home',gbp0(takeHomeAt(r,c)));
  const t=document.getElementById('tg-takeHome'); if(t) t.value=Math.round(takeHomeAt(r,c)); const l=document.getElementById('sl-list'); if(l) l.innerHTML=slideRows(r); }
function priceCard(c,plan){ const s=state.setup, r=profitHourOf(s), hrs=Math.round(fullHours(c));
  return `<section class="card"><h3>Your prices and target</h3>
    <p class="small muted">Slide to set what you earn for each hour with a ${W().cust}, or type what you want to take home each month. The two move together. All the way left just covers your costs.</p>
    <label class="field"><span id="sl-val" style="font-weight:700">${slideLabel(r)}</span><input id="sl-profit" type="range" min="0" max="${slideMax(r)}" step="1" value="${esc(Math.round(r))}" data-slide="1" style="accent-color:var(--accent);width:100%" aria-label="What you earn each hour on top of your costs"></label>
    <div class="grid2"><div class="stat hero"><span class="label">${icoTile('clock')}Each hour with a ${W().cust}</span><span class="value" id="sl-hour">${gbp0(c.overheadRate+r)}</span><span class="small muted" id="sl-hour-sub">${gbp0(c.overheadRate)} for running costs, ${gbp0(r)} for you</span></div>
      <div class="stat"><span class="label">${icoTile('wallet')}Take home a month</span><span class="value" id="sl-home">${gbp0(takeHomeAt(r,c))}</span><span class="small muted">working about ${hrs} hours with ${W().cust}s a month</span></div></div>
    ${moneyField('tg-takeHome','Or type what you want to take home each month','',Math.round(+s.takeHome||0),'data-set="takeHome"')}
    ${targetBoxes(c)}
    <h3 style="font-size:1rem;margin-top:6px">Your prices at this rate</h3>
    <div class="list" id="sl-list">${slideRows(r)}</div>
    <p class="small muted" style="margin:0">Type your own price in any box. 'Use these prices' keeps yours and uses the suggested price for any left empty.</p>
    <div class="row"><button class="btn" data-act="sl-use">Use these prices</button><button class="btn small ghost" data-act="sl-sug">Set all to suggested</button></div>
    <p class="small muted">The typical UK guide is a rough figure for the whole country, not prices near you.</p></section>`; }
document.addEventListener('input',e=>{ const el=e.target; if(el.dataset&&el.dataset.slide) slideLive(+el.value); });
document.addEventListener('change',e=>{ const el=e.target, s=state.setup;
  if(el.dataset&&el.dataset.slide){ s.profitHour=+el.value; s.takeHome=Math.round(takeHomeAt(s.profitHour,compute(state))); save(); render(); }
  else if(el.id==='tg-takeHome'){ s.profitHour=Math.round(rateFor(+el.value||0,compute(state))*100)/100; save(); render(); } });
const vPricesBeforeSlide=vPrices;
vPrices=function(){ const s0=state.setup; if(state.treatments.length){ const home=Math.round(takeHomeAt(profitHourOf(s0),compute(state))); if(Math.abs((+s0.takeHome||0)-home)>1){ s0.takeHome=home; save(); } } // the hourly amount leads, so the two always agree
  let h=vPricesBeforeSlide(); if(!state.treatments.length) return h; const c=compute(state);
  h=h.replace(/<label class="field">[^<]*(?:<span class="hint">[^<]*<\/span>)?<span class="money-in"><input id="pn-profitHour"[^>]*><\/span><\/label>/,'')
    .replace('Your suggested prices come from these two. Change them here.','Your suggested prices come from your running costs and what you earn each hour, set above.')
    .replace(/About £[\d,]+ of that is yours to take home after tax\. /,'').replace(' Changing the target does not change your prices.',' Changing the target changes what you earn each hour, and so your prices.');
  const a=h.indexOf('<section class="card"><h3>Your target</h3>'); if(a<0) return h; const b=h.indexOf('</section>',a)+10, tgt=h.slice(a,b);
  const f=tgt.indexOf('</label>',tgt.indexOf('id="tg-takeHome"')), plan=f<0?'':tgt.slice(f+8,tgt.length-10);
  return h.slice(0,a)+priceCard(c,plan)+h.slice(b); };
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  // 'Use these prices' keeps any price she typed (read from the box too, in case it has not saved yet) and fills empty ones with the suggested price
  if(a==='sl-use'||a==='sl-sug'){ const sug=a==='sl-sug'; compute(state).treatments.forEach(c=>{ const t=state.treatments.find(x=>x.id===c.id); if(!t) return;
      const box=document.getElementById('sl-pr-'+c.id), typed=box&&box.value!==''?+box.value:0; t.price=sug?c.suggested:typed>0?typed:+t.price>0?+t.price:c.suggested; });
    save(); render(); toast(sug?'All prices set to the suggested ones':'Your prices are saved'); }
  else if(a==='undo-ok'){ document.getElementById('undobar').hidden=true; undoSnap=null; clearTimeout(undoTimer); } });
UNDOABLE.add('sl-use');

// ---- health questions on the online booking page ----
const bookFaceBeforeQ=bookFace;
bookFace=function(){ let h=bookFaceBeforeQ(); if(!BK||!BK.q||bf.time==null) return h; const i=h.indexOf('data-act="bf-send"'); if(i<0) return h; const j=h.lastIndexOf('<div class="stack">',i); if(j<0) return h; const q=bf.q||(bf.q={});
  const block=`<div class="stack" style="gap:8px"><h3 style="font-size:1rem;margin-top:6px">A few health questions</h3><p class="small muted" style="margin-top:-6px">So your treatment is safe for you. Leave any that do not apply.</p>
    ${CONSULT_Q.map(([k,l])=>`<label class="field">${esc(l)}<input id="bfq-${k}" value="${esc(q[k]||'')}" data-bfq="${k}"></label>`).join('')}
    <label class="row small" style="flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" data-bfq="photos" ${q.photos?'checked':''} style="flex:none"><span>Happy for photos of my treatment to be used on social media</span></label>
    <label class="row small" style="flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" data-bfq="marketing" ${q.marketing?'checked':''} style="flex:none"><span>Happy to get offers and reminders</span></label></div>`;
  return h.slice(0,j)+block+h.slice(j); };
document.addEventListener('input',e=>{ const el=e.target, k=el.dataset&&el.dataset.bfq; if(!k) return; bf.q=bf.q||{}; bf.q[k]=el.type==='checkbox'?el.checked:el.value; });
document.addEventListener('change',e=>{ const el=e.target, k=el.dataset&&el.dataset.bfq; if(!k||el.type!=='checkbox') return; bf.q=bf.q||{}; bf.q[k]=el.checked; });
function bfAnswers(){ return BK&&BK.q?Object.fromEntries(Object.entries(bf.q||{}).filter(([,v])=>v!==''&&v!==false&&v!=null).map(([k,v])=>[k,typeof v==='string'?v.trim():v]).filter(([,v])=>v!=='')):{}; }
bfMessage=function(){ const B=BK, tr=B.t.find(t=>t[0]===bf.t), n=bf.name.trim(), p=bf.phone.trim(), o=bf.note.trim(), q=bfAnswers();
  const link=location.origin+location.pathname+'#add='+b64e({t:bf.t,n:tr[1],d:bf.d,h:fromMin(bf.time),c:n,p,o,...(Object.keys(q).length?{q}:{})});
  const qs=CONSULT_Q.filter(([k])=>q[k]).map(([k,l])=>`${l} ${q[k]}`).concat(q.photos?['Happy for photos to be used on social media']:[],q.marketing?['Happy to get offers and reminders']:[]);
  return `Hi${B.b?' '+B.b:''}, I would like to book ${tr[1]} on ${fmtDay(bf.d)} at ${fmtT(fromMin(bf.time))}.\nName: ${n}${p?`\nPhone: ${p}`:''}${o?`\nNote: ${o}`:''}${qs.length?`\n\nHealth questions:\n${qs.map(x=>'- '+x).join('\n')}`:''}\n\nTo add this to your diary, tap: ${link}`; };
const addRequestBeforeQ=addRequest;
addRequest=function(A){ const b=addRequestBeforeQ(A); if(b&&A.q&&b.clientId){ const cl=clientById(b.clientId); if(cl){ const con=cl.consult||{answers:{}}; cl.consult={...con,answers:{...con.answers,...A.q}}; } } return b; };
const showAddBeforeQ=showAdd;
showAdd=function(A){ showAddBeforeQ(A); if(!A.q) return; const o=document.getElementById('overlay'), card=o.querySelector('.card'), row=card&&card.querySelector('.row'); if(!row) return;
  row.insertAdjacentHTML('beforebegin',`<div class="notice info"><b>Health questions answered.</b> They are saved to their consultation form when you add this.</div>`); };
const bookCardBeforeQ=bookCard;
bookCard=function(){ const h=bookCardBeforeQ(), a='<div class="row"><button class="btn" data-act="bp-share">', i=h.indexOf(a); if(i<0) return h;
  return h.slice(0,i)+`<label class="row small" style="flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" data-bpc="1" ${bookPage().consult!==false?'checked':''} style="flex:none"><span>Ask your consultation (health) questions when they book</span></label>`+h.slice(i); };

// ===================== running costs grouped: items under each kind of cost, with dates and invoices =====================
const ordinal=n=>n+(n%100>10&&n%100<14?'th':['th','st','nd','rd'][n%10]||'th');
function payDesc(o){ const p=o.pay, bits=[];
  if(p){ const d=dt(p); bits.push(o.group==='weekly'?`Comes out every ${d.toLocaleDateString('en-GB',{weekday:'long'})}`:o.group==='yearly'?`Comes out each ${d.getDate()} ${d.toLocaleDateString('en-GB',{month:'long'})}`:`Comes out on the ${ordinal(d.getDate())} of each month`); }
  if(o.end) bits.push(`${o.end<todayStr()?'contract ended':'contract ends'} ${fmtDay(o.end)} ${o.end.slice(0,4)}`);
  const n=billsFor(o).length; if(n) bits.push(`${n} invoice${n>1?'s':''} saved`);
  return bits.join(' · ')||'Optional'; }
function costItem(o){
  return `<div class="item" style="flex-wrap:wrap;gap:6px 8px">
    <input id="oh-title-${o.id}" aria-label="Who you pay or what it is, for ${esc(o.name||'this cost')}" placeholder="Name it (optional)" value="${esc(o.title||'')}" data-oh="${o.id}" data-f="title" style="flex:1 1 55%;min-width:0">
    <button class="iconbtn" aria-label="Remove ${esc(o.title||o.name||'this')}" data-act="oh-del" data-id="${o.id}">✕</button>
    <span class="money-in" style="flex:0 0 120px"><input id="oh-amt-${o.id}" type="number" inputmode="decimal" min="0" step="1" value="${esc(o.amount)}" aria-label="${esc(o.title||o.name||'Cost')}, amount" data-oh="${o.id}" data-f="amount"></span>
    <select aria-label="How often you pay for ${esc(o.title||o.name||'this')}" data-ohp="${o.id}" style="flex:0 0 120px">${PERIOD.map(([k,l])=>`<option value="${k}" ${o.group===k?'selected':''}>${l}</option>`).join('')}</select>
    <details class="fold" data-sec="oh-${o.id}" ${isOpen('oh-'+o.id)?'open':''} style="flex-basis:100%"><summary><span class="grow">Dates and invoice<small>${esc(payDesc(o))}</small></span></summary>
      <div class="stack" style="gap:8px"><div class="fields">
        <label class="field">Date it comes out<span class="hint">Any payment date</span><input id="oh-pay-${o.id}" type="date" value="${esc(o.pay||'')}" data-oh="${o.id}" data-f="pay"></label>
        <label class="field">Contract starts<span class="hint">Optional</span><input id="oh-start-${o.id}" type="date" value="${esc(o.start||'')}" data-oh="${o.id}" data-f="start"></label>
        <label class="field">Contract ends<span class="hint">Optional</span><input id="oh-end-${o.id}" type="date" value="${esc(o.end||'')}" data-oh="${o.id}" data-f="end"></label></div>
        ${billLine(o)}</div></details>
  </div>`; }
function costGroups(list){ const out=[]; list.forEach(o=>{ const k=o.custom&&!o.name?'#'+o.id:o.name; let g=out.find(x=>x.k===k); if(!g) out.push(g={k,items:[]}); g.items.push(o); }); return out; }
costList=function(){ const s=state.setup, list=s.overheads||[];
  const groups=costGroups(list.filter(o=>o.group!=='equipment')).map(({items})=>{ const o=items[0];
    return `<div class="stack" style="gap:4px;padding:8px 0;border-bottom:1px solid var(--line)">
      ${o.custom?`<input id="oh-name-${o.id}" aria-label="What kind of cost is it?" placeholder="What is it? e.g. Software" value="${esc(o.name)}" data-ohname="${o.id}" style="font-weight:600">`:`<b>${esc(o.name)}</b>`}
      <div class="list">${items.map(costItem).join('')}</div>
      <button class="btn small ghost" style="align-self:flex-start" data-act="oh-more" data-id="${o.id}">+ Add another under ${esc(o.name||'this')}</button></div>`; }).join('');
  return `<div class="stack" style="gap:6px"><h3 style="font-size:1rem">What you pay regularly</h3><p class="small muted">Add each one you pay under its kind. Naming it is optional. Something missing? Add your own.</p>
      <button class="btn small" style="align-self:flex-start" data-act="costq-add" data-g="monthly">+ Add your own business cost</button>
      ${groups}
      <button class="btn small ghost" style="align-self:flex-start" data-act="costq-add" data-g="monthly">+ Add your own business cost</button></div>
    <div class="stack" style="gap:6px"><h3 style="font-size:1rem">One-offs</h3><p class="small muted">Things you buy once and keep using, like a lamp, a couch or a trolley.</p>
      <div class="list">${list.filter(o=>o.group==='equipment').map(costRow).join('')}</div>
      <button class="btn small ghost" data-act="costq-add" data-g="equipment">+ Add a one-off</button></div>
    <p class="live" data-live="costs">That comes to about <span class="num">${gbp0(overheadsMonth(s))}</span> a month.</p>
    <p class="small muted" data-live="costwork">${costWorking(s)}</p>`; };
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act="oh-more"]'); if(!el) return; const s=state.setup, src=(s.overheads||[]).find(x=>x.id===el.dataset.id); if(!src) return;
  const o={id:uid(),group:src.group,name:src.name,custom:!!src.custom,amount:0,years:3}, last=s.overheads.map(x=>x.name).lastIndexOf(src.name);
  s.overheads.splice(last+1,0,o); s._ohEdited=true; save(); render(); const n=document.getElementById('oh-title-'+o.id); if(n) n.focus(); });
// renaming a kind of cost renames every item under it
document.addEventListener('change',e=>{ const el=e.target, id=el.dataset&&el.dataset.ohname; if(!id) return; const s=state.setup, o=(s.overheads||[]).find(x=>x.id===id); if(!o) return;
  const old=o.name; s.overheads.forEach(x=>{ if(x===o||(old&&x.custom&&x.name===old)) x.name=el.value.trim(); }); s._ohEdited=true; save(); render(); });

// ===================== how many a week or a month; personal outgoings and savings set the take home; what to put aside for tax =====================
// ---- set-up step 4: count by the week or the month ----
const perMonth=()=>state.setup.countPer!=='week', WK=52/12;
function cntField(t){ const m=perMonth(), sh=v=>m?Math.round(v*WK):v;
  return `<label class="field">${m?'A month':'A week'}<input id="ql-w-${t.id}" type="number" inputmode="decimal" min="0" step="${m?1:0.5}" value="${t.perWeek?esc(sh(+t.perWeek)):''}" placeholder="${t.exPerWeek?'e.g. '+nf(sh(+t.exPerWeek)):''}" data-tf="${t.id}" data-f="perWeek" data-mul="${m?1/WK:1}"></label>`; }
const quickStepBeforeCount=quickStep;
quickStep=function(st){ const r=quickStepBeforeCount(st); if(st.type!=='quicklist'||!r) return r; const m=perMonth();
  return {...r, why:r.why.replace(/how many you do in a (week|month)/,`how many you do in a ${m?'month':'week'}`),
    body:`<div class="row" style="gap:8px;align-items:center"><span class="small" style="font-weight:600">Count how many you do</span><div class="chips"><button class="chip" data-act="cnt-per" data-v="week" aria-pressed="${!m}">A week</button><button class="chip" data-act="cnt-per" data-v="month" aria-pressed="${m}">A month</button></div></div>`+r.body}; };

// ---- the Tax page is put away for now; its bills list moves to Money ----
const navGroupsBeforeTax=navGroups;
navGroups=function(){ return navGroupsBeforeTax().map(g=>g.key==='money'?{...g,views:g.views.filter(v=>v[0]!=='taxyear')}:g); };
const vMoneyBeforeBills=vMoney;
vMoney=function(){ const h=vMoneyBeforeBills(), i=h.lastIndexOf('</section>'); return i<0?h:h.slice(0,i)+billsCard(moneyYear ?? taxYearOf(todayStr()))+h.slice(i); };

// ---- her own outgoings and savings: what she needs to take home ----
const PERSONAL=['Rent or mortgage','Council tax','Gas and electric','Water','Food and shopping','Phone and broadband','Car or travel','Childcare','Loans and credit cards','Insurance','Subscriptions','Clothes, gifts and going out','Other'];
const pers=()=>{ const s=state.setup; if(!s.personal) s.personal=PERSONAL.map(n=>({id:uid(),name:n,amount:0,group:'monthly'})); return s.personal; };
const persMonth=s=>(s.personal||[]).reduce((a,o)=>a+(+o.amount||0)*(o.group==='weekly'?WK:o.group==='yearly'?1/12:1),0)+(+s.savings||0);
// what share of profit goes on tax, National Insurance and student loan
function setAside(profitMonth){ const s=state.setup, yr=Math.max(0,profitMonth*12), p=taxParts(yr,regionOf(s),RULES,taxOpts(s));
  const pc=v=>yr>0?v/yr:0; return {all:pc(p.total),tax:pc(p.tax),ni:pc(p.ni),loan:pc(p.loan),month:p.total/12}; }
const pctTxt=v=>`${Math.round(v*1000)/10}%`;
function asideLine(profitMonth){ const a=setAside(profitMonth); if(!(a.all>0)) return `<p class="small muted" id="sl-tax">At this level there is no tax or National Insurance to put aside.</p>`;
  return `<p class="small" id="sl-tax">Put aside about <b>${pctTxt(a.all)}</b> of your profit, about <b>${gbp0(a.month)}</b> a month: income tax ${pctTxt(a.tax)}, National Insurance ${pctTxt(a.ni)}${a.loan>0?`, student loan ${pctTxt(a.loan)}`:''}.</p>`; }
function personalSection(){ const s=state.setup, list=pers(), need=persMonth(s), c=compute(state), rate=need>0?rateFor(need,c):null;
  const row=o=>`<div class="item" style="flex-wrap:wrap;gap:6px 8px"><input id="pe-n-${o.id}" aria-label="What it is" placeholder="What is it?" value="${esc(o.name)}" data-pe="${o.id}" data-f="name" style="flex:1 1 55%;min-width:0"><button class="iconbtn" aria-label="Remove ${esc(o.name||'this')}" data-act="pe-del" data-id="${o.id}">✕</button>
    <span class="money-in" style="flex:0 0 120px"><input id="pe-a-${o.id}" type="number" inputmode="decimal" min="0" step="1" value="${+o.amount?esc(o.amount):''}" placeholder="0" aria-label="${esc(o.name||'Amount')}, amount" data-pe="${o.id}" data-f="amount"></span>
    <select aria-label="How often" data-pe="${o.id}" data-f="group" style="flex:0 0 120px">${PERIOD.map(([k,l])=>`<option value="${k}" ${o.group===k?'selected':''}>${l}</option>`).join('')}</select></div>`;
  return `<div class="stack" style="gap:6px"><h3 style="font-size:1rem">Your own outgoings</h3><p class="small muted">What you pay at home each month. Leave any that do not apply. This sets what you need to take home.</p>
      <div class="list">${list.map(row).join('')}</div><button class="btn small ghost" data-act="pe-add">+ Add another</button></div>
    <div class="stack" style="gap:6px"><h3 style="font-size:1rem">Savings</h3>${moneyField('pe-sav','What you want to save each month','Comes out of your wage, on top of your outgoings',+s.savings||'','data-pesav="1"')}</div>
    <details class="fold" data-sec="pe-loan" ${isOpen('pe-loan')?'open':''}><summary><span class="grow">A job or student loan<small>Changes how much to put aside</small></span></summary>${taxExtraEditor()}</details>
    ${need>0?`<div class="notice ok"><b>You need to take home ${gbp0(need)} a month.</b> ${rate!=null&&fullHours(c)>0?`That means ${gbp0(rate)} an hour on top of your costs, so about ${gbp0(c.overheadRate+rate)} for each hour with a ${W().cust}.`:''}</div>${asideLine(profitNeeded(need*12,regionOf(s),RULES,taxOpts(s))/12)}${leftLine(need,c)}`:'<p class="small muted">Type in your outgoings to see what you need to take home.</p>'}`; }
// her outgoings and savings lead: they set the take home, and so the hourly amount
function applyPersonal(){ const s=state.setup, need=persMonth(s); if(need>0){ s.takeHome=Math.round(need); s.profitHour=Math.round(rateFor(need,compute(state))*100)/100; } }
document.addEventListener('change',e=>{ const el=e.target, d=(el&&el.dataset)||{}, s=state.setup;
  if(d.pe){ const o=pers().find(x=>x.id===d.pe); if(!o) return; o[d.f]=d.f==='amount'?Math.max(0,+el.value||0):el.value; applyPersonal(); save(); render(); }
  else if(d.pesav){ s.savings=Math.max(0,+el.value||0); applyPersonal(); save(); render(); }
  else if(d.sl||el.id==='tx-job'){ setTimeout(()=>{ applyPersonal(); save(); render(); },0); } });
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, s=state.setup;
  if(a==='cnt-per'){ s.countPer=el.dataset.v; save(); render(); }
  else if(a==='pe-add'){ const o={id:uid(),name:'',amount:0,group:'monthly'}; pers().push(o); save(); render(); const n=document.getElementById('pe-n-'+o.id); if(n) n.focus(); }
  else if(a==='pe-del'){ s.personal=pers().filter(x=>x.id!==el.dataset.id); applyPersonal(); save(); render(); }
  else if(a==='pg-toggle'){ setTimeout(()=>{ applyPersonal(); save(); render(); },0); } });
UNDOABLE.add('pe-del');
// set-up: her own outgoings come straight after the business ones
const quickStepBeforePersonal=quickStep;
// her own outgoings are a step of their own, straight after the business ones
quickStep=function(st){ if(st.type==='persq') return {q:'What goes out at home?', why:'What you pay at home and want to save each month. This sets what you need to take home. Leave any that do not apply.', body:`<div class="stack" style="gap:12px">${personalSection().replace(/<h3[^>]*>Your own outgoings<\/h3><p class="small muted">[^<]*<\/p>/,"")}</div>`};
  return quickStepBeforePersonal(st); };
const wizStepsBeforePers=wizSteps;
wizSteps=function(){ const st=wizStepsBeforePers().slice(); if(wizFull||st.some(x=>x.type==='persq')) return st; const i=st.findIndex(x=>x.type==='costq'); if(i>=0) st.splice(i+1,0,{type:'persq'}); return st; };
// Prices: the same section under Your numbers, and what to put aside under the slider
const vPricesBeforePersonal=vPrices;
vPrices=function(){ let h=vPricesBeforePersonal(); const a='<p class="live" id="pn-live">', i=h.indexOf(a);
  if(i>=0) h=h.slice(0,i)+`<details class="fold" data-sec="p-own" ${isOpen('p-own')?'open':''}><summary><span class="grow">Your own outgoings and savings<small>${persMonth(state.setup)>0?`${gbp0(persMonth(state.setup))} a month · tap to change`:'Sets what you need to take home · tap to add'}</small></span></summary><div class="stack">${personalSection()}</div></details>`+h.slice(i);
  return h; };
document.addEventListener('input',e=>{ const el=e.target; if(!el.dataset||!el.dataset.slide) return; const n=document.getElementById('sl-tax'); if(n) n.outerHTML=taxBox(+el.value*fullHours(compute(state))); });

// ===================== what is left of her wage after her own outgoings and savings =====================
function leftLine(need,c){ const home=takeHomeAt(profitHourOf(state.setup),c), left=Math.round(home-need);
  return `<p class="small" id="pe-left">At what you earn each hour now, you take home about <b>${gbp0(home)}</b> a month. ${left>=1?`After your outgoings and savings, <b>${gbp0(left)}</b> is left over.`:left<=-1?`That is <b>${gbp0(-left)}</b> short of your outgoings and savings.`:'That just covers your outgoings and savings.'}</p>`; }

// ===================== tax pack: everything for a tax year in one zip, for an accountant or a tax app =====================
// jsPDF (MIT) and JSZip (MIT) sit in the page as plain text and only start when a pack is made, so the app opens as fast as before.
function packLibs(){ if(window.jspdf&&window.JSZip) return Promise.resolve();
  return new Promise((res,rej)=>{ try{ ['lib-jszip','lib-jspdf'].forEach(id=>{ const src=document.getElementById(id); if(!src) throw Error('missing '+id); const s=document.createElement('script'); s.textContent=src.textContent; document.head.appendChild(s); }); window.jspdf&&window.JSZip?res():rej(Error('libraries did not load')); }catch(e){ rej(e); } }); }
const tyLabel=ty=>`${ty}/${String((ty+1)%100).padStart(2,'0')}`;
const inTy=ty=>x=>taxYearOf(x.date)===ty;
// a spreadsheet cell: quoted, and text that starts like a formula is made safe to open in Excel
const csvCell=v=>{ let s=v==null?'':String(v); if(typeof v==='string'&&/^[=+\-@\t\r]/.test(s)) s="'"+s; return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
const csv=rows=>rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
const safeName=s=>String(s||'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'').replace(/\s+/g,' ').trim().slice(0,60);
function receiptName(e,blob,used){ const ext=/png/.test((blob&&blob.type)||'')?'png':'jpg'; let base=safeName(`${e.date} ${e.supplier||'Receipt'} ${(+e.amount||0).toFixed(2)}`), n=base, i=2; while(used.has(n)) n=`${base} (${i++})`; used.add(n); return `receipts/${n}.${ext}`; }
// months of the tax year so far with nothing recorded, so she knows what to backdate
function gapMonths(ty){ const out=[], now=todayStr().slice(0,7);
  for(let i=0;i<12;i++){ const d=new Date(ty,3+i,1), m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); if(m>now) break;
    const inc=state.income.some(x=>(x.date||'').slice(0,7)===m), exp=state.expenses.some(x=>(x.date||'').slice(0,7)===m);
    if(!inc||!exp) out.push({m,label:d.toLocaleDateString('en-GB',{month:'long'}),inc,exp}); } return out; }
// months missing records, in one short sentence per kind
const andList=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
function gapText(g){ const none=g.filter(x=>!x.inc&&!x.exp).map(x=>x.label), noIn=g.filter(x=>!x.inc&&x.exp).map(x=>x.label), noOut=g.filter(x=>x.inc&&!x.exp).map(x=>x.label);
  return [none.length?`Nothing recorded for ${andList(none)}.`:'',noIn.length?`No money in for ${andList(noIn)}.`:'',noOut.length?`No money out for ${andList(noOut)}.`:''].filter(Boolean).join(' '); }
function packRows(ty){ const f=inTy(ty), by=(a,b)=>a.date.localeCompare(b.date);
  return {inc:state.income.filter(f).sort(by), exp:state.expenses.filter(f).sort(by), trips:(state.trips||[]).filter(f).sort(by)}; }
function packChecks(ty,sm){ const R=RULES, out=[], isCur=ty===taxYearOf(todayStr()), start=new Date(ty,3,6), end=new Date(ty+1,3,5,23,59);
  const frac=isCur?Math.min(1,Math.max(0.0001,(new Date()-start)/(end-start))):1, projInc=sm.income/frac;
  out.push(sm.useAllowance?`Your costs are under the ${gbp0(R.tradingAllowance)} trading allowance, so the flat allowance is used instead. You can use one or the other, not both.`:`Your real costs (${gbp0(sm.expenses)}) are more than the ${gbp0(R.tradingAllowance)} trading allowance, so your costs are used.`);
  if(projInc>R.vatThreshold*0.85) out.push(`Takings are near the VAT threshold of ${gbp0(R.vatThreshold)} a year. HMRC counts any 12 months in a row. Speak to an accountant.`);
  const mtd=R.mtd.find(m=>projInc>m.over); if(mtd) out.push(`Takings are over ${gbp0(mtd.over)} a year, so Making Tax Digital applies from ${mtd.from}: digital records and quarterly updates through approved software.`);
  const pa=R.pa; if(sm.profit+(+state.setup.otherIncome||0)>pa) out.push(`Your income is over the ${gbp0(pa)} tax-free personal allowance, so income tax is due.`);
  else out.push(`Your income is under the ${gbp0(pa)} tax-free personal allowance so far.`);
  const gaps=gapMonths(ty); if(gaps.length) out.push(gapText(gaps));
  return out; }
// the spreadsheets: one row per entry, ready for an accountant or a tax app to import
function packCsvs(ty){ const {inc,exp,trips}=packRows(ty), sm=taxYearSummary(state,ty), used=new Set();
  const names={}; exp.forEach(e=>{ if(e.receiptId) names[e.id]=receiptName(e,null,used); });
  return {names,
    'money-in.csv':csv([['Date','What for','Paid by','Amount (GBP)'],...inc.map(x=>[x.date,x.desc||'Takings',x.method||'',(+x.amount||0).toFixed(2)])]),
    'money-out.csv':csv([['Date','Who or what','Category','Amount (GBP)','Receipt file'],...exp.map(x=>[x.date,x.supplier||'',x.category||'',(+x.amount||0).toFixed(2),names[x.id]||''])]),
    'car-trips.csv':csv([['Date','Where to','Miles','Claim (GBP)'],...trips.map(x=>[x.date,x.route||'',+x.miles||0,mileageClaim(+x.miles||0).toFixed(2)])]),
    'summary.csv':csv([['Item','Amount (GBP)'],['Money in (turnover)',sm.income.toFixed(2)],...(sm.useAllowance?[['Trading allowance',sm.deduction.toFixed(2)]]:CATEGORIES.filter(c=>sm.byCat[c]).map(c=>[c,sm.byCat[c].toFixed(2)]).concat([['Total allowable expenses',sm.expenses.toFixed(2)]])),['Profit',sm.profit.toFixed(2)],['Income tax (estimate)',sm.parts.tax.toFixed(2)],['National Insurance (estimate)',sm.parts.ni.toFixed(2)],['Student loan (estimate)',sm.parts.loan.toFixed(2)]])}; }
function packPdf(ty){ const {jsPDF}=window.jspdf, doc=new jsPDF({unit:'mm',format:'a4'}), sm=taxYearSummary(state,ty), {inc,exp,trips}=packRows(ty), W=210, M=16; let y=M;
  const biz=(state.setup.brand||{}).businessName||'';
  const line=(t,o={})=>{ doc.setFont('helvetica',o.b?'bold':'normal'); doc.setFontSize(o.size||10); const parts=doc.splitTextToSize(String(t),W-2*M-(o.indent||0)); parts.forEach(p=>{ if(y>282){ doc.addPage(); y=M; } doc.text(p,M+(o.indent||0),y); y+=(o.size||10)*0.45; }); y+=o.gap||1.5; };
  const row=(cells,widths,o={})=>{ if(y>282){ doc.addPage(); y=M; } doc.setFont('helvetica',o.b?'bold':'normal'); doc.setFontSize(9); let x=M;
    cells.forEach((c,i)=>{ const w=widths[i], s=doc.splitTextToSize(String(c),w-2)[0]||''; if(o.right&&o.right.includes(i)) doc.text(s,x+w-1,y,{align:'right'}); else doc.text(s,x,y); x+=w; }); y+=5; };
  line(`Tax year ${tyLabel(ty)}${biz?' · '+biz:''}`,{b:1,size:16,gap:2}); line(`6 April ${ty} to 5 April ${ty+1}. Made with Know Your Worth on ${fmtDay(todayStr())} ${todayStr().slice(0,4)}.`,{gap:5});
  line('For your Self Assessment (self-employment)',{b:1,size:12,gap:2});
  const tw=[120,58]; row(['Money in (turnover)',gbp(sm.income)],tw,{right:[1]});
  if(sm.useAllowance) row(['Trading allowance (instead of costs)',gbp(sm.deduction)],tw,{right:[1]});
  else { CATEGORIES.filter(c=>sm.byCat[c]).forEach(c=>row([c,gbp(sm.byCat[c])],tw,{right:[1]})); row(['Total allowable expenses',gbp(sm.expenses)],tw,{b:1,right:[1]}); }
  row(['Profit',gbp(sm.profit)],tw,{b:1,right:[1]}); y+=2;
  row(['Income tax (estimate)',gbp(sm.parts.tax)],tw,{right:[1]}); row(['National Insurance (estimate)',gbp(sm.parts.ni)],tw,{right:[1]}); if(sm.parts.loan>0) row(['Student loan (estimate)',gbp(sm.parts.loan)],tw,{right:[1]}); y+=3;
  line('Checks',{b:1,size:12,gap:2}); packChecks(ty,sm).forEach(c=>line('• '+c,{indent:2}));
  line('Estimates using 2026/27 UK rates, not tax advice. Check with HMRC, an accountant or approved tax software.',{size:8,gap:5});
  const sec=(title,head,widths,rows,right)=>{ line(title,{b:1,size:12,gap:2}); row(head,widths,{b:1,right}); rows.forEach(r=>row(r,widths,{right})); if(!rows.length) line('None recorded.',{size:9}); y+=3; };
  sec(`Money in (${inc.length})`,['Date','What for','Paid by','Amount'],[24,94,32,28],inc.map(x=>[x.date,x.desc||'Takings',x.method||'',gbp(+x.amount)]),[3]);
  sec(`Money out (${exp.length})`,['Date','Who or what','Category','Amount','Photo'],[24,54,58,26,16],exp.map(x=>[x.date,x.supplier||'',x.category||'',gbp(+x.amount),x.receiptId?'Yes':'']),[3]);
  if(trips.length) sec(`Car trips (${trips.length})`,['Date','Where to','Miles','Claim'],[24,102,24,28],trips.map(x=>[x.date,x.route||'',nf(+x.miles||0),gbp(mileageClaim(+x.miles||0))]),[2,3]);
  return doc.output('blob'); }
async function makePack(ty){ await packLibs(); const zip=new window.JSZip(), files=packCsvs(ty), lab=tyLabel(ty).replace('/','-'), {exp}=packRows(ty); let photos=0, missing=0;
  Object.entries(files).forEach(([n,v])=>{ if(n!=='names') zip.file(n,v); });
  for(const e of exp){ if(!e.receiptId) continue; try{ const b=await getReceipt(e.receiptId); if(b){ zip.file(files.names[e.id],b); photos++; } else missing++; }catch(_){ missing++; } }
  zip.file(`Tax pack ${lab}.pdf`,packPdf(ty));
  zip.file('READ ME.txt',`Tax pack for ${tyLabel(ty)} from Know Your Worth.\r\n\r\nTax pack ${lab}.pdf: the figures for your Self Assessment, checks, and every entry.\r\nmoney-in.csv, money-out.csv, car-trips.csv: every entry, to open in Excel or import into a tax app.\r\nsummary.csv: the totals by category.\r\nreceipts: your receipt and invoice photos, named by date, who and amount.\r\n\r\nEstimates only, not tax advice.\r\n`);
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  return {blob,name:`Know Your Worth tax pack ${lab}.zip`,photos,missing}; }
let packReady=null, packBusy=false;
function packCard(){ const ty=moneyYear ?? taxYearOf(todayStr()), gaps=gapMonths(ty), {inc,exp}=packRows(ty), ph=exp.filter(e=>e.receiptId).length;
  return `<article class="card" id="tax-pack"><h3>Your tax pack for ${tyLabel(ty)}</h3>
    <p class="small muted">Everything for the tax year in one file, for your accountant or a tax app: a PDF with your Self Assessment figures and checks, spreadsheets of every entry, and all your receipt photos.</p>
    <p class="small">${inc.length} money in, ${exp.length} money out, ${ph} photo${ph===1?'':'s'}.</p>
    ${gaps.length?`<div class="notice warn"><b>Backdate to make the pack complete.</b> ${gapText(gaps)} Add them under Money in and Money out with the right date.</div>`:''}
    ${packReady&&packReady.ty===ty?`<div class="notice ok">Your pack is ready: ${esc(packReady.name)}${packReady.missing?`. ${packReady.missing} photo${packReady.missing>1?'s were':' was'} not found on this phone`:''}.</div>
      <div class="row"><button class="btn" data-act="pack-save">Save to this phone</button><button class="btn ghost" data-act="pack-share">Send to Google Drive, email or an app</button></div>`
      :`<button class="btn" data-act="pack-make" ${packBusy?'disabled':''}>${packBusy?'Making your pack…':'Make my tax pack'}</button>`}</article>`; }
const vMoneyBeforePack=vMoney;
vMoney=function(){ const h=vMoneyBeforePack(), a='<article class="card"><div class="row" style="justify-content:space-between"><h3>Money in</h3>', i=h.indexOf(a); return i<0?h:h.slice(0,i)+packCard()+h.slice(i); };
document.addEventListener('click',async e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='pack-make'){ if(packBusy) return; packBusy=true; render(); const ty=moneyYear ?? taxYearOf(todayStr());
    try{ packReady={...await makePack(ty),ty}; }catch(err){ packReady=null; toast('Could not make the pack on this phone'); }
    packBusy=false; render(); const n=document.getElementById('tax-pack'); if(n) n.scrollIntoView({block:'center'}); }
  else if(a==='pack-save'&&packReady){ await saveFile(packReady.name,packReady.blob); }
  else if(a==='pack-share'&&packReady){ const f=new File([packReady.blob],packReady.name,{type:'application/zip'});
    try{ if(navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:packReady.name}); return; } }catch(err){ if(err&&err.name==='AbortError') return; }
    await saveFile(packReady.name,packReady.blob); toast('Saved. Sharing files is not available here, so send it from your Files app'); } });

// ===================== keep data safe, quick start, reminders to send, the Tax page back =====================
// ---- keep data safe: ask the browser not to clear it, work offline once installed, nudge to install and back up ----
const isInstalled=()=>{ try{ return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true; }catch(_){ return false; } };
const onWeb=()=>typeof location!=='undefined'&&/github\.io$/.test(location.hostname||'');
try{ if(typeof navigator!=='undefined'&&navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{}); }catch(_){}
try{ if(onWeb()&&typeof navigator!=='undefined'&&'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{}); }catch(_){}
const hasRecords=()=>state.income.length||state.bookings.length||state.expenses.length||state.clients.length;
function safetyCards(){ const s=state.setup, out=[]; if(state.example) return '';
  if(onWeb()&&!isInstalled()&&!s._installSeen) out.push(`<div class="notice info"><b>Add Know Your Worth to your home screen</b> so your phone keeps your data safe and it works without signal. On iPhone, tap Share, then 'Add to Home Screen'. On Android, tap the menu (three dots), then 'Install app' or 'Add to Home screen'. <button class="btn small ghost" data-act="install-seen">Done</button></div>`);
  const days=s.lastBackup?Math.round((dt(todayStr())-dt(s.lastBackup))/864e5):null;
  if(hasRecords()&&(days==null||days>=14)) out.push(`<div class="notice warn"><b>Back up your data.</b> ${days==null?'You have not saved a backup yet':`Your last backup was ${days} days ago`}. Your records are only on this phone, so save a copy and keep it in Google Drive, iCloud or your email. <button class="btn small" data-act="backup-file">Save a backup file</button></div>`);
  return out.join(''); }
const vDiaryBeforeSafe=vDiary; vDiary=function(){ return safetyCards()+vDiaryBeforeSafe(); };

// ---- quick start: treatments and prices only, typical figures for the rest ----
const wizStepsBeforeQuick=wizSteps;
wizSteps=function(){ const st=wizStepsBeforeQuick(); return !wizFull&&state.setup.quickMode?st.filter(x=>['welcome','industry','pickTreat','quicklist'].includes(x.type)):st; };
const quickStepBeforeQuick=quickStep;
quickStep=function(st){ const r=quickStepBeforeQuick(st); if(!r||st.type!=='welcome') return r; const q=!!state.setup.quickMode;
  return {...r, body:r.body.replace('<b>About 10 minutes.</b> It helps to have your price list and your bills to hand.','<b>Choose how much to do now.</b> You can add the rest later.')+
    `<div class="choices" style="margin-top:12px"><button class="choice" data-act="wiz-mode" data-v="quick" aria-pressed="${q}">Quick start<small>About 2 minutes: what you do and what you charge. Typical costs are used until you change them</small></button><button class="choice" data-act="wiz-mode" data-v="full" aria-pressed="${!q}">Full set-up<small>About 10 minutes: your products, running costs, home outgoings and opening hours too</small></button></div>`}; };
const vPricesBeforeQuick=vPrices;
vPrices=function(){ const s=state.setup;
  if(s.quickMode&&!s._ohEdited&&!s._quickCosts&&typeof selInds==='function'){ s.overheads=overheadsForAll(selInds()); s._quickCosts=true; save(); }
  const h=vPricesBeforeQuick(); const note=s.quickMode&&!s._ohEdited&&state.treatments.length?`<div class="notice info"><b>You used quick start,</b> so your running costs are typical figures for your trade. Check them so your prices are right. <button class="btn small ghost" data-act="open-costs">Check my running costs</button></div>`:'';
  return safetyCards()+note+h; };

// ---- reminders to send for tomorrow, one tap each ----
function dueReminders(){ const tm=addDays(todayStr(),1); return state.bookings.filter(b=>b.date===tm&&b.status==='booked'&&!b.reminded).sort((a,b)=>a.time.localeCompare(b.time)); }
function remindersBlock(){ const due=dueReminders(); if(!due.length) return '';
  return `<span class="small" style="font-weight:600">Reminders to send for tomorrow</span><div class="list">${due.map(b=>{ const cl=clientById(b.clientId), msg=encodeURIComponent(reminderText(b)), wa=cl?waNumber(cl.phone):'', ph=cl&&cl.phone?String(cl.phone).replace(/\s/g,''):'';
    return `<div class="item" style="flex-wrap:wrap"><div class="grow"><p style="white-space:normal"><b>${fmtT(b.time)}</b> ${esc(cl?cl.name:'No name')}</p><p class="small muted">${esc(bookingLabel(b))}</p></div>
      ${wa?`<a class="btn small" style="text-decoration:none" href="https://wa.me/${wa}?text=${msg}" target="_blank" rel="noopener noreferrer" data-act="rem-sent" data-id="${b.id}">WhatsApp</a><a class="btn small ghost" style="text-decoration:none" href="sms:${esc(ph)}?&body=${msg}" data-act="rem-sent" data-id="${b.id}">Text</a>`:`<span class="small muted" style="flex-basis:100%">Add their mobile number under ${W().cust==='client'?'Clients':'Customers'}</span>`}</div>`; }).join('')}</div>`; }
const todayCardBeforeRem=todayCard;
todayCard=function(){ const h=todayCardBeforeRem(), r=remindersBlock(); if(!r) return h; const i=h.lastIndexOf('</article>'); return h.slice(0,i)+r+h.slice(i); };

// ---- the Tax page is back, with the tax pack; bills stay on Money ----
navGroups=navGroupsBeforeTax;
vMoney=vMoneyBeforePack;
vTaxYear=function(){ const h=vTaxYearBeforeBills(), a='<article class="card"><h3>For your tax return (Self Assessment)</h3>', i=h.indexOf(a); return i<0?h:h.slice(0,i)+packCard()+h.slice(i); };
const ukDate=x=>`${x.slice(8,10)}/${x.slice(5,7)}/${x.slice(0,4)}`;
const packCsvsBeforeApps=packCsvs;
// one list of every payment in and out, in the shape accounting apps import as a bank statement
packCsvs=function(ty){ const f=packCsvsBeforeApps(ty), {inc,exp}=packRows(ty);
  const rows=[...inc.map(x=>[x.date,+(+x.amount||0).toFixed(2),'',x.desc||'Takings',x.method||'','Turnover']),...exp.map(x=>[x.date,-(+x.amount||0).toFixed(2),x.supplier||'',x.supplier||'',f.names[x.id]||'',x.category||''])].sort((a,b)=>a[0].localeCompare(b[0]));
  return {...f,'transactions-for-apps.csv':csv([['Date','Amount','Payee','Description','Reference','Category'],...rows.map(r=>[ukDate(r[0]),...r.slice(1)])])}; };
const packChecksBeforePoa=packChecks;
packChecks=function(ty,sm){ const out=packChecksBeforePoa(ty,sm), bill=sm.parts.tax+sm.parts.ni;
  if(bill>1000) out.push(`Your tax and National Insurance come to more than £1,000, so HMRC will probably ask for payments on account: half of next year's bill in advance, on 31 January and 31 July.`);
  return out; };

document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, s=state.setup;
  if(a==='install-seen'){ s._installSeen=true; save(); render(); }
  else if(a==='wiz-mode'){ s.quickMode=el.dataset.v==='quick'; save(); render(); }
  else if(a==='open-costs'){ openSecs.add('p-costs'); render(); const n=document.querySelector('[data-sec="p-costs"]'); if(n) n.scrollIntoView({block:'start'}); }
  else if(a==='rem-sent'){ const b=state.bookings.find(x=>x.id===el.dataset.id); if(b){ b.reminded=true; save(); setTimeout(render,400); } } });

// ===================== the target as boxes, easy to take in at a glance =====================
function hoursNeeded(c,p){ const team=(state.setup.staff||[]).reduce((a,m)=>a+(+m.hours||0),0), open=openMinutesWeek()/60+team;
  const mix=c.treatments.filter(t=>(+t.perWeek||0)>0), list=mix.length?mix:c.treatments.filter(t=>!t.addon), w=t=>mix.length?(+t.perWeek||0):1;
  const tot=list.reduce((a,t)=>a+w(t),0)||1, avgH=list.reduce((a,t)=>a+w(t)*t.mins,0)/tot/60; return {need:p.perWeek*avgH, open, team}; }
const statBox=(label,value,sub,cls,id,ico)=>`<div class="stat${cls?' '+cls:''}"${id?` id="${id}"`:''}><span class="label">${ico?icoTile(ico):''}${label}</span><span class="value">${value}</span>${sub?`<span class="small muted">${sub}</span>`:''}</div>`;
// the set rates, so the percentage makes sense: they only apply to profit over the tax-free amount
function taxRates(profitMonth){ const R=RULES, yr=Math.max(0,profitMonth*12), sco=state.setup.region==='sco';
  const it=sco?'Scottish income tax (19% to 48%)':yr>R.higherStart?`${pc0(R.basic)} then ${pc0(R.higher)} income tax`:`${pc0(R.basic)} income tax`;
  const ni=yr>R.ni4UPL?`${pc0(R.ni4Main)} then ${pc0(R.ni4Upper)} National Insurance`:`${pc0(R.ni4Main)} National Insurance`;
  return `${it} and ${ni} on profit over ${gbp0(R.pa)}`; }
const pc0=v=>`${Math.round(v*100)}%`;
function taxBox(profitMonth){ const a=setAside(profitMonth);
  return statBox('Put aside for tax',a.all>0?pctTxt(a.all):'Nothing',a.all>0?`of all your profit, about ${gbp0(a.month)} a month. That is ${taxRates(profitMonth)}${a.loan>0?`, plus ${pctTxt(a.loan)} student loan`:''}.`:`Your profit is under the ${gbp0(RULES.pa)} tax-free amount at this level`,'','sl-tax','tax'); }
function targetBoxes(c){ const s=state.setup, T=W().many, anyPrice=c.treatments.some(t=>+t.price>0), p=anyPrice?c.planNow:c.planSug, tax=taxBox(profitHourOf(s)*fullHours(c));
  if(!(+s.takeHome>0)||!p) return `<div class="grid2">${tax}</div><p class="small muted">${!(+s.takeHome>0)?`Type what you want to take home to see how many ${T} you need to do.`:`Add your prices to see how many ${T} you need to do.`}</p>`;
  const tg=Math.ceil(p.target), h=hoursNeeded(c,p), over=h.open>0&&h.need>h.open, now=Math.round(c.bookingsMonth), more=tg-now;
  return `<div class="grid2">
    ${statBox(`${T[0].toUpperCase()+T.slice(1)} a month`,tg,`about ${Math.ceil(p.perWeek)} a week, ${Math.ceil(p.perDay)} a day`,'','','cal')}
    ${h.open>0?statBox('Hours a week',Math.round(h.need),over?`more than the ${nf(Math.round(h.open))} hours ${h.team>0?'you and your team work':'you are open'}`:`of the ${nf(Math.round(h.open))} hours ${h.team>0?'you and your team work':'you are open'}`,over?'warn':'','','hours'):''}
    ${c.bookingsMonth>0?statBox('You do now',`${now} a month`,more>0?`about ${more} more needed`:'that is enough',more>0?'':'ok','','chart'):''}
    ${tax}</div>
    ${over?`<div class="notice warn">That is more hours than you work. To get there you would need higher prices, longer hours or lower costs.</div>`:''}`; }
if(typeof document!=='undefined'&&document.head&&document.head.insertAdjacentHTML) document.head.insertAdjacentHTML('beforeend','<style>.stat.warn{background:var(--warn-soft)}.stat.warn .value{color:var(--warn)}.stat.ok .value{color:var(--ok)}</style>');
UNDOABLE.add('sl-sug');

// ===================== the look: greeting header and icon tiles =====================
const ICO={clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',wallet:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12.5h2M3 9h18"/>',cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',tax:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',hours:'<path d="M5 3h14M5 21h14M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/>'};
const icoTile=k=>ICO[k]?`<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">${ICO[k]}</svg></span>`:'';
const greet=()=>{ const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; };
const applyBrandBeforeHello=applyBrand;
applyBrand=function(){ applyBrandBeforeHello(); const h=typeof document!=='undefined'&&document.getElementById('brandhead'); if(!h) return;
  const b=state.setup.brand||{}, nm=b.businessName||'Know Your Worth', ini=nm.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  h.innerHTML=`<div class="hello"><span class="avatar">${b.logo?`<img src="${b.logo}" alt="">`:b.businessName?esc(ini):"£"}</span><div><small>${b.businessName?greet():"Welcome to"}</small><b>${esc(nm)}</b></div></div>`; };

// ===================== light or dark, her choice (or match the phone) =====================
const SUN='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', MOON='<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
function applyTheme(){ if(typeof document==='undefined'||!document.documentElement) return; const t=state.setup.theme, r=document.documentElement;
  if(r.dataset){ if(t==='light'||t==='dark') r.dataset.theme=t; else delete r.dataset.theme; }
  const b=document.getElementById&&document.getElementById('themebtn'); if(b&&b.setAttribute){ const dk=isDark(); b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${dk?SUN:MOON}</svg>`; b.setAttribute('aria-label',dk?'Switch to light mode':'Switch to dark mode'); } }
try{ const br=document.querySelector('header.top .brand'); if(br&&!document.getElementById('themebtn')){ br.insertAdjacentHTML('beforeend','<div class="row" id="hdr-right" style="gap:8px;flex-wrap:nowrap"></div>'); const hr=document.getElementById('hdr-right'), ex=document.getElementById('exflag'); if(ex) hr.appendChild(ex); hr.insertAdjacentHTML('beforeend','<button type="button" id="themebtn" class="themebtn" data-act="theme-toggle"></button>'); }
  document.head.insertAdjacentHTML('beforeend','<style>.themebtn{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--surface);border:1px solid var(--line);color:var(--ink);cursor:pointer;flex:none;padding:0}.themebtn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}</style>'); }catch(_){}
const applyBrandBeforeTheme=applyBrand;
applyBrand=function(){ applyTheme(); applyBrandBeforeTheme(); applyTheme(); };
try{ applyTheme(); if(window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{ if(!state.setup.theme||state.setup.theme==='auto'){ applyBrand(); render(); } }); }catch(_){}
const brandEditorBeforeTheme=brandEditor;
brandEditor=function(){ const h=brandEditorBeforeTheme(), a='<label class="field">Logo', i=h.indexOf(a), t=state.setup.theme||'auto'; if(i<0) return h;
  return h.slice(0,i)+`<label class="field">Light or dark<select id="br-theme" data-themesel="1">${[['auto','Match my phone'],['light','Light'],['dark','Dark']].map(([k,l])=>`<option value="${k}" ${t===k?'selected':''}>${l}</option>`).join('')}</select></label>`+h.slice(i); };
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('[data-act="theme-toggle"]'); if(!el) return; state.setup.theme=isDark()?'light':'dark'; save(); applyBrand(); render(); });
document.addEventListener('change',e=>{ const el=e.target; if(!el.dataset||!el.dataset.themesel) return; state.setup.theme=el.value; save(); applyBrand(); render(); });

// ===================== AI helper: a chat that can read and add to her records, with photos and files =====================
// It uses Claude through the page's 'sample' ability when opened as the Claude artifact. On the public web address
// there is no AI service yet, so the screen says so. shortcut: no AI on the web link, upgrade when the shared backend exists (phase 6).
let ai={open:false,msgs:[],files:[],busy:false,engine:undefined,undo:null};
async function aiEngine(){ if(ai.engine!==undefined) return ai.engine;
  try{ ai.engine=(typeof window!=='undefined'&&window.claude&&typeof window.claude.use==='function')?await window.claude.use('sample'):null; }catch(_){ ai.engine=null; } return ai.engine; }
const findTreat=n=>{ const q=String(n||'').toLowerCase().trim(); return state.treatments.find(t=>t.name.toLowerCase()===q)||state.treatments.find(t=>t.name.toLowerCase().includes(q)||q.includes(t.name.toLowerCase())); };
const findClient=n=>{ const q=String(n||'').toLowerCase().trim(); return q?state.clients.find(c=>c.name.toLowerCase()===q)||state.clients.find(c=>c.name.toLowerCase().includes(q)):null; };
const isoDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||''))?d:todayStr();
// what the AI can do in the app; each returns a short result it reads back
const AI_TOOLS=[
 {name:'app_summary',description:'Get the business overview: treatments with price, suggested price, minutes; running costs a month; hourly target; take-home target; this tax year money in, money out and profit; tax to put aside.',
  execute:()=>{ const c=compute(state), s=state.setup, ty=taxYearOf(todayStr()), sm=taxYearSummary(state,ty);
    return {business:(s.brand||{}).businessName||'', treatments:c.treatments.map(t=>({name:t.name,price:+t.price||null,suggested:t.suggested,breakEven:+t.minimum.toFixed(2),minutes:t.mins})), runningCostsMonth:Math.round(c.overheads), earnPerHourOnTop:c.profitRate, takeHomeTargetMonth:+s.takeHome||0,
      taxYear:tyLabel(ty), moneyIn:sm.income, moneyOut:sm.expenses, profit:sm.profit, estimatedTaxAndNI:Math.round(sm.tax), clients:state.clients.length}; }},
 {name:'list_bookings',description:'List bookings between two dates (YYYY-MM-DD).',inputSchema:{type:'object',properties:{from:{type:'string'},to:{type:'string'}}},
  execute:i=>state.bookings.filter(b=>b.date>=(i.from||todayStr())&&b.date<=(i.to||addDays(todayStr(),7))).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(b=>({date:b.date,time:b.time,treatment:bookingLabel(b),client:(clientById(b.clientId)||{}).name||'',price:+b.price,status:b.status}))},
 {name:'add_booking',description:'Add a booking. Treatment must be one of hers. Creates the client if new.',inputSchema:{type:'object',properties:{date:{type:'string'},time:{type:'string',description:'HH:MM 24-hour'},treatment:{type:'string'},client:{type:'string'}},required:['date','time','treatment']},
  execute:i=>{ const t=findTreat(i.treatment); if(!t) throw Error('No treatment called '+i.treatment); let cl=findClient(i.client); if(!cl&&i.client){ cl={id:uid(),name:String(i.client).trim(),patchTests:[]}; state.clients.push(cl); }
    const d={date:isoDate(i.date),time:/^\d{1,2}:\d{2}$/.test(i.time)?i.time.padStart(5,'0'):'10:00',staffId:'me',serviceId:t.id,addons:[]}; const b={id:uid(),...d,clientId:cl?cl.id:'',mins:bkMins(d),price:bkAutoPrice(d),deposit:0,notes:'Added by the AI helper',status:'booked'};
    const w=bkWarnings({...d,clientId:b.clientId}); state.bookings.push(b); return {added:`${t.name} on ${b.date} at ${b.time}${cl?' for '+cl.name:''}`,warnings:w}; }},
 {name:'add_money_out',description:'Record a business expense. If she attached a receipt photo, give its number (1 for the first attachment) as photo.',inputSchema:{type:'object',properties:{date:{type:'string'},who:{type:'string'},amount:{type:'number'},category:{type:'string',enum:CATEGORIES},photo:{type:'number'}},required:['amount','who']},
  execute:async i=>{ const e={id:uid(),date:isoDate(i.date),supplier:String(i.who||'').slice(0,80),amount:Math.abs(+i.amount||0),category:CATEGORIES.includes(i.category)?i.category:'Training and other costs',receiptId:null};
    const f=ai.files[(+i.photo||0)-1]; if(f&&/^image\//.test(f.type)){ try{ e.receiptId=uid(); await putReceipt(e.receiptId,await shrink(f.blob)); }catch(_){ e.receiptId=null; } }
    state.expenses.push(e); return {added:`${gbp(e.amount)} to ${e.supplier} on ${e.date} (${e.category})${e.receiptId?', with the photo':''}`}; }},
 {name:'add_money_in',description:'Record money coming in.',inputSchema:{type:'object',properties:{date:{type:'string'},amount:{type:'number'},what:{type:'string'},method:{type:'string',enum:['Card','Cash','Bank transfer','App payout']}},required:['amount']},
  execute:i=>{ const x={id:uid(),date:isoDate(i.date),desc:String(i.what||'Takings').slice(0,80),amount:Math.abs(+i.amount||0),method:i.method||'Card'}; state.income.push(x); return {added:`${gbp(x.amount)} in on ${x.date}`}; }},
 {name:'set_price',description:'Change what she charges for a treatment.',inputSchema:{type:'object',properties:{treatment:{type:'string'},price:{type:'number'}},required:['treatment','price']},
  execute:i=>{ const t=findTreat(i.treatment); if(!t) throw Error('No treatment called '+i.treatment); t.price=Math.max(0,+i.price||0); return {changed:`${t.name} is now ${gbp(t.price)}`}; }},
 {name:'remember_for_client',description:'Save a note to remember for a client next time, shown on their bookings.',inputSchema:{type:'object',properties:{client:{type:'string'},note:{type:'string'}},required:['client','note']},
  execute:i=>{ const c=findClient(i.client); if(!c) throw Error('No client called '+i.client); addReminder(c.id,i.note); return {saved:`For ${c.name}: ${i.note}`}; }}];
const AI_BRIEF=()=>`You are the helper inside Know Your Worth, a UK phone app for a self-employed beauty, hair or massage business. Today is ${todayStr()}. Use the tools to look things up and to make changes she asks for; do not invent figures. Before adding or changing anything she did not clearly ask for, ask first. Money is in pounds. Write in plain British English, short sentences, no jargon. Tax figures are estimates, not tax advice.`;
const aiFmt=t=>esc(t).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
function renderAi(){ const o=document.getElementById('overlay'); if(!ai.open){ if(o.dataset.ai){ o.hidden=true; delete o.dataset.ai; } return; } o.dataset.ai='1';
  const none=ai.engine===null, sugg=['How am I doing this tax year?','Add a £40 phone bill for today','What should I charge for my most popular treatment?','Read this receipt and add it'];
  o.innerHTML=`<div class="card aichat" style="max-width:560px;width:100%;height:min(92vh,760px);padding:0;gap:0;overflow:hidden">
    <div class="treat-head" style="padding:14px 16px;border-bottom:1px solid var(--line)"><div class="hello"><span class="avatar" style="width:36px;height:36px;font-size:.9rem">AI</span><div><b>Ask AI</b><small>Reads and adds to your records</small></div></div><button type="button" class="iconbtn" aria-label="Close" data-act="ai-close">✕</button></div>
    <div id="ai-msgs" style="flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px">
      ${none?`<div class="notice info"><b>The AI helper is not switched on here yet.</b> It works in the Claude version of the app now. On this web address it needs Know Your Worth's own AI service, which is coming in a later update.</div>`:''}
      ${!ai.msgs.length&&!none?`<p class="small muted">Ask about your prices, money or bookings, or ask it to add something. You can attach photos of receipts and invoices, or a spreadsheet.</p><div class="chips">${sugg.map(s=>`<button type="button" class="chip" data-act="ai-sugg" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>`:''}
      ${ai.msgs.map(m=>`<div class="aimsg ${m.role}">${m.files&&m.files.length?`<div class="small" style="opacity:.8">📎 ${m.files.map(esc).join(', ')}</div>`:''}${m.role==='assistant'?aiFmt(m.text||'…'):esc(m.text)}${m.err?`<div class="small" style="color:var(--bad)">${esc(m.err)}</div>`:''}</div>`).join('')}
      ${ai.undo&&!ai.busy?`<button type="button" class="btn small ghost" style="align-self:flex-start" data-act="ai-undo">Undo what the AI changed</button>`:''}</div>
    <div style="border-top:1px solid var(--line);padding:10px 12px;display:flex;flex-direction:column;gap:8px">
      ${ai.files.length?`<div class="chips">${ai.files.map((f,i)=>`<span class="chip" style="display:flex;gap:6px;align-items:center">${i+1}. ${esc(f.name.slice(0,24))}<button type="button" class="linkish" aria-label="Remove ${esc(f.name)}" data-act="ai-unfile" data-i="${i}">✕</button></span>`).join('')}</div>`:''}
      <div class="row" style="flex-wrap:nowrap;gap:8px;align-items:flex-end"><label class="themebtn" style="cursor:pointer" aria-label="Attach a photo or file"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.5l-8.5 8.5a5 5 0 0 1-7-7L14 5.5a3.5 3.5 0 0 1 5 5L10.5 19a2 2 0 0 1-3-3L15 8.5"/></svg><input type="file" multiple accept="image/*,.txt,.csv,.md,text/plain,text/csv" data-aifile="1" hidden ${none?'disabled':''}></label>
        <textarea id="ai-input" rows="1" placeholder="${none?'Not available here yet':'Ask or tell it something'}" style="flex:1;resize:none;max-height:120px" ${none?'disabled':''}></textarea>
        <button type="button" class="btn" style="min-height:40px;padding:8px 16px" data-act="ai-send" ${none||ai.busy?'disabled':''}>${ai.busy?'…':'Send'}</button></div></div></div>`;
  o.hidden=false; const m=document.getElementById('ai-msgs'); if(m) m.scrollTop=m.scrollHeight; }
async function aiSend(text){ text=String(text||'').trim(); if(!text||ai.busy) return; const eng=await aiEngine(); if(!eng){ renderAi(); return; }
  const files=ai.files.splice(0), imgs=files.filter(f=>/^image\//.test(f.type)), texts=files.filter(f=>!/^image\//.test(f.type));
  ai.files=files; // tools may attach these photos to an expense during this reply
  let content=text; texts.forEach(f=>{ content+=`\n\nAttached file "${f.name}":\n${f.text.slice(0,20000)}`; }); if(imgs.length) content+=`\n\n(${imgs.length} photo${imgs.length>1?'s':''} attached, numbered ${imgs.map((f,i)=>files.indexOf(f)+1).join(', ')}.)`;
  ai.msgs.push({role:'user',text,files:files.map(f=>f.name)}); const reply={role:'assistant',text:''}; ai.msgs.push(reply); ai.busy=true; const before=JSON.stringify(state); renderAi();
  const hist=ai.msgs.slice(0,-1).slice(-12).map((m,i,a)=>({role:m.role,content:i===a.length-1?content:(m.text||'…')})); while(hist.length>1&&hist[0].role!=='user') hist.shift(); hist[0]={...hist[0],content:AI_BRIEF()+'\n\n'+hist[0].content};
  try{ let images=[]; try{ const lim=eng.limits?await eng.limits():null; if(lim&&lim.images) images=imgs.map(f=>f.blob); }catch(_){}
    const r=await eng(hist,{cache:false,images,tools:AI_TOOLS,onText:({text:t})=>{ reply.text=t; const el=document.querySelector('#ai-msgs .aimsg.assistant:last-of-type'); if(el) el.innerHTML=aiFmt(t); }});
    reply.text=(r&&r.text)||reply.text||'Done.'; }
  catch(e){ reply.err=e&&e.code==='not_granted'?'The AI helper was not allowed. You can switch it on in this page\'s permissions.':e&&e.code==='rate_limited'?'Too many questions just now. Try again in a minute.':'Something went wrong. Try again.'; if(e&&e.text) reply.text=e.text; }
  ai.files=[]; ai.busy=false; if(JSON.stringify(state)!==before){ ai.undo=before; save(); render(); } renderAi(); }
document.addEventListener('click',async e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='ai-open'){ ai.open=true; renderAi(); await aiEngine(); renderAi(); const i=document.getElementById('ai-input'); if(i&&!i.disabled) i.focus(); }
  else if(a==='ai-close'){ ai.open=false; renderAi(); }
  else if(a==='ai-sugg'){ const i=document.getElementById('ai-input'); if(i){ i.value=el.dataset.v; i.focus(); } }
  else if(a==='ai-send'){ const i=document.getElementById('ai-input'); aiSend(i&&i.value); }
  else if(a==='ai-unfile'){ ai.files.splice(+el.dataset.i,1); renderAi(); }
  else if(a==='ai-undo'&&ai.undo){ state=JSON.parse(ai.undo); ai.undo=null; save(); render(); renderAi(); toast('Put back'); } });
document.addEventListener('keydown',e=>{ if(e.target&&e.target.id==='ai-input'&&e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); aiSend(e.target.value); } });
document.addEventListener('change',async e=>{ const el=e.target; if(!el.dataset||!el.dataset.aifile||!el.files) return;
  for(const f of el.files){ if(ai.files.length>=6) break; if(/^image\//.test(f.type)) ai.files.push({name:f.name,type:f.type,blob:f}); else if(f.size<500000) ai.files.push({name:f.name,type:f.type||'text/plain',text:await f.text()}); else toast(f.name+' is too big'); }
  renderAi(); });
try{ const hr=document.getElementById('hdr-right'); if(hr&&!document.getElementById('aibtn')){ hr.insertAdjacentHTML('afterbegin','<button type="button" id="aibtn" class="themebtn" data-act="ai-open" aria-label="Ask AI"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg></button>'); }
  document.head.insertAdjacentHTML('beforeend','<style>.aichat{display:flex;flex-direction:column}.aimsg{max-width:85%;padding:10px 14px;border-radius:18px;line-height:1.45;word-wrap:break-word}.aimsg.user{align-self:flex-end;background:var(--accent);color:var(--accent-ink);border-bottom-right-radius:6px}.aimsg.assistant{align-self:flex-start;background:var(--sunk);border-bottom-left-radius:6px}#brandhead{flex:1;min-width:0}.hello>div{min-width:0}.hello small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#exflag{white-space:nowrap}@media (max-width:420px){#exflag{font-size:.72rem;padding:4px 8px}}</style>'); }catch(_){}

// ===================== marketing: plan posts, write them, share in one tap =====================
const posts=()=>state.posts||(state.posts=[]);
const mktSet=()=>({perWeek:3,days:[1,3,5],...(state.setup.mkt||{})}); // days: 0 Monday .. 6 Sunday
let mkOpen=null;
const TAGS={beauty:'#beauty #beautysalon #selfcare #nails #lashes',therapy:'#beautytherapist #facials #skincare #selfcare',hair:'#hair #hairstylist #hairsalon #balayage',barber:'#barber #barbershop #fade #mensgrooming',laser:'#laserhairremoval #smoothskin #beautyclinic',massage:'#massage #massagetherapy #relax #wellbeing'};
const mkTags=t=>{ const inds=(typeof selInds==='function'?selInds():[]).filter(k=>TAGS[k]); const own=t?'#'+t.name.toLowerCase().replace(/[^a-z0-9]/g,''):''; return [own,...inds.map(k=>TAGS[k])].filter(Boolean).join(' ').split(' ').filter((x,i,a)=>a.indexOf(x)===i).slice(0,9).join(' '); };
const bizName=()=>(state.setup.brand||{}).businessName||'';
const price=t=>money(+t.price||compute(state).treatments.find(x=>x.id===t.id).suggested);
// the quietest open day in the next week, for 'gaps' posts
function quietDay(from){ let best=null; for(let i=1;i<=7;i++){ const x=addDays(from,i), free=(typeof freeTimes==='function'?freeTimes(x):[]).reduce((a,[s,e])=>a+(e-s),0); if(free>0&&(!best||free>best.free)) best={x,free}; } return best&&best.x; }
const SEASONS=[[2,14,"Valentine's Day",'Treat yourself or someone special this Valentine\'s'],[3,0,"Mother's Day",'Gift vouchers for Mother\'s Day'],[10,31,'Halloween','Spooky season looks'],[11,28,'Black Friday','Black Friday treat'],[12,25,'Christmas','Get party ready for Christmas'],[6,21,'Summer','Get summer ready']];
function seasonFor(date){ const m=+date.slice(5,7), d=+date.slice(8,10); return SEASONS.find(([sm,sd])=>sm===m&&(sd===0||d<=sd&&sd-d<=12)); }
const TYPES=['Show your work','Price list','Quiet day gaps','Tip','Behind the scenes','Ask for reviews','Meet me'];
function mkIdea(type,date,k){ const ts=state.treatments.filter(t=>!t.addon), t=ts.length?ts[k%ts.length]:null, b=bizName(), qd=quietDay(date), cust=W().cust, many=W().many;
  const end=`\n\nBook via the link in my bio${b?` · ${b}`:''}`;
  const C={
    'Show your work':[t?`Show off a ${t.name}`:'Show off your work', t?`Loving how this ${t.name} turned out ✨ ${price(t)}, about ${t.clientMin} minutes.${end}`:`A little of what I've been up to this week ✨${end}`, t],
    'Price list':['Share your price list',`Here's my price list for ${new Date(date).toLocaleDateString('en-GB',{month:'long'})}. Prices include everything, no surprises.${end}`,null],
    'Quiet day gaps':[qd?`Fill your gaps on ${fmtDay(qd)}`:'Last-minute slots',qd?`I've got space on ${fmtDay(qd)}! Message me or book online to grab a slot 💫${end}`:`I've got a few last-minute slots this week. Message me to grab one 💫${end}`,t],
    'Tip':[t?`Care tip: ${t.name}`:'A care tip',t?`Top tip: how to make your ${t.name} last longer. Keep it simple, gentle and book your next one before it grows out.${end}`:`Top tip for looking after yourself between ${many}.${end}`,t],
    'Behind the scenes':['Behind the scenes',`A peek behind the scenes. Everything is cleaned and set up fresh for every ${cust} 🧼${end}`,null],
    'Ask for reviews':['Ask for reviews',`If you've been to see me, I'd love a quick review. It really helps a small business like mine 💕${end}`,null],
    'Meet me':['Introduce yourself',`Hello! I'm ${b||'the face behind the work'}. Here's a little about me and why I love what I do.${end}`,null]};
  const s=seasonFor(date); if(s&&!posts().some(p=>p.idea===s[2]&&p.date.slice(0,4)===date.slice(0,4))) return {type:'Seasonal',idea:s[2],caption:`${s[3]} 🎁${t?` ${t.name} ${price(t)}.`:''}${end}\n\n${mkTags(t)}`,treat:t?t.id:''};
  const [idea,cap,tt]=C[type]; return {type,idea,caption:cap+'\n\n'+mkTags(tt),treat:tt?tt.id:''}; }
// fill the next two weeks with posts on her chosen days, without doubling up on days already planned
function planWeeks(n){ const ms=mktSet(), have=new Set(posts().map(p=>p.date)); let k=posts().length, added=0;
  for(let i=0;i<7*(n||2);i++){ const x=addDays(todayStr(),i); if(!ms.days.includes(dayIdx(x))||have.has(x)) continue; const type=TYPES[k%TYPES.length];
    posts().push({id:uid(),date:x,...mkIdea(type,x,k),photo:'',done:false}); k++; added++; } return added; }
const postsToday=()=>posts().filter(p=>!p.done&&p.date<=todayStr());
function postCard(p){ const open=mkOpen===p.id, past=p.date<todayStr()&&!p.done;
  if(!open) return `<button class="rowbtn" data-act="mk-open" data-id="${p.id}"><span class="grow"><b>${esc(p.idea)}</b><small>${fmtDay(p.date)}${p.date===todayStr()?' · Today':''} · ${esc(p.type)}</small></span>${p.done?'<span class="pill ok">Posted</span>':past?'<span class="pill warn">Not posted</span>':p.photo?'<span class="pill info">Photo added</span>':''}</button>`;
  return `<article class="card"><div class="treat-head"><div><h3>${esc(p.idea)}</h3><p class="small muted">${fmtDay(p.date)} · ${esc(p.type)}</p></div><button class="iconbtn" aria-label="Close" data-act="mk-open" data-id="">✕</button></div>
    <div class="row" style="align-items:flex-start;flex-wrap:nowrap;gap:12px">${p.photo?`<img class="thumb" alt="Post picture" data-receipt="${p.photo}" style="width:96px;height:96px;border-radius:14px;object-fit:cover">`:''}
      <div class="stack" style="gap:8px;flex:1"><label class="btn small ghost" style="cursor:pointer;text-align:center">${p.photo?'Change photo':'Add a photo'}<input type="file" accept="image/*" hidden data-mkphoto="${p.id}"></label><button class="btn small ghost" data-act="mk-pl" data-id="${p.id}">Use my price list</button></div></div>
    <label class="field">Caption<textarea id="mk-cap-${p.id}" rows="7" data-mkcap="${p.id}">${esc(p.caption)}</textarea></label>
    ${ai.engine?`<button class="btn small ghost" data-act="mk-ai" data-id="${p.id}">Write it for me with AI</button>`:''}
    <div class="row"><button class="btn" data-act="mk-share" data-id="${p.id}">Share to Instagram, Facebook…</button><button class="btn small ghost" data-act="mk-done" data-id="${p.id}">${p.done?'Not posted yet':'Mark as posted'}</button></div>
    <button class="btn small ghost" style="align-self:flex-start" data-act="mk-del" data-id="${p.id}">Delete this post</button></article>`; }
function vMarketing(){ const ms=mktSet(), up=posts().filter(p=>!p.done||p.date>=todayStr()).sort((a,b)=>a.date.localeCompare(b.date)), done=posts().filter(p=>p.done).length;
  return `<section class="stack"><div><h2>Marketing</h2><p class="muted">Plan your posts, get them written, and share in one tap.</p></div>
    <article class="card"><h3>Your plan</h3>
      <span class="small" style="font-weight:600">Post on</span><div class="chips">${DAYS3.map((d,i)=>`<button class="chip" data-act="mk-day" data-v="${i}" aria-pressed="${ms.days.includes(i)}">${d}</button>`).join('')}</div>
      <button class="btn" data-act="mk-plan">Plan my next 2 weeks</button>
      <p class="small muted">Each post gets an idea and a caption with your prices. Add a photo, then share it when the day comes. The Diary reminds you on the day.</p></article>
    ${up.length?`<div class="stack" style="gap:8px">${up.map(postCard).join('')}</div>`:'<p class="small muted">No posts planned yet.</p>'}
    ${done?`<p class="small muted">${done} posted so far.</p>`:''}</section>`; }
async function mkShare(p){ const cap=p.caption||''; try{ await navigator.clipboard.writeText(cap); }catch(_){}
  let blob=null; if(p.photo){ try{ blob=await getReceipt(p.photo); }catch(_){} }
  if(blob){ const f=new File([blob],'post.jpg',{type:blob.type||'image/jpeg'}); try{ if(navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],text:cap}); toast('Caption copied too: paste it in if it is missing'); return; } }catch(e){ if(e&&e.name==='AbortError') return; } await saveFile('post.jpg',blob); toast('Photo saved and caption copied. Post it from Instagram or Facebook'); return; }
  try{ if(navigator.share){ await navigator.share({text:cap}); return; } }catch(e){ if(e&&e.name==='AbortError') return; } toast('Caption copied. Paste it into your post'); }
async function mkAi(p){ const eng=await aiEngine(); if(!eng) return; const t=state.treatments.find(x=>x.id===p.treat), b=bizName();
  const prompt=`Write an Instagram and Facebook caption for ${b||'a small business'}, a self-employed ${(typeof selInds==='function'?selInds():[]).join(', ')||'beauty'} business in the UK. Post idea: ${p.idea} (${p.type}). ${t?`Treatment: ${t.name}, ${price(t)}, about ${t.clientMin} minutes. `:''}Prices: ${state.treatments.filter(x=>!x.addon).slice(0,8).map(x=>x.name+' '+price(x)).join(', ')}. Under 80 words, warm and natural, British English, at most two emojis, end by saying to book via the link in the bio, then 5 to 8 relevant hashtags on a new line. Reply with the caption only. Current draft:\n${p.caption}`;
  const box=document.getElementById('mk-cap-'+p.id); if(box) box.value='Writing…';
  try{ const r=await eng(prompt,{cache:false,onText:({text})=>{ const b2=document.getElementById('mk-cap-'+p.id); if(b2) b2.value=text; }}); p.caption=(r&&r.text||p.caption).trim(); save(); render(); }catch(e){ toast(e&&e.code==='not_granted'?'The AI helper was not allowed':'Could not write it just now'); render(); } }
document.addEventListener('click',async e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, p=posts().find(x=>x.id===el.dataset.id);
  if(a==='mk-open'){ mkOpen=el.dataset.id||null; if(mkOpen) await aiEngine(); render(); }
  else if(a==='mk-day'){ const ms=mktSet(), i=+el.dataset.v; state.setup.mkt={...ms,days:ms.days.includes(i)?ms.days.filter(x=>x!==i):[...ms.days,i].sort()}; save(); render(); }
  else if(a==='mk-plan'){ const n=planWeeks(2); save(); render(); toast(n?`${n} posts planned`:'Your next 2 weeks are already planned'); }
  else if(a==='mk-done'&&p){ p.done=!p.done; save(); render(); }
  else if(a==='mk-del'&&p){ state.posts=posts().filter(x=>x!==p); mkOpen=null; save(); render(); }
  else if(a==='mk-share'&&p){ mkShare(p); }
  else if(a==='mk-ai'&&p){ mkAi(p); }
  else if(a==='mk-pl'&&p){ try{ const cv=plCanvases()[0]; const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.9)); const id=uid(); await putReceipt(id,blob); p.photo=id; save(); render(); toast('Price list picture added'); }catch(_){ toast('Could not make the price list picture'); } }
  else if(a==='mk-goto'){ view='marketing'; mkOpen=el.dataset.id||null; render(); window.scrollTo(0,0); } });
document.addEventListener('change',async e=>{ const el=e.target, d=el.dataset||{};
  if(d.mkcap){ const p=posts().find(x=>x.id===d.mkcap); if(p){ p.caption=el.value; save(); } }
  else if(d.mkphoto&&el.files&&el.files[0]){ const p=posts().find(x=>x.id===d.mkphoto); if(!p) return; try{ const id=uid(); await putReceipt(id,await shrink(el.files[0])); p.photo=id; save(); render(); }catch(_){ toast('Could not save the photo on this phone'); } } });
UNDOABLE.add('mk-del'); UNDOABLE.add('mk-plan');
// Clients and Marketing share the bottom button
const navGroupsBeforeMkt=navGroups;
navGroups=function(){ return navGroupsBeforeMkt().map(g=>g.key==='clients'?{...g,views:[...g.views,['marketing','Marketing']]}:g); };
const renderBeforeMkt=render;
render=function(){ if(view==='marketing'){ renderTabs(); document.getElementById('main').innerHTML=vMarketing(); hydrateThumbs(); afterRender(); return; } return renderBeforeMkt(); };
// the Diary's Today card says when a post is due
const todayCardBeforeMkt=todayCard;
todayCard=function(){ const h=todayCardBeforeMkt(), due=postsToday(); if(!due.length) return h; const i=h.lastIndexOf('</article>');
  return h.slice(0,i)+`<span class="small" style="font-weight:600">Post today</span><div class="list">${due.map(p=>`<div class="item"><div class="grow"><p><b>${esc(p.idea)}</b></p><p class="small muted">${p.date<todayStr()?'Was due '+fmtDay(p.date):'Today'}</p></div><button class="btn small" data-act="mk-goto" data-id="${p.id}">Open</button></div>`).join('')}</div>`+h.slice(i); };

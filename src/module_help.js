// ===================== MODULE: plain lists and the how-to guide =====================
// No box keeps a number below its minimum or above its maximum, whatever is typed. Capture phase, so it runs before every other change handler.
document.addEventListener('change', e=>{ const el=e.target; if(!el||el.type!=='number'||el.value==='') return;
  const v=+el.value; if(el.min!==''&&v<+el.min) el.value=el.min; else if(el.max!==''&&v>+el.max) el.value=el.max; }, true);

// Fold-out sections stay open through a redraw, however many are open at once (the older single 'moreOpen' still works for jumping to one).
const openSecs=new Set(), isOpen=k=>moreOpen===k||openSecs.has(k);
document.addEventListener('toggle', e=>{ const d=e.target; if(d&&d.dataset&&d.dataset.sec){ if(d.open) openSecs.add(d.dataset.sec); else openSecs.delete(d.dataset.sec); } }, true);

// ---- running costs as a plain list (set-up, the Prices screen and More all show this one list) ----
const PERIOD=[['weekly','a week'],['monthly','a month'],['yearly','a year']];
const REPLACE=[[0.5,'6 months'],[1,'12 months'],[2,'2 years'],[3,'3 years'],[5,'5 years'],[10,'10 years']];
const addMonths=(x,n)=>{ const d=new Date(+x.slice(0,4),+x.slice(5,7)-1+n,+x.slice(8,10)); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
function costRow(o){ const one=o.group==='equipment';
  return `<div class="item" style="flex-wrap:wrap;gap:6px 8px">
    ${o.custom?`<input id="oh-name-${o.id}" aria-label="What is it?" placeholder="What is it?" value="${esc(o.name)}" data-oh="${o.id}" data-f="name" style="flex:1 1 60%">`:`<label for="oh-amt-${o.id}" style="flex:1 1 60%;font-weight:600">${esc(o.name)}</label>`}
    <button class="iconbtn" aria-label="I do not pay for ${esc(o.name||'this')}. Remove it" data-act="oh-del" data-id="${o.id}">✕</button>
    <span class="money-in" style="flex:0 0 120px"><input id="oh-amt-${o.id}" type="number" inputmode="decimal" min="0" step="1" value="${esc(o.amount)}" aria-label="${esc(o.name||'Cost')}, amount" data-oh="${o.id}" data-f="amount"></span>
    ${one?`<span class="small muted">to buy</span><div class="fields" style="flex-basis:100%"><label class="field">Date bought<input id="oh-bought-${o.id}" type="date" value="${esc(o.bought||'')}" data-oh="${o.id}" data-f="bought"></label><label class="field">Replace it every<select id="oh-yrs-${o.id}" data-oh="${o.id}" data-f="years">${REPLACE.map(([v,l])=>`<option value="${v}" ${+o.years===v?'selected':''}>${l}</option>`).join('')}${REPLACE.some(([v])=>v===+o.years)?'':`<option value="${esc(o.years)}" selected>${nf(+o.years)} years</option>`}</select></label></div>${+o.amount>0?`<span class="small muted" style="flex-basis:100%">That is ${gbp(+o.amount/(Math.max(0.5,+o.years||3)*12))} a month${o.bought?`. Replace by ${fmtDay(addMonths(o.bought,Math.round((+o.years||3)*12)))} ${addMonths(o.bought,Math.round((+o.years||3)*12)).slice(0,4)}`:''}</span>`:''}`:`<select aria-label="How often you pay for ${esc(o.name||'this')}" data-ohp="${o.id}" style="flex:0 0 120px">${PERIOD.map(([k,l])=>`<option value="${k}" ${o.group===k?'selected':''}>${l}</option>`).join('')}</select>`}
    ${billLine(o)}
  </div>`; }
// how the monthly figure is made up, in words
function costWorking(s){ const sum=g=>(s.overheads||[]).filter(o=>o.group===g).reduce((a,o)=>a+(+o.amount||0),0), w=sum('weekly'), m=sum('monthly'), y=sum('yearly'), e=sum('equipment');
  const parts=[w?`${gbp0(w)} a week`:'', m?`${gbp0(m)} a month`:'', y?`${gbp0(y)} a year`:''].filter(Boolean), reg=parts.join(', ').replace(/, ([^,]*)$/,' and $1');
  return reg||e ? `That is ${reg||'nothing regular'}${e?`, plus ${gbp0(e)} of one-offs divided over how long they last`:''}.` : 'Nothing added yet.'; }
function costList(){ const s=state.setup, list=s.overheads||[];
  return `<div class="stack" style="gap:6px"><h3 style="font-size:1rem">What you pay regularly</h3>
      <div class="list">${list.filter(o=>o.group!=='equipment').map(costRow).join('')}</div>
      <button class="btn small ghost" data-act="costq-add" data-g="monthly">+ Add another cost</button></div>
    <div class="stack" style="gap:6px"><h3 style="font-size:1rem">One-offs</h3><p class="small muted">Things you buy once and keep using, like a lamp, a couch or a trolley.</p>
      <div class="list">${list.filter(o=>o.group==='equipment').map(costRow).join('')}</div>
      <button class="btn small ghost" data-act="costq-add" data-g="equipment">+ Add a one-off</button></div>
    <p class="live" data-live="costs">That comes to about <span class="num">${gbp0(overheadsMonth(s))}</span> a month.</p>
    <p class="small muted" data-live="costwork">${costWorking(s)}</p>`; }
// the line under 'Your numbers' on Prices: what her numbers do to her prices, right where she is typing
function numbersLine(c){ const up=c.treatments.filter(t=>t.flag==='below'||t.flag==='under').length;
  return !c.treatments.some(t=>+t.price>0) ? 'Your suggested prices are in the list below.'
    : up ? `With these numbers, ${up} of your prices ${up===1?'is':'are'} lower than suggested. They are listed at the top of this page.` : 'With these numbers, your prices cover your costs and what you want to earn.'; }
function liveNumbers(){ const s=state.setup;
  document.querySelectorAll('[data-live="costs"]').forEach(n=>{ n.innerHTML=`That comes to about <span class="num">${gbp0(overheadsMonth(s))}</span> a month.`; });
  document.querySelectorAll('[data-live="costwork"]').forEach(n=>{ n.textContent=costWorking(s); });
  const n=document.getElementById('pn-live'); if(n) n.textContent=numbersLine(compute(state)); }
// figures move as she types, without waiting for her to leave the box (the full redraw still happens when she does)
document.addEventListener('input', e=>{ const el=e.target, d=(el&&el.dataset)||{};
  if(d.oh&&d.f==='amount'){ const o=(state.setup.overheads||[]).find(x=>x.id===d.oh); if(o){ o.amount=Math.max(0,+el.value||0); liveNumbers(); } }
  else if(d.set==='profitHour'&&document.getElementById('pn-live')){ state.setup.profitHour=Math.max(0,+el.value||0); liveNumbers(); } });

// ---- small helpers the screens share ----
const payDefault=()=>(+state.setup.cardPct||+state.setup.cardFixed)?'Card':'Cash';       // how she is usually paid, from her card fee answer
const PATCH_PILL={ok:['ok','Patch test OK'],soon:['info','Patch tested, wait 48 hours'],expired:['warn','Patch test out of date'],reaction:['bad','Reacted to patch test']};
let delArmed=false;                                                                      // 'Delete' on a sheet has been tapped once
const closeSheet=()=>{ bkDraft=null; holDraft=null; editDraft=null; delArmed=false; document.getElementById('overlay').hidden=true; };
// Hands a file to the phone: Claude's own Save box when opened inside Claude, otherwise an ordinary download.
async function saveFile(name,blob){ const dl=await plClaudeSave(); if(dl){ try{ await dl.save({filename:name,data:blob}); return true; }catch(e){ return false; } }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),5000); return true; }
async function backupFile(){ const copy=JSON.parse(JSON.stringify(state));
  if((document.getElementById('bk-photos')||{}).checked){ copy._receipts={}; for(const e of state.expenses) if(e.receiptId){ try{ const b=await getReceipt(e.receiptId); if(b) copy._receipts[e.receiptId]=await blobToDataURL(b); }catch(_){} } }
  if(await saveFile(`know-your-worth-backup-${todayStr()}.json`,new Blob([JSON.stringify(copy)],{type:'application/json'}))){ state.setup.lastBackup=todayStr(); save(); render(); toast('Backup file saved. Keep it somewhere safe'); } }

document.addEventListener('click', e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, s=state.setup;
  if(a==='bk-del-ask'||a==='ed-del-ask'){ delArmed=true; a==='bk-del-ask'?renderBkForm():renderEdit(); }                   // first tap only arms it
  else if(a==='bk-del'||a==='del-income'||a==='del-expense'){ closeSheet(); }                                             // the entry is gone, so shut its sheet
  else if(a==='bk-close'||a==='bk-edit'||a==='bk-new'||a==='inc-edit'||a==='exp-edit'){ if(delArmed){ delArmed=false; if(a!=='bk-close'){ bkDraft?renderBkForm():renderEdit(); } } }
  else if(a==='bk-reopen'){ const b=state.bookings.find(x=>x.id===el.dataset.id); if(!b) return; if(b.status==='done') useStock(b,-1);
    state.income=state.income.filter(x=>x.bookingId!==b.id); b.status='booked'; delete b.method; save(); render(); toast('Put back as booked'); }
  else if(a==='wiz-exit'){ view='prices'; render(); window.scrollTo(0,0); }
  else if(a==='next-done'){ s._seenNext=true; save(); render(); }
  else if(a==='prod-go'){ view='stock'; openProd=el.dataset.id; render(); window.scrollTo(0,0); const n=document.getElementById('pc-'+el.dataset.id); if(n){ n.focus(); n.select(); } }
  else if(a==='add-treat'){ const t=state.treatments[state.treatments.length-1], n=t&&document.getElementById('tn-'+t.id); if(n){ n.focus(); n.select(); } }
  else if(a==='add-product'){ const p=state.products[state.products.length-1], n=p&&document.getElementById('pn-'+p.id); if(n){ n.focus(); n.select(); } }
  else if(a==='backup-file'){ backupFile(); }
  else if(a==='backup'){ setTimeout(()=>{ if(view==='more') render(); },500); }                                           // so the row says when the last backup was
  else if(a==='guide-go'){ const [v,k]=el.dataset.go.split(':');
    if(v==='wizard'){ wizFull=false; step=1; view='wizard'; } else { view=v; if(k){ moreOpen=k; openSecs.add(k); } }
    render(); window.scrollTo(0,0); const d=k&&document.querySelector(`details[data-sec="${k}"]`); if(d) d.scrollIntoView({block:'start'}); }
});
document.addEventListener('submit', ()=>{ delArmed=false; });
document.addEventListener('change', async e=>{ const el=e.target, d=(el&&el.dataset)||{}, s=state.setup;
  if(d.ohp){ const o=(s.overheads||[]).find(x=>x.id===d.ohp); if(o){ o.group=el.value; s._ohEdited=true; save(); render(); } }
  else if(d.setbool==='trackStock'&&el.checked&&!s._stockSet){ state.products.forEach(p=>{ p.inStock=0; p.reorderAt=0; }); s._stockSet=true; save(); render(); toast('Now type in how many of each you have'); } // the counts it came with were made up
  else if(d.restorefile&&el.files&&el.files[0]){ const text=await el.files[0].text(); document.querySelector('[data-act="restore-open"]').click();
    document.getElementById('restorebox').value=text; document.querySelector('[data-act="restore-do"]').click(); } });
// Enter in an 'add' box presses the button beside it
document.addEventListener('keydown', e=>{ const el=e.target; if(e.key!=='Enter'||!el||el.tagName!=='INPUT'||el.form) return;
  const b=el.nextElementSibling; if(b&&b.tagName==='BUTTON'&&b.dataset.act&&/add|new/.test(b.dataset.act)){ e.preventDefault(); b.click(); } });

// ---- How to do everything. Names in 'single quotes' are the words on the buttons, so keep them exact. The third item is where 'Take me there' goes. ----
const GUIDE=[
['Getting started',[
  ['Set the app up',"Answer the short questions when you first open it. It takes about ten minutes. To do them again, tap More, then 'Answer the questions again'. You can leave them at any time.",'more:questions'],
  ['Try it with made-up figures',"On the very first screen, tap 'Try it with example figures'."],
  ['Find your way around',"The five buttons along the bottom are Prices, Diary, Money, Clients and More. Prices and Money have extra tabs along the top."]]],
['Prices',[
  ['See what to charge',"Tap Prices. Each treatment shows your price and a label: Good, Under-priced or Below cost. Tap a treatment to see what it costs you and what you keep.",'prices'],
  ['Use a suggested price',"On Prices, the box at the top lists the prices to put up. Tap the Use button beside one, or 'Use all the suggested prices'. An Undo button shows for a few seconds.",'prices'],
  ['Change a price, a time or how many you do',"Tap Prices, then Treatments at the top, then the treatment. Change 'Your price', 'Minutes with the client' or 'How many a week', then tap Done.",'treatments'],
  ['Add or remove a treatment',"Tap Prices, then Treatments. The button at the bottom adds your own. To remove one, open it and tap the Remove button.",'treatments'],
  ['Say which products a treatment uses',"Open the treatment under Treatments. Under 'Products it uses', pick a product and tap Add. Then say how many uses you get from one bottle or pack.",'treatments'],
  ['Change what a product costs',"Tap Prices, then Products, then the product. Change 'What one costs you' and tap Done. The button at the bottom adds a new product.",'stock'],
  ['Keep count of your stock',"On Products, tick 'Keep count of how many I have left, and tell me when to reorder'. Type in how many of each you have, then use the minus and plus buttons as you use things up or buy more.",'stock'],
  ['Change your running costs',"On Prices, under 'Your numbers', tap 'Running costs'. Type over any figure, choose whether you pay it by the week, month or year, and tap the cross on anything you do not pay. Tap '+ Add your own business cost' for anything missing. The same list is under More.",'prices'],
  ['Change what you earn an hour',"On Prices, under 'Your numbers', type a new amount. Your suggested prices change to match.",'prices'],
  ['Set a monthly target',"On Prices, under 'Your target', type what you want to take home each month. It tells you how many treatments that takes. It does not change your prices.",'prices'],
  ['Make a price list picture',"On Prices, tap 'Make my price list'. Pick a design and a shape (Square or Portrait for an Instagram post). Add a logo or photo, change the wording and colours, and untick anything you do not want on it. A long list is split over two or more pictures to post together. Then tap 'Save or share'.",'prices'],
  ['See how the prices are worked out',"Near the bottom of Prices, tap 'How we worked this out'.",'prices']]],
['Diary',[
  ['Add a booking',"Tap Diary, then '+ Booking' on the day. Pick the treatment, the time and the client, then tap 'Save booking'. For someone new, leave Client on 'New client (type below)' and type their name.",'diary'],
  ['Understand the warnings',"The booking form warns you if you are closed, on a break, on holiday or double-booked, or if the client needs a patch test. Read it, then tap 'Save anyway' if you still want the booking.",'diary'],
  ['See another week',"Use the arrows at the top of the diary. 'This week' brings you back.",'diary'],
  ['Mark a booking as paid',"On the booking, next to 'Paid by', tap Card, Cash or Transfer. It is added to your money in for you. Tapped the wrong one? Tap 'Undo this' on the booking.",'diary'],
  ['Record a no-show or a cancellation',"On the booking, tap No-show or Cancelled. A no-show keeps any deposit. No-show only appears once the day has come.",'diary'],
  ['Change or delete a booking',"Tap Change on the booking. To delete it, tap 'Delete this booking' at the bottom of that sheet, then tap it again.",'diary'],
  ['See the whole month',"At the top of the Diary, tap Month. Each day shows how many bookings it has. Tap a day to see them. Tap Week to go back.",'diary'],
  ['Put a booking in your phone calendar',"On the booking, tap Calendar, then 'Google Calendar' or 'Apple or other calendar'. Your phone then reminds you like any other event.",'diary'],
  ['Say how many uses you get from a product',"Tap Prices, then Treatments, then the treatment. Under each product, change 'How many uses do you get from' it, then tap Done. The cost of each treatment updates straight away. You can also do this in the set-up questions.",'treatments'],
  ['Reorder a product quickly',"Tap Prices, then Products, then the product. Paste the web page you buy it from into 'Link to order it'. An Order button then shows next to it, so you can reorder in one tap.",'stock'],
  ['Run a group class',"Tap Prices, then the treatment. Type how many places it has, how many usually come, and when it runs each week. The price is for each person. Book each person into the same time in the Diary, and clients can join it online until it is full.",'treatments'],
  ['Do your end of day check-in',"Tap Diary, then 'End of day check-in' in the Today card. Mark who paid or did not come, add anyone who was not in the diary, tap + for each pack or bottle you finished, and add anything to remember. Tap 'Save my day'.",'diary'],
  ['Remember something about a client',"Open the client and type it under 'For next time', for example 'wants green hair dye next time'. It shows on their bookings in the diary until you tick it off. You can also add it in the end of day check-in.",'clients'],
  ['Get told when to reorder',"Anything at its reorder level, or that you finished or ran out of, shows under 'Time to reorder' at the top of the Diary, with an Order button if it has a link. Tap 'Got it' once you have bought more.",'stock'],
  ['Save a bill or invoice',"Tap Money. Under 'Bills each month', tap the month and pick the photo of the bill. It is saved in Money out, dated in that month. You can also tap 'Add an invoice' beside any running cost.",'money'],
  ['Set your prices with the slider',"On Prices, under 'Your prices and target', slide right to earn more each hour on top of your costs, or type what you want to take home each month. The two move together. All the way left just covers your costs. Tap 'Use these prices' to use them.",'prices'],
  ['Work out what you need to take home',"Tap Prices, then 'Your own outgoings and savings'. Type what you pay at home and what you want to save each month. The app works out what you need to take home and what to charge an hour.",'prices'],
  ['Plan your social media posts',"Tap Clients, then Marketing at the top. Tick the days you want to post and tap 'Plan my next 2 weeks'. Open a post, add a photo or tap 'Use my price list', check the caption, then tap 'Share to Instagram, Facebook…' on the day. The Diary reminds you.",'marketing'],
  ['Let clients book online',"At the bottom of Diary, under 'Let clients book online', type your mobile number and tap 'Share my booking link'. Send it to clients or put it in your Instagram bio. They pick a treatment and a free time and send you a request. Tap the link in their message to add it to your diary.",'diary'],
  ['Send a reminder',"Tap Reminder on the booking, then 'Copy message'. Paste it into a text, WhatsApp or email. The app does not send it for you.",'diary'],
  ['Record a deposit',"Type it in 'Deposit taken' when you make the booking.",'diary'],
  ['Book a holiday or a day off',"At the bottom of Diary, tap '+ Add time off'. Pick the dates, then tap Save.",'diary']]],
['Money',[
  ['Record money coming in',"Tap Money. Under the quick add heading, tap the treatment you just did. For anything else, open 'Add money in'. A booking you marked as paid is already there, so do not add it twice.",'money'],
  ['Record something you paid for',"Tap Money and open 'Add money out'. Fill in the date, the amount, what it was for and what kind of cost. Add a receipt photo if you have one.",'money'],
  ['Record a business trip in your car',"Tap Money and open 'Car trips'. Type the date, the miles there and back and where you went, then tap 'Add trip'.",'money'],
  ['Fix or delete an entry',"Find it in the list on Money and tap Change. To delete it, tap 'Delete this entry' on that sheet, then tap it again.",'money'],
  ['See how much to put aside for tax',"Tap Prices. Under the slider it says what share of your profit to put aside for tax, National Insurance and any student loan. Add a job or student loan under 'Your own outgoings and savings'.",'prices'],
  ['Get your figures for a tax return or an accountant',"Tap Money, then Tax. Under 'Your tax pack', tap 'Make my tax pack', then save it or send it to your accountant. It has a PDF of your figures, spreadsheets of every entry and your receipt photos.",'taxyear']]],
['Clients',[
  ['Add a client',"Tap Clients, type their name in the box at the top and tap Add. Booking someone new in the diary adds them too.",'clients'],
  ['See or change the details of a client',"Tap Clients, then Open beside their name. Phone, email and notes are under Details, and their visits are just below.",'clients'],
  ['Record a patch test',"Open the client. Under 'Patch tests', pick the date, the product and the result, then tap 'Add patch test'.",'clients'],
  ['Fill in a consultation form',"Open the client. Under 'Consultation form', fill in the answers, let them sign with a finger, then tap 'Save signature and answers'.",'clients'],
  ['Copy emails for a newsletter',"On Clients, 'Copy email list for a newsletter' appears once a client has an email and has ticked 'Happy to get offers and reminders' on their consultation form.",'clients'],
  ['Delete a client',"Open the client and tap 'Delete this client' at the bottom.",'clients']]],
['Settings and your data',[
  ['Change your opening hours',"Tap More, then 'Opening hours'. Tick the days you work and set the times. '+ Break' adds a lunch break. The days you take off a year are at the bottom.",'more:hours'],
  ['Add someone who works for you',"Tap More, then 'People who work for you', then '+ Add a person'. Tick 'Works different days or times from your opening hours' to give them their own hours.",'more:team'],
  ['Tell it about a job or a student loan',"Tap More, then 'A job or student loan'. This keeps the tax estimate right.",'more:tax'],
  ['Change card fees',"Tap More, then 'What you earn and card fees'.",'more:pricing'],
  ['Say you live in Scotland',"Tap More, then 'Your target and where you live'.",'more:pay'],
  ['Add your name, logo and colours',"Tap More, then 'Your name, logo and colours'.",'more:brand'],
  ['Back up your data',"Tap More, then 'Back up and restore', then 'Save a backup file'. Keep the file somewhere safe, like your email. Everything is kept on this phone only, so do this often.",'more:backup'],
  ['Get your data back, or move to a new phone',"Open the app on the phone, tap More, then 'Back up and restore', then 'Restore from a file' and pick your backup file.",'more:backup'],
  ['Lock the app',"Tap More, then 'Lock the app' and choose a passcode. If you forget it, nobody can get your data back.",'more:lock'],
  ['Delete everything',"Tap More, then 'Start again', then 'Delete all my data'. Tap it a second time to confirm.",'more:reset']]]
];
function guideCard(){ return GUIDE.map(([g,qs])=>`<details class="fold"><summary><span class="grow">${g}</span></summary><div class="stack">${qs.map(([q,a,go])=>`<div><p><b>${esc(q)}.</b> ${esc(a)}</p>${go?`<button class="btn small ghost" data-act="guide-go" data-go="${go}">Take me there</button>`:''}</div>`).join('')}</div></details>`).join(''); }

UNDOABLE.add('hr-copy'); UNDOABLE.add('bk-reopen'); // both can be undone from the bar at the bottom

// What she earns an hour is not asked in set-up (beginners could not answer it). It starts at £20 and is changed under 'Your numbers' on Prices.
const wizStepsAll=wizSteps; wizSteps=function(){ return wizStepsAll().filter(x=>x.type!=='profitq'); };

// ---- diary: a month view, today standing out, and adding a booking to her phone's calendar ----
let diaryMode='week', diaryMonth=todayStr().slice(0,7)+'-01';
const diaryToggle=()=>`<div class="chips" role="group" aria-label="Show the diary by"><button class="chip" data-act="dy-mode" data-v="week" aria-pressed="${diaryMode==='week'}">Week</button><button class="chip" data-act="dy-mode" data-v="month" aria-pressed="${diaryMode==='month'}">Month</button></div>`;
function vMonth(){ const d0=dt(diaryMonth), y=d0.getFullYear(), mo=d0.getMonth(), n=new Date(y,mo+1,0).getDate(), lead=(d0.getDay()+6)%7, ds=i=>`${y}-${pad2(mo+1)}-${pad2(i)}`;
  const cell=i=>{ const x=ds(i), bk=state.bookings.filter(b=>b.date===x&&b.status!=='cancelled').length, open=dayMins(hoursFor('me')[dayIdx(x)])>0, off=onHoliday('me',x);
    return `<button class="mday${x===todayStr()?' today':''}${open&&!off?'':' shut'}" data-act="dy-day" data-date="${x}" aria-label="${fmtDay(x)}${bk?`, ${bk} booking${bk>1?'s':''}`:''}${off?', you are off':!open?', closed':''}"><span>${i}</span>${bk?`<span class="c">${bk}</span>`:off?'<span class="o">Off</span>':''}</button>`; };
  return `<section class="stack"><div class="row" style="justify-content:space-between"><div><h2>Diary</h2><p class="muted">${d0.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</p></div>
    <div class="row"><button class="btn small ghost" data-act="dy-prev" aria-label="Previous month">‹</button><button class="btn small ghost" data-act="dy-today">This month</button><button class="btn small ghost" data-act="dy-next" aria-label="Next month">›</button></div></div>
    ${diaryToggle()}
    <div class="month">${['M','T','W','T','F','S','S'].map(h=>`<span class="mhead" aria-hidden="true">${h}</span>`).join('')}${'<span></span>'.repeat(lead)}${[...Array(n)].map((_,i)=>cell(i+1)).join('')}</div>
    <p class="small muted">The number on a day is how many bookings it has. Tap a day to see them.</p></section>`; }
const vDiaryWeek=vDiary;
vDiary=function(){ return diaryMode==='month'?vMonth():vDiaryWeek().replace('aria-label="Next week">›</button></div></div>','aria-label="Next week">›</button></div></div>'+diaryToggle()); };
// the booking in her phone's calendar: Google Calendar link, or a calendar file for Apple, Outlook and the rest
function calTimes(b){ const s=dt(b.date); const [h,m]=b.time.split(':').map(Number); s.setHours(h,m,0,0); const e=new Date(s.getTime()+(+b.mins||bkMins(b)||60)*60000);
  const f=d=>`${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`; return [f(s),f(e)]; }
function calText(b){ const cl=clientById(b.clientId); return {title:`${bookingLabel(b)}${cl?' · '+cl.name:''}`, details:`${gbp(+b.price)}${+b.deposit?`, deposit ${gbp(+b.deposit)}`:''}${b.notes?`. ${b.notes}`:''}`}; }
function showCal(b){ const [s,e]=calTimes(b), t=calText(b), o=document.getElementById('overlay');
  const g=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.title)}&dates=${s}/${e}&details=${encodeURIComponent(t.details)}&ctz=Europe/London`;
  o.innerHTML=`<div class="card" style="max-width:480px;width:100%"><div class="treat-head"><h3>Add to my calendar</h3><button class="iconbtn" aria-label="Close" data-act="bk-close">✕</button></div>
    <p class="small muted">${esc(t.title)}, ${fmtDay(b.date)} at ${fmtT(b.time)}. Your phone will remind you like any other event. If you change the booking here, change it in your calendar too.</p>
    <a class="btn" style="text-decoration:none;text-align:center" target="_blank" rel="noopener" href="${g}">Google Calendar</a>
    <button class="btn ghost" data-act="cal-ics" data-id="${b.id}">Apple or other calendar</button></div>`; o.hidden=false; }
function calFile(b){ const [s,e]=calTimes(b), t=calText(b), x=v=>String(v).replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n'), now=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Know Your Worth//EN','BEGIN:VEVENT',`UID:${b.id}@knowyourworth`,`DTSTAMP:${now}`,`DTSTART:${s}`,`DTEND:${e}`,`SUMMARY:${x(t.title)}`,`DESCRIPTION:${x(t.details)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n'); } // local times, so the phone reads them as UK time
document.addEventListener('click', async e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='dy-mode'){ diaryMode=el.dataset.v; if(diaryMode==='month') diaryMonth=diaryWeek.slice(0,7)+'-01'; render(); }
  else if(a==='dy-day'){ const x=el.dataset.date; diaryMode='week'; diaryWeek=weekStart(x); render(); const c=document.getElementById('day-'+x); if(c) c.scrollIntoView({block:'start'}); }
  else if(diaryMode==='month'&&view==='diary'&&(a==='dy-prev'||a==='dy-next'||a==='dy-today')){ e.stopImmediatePropagation(); const d=dt(diaryMonth);
    if(a==='dy-today') diaryMonth=todayStr().slice(0,7)+'-01'; else { d.setDate(1); d.setMonth(d.getMonth()+(a==='dy-next'?1:-1)); diaryMonth=`${d.getFullYear()}-${pad2(d.getMonth()+1)}-01`; } render(); }
  else if(a==='bk-cal'){ const b=state.bookings.find(x=>x.id===el.dataset.id); if(b) showCal(b); }
  else if(a==='cal-ics'){ const b=state.bookings.find(x=>x.id===el.dataset.id); if(!b) return;
    if(await plClaudeSave()){ toast('Inside Claude, use Google Calendar, or open the app from its web address'); return; } // Claude does not hand over calendar files
    const a2=document.createElement('a'); a2.href=URL.createObjectURL(new Blob([calFile(b)],{type:'text/calendar'})); a2.download='booking.ics'; a2.click(); setTimeout(()=>URL.revokeObjectURL(a2.href),5000); }
}, true);

// ---- online booking: a link clients open to pick a treatment and a free time ----
// No server: her free times travel inside the link (after the #, so they are never sent to any website), and the
// client's request comes back to her by WhatsApp, text or email with a link that adds it to her diary.
// shortcut: the link is a snapshot of her free times when she made it; upgrade to live times with the server add-on.
const APP_URL=()=>/github\.io$|localhost$/.test(location.hostname)?location.origin+location.pathname:'https://dannyzak23.github.io/know-your-worth/';
const b64e=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64d=s=>{ try{ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; return JSON.parse(decodeURIComponent(escape(atob(s)))); }catch(e){ return null; } };
const bookPage=()=>({days:14,phone:'',email:'',...(state.setup.bookPage||{})});
function freeTimes(x){ const h=hoursFor('me')[dayIdx(x)]; if(!(dayMins(h)>0)||onHoliday('me',x)) return [];
  const busy=state.bookings.filter(b=>b.date===x&&b.staffId==='me'&&b.status!=='cancelled').map(b=>[toMin(b.time),toMin(b.time)+(+b.mins||0)+(+(svc(b.serviceId)||{}).prepMin||0)]);
  if(breakMins(h)>0) busy.push([toMin(h.bFrom),toMin(h.bTo)]);
  state.treatments.filter(isClass).forEach(t=>classTimesOn(t,x).forEach(hh=>busy.push([toMin(hh),toMin(hh)+(+t.clientMin||0)+(+t.prepMin||0)])));
  let free=[[toMin(h.from),toMin(h.to)]];
  busy.forEach(([s,e])=>{ free=free.flatMap(([a,b])=>e<=a||s>=b?[[a,b]]:[[a,Math.min(s,b)],[Math.max(e,a),b]].filter(([p,q])=>q-p>=15)); });
  return free; }
const slots=(free,len)=>free.flatMap(([a,b])=>{ const o=[]; for(let t=Math.ceil(a/15)*15;t+len<=b;t+=15) o.push(t); return o; });
function bookLink(){ const bp=bookPage(), c=compute(state), days=[];
  for(let i=1;i<=bp.days;i++){ const x=addDays(todayStr(),i), f=freeTimes(x); if(f.length) days.push([x,f]); }
  return APP_URL()+'#book='+b64e({b:(state.setup.brand||{}).businessName||'',t:c.treatments.filter(t=>!t.addon).map(t=>[t.id,t.name,+t.price||t.suggested,+t.clientMin||0,+t.prepMin||0,isClass(t)?+t.places:0]),k:Object.fromEntries(c.treatments.filter(isClass).map(t=>[t.id,classSessions(t,bp.days)])),d:days,w:bp.phone,e:bp.email,q:bp.consult===false?0:1,m:todayStr()}); }
function bookCard(){ const bp=bookPage();
  return `<article class="card"><h3>Let clients book online</h3>
    <p class="small muted">Share a link. Clients pick a treatment and a free time, and it sends you the request by WhatsApp, text or email. Tap the link in their message to add it to your diary.</p>
    <label class="field">Your mobile number<span class="hint">Requests come to this by WhatsApp or text</span><input id="bp-phone" type="tel" autocomplete="tel" value="${esc(bp.phone)}" data-bp="phone"></label>
    <label class="field">Your email<span class="hint">Optional</span><input id="bp-email" type="email" autocomplete="email" value="${esc(bp.email)}" data-bp="email"></label>
    <label class="field">How far ahead clients can book<select id="bp-days" data-bp="days">${[[7,'1 week'],[14,'2 weeks'],[28,'4 weeks']].map(([v,l])=>`<option value="${v}" ${+bp.days===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <div class="row"><button class="btn" data-act="bp-share">Share my booking link</button><button class="btn ghost" data-act="bp-preview">See what clients see</button></div>
    <p class="small muted">The link shows your free times as they are when you share it, so share a fresh one when your diary changes, say once a week. Nothing is booked until you add it.</p></article>`; }

// ---- what the client sees ----
let BK=null, bf={t:null,d:null,time:null,name:'',phone:'',note:'',sent:false};
function bookFace(){ const B=BK, live=B.d.filter(([x])=>x>todayStr()), tr=B.t.find(t=>t[0]===bf.t), len=tr?tr[3]+tr[4]:0;
  const head=`<div><h2>${esc(B.b||'Book an appointment')}</h2><p class="muted">Choose a treatment and a time, then send your request.</p></div>`;
  if(!live.length) return `<section class="stack">${head}<div class="notice warn">This booking link is out of date. Send a message to ask for a time.</div></section>`;
  const cls=!!(tr&&tr[5]>0), ks=cls?((B.k||{})[tr[0]]||[]).filter(([x])=>x>todayStr()):[];
  const days=!tr?[]:cls?[...new Set(ks.map(([x])=>x))].map(x=>[x]):live.filter(([,f])=>slots(f,len).length), day=days.find(([x])=>x===bf.d), times=!day?[]:cls?ks.filter(([x])=>x===bf.d).map(([,m])=>m):slots(day[1],len);
  const left=m=>{ const k=ks.find(([x,mm])=>x===bf.d&&mm===m); return k?` · ${k[2]} place${k[2]>1?'s':''} left`:''; };
  return `<section class="stack">${head}
  <article class="card"><h3>1. Choose a treatment</h3><div class="choices">${B.t.map(t=>`<button class="choice" data-act="bf-t" data-v="${esc(t[0])}" aria-pressed="${bf.t===t[0]}">${esc(t[1])}<small>${money(t[2])}${t[5]>0?' each':''} · about ${t[3]} min${t[5]>0?' · group class':''}</small></button>`).join('')}</div></article>
  ${tr?`<article class="card" id="bf-days"><h3>2. Choose a day</h3>${days.length?`<div class="chips">${days.map(([x])=>`<button class="chip" data-act="bf-d" data-v="${x}" aria-pressed="${bf.d===x}">${fmtDay(x)}</button>`).join('')}</div>`:`<p class="muted">${cls?'No classes with places left at the moment':'No free times for this one at the moment'}. Send a message to ask.</p>`}</article>`:''}
  ${day?`<article class="card" id="bf-times"><h3>3. Choose a time</h3><div class="chips">${times.map(t=>`<button class="chip" data-act="bf-time" data-v="${t}" aria-pressed="${bf.time===t}">${fmtT(fromMin(t))}${cls?left(t):''}</button>`).join('')}</div></article>`:''}
  ${day&&bf.time!=null?`<article class="card" id="bf-you"><h3>4. Your details</h3>
    <label class="field">Your name<input id="bf-name" autocomplete="name" value="${esc(bf.name)}" data-bf="name"></label>
    <label class="field">Your mobile number<input id="bf-phone" type="tel" autocomplete="tel" value="${esc(bf.phone)}" data-bf="phone"></label>
    <label class="field">Anything we should know?<span class="hint">Optional</span><input id="bf-note" value="${esc(bf.note)}" data-bf="note"></label>
    <p class="live">${esc(tr[1])}, ${fmtDay(bf.d)} at ${fmtT(fromMin(bf.time))}, ${money(tr[2])}</p>
    <div class="stack">${B.w?`<button class="btn" data-act="bf-send" data-via="wa">Send by WhatsApp</button><button class="btn ghost" data-act="bf-send" data-via="sms">Send by text</button>`:''}${B.e?`<button class="btn ghost" data-act="bf-send" data-via="email">Send by email</button>`:''}</div>
    ${bf.sent?`<div class="notice ok">Once you have sent the message, that is it. ${esc(B.b||'They')} will reply to confirm.</div>`:'<p class="small muted">This sends a booking request. It is not booked until you hear back.</p>'}</article>`:''}
  <p class="small muted">Free times as of ${fmtDay(B.m)}.</p></section>`; }
function bfMessage(){ const B=BK, tr=B.t.find(t=>t[0]===bf.t), n=bf.name.trim(), p=bf.phone.trim(), o=bf.note.trim();
  const link=location.origin+location.pathname+'#add='+b64e({t:bf.t,n:tr[1],d:bf.d,h:fromMin(bf.time),c:n,p,o});
  return `Hi${B.b?' '+B.b:''}, I would like to book ${tr[1]} on ${fmtDay(bf.d)} at ${fmtT(fromMin(bf.time))}.\nName: ${n}${p?`\nPhone: ${p}`:''}${o?`\nNote: ${o}`:''}\n\nTo add this to your diary, tap: ${link}`; }
const HASH=(typeof location!=='undefined'&&location.hash)||'';
if(HASH.startsWith('#book=')){ const d=b64d(HASH.slice(6)); if(d&&Array.isArray(d.t)&&Array.isArray(d.d)){ BK=d;
  render=function(){ ['header','#bottomnav'].forEach(q=>{ const n=document.querySelector(q); if(n) n.hidden=true; }); document.title=(BK.b||'Book')+' · Book an appointment'; document.getElementById('main').innerHTML=bookFace(); }; } }

// ---- her side: a request link adds the booking in one tap ----
let addReq=null;
function showAdd(A){ const t=svc(A.t), o=document.getElementById('overlay'), w=t?bkWarnings({date:A.d,time:A.h,staffId:'me',serviceId:t.id,addons:[],clientId:''}):[]; addReq=A;
  o.innerHTML=`<div class="card" style="max-width:480px;width:100%"><h3>Booking request</h3>
    <p><b>${esc(A.c||'Someone')}</b> would like ${esc(A.n||'a booking')} on ${fmtDay(A.d)} at ${fmtT(A.h)}.</p>${A.p?`<p class="small muted">Phone: ${esc(A.p)}</p>`:''}${A.o?`<p class="small muted">Note: ${esc(A.o)}</p>`:''}
    ${t?'':`<div class="notice warn">${esc(A.n||'That treatment')} is not in your list any more, so it cannot be added. Reply to them instead.</div>`}${w.map(x=>`<div class="notice warn">${esc(x)}</div>`).join('')}
    <div class="row">${t?'<button class="btn" data-act="add-req">Add to my diary</button>':''}<button class="btn ghost" data-act="add-req-no">Not now</button></div>
    <p class="small muted">Remember to reply to them to confirm.</p></div>`; o.hidden=false; }
if(HASH.startsWith('#add=')){ const A=b64d(HASH.slice(5)); if(A&&A.d&&A.h) setTimeout(function tryAdd(){ if(view==='lock'){ setTimeout(tryAdd,1000); return; } showAdd(A); },0); }
function addRequest(A){ const t=svc(A.t); if(!t) return null; const nm=(A.c||'').trim();
  let cl=nm&&state.clients.find(c=>c.name.trim().toLowerCase()===nm.toLowerCase()); if(!cl&&nm){ cl={id:uid(),name:nm,phone:A.p||'',patchTests:[]}; state.clients.push(cl); } else if(cl&&A.p&&!cl.phone) cl.phone=A.p;
  const d={date:A.d,time:A.h,staffId:'me',serviceId:t.id,addons:[]}, b={id:uid(),...d,clientId:cl?cl.id:'',mins:bkMins(d),price:bkAutoPrice(d),deposit:0,notes:A.o||'',status:'booked'};
  state.bookings.push(b); return b; }

document.addEventListener('click', e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, v=el.dataset.v;
  if(a==='bf-t'||a==='bf-d'||a==='bf-time'){ if(a==='bf-t'){ bf.t=v; bf.d=null; bf.time=null; } else if(a==='bf-d'){ bf.d=v; bf.time=null; } else bf.time=+v;
    render(); const n=document.getElementById(a==='bf-t'?'bf-days':a==='bf-d'?'bf-times':'bf-you'); if(n) n.scrollIntoView({behavior:'smooth',block:'start'}); }
  else if(a==='bf-send'){ if(!bf.name.trim()){ toast('Type your name first'); const n=document.getElementById('bf-name'); if(n) n.focus(); return; }
    const msg=encodeURIComponent(bfMessage()), via=el.dataset.via;
    if(via==='wa') window.open(`https://wa.me/${waNumber(BK.w)}?text=${msg}`,'_blank'); else location.href= via==='sms'?`sms:${String(BK.w).replace(/\s/g,'')}?&body=${msg}`:`mailto:${BK.e}?subject=${encodeURIComponent('Booking request')}&body=${msg}`;
    bf.sent=true; render(); }
  else if(a==='bp-share'||a==='bp-preview'){ const bp=bookPage(); if(!bp.phone.trim()&&!bp.email.trim()){ toast('Add your mobile number or email first, so requests reach you'); const n=document.getElementById('bp-phone'); if(n) n.focus(); return; }
    const url=bookLink(); if(a==='bp-preview'){ window.open(url,'_blank'); return; }
    if(navigator.share) navigator.share({title:'Book with '+((state.setup.brand||{}).businessName||'me'),url}).catch(()=>{}); else copyText(url); }
  else if(a==='add-req'||a==='add-req-no'){ const A=addReq; addReq=null; document.getElementById('overlay').hidden=true; try{ history.replaceState(null,'',location.pathname); }catch(_){}
    if(a==='add-req'&&A){ const b=addRequest(A); if(b){ save(); view='diary'; diaryMode='week'; diaryWeek=weekStart(b.date); render(); toast('Added to your diary. Reply to them to confirm'); } } }
});
document.addEventListener('input', e=>{ const d=(e.target&&e.target.dataset)||{}; if(d.bf) bf[d.bf]=e.target.value; });
document.addEventListener('change', e=>{ const el=e.target, f=el&&el.dataset&&el.dataset.bp; if(!f) return; state.setup.bookPage={...bookPage(),[f]:f==='days'?+el.value:el.value.trim()}; save(); });
const vDiaryMonthWeek=vDiary;
vDiary=function(){ const h=vDiaryMonthWeek(); if(diaryMode==='month') return h; const i=h.lastIndexOf('</section>'); return h.slice(0,i)+bookCard()+h.slice(i); };

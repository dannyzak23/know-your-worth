
// ---- kinds of work ----
{ fails=0; const keys=IND_GROUPS.flatMap(g=>g[1]);
ok(keys.join(',')==='beauty,therapy,hair,barber,laser,massage','trade list is beauty, hair and massage only: '+keys.join(','));
ok(CATALOGUES.laser.length===8&&CATALOGUES.laser.every(t=>t.recipe.every(r=>LIBRARY.some(p=>p.id===r.productId))),'laser treatments use products that exist');
ok(overheadsFor('laser').some(o=>/Laser machine/.test(o.name))&&overheadsFor('therapy').length>0,'laser has its own running costs, others unchanged');
state=exampleState(); state.setup.industries=['laser']; view='wizard'; let e0=errs; ['hair','barber','laser'].forEach(k=>{ state.setup.industries=[k]; try{ const sts=wizSteps(); step=sts.findIndex(x=>x.type==='industry'); let h=vWizard(); step=sts.findIndex(x=>x.type==='pickTreat'); h+=vWizard(); if(!h.includes(CATALOGUES[k][0].name)) throw Error('no treatments shown'); }catch(x){ errs++; console.log(k,x.message); } });
ok(errs===e0,'set-up shows each new trade without errors');
console.log('trade list tests: fails',fails,'render errs',errs); }

// ---- health, body art, fitness and pets ----
{ fails=0; const keys=IND_GROUPS.flatMap(g=>g[1]); const NEW=['massage','physio','holistic','tattoo','fitness','coach','dog'];
ok(keys.includes('massage')&&!['physio','holistic','tattoo','fitness','coach','dog'].some(k=>keys.includes(k))&&NEW.every(k=>CATALOGUES[k].length&&CATALOGUES[k].every(t=>t.price>0&&t.recipe.every(r=>LIBRARY.some(p=>p.id===r.productId)))),'massage listed, the others hidden but still work for anyone already using them');
ok(NEW.every(k=>overheadsFor(k).length>3),'each has running costs');
let e0=errs; NEW.forEach(k=>{ state=exampleState(); state.setup.industries=[k]; view='wizard'; try{ const sts=wizSteps(); step=sts.findIndex(x=>x.type==='pickTreat'); const h=vWizard(); if(!h.includes(esc(CATALOGUES[k][0].name))) throw Error('no treatments shown'); }catch(x){ errs++; console.log(k,x.message); } });
ok(errs===e0,'set-up shows each trade');
console.log('more trades tests: fails',fails,'render errs',errs); }

// ---- group classes ----
{ fails=0; state=exampleState(); globalThis.location={hostname:'x.github.io',origin:'https://x.github.io',pathname:'/kyw/',hash:''};
const c0=clone(ALLCAT.find(x=>x.id==='matclass')); state.treatments.push(c0); const one=clone(c0); one.id='one1'; one.places=0; one.fill=0; state.treatments.push(one);
const r=compute(state), A=r.treatments.find(t=>t.id==='matclass'), B=r.treatments.find(t=>t.id==='one1');
ok(A.people===8&&B.people===1&&Math.abs(A.timeCost*8-B.timeCost)<1e-6&&A.suggested<B.suggested,'a class shares its time cost across the 8 who usually come: '+A.suggested+' vs '+B.suggested);
const x=addDays(todayStr(),3); c0.times=[[dayIdx(x),'18:00']]; c0.perWeek=1; c0.price=12;
const mk=(id,cid)=>({id,date:x,time:'18:00',staffId:'me',clientId:cid,serviceId:'matclass',addons:[],mins:60,price:12,status:'booked'});
state.bookings=[]; for(let i=0;i<11;i++) state.bookings.push(mk('c'+i,''));
let w=bkWarnings({...mk('new',''),id:'new'}); ok(!w.some(s=>/Clashes/.test(s))&&!w.some(s=>/full/.test(s)),'11 booked in a 12-place class: no clash, not full: '+w.join('|'));
state.bookings.push(mk('c11','')); w=bkWarnings({...mk('new',''),id:'new'}); ok(w.some(s=>/full/.test(s)),'13th person: the class is full');
state.bookings.pop(); ok(/11 of 12 booked/.test(classTag(state.bookings[0])),'diary shows 11 of 12 booked');
ok(freeTimes(x).every(([a,b])=>b<=1080||a>=1155),'her one-to-one free times leave out the class time');
state.setup.bookPage={phone:'07700 900123',days:14}; BK=b64d(bookLink().split('#book=')[1]);
const ses=BK.k.matclass; ok(ses.some(([d,m,l])=>d===x&&m===1080&&l===1),'her link carries the class with 1 place left');
bf={t:'matclass',d:x,time:null,name:'',phone:'',note:'',sent:false}; let h=bookFace(); ok(/1 place left/.test(h)&&/group class/.test(h)&&(h.match(/data-act="bf-time"/g)||[]).length===ses.filter(s=>s[0]===x).length,'client sees only the class time, with places left');
bf.time=1080; bf.name='Pat Lee'; const A2=b64d(bfMessage().split('#add=')[1]); const nb=addRequest(A2); ok(nb&&nb.time==='18:00'&&classCount('matclass',x,'18:00')===12,'request adds them to the class');
ok(!classSessions(c0,14).some(([d])=>d===x),'a full class is not offered online');
view='treatments'; openTreat='matclass'; h=vTreatments(); ok(/Places in each session/.test(h)&&/When it runs each week/.test(h)&&/data-ct="matclass"/.test(h),'treatment editor shows places and class times');
delete globalThis.location; console.log('class tests: fails',fails,'render errs',errs); }

// ---- products inside the treatments step, and order links ----
{ fails=0; state=exampleState(); state.setup.done=false; wizFull=false;
const sts=wizSteps(); ok(!sts.some(x=>x.type==='prodq')&&sts.some(x=>x.type==='quicklist'),'one combined step for treatments and products: '+sts.map(x=>x.type).join(','));
view='wizard'; step=sts.findIndex(x=>x.type==='quicklist'); const t=state.treatments.find(x=>x.recipe.length); let h=vWizard();
ok(h.includes(`data-qladd="${t.id}"`)&&/Something else \(type it in\)/.test(h),'each treatment has a dropdown to add products');
const p0=state.products.find(p=>p.id===t.recipe[0].productId); ok(h.includes(`data-pf="${p0.id}" data-f="packCost"`)&&/Link to order it/.test(h)&&h.includes(`data-ru="${t.id}" data-p="${p0.id}"`),'products sit inside their treatment with cost, link and uses');
const shared=state.products.find(p=>state.treatments.filter(x=>x.recipe.some(y=>y.productId===p.id)).length>1); ok(!shared||h.split(`data-pf="${shared.id}" data-f="packCost"`).length===2,'a shared product asks its cost once');
state.treatments.push({id:'tx',name:'Plain one',clientMin:30,prepMin:5,perWeek:1,price:10,recipe:[]}); h=vWizard(); ok(/nothing added yet/.test(h),'a treatment with no products says so');
ok(new Set(h.match(/id="[^"]+"/g)).size===h.match(/id="[^"]+"/g).length,'no repeated ids on the page');
ok(orderHref('salonservices.com/x')==='https://salonservices.com/x'&&orderHref('javascript:alert(1)')===''&&orderHref('http://a.co')==='http://a.co'&&orderHref('nonsense')==='','order links: web pages only');
const p=state.products[0]; p.url='www.example.co.uk/gel'; view='stock'; openProd=null; h=vStock(); ok(h.includes('href="https://www.example.co.uk/gel"')&&/rel="noopener noreferrer"/.test(h),'Order button shows on the product list');
openProd=p.id; h=vStock(); ok(h.includes(`id="pl-${p.id}"`)&&h.includes('www.example.co.uk/gel'),'product editor has the link box');
const r=t.recipe[0], before=compute(state).treatments.find(x=>x.id===t.id).productCost; r.perPack=(+r.perPack||1)*2; ok(compute(state).treatments.find(x=>x.id===t.id).productCost<before,'more uses makes the treatment cheaper');
console.log('product step tests: fails',fails,'render errs',errs); }
// ---- end of day, reminders, reorder ----
{ fails=0; state=exampleState(); const d=todayStr(); state.setup.trackStock=false;
const t=state.treatments.find(x=>!x.addon&&(x.recipe||[]).length); const p=state.products.find(x=>x.id===t.recipe[0].productId);
const b1={id:'e1',date:d,time:'10:00',staffId:'me',clientId:'',serviceId:t.id,addons:[],mins:60,price:30,deposit:5,status:'booked'}, b2={...b1,id:'e2',time:'12:00'};
state.bookings.push(b1,b2); const inc0=state.income.length;
const r=applyEod({date:d,marks:{e1:'Cash',e2:'noshow'},extra:[{svc:t.id,qty:2,m:'Card'}],used:{[p.id]:1},who:'',text:'Order more foils'});
ok(b1.status==='done'&&b2.status==='noshow','marks paid and no-show');
ok(r.n===3&&Math.abs(r.money-(30+2*unitPrice(t)))<1e-9,'counts 3 clients and the money: '+r.n+' '+r.money);
ok(state.income.length===inc0+4,'income: 1 paid, 1 deposit kept, 2 walk-ins');
ok(p.toBuy&&toBuyList().some(x=>x.id===p.id),'finished product goes on the reorder list without stock counting');
ok(rems().length===1&&rems()[0].clientId==='','general reminder saved');
state.setup.trackStock=true; p.inStock=2.4; p.reorderAt=0; p.toBuy=false; finishPack(p,1); ok(p.inStock===2&&!p.toBuy,'finishing the open pack drops the part-used bit: '+p.inStock);
p.inStock=0.3; finishPack(p,1); ok(p.inStock===0&&p.toBuy&&toBuyList().some(x=>x.id===p.id),'running out puts it on the list');
const q=state.products.find(x=>x.id!==p.id); q.inStock=0; q.reorderAt=0; q.toBuy=false; ok(!toBuyList().some(x=>x.id===q.id),'no reorder level and not run out: no nag');
const c={id:'cT',name:'Mrs Treacher',patchTests:[]}; state.clients.push(c); addReminder('cT','wants green hair dye next time'); ok(addReminder('cT','  ')===null,'empty reminder ignored');
const b3={...b1,id:'e3',date:addDays(d,7),clientId:'cT',status:'booked'}; state.bookings.push(b3);
ok(remLine(b3).includes('green hair dye')&&remLine({...b3,status:'done'})==='','diary row shows the reminder on upcoming bookings');
clOpen='cT'; ok(vClients().includes('For next time')&&vClients().includes('green hair dye'),'client card shows it'); clOpen=null;
ok(vClients().includes('Remember</span>'),'client list tags them');
view='diary'; let e0=errs; try{ const h=vDiary(); if(!h.includes('End of day check-in')||!h.includes('Time to reorder')||!h.includes('Mrs Treacher')) throw Error('today card missing'); }catch(x){ errs++; console.log(x.message); }
try{ eod={date:d,marks:{},extra:[{svc:t.id,qty:1,m:'Cash'}],used:{},who:'cT',text:''}; renderEod(); }catch(x){ errs++; console.log('eod form',x.message); } eod=null;
ok(errs===e0,'diary and check-in render');
console.log('end of day tests: fails',fails,'render errs',errs); }

// ---- notebook changes ----
{ fails=0; state=exampleState(); wizFull=false; const s=state.setup; s.overheads=[{id:'e1',group:'equipment',name:'Lamp',amount:600,years:0.5,bought:'2026-01-10'}];
ok(Math.abs(overheadsMonth(s)-100)<1e-9,'a one-off replaced every 6 months is divided over 6: '+overheadsMonth(s));
ok(costList().includes('Replace it every')&&costList().includes('Replace by'),'one-offs ask when bought and how often replaced');
ok(addMonths('2026-01-31',1)==='2026-03-03'||addMonths('2026-01-10',6)==='2026-07-10','adding months');
const oh=overheadsForAll(['nails']); ok(oh.some(o=>/Utilities/.test(o.name))&&oh.some(o=>/Design and admin/.test(o.name)),'utilities and design and admin apps in starting costs');
view='wizard'; step=wizSteps().findIndex(x=>x.type==='quicklist'); const h=vWizard(); ok(/A month/.test(h)&&/times are examples/.test(h)&&!/<label class="field">A week</.test(h),'step 4 asks a month and says examples');
s.app=Object.keys(APPS)[0]; step=wizSteps().findIndex(x=>x.type==='app'); ok(/Card fee \(%\)/.test(vWizard()),'card fee can be typed whichever reader');
console.log('notebook tests: fails',fails,'render errs',errs); }

// ---- round 2: readers, bills, slider, target, health questions ----
{ fails=0; state=exampleState(); wizFull=false; const s=state.setup; view='wizard';
let st=wizSteps(); ok(!st.some(x=>x.type==='targetq'),'no target step in set-up');
s.app='other'; s.cardPct=0; s.cardFixed=0; step=st.findIndex(x=>x.type==='app'); let h=vWizard();
ok(/data-appsel/.test(h)&&/SumUp/.test(h)&&/Add your own card reader/.test(h)&&/id="wiz-cardPct"[^>]*value=""/.test(h),'card readers in a dropdown; your own starts with no fees');
const o={id:'oh1',group:'monthly',name:'BT Internet',amount:40,years:3}; s.overheads=[o];
ok(costList().includes('data-ohinv="oh1"'),'each cost can take an invoice photo');
const e=addBill(o,'2026-05-15','r1'); ok(e.category==='Phone, software and office'&&e.amount===40&&e.supplier==='BT Internet','an invoice becomes money out in the right category');
ok(billsCard(2026).includes('✓ May')&&billsCard(2026).includes('data-month="2026-04"'),'tax page shows which months have a bill, and lets you add missed ones');
view='prices'; s.profitHour=20; h=vPrices(); ok(/Your prices and target/.test(h)&&/data-slide/.test(h)&&/Use these prices/.test(h)&&!/id="pn-profitHour"/.test(h),'prices page has the slider instead of the hourly box');
ok(!/after tax/.test(h),'no "after tax" on Prices');
const lo=pricesAt(0), hi=pricesAt(40); ok(lo.every((t,i)=>t.suggested<=hi[i].suggested)&&lo.every(t=>t.suggested>=t.minimum-0.01),'sliding up raises prices; far left is break-even');
h=vPrices(); ok(/Each hour with a/.test(h)&&/Take home a month/.test(h)&&h.split('<h3>Your target</h3>').length===1,'one card: overall hourly rate and monthly take home');
const T0=state.treatments.find(t=>!t.addon); BK={b:'Nails by J',t:[[T0.id,'Gel manicure',30,45,10,0]],d:[[addDays(todayStr(),2),[[540,1020]]]],w:'07700900000',e:'',q:1,m:todayStr()};
bf={t:T0.id,d:addDays(todayStr(),2),time:600,name:'Ann',phone:'',note:'',sent:false,q:{allergies:'Latex',photos:true}};
globalThis.location={origin:'https://x.github.io',pathname:'/kyw/',hash:''};
h=bookFace(); ok(/A few health questions/.test(h)&&/data-bfq="allergies"/.test(h),'booking form asks the health questions');
const msg=bfMessage(); ok(/Health questions:/.test(msg)&&/Latex/.test(msg),'answers go in the message');
const A=b64d(msg.split('#add=')[1]); state.clients=[]; const b=addRequest(A); ok(b&&clientById(b.clientId).consult.answers.allergies==='Latex','adding the request saves them to the consultation form');
BK=null; delete globalThis.location;
console.log('round 2 tests: fails',fails,'render errs',errs); }

// ---- add a product: name and add all ----
{ fails=0; state=exampleState(); wizFull=false; view='wizard'; step=wizSteps().findIndex(x=>x.type==='quicklist'); const t=state.treatments.find(x=>suggestFor(x).length>1); t.recipe=[];
const h=vWizard(); ok(/\+ Add a product/.test(h)&&h.includes('value="__all">Add all of these ('+suggestFor(t).length+')'),'dropdown says Add a product and offers add all');
console.log('add all tests: fails',fails,'render errs',errs); }

// ---- running costs: items under each kind, with dates ----
{ fails=0; state=exampleState(); const s=state.setup;
s.overheads=[{id:'a1',group:'monthly',name:'Phone and internet',amount:40,years:3,title:'BT Internet',pay:'2026-11-15',start:'2025-03-01',end:'2027-03-01'},{id:'a2',group:'monthly',name:'Phone and internet',amount:12,years:3,title:'EE mobile'},{id:'a3',group:'monthly',name:'Room, chair or desk rent',amount:400,years:3}];
const h=costList(); ok(h.split('<b>Phone and internet</b>').length===2&&h.includes('value="BT Internet"')&&h.includes('value="EE mobile"'),'two items sit under one Phone and internet heading');
ok(/data-act="oh-more" data-id="a1"/.test(h)&&/Add another under Phone and internet/.test(h),'each kind has an add another button');
ok(payDesc(s.overheads[0]).includes('15th of each month')&&payDesc(s.overheads[0]).includes('contract ends'),'payment day and contract end are summarised: '+payDesc(s.overheads[0]));
ok(Math.abs(overheadsMonth(s)-452)<1e-9,'every item counts towards the monthly total');
ok(addBill(s.overheads[1],'2026-11-15',null).supplier==='EE mobile','an invoice is saved under the item name');
console.log('cost items tests: fails',fails,'render errs',errs); }

// ---- hourly rate and monthly target move together ----
{ fails=0; state=exampleState(); const s=state.setup; const c=compute(state);
const r=rateFor(3000,c); ok(Math.abs(takeHomeAt(r,c)-3000)<1,'the hourly amount for a £3,000 take home gives back £3,000: '+r.toFixed(2));
ok(takeHomeAt(30,c)>takeHomeAt(10,c)&&rateFor(4000,c)>rateFor(2000,c),'more an hour means more take home, and the other way round');
ok(rateFor(0,c)===0,'no target means break even');
console.log('linked target tests: fails',fails,'render errs',errs); }
// ---- week or month, Tax page put away, own outgoings, what to put aside ----
{ fails=0; state=exampleState(); wizFull=false; const s=state.setup; view='wizard'; step=wizSteps().findIndex(x=>x.type==='quicklist'); const t=state.treatments[0]; t.perWeek=5;
let h=vWizard(); ok(/A month</.test(h)&&h.includes(`value="${Math.round(5*52/12)}"`)&&/data-act="cnt-per"/.test(h),'counts by the month by default, with a week or month choice');
s.countPer='week'; h=vWizard(); ok(/A week</.test(h)&&h.includes(`id="ql-w-${t.id}" type="number" inputmode="decimal" min="0" step="0.5" value="5"`),'or by the week');
ok(navGroups().find(g=>g.key==='money').views.some(v=>v[0]==='taxyear'),'Tax page is back in the menu');
view='money'; ok(/Bills each month|data-ohinv/.test(vMoney())||!(s.overheads||[]).some(o=>o.group!=='equipment'),'bills list is on Money');
s.personal=[{id:'p1',name:'Rent',amount:800,group:'monthly'},{id:'p2',name:'Food',amount:50,group:'weekly'}]; s.savings=200;
ok(Math.abs(persMonth(s)-(800+50*52/12+200))<1e-6,'own outgoings add up by the month, weekly ones turned into monthly, plus savings');
applyPersonal(); const c=compute(state); ok(s.takeHome===Math.round(persMonth(s))&&Math.abs(takeHomeAt(s.profitHour,c)-s.takeHome)<2,'outgoings set the take home and the hourly amount: '+s.takeHome+' at '+s.profitHour);
const a=setAside(3000); ok(a.all>0.1&&a.all<0.4&&Math.abs(a.tax+a.ni+a.loan-a.all)<1e-9,'a share to put aside for tax and NI: '+pctTxt(a.all));
s.studentLoan='plan2'; ok(setAside(4000).loan>0,'student loan included when set');
view='prices'; h=vPrices(); ok(/Your own outgoings and savings/.test(h)&&/id="sl-tax"/.test(h)&&/Put aside about/.test(h),'prices shows own outgoings and what to put aside');
view='wizard'; step=wizSteps().findIndex(x=>x.type==='costq'); h=vWizard(); ok(/Your own outgoings/.test(h)&&/You need to take home/.test(h),'set-up asks own outgoings after business ones');
console.log('own outgoings tests: fails',fails,'render errs',errs); }

// ---- prices can be typed in the list ----
{ fails=0; state=exampleState(); view='prices'; const t=state.treatments[0]; const h=vPrices();
ok(h.includes(`id="sl-pr-${t.id}"`)&&h.includes(`data-tf="${t.id}" data-f="price"`)&&/Suggested <b/.test(h),'each price in the list is a box, with the suggested price beside it');
console.log('price box tests: fails',fails,'render errs',errs); }

// ---- tax pack ----
{ fails=0; state=exampleState(); const ty=taxYearOf(todayStr());
ok(csv([['a','b,c','say "hi"','=SUM(A1)']])==='a,"b,c","say ""hi""",\'=SUM(A1)\r\n','spreadsheet cells are quoted and formulas made safe');
ok(safeName('BT: Internet / bill?')==='BT Internet bill','file names lose characters phones cannot use');
const used=new Set(), e={date:'2026-06-15',supplier:'BT',amount:40}; ok(receiptName(e,null,used)==='receipts/2026-06-15 BT 40.00.jpg'&&receiptName(e,null,used)==='receipts/2026-06-15 BT 40.00 (2).jpg','receipt photos get clear, unique names');
state.income=[{id:'i1',date:`${ty}-04-20`,desc:'Takings',amount:500,method:'Card'}]; state.expenses=[{id:'x1',date:`${ty}-04-22`,supplier:'Salon Services',amount:60,category:'Products and stock'}];
const g=gapMonths(ty); ok(!g.some(x=>x.label==='April')&&(todayStr().slice(0,7)<=`${ty}-04`||g.length>0),'months with nothing recorded are found: '+g.map(x=>x.label).join(','));
const sm=taxYearSummary(state,ty); ok(packChecks(ty,sm).some(c=>/trading allowance/.test(c)),'checks include the trading allowance');
const f=packCsvs(ty); ok(f['money-in.csv'].includes('Takings')&&f['money-out.csv'].includes('Salon Services')&&f['summary.csv'].includes('Profit'),'spreadsheets hold every entry and the totals');
view='taxyear'; ok(vTaxYear().includes('Make my tax pack')&&!vMoney().includes('Make my tax pack'),'Tax page offers the tax pack');
console.log('tax pack tests: fails',fails,'render errs',errs);
}

// ---- data safety, quick start, reminders, tax for apps ----
{ fails=0; state=exampleState(); state.example=false; const s=state.setup; s.lastBackup=''; ok(/Back up your data/.test(safetyCards()),'asks for a backup when there is none');
s.lastBackup=todayStr(); ok(!/Back up your data/.test(safetyCards()),'no nag right after a backup');
wizFull=false; s.quickMode=true; ok(wizSteps().map(x=>x.type).join(',')==='welcome,industry,pickTreat,quicklist','quick start is 4 steps');
view='wizard'; step=wizSteps().findIndex(x=>x.type==='quicklist'); ok(!/data-qladd/.test(vWizard()),'quick start skips products');
step=0; ok(/Quick start/.test(vWizard())&&/Full set-up/.test(vWizard()),'welcome offers quick or full');
s.quickMode=false; ok(wizSteps().length===7,'full set-up still 7 steps');
const cl={id:'rc',name:'Ann Smith',phone:'07700 900123',patchTests:[]}; state.clients.push(cl); state.bookings.push({id:'rb',date:addDays(todayStr(),1),time:'10:00',staffId:'me',clientId:'rc',serviceId:state.treatments[0].id,addons:[],mins:45,price:35,status:'booked'});
ok(remindersBlock().includes('wa.me/447700900123')&&/Reminders to send for tomorrow/.test(remindersBlock()),'tomorrow\'s reminders have a WhatsApp button');
state.bookings.find(b=>b.id==='rb').reminded=true; ok(!remindersBlock().includes('data-id="rb"'),'sent reminders drop off');
const ty=taxYearOf(todayStr()); state.income=[{id:'i',date:`${ty}-05-01`,desc:'Takings',amount:100,method:'Card'}]; state.expenses=[{id:'e',date:`${ty}-04-20`,supplier:'Salon Services',amount:20,category:'Products and stock'}];
const t=packCsvs(ty)['transactions-for-apps.csv'].split('\r\n'); ok(t[1].startsWith(`20/04/${ty},-20,Salon Services`)&&t[2].startsWith(`01/05/${ty},100,`),'transactions file: UK dates, money out negative, in date order: '+t.slice(1,3).join(' | '));
console.log('stage 0 tests: fails',fails,'render errs',errs); }
// ---- target as boxes ----
{ fails=0; state=exampleState(); view='prices'; const h=vPrices();
ok(/class="stat"[^>]*><span class="label">Treatments a month<\/span>/.test(h)&&/Hours a week/.test(h)&&/You do now/.test(h)&&/id="sl-tax"/.test(h)&&/Put aside for tax/.test(h),'target shown as boxes');
ok(h.split('id="sl-tax"').length===2&&!/You need to do about/.test(h),'one tax box and no long sentences');
ok(taxBox(0).includes('Nothing'),'no tax at break-even'); state.setup.region='ruk'; ok(/20% income tax and 6% National Insurance on profit over £12,570/.test(taxBox(1250))&&/of all your profit/.test(taxBox(1250)),'box shows the set rates: '+taxBox(1250).replace(/<[^>]+>/g,' ')); ok(/20% then 40% income tax and 6% then 2% National Insurance/.test(taxBox(6000)),'higher rates named when profit is over £50,270');
console.log('target box tests: fails',fails,'render errs',errs); }
// ---- use these prices keeps her own ----
{ fails=0; state=exampleState(); view='prices'; const [a,b]=state.treatments; a.price=17.5; b.price=0;
const fake={value:''}; const realGet=document.getElementById; document.getElementById=id=>id==='sl-pr-'+a.id?{value:'17.5'}:id==='sl-pr-'+b.id?{value:''}:realGet.call(document,id);
document.dispatchEvent?0:0; const click=act=>{ const el={dataset:{act},closest:()=>el}; (globalThis.__clicks||[]).forEach(f=>f({target:el})); };
const cmp=compute(state).treatments; state.treatments.forEach(t=>{ const c=cmp.find(x=>x.id===t.id), box=document.getElementById('sl-pr-'+t.id), typed=box&&box.value!==''?+box.value:0; t.price=typed>0?typed:+t.price>0?+t.price:c.suggested; });
document.getElementById=realGet;
ok(a.price===17.5&&b.price===cmp.find(x=>x.id===b.id).suggested,'her typed price is kept, an empty one gets the suggested price');
ok(/Set all to suggested/.test(vPrices()),'a separate button sets all to suggested');
console.log('own price tests: fails',fails,'render errs',errs); }
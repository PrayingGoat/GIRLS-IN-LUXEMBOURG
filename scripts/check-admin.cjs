// Admin menu, welcome view and membership requests, with mocked API responses (no database writes).
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge'});const d='test-results/';require('node:fs').mkdirSync(d,{recursive:true});const base=process.env.TEST_BASE_URL||'http://localhost:5173';
const errors=[];const posted=[];
let requests=[{id:'edb77e90-bf1b-441c-9c7b-ed6eae3a6401',first_name:'Lea',last_name:'Martin',email:'lea@example.com',whatsapp:'+352621123456',status:'pending',created_at:'2026-11-10T09:30:00Z',consented_at:'2026-11-10T09:30:00Z'},{id:'aab77e90-bf1b-441c-9c7b-ed6eae3a6402',first_name:'Sara',last_name:'Costa',email:'sara@example.com',whatsapp:'+33612345678',status:'contacted',created_at:'2026-11-08T18:00:00Z'}];
async function open(width){const p=await b.newPage({viewport:{width,height:900}});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/admin?action=**',async route=>{const a=new URL(route.request().url()).searchParams.get('action');const body=route.request().postData();if(body)posted.push([a,JSON.parse(body)]);
  const json=x=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)});
  if(a==='session')return json({authenticated:true});
  if(a==='community-stats')return json({stats:{instagram:1,tiktok:2,whatsapp:3,linkedin:4,updated_at:new Date().toISOString()}});
  if(a.startsWith('requests'))return json({requests,total:requests.length,page:1,pageSize:25,stats:[{status:'pending',count:requests.filter(r=>r.status==='pending').length},{status:'contacted',count:1}]});
  if(a==='request-delete'){requests=requests.filter(r=>r.id!==JSON.parse(body).id);return json({deleted:1})}
  if(a==='status')return json({request:JSON.parse(body)});
  if(a.startsWith('messages'))return json({messages:[],total:0,page:1,pageSize:25});
  if(a.startsWith('feedback'))return json({feedback:[],total:0,page:1,pageSize:25,average:null});
  if(a==='images')return json({images:[]});
  if(a==='storage')return json({total:null,categories:{}});
  if(a==='library')return json({items:[]});
  return json({});
 });
 await p.goto(base+'/admin',{waitUntil:'networkidle'});return p}
const p=await open(1440);
// Welcome view first, other sections hidden.
assert.equal(await p.locator('.admin-welcome').isVisible(),true);
assert.equal(await p.locator('.admin-view:visible').count(),1);
assert.equal(await p.locator('.admin-sidebar a').count(),9);
assert.equal(await p.locator('.admin-sidebar svg').count(),9);
assert.equal(await p.locator('[data-view-link="home"]').getAttribute('aria-current'),'page');
await p.waitForFunction(()=>document.querySelector('.admin-welcome-art img').naturalWidth>0);
await p.screenshot({path:d+'admin-home.png'});
// Pending badge.
await p.waitForFunction(()=>document.querySelector('[data-badge="requests"]').textContent==='1');
// Open membership requests.
await p.click('[data-view-link="requests"]');
assert.equal(await p.locator('.admin-requests').isVisible(),true);assert.equal(await p.locator('.admin-welcome').isVisible(),false);
assert.match(p.url(),/#requests$/);
await p.locator('#requests-list li').first().waitFor();
assert.equal(await p.locator('#requests-list li').count(),2);
assert.equal(await p.locator('.admin-request-whatsapp').first().getAttribute('href'),'https://wa.me/352621123456');
assert.match(await p.locator('#requests-summary').innerText(),/Pending: 1/);
await p.screenshot({path:d+'admin-requests.png'});
// Status change and two-click delete.
await p.locator('#requests-list select').first().selectOption('added');
await p.waitForFunction(()=>document.getElementById('requests-status').textContent==='Status saved.');
assert.deepEqual(posted.find(x=>x[0]==='status')[1],{id:'edb77e90-bf1b-441c-9c7b-ed6eae3a6401',status:'added'});
const del=p.locator('#requests-list .admin-delete').last();await del.click();await del.click();
await p.waitForFunction(()=>document.querySelectorAll('#requests-list li').length===1);
assert.deepEqual(posted.find(x=>x[0]==='request-delete')[1],{id:'aab77e90-bf1b-441c-9c7b-ed6eae3a6402'});
// Every menu item opens exactly its section.
for(const v of ['messages','feedback','numbers','images','library','cleanup','password','home']){await p.click(`[data-view-link="${v}"]`);await p.locator(`.admin-view[data-view="${v}"]`).waitFor({state:"visible",timeout:3000});assert.equal(await p.locator('.admin-view:visible').count(),1,v);assert.equal(await p.locator(`.admin-view[data-view="${v}"]`).isVisible(),true,v)}
// Direct link to a section survives a reload.
await p.goto(base+'/admin#cleanup',{waitUntil:'networkidle'});assert.equal(await p.locator('.admin-cleanup').isVisible(),true);
// Mobile: menu becomes a horizontal strip, no page overflow.
const m=await open(390);assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await m.screenshot({path:d+'admin-mobile.png'});
assert.deepEqual(errors,[]);console.log('PASS admin menu, welcome view, membership requests and mobile layout');await b.close()})().catch(e=>{console.error(e);process.exit(1)});

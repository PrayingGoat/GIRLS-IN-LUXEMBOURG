// Admin UI check with mocked API responses: nothing reaches the real database.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge'});const d='test-results/';require('node:fs').mkdirSync(d,{recursive:true});const base=process.env.TEST_BASE_URL||'http://localhost:5173';
const p=await b.newPage({viewport:{width:1300,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
const posted=[];let feedback=[{id:'edb77e90-bf1b-441c-9c7b-ed6eae3a6401',rating:4,groups:['bookclub'],working:'Lovely events',better:'',testimony:'no',name:'',phone:'',email:'',status:'new',created_at:'2026-11-11T00:00:00Z'}];
await p.route('**/api/admin?action=**',async route=>{const u=new URL(route.request().url());const a=u.searchParams.get('action');const body=route.request().postData();if(body)posted.push([a,JSON.parse(body)]);
 const json=x=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)});
 if(a==='session')return json({authenticated:true});
 if(a==='community-stats')return json({stats:{instagram:1,tiktok:2,whatsapp:3,linkedin:4,updated_at:new Date().toISOString()}});
 if(a.startsWith('messages'))return json({messages:[],total:0,page:1,pageSize:25});
 if(a.startsWith('feedback&')||a==='feedback')return json({feedback,total:feedback.length,page:1,pageSize:25,average:{rating:4,count:1}});
 if(a==='feedback-delete'){feedback=[];return json({deleted:1})}
 if(a==='images')return json({images:[]});
 if(a==='storage')return json({total:{dataBytes:60736280,storageBytes:112500736,indexBytes:450560},categories:{messages:{count:0,bytes:0},feedback:{count:feedback.length,bytes:228},requests:{count:0,bytes:0},customImages:{count:0,bytes:0},unusedImages:{count:56,bytes:30950138},technical:{count:0,bytes:0}}});
 if(a==='cleanup')return json({deleted:56,message:'56 items deleted from the online database.'});
 if(a==='password')return json({message:'Password changed. Other devices have been signed out.'});
 return json({});
});
await p.goto(base+'/admin#cleanup',{waitUntil:'networkidle'});
await p.locator('.admin-cleanup-row').first().waitFor();
assert.equal(await p.locator('.admin-cleanup-row').count(),6);
assert.match(await p.locator('#cleanup-total').innerText(),/57\.9 MB/);
const unused=p.locator('.admin-cleanup-row').nth(4);
assert.match(await unused.innerText(),/56 items · 29\.5 MB/);
await unused.getByRole('button',{name:'Delete'}).click();
const confirm=unused.getByRole('button',{name:'Confirm deletion'});
assert.equal(await confirm.isDisabled(),true,'disabled until DELETE is typed');
await unused.locator('input').fill('delete');assert.equal(await confirm.isDisabled(),true);
await unused.locator('input').fill('DELETE');await confirm.click();
await p.waitForFunction(()=>document.getElementById('cleanup-status').textContent.includes('56 items deleted'));
assert.deepEqual(posted.find(x=>x[0]==='cleanup')[1],{category:'unusedImages',olderThanDays:0,confirm:'DELETE'});
// Per-item delete on feedback needs two clicks.
await p.click('[data-view-link="feedback"]');await p.locator('#feedback-list .admin-delete').waitFor();
const del=p.locator('#feedback-list .admin-delete');await del.click();assert.equal(await del.textContent(),'Click again to delete');await del.click();
await p.waitForFunction(()=>document.querySelectorAll('#feedback-list li').length===0);
assert.deepEqual(posted.find(x=>x[0]==='feedback-delete')[1],{id:'edb77e90-bf1b-441c-9c7b-ed6eae3a6401'});
// Password form validation and success.
await p.click('[data-view-link="password"]');await p.locator('#password-form').waitFor();
await p.fill('#password-current','Current-password-123');await p.fill('#password-next','short');await p.fill('#password-confirm','short');await p.click('#password-save');
assert.match(await p.locator('#password-status').innerText(),/at least 14/);
await p.fill('#password-next','A-much-longer-new-password');await p.fill('#password-confirm','A-much-longer-new-password');await p.click('#password-save');
await p.waitForFunction(()=>document.getElementById('password-status').textContent.includes('Password changed'));
assert.deepEqual(posted.find(x=>x[0]==='password')[1],{current:'Current-password-123',next:'A-much-longer-new-password'});
await p.click('[data-view-link="cleanup"]');await p.locator('.admin-cleanup').waitFor();await unused.getByRole('button',{name:'Delete'}).click().catch(()=>{});
const top=await p.locator('.admin-cleanup').boundingBox(),bottom=await p.locator('.admin-password').boundingBox();
await p.locator('.admin-cleanup').screenshot({path:d+'admin-cleanup.png'});await p.click('[data-view-link="password"]');await p.locator('.admin-password').waitFor();await p.locator('.admin-password').screenshot({path:d+'admin-password.png'});
assert.deepEqual(errors,[]);console.log('PASS admin cleanup, per-item delete and password UI');await b.close()})().catch(e=>{console.error(e);process.exit(1)});

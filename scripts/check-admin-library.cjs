// Admin photo library with mocked API responses (no database writes): grid, filters, selection,
// viewer, protected photos and the "replace it first" path to Website images.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.TEST_BASE_URL||'http://localhost:5173';const d='test-results/';fs.mkdirSync(d,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'msedge'});const errors=[];const posted=[];
let items=[
 {path:'assets/community-halloween.webp',size:310000,type:'image/webp',createdAt:'2026-11-11T10:00:00Z',version:'a1',usedBy:[{slot:'index-photo-8',label:'Home › Hero slideshow › Slide 5 - Halloween party'}]},
 {path:'assets/community-bookclub.webp',size:250000,type:'image/webp',createdAt:'2026-11-11T09:00:00Z',version:'a2',usedBy:[{slot:'community-photo-3',label:'Our community › Circles › BookClub'}]},
 {path:'assets/brand-final.webp',size:26000,type:'image/webp',createdAt:'2026-10-29T10:00:00Z',version:'a3',usedBy:[]},
 {path:'assets/brand-favicon.png',size:5000,type:'image/png',createdAt:'2026-10-29T10:00:00Z',version:'a4',usedBy:[]},
 {path:'photos/meetTheTeam.jpeg',size:341000,type:'image/jpeg',createdAt:'2026-10-20T10:00:00Z',version:'a5',usedBy:[]}];
const p=await b.newPage({viewport:{width:1300,height:900}});p.on('pageerror',e=>errors.push(e.message));
await p.route('**/api/admin?action=**',async route=>{const u=new URL(route.request().url());const a=u.searchParams.get('action');const body=route.request().postData();if(body)posted.push([a,JSON.parse(body)]);
 const json=(x,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(x)});
 if(a==='thumb'){const path=u.searchParams.get('path');const local=fs.existsSync(path)?path:'assets/community-0-small.webp';return route.fulfill({status:200,contentType:path.endsWith('.png')?'image/png':path.endsWith('.jpeg')?'image/jpeg':'image/webp',body:fs.readFileSync(local)})}
 if(a==='session')return json({authenticated:true});
 if(a==='library')return json({items});
 if(a==='library-delete'){const paths=JSON.parse(body).paths;const used=items.filter(i=>paths.includes(i.path)&&i.usedBy.length).map(i=>({path:i.path,usedBy:i.usedBy}));if(used.length)return json({message:'Some photos are used on the website.',used},409);items=items.filter(i=>!paths.includes(i.path));return json({deleted:paths.length,message:`${paths.length} photos deleted from the online database.`})}
 if(a==='images')return json({images:[]});
 if(a.startsWith('requests'))return json({requests:[],total:0,page:1,pageSize:25,stats:[]});
 return json({});
});
await p.goto(base+'/admin#library',{waitUntil:'networkidle'});
await p.locator('.library-tile').first().waitFor();
assert.equal(await p.locator('.library-tile').count(),5);
assert.equal(await p.locator('.library-month').count(),2,'grouped by month');
assert.equal(await p.locator('.library-badge').count(),2,'photos on the website are marked');
await p.waitForFunction(()=>[...document.querySelectorAll('.library-tile img')].every(i=>i.complete&&i.naturalWidth>0));
await p.locator('.admin-library').screenshot({path:d+'admin-library.png'});
// Filters.
await p.click('[data-filter="unused"]');assert.equal(await p.locator('.library-tile').count(),3);
await p.click('[data-filter="used"]');assert.equal(await p.locator('.library-tile').count(),2);
await p.click('[data-filter="all"]');
// Viewer of a used photo lists where it is used, with Replace.
await p.locator('.library-tile').first().click();
assert.equal(await p.locator('#library-dialog').isVisible(),true);
assert.match(await p.locator('.library-usage').innerText(),/Slide 5 - Halloween party/);
await p.locator('#library-dialog').screenshot({path:d+'admin-library-viewer.png'});
await p.click('#library-dialog .library-link');
// Select a used photo and two unused ones, then delete: the warning appears.
await p.click('#library-select');
assert.equal(await p.locator('#library-actionbar').isVisible(),true);
const tile=path=>p.locator(`.library-tile[data-path="${path}"]`);
await tile('assets/community-halloween.webp').click();await tile('assets/brand-final.webp').click();await tile('photos/meetTheTeam.jpeg').click();
assert.match(await p.locator('#library-selected').innerText(),/3 selected/);
await p.click('#library-delete');await p.locator('#library-dialog .admin-danger').click();
await p.locator('.library-used').waitFor();
assert.match(await p.locator('#library-dialog-title').innerText(),/used on the website/);
assert.match(await p.locator('.library-used').innerText(),/Slide 5 - Halloween party/);
await p.locator('#library-dialog').screenshot({path:d+'admin-library-warning.png'});
// "Delete the 2 others only" leaves the used photo in place.
await p.getByRole('button',{name:'Delete the 2 others only'}).click();
await p.waitForFunction(()=>document.querySelectorAll('.library-tile').length===3);
assert.deepEqual(posted.filter(x=>x[0]==='library-delete').pop()[1],{paths:['assets/brand-final.webp','photos/meetTheTeam.jpeg']});
assert.equal(await tile('assets/community-halloween.webp').count(),1);
// "Select all unused" picks only unused photos.
await p.click('#library-select');await p.click('#library-select-unused');
assert.match(await p.locator('#library-selected').innerText(),/1 selected/);
await p.click('#library-select');
// "Replace it" opens the right slot in Website images.
await tile('assets/community-bookclub.webp').click();
await p.locator('.library-replace').click();
await p.waitForFunction(()=>location.hash==='#images');
await p.locator('.media-editor[data-slot="community-photo-3"] details[open]').waitFor({timeout:8000});
assert.equal(await p.locator('.admin-media').isVisible(),true);
// Mobile layout: three columns, no page overflow.
await p.setViewportSize({width:390,height:844});await p.goto(base+'/admin#library',{waitUntil:'networkidle'});await p.locator('.library-tile').first().waitFor();
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.deepEqual(errors,[]);console.log('PASS admin photo library: grid, filters, viewer, selection, in-use warning, replace and mobile');await b.close()})().catch(e=>{console.error(e);process.exit(1)});

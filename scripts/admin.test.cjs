const test=require('node:test'),assert=require('node:assert/strict');
const {scryptSync}=require('node:crypto'),{verifyPassword,sessionToken}=require('../lib/admin-auth.cjs');
const password='Test-only-admin-password',encoded='scrypt:testing-salt:'+scryptSync(password,'testing-salt',64).toString('hex');
const repository=require('../lib/store.cjs'),original=repository.getStore;let authorized=false,attempts=1,savedHash,stats,statusUpdate,accesses=0;
repository.getStore=async()=>{accesses++;return{
 consumeLimit:async()=>attempts,createSession:async hash=>{savedHash=hash},hasSession:async()=>authorized,
 setStats:async values=>{stats=values;return values},setMemberStatus:async(id,status)=>{statusUpdate={id,status};return statusUpdate},
 ...globalThis.extraStore
}};
const handler=require('../api/admin.js');
function res(){return{statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(text){this.body=JSON.parse(text)}}}
function req(action,method='GET',body){return{url:'/api/admin?action='+action,method,headers:{host:'localhost:5183',origin:'http://localhost:5183','content-type':'application/json'},socket:{remoteAddress:'127.0.0.1'},body}}
const old=process.env.ADMIN_PASSWORD_HASH;process.env.ADMIN_PASSWORD_HASH=encoded;
test.after(()=>{repository.getStore=original;if(old)process.env.ADMIN_PASSWORD_HASH=old;else delete process.env.ADMIN_PASSWORD_HASH});
test('password uses salted hash; incorrect passwords fail',()=>{assert.ok(verifyPassword(password,encoded));assert.equal(verifyPassword('wrong',encoded),false);assert.equal(verifyPassword(password,''),false)});
test('malformed cookies are rejected',()=>assert.equal(sessionToken({headers:{cookie:'gil_admin=bad'}}),null));
test('anonymous protected endpoints are blocked',async()=>{for(const action of ['requests','status','images','community-stats']){const r=res();await handler(req(action),r);assert.equal(r.statusCode,401)}});
test('cross-site mutation rejected before database access',async()=>{const r=res(),q=req('login','POST',{password});q.headers.origin='https://other.test';const count=accesses;await handler(q,r);assert.equal(r.statusCode,403);assert.equal(accesses,count)});
test('wrong password never issues a session',async()=>{const r=res();await handler(req('login','POST',{password:'incorrect'}),r);assert.equal(r.statusCode,401);assert.equal(r.headers['Set-Cookie'],undefined)});
test('login rate limit blocks even correct credentials',async()=>{attempts=11;const r=res();await handler(req('login','POST',{password}),r);assert.equal(r.statusCode,429);assert.equal(r.headers['Set-Cookie'],undefined);attempts=1});
test('correct password issues HttpOnly cookie and stores only a hash',async()=>{const r=res();await handler(req('login','POST',{password}),r);assert.equal(r.statusCode,200);assert.match(r.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);const token=r.headers['Set-Cookie'].match(/gil_admin=([^;]+)/)[1];assert.notEqual(savedHash,token);assert.equal(savedHash.length,64)});
test('expired session cannot access requests',async()=>{const r=res(),q=req('requests');q.headers.cookie='gil_admin='+'a'.repeat(64);await handler(q,r);assert.equal(r.statusCode,401)});
test('status update validated before storage',async()=>{authorized=true;const q=req('status','PATCH',{id:'edb77e90-bf1b-441c-9c7b-ed6eae3a6401',status:'added'});q.headers.cookie='gil_admin='+'a'.repeat(64);let r=res();await handler(q,r);assert.equal(r.statusCode,200);assert.deepEqual(statusUpdate,q.body);q.body.status='invalid';r=res();await handler(q,r);assert.equal(r.statusCode,422);authorized=false});
test('community counts require authentication and reject invalid values',async()=>{const q=req('community-stats','PATCH',{instagram:4500,tiktok:2200,whatsapp:950,linkedin:335});let r=res();await handler(q,r);assert.equal(r.statusCode,401);authorized=true;q.headers.cookie='gil_admin='+'a'.repeat(64);r=res();await handler(q,r);assert.equal(r.statusCode,200);assert.deepEqual(stats,q.body);q.body.instagram=-1;r=res();await handler(q,r);assert.equal(r.statusCode,422);authorized=false});

// Database cleanup and password stored in MongoDB.
test('cleanup, storage and password actions',async()=>{
 const calls=[];let dbHash=null;
 globalThis.extraStore=({
  listImages:async()=>[],
  getAdminPasswordHash:async()=>dbHash,setAdminPasswordHash:async h=>{dbHash=h;calls.push('set')},deleteOtherSessions:async()=>calls.push('others'),
  storageUsage:async()=>({total:null,categories:{messages:{count:2,bytes:10}}}),
  cleanup:async(category,olderThan)=>{calls.push(['cleanup',category,Boolean(olderThan)]);return 3}
 });
 const signed=(action,method,body)=>{const q=req(action,method,body);q.headers.cookie='gil_admin='+'a'.repeat(64);return q};
 // Anonymous access is refused.
 authorized=false;for(const [a,m] of [['storage','GET'],['cleanup','POST'],['password','POST']]){const r=res();await handler(req(a,m,{}),r);assert.equal(r.statusCode,401)}
 authorized=true;
 let r=res();await handler(signed('storage'),r);assert.equal(r.statusCode,200);assert.equal(r.body.categories.messages.count,2);
 r=res();await handler(signed('cleanup','POST',{category:'messages',olderThanDays:0}),r);assert.equal(r.statusCode,422,'confirmation required');
 r=res();await handler(signed('cleanup','POST',{category:'everything',olderThanDays:0,confirm:'DELETE'}),r);assert.equal(r.statusCode,422,'unknown category');
 r=res();await handler(signed('cleanup','POST',{category:'feedback',olderThanDays:90,confirm:'DELETE'}),r);assert.equal(r.statusCode,200);assert.equal(r.body.deleted,3);assert.deepEqual(calls.pop(),['cleanup','feedback',true]);
 // First login with the old environment hash moves it into the database.
 authorized=false;r=res();await handler(req('login','POST',{password}),r);assert.equal(r.statusCode,200);assert.equal(dbHash,encoded);
 authorized=true;
 r=res();await handler(signed('password','POST',{current:'wrong',next:'A-much-longer-new-password'}),r);assert.equal(r.statusCode,422);
 r=res();await handler(signed('password','POST',{current:password,next:'short'}),r);assert.equal(r.statusCode,422);
 r=res();await handler(signed('password','POST',{current:password,next:'A-much-longer-new-password'}),r);assert.equal(r.statusCode,200);
 assert.ok(verifyPassword('A-much-longer-new-password',dbHash));assert.ok(calls.includes('others'));
 // The database password now wins over the environment variable.
 authorized=false;r=res();await handler(req('login','POST',{password}),r);assert.equal(r.statusCode,401);
 r=res();await handler(req('login','POST',{password:'A-much-longer-new-password'}),r);assert.equal(r.statusCode,200);
 authorized=false;
});

// Regression: thumbnails must use the image bytes, not the Buffer's shared memory pool.
test('photo library thumbnails are valid images',async()=>{
 const sharp=require('sharp');
 const png=await sharp({create:{width:40,height:30,channels:3,background:'#d1037e'}}).png().toBuffer();
 const pooled=Buffer.from(png);// small Buffers share Node's memory pool, like the MongoDB driver's
 globalThis.extraStore={getAsset:async path=>path==='assets/x.png'?{path,content_type:'image/png',sha256:'abc',data:pooled}:null,listImages:async()=>[]};
 authorized=true;
 const q=req('thumb&w=360&path='+encodeURIComponent('assets/x.png'));q.headers.cookie='gil_admin='+'a'.repeat(64);
 const r={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(b){this.body=b}};
 await handler(q,r);
 assert.equal(r.statusCode,200);assert.equal(r.headers['Content-Type'],'image/webp');
 const meta=await sharp(r.body).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,40);
 const bad=req('thumb&path='+encodeURIComponent('../.env'));bad.headers.cookie='gil_admin='+'a'.repeat(64);
 const r2=res();await handler(bad,r2);assert.equal(r2.statusCode,400);
 authorized=false;
});

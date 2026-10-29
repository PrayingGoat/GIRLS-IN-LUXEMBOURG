const test=require('node:test'),assert=require('node:assert/strict');
const {scryptSync}=require('node:crypto'),{verifyPassword,sessionToken}=require('../lib/admin-auth.cjs');
const password='Test-only-admin-password',encoded='scrypt:testing-salt:'+scryptSync(password,'testing-salt',64).toString('hex');
const repository=require('../lib/store.cjs'),original=repository.getStore;let authorized=false,attempts=1,savedHash,stats,statusUpdate,accesses=0;
repository.getStore=async()=>{accesses++;return{
 consumeLimit:async()=>attempts,createSession:async hash=>{savedHash=hash},hasSession:async()=>authorized,
 setStats:async values=>{stats=values;return values},setMemberStatus:async(id,status)=>{statusUpdate={id,status};return statusUpdate}
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

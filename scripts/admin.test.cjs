const test=require('node:test'),assert=require('node:assert/strict');const {scryptSync}=require('node:crypto');
const {verifyPassword,sessionToken}=require('../lib/admin-auth.cjs');
const password='Test-only-admin-password',encoded='scrypt:testing-salt:'+scryptSync(password,'testing-salt',64).toString('hex');
const calls=[];let authorized=false;
const database=require('../lib/database.cjs');const original=database.getPool;
database.getPool=()=>({query:async(sql,params)=>{calls.push({sql,params});if(sql.includes('RETURNING attempts'))return {rows:[{attempts:1}]};if(sql.includes('SELECT token_hash'))return {rowCount:authorized?1:0,rows:[]};if(sql.includes('RETURNING id,status'))return {rowCount:1,rows:[{id:params[1],status:params[0]}]};return {rows:[],rowCount:0}}});
const handler=require('../api/admin.js');
function res(){return{statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(text){this.body=JSON.parse(text)}}}
function req(action,method='GET',body){return{url:'/api/admin?action='+action,method,headers:{host:'localhost:5183',origin:'http://localhost:5183','content-type':'application/json'},socket:{remoteAddress:'127.0.0.1'},body}}
const old=process.env.ADMIN_PASSWORD_HASH;process.env.ADMIN_PASSWORD_HASH=encoded;
test.after(()=>{database.getPool=original;if(old)process.env.ADMIN_PASSWORD_HASH=old;else delete process.env.ADMIN_PASSWORD_HASH});
test('password uses salted hash; incorrect passwords fail',()=>{assert.ok(verifyPassword(password,encoded));assert.equal(verifyPassword('wrong',encoded),false);assert.equal(verifyPassword(password,''),false)});
test('malformed cookies are rejected',()=>{assert.equal(sessionToken({headers:{cookie:'gil_admin=bad'}}),null)});
test('anonymous list and status requests are blocked',async()=>{for(const action of ['requests','status']){const r=res();await handler(req(action,action==='status'?'PATCH':'GET',{}),r);assert.equal(r.statusCode,401)}});
test('cross-site mutation rejected before database access',async()=>{const r=res(),q=req('login','POST',{password});q.headers.origin='https://other.test';const count=calls.length;await handler(q,r);assert.equal(r.statusCode,403);assert.equal(calls.length,count)});
test('wrong password never issues a session',async()=>{const r=res();await handler(req('login','POST',{password:'incorrect'}),r);assert.equal(r.statusCode,401);assert.equal(r.headers['Set-Cookie'],undefined)});
test('correct password issues HttpOnly cookie and stores only a hash',async()=>{const r=res();await handler(req('login','POST',{password}),r);assert.equal(r.statusCode,200);assert.match(r.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);const token=r.headers['Set-Cookie'].match(/gil_admin=([^;]+)/)[1];const insert=calls.findLast(c=>c.sql.includes('INSERT INTO admin_sessions'));assert.notEqual(insert.params[0],token);assert.equal(insert.params[0].length,64)});
test('expired session cannot access requests',async()=>{const r=res(),q=req('requests');q.headers.cookie='gil_admin='+'a'.repeat(64);await handler(q,r);assert.equal(r.statusCode,401)});
test('authenticated status update is parameterized and validated',async()=>{authorized=true;let q=req('status','PATCH',{id:'edb77e90-bf1b-441c-9c7b-ed6eae3a6401',status:'added'});q.headers.cookie='gil_admin='+'a'.repeat(64);let r=res();await handler(q,r);assert.equal(r.statusCode,200);assert.deepEqual(calls.findLast(c=>c.sql.startsWith('UPDATE membership')).params,['added',q.body.id]);q.body.status='invalid';r=res();await handler(q,r);assert.equal(r.statusCode,422);authorized=false});

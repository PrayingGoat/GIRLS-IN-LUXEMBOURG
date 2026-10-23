const test=require('node:test');const assert=require('node:assert/strict');
const {validateMembership}=require('../lib/membership.cjs');
const handler=require('../api/membership.js');
const valid={firstName:'Anne-Marie',lastName:"O'Connor",email:' TEST@example.com ',whatsapp:'+352 621 123 456',consent:true};
test('names, email and international number normalized',()=>{const r=validateMembership(valid);assert.deepEqual(r.errors,{});assert.equal(r.data.email,'test@example.com');assert.equal(r.data.whatsapp,'+352621123456')});
test('invalid fields and missing consent rejected',()=>{const r=validateMembership({firstName:'',lastName:'<script>',email:'not-email',whatsapp:'621123456',consent:false});assert.equal(Object.keys(r.errors).length,5)});
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=JSON.parse(v)}}}
test('GET cannot list applicants',async()=>{const res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.statusCode,405)});
test('cross-origin submissions rejected',async()=>{const res=response();await handler({method:'POST',headers:{host:'example.com',origin:'https://other.com'}},res);assert.equal(res.statusCode,403)});
test('server validates rather than trusting HTML fields',async()=>{const res=response();await handler({method:'POST',headers:{host:'localhost','content-type':'application/json'},body:{}},res);assert.equal(res.statusCode,422)});
test('missing database never reports success',async()=>{const prior=process.env.DATABASE_URL,other=process.env.POSTGRES_URL;delete process.env.DATABASE_URL;delete process.env.POSTGRES_URL;try{const res=response();await handler({method:'POST',headers:{host:'localhost','content-type':'application/json'},body:valid},res);assert.equal(res.statusCode,503);assert.ok(!JSON.stringify(res.body).includes('postgresql://'))}finally{if(prior)process.env.DATABASE_URL=prior;if(other)process.env.POSTGRES_URL=other}});

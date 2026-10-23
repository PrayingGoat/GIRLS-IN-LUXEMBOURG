const {randomBytes,createHmac}=require('node:crypto');
const {getPool}=require('../lib/database.cjs');
const {verifyPassword,sessionToken,tokenHash}=require('../lib/admin-auth.cjs');
module.exports=async function handler(req,res){
 const send=(code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.end(JSON.stringify(body));};
 const url=new URL(req.url,'http://localhost'),action=url.searchParams.get('action');
 const secure=Boolean(process.env.VERCEL)||req.socket?.encrypted||req.headers['x-forwarded-proto']==='https';
 const cookie=(token,age)=>res.setHeader('Set-Cookie',`gil_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure?'; Secure':''}`);
 if(!['GET','POST','PATCH'].includes(req.method)){res.setHeader('Allow','GET, POST, PATCH');return send(405,{message:'Method not allowed.'});}
 if(req.method!=='GET'){
  try{if(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host)return send(403,{message:'Please use the administrator page on this site.'});}catch{return send(403,{message:'Invalid origin.'});}
 }
 if(!process.env.ADMIN_PASSWORD_HASH)return send(503,{message:'Administrator access has not been configured yet.'});
 let body={};
 if(req.method!=='GET'){
  if(!(req.headers['content-type']||'').startsWith('application/json'))return send(415,{message:'JSON required.'});
  try{if(req.body!==undefined)body=typeof req.body==='string'?JSON.parse(req.body):req.body;else{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return send(413,{message:'Request too large.'});}body=JSON.parse(raw);}
   if(!body||typeof body!=='object'||Array.isArray(body)||Buffer.byteLength(JSON.stringify(body))>4096)throw Error();
  }catch{return send(400,{message:'Invalid request.'});}
 }
 try{
  const db=getPool();
  if(action==='login'&&req.method==='POST'){
   const ip=process.env.VERCEL?(req.headers['x-vercel-forwarded-for']||'unknown').split(',')[0].trim():req.socket?.remoteAddress||'local';
   const hash=createHmac('sha256',process.env.ADMIN_PASSWORD_HASH).update(ip).digest('hex');
   await db.query("DELETE FROM admin_login_limits WHERE window_start < now()-interval '1 day'");
   const limit=await db.query(`INSERT INTO admin_login_limits(key_hash,window_start,attempts) VALUES($1,now(),1) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN admin_login_limits.window_start < now()-interval '15 minutes' THEN 1 ELSE admin_login_limits.attempts+1 END,window_start=CASE WHEN admin_login_limits.window_start < now()-interval '15 minutes' THEN now() ELSE admin_login_limits.window_start END RETURNING attempts`,[hash]);
   if(limit.rows[0].attempts>10){res.setHeader('Retry-After','900');return send(429,{message:'Too many attempts. Try again in 15 minutes.'});}
   if(!verifyPassword(body.password,process.env.ADMIN_PASSWORD_HASH))return send(401,{message:'Incorrect administrator password.'});
   const token=randomBytes(32).toString('hex');
   await db.query('DELETE FROM admin_sessions WHERE expires_at < now()');
   await db.query("INSERT INTO admin_sessions(token_hash,expires_at) VALUES($1,now()+interval '8 hours')",[tokenHash(token)]);
   cookie(token,28800);return send(200,{authenticated:true});
  }
  const token=sessionToken(req);
  if(!token)return send(401,{message:'Please sign in.'});
  const session=await db.query('SELECT token_hash FROM admin_sessions WHERE token_hash=$1 AND expires_at>now()',[tokenHash(token)]);
  if(!session.rowCount){cookie('',0);return send(401,{message:'Your session has expired. Please sign in again.'});}
  if(action==='session'&&req.method==='GET')return send(200,{authenticated:true});
  if(action==='logout'&&req.method==='POST'){await db.query('DELETE FROM admin_sessions WHERE token_hash=$1',[tokenHash(token)]);cookie('',0);return send(200,{authenticated:false});}
  if(action==='requests'&&req.method==='GET'){
   const search=(url.searchParams.get('search')||'').trim().slice(0,120),status=url.searchParams.get('status')||'';
   if(status&&!['pending','contacted','added','declined'].includes(status))return send(400,{message:'Invalid status.'});
   const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page'),10)||1));
   const term='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
   const where="WHERE ($1='' OR status=$1) AND ($2='%%' OR concat_ws(' ', first_name,last_name,email,whatsapp) ILIKE $2)";
   const [rows,count,stats]=await Promise.all([
    db.query(`SELECT id,first_name,last_name,email,whatsapp,status,created_at,updated_at,consented_at,consent_version FROM membership_requests ${where} ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET $3`,[status,term,(page-1)*25]),
    db.query(`SELECT count(*)::int AS total FROM membership_requests ${where}`,[status,term]),
    db.query('SELECT status,count(*)::int AS count FROM membership_requests GROUP BY status')
   ]);
   return send(200,{requests:rows.rows,total:count.rows[0].total,page,pageSize:25,stats:stats.rows});
  }
  if(action==='status'&&req.method==='PATCH'){
   if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.id||'')||!['pending','contacted','added','declined'].includes(body.status))return send(422,{message:'Invalid request or status.'});
   const result=await db.query('UPDATE membership_requests SET status=$1,updated_at=now() WHERE id=$2 RETURNING id,status',[body.status,body.id]);
   if(!result.rowCount)return send(404,{message:'Request not found.'});
   return send(200,{request:result.rows[0]});
  }
  return send(404,{message:'Not found.'});
 }catch{return send(503,{message:'The database is unavailable. Check the connection and run the database migrations.'});}
};

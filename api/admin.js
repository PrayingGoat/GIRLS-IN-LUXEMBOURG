const {randomBytes,createHmac}=require('node:crypto');
const {getStore}=require('../lib/store.cjs');
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
 const bodyLimit=action==='image'?3000000:4096;
 let body={};
 if(req.method!=='GET'){
  if(!(req.headers['content-type']||'').startsWith('application/json'))return send(415,{message:'JSON required.'});
  try{if(req.body!==undefined)body=typeof req.body==='string'?JSON.parse(req.body):req.body;else{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>bodyLimit)return send(413,{message:'Request too large.'});}body=JSON.parse(raw);}
   if(!body||typeof body!=='object'||Array.isArray(body)||Buffer.byteLength(JSON.stringify(body))>bodyLimit)throw Error();
  }catch{return send(400,{message:'Invalid request.'});}
 }
 try{
  const db=await getStore();
  if(action==='login'&&req.method==='POST'){
   const ip=process.env.VERCEL?(req.headers['x-vercel-forwarded-for']||'unknown').split(',')[0].trim():req.socket?.remoteAddress||'local';
   const hash=createHmac('sha256',process.env.ADMIN_PASSWORD_HASH).update(ip).digest('hex');
   const attempts=await db.consumeLimit('admin_login_limits',hash);
   if(attempts>10){res.setHeader('Retry-After','900');return send(429,{message:'Too many attempts. Try again in 15 minutes.'});}
   if(!verifyPassword(body.password,process.env.ADMIN_PASSWORD_HASH))return send(401,{message:'Incorrect administrator password.'});
   const token=randomBytes(32).toString('hex');
   await db.createSession(tokenHash(token));
   cookie(token,28800);return send(200,{authenticated:true});
  }
  const token=sessionToken(req);
  if(!token)return send(401,{message:'Please sign in.'});
  const session=await db.hasSession(tokenHash(token));
  if(!session){cookie('',0);return send(401,{message:'Your session has expired. Please sign in again.'});}
  if(action==='session'&&req.method==='GET')return send(200,{authenticated:true});
  if(action==='logout'&&req.method==='POST'){await db.deleteSession(tokenHash(token));cookie('',0);return send(200,{authenticated:false});}
  if(action==='images'&&req.method==='GET'){
   const images=await db.listImages();
   return send(200,{images:images.map(require('../lib/site-images.cjs').publicImage)});
  }
  if(action==='image'&&req.method==='PATCH'){
   try{return send(200,await require('../lib/site-images.cjs').saveImage(db,body))}
   catch(error){if(error.status===422)return send(422,{message:error.message});throw error}
  }
  if(action==='community-stats'&&req.method==='GET'){
   const stats=await db.getStats();
   if(!stats)return send(503,{message:'Run the database migrations to configure community statistics.'});
   return send(200,{stats});
  }
  if(action==='community-stats'&&req.method==='PATCH'){
   if(!require('../lib/community-stats.cjs').validStats(body))return send(422,{message:'Enter four whole numbers between 0 and 1,000,000,000.'});
   const stats=await db.setStats(Object.fromEntries(['instagram','tiktok','whatsapp','linkedin'].map(key=>[key,body[key]])));
   if(!stats)return send(503,{message:'Run the database migrations before saving.'});
   return send(200,{stats});
  }
  if(action==='requests'&&req.method==='GET'){
   const search=(url.searchParams.get('search')||'').trim().slice(0,120),status=url.searchParams.get('status')||'';
   if(status&&!['pending','contacted','added','declined'].includes(status))return send(400,{message:'Invalid status.'});
   const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page'),10)||1));
   return send(200,await db.listMembers({search,status,page}));
  }
  if(action==='status'&&req.method==='PATCH'){
   if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.id||'')||!['pending','contacted','added','declined'].includes(body.status))return send(422,{message:'Invalid request or status.'});
   const request=await db.setMemberStatus(body.id,body.status);
   if(!request)return send(404,{message:'Request not found.'});
   return send(200,{request});
  }
  return send(404,{message:'Not found.'});
 }catch{return send(503,{message:'The database is unavailable. Check the connection and run the database migrations.'});}
};

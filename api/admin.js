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
 const bodyLimit=action==='image'?3000000:action==='library-delete'?65536:4096;
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
   // The password hash lives in MongoDB. ADMIN_PASSWORD_HASH is only read once, to move an old setup into the database.
   const stored=(await db.getAdminPasswordHash?.())||null;
   const passwordHash=stored||process.env.ADMIN_PASSWORD_HASH;
   if(!passwordHash)return send(503,{message:'Administrator access has not been configured yet. Run npm run admin:setup.'});
   const ip=process.env.VERCEL?(req.headers['x-vercel-forwarded-for']||'unknown').split(',')[0].trim():req.socket?.remoteAddress||'local';
   const hash=createHmac('sha256',process.env.RATE_LIMIT_SECRET||process.env.MONGODB_URI||passwordHash).update('admin:'+ip).digest('hex');
   const attempts=await db.consumeLimit('admin_login_limits',hash);
   if(attempts>10){res.setHeader('Retry-After','900');return send(429,{message:'Too many attempts. Try again in 15 minutes.'});}
   if(!verifyPassword(body.password,passwordHash))return send(401,{message:'Incorrect administrator password.'});
   if(!stored&&db.setAdminPasswordHash)await db.setAdminPasswordHash(passwordHash);
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
  if(action==='messages'&&req.method==='GET'){
   const reason=url.searchParams.get('reason')||'',status=url.searchParams.get('status')||'';
   if(reason&&!Object.hasOwn(require('../lib/contact.cjs').reasons,reason))return send(400,{message:'Invalid reason.'});
   if(status&&!['new','replied','archived'].includes(status))return send(400,{message:'Invalid status.'});
   const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page'),10)||1));
   return send(200,await db.listContactMessages({reason,status,page}));
  }
  if(action==='message-status'&&req.method==='PATCH'){
   if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.id||'')||!['new','replied','archived'].includes(body.status))return send(422,{message:'Invalid message or status.'});
   const message=await db.setContactMessageStatus(body.id,body.status);
   if(!message)return send(404,{message:'Message not found.'});
   return send(200,{message});
  }
  if(action==='password'&&req.method==='POST'){
   const current=await db.getAdminPasswordHash()||process.env.ADMIN_PASSWORD_HASH;
   if(!verifyPassword(body.current,current))return send(422,{message:'The current password is incorrect.',field:'current'});
   if(typeof body.next!=='string'||body.next.length<14||body.next.length>256)return send(422,{message:'Use a new password of 14 to 256 characters.',field:'next'});
   if(body.next===body.current)return send(422,{message:'Choose a password different from the current one.',field:'next'});
   const {hashPassword}=require('../lib/admin-auth.cjs');
   await db.setAdminPasswordHash(hashPassword(body.next));
   // Every other browser is signed out; this one stays signed in.
   await db.deleteOtherSessions(tokenHash(token));
   return send(200,{message:'Password changed. Other devices have been signed out.'});
  }
  if(action==='library'&&req.method==='GET'){
   const {currentUse}=require('../lib/library.cjs');
   const [items,custom]=await Promise.all([db.listLibrary(),db.listImages()]);
   return send(200,{items:items.map(i=>({path:i.path,size:i.size,type:i.content_type,createdAt:i.created_at,version:i.sha256?.slice(0,12),usedBy:currentUse(i.path,custom)}))});
  }
  if(action==='thumb'&&req.method==='GET'){
   const {validPath}=require('../lib/library.cjs');
   const path=url.searchParams.get('path'),width=url.searchParams.get('w')==='1400'?1400:360;
   if(!validPath(path))return send(400,{message:'Invalid image.'});
   const row=await db.getAsset(path);
   if(!row)return send(404,{message:'Image not found.'});
   const etag=`"${row.sha256}-${width}"`;
   res.setHeader('Cache-Control','private, max-age=86400');res.setHeader('ETag',etag);res.setHeader('X-Robots-Tag','noindex, nofollow');
   if(req.headers['if-none-match']===etag){res.statusCode=304;return res.end()}
   // The driver returns a Buffer (promoteBuffers) or a BSON Binary; never read Buffer.buffer, which is Node's shared memory pool.
   const raw=row.data;let data=Buffer.isBuffer(raw)?raw:Buffer.from(raw.buffer??raw),type=row.content_type;
   if(!/svg/.test(type)){try{data=await require('sharp')(data,{limitInputPixels:60000000}).rotate().resize({width,height:width,fit:'inside',withoutEnlargement:true}).webp({quality:width>400?84:72}).toBuffer();type='image/webp'}catch{}}
   res.statusCode=200;res.setHeader('Content-Type',type);res.setHeader('X-Content-Type-Options','nosniff');return res.end(data);
  }
  if(action==='library-delete'&&req.method==='POST'){
   const {currentUse,validPath}=require('../lib/library.cjs');
   const paths=Array.isArray(body.paths)?[...new Set(body.paths)]:[];
   if(!paths.length||paths.length>500||!paths.every(validPath))return send(422,{message:'Select the photos to delete.'});
   const custom=await db.listImages();
   // Never delete a photo the website is showing: the admin is asked to replace it first.
   const used=paths.map(path=>({path,usedBy:currentUse(path,custom)})).filter(u=>u.usedBy.length);
   if(used.length)return send(409,{message:'Some photos are used on the website.',used});
   const deleted=await db.deleteAssets(paths);
   return send(200,{deleted,message:`${deleted} photo${deleted===1?'':'s'} deleted from the online database.`});
  }
  if(action==='storage'&&req.method==='GET'){
   const {referencedImages}=require('../lib/cleanup.cjs');
   return send(200,await db.storageUsage(referencedImages(await db.listImages())));
  }
  if(action==='cleanup'&&req.method==='POST'){
   const {referencedImages,categories,ages}=require('../lib/cleanup.cjs');
   if(!categories.includes(body.category)||!ages.includes(body.olderThanDays))return send(422,{message:'Choose what to delete.'});
   if(body.confirm!=='DELETE')return send(422,{message:'Type DELETE to confirm.'});
   const olderThan=body.olderThanDays?new Date(Date.now()-body.olderThanDays*24*60*60*1000):null;
   const deleted=await db.cleanup(body.category,olderThan,referencedImages(await db.listImages()));
   return send(200,{deleted,message:`${deleted} item${deleted===1?'':'s'} deleted from the online database.`});
  }
  if(['message-delete','feedback-delete','request-delete'].includes(action)&&req.method==='POST'){
   if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.id||''))return send(422,{message:'Invalid item.'});
   const done=action==='message-delete'?await db.deleteContactMessage(body.id):action==='request-delete'?await db.deleteMember(body.id):await db.deleteFeedback(body.id);
   if(!done)return send(404,{message:'Already deleted.'});
   return send(200,{deleted:1});
  }
  if(action==='feedback'&&req.method==='GET'){
   const status=url.searchParams.get('status')||'';
   if(status&&!['new','read','archived'].includes(status))return send(400,{message:'Invalid status.'});
   const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page'),10)||1));
   return send(200,await db.listFeedback({status,page}));
  }
  if(action==='feedback-status'&&req.method==='PATCH'){
   if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.id||'')||!['new','read','archived'].includes(body.status))return send(422,{message:'Invalid feedback or status.'});
   const item=await db.setFeedbackStatus(body.id,body.status);
   if(!item)return send(404,{message:'Feedback not found.'});
   return send(200,{feedback:item});
  }
  return send(404,{message:'Not found.'});
 }catch{return send(503,{message:'The database is unavailable. Check the connection and run the database migrations.'});}
};

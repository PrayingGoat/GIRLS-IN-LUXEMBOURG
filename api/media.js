const {getDatabase}=require('../lib/database.cjs');
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end()}
 const url=new URL(req.url,'http://localhost');
 const file=url.searchParams.get('path')||url.pathname.slice(1);
 if(!/^assets\/[a-zA-Z0-9._-]+\.(webp|png|jpe?g|svg|gif|avif)$/i.test(file)){res.statusCode=404;return res.end()}
 try{
  const db=await getDatabase();const row=await db.collection('media_assets').findOne({path:file});
  if(!row){res.statusCode=404;return res.end()}
  const etag='"'+row.sha256+'"';
  res.setHeader('Content-Type',row.content_type);res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400');res.setHeader('ETag',etag);
  if(req.headers['if-none-match']===etag){res.statusCode=304;return res.end()}
  res.setHeader('Content-Length',row.data.length);
  return res.end(req.method==='HEAD'?undefined:row.data);
 }catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end('Image temporarily unavailable')}
};

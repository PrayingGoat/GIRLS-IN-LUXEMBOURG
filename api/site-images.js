const {getStore}=require('../lib/store.cjs');
const {slots,publicImage}=require('../lib/site-images.cjs');
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end()}
 const url=new URL(req.url,'http://localhost');const id=url.searchParams.get('id');
 try{
  if(id){
   if(!slots.some(s=>s.id===id)){res.statusCode=404;return res.end()}
   const row=await (await getStore()).getImage(id);
   if(!row?.image_data){res.statusCode=404;return res.end()}
   res.setHeader('Content-Type','image/webp');res.setHeader('Cache-Control',url.searchParams.has('v')?'public, max-age=31536000, immutable':'public, max-age=60, must-revalidate');res.setHeader('ETag',`"${row.version}"`);
   if(req.headers['if-none-match']===`"${row.version}"`){res.statusCode=304;return res.end()}
   return res.end(row.image_data);
  }
  const images=await (await getStore()).listImages();
  // The CDN answers instantly from its copy and refreshes it in the background, so visitors never wait for a cold start.
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=86400');res.end(JSON.stringify({images:images.map(publicImage)}));
 }catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:'Image customisation is temporarily unavailable.'}))}
};

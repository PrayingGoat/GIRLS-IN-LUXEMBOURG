const {getPool}=require('../lib/database.cjs');
const {slots,publicImage}=require('../lib/site-images.cjs');
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end()}
 const url=new URL(req.url,'http://localhost');const id=url.searchParams.get('id');
 try{
  if(id){
   if(!slots.some(s=>s.id===id)){res.statusCode=404;return res.end()}
   const result=await getPool().query('SELECT image_data,version FROM site_images WHERE slot_id=$1',[id]);const row=result.rows[0];
   if(!row?.image_data){res.statusCode=404;return res.end()}
   res.setHeader('Content-Type','image/webp');res.setHeader('Cache-Control','public, max-age=60, must-revalidate');res.setHeader('ETag',`"${row.version}"`);
   if(req.headers['if-none-match']===`"${row.version}"`){res.statusCode=304;return res.end()}
   return res.end(row.image_data);
  }
  const result=await getPool().query('SELECT slot_id,asset_path,alt_text,position_x,position_y,version,updated_at FROM site_images');
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({images:result.rows.map(publicImage)}));
 }catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:'Image customisation is temporarily unavailable.'}))}
};

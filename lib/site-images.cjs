const sharp=require('sharp');
const {randomUUID}=require('node:crypto');
const slots=require('../assets/media-slots.json');
const photos=require('../assets/community-photos.json');
const allowedAssets=new Set([...slots.map(s=>s.src),...photos.flatMap(p=>[p.full,p.small])]);
function publicImage(row){return {id:row.slot_id,src:row.asset_path||`/api/site-images?id=${encodeURIComponent(row.slot_id)}&v=${row.version}`,alt:row.alt_text,x:row.position_x,y:row.position_y,updatedAt:row.updated_at}}
async function saveImage(db,body){
 const fail=message=>{const e=new Error(message);e.status=422;throw e};
 if(!slots.some(s=>s.id===body.id))fail('Unknown image location.');
 if(body.reset===true){await db.deleteImage(body.id);return {reset:true}}
 if(typeof body.alt!=='string'||body.alt.length>300)fail('Use a description of 300 characters or fewer.');
 if(![body.x,body.y].every(n=>Number.isInteger(n)&&n>=0&&n<=100))fail('Choose a valid image position.');
 let buffer=null,asset=null;
 if(body.asset){if(!allowedAssets.has(body.asset))fail('Select an image from the library.');asset=body.asset}
 else if(typeof body.data==='string'){
  if(body.data.length>2800000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(body.data))fail('Choose a JPG, PNG or WebP image under 2 MB after optimisation.');
  try{const input=Buffer.from(body.data.split(',')[1],'base64');const meta=await sharp(input,{limitInputPixels:40000000}).metadata();if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1)fail('Use a still JPG, PNG or WebP image.');buffer=await sharp(input,{limitInputPixels:40000000}).rotate().resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toBuffer()}catch{fail('This file could not be read. Choose a still JPG, PNG or WebP image.')}
  if(buffer.length>2097152)fail('This image is too large. Choose a smaller file.');
 }else{
  const old=await db.getImage(body.id);
  if(old){buffer=old.image_data;asset=old.asset_path}else asset=slots.find(s=>s.id===body.id).src;
 }
 const result=await db.saveImage({slot_id:body.id,image_data:buffer,asset_path:asset,alt_text:body.alt,position_x:body.x,position_y:body.y,version:randomUUID()});
 return {image:publicImage(result)};
}
module.exports={slots,allowedAssets,publicImage,saveImage};

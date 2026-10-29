const fs=require('fs'),path=require('path'),{createHash}=require('crypto'),assert=require('assert/strict');
const {getDatabase,closeDatabase}=require('../lib/database.cjs');
const types={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.gif':'image/gif','.avif':'image/avif'};
(async()=>{try{
 const db=await getDatabase(),collection=db.collection('media_assets');await collection.createIndex({path:1},{unique:true});
 const report=[];let bytes=0;
 for(const dir of ['assets','photos']){
  for(const relative of fs.readdirSync(dir,{recursive:true})){
   const file=path.join(dir,relative),extension=path.extname(file).toLowerCase();
   if(!types[extension]||!fs.statSync(file).isFile())continue;
   const data=fs.readFileSync(file),key=file.replaceAll('\\','/'),sha256=createHash('sha256').update(data).digest('hex');
   assert(data.length<15*1024*1024,'Image exceeds document limit');
   // Never overwrite an asset changed on Atlas after the initial import.
   await collection.updateOne({path:key},{$setOnInsert:{path:key,data,sha256,content_type:types[extension],size:data.length,created_at:new Date()}},{upsert:true});
   const saved=await collection.findOne({path:key});
   assert.equal(createHash('sha256').update(saved.data).digest('hex'),sha256,'Checksum mismatch: '+key);
   bytes+=data.length;report.push({path:key,sha256,size:data.length});
   if(report.length%25===0)console.log(report.length+' images verified');
  }
 }
 fs.mkdirSync('.research',{recursive:true});fs.writeFileSync('.research/media-migration-report.json',JSON.stringify({count:report.length,bytes,files:report},null,2));
 console.log('VERIFIED '+report.length+' images, '+bytes+' bytes; all checksums match.');
}finally{await closeDatabase()}})().catch(e=>{console.error('Media migration failed:',e.name,e.code||'');process.exitCode=1});

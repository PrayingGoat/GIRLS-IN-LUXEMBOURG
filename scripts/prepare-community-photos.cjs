// Prepare every supplied photograph; never include videos or alter originals.
const fs=require('node:fs');
const sharp=require('sharp');
const originals=['igexport-DaIzHJbDJkZ.jpg','igexport-DbiyyU_jHvQ.jpg','igexport-DbP-22nDNl9.jpg','igexport-DcgoywmDIxA.jpg','igexport-DWwYZW6jAbr.jpg','igexport-DXoILcVjCb3.jpg','igexport-DZAbp9JDFyK.jpg','igexport-DZkwe9MjASr.jpg'];
const files=[...originals,...fs.readdirSync('photos').filter(n=>/\.(jpe?g|png|webp|avif)$/i.test(n)&&!originals.includes(n)).sort()];
(async()=>{
 const manifest=[];
 for(const [i,name] of files.entries()){
  const full=`assets/community-${i}.webp`,small=`assets/community-${i}-small.webp`;
  const info=await sharp(`photos/${name}`).rotate().resize({width:1400,withoutEnlargement:true}).webp({quality:86}).toFile(full);
  await sharp(`photos/${name}`).rotate().resize({width:640,withoutEnlargement:true}).webp({quality:82}).toFile(small);
  manifest.push({source:name,full,small,width:info.width,height:info.height});
 }
 fs.writeFileSync('assets/community-photos.json',JSON.stringify(manifest,null,2));
 console.log(`Prepared ${manifest.length} photos; videos excluded.`);
})().catch(e=>{console.error(e);process.exit(1)});

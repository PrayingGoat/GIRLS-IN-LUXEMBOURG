// Which stored images the public site can still request. Anything else in media_assets is unused.
const vercel=require('../vercel.json');
const slots=require('../assets/media-slots.json');
const photos=require('../assets/community-photos.json');
function referencedImages(customRows=[]){
 const paths=new Set();
 for(const rule of vercel.rewrites||[]){const m=/^\/(assets\/[^?]+)$/.exec(rule.source);if(m)paths.add(m[1])}
 for(const slot of slots)paths.add(slot.src);
 for(const photo of photos){paths.add(photo.full);paths.add(photo.small)}
 for(const row of customRows)if(row.asset_path)paths.add(row.asset_path);
 return paths;
}
const categories=['messages','feedback','requests','customImages','unusedImages','technical'];
const ages=[0,30,90,180,365];
module.exports={referencedImages,categories,ages};

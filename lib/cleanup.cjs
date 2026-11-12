// Which stored images the website shows right now. Anything else in media_assets is unused.
// Same rule as the photo library (lib/library.cjs): pages + slot defaults, minus replaced slots, plus chosen images.
const usage=require('../assets/image-usage.json');
const {currentUse}=require('./library.cjs');
function referencedImages(customRows=[]){
 const paths=new Set();
 for(const path of Object.keys(usage))if(currentUse(path,customRows).length)paths.add(path);
 for(const row of customRows)if(row.asset_path)paths.add(row.asset_path);
 return paths;
}
const categories=['messages','feedback','requests','customImages','unusedImages','technical'];
const ages=[0,30,90,180,365];
module.exports={referencedImages,categories,ages};

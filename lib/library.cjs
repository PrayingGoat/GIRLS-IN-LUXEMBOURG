// Admin photo library: where each stored image is shown on the live site right now.
const usage=require('../assets/image-usage.json');
const slots=require('../assets/media-slots.json');
const slotLabel=Object.fromEntries(slots.map(s=>[s.id,`${s.page} › ${s.section} › ${s.label}`]));
// customRows: the saved image choices (site_images), without their bytes.
function currentUse(path,customRows){
 const replaced=new Set(customRows.map(r=>r.slot_id));
 const list=[];
 // A slot replaced in "Website images" no longer shows its original image.
 for(const entry of usage[path]||[])if(!entry.slot||!replaced.has(entry.slot))list.push({slot:entry.slot,label:entry.label});
 for(const row of customRows)if(row.asset_path===path)list.push({slot:row.slot_id,label:`${slotLabel[row.slot_id]||row.slot_id} (chosen in Website images)`});
 const seen=new Set();
 return list.filter(e=>{const k=e.slot+'|'+e.label;if(seen.has(k))return false;seen.add(k);return true});
}
const validPath=p=>typeof p==='string'&&p.length>0&&p.length<=300&&/^(assets|photos)\//.test(p)&&!p.includes('..');
module.exports={currentUse,validPath};

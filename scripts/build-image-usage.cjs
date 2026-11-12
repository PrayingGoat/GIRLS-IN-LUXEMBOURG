// Lists where every image is used on the site, for the admin photo library (assets/image-usage.json).
// Run by build.cjs; run it again after changing images in the HTML pages.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const slots=require('../assets/media-slots.json');
const slotLabel=Object.fromEntries(slots.map(s=>[s.id,`${s.page} › ${s.section} › ${s.label}`]));
const pageName={'index.html':'Home','story.html':'About','community.html':'Our community','team.html':'The team','faq.html':'FAQ','contact.html':'Contact','partnerships.html':'Partnerships','policy.html':'Policy','events.html':'Events','join.html':'Join us','feedback.html':'Feedback','admin.html':'Admin space'};
const image=/assets\/[A-Za-z0-9._-]+\.(?:webp|png|jpe?g|svg|gif|avif)/g;
const usage={};
function add(file,entry){const list=usage[file]||(usage[file]=[]);if(!list.some(e=>e.slot===entry.slot&&e.label===entry.label))list.push(entry)}
for(const page of require('../site-pages.cjs')){
 const html=fs.readFileSync(path.join(root,page),'utf8');
 // Images in <img>: tied to their editable slot when they have one.
 for(const tag of html.match(/<img\b[^>]*>/g)||[]){
  const slot=/data-media-slot="([^"]+)"/.exec(tag)?.[1]||null;
  const files=new Set(tag.match(image)||[]);
  for(const file of files)add(file,slot?{slot,label:slotLabel[slot]||`${pageName[page]} › ${slot}`}:{slot:null,label:`${pageName[page]||page} page`});
 }
 // Anything else in the page (favicon, preloads…).
 const outside=html.replace(/<img\b[^>]*>/g,'');
 for(const file of new Set(outside.match(image)||[]))add(file,{slot:null,label:file.includes('favicon')?'Browser tab icon':`${pageName[page]||page} page`});
}
for(const file of ['styles.css','assets/admin.css']){
 const css=fs.readFileSync(path.join(root,file),'utf8');
 for(const found of new Set(css.match(image)||[]))add(found,{slot:null,label:'Website design (styles)'});
}
// A slot's default image is needed to "Restore original", even when the slot is not in a page any more.
for(const s of slots)add(s.src,{slot:s.id,label:slotLabel[s.id]});
fs.writeFileSync(path.join(root,'assets/image-usage.json'),JSON.stringify(usage,null,1)+'\n');
console.log(`Image usage: ${Object.keys(usage).length} images referenced by the site.`);

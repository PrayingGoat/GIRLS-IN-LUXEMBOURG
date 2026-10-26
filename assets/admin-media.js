(() => {
 const host=document.querySelector('#media-groups'),status=document.querySelector('#media-status');
 const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 let generation=0,controller;
 async function api(action,options={}){const r=await fetch('/api/admin?action='+action,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});const data=await r.json();if(!r.ok){if(r.status===401)document.dispatchEvent(new Event('admin:session-expired'));throw Error(data.message||'Unable to save this image.')}return data}
 function field(form,label,input){const wrap=element('label',undefined,'media-field');wrap.append(element('span',label),input);form.append(wrap);return input}
 async function optimise(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15000000)throw Error('Choose a JPG, PNG or WebP image under 15 MB.');
  const bitmap=await createImageBitmap(file);try{if(bitmap.width*bitmap.height>40000000)throw Error('Choose a photo under 40 megapixels.');const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/webp',.86);if(data.length>2800000)throw Error('This photo is still too large. Please choose a smaller image.');return data}finally{bitmap.close()}
 }
 function editor(slot,saved,library){
  let current=saved,upload=null,asset=null,revision=0;
  const card=element('article',undefined,'media-editor');card.dataset.slot=slot.id;
  const image=element('img');image.alt=slot.label+' preview';image.loading='lazy';image.width=600;image.height=400;
  const title=element('h4',slot.label);const tag=element('p',slot.section,'media-section-label');
  const view=element('a','View page','media-page-link');view.href='/'+slot.pageFile;view.target='_blank';view.rel='noopener';
  card.append(image,tag,title,view);
  const form=element('form');const edit=element('details');edit.append(element('summary','Change image'),form);card.append(edit);
  const select=element('select');select.append(new Option('Keep current image',''));library.forEach(item=>select.append(new Option(item.label,item.src)));field(form,'Choose from the photo library',select);
  const file=element('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';field(form,'Or upload a photo',file);form.append(element('small','JPG, PNG or WebP, up to 15 MB. Photos are optimised automatically.'));
  const alt=element('input');alt.type='text';alt.maxLength=300;field(form,'Image description (accessibility)',alt);
  const x=element('input');x.type='range';x.min=0;x.max=100;const y=x.cloneNode();field(form,'Horizontal focus',x);field(form,'Vertical focus',y);
  const note=element('p','','media-save-status');note.setAttribute('role','status');
  const buttons=element('div',undefined,'media-actions');const save=element('button','Save image','button');save.type='submit';const reset=element('button','Restore original','media-reset');reset.type='button';buttons.append(save,reset);form.append(buttons,note);
  function position(){image.style.objectPosition=`${x.value}% ${y.value}%`}
  function restorePreview(){image.src=current?.src?new URL(current.src,location.origin+'/').href:'/'+slot.src;alt.value=current?.alt??slot.alt;x.value=current?.x??50;y.value=current?.y??50;position();upload=null;asset=null;select.value='';file.value='';reset.disabled=!current}
  function busy(value){form.querySelectorAll('input,select,button').forEach(e=>e.disabled=value);if(!value)reset.disabled=!current}
  restorePreview();
  select.addEventListener('change',()=>{revision++;save.disabled=false;upload=null;asset=select.value||null;file.value='';image.src=asset?'/'+asset:current?.src?new URL(current.src,location.origin+'/').href:'/'+slot.src;note.textContent='Preview only. Save to publish this change.'});
  file.addEventListener('change',async()=>{if(!file.files[0])return;const version=++revision;save.disabled=true;note.textContent='Preparing your photo...';try{const data=await optimise(file.files[0]);if(version!==revision)return;upload=data;asset=null;select.value='';image.src=data;note.textContent='Preview ready. Save to publish this change.'}catch(e){if(version===revision){note.textContent=e.message;file.value=''}}finally{if(version===revision)save.disabled=false}});
  x.addEventListener('input',position);y.addEventListener('input',position);
  form.addEventListener('submit',async event=>{event.preventDefault();if(save.disabled)return;busy(true);note.textContent='Saving image...';try{const data=await api('image',{method:'PATCH',body:JSON.stringify({id:slot.id,alt:alt.value,x:Number(x.value),y:Number(y.value),...(upload?{data:upload}:asset?{asset}:{})})});current=data.image;restorePreview();note.textContent='Saved. Reload the public page to see your image.'}catch(e){note.textContent=e.message}finally{busy(false)}});
  reset.addEventListener('click',async()=>{busy(true);note.textContent='Restoring...';try{await api('image',{method:'PATCH',body:JSON.stringify({id:slot.id,reset:true})});current=null;restorePreview();note.textContent='Original image restored.'}catch(e){note.textContent=e.message}finally{busy(false)}});
  return card;
 }
 async function load(){
  const token=++generation;controller?.abort();controller=new AbortController();host.replaceChildren();status.textContent='Loading image locations...';
  try{const [slots,photos,data]=await Promise.all([fetch('/assets/media-slots.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('/assets/community-photos.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}),api('images',{signal:controller.signal})]);if(token!==generation)return;
   const unique=new Map();slots.forEach(s=>unique.set(s.src,{src:s.src,label:s.label}));photos.forEach((p,i)=>{if(!unique.has(p.full))unique.set(p.full,{src:p.full,label:'Community photo '+String(i+1).padStart(2,'0')})});const library=[...unique.values()];
   const groups=new Map();for(const slot of slots){if(!groups.has(slot.page)){const group=element('details',undefined,'media-page-group');const summary=element('summary',slot.page);const grid=element('div',undefined,'media-editor-grid');group.append(summary,grid);host.append(group);groups.set(slot.page,{grid,summary,count:0})}const group=groups.get(slot.page);group.count++;group.grid.append(editor(slot,data.images.find(i=>i.id===slot.id),library))}for(const [name,g]of groups)g.summary.textContent=name+' / '+g.count+(g.count===1?' image':' images');status.textContent=slots.length+' image locations. Open a page to customise its photos.';
  }catch(e){if(token===generation&&e.name!=='AbortError')status.textContent=e.message||'Unable to load images. Try again.'}
 }
 document.addEventListener('admin:ready',load);document.addEventListener('admin:signed-out',()=>{generation++;controller?.abort();host.replaceChildren();status.textContent=''});document.querySelector('#reload-media').addEventListener('click',load);
})();

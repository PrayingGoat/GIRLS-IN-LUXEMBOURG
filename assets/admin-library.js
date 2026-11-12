// Photo library: every image stored in MongoDB, in a grid like the Photos app.
// Photos shown on the website cannot be deleted; the admin is offered to replace them first.
(() => {
 const $=id=>document.getElementById(id);
 const grid=$('library-grid'),status=$('library-status'),dialog=$('library-dialog'),dialogBody=$('library-dialog-body');
 const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 const size=b=>b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(0)} KB`:`${(b/1048576).toFixed(1)} MB`;
 const nameOf=p=>p.split('/').pop();
 const thumb=(item,w=360)=>`/api/admin?action=thumb&w=${w}&path=${encodeURIComponent(item.path)}&v=${item.version||''}`;
 const icons={
  check:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="currentColor" stroke="#fff" stroke-width="1.5"/><path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  circle:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#0003" stroke="#fff" stroke-width="1.8"/></svg>',
  site:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>'
 };
 let items=[],filter='all',selecting=false,generation=0;const selected=new Set();
 async function api(action,options={}){
  const r=await fetch('/api/admin?action='+action,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});
  const data=await r.json();
  if(r.status===401)document.dispatchEvent(new Event('admin:session-expired'));
  if(!r.ok){const e=Error(data.message||'Unable to load the photo library.');e.status=r.status;e.data=data;throw e}
  return data;
 }
 const visible=()=>items.filter(i=>filter==='all'||(filter==='used')===(i.usedBy.length>0));
 const month=d=>d?new Date(d).toLocaleDateString(undefined,{month:'long',year:'numeric'}):'Earlier';
 function render(){
  grid.replaceChildren();
  const list=visible();let currentMonth=null,section;
  for(const item of list){
   const m=month(item.createdAt);
   if(m!==currentMonth){currentMonth=m;grid.append(element('h3',m,'library-month'));section=element('div',undefined,'library-tiles');grid.append(section)}
   const tile=element('button',undefined,'library-tile');tile.type='button';tile.dataset.path=item.path;
   tile.setAttribute('aria-label',`${nameOf(item.path)}, ${size(item.size)}${item.usedBy.length?', used on the website':''}`);
   const img=element('img');img.src=thumb(item);img.alt='';img.loading='lazy';img.decoding='async';img.width=360;img.height=360;
   tile.append(img);
   track(tile,img);
   if(item.usedBy.length){const badge=element('span',undefined,'library-badge');badge.innerHTML=icons.site+'<span>On site</span>';tile.append(badge)}
   const mark=element('span',undefined,'library-mark');mark.setAttribute('aria-hidden','true');tile.append(mark);
   paint(tile);
   tile.addEventListener('click',()=>{if(selecting){toggle(item.path);paint(tile);updateBar()}else openViewer(item)});
   section.append(tile);
  }
  if(!list.length)grid.append(element('p',filter==='unused'?'Every stored photo is used on the website.':'No photos here.','library-empty'));
  const total=list.reduce((s,i)=>s+i.size,0);
  $('library-count').textContent=`${list.length} photo${list.length===1?'':'s'} · ${size(total)}`;
 }
 // A spinning circle shows while a photo loads, so nobody mistakes an empty tile for a missing photo.
 function track(box,img){
  const spinner=element('span',undefined,'library-spinner');spinner.setAttribute('aria-hidden','true');box.append(spinner);
  box.classList.add('is-loading');
  const done=failed=>{box.classList.remove('is-loading');box.classList.toggle('is-failed',failed);spinner.remove();if(failed){const e=element('span','Preview unavailable','library-failed');box.append(e)}};
  if(img.complete&&img.naturalWidth)done(false);
  else{img.addEventListener('load',()=>done(false),{once:true});img.addEventListener('error',()=>done(true),{once:true})}
 }
 function paint(tile){
  const on=selected.has(tile.dataset.path);
  tile.classList.toggle('is-selected',on);tile.setAttribute('aria-pressed',selecting?String(on):'false');
  tile.querySelector('.library-mark').innerHTML=selecting?(on?icons.check:icons.circle):'';
 }
 function toggle(path){if(selected.has(path))selected.delete(path);else selected.add(path)}
 function updateBar(){
  const chosen=items.filter(i=>selected.has(i.path));
  $('library-selected').textContent=`${chosen.length} selected${chosen.length?' · '+size(chosen.reduce((s,i)=>s+i.size,0)):''}`;
  $('library-delete').disabled=chosen.length===0;
 }
 function setSelecting(on){
  selecting=on;selected.clear();
  $('library-select').textContent=on?'Cancel':'Select';$('library-select').setAttribute('aria-pressed',String(on));
  $('library-actionbar').hidden=!on;grid.classList.toggle('is-selecting',on);
  grid.querySelectorAll('.library-tile').forEach(paint);updateBar();
 }
 async function load(){
  const current=++generation;status.textContent='Loading your photos…';
  try{
   const data=await api('library');if(current!==generation)return;
   items=data.items;for(const p of [...selected])if(!items.some(i=>i.path===p))selected.delete(p);
   render();updateBar();status.textContent='';
  }catch(error){if(current===generation)status.textContent=error.message}
 }
 // Dialogs: viewer, confirmation, and "this photo is used" warning.
 function openDialog(title,build){
  dialogBody.replaceChildren();
  const head=element('div',undefined,'library-dialog-head');const h=element('h3',title);h.id='library-dialog-title';
  const close=element('button','Close','library-link');close.type='button';close.addEventListener('click',()=>dialog.close());
  head.append(h,close);dialogBody.append(head);build(dialogBody);
  if(!dialog.open)dialog.showModal();
 }
 function usageList(entries){
  const ul=element('ul',undefined,'library-usage');
  for(const entry of entries){
   const li=element('li');li.append(element('span',entry.label));
   if(entry.slot){const b=element('button','Replace it','button library-replace');b.type='button';b.addEventListener('click',()=>{dialog.close();openSlot(entry.slot)});li.append(b)}
   else li.append(element('small','Part of the website design: ask your developer to change it.','library-note'));
   ul.append(li);
  }
  return ul;
 }
 function openViewer(item){
  openDialog(nameOf(item.path),body=>{
   const frame=element('div',undefined,'library-preview-frame');const img=element('img',undefined,'library-preview');img.alt='';frame.append(img);body.append(frame);img.src=thumb(item,1400);track(frame,img);
   body.append(element('p',`${size(item.size)} · ${item.type||'image'}${item.createdAt?' · added '+new Date(item.createdAt).toLocaleDateString(undefined,{dateStyle:'medium'}):''}`,'library-meta'));
   if(item.usedBy.length){body.append(element('p','Used on the website:','library-label'),usageList(item.usedBy))}
   else{
    body.append(element('p','Not used on the website. You can delete it to free up space.','library-label'));
    const del=element('button','Delete this photo','button admin-danger');del.type='button';del.addEventListener('click',()=>confirmDelete([item.path]));body.append(del);
   }
  });
 }
 function confirmDelete(paths){
  const chosen=items.filter(i=>paths.includes(i.path));
  openDialog(`Delete ${chosen.length} photo${chosen.length===1?'':'s'}?`,body=>{
   body.append(element('p',`${size(chosen.reduce((s,i)=>s+i.size,0))} will be freed. The photos are removed from the online database for good.`));
   const row=element('div',undefined,'library-dialog-actions');
   const yes=element('button','Delete','button admin-danger');yes.type='button';const no=element('button','Cancel','button');no.type='button';
   no.addEventListener('click',()=>dialog.close());yes.addEventListener('click',()=>remove(paths,yes));
   row.append(yes,no);body.append(row);
  });
 }
 async function remove(paths,button){
  button.disabled=true;
  try{
   const data=await api('library-delete',{method:'POST',body:JSON.stringify({paths})});
   dialog.close();status.textContent=data.message;setSelecting(false);document.dispatchEvent(new Event('admin:data-changed'));await load();status.textContent=data.message;
  }catch(error){
   if(error.status!==409){button.disabled=false;status.textContent=error.message;dialog.close();return}
   warnUsed(paths,error.data.used);
  }
 }
 // Some photos are on the website: offer to replace them first, or delete only the others.
 function warnUsed(paths,used){
  const usedPaths=new Set(used.map(u=>u.path)),others=paths.filter(p=>!usedPaths.has(p));
  openDialog(used.length===1?'This photo is used on the website':`${used.length} photos are used on the website`,body=>{
   body.append(element('p','Deleting it would leave an empty space on the site. Do you want to replace it first?'));
   for(const u of used){
    const item=items.find(i=>i.path===u.path);const card=element('div',undefined,'library-used');
    const img=element('img');img.src=item?thumb(item):'';img.alt='';img.width=72;img.height=72;
    const text=element('div');text.append(element('strong',nameOf(u.path)),usageList(u.usedBy));
    card.append(img,text);body.append(card);
   }
   const row=element('div',undefined,'library-dialog-actions');
   if(others.length){const b=element('button',`Delete the ${others.length} other${others.length===1?'':'s'} only`,'button admin-danger');b.type='button';b.addEventListener('click',()=>remove(others,b));row.append(b)}
   const cancel=element('button','Cancel','button');cancel.type='button';cancel.addEventListener('click',()=>dialog.close());row.append(cancel);
   body.append(row);
  });
 }
 // Jump to the slot in "Website images" and open its editor.
 function openSlot(slot){
  location.hash='#images';
  let tries=0;
  const find=()=>{
   const card=document.querySelector(`.media-editor[data-slot="${CSS.escape(slot)}"]`);
   if(!card){if(++tries<40)setTimeout(find,150);return}
   const group=card.closest('details.media-page-group');if(group)group.open=true;
   const edit=card.querySelector('details');if(edit)edit.open=true;
   card.classList.add('is-highlighted');setTimeout(()=>card.classList.remove('is-highlighted'),2600);
   card.scrollIntoView({block:'center',behavior:'smooth'});
   card.querySelector('summary')?.focus({preventScroll:true});
  };
  setTimeout(find,50);
 }
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
  filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();
 }));
 $('library-select').addEventListener('click',()=>setSelecting(!selecting));
 $('library-select-unused').addEventListener('click',()=>{for(const i of visible())if(!i.usedBy.length)selected.add(i.path);grid.querySelectorAll('.library-tile').forEach(paint);updateBar()});
 $('library-delete').addEventListener('click',()=>confirmDelete([...selected]));
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 // Loaded when the section is opened, and again when coming back (after a replacement, for example).
 let ready=false;
 const maybeLoad=()=>{if(ready&&location.hash==='#library')load()};
 document.addEventListener('admin:ready',()=>{ready=true;maybeLoad()});
 window.addEventListener('hashchange',maybeLoad);
 document.addEventListener('admin:signed-out',()=>{ready=false;generation++;items=[];grid.replaceChildren();status.textContent='';setSelecting(false);if(dialog.open)dialog.close()});
})();

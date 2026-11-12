// Database cleanup and administrator password, for clients who never open MongoDB Atlas.
(() => {
 const $=id=>document.getElementById(id);
 const list=$('cleanup-list'),status=$('cleanup-status'),total=$('cleanup-total');
 const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 const size=bytes=>bytes<1024?`${bytes} B`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1048576).toFixed(1)} MB`;
 const categories=[
  {key:'messages',label:'Contact messages',help:'Messages sent from the contact form.',dated:true},
  {key:'feedback',label:'Feedback answers',help:'Answers from the anonymous feedback form.',dated:true},
  {key:'requests',label:'Membership requests',help:'Requests sent from the Join us form.',dated:true},
  {key:'customImages',label:'Replaced website images',help:'Photos changed in “Website images”. Deleting them puts the original photos back on the site.',dated:true},
  {key:'unusedImages',label:'Unused images and photo backups',help:'Images that the website does not show: old images, unused choices and backups of the original photos. The photos shown on the site are never included. See them one by one in the Photo library.',dated:false},
  {key:'technical',label:'Expired technical data',help:'Expired sign-in sessions and old anti-spam counters. Always safe to delete.',dated:false}
 ];
 const ages=[[0,'Everything'],[30,'Older than 30 days'],[90,'Older than 3 months'],[180,'Older than 6 months'],[365,'Older than 1 year']];
 let generation=0;
 async function api(action,options={}){
  const r=await fetch('/api/admin?action='+action,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});
  const data=await r.json();
  if(!r.ok){if(r.status===401)document.dispatchEvent(new Event('admin:session-expired'));const e=Error(data.message||'Unable to complete the request.');e.field=data.field;throw e}
  return data;
 }
 function row(category,usage){
  const item=element('li',undefined,'admin-message admin-cleanup-row');
  const head=element('div',undefined,'admin-message-head');
  const name=element('div');name.append(element('strong',category.label));
  head.append(name,element('span',`${usage.count} item${usage.count===1?'':'s'} · ${size(usage.bytes)}`,'admin-message-tag'));
  item.append(head,element('p',category.help,'admin-cleanup-help'));
  const controls=element('div',undefined,'admin-cleanup-controls');
  const select=element('select');select.setAttribute('aria-label','What to delete in '+category.label);
  for(const [days,label] of category.dated?ages:[[0,'Everything']]){const o=element('option',label);o.value=days;select.append(o)}
  const remove=element('button',`Delete`,'button admin-danger');remove.type='button';remove.disabled=usage.count===0;
  controls.append(select,remove);item.append(controls);
  // Inline confirmation: the person must type DELETE.
  const confirmBox=element('div',undefined,'admin-cleanup-confirm');confirmBox.hidden=true;
  const label=element('label','Type DELETE to confirm. This cannot be undone.');const id='confirm-'+category.key;label.htmlFor=id;
  const input=element('input');input.id=id;input.autocomplete='off';input.spellcheck=false;
  const go=element('button','Confirm deletion','button admin-danger');go.type='button';go.disabled=true;
  const cancel=element('button','Cancel','button');cancel.type='button';
  confirmBox.append(label,input,go,cancel);item.append(confirmBox);
  remove.addEventListener('click',()=>{confirmBox.hidden=false;remove.disabled=true;input.value='';input.focus()});
  cancel.addEventListener('click',()=>{confirmBox.hidden=true;remove.disabled=false;remove.focus()});
  input.addEventListener('input',()=>{go.disabled=input.value.trim()!=='DELETE'});
  go.addEventListener('click',async()=>{
   go.disabled=true;cancel.disabled=true;status.textContent='Deleting…';
   try{const data=await api('cleanup',{method:'POST',body:JSON.stringify({category:category.key,olderThanDays:Number(select.value),confirm:'DELETE'})});document.dispatchEvent(new Event('admin:data-changed'));await load();status.textContent=data.message;status.focus?.()}
   catch(error){status.textContent=error.message;go.disabled=false;cancel.disabled=false}
  });
  return item;
 }
 async function load(){
  const current=++generation;status.textContent='Measuring the database…';
  try{
   const data=await api('storage');if(current!==generation)return;
   list.replaceChildren(...categories.map(c=>row(c,data.categories[c.key]||{count:0,bytes:0})));
   total.textContent=data.total?`Database size: ${size(data.total.dataBytes)} of data (${size(data.total.storageBytes+data.total.indexBytes)} on disk, including indexes). The free MongoDB Atlas plan allows 512 MB.`:'';
   showUsage(data.total);
   status.textContent='';
  }catch(error){if(current===generation)status.textContent=error.message}
 }
 // Usage bar: data + indexes, which is what counts towards the 512 MB of the free Atlas plan.
 const LIMIT_MB=512;
 function showUsage(t){
  const box=$('cleanup-usage');if(!t){box.hidden=true;return}
  const used=(t.dataBytes+t.indexBytes)/1048576,percent=Math.min(100,used/LIMIT_MB*100);
  const label=`${used.toFixed(1)} / ${LIMIT_MB} MB used (${percent<1?percent.toFixed(1):Math.round(percent)}%)`;
  $('usage-label').textContent=label;
  const meter=$('usage-meter');meter.setAttribute('aria-valuenow',used.toFixed(1));meter.setAttribute('aria-valuetext',label);
  const fill=$('usage-fill');fill.dataset.level=percent>=90?'full':percent>=75?'high':'ok';
  box.hidden=false;
  // Fill from empty so the bar visibly grows to its value.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.width=Math.max(percent,1.5)+'%'}));
  $('usage-note').textContent=percent>=90?'The database is almost full. Delete unused images or old data above to free up space.':percent>=75?'The database is getting full. Consider cleaning up old data.':`${(LIMIT_MB-used).toFixed(0)} MB still available.`;
 }
 $('cleanup-reload').addEventListener('click',load);
 document.addEventListener('admin:ready',load);
 document.addEventListener('admin:data-changed',()=>{if(!list.contains(document.activeElement))load()});
 document.addEventListener('admin:signed-out',()=>{generation++;list.replaceChildren();status.textContent='';total.textContent='';$('cleanup-usage').hidden=true;$('usage-fill').style.width='0'});

 const form=$('password-form'),passwordStatus=$('password-status');
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  const current=$('password-current').value,next=$('password-next').value,confirm=$('password-confirm').value;
  if(next.length<14){$('password-next').setAttribute('aria-invalid','true');passwordStatus.textContent='Use a new password of at least 14 characters.';$('password-next').focus();return}
  if(next!==confirm){$('password-confirm').setAttribute('aria-invalid','true');passwordStatus.textContent='The two new passwords do not match.';$('password-confirm').focus();return}
  const button=$('password-save');button.disabled=true;passwordStatus.textContent='Saving…';
  try{const data=await api('password',{method:'POST',body:JSON.stringify({current,next})});form.reset();passwordStatus.textContent=data.message}
  catch(error){passwordStatus.textContent=error.message;const field=error.field==='current'?$('password-current'):error.field==='next'?$('password-next'):null;if(field){field.setAttribute('aria-invalid','true');field.focus()}}
  finally{button.disabled=false}
 });
 document.addEventListener('admin:signed-out',()=>{form.reset();passwordStatus.textContent=''});
})();

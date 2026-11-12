(() => {
 const $=id=>document.getElementById(id);
 const list=$('feedback-list'),status=$('feedback-status'),average=$('feedback-average');
 const ratings={1:'Not great',2:'Could be better',3:'Good',4:'Very good',5:'Excellent'};
 const groups={girlsclub:'GirlsClub',bookclub:'BookClub',momsclub:"Moms'Club",walkhike:'Walk/HikeClub',fitclub:'FitClub',careerclub:'CareerClub',craft:'Craft Corner',language:'Language Exchange',travelclub:'TravelClub'};
 const statuses={new:'New',read:'Read',archived:'Archived'};
 const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 const day=value=>new Date(value).toLocaleDateString(undefined,{dateStyle:'medium',timeZone:'UTC'});
 let page=1,pages=1,generation=0;
 async function api(action,options={}){
  const r=await fetch('/api/admin?action='+action,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});
  const data=await r.json();
  if(!r.ok){if(r.status===401)document.dispatchEvent(new Event('admin:session-expired'));throw Error(data.message||'Unable to load feedback.')}
  return data;
 }
 function answer(label,text){const block=element('div',undefined,'admin-feedback-answer');block.append(element('strong',label),element('p',text||'No answer',text?'admin-message-body':'admin-feedback-empty'));return block}
 function render(rows){
  list.replaceChildren();
  for(const row of rows){
   const item=element('li',undefined,'admin-message'),head=element('div',undefined,'admin-message-head');
   const who=element('div');
   who.append(element('strong',`${row.rating}/5 · ${ratings[row.rating]||''}`));
   const meta=element('div',undefined,'admin-message-meta');
   if(row.testimony==='yes')meta.append(element('span','Testimony: yes','admin-message-tag'));
   meta.append(element('span',day(row.created_at)));
   head.append(who,meta);
   item.append(head);
   if(row.groups?.length)item.append(element('p','Groups: '+row.groups.map(g=>groups[g]||g).join(', '),'admin-feedback-groups'));
   item.append(answer('What’s working well',row.working),answer('What could be better',row.better));
   const contact=[row.name,row.phone,row.email].filter(Boolean);
   const id=element('p',undefined,'admin-feedback-contact');
   if(contact.length){id.append('Left contact details: '+[row.name,row.phone].filter(Boolean).join(' · ')+(row.email&&(row.name||row.phone)?' · ':''));if(row.email){const mail=element('a',row.email);mail.href='mailto:'+row.email+'?subject='+encodeURIComponent('About your feedback to Girls in Luxembourg');id.append(mail)}}
   else id.textContent='Anonymous';
   item.append(id);
   const select=element('select');select.setAttribute('aria-label','Status of this feedback');
   for(const [value,label] of Object.entries(statuses)){const option=element('option',label);option.value=value;option.selected=row.status===value;select.append(option)}
   select.addEventListener('change',async()=>{select.disabled=true;try{await api('feedback-status',{method:'PATCH',body:JSON.stringify({id:row.id,status:select.value})});row.status=select.value;item.dataset.status=row.status;status.textContent='Status saved.'}catch(error){select.value=row.status;status.textContent=error.message}finally{select.disabled=false}});
   item.dataset.status=row.status;item.append(select);const actions=element('div',undefined,'admin-item-actions');actions.append(select,deleteButton('feedback-delete',row.id,item,()=>{status.textContent='Deleted from the online database.'}));item.append(actions);
   list.append(item);
  }
 }

 // Two clicks to delete: the first asks for confirmation, which expires after 5 seconds.
 function deleteButton(action,id,item,onDone){const b=element('button','Delete','button admin-danger admin-delete');b.type='button';let armed=false,timer;b.addEventListener('click',async()=>{if(!armed){armed=true;b.textContent='Click again to delete';timer=setTimeout(()=>{armed=false;b.textContent='Delete'},5000);return}clearTimeout(timer);b.disabled=true;try{await api(action,{method:'POST',body:JSON.stringify({id})});item.remove();onDone();document.dispatchEvent(new Event('admin:data-changed'))}catch(error){b.disabled=false;armed=false;b.textContent='Delete';status.textContent=error.message}});return b}
 async function load(){
  const current=++generation,params=new URLSearchParams({page});
  if($('feedback-status-filter').value)params.set('status',$('feedback-status-filter').value);
  status.textContent='Loading feedback…';
  try{
   const data=await api('feedback&'+params);if(current!==generation)return;
   pages=Math.max(1,Math.ceil(data.total/data.pageSize));render(data.feedback);
   average.textContent=data.average?`Average experience: ${data.average.rating}/5 from ${data.average.count} answer${data.average.count>1?'s':''}`:'';
   status.textContent=data.total?`${data.total} answer${data.total>1?'s':''}`:'No feedback yet.';
   $('feedback-page').textContent=`Page ${page} of ${pages}`;$('feedback-prev').disabled=page<=1;$('feedback-next').disabled=page>=pages;
  }catch(error){if(current===generation)status.textContent=error.message}
 }
 $('feedback-status-filter').addEventListener('change',()=>{page=1;load()});
 $('feedback-reload').addEventListener('click',load);
 $('feedback-prev').addEventListener('click',()=>{if(page>1){page--;load()}});
 $('feedback-next').addEventListener('click',()=>{if(page<pages){page++;load()}});
 document.addEventListener('admin:ready',()=>{page=1;load()});
 document.addEventListener('admin:signed-out',()=>{generation++;list.replaceChildren();status.textContent='';average.textContent='';$('feedback-page').textContent=''});
})();

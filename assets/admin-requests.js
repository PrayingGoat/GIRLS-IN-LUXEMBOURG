// Membership requests from the "Join us" form: search, status, WhatsApp link and deletion.
(() => {
 const $=id=>document.getElementById(id);
 const list=$('requests-list'),status=$('requests-status'),summary=$('requests-summary');
 const statuses={pending:'Pending',contacted:'Contacted',added:'Added to the group',declined:'Declined'};
 const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 const date=value=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 let page=1,pages=1,generation=0,searchTimer;
 async function api(action,options={}){
  const r=await fetch('/api/admin?action='+action,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});
  const data=await r.json();
  if(!r.ok){if(r.status===401)document.dispatchEvent(new Event('admin:session-expired'));throw Error(data.message||'Unable to load membership requests.')}
  return data;
 }
 // Two clicks to delete: the first asks for confirmation, which expires after 5 seconds.
 function deleteButton(row,item){
  const b=element('button','Delete','button admin-danger admin-delete');b.type='button';let armed=false,timer;
  b.addEventListener('click',async()=>{
   if(!armed){armed=true;b.textContent='Click again to delete';timer=setTimeout(()=>{armed=false;b.textContent='Delete'},5000);return}
   clearTimeout(timer);b.disabled=true;
   try{await api('request-delete',{method:'POST',body:JSON.stringify({id:row.id})});item.remove();status.textContent='Deleted from the online database.';document.dispatchEvent(new Event('admin:data-changed'));load()}
   catch(error){b.disabled=false;armed=false;b.textContent='Delete';status.textContent=error.message}
  });
  return b;
 }
 function render(rows){
  list.replaceChildren();
  for(const row of rows){
   const item=element('li',undefined,'admin-message'),head=element('div',undefined,'admin-message-head');
   const who=element('div');who.append(element('strong',`${row.first_name} ${row.last_name}`));
   const meta=element('div',undefined,'admin-message-meta');meta.append(element('span',statuses[row.status]||row.status,'admin-message-tag'),element('span',date(row.created_at)));
   head.append(who,meta);
   const contact=element('p',undefined,'admin-request-contact');
   const wa=element('a',row.whatsapp,'admin-request-whatsapp');wa.href='https://wa.me/'+String(row.whatsapp||'').replace(/[^0-9]/g,'');wa.target='_blank';wa.rel='noopener noreferrer';
   const mail=element('a',row.email);mail.href='mailto:'+row.email;
   contact.append('WhatsApp: ',wa,' · Email: ',mail);
   const consent=element('p',`Consent given on ${date(row.consented_at||row.created_at)}.`,'admin-feedback-contact');
   const select=element('select');select.setAttribute('aria-label',`Status of the request from ${row.first_name} ${row.last_name}`);
   for(const [value,label] of Object.entries(statuses)){const o=element('option',label);o.value=value;o.selected=row.status===value;select.append(o)}
   select.addEventListener('change',async()=>{select.disabled=true;try{await api('status',{method:'PATCH',body:JSON.stringify({id:row.id,status:select.value})});row.status=select.value;meta.firstChild.textContent=statuses[row.status];status.textContent='Status saved.';load(false)}catch(error){select.value=row.status;status.textContent=error.message}finally{select.disabled=false}});
   const actions=element('div',undefined,'admin-item-actions');actions.append(select,deleteButton(row,item));
   item.dataset.status=row.status;item.append(head,contact,consent,actions);list.append(item);
  }
 }
 async function load(rerender=true){
  const current=++generation,params=new URLSearchParams({page});
  const search=$('requests-search').value.trim();if(search)params.set('search',search);
  if($('requests-status-filter').value)params.set('status',$('requests-status-filter').value);
  if(rerender)status.textContent='Loading membership requests…';
  try{
   const data=await api('requests&'+params);if(current!==generation)return;
   pages=Math.max(1,Math.ceil(data.total/data.pageSize));if(rerender)render(data.requests);
   const counts=Object.fromEntries((data.stats||[]).map(s=>[s.status,s.count]));
   summary.textContent=Object.entries(statuses).map(([k,label])=>`${label}: ${counts[k]||0}`).join(' · ');
   document.dispatchEvent(new CustomEvent('admin:badge',{detail:{view:'requests',count:counts.pending||0}}));
   if(rerender)status.textContent=data.total?`${data.total} request${data.total>1?'s':''}`:'No membership requests yet.';
   $('requests-page').textContent=`Page ${page} of ${pages}`;$('requests-prev').disabled=page<=1;$('requests-next').disabled=page>=pages;
  }catch(error){if(current===generation)status.textContent=error.message}
 }
 $('requests-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;load()},350)});
 $('requests-status-filter').addEventListener('change',()=>{page=1;load()});
 $('requests-reload').addEventListener('click',()=>load());
 $('requests-prev').addEventListener('click',()=>{if(page>1){page--;load()}});
 $('requests-next').addEventListener('click',()=>{if(page<pages){page++;load()}});
 document.addEventListener('admin:ready',()=>{page=1;load()});
 document.addEventListener('admin:signed-out',()=>{generation++;list.replaceChildren();status.textContent='';summary.textContent='';$('requests-page').textContent='';document.dispatchEvent(new CustomEvent('admin:badge',{detail:{view:'requests',count:0}}))});
})();

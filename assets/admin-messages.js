(() => {
 const $=id=>document.getElementById(id);
 const list=$('messages-list'),status=$('messages-status');
 const reasons={general:'General Question',partnership:'Partnership',volunteering:'Volunteering'};
 const statuses={new:'New',replied:'Replied',archived:'Archived'};
 const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 const date=value=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 let page=1,pages=1,generation=0;
 async function api(action,options={}){
  const r=await fetch('/api/admin?action='+action,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});
  const data=await r.json();
  if(!r.ok){if(r.status===401)document.dispatchEvent(new Event('admin:session-expired'));throw Error(data.message||'Unable to load messages.')}
  return data;
 }
 function render(rows){
  list.replaceChildren();
  for(const row of rows){
   const item=element('li',undefined,'admin-message'),head=element('div',undefined,'admin-message-head');
   const who=element('div');who.append(element('strong',row.name),' ');
   const mail=element('a',row.email);mail.href='mailto:'+row.email+'?subject='+encodeURIComponent('Re: your message to Girls in Luxembourg');who.append(mail);
   const meta=element('div',undefined,'admin-message-meta');meta.append(element('span',reasons[row.reason]||row.reason,'admin-message-tag'),element('span',date(row.created_at)));
   head.append(who,meta);
   const select=element('select');select.setAttribute('aria-label','Status of the message from '+row.name);
   for(const [value,label] of Object.entries(statuses)){const option=element('option',label);option.value=value;option.selected=row.status===value;select.append(option)}
   select.addEventListener('change',async()=>{select.disabled=true;try{await api('message-status',{method:'PATCH',body:JSON.stringify({id:row.id,status:select.value})});row.status=select.value;item.dataset.status=row.status;status.textContent='Status saved.'}catch(error){select.value=row.status;status.textContent=error.message}finally{select.disabled=false}});
   item.dataset.status=row.status;
   item.append(head,element('p',row.message,'admin-message-body'),select);const actions=element('div',undefined,'admin-item-actions');actions.append(select,deleteButton('message-delete',row.id,item,()=>{status.textContent='Deleted from the online database.'}));item.append(actions);
   list.append(item);
  }
 }

 // Two clicks to delete: the first asks for confirmation, which expires after 5 seconds.
 function deleteButton(action,id,item,onDone){const b=element('button','Delete','button admin-danger admin-delete');b.type='button';let armed=false,timer;b.addEventListener('click',async()=>{if(!armed){armed=true;b.textContent='Click again to delete';timer=setTimeout(()=>{armed=false;b.textContent='Delete'},5000);return}clearTimeout(timer);b.disabled=true;try{await api(action,{method:'POST',body:JSON.stringify({id})});item.remove();onDone();document.dispatchEvent(new Event('admin:data-changed'))}catch(error){b.disabled=false;armed=false;b.textContent='Delete';status.textContent=error.message}});return b}
 async function load(){
  const current=++generation,params=new URLSearchParams({page});
  if($('messages-reason').value)params.set('reason',$('messages-reason').value);
  if($('messages-status-filter').value)params.set('status',$('messages-status-filter').value);
  status.textContent='Loading messages…';
  try{
   const data=await api('messages&'+params);if(current!==generation)return;
   pages=Math.max(1,Math.ceil(data.total/data.pageSize));render(data.messages);
   status.textContent=data.total?`${data.total} message${data.total>1?'s':''}`:'No messages yet.';
   $('messages-page').textContent=`Page ${page} of ${pages}`;$('messages-prev').disabled=page<=1;$('messages-next').disabled=page>=pages;
  }catch(error){if(current===generation)status.textContent=error.message}
 }
 $('messages-reason').addEventListener('change',()=>{page=1;load()});
 $('messages-status-filter').addEventListener('change',()=>{page=1;load()});
 $('messages-reload').addEventListener('click',load);
 $('messages-prev').addEventListener('click',()=>{if(page>1){page--;load()}});
 $('messages-next').addEventListener('click',()=>{if(page<pages){page++;load()}});
 document.addEventListener('admin:ready',()=>{page=1;load()});
 document.addEventListener('admin:signed-out',()=>{generation++;list.replaceChildren();status.textContent='';$('messages-page').textContent=''});
})();

(() => {
 const $=id=>document.getElementById(id), labels={pending:'Pending',contacted:'Contacted',added:'Added to WhatsApp',declined:'Declined'};
 let page=1,total=0,controller,version=0;
 function resetView(message=''){$('dashboard').hidden=true;$('logout').hidden=true;$('login-panel').hidden=false;$('requests').replaceChildren();document.querySelectorAll('[data-stat]').forEach(el=>el.textContent='—');$('login-status').textContent=message;}
 async function api(action,options={}){
  const response=await fetch('/api/admin?action='+action,{...options,headers:{'Content-Type':'application/json',...options.headers},cache:'no-store'});
  const data=await response.json();
  if(response.status===401){resetView(data.message);throw Error(data.message);}
  if(!response.ok)throw Error(data.message||'Unable to complete the request.');return data;
 }
 const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el};
 const date=value=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 function render(rows){$('requests').replaceChildren();for(const row of rows){
  const tr=node('tr'),name=node('td');name.append(node('strong',`${row.first_name} ${row.last_name}`));
  const contact=node('td'),email=node('a',row.email),whatsapp=node('a',row.whatsapp);email.href='mailto:'+row.email;whatsapp.href='https://wa.me/'+row.whatsapp.replace(/\D/g,'');whatsapp.target='_blank';whatsapp.rel='noopener noreferrer';whatsapp.title='Open WhatsApp — no message is sent automatically';contact.append(email,whatsapp);
  const submitted=node('td',date(row.created_at));
  const status=node('td'),select=node('select');select.setAttribute('aria-label',`Status for ${row.first_name} ${row.last_name}`);for(const [value,label]of Object.entries(labels)){const option=node('option',label);option.value=value;select.append(option)}select.value=row.status;
  select.addEventListener('change',async()=>{const previous=row.status;select.disabled=true;try{await api('status',{method:'PATCH',body:JSON.stringify({id:row.id,status:select.value})});await load();}catch(error){select.value=previous;$('dashboard-status').textContent=error.message;}finally{select.disabled=false;}});status.append(select);
  const extra=node('td'),details=node('details');details.append(node('summary','View details'),node('p','Reference: '+row.id),node('p','Consent recorded: '+date(row.consented_at)),node('p','Consent version: '+row.consent_version),node('p','Last updated: '+date(row.updated_at)));extra.append(details);tr.append(name,contact,submitted,status,extra);$('requests').append(tr);
 }if(!rows.length){const td=node('td','No requests match these filters.');td.colSpan=5;const tr=node('tr');tr.append(td);$('requests').append(tr)}}
 async function load(){
  controller?.abort();controller=new AbortController();const requestVersion=++version;
  $('dashboard-status').textContent='Loading requests…';$('requests').replaceChildren();$('previous').disabled=true;$('next').disabled=true;
  const query=new URLSearchParams({search:$('search').value,status:$('status-filter').value,page:String(page)});
  try{const data=await api('requests&'+query,{signal:controller.signal});if(requestVersion!==version)return;total=data.total;
   if(page>1&&!data.requests.length){page=Math.max(1,Math.ceil(total/25));return load()}
   render(data.requests);let sum=0;document.querySelectorAll('[data-stat]').forEach(el=>el.textContent='0');data.stats.forEach(s=>{sum+=s.count;const el=document.querySelector(`[data-stat="${s.status}"]`);if(el)el.textContent=String(s.count)});document.querySelector('[data-stat=total]').textContent=String(sum);
   $('dashboard-status').textContent=`${total} matching request${total===1?'':'s'}.`;$('page-label').textContent=`Page ${page} of ${Math.max(1,Math.ceil(total/25))}`;$('previous').disabled=page<=1;$('next').disabled=page*25>=total;
  }catch(error){if(error.name!=='AbortError'&&requestVersion===version)$('dashboard-status').textContent=error.message;}
 }
 async function loadCounts(){
  $('community-count-fields').disabled=true;$('save-counts').disabled=true;
  $('community-count-status').textContent='Loading saved numbers?';
  try{const data=await api('community-stats');for(const key of ['instagram','tiktok','whatsapp','linkedin'])$('count-'+key).value=data.stats[key];$('community-count-status').textContent='Last saved: '+date(data.stats.updated_at);$('community-count-fields').disabled=false;$('save-counts').disabled=false;}catch(error){$('community-count-status').textContent=error.message;}
 }
 $('reload-counts').addEventListener('click',loadCounts);
 $('community-count-form').addEventListener('submit',async event=>{
  event.preventDefault();if($('save-counts').disabled)return;
  const values=Object.fromEntries(['instagram','tiktok','whatsapp','linkedin'].map(key=>[key,$('count-'+key).valueAsNumber]));
  $('save-counts').disabled=true;$('community-count-fields').disabled=true;$('reload-counts').disabled=true;
  $('community-count-status').textContent='Saving?';
  try{const data=await api('community-stats',{method:'PATCH',body:JSON.stringify(values)});$('community-count-status').textContent='Saved. The homepage will use these numbers on its next load. '+date(data.stats.updated_at);}
  catch(error){$('community-count-status').textContent='Not saved. '+error.message;}
  finally{$('save-counts').disabled=false;$('community-count-fields').disabled=false;$('reload-counts').disabled=false;}
 });
 async function show(){ $('login-panel').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;await Promise.all([load(),loadCounts()]); }
 $('login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('login-status').textContent='Signing in…';try{await api('login',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';await show()}catch(error){$('login-status').textContent=error.message}finally{button.disabled=false}});
 $('logout').addEventListener('click',async()=>{try{await api('logout',{method:'POST',body:'{}'});controller?.abort();version++;resetView('Signed out.');$('password').focus()}catch(error){$('dashboard-status').textContent=error.message}});
 $('filters').addEventListener('submit',e=>{e.preventDefault();page=1;load()});$('status-filter').addEventListener('change',()=>{page=1;load()});$('refresh').addEventListener('click',load);$('previous').addEventListener('click',()=>{if(page>1){page--;load()}});$('next').addEventListener('click',()=>{if(page*25<total){page++;load()}});
 api('session').then(show).catch(error=>resetView(error.message));
 window.addEventListener('pageshow',event=>{if(event.persisted){resetView();api('session').then(show).catch(error=>resetView(error.message))}});
})();

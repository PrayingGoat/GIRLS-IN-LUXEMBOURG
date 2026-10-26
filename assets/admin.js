(() => {
 const $=id=>document.getElementById(id);

 function resetView(message=''){$('dashboard').hidden=true;$('logout').hidden=true;$('login-panel').hidden=false;$('community-count-form').reset();document.dispatchEvent(new Event('admin:signed-out'));$('login-status').textContent=message;}
 async function api(action,options={}){
  const response=await fetch('/api/admin?action='+action,{...options,headers:{'Content-Type':'application/json',...options.headers},cache:'no-store'});
  const data=await response.json();
  if(response.status===401){resetView(data.message);throw Error(data.message);}
  if(!response.ok)throw Error(data.message||'Unable to complete the request.');return data;
 }
 const date=value=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 async function loadCounts(){
  $('community-count-fields').disabled=true;$('save-counts').disabled=true;
  $('community-count-status').textContent='Loading saved numbers...';
  try{const data=await api('community-stats');for(const key of ['instagram','tiktok','whatsapp','linkedin'])$('count-'+key).value=data.stats[key];$('community-count-status').textContent='Last saved: '+date(data.stats.updated_at);$('community-count-fields').disabled=false;$('save-counts').disabled=false;}catch(error){$('community-count-status').textContent=error.message;}
 }
 $('reload-counts').addEventListener('click',loadCounts);
 $('community-count-form').addEventListener('submit',async event=>{
  event.preventDefault();if($('save-counts').disabled)return;
  const values=Object.fromEntries(['instagram','tiktok','whatsapp','linkedin'].map(key=>[key,$('count-'+key).valueAsNumber]));
  $('save-counts').disabled=true;$('community-count-fields').disabled=true;$('reload-counts').disabled=true;
  $('community-count-status').textContent='Saving...';
  try{const data=await api('community-stats',{method:'PATCH',body:JSON.stringify(values)});$('community-count-status').textContent='Saved. The homepage will use these numbers on its next load. '+date(data.stats.updated_at);}
  catch(error){$('community-count-status').textContent='Not saved. '+error.message;}
  finally{$('save-counts').disabled=false;$('community-count-fields').disabled=false;$('reload-counts').disabled=false;}
 });
 async function show(){ $('login-panel').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;document.dispatchEvent(new Event('admin:ready'));await loadCounts(); }
 $('login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('login-status').textContent='Signing in…';try{await api('login',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';await show()}catch(error){$('login-status').textContent=error.message}finally{button.disabled=false}});
 $('logout').addEventListener('click',async()=>{try{await api('logout',{method:'POST',body:'{}'});resetView('Signed out.');$('password').focus()}catch(error){$('dashboard-status').textContent=error.message}});
 document.addEventListener('admin:session-expired',()=>resetView('Your session has expired. Please sign in again.'));
 api('session').then(show).catch(error=>resetView(error.message));
 window.addEventListener('pageshow',event=>{if(event.persisted){resetView();api('session').then(show).catch(error=>resetView(error.message))}});
})();

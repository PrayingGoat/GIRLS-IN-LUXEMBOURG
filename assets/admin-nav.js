// Left menu of the admin space: one section at a time, remembered in the address (#requests…).
(() => {
 const views=[...document.querySelectorAll('.admin-view[data-view]')];
 const links=[...document.querySelectorAll('[data-view-link]')];
 const names=new Set(views.map(v=>v.dataset.view));
 function show(name,focus=false){
  if(!names.has(name))name='home';
  for(const view of views)view.hidden=view.dataset.view!==name;
  for(const link of links){if(link.dataset.viewLink===name)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')}
  const current=views.find(v=>v.dataset.view===name);
  if(focus&&current){const heading=current.querySelector('h1,h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}window.scrollTo({top:0,behavior:'auto'})}
 }
 const fromHash=()=>decodeURIComponent(location.hash.slice(1));
 window.addEventListener('hashchange',()=>show(fromHash(),true));
 document.addEventListener('admin:ready',()=>show(fromHash()));
 document.addEventListener('admin:signed-out',()=>show('home'));
 // Small counters next to menu items (for example pending membership requests).
 document.addEventListener('admin:badge',event=>{
  const badge=document.querySelector(`[data-badge="${event.detail?.view}"]`);if(!badge)return;
  const count=Number(event.detail.count)||0;badge.hidden=count===0;badge.textContent=count>99?'99+':String(count);
  badge.setAttribute('aria-label',`${count} new`);
 });
 show(fromHash());
})();

// Shared motion for every page. Content remains visible without JavaScript.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  function animate(element, frames, options = {}) {
    if (reduced.matches || !element.animate) return;
    const animation = element.animate(frames, {duration:650,easing:'cubic-bezier(.22,1,.36,1)',...options});
    running.add(animation);
    animation.finished.catch(()=>{}).finally(()=>running.delete(animation));
  }
  reduced.addEventListener('change',()=>{if(reduced.matches) running.forEach(a=>a.cancel());});
  const targets = document.querySelectorAll('[data-reveal], .hero-copy > *, .events-intro > *, .events-calendar, .membership-intro > *, .membership-card, .community-directory > div, .community-directory > nav, .events-footer, .home-page-card, .home-invitation, .community-circle');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries=>{
      let delay = 0;
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        observer.unobserve(entry.target);
        animate(entry.target,[{opacity:0,transform:'translateY(20px) scale(.99)'},{opacity:1,transform:'translateY(0) scale(1)'}],{delay:Math.min(delay,180)});
        delay+=45;
      });
    },{threshold:.08});
    targets.forEach(el=>observer.observe(el));
  }
  // Small tactile feedback, never intercepting navigation or keyboard activation.
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest('.button, .events-back, .panel-close, .announcement-socials a');
    if(!button || button.disabled)return;
    animate(button,[{scale:'1'},{scale:'.97'},{scale:'1'}],{duration:260});
  },{passive:true});
  const dialog=document.querySelector('.community-dialog');
  if(dialog) new MutationObserver(()=>{
    if(dialog.open)animate(dialog,[{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}],{duration:300});
  }).observe(dialog,{attributes:true,attributeFilter:['open']});
  const success=document.getElementById('membership-success');
  if(success)new MutationObserver(()=>{
    if(!success.hidden)animate(success,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}]);
  }).observe(success,{attributes:true,attributeFilter:['hidden']});
})();

// Count up once when the community figures enter view. Never change source totals.
(async () => {
  const region = document.querySelector('.story-stats');
  if (!region) return;
  const keys=['instagram','tiktok','whatsapp','linkedin'];
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),2500);
  try {
    const response=await fetch('/api/community-stats',{cache:'no-store',signal:controller.signal});
    if(response.ok){const data=await response.json();
      if(keys.every(k=>Number.isInteger(data.stats?.[k])&&data.stats[k]>=0&&data.stats[k]<=1000000000)){
        region.querySelectorAll('strong').forEach((el,i)=>el.textContent=data.stats[keys[i]].toLocaleString('en-US')+'+');
      }
    }
  } catch { /* Keep readable existing figures if the database is unavailable. */ }
  finally { clearTimeout(timeout); }
  if (!('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const counters = [...region.querySelectorAll('strong')].map(element => {
    const finalText = element.textContent;
    const target = Number(finalText.replace(/[^0-9]/g, ''));
    // A stable accessible name avoids announcing every animation frame.
    element.setAttribute('aria-label', finalText);
    const display = document.createElement('span');
    display.setAttribute('aria-hidden', 'true');
    display.textContent = finalText;
    element.replaceChildren(display);
    return { display, target, finalText };
  });
  let frame = 0;
  const finish = () => { cancelAnimationFrame(frame); frame = 0; counters.forEach(c => c.display.textContent = c.finalText); };
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    observer.disconnect();
    if (reduced.matches) return;
    const started = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - started) / 950);
      const eased = 1 - Math.pow(1 - progress, 3);
      counters.forEach(c => c.display.textContent = Math.round(c.target * eased).toLocaleString('en-US') + (c.finalText.includes('+') ? '+' : ''));
      if (progress < 1) frame = requestAnimationFrame(tick); else finish();
    };
    frame = requestAnimationFrame(tick);
  }, { threshold: .3 });
  observer.observe(region);
  reduced.addEventListener('change', () => { if (reduced.matches) finish(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && frame) finish(); });
})();

// One short shimmer per content block, inspired by redacted loading placeholders.
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches||!('IntersectionObserver' in window))return;
 const selector='.home-page-card,.home-invitation,.hero-copy,.hero-gallery,.story-stats,.circle-intro-copy,.circle-intro-photo,.community-circle,.moment,.beliefs article,.community-art,.team-page-content,.panel-faq-group,.contact-intro,.contact-details,.panel-policy,.panel-partnerships,.membership-card,.membership-intro,.events-intro>div,.events-intro>img,.calendar-board,.event-directory-row,.admin-login,.admin-community,.admin-table-wrap';
 const prepared=new WeakSet(),active=new Map(),seenEvents=new Set();
 function finish(el){
  const state=active.get(el);if(!state)return;
  clearTimeout(state.timer);observer.unobserve(el);state.overlay.remove();
  el.classList.remove('content-shimmer');if(state.position)el.style.position=state.position;else el.style.removeProperty('position');
  active.delete(el);
 }
 const observer=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{if(!isIntersecting)return;const state=active.get(target);if(!state||state.timer)return;observer.unobserve(target);state.timer=setTimeout(()=>finish(target),300)})},{threshold:0});
 function prepare(){
  document.querySelectorAll(selector).forEach(el=>{
   if(prepared.has(el)||el.matches('img')||el.closest('[hidden]')||el.parentElement.closest(selector))return;
   prepared.add(el);
   if(el.contains(document.activeElement))return;
   if(el.matches('.event-directory-row')){const key=el.querySelector('a')?.href;if(seenEvents.has(key))return;seenEvents.add(key)}
   const overlay=document.createElement('div');overlay.className='content-shimmer-cover';overlay.setAttribute('aria-hidden','true');
   overlay.innerHTML='<div class="shimmer-block"></div><div class="shimmer-line shimmer-title"></div><div class="shimmer-line"></div><div class="shimmer-line"></div><div class="shimmer-line shimmer-short"></div>';
   const position=el.style.position;
   if(getComputedStyle(el).position==='static')el.style.position='relative';
   active.set(el,{overlay,position,timer:null});el.classList.add('content-shimmer');el.append(overlay);observer.observe(el);
  });
  for(const el of active.keys())if(!el.isConnected)finish(el);
 }
 prepare();
 let scheduled=false;const mutations=new MutationObserver(records=>{if(!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.classList.contains('content-shimmer-cover'))))return;if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;prepare()})}});
 mutations.observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
 // Keyboard users can interact immediately instead of waiting for a visual effect.
 document.addEventListener('focusin',event=>{const el=event.target.closest('.content-shimmer');if(el)finish(el)});
 function finishAll(){for(const el of active.keys())finish(el)}
 reduced.addEventListener('change',()=>{if(reduced.matches){mutations.disconnect();finishAll()}});
 window.addEventListener('pagehide',finishAll);
})();

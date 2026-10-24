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

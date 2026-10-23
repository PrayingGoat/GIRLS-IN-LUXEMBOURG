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
  const targets = document.querySelectorAll('[data-reveal], .hero-copy > *, .events-intro > *, .events-calendar, .membership-intro > *, .membership-card, .community-directory > div, .community-directory > nav, .events-footer');
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

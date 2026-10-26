// Defaults remain available when offline or before the database is configured.
(async()=>{
 const targets=[...document.querySelectorAll('img[data-media-slot]')];if(!targets.length)return;
 try{
  const response=await fetch('/api/site-images',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)return;
  const {images}=await response.json();if(!Array.isArray(images))return;
  for(const item of images){
   if(typeof item.src!=='string'||!(/^(?:\/api\/site-images\?|assets\/)/.test(item.src)))continue;
   const matching=targets.filter(el=>el.dataset.mediaSlot===item.id);if(!matching.length)continue;
   const probe=new Image();probe.src=item.src;try{await probe.decode()}catch{continue}
   for(const el of matching){el.removeAttribute('srcset');el.src=item.src;el.alt=item.alt;el.style.objectPosition=`${item.x}% ${item.y}%`}
  }
 }catch{/* Keep original images. */}
})();

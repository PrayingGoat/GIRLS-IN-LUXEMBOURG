const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu(restoreFocus = false) {
  mobileNav.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const opening = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileNav.hidden = !opening;
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
});
mobileNav.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  closeMenu();
  const target = link.hash ? document.querySelector(link.hash) : null;
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header') && !mobileNav.hidden) closeMenu();
});
window.matchMedia('(min-width: 768px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});
// A single frame update keeps the floating navigation readable while scrolling.
const header = document.querySelector('.site-header');
let headerFrame = false;
const updateHeader = () => {
  header.classList.toggle('is-scrolled', window.scrollY > 65);
  headerFrame = false;
};
window.addEventListener('scroll', () => {
  if (!headerFrame) {
    headerFrame = true;
    requestAnimationFrame(updateHeader);
  }
}, { passive: true });
updateHeader();

// Content is always visible by default, even if JS or animation is unavailable.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
// Photos advance every two seconds; manual navigation resets the interval.
const heroGallery = document.querySelector('.hero-gallery');
if (heroGallery) {
  const slides = [...heroGallery.querySelectorAll('.hero-slide')];
  const counter = heroGallery.querySelector('[data-photo-count]');
  let currentPhoto = 0;
  let photoTimer;
  function showPhoto(next, manual = false) {
    currentPhoto = (next + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      const selected = index === currentPhoto;
      slide.classList.toggle('is-active', selected);
      slide.setAttribute('aria-hidden', String(!selected));
    });
    // Automatic changes stay quiet for screen readers.
    counter.setAttribute('aria-live', manual ? 'polite' : 'off');
    counter.textContent = `${String(currentPhoto + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  }
  function schedulePhoto() {
    clearTimeout(photoTimer);
    photoTimer = setTimeout(() => { showPhoto(currentPhoto + 1); schedulePhoto(); }, 2000);
  }
  heroGallery.querySelector('.hero-gallery-controls').hidden = false;
  for (const [selector, direction] of [['[data-photo-prev]', -1], ['[data-photo-next]', 1]]) {
    heroGallery.querySelector(selector).addEventListener('click', () => { showPhoto(currentPhoto + direction, true); schedulePhoto(); });
  }
  schedulePhoto();
}
// Animate the illustration only while it is on screen; no continuous render loop.
const communityArt = document.querySelector('.community-art');
const communityImage = communityArt?.querySelector('img');
if (communityArt && 'IntersectionObserver' in window) {
  let artVisible = false;
  let artFrame = 0;
  let artEntrance;
  let artRevealed = false;
  const updateArt = () => {
    artFrame = 0;
    if (motionPreference.matches) {
      communityImage.style.transform = '';
      return;
    }
    if (!artVisible) return;
    const bounds = communityArt.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight + bounds.height)));
    const entrance = Math.min(1, progress / .5);
    const scale = .92 + entrance * .08;
    const tilt = (1 - entrance) * 7;
    const lift = (1 - progress) * 44 - 14;
    communityImage.style.transform = `perspective(1200px) translateY(${lift}px) rotateX(${tilt}deg) scale(${scale})`;
  };
  const scheduleArt = () => {
    if (artVisible && !artFrame) artFrame = requestAnimationFrame(updateArt);
  };
  const artObserver = new IntersectionObserver(([entry]) => {
    artVisible = entry.isIntersecting;
    if (artVisible && !motionPreference.matches && !artRevealed) {
      artRevealed = true;
      artEntrance = communityArt.animate([{ opacity: .25 }, { opacity: 1 }], {
        duration: 950, easing: 'cubic-bezier(.2,.7,.2,1)'
      });
    }
    scheduleArt();
  });
  artObserver.observe(communityArt);
  window.addEventListener('scroll', scheduleArt, { passive: true });
  window.addEventListener('resize', scheduleArt, { passive: true });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) artEntrance?.cancel();
    updateArt();
  });
}

// Animate native FAQ disclosures without changing keyboard or no-JS behaviour.
document.querySelectorAll('.faq-list details, .faq-content details').forEach(details => {
  const summary = details.querySelector('summary');
  let animation;
  let expanded = details.open;
  function finish() {
    details.open = expanded;
    details.style.height = '';
    details.style.overflow = '';
    animation = null;
  }
  summary.addEventListener('click', event => {
    if (motionPreference.matches) return;
    event.preventDefault();
    const start = details.getBoundingClientRect().height;
    expanded = animation ? !expanded : !details.open;
    if (animation) { animation.onfinish = null; animation.cancel(); }
    details.open = true;
    details.style.height = '';
    const fullHeight = details.getBoundingClientRect().height;
    details.open = false;
    const closedHeight = details.getBoundingClientRect().height;
    details.open = true;
    details.classList.toggle('faq-expanded', expanded);
    details.style.overflow = 'hidden';
    animation = details.animate(
      { height: [`${start}px`, `${expanded ? fullHeight : closedHeight}px`] },
      { duration: 280, easing: 'cubic-bezier(.22, 1, .36, 1)' }
    );
    animation.onfinish = finish;
  });
  details.addEventListener('toggle', () => {
    if (!animation) details.classList.toggle('faq-expanded', details.open);
  });
  motionPreference.addEventListener('change', () => {
    if (animation && motionPreference.matches) {
      animation.onfinish = null;
      animation.cancel();
      finish();
    }
  });
});

// Navigation identifies the current page without intercepting native links.
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.desktop-nav a, .mobile-nav a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current','page');
  else link.removeAttribute('aria-current');
});
// Keep previously shared section links working after the move to dedicated pages.
const legacyPages = {story:'story.html',faq:'faq.html',team:'team.html',contact:'contact.html','panel-about':'story.html','panel-community':'community.html','panel-team':'team.html','panel-faq':'faq.html','panel-policy':'policy.html','panel-partnerships':'partnerships.html','panel-contact':'contact.html','panel-feedback':'contact.html#feedback','panel-join':'join.html','panel-membership':'join.html'};
if(currentPage === 'index.html' && legacyPages[location.hash.slice(1)]) location.replace(legacyPages[location.hash.slice(1)]);

// Responsive circle carousel with native touch scrolling and keyboard controls.
(() => {
 const track=document.querySelector('.community-circles');
 if(!track)return;
 const cards=[...track.querySelectorAll('.community-circle')];
 const mobile=matchMedia('(max-width:700px)');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const controls=document.createElement('div');controls.className='circle-carousel-controls';
 controls.innerHTML='<span><span class="circle-browse-label">Explore the circles</span> <span class="circle-position"></span></span><div><button type="button" aria-label="Previous circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 12H4m7-7-7 7 7 7"/></svg></button><button type="button" aria-label="Next circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></button></div>';
 const carousel=document.createElement('div');carousel.className='circle-carousel';track.before(carousel);carousel.append(track,controls);
 const [previous,next]=controls.querySelectorAll('button');const position=controls.querySelector('.circle-position');
 let index=0;
 function update(){
  const left=track.getBoundingClientRect().left;
  index=cards.reduce((best,card,i)=>Math.abs(card.getBoundingClientRect().left-left)<Math.abs(cards[best].getBoundingClientRect().left-left)?i:best,0);
  if(track.scrollLeft>=track.scrollWidth-track.clientWidth-2&&track.scrollLeft>0)index=cards.length-1;
  position.textContent=` / ${String(index+1).padStart(2,'0')} of ${String(cards.length).padStart(2,'0')}`;
  previous.disabled=index===0;next.disabled=index===cards.length-1;
 }
 function move(step){const target=cards[Math.max(0,Math.min(cards.length-1,index+step))];track.scrollBy({left:target.getBoundingClientRect().left-track.getBoundingClientRect().left,behavior:reduced.matches?'instant':'smooth'})}
 previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 track.addEventListener('scroll',update,{passive:true});
 track.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();move(event.key==='ArrowRight'?1:-1)}});
 function resize(){track.tabIndex=0;track.setAttribute('aria-label','Community circles. Use the arrow keys to explore.');controls.querySelector('.circle-browse-label').textContent=mobile.matches?'Swipe to explore':'Explore the circles';update()}
 mobile.addEventListener('change',resize);window.addEventListener('resize',resize);resize();
})();

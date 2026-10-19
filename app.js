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
  const target = document.querySelector(link.hash);
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
const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.club-card');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(filter => {
    const selected = filter === button;
    filter.classList.toggle('active', selected);
    filter.setAttribute('aria-pressed', String(selected));
  });
  let visible = 0;
  cards.forEach(card => {
    card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
    if (!card.hidden) visible++;
  });
  document.querySelector('#filter-status').textContent = `${visible} clubs shown.`;
}));

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

// One native dialog keeps reading, nested sections and forms on the landing page.
const communityDialog = document.querySelector('.community-dialog');
const panelContent = communityDialog.querySelector('.panel-content');
const panelHeading = communityDialog.querySelector('#panel-title');
let panelOpener;
let pagePosition = 0;
let bodyStyleBeforePanel = '';
let panelSessionActive = false;
function restorePageAfterPanel() {
  if (!panelSessionActive) return;
  panelSessionActive = false;
  panelContent.replaceChildren();
  document.body.setAttribute('style', bodyStyleBeforePanel);
  window.scrollTo({ top: pagePosition, behavior: 'instant' });
  panelOpener?.focus({ preventScroll: true });
}
function closeCommunityPanel() {
  communityDialog.close();
  restorePageAfterPanel();
}
function showCommunityPanel(key, opener) {
  const template = document.getElementById(`panel-${key}`);
  if (!template) return;
  if (!communityDialog.open) {
    panelSessionActive = true;
    panelOpener = opener || document.activeElement;
    pagePosition = window.scrollY;
    bodyStyleBeforePanel = document.body.getAttribute('style') || '';
    const scrollbarGap = innerWidth - document.documentElement.clientWidth;
    Object.assign(document.body.style, { position: 'fixed', top: `-${pagePosition}px`, width: '100%', paddingRight: `${scrollbarGap}px` });
    communityDialog.showModal();
  }
  panelHeading.textContent = template.dataset.title;
  communityDialog.querySelector('#panel-subtitle').textContent = template.dataset.subtitle;
  communityDialog.querySelector('#panel-number').textContent = `GIRLS IN LUXEMBOURG / ${template.dataset.number}`;
  panelContent.replaceChildren(template.content.cloneNode(true));
  communityDialog.querySelectorAll('.panel-nav [data-panel]').forEach(link => {
    if (link.dataset.panel === key) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  panelContent.scrollTop = 0;
  communityDialog.scrollTop = 0;
  panelHeading.focus({ preventScroll: true });
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-panel]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  showCommunityPanel(link.dataset.panel, link);
});
communityDialog.querySelector('.panel-close').addEventListener('click', closeCommunityPanel);
communityDialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeCommunityPanel();
});
communityDialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [...communityDialog.querySelectorAll('a[href], button:not(:disabled), summary, iframe, input, select, textarea, [tabindex="0"]')]
    .filter(element => element.getClientRects().length > 0);
  const first = focusable[0];
  const last = focusable.at(-1);
  if ((!event.shiftKey && document.activeElement === last) || (event.shiftKey && (document.activeElement === first || document.activeElement === panelHeading))) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  }
});
let pointerOnBackdrop = false;
communityDialog.addEventListener('pointerdown', event => { pointerOnBackdrop = event.target === communityDialog; });
communityDialog.addEventListener('click', event => {
  if (event.target !== communityDialog || !pointerOnBackdrop) return;
  const rect = communityDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeCommunityPanel();
});
communityDialog.addEventListener('close', () => {
  // A queued close event must not clear a newly reopened panel.
  if (!communityDialog.open) restorePageAfterPanel();
});

// Route existing navigation and calls to action to their matching reading panels.
document.querySelectorAll('.about-links a, .footer a').forEach(link => {
  const label = link.textContent.trim();
  const key = /partnership|Partner with/i.test(label) ? 'partnerships'
    : /About us|Our story/i.test(label) ? 'about'
    : /Explore the community|Our clubs/i.test(label) ? 'community'
    : /FAQ|Good to know/i.test(label) ? 'faq'
    : /Join and follow/i.test(label) ? 'join' : null;
  if (key) link.dataset.panel = key;
});

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
if ('IntersectionObserver' in window && !motionPreference.matches) {
  const entrances = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entrances.unobserve(entry.target);
      if (motionPreference.matches) return;
      entry.target.animate([
        { opacity: 0, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' });
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('[data-reveal]').forEach(element => entrances.observe(element));
}

function openPanelFromHash() {
  const key = location.hash.startsWith('#panel-') ? location.hash.slice(7) : '';
  if (key) showCommunityPanel(key);
}
window.addEventListener('hashchange', openPanelFromHash);
openPanelFromHash();

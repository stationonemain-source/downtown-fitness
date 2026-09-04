/* ============================================================================
   Downtown Fitness — below-the-fold scroll craft.
   Loaded after GSAP + ScrollTrigger + film.js. Everything here is optional
   polish: with no GSAP (or under ?jump= / reduced motion) the page renders
   complete and static. GPU-only properties throughout.
   ============================================================================ */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const STATIC = document.documentElement.classList.contains('static');
  if (params.get('jump') !== null || STATIC || params.has('nogsap')) {
    document.documentElement.classList.add('sections-settled');
    return;
  }
  if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') {
    document.documentElement.classList.add('sections-settled');
    return;
  }
  const gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);

  /* Split the lid line into words that rise as the lid slides over the film. */
  for (const el of document.querySelectorAll('[data-split]')) {
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map(w => '<span class="w"><span>' + w + '</span></span>').join(' ');
    gsap.to(el.querySelectorAll('.w > span'), {
      yPercent: 0, opacity: 1, stagger: 0.07, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  }

  /* Rooms: image parallax inside its clipped figure + clip reveal + copy rise. */
  for (const room of document.querySelectorAll('.room')) {
    const img = room.querySelector('.plx');
    const fig = room.querySelector('.room-fig');
    const copy = room.querySelector('.room-copy');
    if (fig) gsap.fromTo(fig, { clipPath: 'inset(10% 6% 10% 6% round 6px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: room, start: 'top 92%', end: 'top 38%', scrub: true },
    });
    if (img) gsap.fromTo(img, { yPercent: -10 }, {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: room, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    if (copy) gsap.from(copy.children, {
      y: 26, opacity: 0, stagger: 0.09, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: room, start: 'top 70%', once: true },
    });
  }


  /* Marquee: constant drift + velocity skew (GPU transforms only). */
  const marq = document.getElementById('marq');
  if (marq) {
    const half = () => marq.scrollWidth / 2 || 1;
    const drift = gsap.to(marq, { x: () => -half(), ease: 'none', duration: 22, repeat: -1,
      modifiers: { x: gsap.utils.unitize(x => parseFloat(x) % half()) } });
    let skew = 0;
    ST.create({
      onUpdate: self => {
        const v = gsap.utils.clamp(-8, 8, self.getVelocity() / 220);
        if (Math.abs(v) > Math.abs(skew)) { skew = v; gsap.to(marq, { skewX: skew, duration: 0.25, overwrite: 'auto',
          onComplete: () => { gsap.to(marq, { skewX: 0, duration: 0.6, ease: 'power2.out' }); skew = 0; } }); }
        drift.timeScale(gsap.utils.clamp(0.6, 3, 1 + Math.abs(self.getVelocity()) / 1500));
      },
    });
  }

  /* Train band: the red rule draws, the headline rises line by line, photo parallax. */
  const train = document.querySelector('.train');
  if (train) {
    gsap.fromTo('.train-rule', { scaleX: 0, transformOrigin: '0 50%' }, {
      scaleX: 1, duration: 0.9, ease: 'power3.inOut',
      scrollTrigger: { trigger: train, start: 'top 74%', once: true } });
    const tp = train.querySelector('.train-photo img');
    if (tp) gsap.fromTo(tp, { yPercent: -8 }, { yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: train, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* Counters: 4.7 and 83 count up once, integer-snapped where whole. */
  for (const el of document.querySelectorAll('[data-count]')) {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.4, ease: 'power2.out',
      onUpdate: () => { el.textContent = o.v.toFixed(dec); },
      scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  }

  /* The strip drives itself: continuous loop, pauses while you're over it. */
  const strip = document.querySelector('.strip');
  if (strip) {
    const track = document.createElement('div');
    track.className = 'strip-track';
    while (strip.firstChild) track.appendChild(strip.firstChild);
    strip.appendChild(track);
    strip.appendChild(track.cloneNode(true));
    strip.style.overflow = 'hidden';
    const both = strip.children;
    const w = () => track.scrollWidth + 14;
    const roll = gsap.to(both, { x: () => -w(), ease: 'none', duration: 46, repeat: -1,
      modifiers: { x: gsap.utils.unitize(x => parseFloat(x) % w()) } });
    strip.addEventListener('pointerenter', () => gsap.to(roll, { timeScale: 0, duration: 0.5 }));
    strip.addEventListener('pointerleave', () => gsap.to(roll, { timeScale: 1, duration: 0.5 }));
    window.addEventListener('load', () => ST.refresh(), { once: true });
  }

  ST.refresh();
})();

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

  /* The strip is a seamless marquee.
     Previous version stopped at the end because ONE cloned track was not wide
     enough to cover the viewport during the wrap, so the tail ran out and the
     jump was visible. This one fills the viewport with as many copies as it
     takes, then wraps on the width of a single copy — the seam is always
     off-screen. Distance is measured only after every image has decoded,
     because lazy images report scrollWidth 0. */
  const strip = document.querySelector('.strip');
  if (strip) {
    const imgs = Array.from(strip.querySelectorAll('img'));
    imgs.forEach(i => { i.loading = 'eager'; });
    const track = document.createElement('div');
    track.className = 'strip-track';
    while (strip.firstChild) track.appendChild(strip.firstChild);
    strip.appendChild(track);
    strip.style.overflow = 'hidden';
    let roll = null, clones = [];
    function build() {
      if (roll) { roll.kill(); roll = null; }
      clones.forEach(c => c.remove()); clones = [];
      const unit = track.scrollWidth;
      if (unit < 600) return;                        // not decoded yet
      const need = Math.ceil((strip.clientWidth * 2) / unit) + 1;
      for (let i = 0; i < need; i++) {
        const c = track.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        strip.appendChild(c); clones.push(c);
      }
      const all = [track, ...clones];
      gsap.set(all, { x: 0 });
      roll = gsap.to(all, {
        x: -unit, ease: 'none', duration: unit / 58, repeat: -1,
        modifiers: { x: gsap.utils.unitize(x => (parseFloat(x) % unit)) },
      });
    }
    Promise.all(imgs.map(i => i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; })))
      .then(() => { build(); ST.refresh(); });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 250); });
    strip.addEventListener('pointerenter', () => roll && gsap.to(roll, { timeScale: 0, duration: 0.5 }));
    strip.addEventListener('pointerleave', () => roll && gsap.to(roll, { timeScale: 1, duration: 0.5 }));
  }


  /* Review columns drift upward and loop — the 21st.dev "testimonials columns"
     effect, written natively. Each track is duplicated once so yPercent:-50 is a
     seamless loop, and the column is clipped to ONE copy's height so the seam is
     never on screen. Pauses on hover. With motion off it is a plain grid. */
  const rvcols = document.getElementById('rvcols');
  if (rvcols) {
    const cols = Array.from(rvcols.querySelectorAll('.rv-col'));
    const build = () => {
      cols.forEach(col => {
        const track = col.querySelector('.rv-track');
        track.querySelectorAll('[data-clone]').forEach(c => c.remove());
        gsap.set(track, { yPercent: 0 });
        const originals = Array.from(track.children);
        const gap = parseFloat(getComputedStyle(track).gap) || 16;
        const copyH = originals.reduce((h, el) => h + el.getBoundingClientRect().height + gap, 0);
        if (window.matchMedia('(max-width: 899px)').matches) {
          // one column on phones: merge everything into the first track, hide the rest
          return;
        }
        originals.forEach(el => { const c = el.cloneNode(true); c.setAttribute('data-clone', ''); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
        col.style.maxHeight = Math.min(copyH, Math.round(window.innerHeight * 0.72)) + 'px';
        if (col._roll) col._roll.kill();
        col._roll = gsap.to(track, { yPercent: -50, ease: 'none', repeat: -1, duration: +col.dataset.speed || 30 });
      });
      rvcols.classList.toggle('rolling', !window.matchMedia('(max-width: 899px)').matches);
    };
    build();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 250); });
    rvcols.addEventListener('pointerenter', () => cols.forEach(c => c._roll && gsap.to(c._roll, { timeScale: 0, duration: .5 })));
    rvcols.addEventListener('pointerleave', () => cols.forEach(c => c._roll && gsap.to(c._roll, { timeScale: 1, duration: .5 })));
  }

  ST.refresh();
})();

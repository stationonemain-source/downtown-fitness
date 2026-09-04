/* ============================================================================
   Downtown Fitness — page shell
   Live Norman clock, the come-on-in sheet, header state, mobile bar, smooth
   scroll, the walk-band video, and the dev contract. Motion for the floor plan
   lives in plan.js; motion for the sections below lives in sections.js.
   ========================================================================= */
(function () {
  'use strict';

  const CONFIG = {
    WE_ARE_OPEN: true,          // flip for a genuine closure; pill + copy follow
    TIMEZONE: 'America/Chicago',
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const html = document.documentElement;
  const params = new URLSearchParams(location.search);
  const JUMP = params.get('jump');
  const STATIC = html.classList.contains('static');
  const DEBUG = params.has('debug');

  if (!CONFIG.WE_ARE_OPEN) html.classList.add('closed');
  if (JUMP !== null) history.scrollRestoration = 'manual';

  /* ------------------------------------------------------------- CLOCK */
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CONFIG.TIMEZONE });
  const clocks = $$('.clock');
  function tickClock() {
    const t = fmt.format(new Date());
    for (const el of clocks) if (el.textContent !== t) el.textContent = t;
  }
  for (const w of $$('.status-word')) w.textContent = CONFIG.WE_ARE_OPEN ? 'Open' : 'Closed';
  tickClock();
  setInterval(tickClock, 15000);

  /* ------------------------------------------------- SMOOTH SCROLL */
  let lenis = null;
  if (JUMP === null && !STATIC && !params.has('nolenis') && typeof window.Lenis === 'function') {
    try {
      lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, autoRaf: false });
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      if (window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);
    } catch (e) { lenis = null; }
  }
  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: 0 });
    else el.scrollIntoView({ behavior: STATIC ? 'auto' : 'smooth', block: 'start' });
  }

  /* --------------------------------------------------------------- CTA */
  // Every .cta opens the two-button sheet. Anything that must DIAL is a plain
  // anchor without .cta — a .cta anchor has its href preventDefaulted here.
  const sheet = $('#sheet');
  for (const b of $$('.cta')) {
    b.addEventListener('click', e => {
      e.preventDefault();
      if (sheet && typeof sheet.showModal === 'function') sheet.showModal();
      else scrollToEl($('#visit'));
    });
  }
  if (sheet) sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
  for (const a of $$('.nav a:not(.cta), .wordmark, .skip')) {
    a.addEventListener('click', e => {
      const t = a.getAttribute('href');
      if (!t || t[0] !== '#') return;
      const el = $(t); if (!el) return;
      e.preventDefault(); scrollToEl(el);
    });
  }

  /* ------------------------------------------- HEADER + MOBILE BAR */
  const chrome = $('#chrome'), mbar = $('#mbar'), hero = $('.plan-hero');
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(([en]) => chrome.classList.toggle('past', !en.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 }).observe(hero);
    if (mbar) new IntersectionObserver(([en]) => {
      mbar.classList.toggle('show', !en.isIntersecting);
    }, { threshold: 0 }).observe(hero);
  }

  /* ------------------------------------------------------ THE WALK */
  // The band video plays only while it is on screen, and never before.
  const walk = $('#hero');
  if (walk && 'IntersectionObserver' in window) {
    walk.pause();
    new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting && !STATIC) walk.play().catch(() => {});
        else walk.pause();
      }
    }, { threshold: 0.25 }).observe(walk);
  }

  /* -------------------------------------------------- DEV CONTRACT */
  const jank = { max: 0, n: 0 };
  window.__jankMax = 0; window.__jankOver50 = 0;
  let last = 0;
  function meter(now) {
    if (last) {
      const dt = now - last;
      if (dt > jank.max) jank.max = dt;
      if (dt > window.__jankMax) window.__jankMax = dt;
      if (dt > 50) { window.__jankOver50++; if (DEBUG) console.log('[df] long frame ' + dt.toFixed(0) + 'ms at ' + (now / 1000).toFixed(2) + 's'); }
      jank.n++;
    }
    last = now;
    requestAnimationFrame(meter);
  }
  requestAnimationFrame(meter);
  if (DEBUG) setInterval(() => {
    if (jank.n) console.log('[df] rAF max ' + jank.max.toFixed(1) + 'ms over ' + jank.n + ' frames · >50ms total: ' + window.__jankOver50);
    jank.max = 0; jank.n = 0;
  }, 2000);

  const fontsDone = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  fontsDone.then(() => {
    const land = () => {
      if (JUMP !== null) window.scrollTo(0, Math.max(0, parseFloat(JUMP) || 0));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (JUMP !== null) window.scrollTo(0, Math.max(0, parseFloat(JUMP) || 0));
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        window.__ready = true;
        if (DEBUG) console.log('[df] ready');
      }));
    };
    if (document.readyState !== 'loading') land();
    else document.addEventListener('DOMContentLoaded', land, { once: true });
  });
})();

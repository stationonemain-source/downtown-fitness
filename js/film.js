/* ============================================================================
   Downtown Fitness — "COME ON IN"
   ----------------------------------------------------------------------------
   The hero is a real video of the walk in: it plays once and holds its last
   frame. The concept's beats ride on video.currentTime. Below it, ordinary
   sections with GSAP ScrollTrigger reveals.

   Performance rules that still apply (from the scroll-film perf memory):
     - one rAF loop, and it PARKS: it runs only while the video is playing or
       Lenis is still easing; wakes on play / seek / scroll / wheel / touch
     - GPU-only animation on the beats (opacity + translate3d), solid gradient
       bands behind copy — no backdrop-filter, no text-shadow over video
     - the adaptive header samples the video's top strip via createImageBitmap
       (async, tiny) so no colour is baked into the chrome: swap the grade and
       the chrome follows
     - asset version querystrings everywhere; lazy-loaded below-fold images
     - dev contract: ?jump=<scrollY> lands pre-scrolled with reveals settled,
       window.__ready fires once the poster is painted and fonts are in, and a
       small jank meter logs per-frame rAF max every 2 s (window.__jankOver50)
   ============================================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- CONFIG */
  const CONFIG = window.__DF_CONFIG = {
    // Flip this ONE line for a genuine closure (weather, emergency). The pill
    // reads CLOSED and the finale swaps WE'RE OPEN for WE'RE CLOSED RIGHT NOW.
    // Where the lead form POSTs (JSON). Empty = no endpoint yet: the form still validates,
    // shows its thank-you, and logs to dataLayer/console, but nothing is delivered.
    // Paste a Formspree id ('https://formspree.io/f/xxxx'), a GHL form webhook, or any
    // endpoint that accepts JSON. Set it once; nothing else on the page changes.
    LEAD_ENDPOINT: '',
    WE_ARE_OPEN: true,

    TIMEZONE: 'America/Chicago',
    ASSET_V: '20260903u',

    // Hero timings on the UNIFIED clock: 0..PRE_S is the still push (page-driven),
    // PRE_S + video.currentTime after that. Beat envelopes live on the .beat elements.
    PRE_S: 6.0,           // the opening photograph's code push (CSS transform, GPU)
    HEAD_S: 1.6,          // real footage that plays BEHIND the opening photograph: the decoder warms on live
                          // motion (a frozen clone here read as a dead photo jerking alive)
    SIGN_EXIT_T: 5.6,     // the fascia sign leaves the frame → wordmark + nav hand off (instant, not a fade)
    FLIP_T: 9.5,          // the cut: outside becomes inside → chrome near-black → white, OPEN pill outline → red-filled

    LUM_THRESHOLD: 138,   // sampled top-strip luminance above which outside chrome is near-black
    SAMPLE_MS: 400,
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const html = document.documentElement;
  const params = new URLSearchParams(location.search);
  const JUMP = params.get('jump');                            // dev contract
  const STATIC = html.classList.contains('static');           // prefers-reduced-motion (set in <head>)
  const DEBUG = params.has('debug');

  if (!CONFIG.WE_ARE_OPEN) html.classList.add('closed');
  if (JUMP !== null) history.scrollRestoration = 'manual';

  /* ---------------------------------------------------------------- CLOCK */
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CONFIG.TIMEZONE });
  const clocks = $$('.clock');
  function tickClock() {
    const t = fmt.format(new Date());
    for (const el of clocks) if (el.textContent !== t) el.textContent = t;
  }
  for (const w of $$('.status-word')) w.textContent = CONFIG.WE_ARE_OPEN ? 'Open' : 'Closed';
  tickClock();
  setInterval(tickClock, 15000);

  /* ------------------------------------------------------------- ELEMENTS */
  const chrome = $('#chrome');
  const hero = $('.hero');
  const video = $('#hero');
  const playBtn = $('#play');
  const bandLight = $('#bandLight');
  const bandDark = $('#bandDark');
  const bandTop = $('#bandTop');
  const sheet = $('#sheet');
  const mbar = $('#mbar');
  const seam = $('#after');

  /* ------------------------------------------------ SMOOTH SCROLL (Lenis) */
  // Driven from THIS loop (lenis.raf inside tick) so the page has one rAF and it
  // can park. Skipped under ?jump= (captures must land exactly) and reduced motion.
  let lenis = null;
  if (JUMP === null && !STATIC && !params.has('nolenis') && typeof window.Lenis === 'function') {
    try { lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1, autoRaf: false }); }
    catch (e) { lenis = null; }
  }

  /* ------------------------------------------------------------------ CTA */
  // COME ON IN: on mobile a two-button sheet (directions / call); on desktop, scroll to VISIT.
  const isMobile = () => matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: 0 });
    else el.scrollIntoView({ behavior: STATIC ? 'auto' : 'smooth', block: 'start' });
  }
  for (const b of $$('.cta')) {
    b.addEventListener('click', e => {
      e.preventDefault();
      if (sheet && typeof sheet.showModal === 'function') sheet.showModal();   // one intentional action, everywhere
      else scrollToEl($('#visit'));
    });
  }
  if (sheet) sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
  for (const a of $$('.nav a:not(.cta), .wordmark')) {
    a.addEventListener('click', e => {
      const t = a.getAttribute('href');
      if (!t || t[0] !== '#') return;
      const el = $(t); if (!el) return;
      e.preventDefault(); scrollToEl(el);
    });
  }

  /* ---------------------------------------- CHROME below the hero + mobile bar */
  if ('IntersectionObserver' in window) {
    // header gets a solid black bar once the hero has scrolled out from under it
    new IntersectionObserver(([en]) => chrome.classList.toggle('past', !en.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 }).observe(hero);
    // the mobile bar appears after the hero
    if (mbar && seam) new IntersectionObserver(([en]) => {
      mbar.classList.toggle('show', en.isIntersecting || en.boundingClientRect.top < 0);
    }, { rootMargin: '0px 0px -40% 0px' }).observe(seam);
  }

  /* ---------------------------------------------- GSAP reveals below the hero */
  const gsapOk = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (gsapOk && JUMP === null && !STATIC && !params.has('nogsap')) {
    html.classList.add('motion');
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.config({ ignoreMobileResize: true });
    if (lenis) lenis.on('scroll', window.ScrollTrigger.update);
    for (const el of $$('.reveal')) {
      window.gsap.to(el, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    }
  }
  // under ?jump= and reduced motion, html.motion is never set: reveals render in their final state.

  /* -------------------------------------------------------------- BEATS */
  // Envelopes in seconds of video: rise in→peak, hold peak→hold, fall hold→out.
  // No data-tout = never fades (the finale over the held last frame).
  const beats = $$('.beat', hero).map(el => {
    const g = (k, d) => el.dataset[k] !== undefined ? parseFloat(el.dataset[k]) : d;
    const tin = g('tin', -1e9), tpeak = g('tpeak', tin), thold = g('thold', tpeak), tout = g('tout', 1e9);
    return { el, tin, tpeak, thold, tout, out: el.classList.contains('beat-out'), finale: el.classList.contains('beat-finale'), a: -1 };
  });
  function beatAlpha(b, t) {
    if (t < b.tin || t > b.tout) return 0;
    if (t < b.tpeak) return (t - b.tin) / Math.max(1e-4, b.tpeak - b.tin);
    if (t <= b.thold) return 1;
    return 1 - (t - b.thold) / Math.max(1e-4, b.tout - b.thold);
  }
  let forceFinale = false;       // autoplay refused / no source: poster + finale copy
  let lastLight = -1, lastDark = -1;
  function updateBeats(t) {
    let light = 0, dark = 0;
    for (const b of beats) {
      let a = forceFinale ? (b.finale ? 1 : 0) : beatAlpha(b, t);
      if (b.out) { if (a > light) light = a; } else if (!b.el.classList.contains('beat-lot')) { if (a > dark) dark = a; }
      if (Math.abs(a - b.a) < 0.004) continue;
      b.a = a;
      const dir = t < b.tpeak ? 1 : -1;                     // enters rising 12px, exits continuing upward
      // 0.996 / 0.02px, never exactly terminal: at opacity 1 + zero transform Chrome
      // demotes the layer and re-rasters the region behind it - a one-time ~350ms
      // GPU tile storm, measured landing exactly when the first beat settled.
      b.el.style.opacity = Math.min(0.996, a).toFixed(3);
      b.el.style.transform = 'translate3d(0,' + Math.max(0.02, (1 - a) * 12) * dir + 'px,0)';
      if (b.finale) b.el.style.pointerEvents = a > 0.5 ? 'auto' : 'none';
    }
    if (Math.abs(light - lastLight) > 0.004) { lastLight = light; bandLight.style.opacity = Math.min(0.996, light).toFixed(3); }
    if (Math.abs(dark - lastDark) > 0.004) { lastDark = dark; bandDark.style.opacity = Math.min(0.996, dark).toFixed(3); }
  }

  /* ------------------------------------------------------------- CHROME */
  // The film is GRADED — its brightness per zone is known, so the chrome is set
  // deterministically (no per-frame video readback: that sampler cost 400-500ms
  // per sample even on the real GPU, measured 2026-09-03).
  let zone = 'lot', lastTopBand = -1;
  function updateChrome(t) {
    const z = forceFinale ? 'in' : t < CONFIG.SIGN_EXIT_T ? 'lot' : t < CONFIG.FLIP_T ? 'out' : 'in';
    if (z !== zone) { zone = z; chrome.dataset.zone = z; chrome.classList.toggle('on-light', z !== 'in'); }
    const tb = z === 'in' ? 0.55 : 0;
    if (tb !== lastTopBand) { lastTopBand = tb; bandTop.style.opacity = tb.toFixed(2); }
  }

  /* ------------------------------------------ ADAPTIVE HEADER (frame sampler) */
  // Every SAMPLE_MS while playing: the visible top strip of the video → 16x4 bitmap
  // (createImageBitmap is async, so the loop never waits on a readback) → mean
  // luminance → chrome colour outside, band strength inside. Default before the
  // first sample: outside reads as pale (the lot is a daytime exterior).
  const sc = document.createElement('canvas'); sc.width = 16; sc.height = 4;
  const sctx = sc.getContext('2d', { willReadFrequently: true });
  let lastSampleT = 0, sampling = false;

  function sample(now) {
    if (sampling || now - lastSampleT < CONFIG.SAMPLE_MS || !video.videoWidth || video.readyState < 2) return;
    lastSampleT = now; sampling = true;
    const vw = video.videoWidth, vh = video.videoHeight;
    const cw = hero.clientWidth, ch = hero.clientHeight;
    const s = Math.max(cw / vw, ch / vh);                       // object-fit: cover, centred
    const dx = (cw - vw * s) / 2, dy = (ch - vh * s) / 2;
    const sx = clamp(-dx / s, 0, vw - 1), sy = clamp(-dy / s, 0, vh - 1);
    const sw = Math.min(vw - sx, cw / s), sh = Math.min(vh - sy, (ch * 0.12) / s);
    let p;
    try { p = createImageBitmap(video, sx, sy, sw, sh, { resizeWidth: 16, resizeHeight: 4, resizeQuality: 'low' }); }
    catch (e) { sampling = false; return; }
    p.then(bmp => {
      sctx.drawImage(bmp, 0, 0); bmp.close();
      const d = sctx.getImageData(0, 0, 16, 4).data;
      let lum = 0;
      for (let i = 0; i < d.length; i += 4) lum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      lum /= d.length / 4;
      chrome.classList.toggle('on-light', lum > CONFIG.LUM_THRESHOLD);
      topBand = lum > CONFIG.LUM_THRESHOLD ? 0.62 : 0.3;        // a bright ceiling wants a stronger band
      lastTopBand = -1;                                          // force a write on the next chrome update
      sampling = false;
    }).catch(() => { sampling = false; });
  }

  /* --------------------------------------------------------------- LOOP */
  let rafId = 0, lastTick = 0;
  const jank = { max: 0, n: 0 };
  window.__jankOver50 = 0; window.__jankMax = 0;

  const playing = () => !video.paused && !video.ended && video.readyState >= 2;
  function wake() { if (!rafId) rafId = requestAnimationFrame(tick); }

  /* ------------------------------------------------- THE UNIFIED HERO CLOCK */
  // 0..PRE_S: the opening still's push (measured off performance.now()).
  // After PRE_S: PRE_S + video time. Before the pre starts (dev captures): 0.
  let preT0 = 0, preDone = false, preTimer = 0;
  function heroT() {
    if (!preDone) return preT0 ? Math.min(CONFIG.PRE_S, (performance.now() - preT0) / 1000) : 0;
    return CONFIG.PRE_S + Math.max(0, (video.ended ? (video.duration || 1e9) : video.currentTime) - CONFIG.HEAD_S);
  }
  function endPre() {                                          // the push lands → the film takes over (already rolling underneath)
    if (preDone) return;
    preDone = true;
    clearTimeout(preTimer);
    if (!params.has('nofilm')) hero.classList.add('film');
    if (!params.has('noplay2') && video.paused && !video.ended) {                        // early start missed (slow network): start now
      const p = video.play();
      if (p && typeof p.then === 'function') p.then(() => { forceFinale = false; wake(); }).catch(blocked);
    }
    wake();
  }
  function rollEarly() {                                       // the decoder's spin-up happens under the photograph
    if (params.has('noplay2') || preDone || video.ended || !video.paused) return;
    const p = video.play();
    if (p && typeof p.then === 'function') p.then(() => { forceFinale = false; }).catch(() => {});
  }
  function startPre() {
    preT0 = performance.now();
    hero.classList.add('pre-run');
    preTimer = setTimeout(endPre, CONFIG.PRE_S * 1000);
    setTimeout(rollEarly, (CONFIG.PRE_S - CONFIG.HEAD_S) * 1000);
    // Warm the video decoder DURING the push: a tiny seek forces the first GOP to
    // decode now, while the push is compositor-driven and immune to main-thread work,
    // so the handoff to the film costs no visible frame.
    if (!params.has('nowarm')) {
      const warm = () => { try { video.currentTime = 0.001; } catch (e) {} };
      if (video.readyState >= 2) warm(); else video.addEventListener('loadeddata', warm, { once: true });
    }
    wake();
  }

  function tick(now) {
    rafId = 0;
    if (lastTick) {                                            // jank meter (only while awake — a park gap is not jank)
      const dt = now - lastTick;
      if (dt > jank.max) jank.max = dt; jank.n++;
      if (dt > 50) { window.__jankOver50++; if (DEBUG) console.log('[hero] long frame ' + dt.toFixed(0) + 'ms at video t=' + video.currentTime.toFixed(2) + ' page t=' + (now / 1000).toFixed(2) + 's'); }
      if (dt > window.__jankMax) window.__jankMax = dt;
    }
    lastTick = now;
    if (lenis) lenis.raf(now);

    const t = heroT();
    updateBeats(t);
    updateChrome(t);

    const busy = playing() || (!preDone && preT0) || (lenis && lenis.isScrolling);
    if (busy) wake(); else lastTick = 0;                       // PARK
  }
  setInterval(() => {
    if (jank.n) console.log('[hero] rAF max ' + jank.max.toFixed(1) + 'ms over ' + jank.n + ' frames (2s) · >50ms total: ' + window.__jankOver50);
    jank.max = 0; jank.n = 0;
  }, 2000);

  /* -------------------------------------------------------------- VIDEO */
  for (const ev of ['play', 'playing', 'seeked', 'timeupdate', 'pause', 'ended', 'loadeddata']) video.addEventListener(ev, wake);
  video.addEventListener('ended', wake);                       // settle the finale beat on the held frame
  video.addEventListener('ended', () => { const pre = $('#pre'); if (pre) pre.style.display = 'none'; }, { once: true });  // tear the still's layer down at the hold, never mid-film
  video.addEventListener('error', () => { forceFinale = true; hero.classList.add('noplay'); wake(); });

  function blocked() {                                         // autoplay refused: poster + one play affordance + finale copy
    forceFinale = true;
    hero.classList.add('blocked');
    playBtn.hidden = false;
    wake();
  }
  playBtn.addEventListener('click', () => {                    // the click IS the user gesture: play directly
    video.play().then(() => { forceFinale = false; hero.classList.remove('blocked'); playBtn.hidden = true; preDone = true; hero.classList.add('film'); wake(); }).catch(() => {});
  });

  if (STATIC) {
    forceFinale = true;                                        // the photograph + finale copy, no motion, no autoplay
    preDone = true;
    hero.classList.add('noplay');
  } else if (JUMP !== null) {
    // dev captures land deterministic: no timers, no push, hero clock reads 0
  } else {
    startPre();                                                // the push runs; the film starts when it lands
  }

  /* --------------------------------------------------------- DEV CONTRACT */
  // wake sources for the loop while Lenis eases or the page scrolls
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('wheel', wake, { passive: true });
  window.addEventListener('touchstart', wake, { passive: true });
  window.addEventListener('touchmove', wake, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastTick = 0; wake(); } });
  if (lenis) lenis.on('scroll', wake);

  // __ready: the opening photograph is painted (loaded, or 404 → the #161616 box) and the fonts are in.
  const posterDone = new Promise(res => {
    const im = $('#preImg');
    if (!im) return res();
    if (im.complete) return res();
    im.onload = im.onerror = () => res();
  });
  const fontsDone = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  Promise.all([posterDone, fontsDone]).then(() => {
    const land = () => {
      if (JUMP !== null) window.scrollTo(0, Math.max(0, parseFloat(JUMP) || 0));
      wake();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (JUMP !== null) window.scrollTo(0, Math.max(0, parseFloat(JUMP) || 0));   // re-land after any late layout
        window.__ready = true;
        if (DEBUG) console.log('[hero] ready · video t=' + video.currentTime.toFixed(2));
      }));
    };
    // Gate on DOM readiness, not window 'load': a streaming <video preload="auto">
    // can hold the load event open for many seconds and __ready must not wait on it.
    if (document.readyState !== 'loading') land(); else document.addEventListener('DOMContentLoaded', land, { once: true });
  });

  wake();
  if (DEBUG) window.__hero = { CONFIG, video, get zone() { return zone; }, get forceFinale() { return forceFinale; } };
})();

/* ============================================================================
   CONVERSION — the only reason the page exists.
   1. every phone tap is counted, labelled by the section it sits in
   2. the lead form: validates, carries attribution (source + referrer + UTM +
      page), posts JSON to CONFIG.LEAD_ENDPOINT, shows a thank-you
   3. the sheet's "Leave your number" closes the sheet and lands on the form
   Everything goes to window.dataLayer so GA4 / GTM can read it without edits.
   ========================================================================= */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const CFG = (window.__DF_CONFIG || {});
  const ENDPOINT = CFG.LEAD_ENDPOINT || '';
  window.dataLayer = window.dataLayer || [];
  const track = (ev, data) => { const row = Object.assign({ event: ev }, data || {}); window.dataLayer.push(row); if (new URLSearchParams(location.search).has('debug')) console.log('[df:track]', row); };

  // attribution captured once, on landing, before anything else is clicked
  const qs = new URLSearchParams(location.search);
  const utm = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].filter(k => qs.get(k)).map(k => k + '=' + qs.get(k)).join('&');
  let ref = '';
  try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
  try { if (!sessionStorage.getItem('df_land')) sessionStorage.setItem('df_land', JSON.stringify({ ref, utm, at: new Date().toISOString() })); } catch (e) {}

  // 1. every tel: tap, labelled by where it is on the page
  $$('a[href^="tel:"]').forEach(a => {
    a.addEventListener('click', () => {
      const sec = a.closest('section, header, nav, footer, dialog');
      const where = a.dataset.track || ('call_' + ((sec && (sec.id || sec.className.split(' ')[0])) || 'page'));
      track('phone_click', { where });
    });
  });

  // 3. sheet -> form
  $$('[data-sheet-jump]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const d = a.closest('dialog'); if (d && d.open) d.close();
    const el = $('#join'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { const f = $('#lead-name'); if (f) f.focus({ preventScroll: true }); }, 700);
    track('cta_click', { where: 'sheet_leave_number' });
  }));

  // 2. the form
  const form = $('#lead');
  if (!form) return;
  const done = $('.lead-done', form), err = $('.lead-err', form), btn = $('button[type="submit"]', form);
  try { const land = JSON.parse(sessionStorage.getItem('df_land') || '{}'); $('#lead-ref').value = land.ref || ref; $('#lead-utm').value = land.utm || utm; } catch (e) {}
  $('#lead-page').value = location.pathname + location.search;

  function valid() {
    let ok = true;
    for (const f of $$('[required]', form)) {
      const bad = !f.value || (f.type === 'tel' && f.value.replace(/\D/g, '').length < 10);
      f.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad && ok) { f.focus(); ok = false; }
    }
    return ok;
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.hidden = true;
    if ($('.hp', form).value) { form.dataset.state = 'sent'; done.hidden = false; return; }   // bot
    if (!valid()) return;
    const data = Object.fromEntries(new FormData(form).entries()); delete data.website;
    data.sent_at = new Date().toISOString();
    btn.disabled = true; btn.textContent = 'Sending…';
    track('lead_submit', { source: data.source, has_goal: !!data.goal, endpoint: ENDPOINT ? 'set' : 'none' });
    let sent = false;
    if (ENDPOINT) {
      try {
        const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) });
        sent = r.ok;
      } catch (x) { sent = false; }
    } else {
      console.warn('[df] LEAD_ENDPOINT is empty — lead not delivered:', data);
      sent = true;   // the visitor still gets the thank-you; the owner must set the endpoint
    }
    btn.disabled = false; btn.textContent = 'Call me back';
    if (sent) { form.dataset.state = 'sent'; done.hidden = false; track('lead_sent', { source: data.source }); done.focus && done.setAttribute('tabindex', '-1'); done.focus(); }
    else { err.hidden = false; track('lead_error', { source: data.source }); }
  });
})();

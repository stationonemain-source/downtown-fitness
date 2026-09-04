/* ============================================================================
   THE FLOOR PLAN — hero engine
   1. every path in the schematic draws itself, sequenced shell -> walls -> kit
   2. the wordmark rises out of the plan's negative space
   3. scroll dives the plan toward the building and hands off to the rooms
   4. a persistent minimap lights the room you are currently in

   Degrades honestly: with no GSAP, under ?jump= or prefers-reduced-motion the
   plan renders complete and static and every room is visible.
   ========================================================================= */
(function () {
  'use strict';
  // The schematic lives in plan.svg so it can be edited as a drawing, not as a
  // string in JS. Fetch, inject, then run everything below against the live DOM.
  const wrapEl = document.getElementById('planWrap');
  if (wrapEl && !wrapEl.querySelector('svg')) {
    fetch('plan.svg').then(r => r.text()).then(t => {
      wrapEl.innerHTML = t.replace(/<!--[\s\S]*?-->/g, '');
      boot();
    }).catch(() => { document.documentElement.classList.add('noplan'); });
    return;
  }
  boot();
  function boot() {
  const params = new URLSearchParams(location.search);
  const STATIC = document.documentElement.classList.contains('static');
  const NOGSAP = params.has('nogsap') || typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined';
  const JUMP = params.get('jump') !== null;

  const svg = document.getElementById('planSvg');
  const wrap = document.querySelector('.plan-wrap');
  const mini = document.querySelector('.minimap');
  const rooms = Array.from(document.querySelectorAll('.rm'));

  /* ---------------------------------------------------- settled fallback */
  function settle() {
    if (svg) {
      svg.querySelectorAll('.pd').forEach(p => { p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = '0'; });
      svg.querySelectorAll('.pl-note text').forEach(t => t.style.opacity = '1');
      svg.querySelectorAll('.pl-room').forEach(r => r.classList.add('lit'));
      const path = svg.querySelector('.pl-path'); if (path) path.style.opacity = '.7';
      const you = svg.querySelector('.pl-you'); if (you) you.setAttribute('opacity', '1');
    }
    document.querySelectorAll('.plan-h1 .w > span').forEach(s => s.style.transform = 'none');
    document.querySelectorAll('.plan-kicker,.plan-sub,.plan-scroll').forEach(e => e.style.opacity = '1');
  }
  if (!svg) return;
  if (STATIC || NOGSAP || JUMP) { settle(); return; }

  const gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);

  /* ------------------------------------------------------- 1. THE DRAW */
  // Dash each stroked path by its own length so it can be drawn rather than faded.
  const groups = ['.pl-shell', '.pl-door', '.pl-wall', '.pl-glass', '.pl-kit'];
  const byGroup = groups.map(sel => Array.from(svg.querySelectorAll(sel + ' .pd')));
  byGroup.flat().forEach(p => {
    const len = p.getTotalLength ? p.getTotalLength() : 400;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });

  // Split the headline into words that rise out of the plan.
  const h1 = document.querySelector('.plan-h1');
  if (h1 && !h1.querySelector('.w')) {
    h1.innerHTML = h1.textContent.trim().split(/\s+/)
      .map(w => '<span class="w"><span>' + w + '</span></span>').join(' ');
  }

  const intro = gsap.timeline({ defaults: { ease: 'power2.out' } });
  intro.to('.plan-kicker', { opacity: 1, duration: .5 }, 0)
       .to(byGroup[0], { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, .15)   // shell
       .to(byGroup[1], { strokeDashoffset: 0, duration: .5 }, 1.0)                           // doors
       .to(byGroup[2], { strokeDashoffset: 0, duration: .7, stagger: .07 }, 1.1)             // walls
       .to(byGroup[3], { strokeDashoffset: 0, duration: .6 }, 1.5)                           // glazing
       .to(byGroup[4], { strokeDashoffset: 0, duration: .9, stagger: .006 }, 1.5)            // equipment
       .to('#planSvg .pl-note text', { opacity: 1, duration: .5, stagger: .05 }, 1.9)
       .to('.plan-h1 .w > span', { y: '0%', duration: .8, stagger: .08, ease: 'power4.out' }, 2.0)
       .to('.plan-sub', { opacity: 1, duration: .5 }, 2.5)
       .to('.plan-scroll', { opacity: 1, duration: .5 }, 2.7)
       .to('#planSvg .pl-path', { opacity: .7, duration: .6 }, 2.6);

  /* -------------------------------------------------------- 2. THE DIVE */
  // Scroll scales the plan toward the building and fades the type out, so the
  // schematic hands the visitor off to the real rooms below.
  gsap.timeline({
    scrollTrigger: { trigger: '.plan-hero', start: 'top top', end: 'bottom bottom', scrub: .6 },
  })
    .to('.plan-wrap', { scale: 3.4, y: '-14%', ease: 'power2.in' }, 0)
    .to('.plan-type', { opacity: 0, y: -40, ease: 'power1.in' }, 0)
    .to('.plan-scroll', { opacity: 0, duration: .1 }, 0);

  /* ------------------------------------------------------ 3. THE MINIMAP */
  // Appears once the schematic hero is behind you; lights the room you are in.
  if (mini) {
    ST.create({
      trigger: '.plan-hero', start: 'bottom 70%',
      onEnter: () => mini.classList.add('show'),
      onLeaveBack: () => mini.classList.remove('show'),
    });
    ST.create({
      trigger: '.foot', start: 'top 85%',
      onEnter: () => mini.classList.remove('show'),
      onLeaveBack: () => mini.classList.add('show'),
    });
  }
  const cap = document.querySelector('.minimap-cap');
  function setRoom(n, name) {
    document.querySelectorAll('.minimap .mm-room').forEach(r =>
      r.classList.toggle('on', r.dataset.room === String(n)));
    svg.querySelectorAll('.pl-room').forEach(r =>
      r.classList.toggle('lit', +r.dataset.room <= n));
    if (cap) cap.textContent = name;
  }

  /* --------------------------------------------------- 4. ROOM CHAPTERS */
  rooms.forEach((rm, i) => {
    const n = i + 1, name = rm.dataset.name || '';
    const fig = rm.querySelector('.rm-fig');
    const media = rm.querySelector('.rm-fig img, .rm-fig video');
    const copy = rm.querySelector('.rm-copy');

    ST.create({ trigger: rm, start: 'top 60%', end: 'bottom 40%',
      onEnter: () => setRoom(n, name), onEnterBack: () => setRoom(n, name) });

    if (fig) gsap.fromTo(fig, { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 1.05, ease: 'power3.inOut',
        scrollTrigger: { trigger: rm, start: 'top 78%', once: true } });

    if (media) gsap.fromTo(media, { yPercent: -5 }, { yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: rm, start: 'top bottom', end: 'bottom top', scrub: true } });

    if (copy) gsap.from(copy.children, { y: 24, opacity: 0, duration: .7, stagger: .08,
      ease: 'power3.out', scrollTrigger: { trigger: rm, start: 'top 66%', once: true } });
  });

  // a room video only plays while it is on screen
  document.querySelectorAll('.rm-fig video').forEach(v => {
    v.pause();
    ST.create({ trigger: v.closest('.rm'), start: 'top 85%', end: 'bottom 15%',
      onEnter: () => v.play().catch(() => {}), onEnterBack: () => v.play().catch(() => {}),
      onLeave: () => v.pause(), onLeaveBack: () => v.pause() });
  });

  ST.refresh();
  }
})();

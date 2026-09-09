/* ============================================================================
   Downtown Fitness — the side navigation.
   A panel that slides in from the right at every viewport. On a phone it is the
   only navigation there is (the header links are hidden under 769px); on a
   desktop it is the fuller one: every section, the phone number, directions,
   hours and the socials in one place.

   Contract: closed means inert, so nothing inside it is tabbable or readable by
   a screen reader; Escape and the backdrop close it; focus goes in on open and
   comes back to the button on close; Tab is trapped while it is open.
   ========================================================================== */
(function () {
  'use strict';
  var panel = document.getElementById('sidenav');
  var btn = document.getElementById('navToggle');
  var scrim = document.getElementById('navScrim');
  if (!panel || !btn || !scrim) return;

  var closeBtn = panel.querySelector('.sidenav-close');
  var lastFocus = null;
  var open = false;

  function focusables() {
    return Array.prototype.filter.call(
      panel.querySelectorAll('a[href], button:not([disabled])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function setOpen(next) {
    if (next === open) return;
    open = next;
    document.documentElement.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      lastFocus = document.activeElement;
      panel.removeAttribute('inert');
      var f = focusables();
      (closeBtn || f[0] || panel).focus({ preventScroll: true });
    } else {
      panel.setAttribute('inert', '');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
  }

  panel.setAttribute('inert', '');

  btn.addEventListener('click', function () { setOpen(!open); });
  scrim.addEventListener('click', function () { setOpen(false); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });

  // A section link closes the panel, then the browser handles the jump.
  panel.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (a && a.getAttribute('href').charAt(0) === '#') setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // The panel is fixed, so a resize past a breakpoint should not strand it open.
  var wide = matchMedia('(min-width: 769px)');
  (wide.addEventListener ? wide.addEventListener.bind(wide, 'change') : wide.addListener.bind(wide))(function () {
    if (open) setOpen(false);
  });

  /* Which section am I in — lights the matching row while the panel is open and
     marks it for the header links too. One observer, no scroll handler. */
  var links = Array.prototype.slice.call(panel.querySelectorAll('[data-sec]'));
  var targets = links.map(function (a) { return document.getElementById(a.dataset.sec); }).filter(Boolean);
  if ('IntersectionObserver' in window && targets.length) {
    var seen = {};
    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (r) { seen[r.target.id] = r.intersectionRatio; });
      var best = null, bestRatio = 0;
      Object.keys(seen).forEach(function (id) {
        if (seen[id] > bestRatio) { bestRatio = seen[id]; best = id; }
      });
      links.forEach(function (a) {
        var on = a.dataset.sec === best && bestRatio > 0;
        a.classList.toggle('here', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }, { threshold: [0, 0.25, 0.5, 0.75], rootMargin: '-45% 0px -45% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }
})();

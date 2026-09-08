/* ============================================================================
   Downtown Fitness — the desk widget.
   NOT live chat. Nobody is sitting on the other end, so it never says anyone
   is. It takes a name, a number and a message, posts them to the same endpoint
   the page's form uses, and says the desk will call back. If the endpoint is
   not set it still thanks the visitor and logs, exactly like the main form.
   ============================================================================ */
(function () {
  'use strict';
  var CFG = window.__DF_CONFIG || {};
  var ENDPOINT = CFG.LEAD_ENDPOINT || '';
  var root = document.getElementById('desk');
  if (!root) return;

  var btn    = root.querySelector('.desk-btn');
  var panel  = root.querySelector('.desk-panel');
  var form   = root.querySelector('.desk-form');
  var close  = root.querySelector('.desk-close');
  var done   = root.querySelector('.desk-done');
  var err    = root.querySelector('.desk-err');
  var submit = form.querySelector('button[type="submit"]');
  var open   = false;

  window.dataLayer = window.dataLayer || [];
  function track(ev, data) {
    var row = Object.assign({ event: ev }, data || {});
    window.dataLayer.push(row);
    if (new URLSearchParams(location.search).has('debug')) console.log('[df:track]', row);
  }

  function setOpen(v) {
    open = v;
    root.classList.toggle('is-open', v);
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    panel.hidden = !v;
    if (v) {
      track('desk_open', {});
      var f = form.querySelector('input, textarea');
      if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 60);
    } else {
      btn.focus({ preventScroll: true });
    }
  }

  btn.addEventListener('click', function () { setOpen(!open); });
  close.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) setOpen(false);
  });

  // keep focus inside the panel while it is open
  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = panel.querySelectorAll('button, input, textarea, a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  function valid() {
    var ok = true;
    var fields = form.querySelectorAll('[required]');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var bad = !f.value.trim() || (f.type === 'tel' && f.value.replace(/\D/g, '').length < 10);
      f.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad && ok) { f.focus(); ok = false; }
    }
    return ok;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    if (form.querySelector('.hp').value) { finish(); return; }   // bot
    if (!valid()) return;

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    delete data.website;
    data.source = 'Desk widget';
    data.page = location.pathname + location.search;
    data.sent_at = new Date().toISOString();
    try {
      var land = JSON.parse(sessionStorage.getItem('df_land') || '{}');
      data.referrer = land.ref || '';
      data.utm = land.utm || '';
    } catch (x) {}

    submit.disabled = true;
    submit.textContent = 'Sending…';
    track('desk_submit', { has_message: !!data.message });

    var settle = function (sent) {
      submit.disabled = false;
      submit.textContent = 'Send it';
      if (sent) { finish(); track('desk_sent', {}); }
      else { err.hidden = false; track('desk_error', {}); }
    };

    if (!ENDPOINT) {
      console.warn('[df] LEAD_ENDPOINT is empty — desk message not delivered:', data);
      settle(true);
      return;
    }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) { settle(r.ok); }).catch(function () { settle(false); });
  });

  function finish() {
    form.hidden = true;
    done.hidden = false;
    done.setAttribute('tabindex', '-1');
    done.focus({ preventScroll: true });
  }
})();

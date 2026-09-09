/* ============================================================================
   Downtown Fitness — ask the desk.
   A real assistant: the page posts the conversation to an n8n webhook, which
   holds the model key server-side and answers from a fixed set of facts about
   this gym. It is NOT a person and never claims to be. Anything it does not
   know (prices, contracts, anything invented) it hands to the phone.
   Falls back to a plain call-the-desk panel if the endpoint cannot be reached.
   ============================================================================ */
(function () {
  'use strict';
  var ENDPOINT = 'https://n8n.srv1748596.hstgr.cloud/webhook/downtown-fitness-desk';
  var PHONE = '(405) 801-2929';
  var root = document.getElementById('desk');
  if (!root) return;

  var btn   = root.querySelector('.desk-btn');
  var panel = root.querySelector('.desk-panel');
  var close = root.querySelector('.desk-close');
  var log   = root.querySelector('.desk-log');
  var form  = root.querySelector('.desk-form');
  var input = root.querySelector('.desk-input');
  var send  = root.querySelector('.desk-send');
  var chips = root.querySelector('.desk-chips');
  var open = false, busy = false, greeted = false;
  var history = [];

  window.dataLayer = window.dataLayer || [];
  function track(ev, data) {
    window.dataLayer.push(Object.assign({ event: ev }, data || {}));
  }

  function bubble(role, text, cls) {
    var el = document.createElement('div');
    el.className = 'desk-msg desk-' + role + (cls ? ' ' + cls : '');
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function setOpen(v) {
    open = v;
    root.classList.toggle('is-open', v);
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    panel.hidden = !v;
    if (!v) { btn.focus({ preventScroll: true }); return; }
    track('desk_open', {});
    if (!greeted) {
      greeted = true;
      bubble('bot', "Hey. Ask me anything about the gym — hours, the floor, training, where we are. I'm an assistant, so for prices or anything I can't answer, the desk is on " + PHONE + '.');
    }
    setTimeout(function () { input.focus({ preventScroll: true }); }, 60);
  }

  btn.addEventListener('click', function () { setOpen(!open); });
  close.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) setOpen(false); });

  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = panel.querySelectorAll('button, input, a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  if (chips) {
    chips.addEventListener('click', function (e) {
      var c = e.target.closest('.desk-chip');
      if (!c || busy) return;
      chips.remove();
      ask(c.textContent.trim());
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value.trim();
    if (!t || busy) return;
    if (chips && chips.parentNode) chips.remove();
    ask(t);
  });

  function ask(text) {
    bubble('you', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    busy = true;
    send.disabled = true;
    var think = bubble('bot', 'Typing…', 'is-thinking');
    track('desk_ask', {});

    var done = function (reply, ok) {
      think.remove();
      busy = false;
      send.disabled = false;
      if (ok) {
        bubble('bot', reply);
        history.push({ role: 'assistant', content: reply });
        track('desk_reply', {});
      } else {
        var el = bubble('bot', "I can't reach the desk assistant right now. Call " + PHONE + " and someone will pick up, or just walk in — the door is open.", 'is-err');
        var a = document.createElement('a');
        a.href = 'tel:4058012929'; a.className = 'desk-callnow'; a.textContent = 'Call ' + PHONE;
        el.appendChild(document.createElement('br')); el.appendChild(a);
        track('desk_error', {});
      }
      input.focus({ preventScroll: true });
    };

    var timer = setTimeout(function () { done('', false); }, 25000);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-10) })
    }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (d) {
      clearTimeout(timer);
      if (busy) done(d && d.reply ? d.reply : '', !!(d && d.reply));
    }).catch(function () {
      clearTimeout(timer);
      if (busy) done('', false);
    });
  }
})();

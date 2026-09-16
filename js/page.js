/* Subpages: the live desk status and phone-tap tracking. The home page does this in film.js,
   which also drives the hero film and cannot run without it. Keep the STAFFED table in step. */
(function () {
  'use strict';
  var TZ = 'America/Chicago';
  var STAFFED = { 1: [8, 20], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20], 6: [12, 17], 0: [12, 17] };
  var DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var partsFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false, timeZone: TZ });
  var clockFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
  function hLabel(h) { return (h % 12 || 12) + (h < 12 ? 'am' : 'pm'); }
  function state() {
    var p = {}; partsFmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var day = DAYS[p.weekday], mins = (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10);
    var o = STAFFED[day][0], c = STAFFED[day][1];
    if (mins >= o * 60 && mins < c * 60) return { open: true, long: 'The desk is staffed until ' + hLabel(c) + '.', short: 'Desk open until ' + hLabel(c) };
    var when = 'today', no = o;
    if (mins >= o * 60) { no = STAFFED[(day + 1) % 7][0]; when = 'tomorrow'; }
    return { open: false, long: 'Members have 24-hour access; the desk opens ' + when + ' at ' + hLabel(no) + '.', short: 'Members 24/7 · desk opens ' + hLabel(no) };
  }
  function tick() {
    var d = state(), t = clockFmt.format(new Date());
    document.querySelectorAll('.clock').forEach(function (el) { if (el.textContent !== t) el.textContent = t; });
    document.querySelectorAll('.status-word').forEach(function (el) { el.textContent = d.open ? 'Desk open' : 'Members 24/7'; });
    document.querySelectorAll('.desk-now').forEach(function (el) { var s = el.classList.contains('short') ? d.short : d.long; if (el.textContent !== s) el.textContent = s; });
  }
  tick(); setInterval(tick, 15000);

  window.dataLayer = window.dataLayer || [];
  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener('click', function () { window.dataLayer.push({ event: 'phone_click', where: a.getAttribute('data-track') || 'call_' + location.pathname }); });
  });
})();

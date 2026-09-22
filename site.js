/* ferryornot.app — one script, no dependencies, no tracking.
   Launch state lives on <html data-launch="pre|live">. Flip it on launch day (#37). */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- launch state: one place for every CTA ---------- */
  var TESTFLIGHT_URL = 'https://testflight.apple.com/join/j1xDe64e';
  var APP_STORE_URL  = 'https://apps.apple.com/app/id6782129413';
  // Optional App Analytics provider token. When set, each CTA position is attributed
  // in App Store Connect (ct = hero | nav | sticky | pricing | close). Empty = plain links.
  var PROVIDER_TOKEN = '';

  var STATES = {
    pre:  { eyebrow: 'Now in App Review',    label: 'Join the TestFlight beta',   href: TESTFLIGHT_URL, sticky: 'Join the beta · free on TestFlight', qr: '/assets/qr-testflight.svg' },
    live: { eyebrow: 'Now on the App Store', label: 'Download on the App Store', href: APP_STORE_URL,  sticky: 'Download · 7 days free',            qr: '/assets/qr-appstore.svg' }
  };
  var mode = document.documentElement.getAttribute('data-launch') === 'live' ? 'live' : 'pre';
  var S = STATES[mode];

  function ctaHref(position) {
    if (mode === 'live' && PROVIDER_TOKEN) {
      return S.href + '?pt=' + encodeURIComponent(PROVIDER_TOKEN) + '&ct=' + position + '&mt=8';
    }
    return S.href;
  }
  document.querySelectorAll('[data-cta]').forEach(function (a) {
    var pos = a.getAttribute('data-cta');
    a.href = ctaHref(pos);
    if (pos === 'nav') a.textContent = mode === 'live' ? 'Download' : 'Join the beta';
    else if (pos === 'sticky') a.textContent = S.sticky;
    else a.textContent = S.label;
    a.rel = 'noopener';
  });
  document.querySelectorAll('[data-eyebrow]').forEach(function (e) { e.textContent = S.eyebrow; });
  var qr = document.getElementById('qr'); if (qr) qr.src = S.qr;

  /* ---------- nav progress line = the journey bar ---------- */
  var prog = document.querySelector('.prog');
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (prog) prog.style.setProperty('--p', (p * 100).toFixed(2) + '%');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- hero: the verdict resolves once ---------- */
  var card = document.getElementById('vcard');
  if (card && !reduce) {
    card.classList.add('arm');
    var steps = card.querySelectorAll('[data-step]');
    var bar = card.querySelector('[data-bar]');
    var cmp = document.getElementById('cmp-text');
    var cmpHTML = cmp ? cmp.innerHTML : '';
    var cmpText = cmp ? cmp.textContent : '';
    var t = 350;
    steps.forEach(function (el, i) {
      var delay = t + i * 520;
      if (i === 1 && cmp) {
        // the comparison line types out, then the real markup is restored
        setTimeout(function () {
          el.classList.add('in');
          var n = 0;
          cmp.textContent = '';
          var iv = setInterval(function () {
            n += 2;
            cmp.textContent = cmpText.slice(0, n);
            if (n >= cmpText.length) { clearInterval(iv); cmp.innerHTML = cmpHTML; }
          }, 14);
        }, delay);
        t += 700;
      } else {
        setTimeout(function () { el.classList.add('in'); }, delay);
      }
      if (i === 3 && bar) setTimeout(function () { bar.classList.add('in'); }, delay + 250);
    });
  }

  /* ---------- the bet: draw the routes when the chart is seen ---------- */
  var chart = document.getElementById('chart');
  function observe(el, cb, threshold) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { cb(); io.disconnect(); } });
    }, { threshold: threshold || 0.35 });
    io.observe(el);
  }
  observe(chart, function () { chart.classList.add('draw'); });

  /* ---------- how it decides: three states, only real ones render ---------- */
  // Each state is a real capture. A state marked pending is not shown; when all three
  // are real, the chip row appears by itself. Minutes drive the bar widths.
  var DECISIONS = [
    { key: 'now', chip: 'Leave now', pending: false,
      line: 'Leaving now, <em>take the 1:15 PM ferry</em> — 43 min sooner.',
      ferry: { legs: [17, 7, 33, 8], sub: '1 HR 6 M · DOOR TO DOOR', flag: 'SOONER BY 43 MIN' },
      drive: { min: 109, sub: '1 HR 49 M · BY THE NARROWS', legs: '109m driving · live traffic' } },
    { key: 'arrive', chip: 'Arrive by', pending: true },   // capture owed: an Arrive-by verdict
    { key: 'drive',  chip: 'Drive around', pending: true } // capture owed: a Drive-around verdict with its reason
  ];
  var chips = document.getElementById('chips');
  var real = DECISIONS.filter(function (d) { return !d.pending; });
  function render(d) {
    var total = Math.max(d.drive.min, d.ferry.legs.reduce(function (a, b) { return a + b; }, 0));
    var fb = document.getElementById('bar-ferry');
    if (fb) fb.querySelectorAll('i').forEach(function (i, k) { i.style.flexBasis = (d.ferry.legs[k] / total * 100).toFixed(1) + '%'; });
    var db = document.getElementById('bar-drive');
    if (db) db.querySelector('i').style.flexBasis = (d.drive.min / total * 100).toFixed(1) + '%';
    document.getElementById('verdictline').innerHTML = d.line;
    document.getElementById('ferry-sub').textContent = d.ferry.sub;
    document.getElementById('drive-sub').textContent = d.drive.sub;
    document.getElementById('drive-legs').textContent = d.drive.legs;
    var flag = document.getElementById('flag');
    if (flag) { flag.textContent = d.ferry.flag || ''; flag.hidden = !d.ferry.flag; }
    var legs = document.getElementById('legs-ferry');
    if (legs) legs.innerHTML = ['drive', 'wait', 'sailing', 'drive'].map(function (n, k) { return '<span>' + d.ferry.legs[k] + 'm ' + n + '</span>'; }).join('');
  }
  if (chips && real.length === DECISIONS.length) {
    chips.hidden = false;
    real.forEach(function (d, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = d.chip;
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        chips.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        render(d);
      });
      chips.appendChild(b);
    });
  }
  if (real[0]) render(real[0]);

  /* ---------- checks ledger fills in ---------- */
  var ledger = document.getElementById('ledger');
  if (ledger && !reduce) {
    ledger.classList.add('arm');
    observe(ledger, function () {
      ledger.querySelectorAll('.row').forEach(function (r, i) { setTimeout(function () { r.classList.add('in'); }, 120 + i * 140); });
    }, 0.3);
  }

  /* ---------- the night crossing: the phone follows the steps ---------- */
  var la = document.getElementById('la');
  var phone = document.getElementById('phone');
  var stepEls = document.querySelectorAll('#steps .step');
  var PHONE = {
    1: { clock: '12:49', status: 'Leave by 12:53 PM', count: '25:––', ves: 'Tacoma inbound · docks 12:58 PM' },
    2: { clock: '12:52', status: 'Leave by 12:53 PM', count: '23:––', ves: 'Tacoma inbound · docks 12:58 PM' },
    3: { clock: '1:09',  count: '5:––', ves: '' },
    4: { clock: '1:17' }
  };
  function setPhone(n) {
    var s = PHONE[n]; if (!s || !la) return;
    stepEls.forEach(function (el) { el.classList.toggle('on', el.getAttribute('data-state') === String(n)); });
    document.getElementById('clock').textContent = s.clock;
    if (n === 4) { la.classList.add('gone'); phone.classList.add('done'); return; }
    la.classList.remove('gone'); phone.classList.remove('done');
    la.setAttribute('data-state', String(n));
    if (s.status) document.getElementById('la-status').textContent = s.status;
    if (s.count) document.getElementById('la-count').textContent = s.count;
    document.getElementById('la-ves').textContent = s.ves || '';
  }
  if (stepEls.length && 'IntersectionObserver' in window && window.matchMedia('(min-width: 861px)').matches) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setPhone(+e.target.getAttribute('data-state')); });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    stepEls.forEach(function (el) { sio.observe(el); });
  } else {
    // narrow screens: the phone sits above the steps, so cycle it by tapping a step
    stepEls.forEach(function (el) {
      el.addEventListener('click', function () { setPhone(+el.getAttribute('data-state')); });
    });
  }

  /* ---------- pricing toggle ---------- */
  var PRICES = {
    month: { amount: '$1.49', unit: '/ month', per: 'About 5¢ a day.', anchor: 'Less than six percent of one car fare a month.' },
    year:  { amount: '$14.99', unit: '/ year', per: 'About 4¢ a day. Saves 16% over monthly.', anchor: 'About half of one car fare, for the whole year.' }
  };
  function setPrice(k) {
    var p = PRICES[k];
    document.getElementById('amount').innerHTML = p.amount + '<small>' + p.unit + '</small>';
    document.getElementById('per').textContent = p.per;
    document.getElementById('anchor').textContent = p.anchor;
    document.getElementById('seg-month').setAttribute('aria-pressed', String(k === 'month'));
    document.getElementById('seg-year').setAttribute('aria-pressed', String(k === 'year'));
  }
  var sm = document.getElementById('seg-month'), sy = document.getElementById('seg-year');
  if (sm && sy) { sm.addEventListener('click', function () { setPrice('month'); }); sy.addEventListener('click', function () { setPrice('year'); }); }

  /* ---------- sticky mobile CTA: after the hero button, not over pricing ---------- */
  var stick = document.getElementById('stick');
  var heroCta = document.getElementById('hero-cta');
  var pricing = document.querySelector('.pcard');
  if (stick && heroCta && pricing && 'IntersectionObserver' in window) {
    var heroSeen = true, pricingSeen = false;
    function update() { stick.classList.toggle('show', !heroSeen && !pricingSeen); }
    new IntersectionObserver(function (en) { heroSeen = en[0].isIntersecting; update(); }).observe(heroCta);
    new IntersectionObserver(function (en) { pricingSeen = en[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(pricing);
  }

  /* ---------- gallery: arrow keys ---------- */
  var gal = document.getElementById('gallery');
  if (gal) gal.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { gal.scrollBy({ left: 272, behavior: reduce ? 'auto' : 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { gal.scrollBy({ left: -272, behavior: reduce ? 'auto' : 'smooth' }); e.preventDefault(); }
  });
})();

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
    pre:  { eyebrow: 'Now in App Review',    label: 'Join the TestFlight beta',   href: TESTFLIGHT_URL, sticky: 'Join the beta · free', qr: '/assets/qr-testflight.svg' },
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

  /* ---------- the bet: a real map, self-hosted, with a point-light-and-trail on both routes ---------- */
  var chart = document.getElementById('chart');
  function observe(el, cb, threshold, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { cb(); io.disconnect(); } });
    }, { threshold: threshold || 0, rootMargin: margin || '0px' });
    io.observe(el);
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function webgl() {
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }
  // Fallback: the schematic SVG draws itself if the map can't run.
  function drawFallback() { chart.classList.add('draw'); }

  function initMap(routes) {
    var cs = getComputedStyle(document.documentElement);
    var tok = function (n) { return cs.getPropertyValue(n).trim(); };
    var C = { water: tok('--map-water'), land: tok('--map-land'), park: tok('--map-park'), road: tok('--map-road'), hwy: tok('--map-hwy'), coast: tok('--map-coast'), brass: tok('--brass'), ink: tok('--ink'), red: tok('--red'), card: tok('--card') };
    var protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    var style = {
      version: 8,
      sources: { base: { type: 'vector', url: 'pmtiles:///assets/map/puget.pmtiles?v=20260921' } },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': C.water } },
        { id: 'earth', type: 'fill', source: 'base', 'source-layer': 'earth', paint: { 'fill-color': C.land } },
        { id: 'park', type: 'fill', source: 'base', 'source-layer': 'landuse', filter: ['in', 'kind', 'park', 'forest', 'wood', 'nature_reserve', 'protected_area', 'national_park', 'golf_course', 'cemetery'], paint: { 'fill-color': C.park, 'fill-opacity': 0.8 } },
        { id: 'water', type: 'fill', source: 'base', 'source-layer': 'water', paint: { 'fill-color': C.water } },
        { id: 'coast', type: 'line', source: 'base', 'source-layer': 'water', filter: ['==', '$type', 'Polygon'], paint: { 'line-color': C.coast, 'line-width': 0.8 } },
        { id: 'roads-minor', type: 'line', source: 'base', 'source-layer': 'roads', minzoom: 10, filter: ['in', 'kind', 'minor_road', 'medium_road'], paint: { 'line-color': C.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 13, 1.2] } },
        { id: 'roads-major', type: 'line', source: 'base', 'source-layer': 'roads', filter: ['==', 'kind', 'major_road'], paint: { 'line-color': C.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 13, 2] } },
        { id: 'roads-hwy', type: 'line', source: 'base', 'source-layer': 'roads', filter: ['==', 'kind', 'highway'], paint: { 'line-color': C.hwy, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 13, 3.5] } }
      ]
    };
    chart.classList.add('live');
    var map = new maplibregl.Map({ container: 'mapwrap', style: style, interactive: false, attributionControl: false, fadeDuration: 0 });
    requestAnimationFrame(function () { map.resize(); fit(); });
    var drive = routes.features.filter(function (f) { return f.properties.kind === 'drive'; })[0].geometry.coordinates;
    var boat = routes.features.filter(function (f) { return f.properties.kind === 'boat'; })[0].geometry.coordinates;
    var all = drive.concat(boat);
    var bounds = all.reduce(function (b, c) { return b.extend(c); }, new maplibregl.LngLatBounds(all[0], all[0]));
    function fit() { map.fitBounds(bounds, { padding: { top: 36, bottom: 40, left: 54, right: 96 }, duration: 0 }); }
    fit();

    function marker(lngLat, cls, text) {
      var el = document.createElement('div'); el.className = cls; if (text) el.textContent = text;
      new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map);
    }
    marker([-122.283, 47.6062], 'mlbl', 'Seattle');
    marker([-122.548, 47.668], 'mlbl', 'Bainbridge Island');
    marker([-122.662, 47.556], 'mlbl', 'Bremerton');
    marker([-122.415, 47.232], 'mlbl', 'Tacoma');
    marker([-122.4596, 47.4471], 'mlbl dim', 'Vashon');
    marker([-122.6463, 47.7357], 'mlbl dim', 'Poulsbo');
    marker([-122.612, 47.292], 'mlbl dim', 'Tacoma Narrows');
    marker(boat[0], 'mdot'); marker(boat[boat.length - 1], 'mdot to');
    marker([-122.425, 47.643], 'mlbl note', '33 min on the water');
    marker([-122.745, 47.405], 'mlbl note road', '1 hr 49 m driving around');

    function applyTheme() {
      var cs2 = getComputedStyle(document.documentElement);
      var t = function (n) { return cs2.getPropertyValue(n).trim(); };
      C = { water: t('--map-water'), land: t('--map-land'), park: t('--map-park'), road: t('--map-road'), hwy: t('--map-hwy'), coast: t('--map-coast'), brass: t('--brass'), ink: t('--ink'), red: t('--red'), card: t('--card') };
      if (!map.isStyleLoaded()) return;
      map.setPaintProperty('bg', 'background-color', C.water); map.setPaintProperty('water', 'fill-color', C.water);
      map.setPaintProperty('earth', 'fill-color', C.land); map.setPaintProperty('park', 'fill-color', C.park);
      map.setPaintProperty('coast', 'line-color', C.coast);
      map.setPaintProperty('roads-minor', 'line-color', C.road); map.setPaintProperty('roads-major', 'line-color', C.road); map.setPaintProperty('roads-hwy', 'line-color', C.hwy);
      if (map.getLayer('drive-track')) { map.setPaintProperty('drive-track', 'line-color', C.ink); map.setPaintProperty('boat-track', 'line-color', C.brass);
        map.setPaintProperty('drive-trail', 'line-gradient', ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(0,0,0,0)', 1, C.ink]);
        map.setPaintProperty('boat-trail', 'line-gradient', ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(0,0,0,0)', 1, C.brass]); }
      if (R) { R.drive.col = C.ink; R.boat.col = C.brass; }
    }
    var R = null;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    map.on('load', function () {
      function line(id, coords, color, width, dash, opacity) {
        map.addSource(id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
        var paint = { 'line-color': color, 'line-width': width, 'line-opacity': opacity };
        if (dash) paint['line-dasharray'] = dash;
        map.addLayer({ id: id, type: 'line', source: id, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: paint });
      }
      line('drive-track', drive, C.ink, 2, [1, 2.2], 0.45);
      line('boat-track', boat, C.brass, 2.5, [1, 2.2], 0.55);
      // trails: sliced per frame, faded along their length
      ['drive', 'boat'].forEach(function (k) {
        map.addSource(k + '-trail', { type: 'geojson', lineMetrics: true, data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
        var col = k === 'boat' ? C.brass : C.ink;
        map.addLayer({ id: k + '-trail', type: 'line', source: k + '-trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
          'line-width': k === 'boat' ? 5 : 4,
          'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(0,0,0,0)', 1, col]
        } });
      });
      map.addSource('heads', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'head-glow', type: 'circle', source: 'heads', paint: { 'circle-radius': 16, 'circle-color': ['get', 'color'], 'circle-opacity': 0.28, 'circle-blur': 1 } });
      map.addLayer({ id: 'head-core', type: 'circle', source: 'heads', paint: { 'circle-radius': 4.5, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });

      // geometry helpers
      function cum(coords) {
        var d = [0]; for (var i = 1; i < coords.length; i++) {
          var a = coords[i - 1], b = coords[i]; var kx = Math.cos(a[1] * Math.PI / 180);
          d.push(d[i - 1] + Math.hypot((b[0] - a[0]) * kx, b[1] - a[1]));
        } return d;
      }
      function along(coords, d, t) { // point at fraction t
        var L = d[d.length - 1] * t; var i = 1; while (i < d.length && d[i] < L) i++;
        if (i >= d.length) return coords[coords.length - 1];
        var f = (L - d[i - 1]) / ((d[i] - d[i - 1]) || 1); var a = coords[i - 1], b = coords[i];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      function slice(coords, d, t0, t1) {
        var out = [along(coords, d, t0)]; var L0 = d[d.length - 1] * t0, L1 = d[d.length - 1] * t1;
        for (var i = 0; i < coords.length; i++) if (d[i] > L0 && d[i] < L1) out.push(coords[i]);
        out.push(along(coords, d, t1)); return out;
      }
      R = { drive: { c: drive, d: cum(drive), dur: 9000, col: C.ink, trail: 0.16 }, boat: { c: boat, d: cum(boat), dur: 9000 * 33 / 109, col: C.brass, trail: 0.35 } };
      var hold = 1800, loop = R.drive.dur + hold;
      if (reduce) {
        Object.keys(R).forEach(function (k) { map.getSource(k + '-trail').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: R[k].c } }); });
        map.getSource('heads').setData({ type: 'FeatureCollection', features: [
          { type: 'Feature', properties: { color: C.brass }, geometry: { type: 'Point', coordinates: boat[boat.length - 1] } },
          { type: 'Feature', properties: { color: C.ink }, geometry: { type: 'Point', coordinates: drive[drive.length - 1] } }
        ] });
        return;
      }
      var start = null, running = true;
      function frame(now) {
        if (!running) return;
        if (!start) start = now;
        var el = (now - start) % loop;
        var heads = [];
        Object.keys(R).forEach(function (k) {
          var r = R[k]; var t = Math.min(1, el / r.dur);
          var t0 = Math.max(0, t - r.trail);
          map.getSource(k + '-trail').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: t > 0.002 ? slice(r.c, r.d, t0, t) : [] } });
          heads.push({ type: 'Feature', properties: { color: r.col }, geometry: { type: 'Point', coordinates: along(r.c, r.d, t) } });
        });
        map.getSource('heads').setData({ type: 'FeatureCollection', features: heads });
        requestAnimationFrame(frame);
      }
      // only animate while the map is on screen
      var vis = new IntersectionObserver(function (en) {
        var on = en[0].isIntersecting;
        if (on && !running) { running = true; start = null; requestAnimationFrame(frame); }
        if (!on) running = false;
      }, { threshold: 0.1 });
      vis.observe(chart);
      requestAnimationFrame(frame);
    });
  }

  if (chart) {
    if (!webgl()) { observe(chart, drawFallback, 0.35); }
    else observe(chart, function () {
      Promise.all([
        fetch('/assets/map/routes.json').then(function (r) { return r.json(); }),
        loadScript('/assets/vendor/pmtiles.js').then(function () { return loadScript('/assets/vendor/maplibre-gl.js'); })
      ]).then(function (res) { initMap(res[0]); }).catch(function (e) { console.warn('map unavailable, using the schematic', e); drawFallback(); });
    }, 0, '600px 0px');
  }

  /* ---------- how it decides: three states, only real ones render ---------- */
  // Each state is a real capture (the 2026-09-17 afternoon set and the 2026-09-21 night
  // set). Minutes drive the bar widths; the phone beside the bars shows the frame itself.
  var DECISIONS = [
    { key: 'now', chip: 'Leave now · afternoon',
      line: 'Leaving now, <em>take the 1:15 PM ferry</em> — 43 min sooner.',
      ferry: { legs: [17, 7, 33, 8], sub: '1 HR 6 M · DOOR TO DOOR', flag: 'SOONER BY 43 MIN' },
      drive: { min: 109, sub: '1 HR 49 M · BY THE NARROWS', legs: '109m driving · live traffic', flag: '' },
      shot: '/assets/decide-now.webp', cap: 'Thursday 12:50 PM · Bainbridge → Seattle',
      alt: 'The Decision screen: Take the 1:15 PM ferry, 43 min sooner than driving around' },
    { key: 'arrive', chip: 'Arrive by 2:00 AM',
      line: 'To arrive by 2:00 AM, <em>the 12:55 AM ferry</em> lets you leave 19 min later than the road.',
      ferry: { legs: [5, 4, 33, 4], sub: 'LEAVE BY 12:46 AM · 46 M DOOR TO DOOR', flag: 'LEAVE 19 MIN LATER' },
      drive: { min: 94, sub: 'LEAVE BY 12:26 AM · 1 HR 34 M', legs: '94m driving · live traffic', flag: '' },
      shot: '/assets/decide-arrive.webp', cap: 'Monday 11:32 PM · arrive by 2:00 AM',
      alt: 'The Decision screen in Arrive-by mode: to arrive by 1:32 AM the ferry lets you leave 19 min later, leave by 12:46 AM for the 12:55 AM' },
    { key: 'drive', chip: 'Leave now · late night',
      line: 'Leaving now at 11:29 PM, <em>stay on land</em> — the ferry would have you waiting 79 min at the dock.',
      ferry: { legs: [5, 79, 33, 5], sub: '2 HR 2 M · 79 MIN WAITING AT THE DOCK', flag: '' },
      drive: { min: 94, sub: '1 HR 34 M · BY THE NARROWS', legs: '94m driving · no stops', flag: 'SOONER BY 29 MIN' },
      shot: '/assets/decide-drive.webp', cap: 'Monday 11:29 PM · Bainbridge → Seattle',
      alt: 'The Decision screen: Stay on land, driving gets you there 29 min sooner, the ferry would have you waiting 79 min at the dock' }
  ];
  var chips = document.getElementById('chips');
  var real = DECISIONS;
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
    var dflag = document.getElementById('dflag');
    if (dflag) { dflag.textContent = d.drive.flag || ''; dflag.hidden = !d.drive.flag; }
    var shot = document.getElementById('decide-shot');
    if (shot && d.shot) { shot.src = d.shot; shot.alt = d.alt || ''; }
    var cap = document.getElementById('decide-cap');
    if (cap) cap.textContent = d.cap || '';
    var legs = document.getElementById('legs-ferry');
    if (legs) legs.innerHTML = ['drive', 'wait', 'sailing', 'drive'].map(function (n, k) { return '<span>' + d.ferry.legs[k] + 'm ' + n + '</span>'; }).join('');
  }
  if (chips && real.length > 1) {
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
  var phone = document.getElementById('phone');
  var stepEls = document.querySelectorAll('#steps .step');
  function setPhone(n) {
    if (!phone) return;
    stepEls.forEach(function (el) { el.classList.toggle('on', el.getAttribute('data-state') === String(n)); });
    phone.setAttribute('data-state', String(n));
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

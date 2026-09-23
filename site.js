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

  /* ---------- the bet: two real maps, self-hosted, on one clock (#252) ---------- */
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

  /* #252 — the same trip two ways, on ONE clock. Every leg runs in proportion to its
     real minutes (the app's own reading, 2026-09-17 12:50 PM), so the gap between the
     two arrivals on screen is the gap on the road. Nothing here is decorative timing. */
  var TRIP = { start: 12 * 60 + 50, toDock: 17, wait: 7, sail: 33, fromDock: 8, ferryTotal: 66, around: 109, boat: '1:15 PM' };
  var MS_PER_MIN = 120, WAIT_MS_PER_MIN = 430, HOLD = 2600;
  // ★ THE CLOCK SLOWS WHILE THE CAR IS IN LINE — both lanes together, so the one clock
  // stays true and only the playback rate changes. At 120 ms a minute the 7-minute wait
  // was gone in under a second and read as no wait at all (owner, 2026-09-23).
  var LEG = TRIP.ferryTotal / (TRIP.toDock + TRIP.wait + TRIP.sail + TRIP.fromDock);   // legs sum to 65; the trip is 1 hr 6 m
  var AT = { dock: TRIP.toDock * LEG, board: (TRIP.toDock + TRIP.wait) * LEG, land: (TRIP.toDock + TRIP.wait + TRIP.sail) * LEG, done: TRIP.ferryTotal };
  var PLAY_MS = TRIP.around * MS_PER_MIN + (AT.board - AT.dock) * (WAIT_MS_PER_MIN - MS_PER_MIN);
  function minuteAt(ms) {
    var a = AT.dock * MS_PER_MIN, b = a + (AT.board - AT.dock) * WAIT_MS_PER_MIN;
    if (ms <= a) return ms / MS_PER_MIN;
    if (ms <= b) return AT.dock + (ms - a) / WAIT_MS_PER_MIN;
    return Math.min(TRIP.around, AT.board + (ms - b) / MS_PER_MIN);
  }
  function bearing(c, d, t) {   // degrees clockwise from north, along the path at fraction t
    var p = along(c, d, Math.max(0, t - 0.01)), q = along(c, d, Math.min(1, t + 0.01));
    var kx = Math.cos(p[1] * Math.PI / 180);
    return Math.atan2((q[0] - p[0]) * kx, q[1] - p[1]) * 180 / Math.PI;
  }

  function clock(min) {
    var t = TRIP.start + Math.round(min), h = Math.floor(t / 60) % 12 || 12, m = t % 60;
    return h + ':' + (m < 10 ? '0' : '') + m + ' PM';
  }
  function cum(coords) {
    var d = [0]; for (var i = 1; i < coords.length; i++) {
      var a = coords[i - 1], b = coords[i], kx = Math.cos(a[1] * Math.PI / 180);
      d.push(d[i - 1] + Math.hypot((b[0] - a[0]) * kx, b[1] - a[1]));
    } return d;
  }
  function along(c, d, t) {
    var L = d[d.length - 1] * t, i = 1; while (i < d.length && d[i] < L) i++;
    if (i >= d.length) return c[c.length - 1];
    var f = (L - d[i - 1]) / ((d[i] - d[i - 1]) || 1), a = c[i - 1], b = c[i];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  function slice(c, d, t0, t1) {
    var out = [along(c, d, t0)], L0 = d[d.length - 1] * t0, L1 = d[d.length - 1] * t1;
    for (var i = 0; i < c.length; i++) if (d[i] > L0 && d[i] < L1) out.push(c[i]);
    out.push(along(c, d, t1)); return out;
  }
  function path(coords) { return { c: coords, d: cum(coords) }; }
  var clamp = function (x) { return Math.max(0, Math.min(1, x)); };
  var LINE = function (c) { return { type: 'Feature', geometry: { type: 'LineString', coordinates: c } }; };
  var PTS = function (list) { return { type: 'FeatureCollection', features: list.map(function (p) { return { type: 'Feature', properties: { color: p[1], kind: p[2] || 'car', r: p[3] || 14 }, geometry: { type: 'Point', coordinates: p[0] } }; }) }; };

  function initRace(routes) {
    var cs = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
    var C = {};
    function readTheme() { ['map-water', 'map-land', 'map-park', 'map-road', 'map-hwy', 'map-coast', 'brass', 'ink', 'red', 'card', 'green'].forEach(function (k) { C[k] = cs('--' + k); }); }
    readTheme();
    var protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    function baseStyle() {
      return { version: 8, sources: { base: { type: 'vector', url: 'pmtiles:///assets/map/puget.pmtiles?v=20260921' } }, layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': C['map-water'] } },
        { id: 'earth', type: 'fill', source: 'base', 'source-layer': 'earth', paint: { 'fill-color': C['map-land'] } },
        { id: 'park', type: 'fill', source: 'base', 'source-layer': 'landuse', filter: ['in', 'kind', 'park', 'forest', 'wood', 'nature_reserve', 'protected_area', 'national_park', 'golf_course', 'cemetery'], paint: { 'fill-color': C['map-park'], 'fill-opacity': 0.8 } },
        { id: 'water', type: 'fill', source: 'base', 'source-layer': 'water', paint: { 'fill-color': C['map-water'] } },
        { id: 'coast', type: 'line', source: 'base', 'source-layer': 'water', filter: ['==', '$type', 'Polygon'], paint: { 'line-color': C['map-coast'], 'line-width': 0.8 } },
        { id: 'roads-minor', type: 'line', source: 'base', 'source-layer': 'roads', minzoom: 11, filter: ['in', 'kind', 'minor_road', 'medium_road'], paint: { 'line-color': C['map-road'], 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 14, 1.2] } },
        { id: 'roads-major', type: 'line', source: 'base', 'source-layer': 'roads', filter: ['==', 'kind', 'major_road'], paint: { 'line-color': C['map-road'], 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 13, 2] } },
        { id: 'roads-hwy', type: 'line', source: 'base', 'source-layer': 'roads', filter: ['==', 'kind', 'highway'], paint: { 'line-color': C['map-hwy'], 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 13, 3.5] } }
      ] };
    }
    var byKind = {}; routes.features.forEach(function (f) { byKind[f.properties.kind] = f.geometry.coordinates; });
    var P = { toDock: path(byKind.toDock), sail: path(byKind.sail), fromDock: path(byKind.fromDock), around: path(byKind.around) };
    // The inbound boat is the same crossing sailed the other way.
    P.inbound = path(byKind.sail.slice().reverse());

    chart.classList.add('live');
    var maps = [];
    function makeMap(id, tracks, labels, pad) {
      var all = [].concat.apply([], tracks.map(function (t) { return t[1]; }));
      var bounds = all.reduce(function (b, c) { return b.extend(c); }, new maplibregl.LngLatBounds(all[0], all[0]));
      var m = new maplibregl.Map({ container: id, style: baseStyle(), interactive: false, attributionControl: false, fadeDuration: 0 });
      var fit = function () { m.fitBounds(bounds, { padding: pad, duration: 0 }); };
      fit(); requestAnimationFrame(function () { m.resize(); fit(); });
      window.addEventListener('resize', function () { m.resize(); fit(); });
      labels.forEach(function (l) {
        var el = document.createElement('div'); el.className = l[2]; if (l[1]) el.textContent = l[1];
        new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(l[0]).addTo(m);
      });
      var ready = new Promise(function (res) {
        m.on('load', function () {
          tracks.forEach(function (t) {
            m.addSource(t[0], { type: 'geojson', data: LINE(t[1]) });
            m.addLayer({ id: t[0], type: 'line', source: t[0], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C[t[2]], 'line-width': t[3], 'line-opacity': 0.5, 'line-dasharray': [1, 2.2] } });
          });
          m.addSource('done', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          m.addLayer({ id: 'done', type: 'line', source: 'done', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4 } });
          m.addSource('heads', { type: 'geojson', data: PTS([]) });
          m.addLayer({ id: 'head-glow', type: 'circle', source: 'heads', paint: { 'circle-radius': ['coalesce', ['get', 'r'], 14], 'circle-color': ['get', 'color'], 'circle-opacity': 0.28, 'circle-blur': 1 } });
          m.addLayer({ id: 'head-core', type: 'circle', source: 'heads', paint: { 'circle-radius': ['match', ['get', 'kind'], 'boat', 6.5, 4.5], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });
          res();
        });
      });
      var rec = { m: m, tracks: tracks, ready: ready };
      maps.push(rec); return rec;
    }
    var ferry = makeMap('map-ferry', [['t-todock', byKind.toDock, 'ink', 2], ['t-sail', byKind.sail, 'brass', 2.5], ['t-fromdock', byKind.fromDock, 'ink', 2]], [
      [[-122.497, 47.668], 'Bainbridge', 'mlbl'], [[-122.318, 47.592], 'Seattle', 'mlbl'],
      [byKind.toDock[0], '', 'mdot'], [byKind.fromDock[byKind.fromDock.length - 1], '', 'mdot to'],
      [[-122.43, 47.595], '33 min on the water', 'mlbl note']
    ], { top: 34, bottom: 34, left: 34, right: 44 });
    // ★ THE BOAT (owner, 2026-09-23): a glyph, not a dot — it comes in, docks, turns
    // round, and carries the car across. Drawn bow-up; the marker rotates it to heading.
    var boatEl = document.createElement('div'); boatEl.className = 'boatglyph';
    boatEl.innerHTML = '<svg viewBox="0 0 16 40" width="16" height="40" aria-hidden="true"><path class="hull" d="M8 1 C12 6 14 11 14 18 V35 C14 37.5 12 39 8 39 C4 39 2 37.5 2 35 V18 C2 11 4 6 8 1 Z"/><rect class="deck" x="5" y="14" width="6" height="16" rx="1.5"/></svg>';
    var boat = new maplibregl.Marker({ element: boatEl, anchor: 'center', rotationAlignment: 'map' }).setLngLat(byKind.sail[0]).addTo(ferry.m);
    var lineEl = document.createElement('div'); lineEl.className = 'mlbl note inline'; lineEl.hidden = true;
    new maplibregl.Marker({ element: lineEl, anchor: 'bottom', offset: [0, -16] }).setLngLat(byKind.toDock[byKind.toDock.length - 1]).addTo(ferry.m);

    var drive = makeMap('map-drive', [['t-around', byKind.around, 'ink', 2]], [
      [[-122.27, 47.665], 'Seattle', 'mlbl'], [[-122.548, 47.668], 'Bainbridge', 'mlbl'],
      [[-122.662, 47.556], 'Bremerton', 'mlbl dim'], [[-122.44, 47.232], 'Tacoma', 'mlbl dim'],
      [[-122.60, 47.29], 'Narrows', 'mlbl dim'],
      [byKind.around[0], '', 'mdot'], [byKind.around[byKind.around.length - 1], '', 'mdot to']
    ], { top: 26, bottom: 26, left: 26, right: 26 });

    var el = { clock: document.getElementById('race-clock'), stF: document.getElementById('st-ferry'), stD: document.getElementById('st-drive'),
               arrF: document.getElementById('arr-ferry'), arrD: document.getElementById('arr-drive') };

    // ★ ONE FUNCTION OF ONE CLOCK. `min` is minutes since 12:50; both lanes read it.
    function render(min) {
      var done = [], heads = [], status, dock = P.toDock.c[P.toDock.c.length - 1];
      var inb = P.inbound, out = P.sail, crossing = AT.land - AT.board;
      var boatAt, boatDeg;
      if (min < AT.dock) {
        // On the road, and the boat you'll catch is out on the water coming in: it docks
        // the minute you reach the line, so it is (17 of its 33 minutes) that far out.
        var t = clamp(min / AT.dock);
        done.push([slice(P.toDock.c, P.toDock.d, 0, t), C.ink]); heads.push([along(P.toDock.c, P.toDock.d, t), C.ink]);
        var fi = clamp(1 - (AT.dock - min) / crossing);
        boatAt = along(inb.c, inb.d, fi); boatDeg = bearing(inb.c, inb.d, fi);
        status = 'Drive to the dock · ' + Math.max(1, Math.ceil((AT.dock - min) / LEG)) + ' min';
      } else if (min < AT.board) {
        // In line. The boat is in, and swings round to face Seattle over the first part
        // of the wait; the car pulses in the holding lanes and the label counts down.
        done.push([P.toDock.c, C.ink]);
        var w = clamp((min - AT.dock) / (AT.board - AT.dock));
        var from = bearing(inb.c, inb.d, 1), to = bearing(out.c, out.d, 0);
        var turn = ((to - from + 540) % 360) - 180, e = clamp(w / 0.45); e = e * e * (3 - 2 * e);
        boatAt = out.c[0]; boatDeg = from + turn * e;
        heads.push([dock, C.ink, 'wait', 12 + 9 * (0.5 + 0.5 * Math.sin(min * 5))]);
        var left = Math.max(1, Math.ceil((AT.board - min) / LEG));
        status = 'In line at Bainbridge · the ' + TRIP.boat + ' is in';
        lineEl.textContent = 'In line · ' + left + ' min';
      } else if (min < AT.land) {
        done.push([P.toDock.c, C.ink]);
        var u = clamp((min - AT.board) / crossing);
        done.push([slice(out.c, out.d, 0, u), C.brass]);
        boatAt = along(out.c, out.d, u); boatDeg = bearing(out.c, out.d, u);   // the car is aboard
        status = 'On the ' + TRIP.boat + ' · ' + Math.max(1, Math.ceil((AT.land - min) / LEG)) + ' min on the water';
      } else {
        done.push([P.toDock.c, C.ink]); done.push([out.c, C.brass]);
        var v = clamp((min - AT.land) / (AT.done - AT.land));
        done.push([slice(P.fromDock.c, P.fromDock.d, 0, v), C.ink]); heads.push([along(P.fromDock.c, P.fromDock.d, v), C.ink]);
        boatAt = out.c[out.c.length - 1]; boatDeg = bearing(out.c, out.d, 1);
        status = min < AT.done ? 'Driving into Seattle' : (TRIP.around - TRIP.ferryTotal) + ' min sooner than driving around';
      }
      lineEl.hidden = !(min >= AT.dock && min < AT.board);
      boat.setLngLat(boatAt); boat.setRotation(boatDeg);
      var ta = clamp(min / TRIP.around);
      var dDone = [[slice(P.around.c, P.around.d, 0, ta), C.ink]], dHead = [[along(P.around.c, P.around.d, ta), C.ink]];
      var dStatus = min < TRIP.around ? ('By the Tacoma Narrows · ' + Math.ceil(TRIP.around - min) + ' min to go') : 'By the Tacoma Narrows · live traffic';
      set(ferry, done, heads); set(drive, dDone, dHead);
      el.clock.textContent = clock(min);
      el.stF.textContent = status; el.stD.textContent = dStatus;
      el.arrF.classList.toggle('wait', min < AT.done); el.arrD.classList.toggle('wait', min < TRIP.around);
    }
    function set(rec, done, heads) {
      if (!rec.loaded) return;
      rec.m.getSource('done').setData({ type: 'FeatureCollection', features: done.filter(function (x) { return x[0].length > 1; }).map(function (x) { var f = LINE(x[0]); f.properties = { color: x[1] }; return f; }) });
      rec.m.getSource('heads').setData(PTS(heads));
    }

    function applyTheme() {
      readTheme();
      maps.forEach(function (rec) {
        var m = rec.m; if (!m.isStyleLoaded()) return;
        m.setPaintProperty('bg', 'background-color', C['map-water']); m.setPaintProperty('water', 'fill-color', C['map-water']);
        m.setPaintProperty('earth', 'fill-color', C['map-land']); m.setPaintProperty('park', 'fill-color', C['map-park']);
        m.setPaintProperty('coast', 'line-color', C['map-coast']);
        ['roads-minor', 'roads-major'].forEach(function (l) { m.setPaintProperty(l, 'line-color', C['map-road']); });
        m.setPaintProperty('roads-hwy', 'line-color', C['map-hwy']);
        rec.tracks.forEach(function (t) { m.setPaintProperty(t[0], 'line-color', C[t[2]]); });
      });
      render(lastMin);
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

    var lastMin = TRIP.around;
    Promise.all(maps.map(function (r) { return r.ready.then(function () { r.loaded = true; }); })).then(function () {
      if (reduce) { render(TRIP.around); return; }   // the finished frame: both routes, both arrivals
      var loop = PLAY_MS + HOLD, start = null, running = true;
      function frame(now) {
        if (!running) return;
        if (start === null) start = now;
        lastMin = minuteAt((now - start) % loop);
        render(lastMin);
        requestAnimationFrame(frame);
      }
      new IntersectionObserver(function (en) {
        var on = en[0].isIntersecting;
        if (on && !running) { running = true; start = null; requestAnimationFrame(frame); }
        if (!on) running = false;
      }, { threshold: 0.1 }).observe(chart);
      requestAnimationFrame(frame);
    });
  }

  if (chart) {
    if (!webgl()) { observe(chart, drawFallback, 0.35); }
    else observe(chart, function () {
      Promise.all([
        fetch('/assets/map/journeys.json').then(function (r) { return r.json(); }),
        loadScript('/assets/vendor/pmtiles.js').then(function () { return loadScript('/assets/vendor/maplibre-gl.js'); })
      ]).then(function (res) { initRace(res[0]); }).catch(function (e) { console.warn('maps unavailable, using the schematic', e); drawFallback(); });
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

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

  /* #252 — the same trip two ways, on ONE clock, in two real situations.
     ★ THE CAR'S LEGS, THE COUNTDOWN AND THE ARRIVALS ARE THE APP'S OWN READINGS (the
     Thursday 12:50 PM capture and a Wednesday 8:45 PM decision dump). THE BOATS RUN THE
     TIMETABLE of those two days, from our own sailing records (sailing_instances, 09-17, 09-23):
     every glyph is where WSF had that boat. Times below are minutes after `start`.
     Both states are times when BOTH boats were sailing (owner, 2026-09-23): a late-night
     one-boat reading was tried first and would have needed one boat drawn tied up. */
  var SCENES = {
    made: {
      start: 12 * 60 + 50, day: 'Thursday', toDock: 17, wait: 7, fromDock: 8, ferryTotal: 66, around: 109,
      caught: 'tacoma', boatLabel: '1:15 PM', pick: 'ferry',
      verdict: 'The app’s answer: <em>take the 1:15 PM ferry</em>, 43 min sooner.',
      ferryDone: '43 min sooner than driving around', driveDone: 'By the Tacoma Narrows · live traffic',
      tot: ['1 hr 6 m', '1 hr 49 m'], fromStart: 0, fromEnd: 1,
      boats: {
        // SEA 12:25 → BI 12:58, BI 1:15 → SEA 1:48 (you), SEA 2:05 → BI 2:38
        tacoma: [['in', -25, 8], ['dock', 'bi', 8, 25], ['out', 25, 58], ['dock', 'sea', 58, 75], ['in', 75, 108], ['dock', 'bi', 108, 999]],
        // BI 12:20 → SEA 12:53, SEA 1:10 → BI 1:43, BI 2:05 → SEA 2:38
        wenatchee: [['out', -30, 3], ['dock', 'sea', 3, 20], ['in', 20, 53], ['dock', 'bi', 53, 75], ['out', 75, 108], ['dock', 'sea', 108, 999]]
      }
    },
    missed: {
      // The app's reading for Wednesday 2026-09-23, leave at 8:45 PM, Fay Bainbridge Park →
      // Seattle Center (DEBUG decision dump): 14 min to the dock, "you'd reach the dock at
      // 8:59 PM, after its 8:56 PM line-by", 61 min for the 10:00, 33 on the water, 10 on
      // the far side = 1 hr 58 m; driving around 1 hr 44 m. Answer: drive around.
      start: 20 * 60 + 45, day: 'Wednesday', toDock: 14, wait: 61, fromDock: 10, ferryTotal: 118, around: 104,
      caught: 'wenatchee', boatLabel: '10:00 PM', missedLabel: '9:00 PM', missedAt: 15, lineClosed: '8:56 PM', pick: 'drive',
      verdict: 'The app’s answer: <em>drive around</em>, 14 min sooner than the Bainbridge ferry. You’d reach the dock at 8:59 PM, after the 9:00 PM’s 8:56 line-by.',
      ferryDone: '61 min waiting at the dock', driveDone: 'By the Tacoma Narrows · the app’s pick',
      tot: ['1 hr 58 m', '1 hr 44 m'], fromStart: 0, fromEnd: 1,
      boats: {
        // SEA 8:15 → BI 8:48; BI 9:00 → SEA 9:33 (the one you just miss); SEA 10:05 → BI 10:38
        tacoma: [['in', -30, 3], ['dock', 'bi', 3, 15], ['out', 15, 48], ['dock', 'sea', 48, 80], ['in', 80, 113], ['dock', 'bi', 113, 999]],
        // BI 8:20 → SEA 8:53; SEA 9:20 → BI 9:53; BI 10:00 → SEA 10:33 (you)
        wenatchee: [['out', -25, 8], ['dock', 'sea', 8, 35], ['in', 35, 68], ['dock', 'bi', 68, 75], ['out', 75, 108], ['dock', 'sea', 108, 999]]
      }
    }
  };
  // A short wait is SLOWED to at least WAIT_SHOW_MS so it can be seen; a long one runs at
  // the normal rate — squeezing an 81-minute wait into 3 s made a boat's round trip
  // flash past unseen (owner, 2026-09-23). The long wait is the point of that state.
  var MS_PER_MIN = 120, HOLD = 2600, WAIT_SHOW_MS = 3000;
  function waitMs(T) { return Math.max(WAIT_SHOW_MS, (T.board - T.dock) * MS_PER_MIN); }

  function clock(min) {
    var t = ((Math.round(min) % 1440) + 1440) % 1440, h = Math.floor(t / 60), m = t % 60;
    return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM');
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
  function bearing(c, d, t) {
    var p = along(c, d, Math.max(0, t - 0.01)), q = along(c, d, Math.min(1, t + 0.01)), kx = Math.cos(p[1] * Math.PI / 180);
    return Math.atan2((q[0] - p[0]) * kx, q[1] - p[1]) * 180 / Math.PI;
  }
  function path(coords) { return { c: coords, d: cum(coords) }; }
  var clamp = function (x) { return Math.max(0, Math.min(1, x)); };
  var LINE = function (c) { return { type: 'Feature', geometry: { type: 'LineString', coordinates: c } }; };
  var PTS = function (list) { return { type: 'FeatureCollection', features: list.map(function (p) { return { type: 'Feature', properties: { color: p[1], r: p[3] || 14 }, geometry: { type: 'Point', coordinates: p[0] } }; }) }; };

  // The car's own timeline, from the app's legs; it boards when the caught boat sails.
  function plan(S) {
    var sail = S.boats[S.caught].filter(function (k) { return k[0] === 'out'; })
      .filter(function (k) { return k[1] >= S.toDock; })[0];
    return { dock: S.toDock, board: sail[1], land: sail[2], done: S.ferryTotal, end: Math.max(S.ferryTotal, S.around) };
  }
  function minuteAt(S, T, ms) {   // the clock slows (or speeds) only while the car is in line
    var rate = waitMs(T) / (T.board - T.dock), a = T.dock * MS_PER_MIN, b = a + waitMs(T);
    if (ms <= a) return ms / MS_PER_MIN;
    if (ms <= b) return T.dock + (ms - a) / rate;
    return Math.min(T.end, T.board + (ms - b) / MS_PER_MIN);
  }
  function playMs(T) { return T.dock * MS_PER_MIN + waitMs(T) + (T.end - T.board) * MS_PER_MIN; }

  function initRace(routes) {
    var cs = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
    var C = {};
    function readTheme() { ['map-water', 'map-land', 'map-park', 'map-road', 'map-hwy', 'map-coast', 'brass', 'ink', 'card'].forEach(function (k) { C[k] = cs('--' + k); }); }
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
    var P = { toDock: path(byKind.toDock), out: path(byKind.sail), fromDock: path(byKind.fromDock), around: path(byKind.around) };
    P['in'] = path(byKind.sail.slice().reverse());   // the same lane, sailed the other way
    var BERTH = { bi: byKind.sail[0], sea: byKind.sail[byKind.sail.length - 1] };

    chart.classList.add('live');
    var maps = [];
    function makeMap(id, tracks, labels, pad) {
      var all = [].concat.apply([], tracks.map(function (t) { return t[1]; }));
      var bounds = all.reduce(function (b, c) { return b.extend(c); }, new maplibregl.LngLatBounds(all[0], all[0]));
      var m = new maplibregl.Map({ container: id, style: baseStyle(), interactive: false, attributionControl: false, fadeDuration: 0 });
      var fit = function () { m.fitBounds(bounds, { padding: pad, duration: 0 }); };
      fit(); requestAnimationFrame(function () { m.resize(); fit(); });
      window.addEventListener('resize', function () { m.resize(); fit(); });
      var markers = labels.map(function (l) {
        var el = document.createElement('div'); el.className = l[2]; if (l[1]) el.textContent = l[1];
        return new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(l[0]).addTo(m);
      });
      var rec = { m: m, tracks: tracks, markers: markers };
      rec.ready = new Promise(function (res) {
        m.on('load', function () {
          tracks.forEach(function (t) {
            m.addSource(t[0], { type: 'geojson', data: LINE(t[1]) });
            m.addLayer({ id: t[0], type: 'line', source: t[0], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C[t[2]], 'line-width': t[3], 'line-opacity': 0.5, 'line-dasharray': [1, 2.2] } });
          });
          m.addSource('done', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          m.addLayer({ id: 'done', type: 'line', source: 'done', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4 } });
          m.addSource('heads', { type: 'geojson', data: PTS([]) });
          m.addLayer({ id: 'head-glow', type: 'circle', source: 'heads', paint: { 'circle-radius': ['get', 'r'], 'circle-color': ['get', 'color'], 'circle-opacity': 0.28, 'circle-blur': 1 } });
          m.addLayer({ id: 'head-core', type: 'circle', source: 'heads', paint: { 'circle-radius': 4.5, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });
          rec.loaded = true; res();
        });
      });
      maps.push(rec); return rec;
    }
    var ferry = makeMap('map-ferry', [['t-todock', byKind.toDock, 'ink', 2], ['t-sail', byKind.sail, 'brass', 2.5], ['t-fromdock', byKind.fromDock, 'ink', 2]], [
      [[-122.497, 47.668], 'Bainbridge', 'mlbl'], [[-122.372, 47.648], 'Seattle', 'mlbl'],
      [byKind.toDock[0], '', 'mdot'], [byKind.fromDock[byKind.fromDock.length - 1], '', 'mdot to'],
      [[-122.43, 47.595], '33 min on the water', 'mlbl note']
    ], { top: 34, bottom: 34, left: 34, right: 44 });
    var drive = makeMap('map-drive', [['t-around', byKind.around, 'ink', 2]], [
      [[-122.27, 47.665], 'Seattle', 'mlbl'], [[-122.548, 47.668], 'Bainbridge', 'mlbl'],
      [[-122.662, 47.556], 'Bremerton', 'mlbl dim'], [[-122.44, 47.232], 'Tacoma', 'mlbl dim'],
      [[-122.60, 47.29], 'Narrows', 'mlbl dim'],
      [byKind.around[0], '', 'mdot'], [byKind.around[byKind.around.length - 1], '', 'mdot to']
    ], { top: 26, bottom: 26, left: 26, right: 26 });

    // ★ THE BOATS (owner, 2026-09-23): glyphs, both of them, in both states. Drawn bow-up.
    var HULL = '<svg viewBox="0 0 16 40" width="16" height="40" aria-hidden="true"><path class="hull" d="M8 1 C12 6 14 11 14 18 V35 C14 37.5 12 39 8 39 C4 39 2 37.5 2 35 V18 C2 11 4 6 8 1 Z"/><rect class="deck" x="5" y="14" width="6" height="16" rx="1.5"/></svg>';
    var glyph = {};
    ['tacoma', 'wenatchee'].forEach(function (k) {
      var el = document.createElement('div'); el.className = 'boatglyph'; el.innerHTML = HULL; el.title = k === 'tacoma' ? 'M/V Tacoma' : 'M/V Wenatchee';
      glyph[k] = { el: el, mk: new maplibregl.Marker({ element: el, anchor: 'center', rotationAlignment: 'map' }).setLngLat(BERTH.bi).addTo(ferry.m) };
    });
    var lineEl = document.createElement('div'); lineEl.className = 'mlbl note inline'; lineEl.hidden = true;
    new maplibregl.Marker({ element: lineEl, anchor: 'bottom', offset: [0, -16] }).setLngLat(byKind.toDock[byKind.toDock.length - 1]).addTo(ferry.m);

    // Where a boat is, and which way it faces, at minute `min` of its day.
    function boatAt(frames, min) {
      var heading = function (dir, t) { return bearing(P[dir].c, P[dir].d, t); };
      for (var i = 0; i < frames.length; i++) {
        var f = frames[i];
        if (f[0] === 'in' || f[0] === 'out') {
          if (min < f[2] || i === frames.length - 1) {
            var t = clamp((min - f[1]) / (f[2] - f[1]));
            return { at: along(P[f[0]].c, P[f[0]].d, t), deg: heading(f[0], t), sailing: f[0], t: t };
          }
        } else if (min < f[3] || i === frames.length - 1) {
          // Docked: swing from the arriving heading to the departing one over the first
          // part of the stay (the boats are double-ended; the turn is for the eye).
          var prev = frames[i - 1], next = frames[i + 1];
          var from = prev ? heading(prev[0], 1) : (next ? heading(next[0], 0) : 90);
          var to = next ? heading(next[0], 0) : from;
          var turn = ((to - from + 540) % 360) - 180, e = clamp((min - f[2]) / Math.max(1, (f[3] - f[2]) * 0.45));
          e = e * e * (3 - 2 * e);
          return { at: BERTH[f[1]], deg: from + turn * e };
        }
      }
      return { at: BERTH.bi, deg: 90 };
    }

    var el = { clock: document.getElementById('race-clock'), k: document.getElementById('race-k'), verdict: document.getElementById('race-verdict'),
               stF: document.getElementById('st-ferry'), stD: document.getElementById('st-drive'),
               arrF: document.getElementById('arr-ferry'), arrD: document.getElementById('arr-drive'),
               totF: document.getElementById('tot-ferry'), totD: document.getElementById('tot-drive'),
               pickF: document.getElementById('pick-ferry'), pickD: document.getElementById('pick-drive') };
    var S, T, toDock, fromDock;

    function setScene(key) {
      S = SCENES[key]; T = plan(S);
      // A closer start and a nearer finish where a reading's legs are shorter (5 and 5, not 17
      // and 8): the tail and head of the same roads, so nothing new is invented.
      toDock = path(slice(P.toDock.c, P.toDock.d, S.fromStart, 1));
      fromDock = path(slice(P.fromDock.c, P.fromDock.d, 0, S.fromEnd));
      ferry.markers[2].setLngLat(toDock.c[0]); ferry.markers[3].setLngLat(fromDock.c[fromDock.c.length - 1]);
      // The dashed plan underneath follows the scene's legs too, or one state shows the other's drive.
      if (ferry.loaded) { ferry.m.getSource('t-todock').setData(LINE(toDock.c)); ferry.m.getSource('t-fromdock').setData(LINE(fromDock.c)); }
      el.k.textContent = 'Leaving ' + clock(S.start) + ' · ' + S.day;
      el.verdict.innerHTML = S.verdict;
      el.totF.textContent = S.tot[0]; el.totD.textContent = S.tot[1];
      el.arrF.textContent = 'Arrives ' + clock(S.start + S.ferryTotal); el.arrD.textContent = 'Arrives ' + clock(S.start + S.around);
      el.pickF.hidden = S.pick !== 'ferry'; el.pickD.hidden = S.pick !== 'drive';
      el.pickF.closest('.lane').classList.toggle('won', S.pick === 'ferry');
      el.pickD.closest('.lane').classList.toggle('won', S.pick === 'drive');
      ['made', 'missed'].forEach(function (k) { document.getElementById('sc-' + k).setAttribute('aria-pressed', String(k === key)); });
    }

    function render(min) {
      var done = [], heads = [], status, dockPt = toDock.c[toDock.c.length - 1];
      if (min < T.dock) {
        var t = clamp(min / T.dock);
        done.push([slice(toDock.c, toDock.d, 0, t), C.ink]); heads.push([along(toDock.c, toDock.d, t), C.ink]);
        status = 'Drive to the dock · ' + Math.max(1, Math.ceil(S.toDock - min)) + ' min';
      } else if (min < T.board) {
        done.push([toDock.c, C.ink]);
        var w = clamp((min - T.dock) / (T.board - T.dock));
        heads.push([dockPt, C.ink, 'wait', 12 + 9 * (0.5 + 0.5 * Math.sin((performance.now() / 1000) * 5))]);
        status = S.missedLabel && min < S.missedAt + 5
          ? 'Too late for the ' + S.missedLabel + ' · its line closed at ' + S.lineClosed
          : 'In line at Bainbridge · next boat ' + S.boatLabel;
        lineEl.textContent = 'In line · ' + Math.max(1, Math.ceil(S.wait * (1 - w))) + ' min';
      } else if (min < T.land) {
        done.push([toDock.c, C.ink]);
        var u = clamp((min - T.board) / (T.land - T.board));
        done.push([slice(P.out.c, P.out.d, 0, u), C.brass]);   // the car is aboard
        status = 'On the ' + S.boatLabel + ' · ' + Math.max(1, Math.ceil(T.land - min)) + ' min on the water';
      } else {
        done.push([toDock.c, C.ink]); done.push([P.out.c, C.brass]);
        var v = clamp((min - T.land) / Math.max(1, T.done - T.land));
        done.push([slice(fromDock.c, fromDock.d, 0, v), C.ink]); heads.push([along(fromDock.c, fromDock.d, v), C.ink]);
        status = min < T.done ? 'Driving into Seattle' : S.ferryDone;
      }
      lineEl.hidden = !(min >= T.dock && min < T.board);
      Object.keys(glyph).forEach(function (k) {
        var b = boatAt(S.boats[k], min);
        glyph[k].mk.setLngLat(b.at); glyph[k].mk.setRotation(b.deg);
      });
      var ta = clamp(min / S.around);
      set(ferry, done, heads);
      set(drive, [[slice(P.around.c, P.around.d, 0, ta), C.ink]], [[along(P.around.c, P.around.d, ta), C.ink]]);
      el.clock.textContent = clock(S.start + min);
      el.stF.textContent = status;
      el.stD.textContent = min < S.around ? ('By the Tacoma Narrows · ' + Math.ceil(S.around - min) + ' min to go') : S.driveDone;
      el.arrF.classList.toggle('wait', min < T.done); el.arrD.classList.toggle('wait', min < S.around);
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

    var currentKey = 'made';
    setScene(currentKey);
    var lastMin = T.end, start = null, running = false;
    function frame(now) {
      if (!running) return;
      if (start === null) start = now;
      lastMin = minuteAt(S, T, (now - start) % (playMs(T) + HOLD));
      render(lastMin);
      requestAnimationFrame(frame);
    }
    ['made', 'missed'].forEach(function (k) {
      document.getElementById('sc-' + k).addEventListener('click', function () {
        currentKey = k; setScene(k); start = null; lastMin = reduce ? T.end : 0; render(lastMin);
      });
    });
    Promise.all(maps.map(function (r) { return r.ready; })).then(function () {
      setScene(currentKey);   // re-apply now the sources exist
      if (reduce) { render(T.end); return; }   // the finished frame: both routes, both arrivals
      running = true;
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
  // Each state is a real capture (the 2026-09-17 afternoon set, a 2026-09-23 arrive-by
  // reading for the next midday, and the 2026-09-21 night set). Minutes drive the bar widths; the phone beside the bars shows the frame itself.
  var DECISIONS = [
    { key: 'now', chip: 'Leave now · afternoon',
      line: 'Leaving now, <em>take the 1:15 PM ferry</em> — 43 min sooner.',
      ferry: { legs: [17, 7, 33, 8], sub: '1 HR 6 M · DOOR TO DOOR', flag: 'SOONER BY 43 MIN' },
      drive: { min: 109, sub: '1 HR 49 M · BY THE NARROWS', legs: '109m driving · live traffic', flag: '' },
      shot: '/assets/decide-now.webp', cap: 'Thursday 12:50 PM · Bainbridge → Seattle',
      alt: 'The Decision screen: Take the 1:15 PM ferry, 43 min sooner than driving around' },
    { key: 'arrive', chip: 'Arrive by 2:00 PM',
      // The app's reading taken Wednesday 2026-09-23 for Thursday: arrive by 2:00 PM, Fay
      // Bainbridge Park → Seattle Center (DEBUG decision dump + the capture beside it).
      line: 'To arrive by 2:00 PM, <em>the 1:15 PM ferry</em> lets you leave 58 min later than the road.',
      ferry: { legs: [17, 4, 33, 11], sub: 'LEAVE BY 12:54 PM · 1 HR 5 M DOOR TO DOOR', flag: 'LEAVE 58 MIN LATER' },
      drive: { min: 124, sub: 'LEAVE BY 11:56 AM · 2 HR 4 M', legs: '124m driving · predicted traffic', flag: '' },
      shot: '/assets/decide-arrive.webp', cap: 'Thursday · arrive by 2:00 PM, planned the day before',
      alt: 'The Decision screen in Arrive-by mode: to arrive by 1:59 PM the ferry lets you leave 58 min later than driving around, leave by 12:54 PM for the 1:15 PM' },
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
    if (flag) { flag.textContent = d.ferry.flag || '\u00a0'; flag.hidden = !d.ferry.flag; }
    var dflag = document.getElementById('dflag');
    if (dflag) { dflag.textContent = d.drive.flag || '\u00a0'; dflag.hidden = !d.drive.flag; }
    var shot = document.getElementById('decide-shot');
    if (shot && d.shot) { shot.src = d.shot; shot.alt = d.alt || ''; }
    var cap = document.getElementById('decide-cap');
    if (cap) cap.textContent = d.cap || '';
    var legs = document.getElementById('legs-ferry');
    if (legs) legs.innerHTML = ['drive', 'wait', 'sailing', 'drive'].map(function (n, k) {
      return '<span class="k-' + ['drive', 'wait', 'sail', 'drive'][k] + '"><b>' + d.ferry.legs[k] + 'm</b> <i>' + n + '</i></span>';
    }).join('');
    followCallouts();
  }

  // ★ #253: a label per segment, under that segment, with a leader to it. The bar is sized
  // by minutes and the labels used to be spread evenly, so "4m wait" sat nowhere near its
  // 4-minute sliver (owner, 2026-09-23). Positions are MEASURED from the rendered bar, so
  // they follow the flex-basis transition frame by frame; labels that would collide fan
  // out sideways, and when four cannot share a row (phones) alternate labels drop a row.
  function layoutCallouts() {
    var bar = document.getElementById('bar-ferry'), wrap = document.getElementById('legs-ferry');
    if (!bar || !wrap) return;
    var spans = [].slice.call(wrap.querySelectorAll('span')), segs = [].slice.call(bar.children);
    if (!spans.length || spans.length !== segs.length) return;
    var W = wrap.clientWidth, x0 = wrap.getBoundingClientRect().left, GAP = 10;
    var tx = segs.map(function (s) { var r = s.getBoundingClientRect(); return r.left - x0 + r.width / 2; });
    var w;
    function measure() { w = spans.map(function (s) { return s.offsetWidth; }); }
    function place(rows) {
      var left = [], top = [], step = wrap.classList.contains('stack') ? 30 : 16;
      rows.forEach(function (idx, r) {
        idx.forEach(function (i) { left[i] = tx[i] - w[i] / 2; top[i] = 13 + r * step; });
        for (var k = 0; k < idx.length; k++) {           // sweep right: no overlaps
          var i = idx[k]; left[i] = Math.max(left[i], k ? left[idx[k - 1]] + w[idx[k - 1]] + GAP : 0);
        }
        for (k = idx.length - 1; k >= 0; k--) {          // sweep back: stay inside the card
          i = idx[k]; left[i] = Math.min(left[i], k < idx.length - 1 ? left[idx[k + 1]] - GAP - w[i] : W - w[i]);
          left[i] = Math.max(0, left[i]);
        }
      });
      var worst = Math.max.apply(null, spans.map(function (s, i) { return Math.abs(left[i] + w[i] / 2 - tx[i]); }));
      return { left: left, top: top, worst: worst };
    }
    // Minutes over the leg's name — the hero card's own shape, and narrow enough that four
    // labels share a row even on a phone, fanning out with angled leaders round a sliver.
    // A second row is the last resort: its leaders cross the first row's text.
    var all = spans.map(function (s, i) { return i; });
    wrap.classList.remove('two'); measure();
    var L = place([all]);
    if (L.worst > 70) {
      var L2 = place([all.filter(function (i) { return i % 2 === 0; }), all.filter(function (i) { return i % 2 === 1; })]);
      if (L2.worst < L.worst) { L = L2; wrap.classList.add('two'); }
    }
    var left = L.left, top = L.top;
    var paths = spans.map(function (s, i) {
      s.style.left = left[i] + 'px'; s.style.top = top[i] + 'px';
      var cx = left[i] + w[i] / 2, y = top[i] - 2;
      return 'M' + tx[i].toFixed(1) + ',-5 V' + Math.min(4, y - 6) + ' L' + cx.toFixed(1) + ',' + y;
    });
    var svg = wrap.querySelector('svg');
    if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('aria-hidden', 'true'); wrap.insertBefore(svg, wrap.firstChild); }
    svg.innerHTML = paths.map(function (d) { return '<path d="' + d + '"/>'; }).join('');
  }
  var calloutRun = 0;
  function followCallouts() {   // track the bar through its .3s transition, then settle
    var until = performance.now() + 450, run = ++calloutRun;
    (function tick() { if (run !== calloutRun) return; layoutCallouts(); if (performance.now() < until) requestAnimationFrame(tick); })();
  }
  window.addEventListener('resize', layoutCallouts);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutCallouts);
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
  // The verdict sentence differs in length per state, and a line more or less moved the
  // whole card (owner, 2026-09-23). Reserve the tallest of the three at this width —
  // two lines on desktop, up to four on a phone — and re-measure on resize.
  function reserve(el, htmls) {
    if (!el) return;
    var keep = el.innerHTML, tallest = 0;
    el.style.minHeight = '';
    htmls.forEach(function (h) { el.innerHTML = h; tallest = Math.max(tallest, el.offsetHeight); });
    el.innerHTML = keep; el.style.minHeight = tallest + 'px';
  }
  function sizeVerdict() {   // the sentence and both small lines under the option names
    reserve(document.getElementById('verdictline'), real.map(function (d) { return d.line; }));
    reserve(document.getElementById('ferry-sub'), real.map(function (d) { return d.ferry.sub; }));
    reserve(document.getElementById('drive-sub'), real.map(function (d) { return d.drive.sub; }));
    // Both badges, each measured with EVERY state's text: a two-line "LEAVE 58 MIN LATER" in
    // the narrow name column moved the bars beside it.
    var flags = [].concat.apply([], real.map(function (d) { return [d.ferry.flag, d.drive.flag]; })).filter(Boolean);
    ['flag', 'dflag'].forEach(function (id) {
      var f = document.getElementById(id); if (!f) return;
      var hid = f.hidden; f.hidden = false; reserve(f, flags); f.hidden = hid;
    });
  }
  sizeVerdict();
  var sizeT; window.addEventListener('resize', function () { clearTimeout(sizeT); sizeT = setTimeout(sizeVerdict, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeVerdict);

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

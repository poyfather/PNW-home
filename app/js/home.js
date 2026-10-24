/*
 * PNW Home - clock, dock, remote keys, ambient screensaver.
 * Written for the Tizen 4.0 web engine (Chromium 56 era): ES5, no CSS grid.
 */
(function () {
  'use strict';
  var PNW = window.PNW;
  var cfg = PNW.config;
  var P = PNW.platform;
  var Q = PNW.query;
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27, BACKSPACE: 8 };

  function $(id) { return document.getElementById(id); }
  var ls = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  var items = [];          // resolved dock entries, in config order
  var focus = 0;
  var enterDown = false;
  var clockTimer = 0, idleTimer = 0, toastTimer = 0;
  var ambientOn = false;

  // ---------- stage scaling (design is 1920x1080) ----------
  function fitStage() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var st = $('stage').style;
    st.transform = 'scale(' + s + ')';
    st.left = Math.round((window.innerWidth - 1920 * s) / 2) + 'px';
    st.top = Math.round((window.innerHeight - 1080 * s) / 2) + 'px';
  }

  // ---------- clock ----------
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(d) {
    var h = d.getHours(), m = pad2(d.getMinutes());
    if (!cfg.hour12) return { hm: pad2(h) + ':' + m, ampm: '' };
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return { hm: h + ':' + m, ampm: ampm };
  }
  function fmtDate(d) {
    try {
      return d.toLocaleDateString(cfg.locale || undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    } catch (e) {
      var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var mons = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return days[d.getDay()] + ', ' + mons[d.getMonth()] + ' ' + d.getDate();
    }
  }
  function greeting(d) {
    var h = d.getHours(), g = cfg.greetings;
    if (h >= 5 && h < 12) return g.morning;
    if (h >= 12 && h < 17) return g.afternoon;
    if (h >= 17 && h < 22) return g.evening;
    return g.night;
  }
  function minutesOf(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function isNight(d) {
    if (!cfg.night || !cfg.night.enabled) return false;
    var now = d.getHours() * 60 + d.getMinutes(), from = minutesOf(cfg.night.from), to = minutesOf(cfg.night.to);
    return from <= to ? (now >= from && now < to) : (now >= from || now < to);
  }
  function renderClock() {
    var d = Q.at ? new Date(Q.at) : new Date();
    var t = fmtTime(d);
    $('time-hm').textContent = t.hm;
    $('time-ampm').textContent = t.ampm;
    $('date').textContent = fmtDate(d);
    $('hero-greeting').textContent = greeting(d);
    $('ambient-time').textContent = t.hm + (t.ampm ? ' ' + t.ampm : '');
    $('ambient-date').textContent = fmtDate(d);
    document.documentElement.classList.toggle('night', isNight(d) || Q.night === '1');
  }

  // ---------- dock ----------
  function tileHtml(it, i) {
    var el = document.createElement('div');
    el.className = 'tile' + (it.iconUrl ? ' has-icon' : '');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', it.label);
    el.innerHTML =
      '<div class="tile-index">' + pad2(i + 1) + '</div>' +
      (it.iconUrl ? '<img class="tile-icon" alt="" src="' + it.iconUrl + '">' : '') +
      '<div class="tile-label' + (it.label.length > 11 ? ' long' : '') + '">' + it.label + '</div>' +
      '<div class="tile-rule"></div>';
    if (it.iconUrl) {
      var img = el.querySelector('.tile-icon');
      img.onerror = function () { el.classList.remove('has-icon'); img.parentNode.removeChild(img); };
    }
    return el;
  }

  function rebuildDock() {
    var row = $('dock-row');
    row.innerHTML = '';
    items.forEach(function (it, i) { row.appendChild(tileHtml(it, i)); });
    setFocus(focus, true);
  }

  function setFocus(i, quiet) {
    if (!items.length) return;
    focus = Math.max(0, Math.min(items.length - 1, i));
    var tiles = $('dock-row').children;
    for (var k = 0; k < tiles.length; k++) tiles[k].classList.toggle('focus', k === focus);
    $('hero-status').textContent = items[focus].label;
    if (!quiet) ls.set('pnw.focus', items[focus].key);
    // Scroll the row only when the focused tile would leave the visible 1728px strip:
    // right edge past the right side -> shift left just enough; left edge before the
    // current shift -> shift back to it. Otherwise the row stays where it is.
    var row = $('dock-row');
    var tile = tiles[focus];
    if (tile) {
      var view = 1920 - 96 * 2;
      var left = tile.offsetLeft, right = left + tile.offsetWidth;
      if (right - rowShift > view) rowShift = right - view;
      if (left < rowShift) rowShift = left;
      rowShift = Math.max(0, rowShift);
      row.style.transform = 'translateX(' + (-rowShift) + 'px)';
    }
  }
  var rowShift = 0;

  function resolveApps() {
    return P.resolveApps(cfg.apps).then(function (found) {
      items = [];
      cfg.apps.forEach(function (def) {
        var f = found[def.key];
        if (!f) return;
        items.push({ key: def.key, label: def.label, id: f.id,
          iconUrl: def.icon === false ? null : (typeof def.icon === 'string' ? def.icon : P.iconUrl(f.iconPath)) });
      });
      var fill = cfg.fillDock || {};
      var min = fill.enabled === false ? 0 : (fill.minTiles || 6);
      if (items.length >= min) return items;
      // Few configured apps on this device: add the other launchable apps, by name.
      return P.allApps().then(function (all) {
        var have = {};
        items.forEach(function (it) { have[it.id] = true; });
        var extra = all.filter(function (a) { return !have[a.id]; })
          .sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); })
          .slice(0, Math.max(0, (fill.maxTiles || 12) - items.length));
        extra.forEach(function (a) {
          items.push({ key: 'app:' + a.id, label: a.name || a.id, id: a.id, iconUrl: P.iconUrl(a.iconPath) });
        });
        return items;
      });
    }).then(function () {
      if (!items.length) {
        toast('No apps were found on this TV.', 6000);
      }
      var remembered = ls.get('pnw.focus');
      var idx = 0;
      items.forEach(function (it, i) { if (it.key === remembered) idx = i; });
      focus = idx;
      rebuildDock();
    });
  }

  function activate(it) {
    if (!it) return;
    $('dock-hint').textContent = 'Opening ' + it.label + '…';
    P.launchApp(it.id).then(function (how) {
      if (String(how).indexOf('preview:') === 0) toast('Preview: would open ' + it.label);
      $('dock-hint').textContent = 'Left and right to choose. OK to open.';
    }, function (e) {
      $('dock-hint').textContent = 'Left and right to choose. OK to open.';
      toast('Couldn’t open ' + it.label + (e && e.message ? ' (' + e.message + ')' : ''), 4500);
    });
  }

  // ---------- toast ----------
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, ms || 2500);
  }

  // ---------- ambient ----------
  function wake() {
    if (ambientOn) {
      ambientOn = false;
      document.documentElement.classList.remove('ambient');
    }
    armIdle();
  }
  function armIdle() {
    clearTimeout(idleTimer);
    if (!cfg.ambient || !cfg.ambient.enabled) return;
    var ms = Q.idle ? +Q.idle : cfg.ambient.afterMs;
    idleTimer = setTimeout(function () {
      ambientOn = true;
      document.documentElement.classList.add('ambient');
    }, ms);
  }

  // ---------- keys ----------
  function onKeyDown(e) {
    var k = e.keyCode;
    var wasAmbient = ambientOn;
    wake();
    if (wasAmbient) { e.preventDefault(); return; }      // first press only wakes the screen
    if (k === KEY.BACK || k === KEY.ESC || (k === KEY.BACKSPACE && cfg.preview)) {
      e.preventDefault();                                 // at the top level Back does nothing
      return;
    }
    if ([KEY.LEFT, KEY.RIGHT, KEY.UP, KEY.DOWN, KEY.ENTER].indexOf(k) < 0) return;
    e.preventDefault();
    if (k === KEY.LEFT) setFocus(focus - 1);
    else if (k === KEY.RIGHT) setFocus(focus + 1);
    else if (k === KEY.ENTER) {
      if (enterDown || e.repeat) return;
      enterDown = true;
    }
  }
  function onKeyUp(e) {
    if (e.keyCode !== KEY.ENTER) return;
    if (!enterDown) return;
    enterDown = false;
    if (!ambientOn) activate(items[focus]);
  }

  // ---------- backdrop ----------
  var backdrop = null;
  function startBackdrop() {
    if (!cfg.photos || !cfg.photos.enabled || !PNW.Backdrop) return;
    backdrop = new PNW.Backdrop($('bg-a'), $('bg-b'), $('credit'));
    backdrop.load(cfg.photos.manifest).then(function (n) {
      if (n) backdrop.start();
    });
  }

  // ---------- lifecycle ----------
  function onVisibility() {
    if (document.hidden) {
      document.documentElement.classList.add('paused');
      clearInterval(clockTimer);
      clearTimeout(idleTimer);
      enterDown = false;
      if (backdrop) backdrop.pause();
      return;
    }
    document.documentElement.classList.remove('paused');
    renderClock();
    clearInterval(clockTimer);
    clockTimer = setInterval(renderClock, cfg.clockEveryMs);
    wake();
    if (backdrop) backdrop.resume();
    resolveApps();               // an app may have been installed or removed meanwhile
  }

  function init() {
    document.documentElement.classList.add(P.isTV ? 'tv' : 'preview');
    var theme = Q.theme || cfg.theme || 'navy';
    if (theme !== 'navy') document.documentElement.classList.add('theme-' + theme);
    fitStage();
    window.addEventListener('resize', fitStage);
    renderClock();
    clockTimer = setInterval(renderClock, cfg.clockEveryMs);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('visibilitychange', onVisibility);
    resolveApps().then(function () {
      if (Q.focus && /^\d+$/.test(Q.focus)) setFocus(+Q.focus);
    });
    armIdle();
    startBackdrop();
    if (Q.ambient === '1') { ambientOn = true; document.documentElement.classList.add('ambient'); }
  }

  init();
}());

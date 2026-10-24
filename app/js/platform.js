/*
 * PNW Home - platform layer: find installed apps and launch them.
 *
 * Three backends, chosen at load time:
 *   tizen    window.tizen is present (Samsung TV)
 *   android  window.PNWAndroid is present (the Kotlin shell's JavascriptInterface;
 *            Android TV, Google TV, Fire TV)
 *   mock     neither (a desktop browser preview)
 *
 * The Tizen calls are adapted from Glass Home (victaphu/glass-home-samsung-tv, MIT).
 * Tizen privileges: application.launch, application.info.
 */
(function () {
  'use strict';
  var PNW = window.PNW;
  var cfg = PNW.config;
  var tz = !cfg.preview && typeof window.tizen !== 'undefined' ? window.tizen : null;
  var an = !cfg.preview && typeof window.PNWAndroid !== 'undefined' ? window.PNWAndroid : null;
  var wo = !cfg.preview && !tz && !an && typeof window.PalmServiceBridge !== 'undefined';   // LG webOS
  var P = {};

  P.isTV = !!(tz || an || wo);
  P.platform = tz ? 'tizen' : (an ? 'android' : (wo ? 'webos' : 'mock'));

  // "Disney+" -> "disney plus", "Prime Video" -> "prime video"
  function norm(name) {
    return String(name || '').toLowerCase().replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  // Fills result[def.key] for defs not yet matched, by exact id then by name pattern.
  function matchList(defs, list, result, idField) {
    var taken = {};
    Object.keys(result).forEach(function (k) { taken[result[k].id] = true; });
    var apps = (list || []).filter(function (a) { return a && a.id && a.show !== false; });
    var byId = {};
    apps.forEach(function (a) { byId[a.id] = a; });
    defs.forEach(function (def) {
      if (result[def.key]) return;
      var ids = def[idField] || [];
      for (var i = 0; i < ids.length; i++) {
        var hit = byId[ids[i]];
        if (hit && !taken[hit.id]) { result[def.key] = { id: hit.id, name: hit.name, iconPath: hit.iconPath || hit.icon || null }; taken[hit.id] = true; return; }
      }
    });
    defs.forEach(function (def) {
      if (result[def.key]) return;
      for (var p = 0; p < def.names.length && !result[def.key]; p++) {
        var re = new RegExp(def.names[p]);
        for (var i = 0; i < apps.length; i++) {
          var a = apps[i];
          if (taken[a.id] || !re.test(norm(a.name))) continue;
          result[def.key] = { id: a.id, name: a.name, iconPath: a.iconPath || a.icon || null };
          taken[a.id] = true;
          break;
        }
      }
    });
    return result;
  }

  var MOCK = [
    { id: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube' },
    { id: 'RN1MCdNq8t.Netflix', name: 'Netflix' },
    { id: 'evKhCgZelL.AmazonIgnitionLauncher2', name: 'Prime Video' },
    { id: 'MCmYXNxgcu.DisneyPlus', name: 'Disney+' },
    { id: 'LBUAQX1exg.Hulu', name: 'Hulu' },
    { id: 'gzcc4LRFBF.Peacock', name: 'Peacock TV' },
    { id: 'com.samsung.tv.aria-video', name: 'Apple TV' },
    { id: 'com.samsung.tv.tvPlusDeeplinker', name: 'Samsung TV Plus' },
    { id: 'org.tizen.browser', name: 'Internet' }
  ];

  function previewLaunch(what) {
    return new Promise(function (resolve) { setTimeout(function () { resolve('preview:' + what); }, 150); });
  }

  // ---------- Tizen ----------
  function tizenResolve(defs) {
    var result = {};
    defs.forEach(function (def) {
      var ids = def.ids || [];
      for (var i = 0; i < ids.length; i++) {
        try {
          var info = tz.application.getAppInfo(ids[i]);
          if (info && info.id) { result[def.key] = { id: info.id, name: info.name, iconPath: info.iconPath || null }; break; }
        } catch (e) { /* NotFoundError: try the next id */ }
      }
    });
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; resolve(result); } }, 4000);
      try {
        tz.application.getAppsInfo(function (list) {
          if (done) return;
          done = true; clearTimeout(timer);
          resolve(matchList(defs, list, result, 'ids'));
        }, function () {
          if (done) return;
          done = true; clearTimeout(timer);
          resolve(result);
        });
      } catch (e) { done = true; clearTimeout(timer); resolve(result); }
    });
  }

  function tizenLaunch(id) {
    return new Promise(function (resolve, reject) {
      function viaAppControl(firstError) {
        try {
          tz.application.launchAppControl(
            new tz.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null, null),
            id, function () { resolve('appcontrol'); }, function (e) { reject(e || firstError); });
        } catch (e) { reject(e); }
      }
      try { tz.application.launch(id, function () { resolve('launch'); }, viaAppControl); }
      catch (e) { viaAppControl(e); }
    });
  }

  // ---------- Android (Kotlin shell) ----------
  // PNWAndroid.listApps() -> JSON [{ id: packageName, name: label, icon: dataUrl|null }]
  // PNWAndroid.launchApp(packageName) -> boolean
  function androidResolve(defs) {
    var list = [];
    try { list = JSON.parse(an.listApps() || '[]'); } catch (e) { list = []; }
    return Promise.resolve(matchList(defs, list, {}, 'android'));
  }
  function androidLaunch(id) {
    return new Promise(function (resolve, reject) {
      var ok = false;
      try { ok = !!an.launchApp(id); } catch (e) { reject(e); return; }
      if (ok) resolve('android'); else reject(new Error('not launchable'));
    });
  }

  // ---------- LG webOS (Luna service bus) ----------
  // webOS web apps get window.PalmServiceBridge, the primitive that LG's webOSTV.js wraps.
  // One bridge per call: set the callback, call "luna://service/method" with JSON params.
  var APPMGR = 'luna://com.webos.applicationManager';
  function luna(uri, method, params) {
    return new Promise(function (resolve, reject) {
      var bridge, done = false;
      var timer = setTimeout(function () { if (!done) { done = true; reject(new Error('luna timeout: ' + method)); } }, 5000);
      try {
        bridge = new window.PalmServiceBridge();
        bridge.onservicecallback = function (msg) {
          if (done) return;
          done = true; clearTimeout(timer);
          var r;
          try { r = JSON.parse(msg); } catch (e) { reject(new Error('luna: bad reply')); return; }
          if (r && r.returnValue === false) reject(new Error(r.errorText || ('luna error ' + r.errorCode)));
          else resolve(r);
        };
        bridge.call(uri + '/' + method, JSON.stringify(params || {}));
      } catch (e) { done = true; clearTimeout(timer); reject(e); }
    });
  }
  // listLaunchPoints returns what the LG Home ribbon shows: { id, title, icon, largeIcon, ... }.
  // Some firmware refuses it to third-party apps; then the configured apps are shown unverified
  // and a launch failure reports it.
  function webosLaunchPoints() {
    return luna(APPMGR, 'listLaunchPoints', {}).then(function (r) {
      return (r.launchPoints || []).map(function (lp) {
        return { id: lp.id, name: lp.title, iconPath: lp.largeIcon || lp.icon || null, show: lp.removable !== undefined ? true : true };
      });
    });
  }
  function webosResolve(defs) {
    return webosLaunchPoints().then(function (list) {
      return matchList(defs, list, {}, 'webos');
    }, function () {
      // Listing refused: trust the first configured webOS id of each entry.
      var result = {};
      defs.forEach(function (def) {
        var ids = def.webos || [];
        if (ids.length) result[def.key] = { id: ids[0], name: def.label, iconPath: null, unverified: true };
      });
      return result;
    });
  }
  function webosLaunch(id) {
    return luna(APPMGR, 'launch', { id: id }).then(function () { return 'webos'; });
  }

  // The Kotlin shell forwards D-pad and OK presses here as synthetic key events, with the
  // keyCodes the rest of the page already understands. KeyboardEvent's constructor ignores
  // keyCode, so it is defined on the instance.
  if (an) {
    window.PNWKey = function (type, keyCode, repeat) {
      var e;
      try { e = new KeyboardEvent(type, { bubbles: true, cancelable: true, repeat: !!repeat }); }
      catch (err) { e = document.createEvent('Event'); e.initEvent(type, true, true); }
      try { Object.defineProperty(e, 'keyCode', { get: function () { return keyCode; } }); } catch (err) { /* ignore */ }
      try { Object.defineProperty(e, 'repeat', { get: function () { return !!repeat; } }); } catch (err) { /* ignore */ }
      document.dispatchEvent(e);
    };
  }

  // ---------- public API ----------
  // Resolves { key: { id, name, iconPath } } for the dock apps that are installed.
  P.resolveApps = function (defs) {
    if (tz) return tizenResolve(defs);
    if (an) return androidResolve(defs);
    if (wo) return webosResolve(defs);
    return Promise.resolve(matchList(defs, MOCK, {}, 'ids'));
  };

  // Every launchable app on the device, as [{ id, name, iconPath }], for filling the dock
  // when few of the configured apps are installed (a new or unusual device).
  P.allApps = function () {
    function shape(list) {
      return (list || []).filter(function (a) { return a && a.id && a.show !== false; })
        .map(function (a) { return { id: a.id, name: a.name, iconPath: a.iconPath || a.icon || null }; });
    }
    if (an) {
      var list = [];
      try { list = JSON.parse(an.listApps() || '[]'); } catch (e) { list = []; }
      return Promise.resolve(shape(list));
    }
    if (wo) return webosLaunchPoints().then(shape, function () { return []; });
    if (tz) {
      return new Promise(function (resolve) {
        var done = false;
        var timer = setTimeout(function () { if (!done) { done = true; resolve([]); } }, 4000);
        try {
          tz.application.getAppsInfo(function (l) { if (!done) { done = true; clearTimeout(timer); resolve(shape(l)); } },
            function () { if (!done) { done = true; clearTimeout(timer); resolve([]); } });
        } catch (e) { done = true; clearTimeout(timer); resolve([]); }
      });
    }
    return Promise.resolve(shape(MOCK));
  };

  P.iconUrl = function (iconPath) {
    if (!iconPath) return null;
    var s = String(iconPath);
    if (/^(file|https?|data):/i.test(s)) return s;
    if (s.charAt(0) === '/') return 'file://' + s;
    return s;
  };

  // Opens an installed app.
  P.launchApp = function (id) {
    if (tz) return tizenLaunch(id);
    if (an) return androidLaunch(id);
    if (wo) return webosLaunch(id);
    return previewLaunch(id);
  };

  PNW.platform = P;
}());

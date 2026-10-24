/*
 * PNW Home - Tizen calls: find installed apps and launch them. In preview mode
 * (a desktop browser) everything is mocked.
 *
 * Adapted from Glass Home (victaphu/glass-home-samsung-tv, MIT), trimmed to the
 * two calls this app needs. Privileges: application.launch, application.info.
 */
(function () {
  'use strict';
  var PNW = window.PNW;
  var cfg = PNW.config;
  var tz = !cfg.preview && typeof window.tizen !== 'undefined' ? window.tizen : null;
  var P = {};

  P.isTV = !!tz;

  // "Disney+" -> "disney plus", "Prime Video" -> "prime video"
  function norm(name) {
    return String(name || '').toLowerCase().replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function matchByName(defs, list, result) {
    var taken = {};
    Object.keys(result).forEach(function (k) { taken[result[k].id] = true; });
    var apps = (list || []).filter(function (a) { return a && a.id && a.show !== false; });
    defs.forEach(function (def) {
      if (result[def.key]) return;
      for (var p = 0; p < def.names.length && !result[def.key]; p++) {
        var re = new RegExp(def.names[p]);
        for (var i = 0; i < apps.length; i++) {
          var a = apps[i];
          if (taken[a.id] || !re.test(norm(a.name))) continue;
          result[def.key] = { id: a.id, name: a.name, iconPath: a.iconPath || null };
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

  // Resolves { key: { id, name, iconPath } } for the dock apps that are installed.
  P.resolveApps = function (defs) {
    if (!tz) return Promise.resolve(matchByName(defs, MOCK, {}));
    var result = {};
    defs.forEach(function (def) {
      for (var i = 0; i < def.ids.length; i++) {
        try {
          var info = tz.application.getAppInfo(def.ids[i]);
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
          resolve(matchByName(defs, list, result));
        }, function () {
          if (done) return;
          done = true; clearTimeout(timer);
          resolve(result);
        });
      } catch (e) { done = true; clearTimeout(timer); resolve(result); }
    });
  };

  P.iconUrl = function (iconPath) {
    if (!iconPath) return null;
    var s = String(iconPath);
    if (/^(file|https?|data):/i.test(s)) return s;
    if (s.charAt(0) === '/') return 'file://' + s;
    return s;
  };

  // Opens an installed app. Falls back to an app-control launch if launch() fails.
  P.launchApp = function (id) {
    if (!tz) return new Promise(function (resolve) { setTimeout(function () { resolve('preview:' + id); }, 150); });
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
  };

  PNW.platform = P;
}());

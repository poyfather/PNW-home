/*
 * PNW Home settings.
 *
 * Dock apps are resolved at start-up, first by the Tizen app IDs listed (exact,
 * fast), then by a case-insensitive name match over installed apps. IDs below
 * were read from this TV (UN65NU8000) with 'sdb shell 0 vd_applist'.
 */
(function () {
  'use strict';
  var q = {};
  String(location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
    if (!kv) return;
    var i = kv.indexOf('=');
    try { q[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? '1' : decodeURIComponent(kv.slice(i + 1)); }
    catch (e) { /* ignore */ }
  });
  var preview = typeof window.tizen === 'undefined' || q.preview === '1';

  window.PNW = window.PNW || {};
  window.PNW.query = q;
  window.PNW.config = {
    preview: preview,

    // Colour theme: 'navy' (default) or 'orange' (burnt orange ground, navy accent).
    // ?theme=orange overrides this for a preview.
    theme: 'navy',

    // Hero copy. Greeting changes with the time of day; the accent line is a
    // short brand statement set in Baumans (never body copy).
    greetings: { morning: 'Good morning.', afternoon: 'Good afternoon.', evening: 'Good evening.', night: 'Good night.' },
    accent: 'Only the greatest possibilities.',

    // Clock
    locale: 'en-US',
    hour12: true,
    clockEveryMs: 10000,

    // Photo backdrop: Mount Rainier, Tacoma and the South Sound (photos/manifest.json;
    // public domain and CC0/CC BY works from Wikimedia Commons, credited on screen).
    photos: { enabled: true, manifest: 'photos/manifest.json', intervalMs: 90 * 1000 },

    // Ambient screensaver: only the clock over the photo after this long idle.
    ambient: { enabled: true, afterMs: 5 * 60 * 1000 },

    // Evening dimming of the whole stage, by the TV's clock (24-hour).
    night: { enabled: true, from: '21:00', to: '06:00', opacity: 0.82 },

    // Long press OK (ms) is reserved for a future menu; currently unused.
    longPressMs: 700,

    // The dock, in order. 'icon: false' shows a type-only tile (some apps report
    // a poor icon to other apps: YouTube reports its engine's pinwheel, Prime
    // Video's may not load, Samsung TV Plus is a system app).
    apps: [
      { key: 'youtube', label: 'YouTube', ids: ['9Ur5IzDKqV.TizenYouTube', 'com.samsung.tv.cobalt-yt'],
        names: ['^youtube$'], icon: false },
      { key: 'netflix', label: 'Netflix', ids: ['RN1MCdNq8t.Netflix', 'org.tizen.netflix-app'],
        names: ['^netflix$', '\\bnetflix\\b'] },
      { key: 'prime', label: 'Prime Video', ids: ['evKhCgZelL.AmazonIgnitionLauncher2', 'org.tizen.ignition'],
        names: ['^prime video$', '^amazon prime video$'], icon: false },
      { key: 'disney', label: 'Disney+', ids: ['MCmYXNxgcu.DisneyPlus'],
        names: ['^disney plus$', '^disney$'] },
      { key: 'hulu', label: 'Hulu', ids: ['LBUAQX1exg.Hulu'],
        names: ['^hulu$'] },
      { key: 'peacock', label: 'Peacock', ids: ['gzcc4LRFBF.Peacock'],
        names: ['^peacock tv$', '^peacock$'] },
      { key: 'appletv', label: 'Apple TV', ids: ['com.samsung.tv.aria-video'],
        names: ['^apple tv$'], icon: false },
      { key: 'tvplus', label: 'Samsung TV Plus', ids: ['com.samsung.tv.tvPlusDeeplinker', 'com.samsung.tv.tvplus'],
        names: ['^samsung tv plus$', '^tv plus$'], icon: false },
      { key: 'browser', label: 'Internet', ids: ['org.tizen.browser'],
        names: ['^internet$', '^browser$'], icon: false }
    ]
  };
}());

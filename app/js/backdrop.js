/*
 * PNW Home - rotating photo backdrop. Two layers crossfade (opacity) with a slow
 * drift (transform scale) between photos listed in photos/manifest.json. Order is
 * shuffled once per day so the same photo greets you all day, then changes.
 * Transform and opacity only; the TV's Chromium 56 engine composites both.
 */
(function () {
  'use strict';
  var PNW = window.PNW;
  var cfg = PNW.config.photos || {};

  function Backdrop(a, b, creditEl) {
    this.layers = [a, b];
    this.credit = creditEl;
    this.cur = 0;
    this.list = [];
    this.idx = -1;
    this.timer = 0;
    this.paused = false;
  }

  function daySeed() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function shuffle(list, seed) {
    var a = list.slice(), s = seed || 1;
    for (var i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      var j = Math.floor((s / 233280) * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  Backdrop.prototype.load = function (url) {
    var self = this;
    return new Promise(function (resolve) {
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.onload = function () {
        try {
          var m = JSON.parse(x.responseText);
          self.list = shuffle(m.photos || [], daySeed());
        } catch (e) { self.list = []; }
        resolve(self.list.length);
      };
      x.onerror = function () { resolve(0); };
      x.send();
    });
  };

  Backdrop.prototype.show = function (photo, instant) {
    var self = this;
    var next = this.layers[1 - this.cur];
    var img = new Image();
    img.onload = function () {
      next.style.backgroundImage = 'url("' + photo.src + '")';
      next.classList.remove('drift');
      // Force a style flush so the drift restarts from scale(1).
      void next.offsetWidth;
      next.classList.add('on', 'drift');
      self.layers[self.cur].classList.remove('on');
      self.cur = 1 - self.cur;
      if (self.credit) {
        var parts = [photo.caption];
        if (photo.artist) parts.push(photo.artist);
        if (photo.license) parts.push(photo.license);
        self.credit.textContent = parts.join('  ·  ');
      }
    };
    img.onerror = function () { self.next(); };
    if (instant) next.style.transition = 'none';
    img.src = photo.src;
    if (instant) setTimeout(function () { next.style.transition = ''; }, 50);
  };

  Backdrop.prototype.next = function () {
    if (!this.list.length) return;
    this.idx = (this.idx + 1) % this.list.length;
    this.show(this.list[this.idx], this.idx === 0 && this.cur === 0);
  };

  Backdrop.prototype.start = function () {
    var self = this;
    if (!this.list.length) return;
    this.next();
    clearInterval(this.timer);
    this.timer = setInterval(function () { if (!self.paused) self.next(); }, cfg.intervalMs || 60000);
  };
  Backdrop.prototype.pause = function () { this.paused = true; };
  Backdrop.prototype.resume = function () { this.paused = false; };

  PNW.Backdrop = Backdrop;
}());

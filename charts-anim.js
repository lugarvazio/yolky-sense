// Микро-анимации графиков: запускаются один раз, когда блок попадает в экран.
// Без JS и при prefers-reduced-motion остаётся готовая статичная картинка.
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var $ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function tween(dur, delay, fn) {
    setTimeout(function () {
      var t0 = performance.now();
      (function f(now) {
        var p = clamp((now - t0) / dur, 0, 1);
        fn(ease(p), p);
        if (p < 1) requestAnimationFrame(f);
      })(t0);
    }, delay || 0);
  }
  function once(el, th, cb) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); cb(); }
    }, { threshold: th });
    io.observe(el);
  }

  // ---------- набор чисел ----------
  function prepCount(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 3) continue;
      var m = n.nodeValue.match(/^(\s*)(\d[\d,  ]*)(%?)(\s*)$/);
      if (!m) continue;
      var raw = m[2], sepM = raw.match(/[,  ]/);
      var c = { n: n, pre: m[1], suf: m[3] + m[4], sep: sepM ? sepM[0] : '', val: parseInt(raw.replace(/[,  ]/g, ''), 10) };
      n.nodeValue = fmt(c, 0);
      return c;
    }
    return null;
  }
  function fmt(c, v) {
    var s = String(Math.round(v));
    if (c.sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, c.sep);
    return c.pre + s + c.suf;
  }
  function runCount(c, delay, dur) {
    tween(dur || 1100, delay, function (p) { c.n.nodeValue = fmt(c, c.val * p); });
  }

  // ---------- 1. шум → сигнал ----------
  (function () {
    var svg = document.querySelector('svg[viewBox="0 0 900 140"]');
    if (!svg) return;
    var paths = $('path', svg), noisy = paths[0], green = paths[1];
    var dot = svg.querySelector('circle'), text = svg.querySelector('text');
    var marker = $('line', svg).filter(function (l) { return l.getAttribute('x1') === '474'; })[0];
    if (!noisy || !green || !dot || !marker) return;
    var NS = 'http://www.w3.org/2000/svg';
    var spike = document.createElementNS(NS, 'path');
    spike.setAttribute('d', 'M470,70 L474,20 L478,70');
    spike.setAttribute('fill', 'none');
    spike.setAttribute('stroke', noisy.getAttribute('stroke'));
    spike.setAttribute('stroke-width', noisy.getAttribute('stroke-width'));
    spike.setAttribute('opacity', noisy.getAttribute('opacity'));
    spike.setAttribute('stroke-dasharray', '101');
    spike.setAttribute('stroke-dashoffset', '101');
    noisy.parentNode.insertBefore(spike, noisy.nextSibling);

    var XS = [], seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var x = 0; x <= 900; x += 10) XS.push({ x: x, m: 0.45 + rnd() * 0.55, s: (XS.length % 2 ? 1 : -1) });
    var A = function (x) { return 1 - 0.35 * Math.min(x, 266) / 266; };
    var A0 = function (x) { return A(Math.min(x, 266)); };
    var E = function (x) { return x < 266 ? A(x) : x < 320 ? A(266) * (1 - (x - 266) / 54) : 0; };
    function render(f) {
      var d = XS.map(function (p, i) {
        var s = p.x < 240 ? 1 : clamp((f - p.x) / 90, 0, 1);
        var amp = (1 - s) * A0(p.x) + s * E(p.x);
        var y = 70 + p.s * p.m * amp * 34;
        return (i ? 'L' : 'M') + p.x + ',' + y.toFixed(1);
      }).join(' ');
      noisy.setAttribute('d', d);
      var x2 = clamp(f - 45, 290, 900);
      green.setAttribute('d', 'M290,70 L' + x2.toFixed(1) + ',70');
    }
    [dot, marker, text].forEach(function (e) { if (e) { e.style.opacity = 0; e.style.transition = 'opacity .45s ease'; } });
    dot.style.transformBox = 'fill-box'; dot.style.transformOrigin = 'center'; dot.style.transform = 'scale(.2)';
    dot.style.transition = 'opacity .35s ease, transform .5s cubic-bezier(.2,1.5,.4,1)';
    spike.style.transition = 'stroke-dashoffset .5s ease';
    render(-100);
    var card = svg.closest('.card') || svg;
    once(card, 0.55, function () {
      tween(2300, 700, function (p) { render(240 + (990 - 240) * p); });
      setTimeout(function () {
        spike.style.strokeDashoffset = '0';
        dot.style.opacity = 1; dot.style.transform = 'scale(1)';
        marker.style.opacity = 1;
        setTimeout(function () { if (text) text.style.opacity = 1; }, 250);
      }, 3100);
    });
  })();

  // ---------- 2. было → стало (64% → 13%) ----------
  $('.how-stat').forEach(function (st) {
    st.classList.add('anim');
    once(st, 0.6, function () { st.classList.add('go'); });
  });

  // ---------- 3. месяц: числа, столбцы, коррекция ----------
  function group(el, setup) { var run = setup(el); once(el, 0.3, run); }

  // главная цифра + KPI
  var hero = document.querySelector('.m-hero');
  if (hero) group(hero, function (g) {
    var cs = $('.m-big, .m-kpi .v', g).map(prepCount).filter(Boolean);
    return function () { cs.forEach(function (c, i) { runCount(c, i * 120, 1300); }); };
  });

  // три недельных графика
  var weeks = document.querySelector('.m-weeks');
  if (weeks) group(weeks, function (g) {
    var cs = $('.m-hv, .m-val', g).map(prepCount).filter(Boolean);
    var bars = $('.m-fill', g);
    bars.forEach(function (b) {
      b.style.transformOrigin = 'bottom'; b.style.transform = 'scaleY(0)';
    });
    $('.m-val', g).forEach(function (v) { v.style.opacity = 0; v.style.transition = 'opacity .4s ease'; });
    return function () {
      $('.m-panel', g).forEach(function (pn, pi) {
        $('.m-fill', pn).forEach(function (b, i) {
          var dl = pi * 150 + i * 140;
          b.style.transition = 'transform .9s cubic-bezier(.2,.8,.2,1) ' + dl + 'ms';
          b.style.transform = 'scaleY(1)';
        });
        $('.m-val', pn).forEach(function (v, i) { v.style.transitionDelay = (pi * 150 + i * 140 + 300) + 'ms'; v.style.opacity = 1; });
      });
      cs.forEach(function (c, i) {
        var inPanel = c.n.parentNode.classList.contains('m-val');
        runCount(c, inPanel ? 300 + (i % 4) * 140 : 0, 1000);
      });
    };
  });

  // ---------- 4. левый график: было → стало «коррекцией» ----------
  var duo = $('.m-duo > .m-panel');
  var left = duo[0], right = duo[1];
  if (left && left.querySelector('.m-lane')) group(left, function (g) {
    var rows = $('.m-row', g).map(function (r) {
      var a = r.querySelector('.m-pt.a'), b = r.querySelector('.m-pt.b'), seg = r.querySelector('.m-seg'), dl = r.querySelector('.m-delta');
      if (!a || !b || !seg || !dl) return null;
      var o = { a: a, b: b, seg: seg, bl: b.style.left, sl: seg.style.left, sw: seg.style.width, dl: dl };
      var db = dl.querySelector('b');
      o.db = db ? prepCount(db) : null;
      var was = dl.firstChild && dl.firstChild.nodeType === 3 ? parseInt(dl.firstChild.nodeValue, 10) : NaN;
      o.was = was;
      b.style.transition = 'left 1s cubic-bezier(.3,.7,.2,1), opacity .3s ease';
      seg.style.transition = 'left 1s cubic-bezier(.3,.7,.2,1), width 1s cubic-bezier(.3,.7,.2,1)';
      a.style.opacity = 0; a.style.transition = 'opacity .35s ease';
      b.style.left = a.style.left; b.style.opacity = 0;
      seg.style.left = a.style.left; seg.style.width = '0%';
      dl.style.opacity = 0; dl.style.transition = 'opacity .4s ease';
      return o;
    }).filter(Boolean);
    return function () {
      rows.forEach(function (o, i) {
        var d0 = i * 160;
        setTimeout(function () { o.a.style.opacity = 1; o.dl.style.opacity = 1; if (o.db && !isNaN(o.was)) o.db.n.nodeValue = fmt(o.db, o.was); }, d0);
        setTimeout(function () {
          o.b.style.opacity = 1; o.b.style.left = o.bl; o.seg.style.left = o.sl; o.seg.style.width = o.sw;
          if (o.db && !isNaN(o.was)) tween(1000, 0, function (p) { o.db.n.nodeValue = fmt(o.db, o.was + (o.db.val - o.was) * p); });
        }, d0 + 600);
      });
    };
  });

  // ---------- 5. правый график: рост полос и процентов ----------
  if (right && right.querySelector('.m-tfill')) group(right, function (g) {
    var fills = $('.m-tfill', g), ws = fills.map(function (f) { return f.style.width; });
    var cs = $('.m-chip', g).map(prepCount).filter(Boolean);
    fills.forEach(function (f) { f.style.width = '0%'; });
    return function () {
      fills.forEach(function (f, i) {
        f.style.transition = 'width 1.1s cubic-bezier(.2,.8,.2,1) ' + (i * 140) + 'ms';
        f.style.width = ws[i];
      });
      cs.forEach(function (c, i) { runCount(c, i * 140, 1100); });
    };
  });
})();

// Бегунок «обычная камера / Yolky Sense»: тянем границу над одним и тем же днём.
// Без JS и при prefers-reduced-motion остаётся статичная картинка с границей посередине.
(function () {
  var box = document.getElementById('split');
  if (!box) return;
  var range = box.querySelector('.sp-range');
  function set(v) { box.style.setProperty('--v', v); range.value = v; }
  range.addEventListener('input', function () { stopped = true; box.style.setProperty('--v', range.value); });
  var stopped = false;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  set(100);
  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    var t0 = performance.now(), from = 100, to = 38, dur = 2200;
    setTimeout(function () {
      (function f(now) {
        if (stopped) return;
        var p = Math.min(1, (now - (t0 + 600)) / dur);
        p = Math.max(0, p);
        var e = 1 - Math.pow(1 - p, 3);
        set(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(f);
      })(performance.now());
    }, 0);
  }, { threshold: 0.6 });
  io.observe(box);
})();

// «Колода соседей»: при скролле раскрывается, и в середине появляется свой.
// Без JS и при prefers-reduced-motion остаётся раскрытая картинка (--p: 1).
(function () {
  var st = document.querySelector('.crowd');
  if (!st) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var row = st.querySelector('.crowd-row'), pend = false;
  st.classList.add('live');
  function upd() {
    pend = false;
    var vh = window.innerHeight, top = row.getBoundingClientRect().top;
    var p = Math.max(0, Math.min(1, (vh * 0.95 - top) / (vh * 0.6)));
    var e = p * p * (3 - 2 * p);
    st.style.setProperty('--p', e.toFixed(4));
    st.classList.toggle('open', e > 0.7);
  }
  function req() { if (!pend) { pend = true; requestAnimationFrame(upd); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  upd();
})();

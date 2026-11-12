(function () {
  var modal = document.getElementById('demoModal');
  var form = document.getElementById('demoRequestForm');
  var thanks = document.getElementById('demoThanks');
  var formWrap = modal && modal.querySelector('.modal-form-wrap');
  var err = document.getElementById('demoFormError');
  var submitBtn = document.getElementById('demoSubmitBtn');
  if (!modal || !form) return;

  var ru = document.documentElement.lang === 'ru';
  var ENDPOINT = 'https://formsubmit.co/ajax/lugarvazio@gmail.com';
  var MSG = ru ? {
    required: 'Заполните обязательные поля.',
    email: 'Укажите корректный email.',
    fail: 'Не удалось отправить запрос. Попробуйте ещё раз или напишите на lugarvazio@gmail.com.',
    sending: 'Отправляем…',
    send: 'Отправить'
  } : {
    required: 'Please fill in the required fields.',
    email: 'Please enter a valid email.',
    fail: 'Could not send the request. Try again or email lugarvazio@gmail.com.',
    sending: 'Sending…',
    send: 'Send request'
  };

  var lastFocus = null;

  function openModal() {
    lastFocus = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (thanks) thanks.classList.remove('show');
    if (formWrap) formWrap.style.display = '';
    form.classList.remove('is-hidden');
    form.reset();
    if (err) { err.textContent = ''; err.classList.remove('show'); }
    var first = document.getElementById('demoName');
    if (first) setTimeout(function () { first.focus(); }, 30);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal-root.open')) {
      document.body.classList.remove('modal-open');
    }
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  document.querySelectorAll('[data-demo-open]').forEach(function (btn) {
    btn.addEventListener('click', openModal);
  });
  modal.querySelectorAll('[data-demo-close]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (err) { err.textContent = ''; err.classList.remove('show'); }

    var name = (form.name.value || '').trim();
    var email = (form.email.value || '').trim();
    var telegram = (form.telegram.value || '').trim();
    var purpose = (form.purpose.value || '').trim();
    var honey = (form._gotcha && form._gotcha.value) || '';

    if (!name || !email || !purpose) {
      if (err) { err.textContent = MSG.required; err.classList.add('show'); }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (err) { err.textContent = MSG.email; err.classList.add('show'); }
      return;
    }
    if (honey) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = MSG.sending;
    }

    var payload = {
      name: name,
      email: email,
      telegram: telegram || '—',
      purpose: purpose,
      page: location.href,
      language: ru ? 'ru' : 'en',
      _subject: 'Yolky Sense — demo access request',
      _template: 'table',
      _captcha: 'false',
      _replyto: email
    };

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('bad status');
      return res.json().catch(function () { return {}; });
    }).then(function () {
      form.reset();
      form.classList.add('is-hidden');
      if (formWrap) formWrap.style.display = 'none';
      if (thanks) thanks.classList.add('show');
    }).catch(function () {
      if (err) { err.textContent = MSG.fail; err.classList.add('show'); }
    }).finally(function () {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = MSG.send;
      }
    });
  });
})();

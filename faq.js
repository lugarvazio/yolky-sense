(function () {
  var list = document.querySelector('.faq-list');
  var topics = document.querySelectorAll('[data-faq-topic]');
  if (list && topics.length) {
    topics.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var topic = btn.getAttribute('data-faq-topic') || 'all';
        topics.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        list.querySelectorAll('.faq-item').forEach(function (item) {
          var match = topic === 'all' || item.getAttribute('data-topic') === topic;
          item.hidden = !match;
          if (!match) item.open = false;
        });
      });
    });
    list.addEventListener('toggle', function (e) {
      var el = e.target;
      if (!el.classList || !el.classList.contains('faq-item') || !el.open) return;
      list.querySelectorAll('.faq-item[open]').forEach(function (other) {
        if (other !== el) other.open = false;
      });
    }, true);
  }

  var modal = document.getElementById('contactModal');
  var form = document.getElementById('contactForm');
  var thanks = document.getElementById('contactThanks');
  var formWrap = modal && modal.querySelector('.modal-form-wrap');
  var err = document.getElementById('contactFormError');
  var submitBtn = document.getElementById('contactSubmitBtn');
  if (!modal || !form) return;

  var ru = document.documentElement.lang === 'ru';
  var ENDPOINT = 'https://formsubmit.co/ajax/lugarvazio@gmail.com';
  var MSG = ru ? {
    required: 'Заполните обязательные поля.',
    email: 'Укажите корректный email.',
    fail: 'Не удалось отправить сообщение. Попробуйте ещё раз или напишите на lugarvazio@gmail.com.',
    sending: 'Отправляем…',
    send: 'Отправить'
  } : {
    required: 'Please fill in the required fields.',
    email: 'Please enter a valid email.',
    fail: 'Could not send the message. Try again or email lugarvazio@gmail.com.',
    sending: 'Sending…',
    send: 'Send'
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
    var first = document.getElementById('contactName');
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

  document.querySelectorAll('[data-contact-open]').forEach(function (btn) {
    btn.addEventListener('click', openModal);
  });
  modal.querySelectorAll('[data-contact-close]').forEach(function (el) {
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
    var topic = (form.topic.value || '').trim();
    var message = (form.message.value || '').trim();
    var honey = (form._gotcha && form._gotcha.value) || '';

    if (!name || !email || !topic || !message) {
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
      topic: topic,
      message: message,
      page: location.href,
      language: ru ? 'ru' : 'en',
      _subject: 'Yolky Sense — contact: ' + topic,
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

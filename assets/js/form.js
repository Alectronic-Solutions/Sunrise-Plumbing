/* ============================================================
   SUNRISE PLUMBING: FORM JS
   Validation, submit handler, thank-you modal
   ============================================================ */

(function () {
  'use strict';

  const form = document.getElementById('contact-form');
  const modal = document.getElementById('thank-you-modal');
  const modalClose = document.getElementById('modal-close');

  if (!form) return;

  /* Pre-fill area from URL param */
  const params = new URLSearchParams(window.location.search);
  const area = params.get('area');
  if (area) {
    const serviceField = form.querySelector('#service');
    if (serviceField) {
      const opt = document.createElement('option');
      opt.value = area;
      opt.textContent = decodeURIComponent(area.replace(/-/g, ' ')).replace(/\b\w/g, c => c.toUpperCase());
      opt.selected = true;
      serviceField.insertBefore(opt, serviceField.firstChild);
    }
  }

  /* Validators */
  const rules = {
    name:    v => v.trim().length >= 2 ? '' : 'Please enter your full name.',
    phone:   v => /^[\d\s\-\+\(\)]{7,}$/.test(v.trim()) ? '' : 'Please enter a valid phone number.',
    email:   v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email address.',
    service: () => '',
    time:    () => '',
    zip:     () => '',
    message: () => '',
  };

  const getGroup = (input) => input.closest('.form-group');
  const getError = (group) => group && group.querySelector('.form-error');

  const validateField = (input) => {
    const rule = rules[input.name];
    if (!rule) return true;
    const msg = rule(input.value);
    const group = getGroup(input);
    const errEl = getError(group);
    if (msg) {
      group && group.classList.add('has-error');
      if (errEl) errEl.textContent = msg;
      return false;
    } else {
      group && group.classList.remove('has-error');
      return true;
    }
  };

  /* Blur validation */
  form.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      const group = getGroup(input);
      if (group && group.classList.contains('has-error')) validateField(input);
    });
  });

  /* Submit */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll('input[name], select[name], textarea[name]').forEach(input => {
      if (!validateField(input)) valid = false;
    });
    if (!valid) {
      const first = form.querySelector('.has-error input, .has-error select, .has-error textarea');
      if (first) first.focus();
      return;
    }

    /* Show spinner */
    const btn = form.querySelector('[type="submit"]');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Sending…';
    btn.disabled = true;

    /* Simulate submission (demo) */
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      form.reset();
      showModal();
    }, 800);
  });

  /* Modal */
  function showModal() {
    if (!modal) return;
    modal.classList.add('active');
    const closeBtn = modal.querySelector('.modal-close, #modal-close');
    if (closeBtn) closeBtn.focus();
    document.addEventListener('keydown', onModalKey);
    modal.addEventListener('click', onModalBackdrop);
  }

  function hideModal() {
    if (!modal) return;
    modal.classList.remove('active');
    document.removeEventListener('keydown', onModalKey);
    modal.removeEventListener('click', onModalBackdrop);
    form.querySelector('[type="submit"]') && form.querySelector('[type="submit"]').focus();
  }

  function onModalKey(e) { if (e.key === 'Escape') hideModal(); }
  function onModalBackdrop(e) { if (e.target === modal) hideModal(); }

  if (modalClose) modalClose.addEventListener('click', hideModal);
  modal && modal.querySelectorAll('.modal-close-secondary').forEach(btn => btn.addEventListener('click', hideModal));

})();

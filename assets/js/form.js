/* ============================================================
   SUNRISE PLUMBING: FORM JS
   Validation, accessible errors, demo thank-you modal

   DEMO MODE: nothing is sent anywhere. To make the form live,
   replace the setTimeout in the submit handler with a fetch() to
   your form service (Formspree, Web3Forms, Netlify Forms, or your
   own endpoint) and show the modal when it succeeds.
   ============================================================ */

(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  var modal = document.getElementById('thank-you-modal');
  if (!form) return;

  var status = document.getElementById('form-status');
  var params = new URLSearchParams(window.location.search);

  /* Pre-fill from links like contact.html?service=drain-cleaning&area=round-rock */
  var service = params.get('service');
  var serviceField = form.querySelector('#service');
  if (service && serviceField && serviceField.querySelector('option[value="' + CSS.escape(service) + '"]')) {
    serviceField.value = service;
  }
  var area = params.get('area');
  var addressField = form.querySelector('#address');
  if (area && addressField && !addressField.value) {
    addressField.value = area.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + ', TX';
  }

  /* Validation rules. Return an error message, or '' when the value is fine. */
  var rules = {
    name:  function (v) { return v.trim().length >= 2 ? '' : 'Enter your name.'; },
    phone: function (v) {
      var digits = v.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 11 ? '' : 'Enter a 10-digit phone number, like 512-555-0100.';
    },
    email: function (v) {
      return !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Check the email address. It should look like name@example.com.';
    }
  };

  var errorEl = function (input) { return document.getElementById(input.id + '-error'); };

  var validateField = function (input) {
    var rule = rules[input.name];
    if (!rule) return true;
    var msg = rule(input.value);
    var err = errorEl(input);
    if (err) err.textContent = msg;
    if (msg) { input.setAttribute('aria-invalid', 'true'); }
    else { input.removeAttribute('aria-invalid'); }
    return !msg;
  };

  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    if (!input) return;
    input.addEventListener('blur', function () { if (input.value) validateField(input); });
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var invalid = [];
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (input && !validateField(input)) invalid.push(input);
    });

    if (invalid.length) {
      status.textContent = invalid.length === 1
        ? 'One field needs attention before we can send this.'
        : invalid.length + ' fields need attention before we can send this.';
      invalid[0].focus();
      return;
    }
    status.textContent = '';

    /* Bots fill in every field, including the hidden one. Quietly "succeed". */
    var trap = form.elements.company;
    if (trap && trap.value) { form.reset(); return; }

    var btn = form.querySelector('[type="submit"]');
    var originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sending';

    /* Demo only: pretend to send, then show the thank-you modal */
    setTimeout(function () {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      form.reset();
      openModal(btn);
    }, 700);
  });

  /* Modal with focus trap, Escape to close, and focus returned afterwards */
  var lastFocus = null;

  function openModal(returnTo) {
    if (!modal) return;
    lastFocus = returnTo || document.activeElement;
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    var heading = modal.querySelector('h2');
    heading.setAttribute('tabindex', '-1');
    heading.focus();
    document.addEventListener('keydown', onModalKey);
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onModalKey);
    if (lastFocus) lastFocus.focus();
  }

  function onModalKey(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    var items = modal.querySelectorAll('a[href], button:not([disabled])');
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement) || document.activeElement.tagName === 'H2')) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  if (modal) {
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    modal.querySelectorAll('[data-close-modal]').forEach(function (b) { b.addEventListener('click', closeModal); });
  }
})();

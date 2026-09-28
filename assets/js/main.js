/* ============================================================
   SUNRISE PLUMBING: MAIN JS
   Header, mobile menu, call button, exit banner, hero video,
   reviews row, scroll reveal, map
   Everything on the page works without this file. It only adds
   polish on top.
   ============================================================ */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, iframe, [tabindex]:not([tabindex="-1"])';

  /* 1. Header shadow once the page scrolls */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 20); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* 2. Mobile menu with a real focus trap */
  var hamburger = document.querySelector('.nav__hamburger');
  var mobileMenu = document.getElementById('mobile-menu');
  var body = document.body;

  if (hamburger && mobileMenu) {
    var isOpen = function () { return body.classList.contains('nav-open'); };

    var openNav = function () {
      body.classList.add('nav-open');
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.setAttribute('aria-label', 'Close menu');
      var first = mobileMenu.querySelector(FOCUSABLE);
      if (first) first.focus();
    };
    var closeNav = function (returnFocus) {
      if (!isOpen()) return;
      body.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open menu');
      if (returnFocus) hamburger.focus();
    };

    hamburger.addEventListener('click', function () {
      if (isOpen()) { closeNav(true); } else { openNav(); }
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { closeNav(true); return; }
      if (e.key !== 'Tab') return;
      // Keep Tab inside the hamburger + menu while the menu is open
      var items = [hamburger].concat(Array.prototype.slice.call(mobileMenu.querySelectorAll(FOCUSABLE)));
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    document.addEventListener('click', function (e) {
      if (isOpen() && !mobileMenu.contains(e.target) && !hamburger.contains(e.target)) closeNav(false);
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { closeNav(false); });
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
      if (mq.matches) closeNav(false);
    });
  }

  /* 3. Hide the floating call button when the footer is on screen */
  var fab = document.querySelector('.fab');
  var footer = document.querySelector('.site-footer');
  if (fab && footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      fab.classList.toggle('hidden', entries[0].isIntersecting);
    }, { threshold: 0.05 }).observe(footer);
  }

  /* 4. Exit banner: desktop only, once per visit, stays until dismissed */
  var exitBanner = document.querySelector('.exit-banner');
  if (exitBanner) {
    var desktop = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches;
    var seen = false;
    try { seen = sessionStorage.getItem('sp-exit-shown') === '1'; } catch (err) { /* storage blocked */ }

    if (desktop && !seen) {
      var showBanner = function (e) {
        if (e.clientY > 0) return; // only when the pointer leaves through the top
        document.removeEventListener('mouseout', showBanner);
        exitBanner.classList.add('visible');
        try { sessionStorage.setItem('sp-exit-shown', '1'); } catch (err) { /* ignore */ }
      };
      document.addEventListener('mouseout', showBanner);
    }
    var dismiss = exitBanner.querySelector('.exit-banner__dismiss');
    if (dismiss) {
      dismiss.addEventListener('click', function () {
        var hadFocus = exitBanner.contains(document.activeElement);
        exitBanner.classList.remove('visible');
        if (hadFocus) document.getElementById('main-content').focus();
      });
    }
  }

  /* 5. Print buttons (emergency guide) */
  document.querySelectorAll('[data-print]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });

  /* 6. Hero video: crossfade between clips, pause button, respects reduced motion.
     Phones get the still image only, which saves their data plan. */
  var heroVideos = window.matchMedia('(min-width: 768px)').matches ? document.querySelectorAll('.hero__video') : [];
  var motionToggle = document.getElementById('heroMotionToggle');
  if (heroVideos.length) {
    var active = 0;
    var playing = !reducedMotion;
    var timer = null;

    var setToggle = function () {
      if (!motionToggle) return;
      motionToggle.querySelector('.label').textContent = playing ? 'Pause video' : 'Play video';
      var icon = motionToggle.querySelector('i');
      icon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    };
    var cycle = function () {
      var next = (active + 1) % heroVideos.length;
      var v = heroVideos[next];
      if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); }
      v.currentTime = 0;
      v.play().catch(function () {});
      v.classList.add('is-active');
      heroVideos[active].classList.remove('is-active');
      heroVideos[active].pause();
      active = next;
    };
    var start = function () {
      heroVideos[active].play().catch(function () {});
      if (heroVideos.length > 1) timer = setInterval(cycle, 7000);
      playing = true;
      setToggle();
    };
    var stop = function () {
      clearInterval(timer);
      heroVideos.forEach(function (v) { v.pause(); });
      playing = false;
      setToggle();
    };

    if (reducedMotion) { stop(); } else { start(); }
    if (motionToggle) {
      motionToggle.hidden = false;
      motionToggle.addEventListener('click', function () { if (playing) { stop(); } else { start(); } });
    }

    // Save battery: pause when the hero scrolls out of view
    if ('IntersectionObserver' in window) {
      var hero = document.querySelector('.hero');
      new IntersectionObserver(function (entries) {
        if (!playing) return;
        if (entries[0].isIntersecting) { heroVideos[active].play().catch(function () {}); }
        else { heroVideos[active].pause(); }
      }).observe(hero);
    }
  }

  /* 7. Reviews row: previous / next buttons for the scroll-snap track */
  document.querySelectorAll('[data-reviews]').forEach(function (wrap) {
    var track = wrap.querySelector('.reviews__track');
    var prev = wrap.querySelector('[data-dir="prev"]');
    var next = wrap.querySelector('[data-dir="next"]');
    if (!track || !prev || !next) return;
    var update = function () {
      var max = track.scrollWidth - track.clientWidth - 8;
      prev.disabled = track.scrollLeft <= 8;
      next.disabled = track.scrollLeft >= max;
    };
    var step = function (dir) {
      track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: reducedMotion ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  });

  /* 8. Fade sections in as they scroll into view */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window && !reducedMotion) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* 9. Map: load Google Maps only when the visitor asks for it */
  document.querySelectorAll('[data-map-src]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var facade = btn.closest('.map-facade');
      var iframe = document.createElement('iframe');
      iframe.src = btn.getAttribute('data-map-src');
      iframe.title = btn.getAttribute('data-map-title') || 'Map';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.setAttribute('allowfullscreen', '');
      facade.replaceChildren(iframe);
      iframe.focus();
    });
  });

})();

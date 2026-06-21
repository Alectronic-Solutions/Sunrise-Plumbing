/* ============================================================
   SUNRISE PLUMBING: MAIN JS
   Nav, FAB, exit intent, smooth scroll, AOS, counters
   ============================================================ */

(function () {
  'use strict';

  /* ── 1. Sticky header scroll class ── */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── 2. Mobile nav toggle ── */
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileMenu = document.querySelector('.nav__mobile-menu');
  const body = document.body;

  if (hamburger && mobileMenu) {
    const openNav = () => {
      body.classList.add('nav-open');
      hamburger.setAttribute('aria-expanded', 'true');
      // Trap focus
      const focusable = mobileMenu.querySelectorAll('a, button');
      if (focusable.length) focusable[0].focus();
    };
    const closeNav = () => {
      body.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded', 'false');
    };
    hamburger.addEventListener('click', () => {
      body.classList.contains('nav-open') ? closeNav() : openNav();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });
    document.addEventListener('click', (e) => {
      if (body.classList.contains('nav-open') &&
          !mobileMenu.contains(e.target) &&
          !hamburger.contains(e.target)) {
        closeNav();
      }
    });
    // Close nav on link click
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
  }

  /* ── 3. Active nav link ── */
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a, .nav__mobile-menu a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const hrefFile = href.split('/').pop().split('?')[0] || 'index.html';
    if (hrefFile === path || (path === '' && hrefFile === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* ── 4. FAB show/hide near footer ── */
  const fab = document.querySelector('.fab');
  const footer = document.querySelector('.site-footer');
  if (fab && footer) {
    const observer = new IntersectionObserver(
      ([entry]) => fab.classList.toggle('hidden', entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(footer);
  }

  /* ── 5. Exit intent banner ── */
  const exitBanner = document.querySelector('.exit-banner');
  const exitDismiss = document.querySelector('.exit-banner__dismiss');
  if (exitBanner) {
    const key = 'sp-exit-shown';
    let shown = sessionStorage.getItem(key);
    let mobileTimer = null;

    const showBanner = () => {
      if (shown) return;
      shown = true;
      sessionStorage.setItem(key, '1');
      exitBanner.classList.add('visible');
      if (mobileTimer) clearTimeout(mobileTimer);
    };
    const hideBanner = () => exitBanner.classList.remove('visible');

    if (!shown) {
      // Desktop: trigger on mouse leave
      document.addEventListener('mouseleave', showBanner, { once: true });
      // Mobile: 45 second timer
      mobileTimer = setTimeout(showBanner, 45000);
    }
    if (exitDismiss) exitDismiss.addEventListener('click', hideBanner);
    // Auto-dismiss after 10s
    exitBanner.addEventListener('transitionend', () => {
      if (exitBanner.classList.contains('visible')) {
        setTimeout(hideBanner, 10000);
      }
    });
  }

  /* ── 6. Smooth scroll with offset ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--content-top')) || 120;
      const top = target.getBoundingClientRect().top + window.scrollY - offset - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ── 7. AOS init ── */
  if (typeof AOS !== 'undefined') {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
      disable: prefersReduced,
    });
  }

  /* ── 8. Animated counters ── */
  const counters = document.querySelectorAll('.counter-value');
  if (counters.length) {
    const animate = (el) => {
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1600;
      const step = 16;
      const steps = Math.round(duration / step);
      let count = 0;
      const inc = target / steps;
      const timer = setInterval(() => {
        count = Math.min(count + inc, target);
        el.textContent = Math.round(count).toLocaleString() + suffix;
        if (count >= target) clearInterval(timer);
      }, step);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animate(e.target);
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
  }

  /* ── 9. Map facade ── */
  window.loadMap = function (embedUrl) {
    const facade = document.getElementById('map-facade');
    if (!facade) return;
    facade.innerHTML =
      '<iframe src="' + embedUrl + '" width="100%" height="400" style="border:0;display:block;" ' +
      'allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" ' +
      'title="Sunrise Plumbing Austin TX service area map"></iframe>';
  };

  /* ── 10. Strip height CSS var sync ── */
  const syncStripHeight = () => {
    const strip = document.querySelector('.emergency-strip');
    if (strip) {
      const h = strip.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--strip-height', Math.ceil(h) + 'px');
    }
  };
  syncStripHeight();
  window.addEventListener('resize', syncStripHeight, { passive: true });
  // Also sync after fonts load (avoids flash of wrong offset)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncStripHeight);
  }

  /* ── 11. Hero parallax ── */
  const heroBg = document.querySelector('.hero__bg');
  if (heroBg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const onParallax = () => {
      const scrollY = window.scrollY;
      const heroBottom = heroBg.closest('.hero').getBoundingClientRect().bottom + scrollY;
      if (scrollY < heroBottom) {
        heroBg.style.transform = 'translateY(' + (scrollY * 0.35) + 'px)';
      }
    };
    window.addEventListener('scroll', onParallax, { passive: true });
    onParallax();
  }

  /* ── 12. Mobile reveal fallback (for AOS-disabled mobile) ── */

  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => revealObs.observe(el));
  }

})();

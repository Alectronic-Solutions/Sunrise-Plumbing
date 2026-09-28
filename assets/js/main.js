/* ============================================================
   SUNRISE PLUMBING: MAIN JS
   Header, mobile menu, call button, exit banner, hero video,
   scroll reveal, cursor water, parallax
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
      icon.className = playing ? 'ico ico-pause' : 'ico ico-play';
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

  /* 7. Fade sections in as they scroll into view */
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

  /* 8. Water: drips fall from the cursor and clicks splash.
     Mouse and trackpad only, never with reduced motion. The canvas
     ignores the pointer, and the loop sleeps when nothing is moving. */
  if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var fx = document.createElement('canvas');
    var ctx = fx.getContext('2d');
    fx.className = 'water-fx';
    fx.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fx);

    var GRAVITY = 900;   // px per second squared
    var MAX_DROPS = 40;
    var drops = [];
    var rings = [];
    var raf = 0, lastT = 0, travel = 0, lastX = null, lastY = null, fxW = 0, fxH = 0;
    var rand = function (a, b) { return a + Math.random() * (b - a); };

    var sizeFx = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      fxW = window.innerWidth; fxH = window.innerHeight;
      fx.width = fxW * dpr; fx.height = fxH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    var addDrop = function (x, y, vx, vy, r, fall) {
      if (drops.length >= MAX_DROPS) drops.shift();
      drops.push({ x: x, y: y, vx: vx, vy: vy, r: r, floor: y + fall, fall: fall });
    };
    var addRing = function (x, y, max, delay) {
      rings.push({ x: x, y: y, max: max, t: -delay, life: 0.55 });
    };

    // Teardrop: round bottom, pointed top, stretched a little by its speed
    var drawDrop = function (d, alpha) {
      var r = d.r, tip = r * (1.9 + Math.min(Math.abs(d.vy) / 500, 1.2));
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(Math.atan2(d.vx, Math.abs(d.vy) + 60) * -0.8);
      ctx.beginPath();
      ctx.moveTo(0, -tip);
      ctx.bezierCurveTo(r * 0.55, -tip * 0.55, r, -r * 0.2, r, 0);
      ctx.arc(0, 0, r, 0, Math.PI);
      ctx.bezierCurveTo(-r, -r * 0.2, -r * 0.55, -tip * 0.55, 0, -tip);
      ctx.fillStyle = 'rgba(56,189,248,' + (0.75 * alpha) + ')';
      ctx.strokeStyle = 'rgba(2,132,199,' + (0.7 * alpha) + ')';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.15, r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201,240,255,' + (0.95 * alpha) + ')';
      ctx.fill();
      ctx.restore();
    };

    var tick = function (t) {
      var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0.016;
      lastT = t;
      ctx.clearRect(0, 0, fxW, fxH);

      for (var i = drops.length - 1; i >= 0; i--) {
        var d = drops[i];
        d.vy += GRAVITY * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.vy > 0 && d.y >= d.floor) {
          addRing(d.x, d.floor, d.r * 3.2, 0);
          drops.splice(i, 1);
          continue;
        }
        // Fade over the last part of the fall
        var left = (d.floor - d.y) / d.fall;
        drawDrop(d, Math.max(0, Math.min(1, left * 2.5)));
      }

      for (var j = rings.length - 1; j >= 0; j--) {
        var g = rings[j];
        g.t += dt;
        if (g.t < 0) continue;
        var p = g.t / g.life;
        if (p >= 1) { rings.splice(j, 1); continue; }
        var ease = 1 - Math.pow(1 - p, 3);
        ctx.beginPath();
        ctx.ellipse(g.x, g.y, g.max * ease + 1, (g.max * ease + 1) * 0.32, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(2,132,199,' + (0.55 * (1 - p)) + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (drops.length || rings.length) { raf = requestAnimationFrame(tick); }
      else { raf = 0; lastT = 0; }
    };
    var wake = function () { if (!raf) raf = requestAnimationFrame(tick); };

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      if (lastX !== null) travel += Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX; lastY = e.clientY;
      if (travel < 42) return;
      travel = 0;
      addDrop(e.clientX + rand(-2, 2), e.clientY + 6, rand(-12, 12), rand(10, 50), rand(2.4, 3.6), rand(60, 140));
      wake();
    }, { passive: true });

    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      if (e.button !== 0) return;
      var n = Math.round(rand(8, 12));
      for (var k = 0; k < n; k++) {
        var a = rand(0.15, 0.85) * Math.PI;   // upward arc
        var speed = rand(140, 300);
        addDrop(e.clientX, e.clientY, Math.cos(a) * speed, -Math.sin(a) * speed, rand(1.6, 2.8), rand(18, 44));
      }
      addRing(e.clientX, e.clientY, 26, 0);
      addRing(e.clientX, e.clientY, 42, 0.12);
      wake();
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) return;
      drops.length = 0; rings.length = 0;
      if (raf) cancelAnimationFrame(raf);
      raf = 0; lastT = 0;
      ctx.clearRect(0, 0, fxW, fxH);
    });
    document.documentElement.addEventListener('mouseleave', function () { lastX = null; travel = 0; });

    window.addEventListener('resize', sizeFx, { passive: true });
    sizeFx();
  }

  /* 9. Parallax: [data-parallax] images drift up and down with the scroll.
     Two-column desktop layout only, never with reduced motion. */
  var parallaxEls = document.querySelectorAll('[data-parallax]');
  var parallaxMq = window.matchMedia('(min-width: 900px)');
  if (parallaxEls.length && !reducedMotion) {
    var RANGE = 60;   // max px offset either way
    var pxTicking = false;

    var updateParallax = function () {
      pxTicking = false;
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        if (!parallaxMq.matches) { el.style.transform = ''; return; }
        // Measure the untransformed box so the offset doesn't feed back into itself
        var shift = parseFloat(el.dataset.shift) || 0;
        var rect = el.getBoundingClientRect();
        var center = rect.top - shift + rect.height / 2;
        var p = (center - vh / 2) / (vh / 2 + rect.height / 2);   // 1 below the fold, -1 above it
        p = Math.max(-1, Math.min(1, p));
        var y = Math.round(p * RANGE * 10) / 10;
        el.dataset.shift = y;
        el.style.transform = 'translate3d(0,' + y + 'px,0)';
      });
    };
    var queueParallax = function () {
      if (!pxTicking) { pxTicking = true; requestAnimationFrame(updateParallax); }
    };

    window.addEventListener('scroll', queueParallax, { passive: true });
    window.addEventListener('resize', queueParallax, { passive: true });
    parallaxMq.addEventListener('change', queueParallax);
    updateParallax();
  }

})();

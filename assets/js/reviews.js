/* ============================================================
   SUNRISE PLUMBING: REVIEWS JS
   Swiper testimonial carousel init
   ============================================================ */

(function () {
  'use strict';
  if (typeof Swiper === 'undefined') return;
  if (!document.querySelector('.testimonials-swiper')) return;

  new Swiper('.testimonials-swiper', {
    slidesPerView: 1,
    spaceBetween: 24,
    loop: true,
    grabCursor: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    breakpoints: {
      640:  { slidesPerView: 2 },
      1024: { slidesPerView: 3 },
    },
    a11y: {
      prevSlideMessage: 'Previous testimonial',
      nextSlideMessage: 'Next testimonial',
      paginationBulletMessage: 'Go to testimonial {{index}}',
    },
  });
})();

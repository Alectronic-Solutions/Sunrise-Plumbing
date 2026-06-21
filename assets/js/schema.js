/* ============================================================
   SUNRISE PLUMBING: SCHEMA JS
   Injects JSON-LD structured data per page
   ============================================================ */

(function () {
  'use strict';

  const BASE_URL = 'https://sunriseplumbing.com';
  const PHONE    = '+15125550100';
  const ADDRESS  = { street: '123 Main Street', city: 'Austin', state: 'TX', zip: '78701' };

  /* LocalBusiness (injected on EVERY page) */
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Plumber'],
    '@id': BASE_URL + '/#business',
    name: 'Sunrise Plumbing',
    alternateName: 'Sunrise Plumbing Austin TX',
    description: 'Emergency and residential plumbing services in Austin, TX. Licensed, insured, available 24/7. Fast response, quality work, competitive pricing.',
    url: BASE_URL,
    telephone: PHONE,
    priceRange: '$$',
    image: BASE_URL + '/assets/images/og/og-default.jpg',
    logo: BASE_URL + '/assets/images/logo.svg',
    address: {
      '@type': 'PostalAddress',
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.city,
      addressRegion: ADDRESS.state,
      postalCode: ADDRESS.zip,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 30.2672,
      longitude: -97.7431,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    areaServed: [
      { '@type': 'City', name: 'Austin', containedInPlace: { '@type': 'State', name: 'Texas' } },
      { '@type': 'City', name: 'Round Rock' },
      { '@type': 'City', name: 'Cedar Park' },
      { '@type': 'City', name: 'Pflugerville' },
      { '@type': 'City', name: 'Georgetown' },
      { '@type': 'City', name: 'Kyle' },
      { '@type': 'City', name: 'Buda' },
      { '@type': 'City', name: 'Leander' },
      { '@type': 'City', name: 'Lakeway' },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '247',
      bestRating: '5',
      worstRating: '1',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Plumbing Services Austin TX',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Emergency Plumbing Austin TX' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Water Heater Repair Austin TX' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Drain Cleaning Austin TX' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Pipe Repair Austin TX' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Leak Detection Austin TX' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Bathroom Plumbing Austin TX' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Kitchen Plumbing Austin TX' } },
      ],
    },
    sameAs: [
      'https://www.google.com/maps/place/YOUR_GMB_ID',
      'https://www.facebook.com/sunriseplumbingaustin',
      'https://www.yelp.com/biz/sunrise-plumbing-austin',
    ],
  };

  /* Services ItemList */
  const servicesSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Plumbing Services in Austin TX',
    itemListElement: [
      { '@type': 'ListItem', position: 1, item: { '@type': 'Service', name: 'Emergency Plumbing Austin TX', provider: { '@id': BASE_URL + '/#business' }, areaServed: 'Austin, TX', url: BASE_URL + '/services.html#emergency-plumbing' } },
      { '@type': 'ListItem', position: 2, item: { '@type': 'Service', name: 'Water Heater Repair Austin TX', provider: { '@id': BASE_URL + '/#business' }, areaServed: 'Austin, TX', url: BASE_URL + '/services.html#water-heater-repair' } },
      { '@type': 'ListItem', position: 3, item: { '@type': 'Service', name: 'Drain Cleaning Austin TX', provider: { '@id': BASE_URL + '/#business' }, areaServed: 'Austin, TX', url: BASE_URL + '/services.html#drain-cleaning' } },
      { '@type': 'ListItem', position: 4, item: { '@type': 'Service', name: 'Pipe Repair Austin TX', provider: { '@id': BASE_URL + '/#business' }, areaServed: 'Austin, TX', url: BASE_URL + '/services.html#pipe-repair' } },
      { '@type': 'ListItem', position: 5, item: { '@type': 'Service', name: 'Leak Detection Austin TX', provider: { '@id': BASE_URL + '/#business' }, areaServed: 'Austin, TX', url: BASE_URL + '/services.html#leak-detection' } },
      { '@type': 'ListItem', position: 6, item: { '@type': 'Service', name: 'Bathroom Plumbing Austin TX', provider: { '@id': BASE_URL + '/#business' }, areaServed: 'Austin, TX', url: BASE_URL + '/services.html#bathroom-plumbing' } },
      { '@type': 'ListItem', position: 7, item: { '@type': 'Service', name: 'Kitchen Plumbing Austin TX', provider: { '@id': BASE_URL + '/#business' }, areaServed: 'Austin, TX', url: BASE_URL + '/services.html#kitchen-plumbing' } },
    ],
  };

  /* FAQ schema (all 16 questions) */
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How quickly can you respond to a plumbing emergency in Austin?', acceptedAnswer: { '@type': 'Answer', text: 'Sunrise Plumbing typically responds to emergency plumbing calls in Austin within 45 minutes. We operate 24/7, including weekends and holidays, and cover all Austin neighborhoods plus Round Rock, Cedar Park, Pflugerville, and surrounding areas.' } },
      { '@type': 'Question', name: 'Do you offer 24/7 plumbing service in Austin, TX?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sunrise Plumbing offers 24/7 emergency plumbing service in Austin, TX. Our licensed plumbers are available day and night, including all holidays, with no extra charge for after-hours emergency calls.' } },
      { '@type': 'Question', name: 'Do you charge extra for after-hours or weekend emergency service?', acceptedAnswer: { '@type': 'Answer', text: 'No. Sunrise Plumbing does not charge overtime or after-hours surcharges. The price you get is the price you pay, whether we show up at 2 PM or 2 AM. We believe affordable plumbing in Austin means no hidden fees.' } },
      { '@type': 'Question', name: 'How much does a plumber cost in Austin, TX?', acceptedAnswer: { '@type': 'Answer', text: 'Plumbing costs in Austin vary by service. Minor repairs typically start around $150–$300. Water heater replacement averages $800–$1,500 installed. Drain cleaning starts at $125. Sunrise Plumbing provides free estimates and transparent pricing with no surprise charges.' } },
      { '@type': 'Question', name: 'Are you a licensed plumber in Texas?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sunrise Plumbing is fully licensed by the Texas State Board of Plumbing Examiners (TSBPE) and carries full liability insurance and workers\' compensation. Our license number is available upon request.' } },
      { '@type': 'Question', name: 'Are you insured?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sunrise Plumbing carries full general liability insurance and workers\' compensation coverage on all employees. You are fully protected on every job we perform.' } },
      { '@type': 'Question', name: 'What areas of Austin do you service?', acceptedAnswer: { '@type': 'Answer', text: 'We service all of Austin, TX and surrounding communities including Downtown Austin, South Austin, North Austin, East Austin, West Austin, Round Rock, Cedar Park, Pflugerville, Georgetown, Kyle, Buda, Leander, Manor, and Lakeway.' } },
      { '@type': 'Question', name: 'Do you repair all water heater brands?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Our Austin plumbers are trained to repair and replace all major water heater brands including Rheem, AO Smith, Bradford White, Navien, Rinnai, and more. We service both tank and tankless water heaters.' } },
      { '@type': 'Question', name: 'How do I know if I need a new water heater or just a repair?', acceptedAnswer: { '@type': 'Answer', text: 'If your water heater is under 8 years old and has a single issue (element, thermostat, or valve), repair is usually the better choice. Water heaters over 10–12 years old or with tank corrosion typically need replacement. Our Austin plumbers will inspect and give you an honest recommendation.' } },
      { '@type': 'Question', name: 'What causes drains to clog, and how do you fix them?', acceptedAnswer: { '@type': 'Answer', text: 'Common causes of drain clogs in Austin homes include grease buildup, hair, soap scum, tree root intrusion in older pipes, and mineral deposits from hard water. We use professional hydro-jetting and drain snake equipment to clear clogs completely, not just punch through them.' } },
      { '@type': 'Question', name: 'Can you detect water leaks without tearing up my walls?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sunrise Plumbing uses non-invasive leak detection technology including acoustic listening devices and thermal imaging cameras to locate leaks behind walls and under slabs without unnecessary demolition.' } },
      { '@type': 'Question', name: 'What plumbing services do you offer for kitchens?', acceptedAnswer: { '@type': 'Answer', text: 'Our Austin kitchen plumbing services include garbage disposal installation and repair, faucet replacement, sink installation, dishwasher hookup, under-sink plumbing, refrigerator water line installation, and drain cleaning.' } },
      { '@type': 'Question', name: 'What plumbing services do you offer for bathrooms?', acceptedAnswer: { '@type': 'Answer', text: 'Our Austin bathroom plumbing services include toilet repair and replacement, showerhead and faucet replacement, bathtub drain repair, bathroom remodel plumbing rough-in, shower valve replacement, and leak repair.' } },
      { '@type': 'Question', name: 'What should I do while waiting for an emergency plumber?', acceptedAnswer: { '@type': 'Answer', text: 'If you have a burst pipe or major leak, turn off the main water shutoff valve immediately. For a water heater leak, turn off the cold water supply to the unit. Avoid electrical hazards near standing water, and call Sunrise Plumbing at (512) 555-0100 for immediate guidance.' } },
      { '@type': 'Question', name: 'Do I need to be home for the service visit?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, an adult (18+) should be present during the service visit. We will call or text you 30 minutes before arrival so you can plan accordingly.' } },
      { '@type': 'Question', name: 'Do you offer free estimates?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sunrise Plumbing provides free estimates for all plumbing services in Austin, TX. We diagnose the problem, explain your options, and give you a flat price before any work begins.' } },
    ],
  };

  /* Inject helper */
  function inject(obj) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }

  /* Detect page and inject appropriate schemas */
  const page = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0];

  inject(localBusiness);

  if (page === 'services.html') {
    inject(servicesSchema);
  }
  if (page === 'faq.html') {
    inject(faqSchema);
  }

})();

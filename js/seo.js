// Canonical site origin (matches CNAME).
const SITE_ORIGIN = 'https://www.pilotcar4hire.com';

const SEO_KEYWORDS = [
  'pilot cars',
  'pilot car directory',
  'us pilot cars',
  'uspilotcars',
  'pilot car escort',
  'oversize load escort',
  'pilot car 4 hire',
].join(', ');

function absoluteUrl(path) {
  if (!path) return `${SITE_ORIGIN}/`;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path.replace(/^\.\//, '')}`;
  return `${SITE_ORIGIN}${normalized}`;
}

function setMetaTag(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLinkRel(rel, href) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function setPageSeo({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage,
  keywords = SEO_KEYWORDS,
}) {
  if (title) document.title = title;
  if (description) {
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:description', description);
    setMetaTag('name', 'twitter:description', description);
  }
  if (title) {
    setMetaTag('property', 'og:title', title);
    setMetaTag('name', 'twitter:title', title);
  }
  if (canonical) {
    setLinkRel('canonical', canonical);
    setMetaTag('property', 'og:url', canonical);
  }
  setMetaTag('property', 'og:type', ogType);
  setMetaTag('property', 'og:site_name', 'Pilot Car 4 Hire');
  setMetaTag('property', 'og:locale', 'en_US');
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  const image = ogImage || absoluteUrl('/images/icon-512.png');
  setMetaTag('property', 'og:image', image);
  setMetaTag('name', 'twitter:image', image);
  if (keywords) setMetaTag('name', 'keywords', keywords);
}

function injectJsonLd(id, data) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Pilot Car 4 Hire',
    alternateName: ['US Pilot Cars', 'Pilot Car Directory', 'USPilotCars', 'PC4H'],
    url: SITE_ORIGIN,
    logo: absoluteUrl('/images/logo.svg'),
    description: 'Free nationwide pilot car directory to find certified escorts for oversize and heavy haul loads.',
  };
}

function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Pilot Car 4 Hire — US Pilot Car Directory',
    alternateName: ['US Pilot Cars', 'Pilot Car Directory', 'USPilotCars'],
    url: SITE_ORIGIN,
    description: 'Find pilot cars and escorts across the United States. Browse our free pilot car directory by state.',
    publisher: organizationSchema(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_ORIGIN}/pilot-cars.html`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function statePageSchema(stateCode, stateName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Pilot Cars in ${stateName}`,
    description: `Find certified pilot car escorts based in ${stateName}. Browse lead, chase, hi-pole, route survey, and flagger services.`,
    url: absoluteUrl(`/state.html?state=${stateCode}`),
    isPartOf: {
      '@type': 'WebSite',
      name: 'Pilot Car 4 Hire',
      url: SITE_ORIGIN,
    },
    about: {
      '@type': 'Place',
      name: stateName,
      address: {
        '@type': 'PostalAddress',
        addressRegion: stateCode,
        addressCountry: 'US',
      },
    },
  };
}

function applyStatePageSeo(stateCode) {
  const stateName = getStateName(stateCode);
  const title = `Pilot Cars in ${stateName} | US Pilot Car Directory`;
  const description = `Find certified pilot cars in ${stateName}. Browse our free pilot car directory for lead, chase, hi-pole, route survey, and flagger escorts — contact drivers directly.`;
  const canonical = absoluteUrl(`/state.html?state=${stateCode}`);

  setPageSeo({ title, description, canonical });

  injectJsonLd('seo-breadcrumb', breadcrumbSchema([
    { name: 'Home', url: absoluteUrl('/') },
    { name: 'Pilot Car Directory', url: absoluteUrl('/pilot-cars.html') },
    { name: stateName, url: canonical },
  ]));

  injectJsonLd('seo-state-page', statePageSchema(stateCode, stateName));
}
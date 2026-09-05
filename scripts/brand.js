const BRAND_CONFIG = {
  luxury: { label: 'Luxury', slug: 'luxury' },
  retail: { label: 'Retail', slug: 'retail' },
  digital: { label: 'Digital', slug: 'digital' },
  travel: { label: 'Travel', slug: 'travel' },
  wellness: { label: 'Wellness', slug: 'wellness' },
  finance: { label: 'Finance', slug: 'finance' },
};

const BRAND_KEYS = Object.keys(BRAND_CONFIG);

function resolveBrandFromUrl() {
  const { pathname } = window.location;
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) return null;

  const possible = segments[0].toLowerCase();
  return BRAND_KEYS.includes(possible) ? possible : null;
}

function resolveBrandFromMeta() {
  const metaBrand = document.querySelector('meta[name="brand"]')?.content;
  if (!metaBrand) return null;

  const key = metaBrand.trim().toLowerCase();
  return BRAND_KEYS.includes(key) ? key : null;
}

function resolveBrandFromQuery() {
  const queryBrand = new URLSearchParams(window.location.search).get('brand');
  if (!queryBrand) return null;

  const key = queryBrand.trim().toLowerCase();
  return BRAND_KEYS.includes(key) ? key : null;
}

export function getBrandKey() {
  return resolveBrandFromMeta()
    || resolveBrandFromQuery()
    || resolveBrandFromUrl()
    || 'luxury';
}

export function getBrandConfig() {
  const key = getBrandKey();
  return BRAND_CONFIG[key] || BRAND_CONFIG.luxury;
}

export async function loadBrandTheme() {
  const brand = getBrandConfig();

  // Apply dataset attributes to trigger CSS rules
  document.documentElement.dataset.brand = brand.slug;
  document.documentElement.dataset.brandLabel = brand.label;
  document.body.dataset.brand = brand.slug;
  document.body.dataset.brandLabel = brand.label;

  // Single CSS File Reference
  const cssHref = `${window.hlx.codeBasePath}/styles/brand.css`;

  if (!document.querySelector(`head > link[href="${cssHref}"]`)) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = cssHref;

    // Non-blocking CSS loading pattern
    stylesheet.media = 'print';
    document.head.appendChild(stylesheet);

    stylesheet.addEventListener('load', () => {
      stylesheet.media = 'all';
    }, { once: true });

    stylesheet.addEventListener('error', () => {
      stylesheet.media = 'all';
    }, { once: true });
  }
}



// Adaptador genérico (Jumpseller, Bsale, sitios propios…): recorre el sitemap y lee los
// datos estructurados (JSON-LD schema.org/Product) de cada página de producto.
// Es más lento, así que es incremental: sólo vuelve a leer páginas que cambiaron.

const DEFAULT_PRODUCT_RE = /\/(product|products|producto|productos|p|item|tienda)\/[^/?#]+/i;

export async function detect(store, get) {
  try {
    const urls = await sitemapUrls(store, get, 1);
    return urls.length > 0;
  } catch {
    return false;
  }
}

async function sitemapUrls(store, get, limitSitemaps = 50) {
  const starts = store.sitemaps?.length ? store.sitemaps.map((s) => new URL(s, store.url).href) : [`${store.url}/sitemap.xml`, `${store.url}/sitemap_index.xml`];
  const productRe = store.productUrlPattern ? new RegExp(store.productUrlPattern, 'i') : DEFAULT_PRODUCT_RE;
  const out = new Map();
  const queue = [...starts];
  const visited = new Set();
  while (queue.length && visited.size < limitSitemaps) {
    const sm = queue.shift();
    if (visited.has(sm)) continue;
    visited.add(sm);
    let r;
    try {
      r = await get(sm, { allow404: true });
    } catch {
      continue;
    }
    if (!r) continue;
    const xml = r.body;
    if (/<sitemapindex/i.test(xml)) {
      for (const m of xml.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
        const loc = unxml(m[1]);
        if (!/post|page|blog|categor|tag|author|news|noticia/i.test(loc) || /product/i.test(loc)) queue.push(loc);
      }
      continue;
    }
    for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
      const loc = unxml((m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/i) || [])[1] || '');
      const lastmod = (m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i) || [])[1] || '';
      if (!loc || !productRe.test(loc)) continue;
      if (store.urlFilter && !new RegExp(store.urlFilter, 'i').test(loc)) continue;
      out.set(loc, lastmod);
    }
  }
  return [...out.entries()].map(([url, lastmod]) => ({ url, lastmod }));
}

const unxml = (s) => s.replace(/&amp;/g, '&').replace(/<!\[CDATA\[|\]\]>/g, '');

function findProducts(node, acc = [], crumbs = []) {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node)) {
    node.forEach((n) => findProducts(n, acc, crumbs));
    return acc;
  }
  const t = [].concat(node['@type'] || []).map(String);
  if (t.includes('BreadcrumbList')) {
    for (const it of node.itemListElement || []) crumbs.push(it.name || it.item?.name || '');
  }
  if (t.includes('Product') || t.includes('ProductGroup')) acc.push(node);
  for (const k of ['@graph', 'mainEntity', 'hasVariant']) if (node[k]) findProducts(node[k], acc, crumbs);
  return acc;
}

export function parseProductPage(html, pageUrl) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const crumbs = [];
  const products = [];
  for (const b of blocks) {
    try {
      findProducts(JSON.parse(b[1].trim()), products, crumbs);
    } catch {
      /* JSON-LD inválido: se ignora */
    }
  }
  const ogImage = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1] || '';
  const out = [];
  for (const p of products) {
    const offers = [].concat(p.offers || []).flatMap((o) => (o['@type'] === 'AggregateOffer' && o.offers ? [].concat(o.offers) : [o]));
    const offer = offers.find((o) => o && (o.price != null || o.lowPrice != null));
    if (!offer) continue;
    const price = offer.price ?? offer.lowPrice;
    if (offer.priceCurrency && offer.priceCurrency !== 'CLP') continue;
    out.push({
      id: pageUrl + (p.sku ? `#${p.sku}` : ''),
      title: String(p.name || '').trim(),
      variantTitle: '',
      url: offer.url || p.url || pageUrl,
      image: [].concat(p.image || [])[0]?.url || [].concat(p.image || [])[0] || ogImage,
      price,
      compareAt: null,
      available: !offer.availability || /InStock|PreOrder|LimitedAvailability|OnlineOnly/i.test(String(offer.availability)),
      productType: p.category || '',
      vendor: typeof p.brand === 'object' ? p.brand?.name : p.brand || '',
      tags: [],
      categories: crumbs.filter(Boolean),
      languageOption: (p.additionalProperty || []).find?.((a) => /idioma|language/i.test(a.name))?.value || '',
      conditionOption: '',
      finishOption: '',
    });
  }
  return out;
}

export async function* fetchRaw(store, get, ctx = {}) {
  const urls = await sitemapUrls(store, get);
  const prev = ctx.prevByUrl || new Map();
  const maxFetch = store.maxPagesPerRun || 250;
  const staleMs = (store.refreshHours || 24) * 3600e3;
  let fetched = 0;
  // Primero las páginas que no conocemos o que cambiaron.
  urls.sort((a, b) => (prev.has(a.url) ? 1 : 0) - (prev.has(b.url) ? 1 : 0));
  for (const { url, lastmod } of urls) {
    const known = prev.get(url);
    const fresh = known && (!lastmod || known.lastmod === lastmod) && Date.now() - Date.parse(known.checkedAt || 0) < staleMs;
    if (known && (fresh || fetched >= maxFetch)) {
      for (const item of known.items) yield { ...item, _reused: true, _pageRef: url };
      continue;
    }
    if (fetched >= maxFetch) continue;
    fetched++;
    let r;
    try {
      r = await get(url, { allow404: true });
    } catch (e) {
      if (known) for (const item of known.items) yield { ...item, _reused: true, _pageRef: url };
      continue;
    }
    if (!r) continue;
    const items = parseProductPage(r.body, url);
    if (!items.length) yield { _emptyPage: url, _lastmod: lastmod };
    for (const item of items) yield { ...item, _page: url, _lastmod: lastmod };
  }
}

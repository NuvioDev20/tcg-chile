// Tiendas WooCommerce (WordPress): API pública /wp-json/wc/store/v1/products.
const API = '/wp-json/wc/store/v1/products';

export async function detect(store, get) {
  try {
    const r = await get(`${store.url}${API}?per_page=1`, { json: true });
    return Array.isArray(r?.body);
  } catch {
    return false;
  }
}

const attr = (attrs, re) => {
  const a = (attrs || []).find((x) => re.test(String(x.name || x.taxonomy || '').toLowerCase()));
  return a ? (a.terms || []).map((t) => t.name).join(', ') : '';
};

/** IDs de categorías cuyo nombre o slug menciona Pokémon. */
async function pokemonCategories(store, get) {
  const ids = [];
  for (let page = 1; page <= 10; page++) {
    let r;
    try {
      r = await get(`${store.url}${API}/categories?per_page=100&page=${page}`, { json: true });
    } catch {
      break;
    }
    const cats = Array.isArray(r?.body) ? r.body : [];
    for (const c of cats) if (/pok[eé]mon|ptcg/i.test(`${c.name} ${c.slug}`) && c.count !== 0) ids.push(String(c.id));
    if (cats.length < 100) break;
  }
  return ids;
}

export async function* fetchRaw(store, get) {
  let cats = store.categories?.length ? store.categories : null;
  if (!cats && !store.onlyPokemon && store.discoverCategories !== false) {
    const ids = await pokemonCategories(store, get);
    if (ids.length) cats = [ids.join(',')];
  }
  const fromCategories = !!cats;
  cats ||= [null];
  const seen = new Set();
  for (const cat of cats) {
    let totalPages = Infinity;
    for (let page = 1; page <= Math.min(totalPages, store.maxPages || 500); page++) {
      const q = new URLSearchParams({ per_page: '100', page: String(page) });
      if (cat) q.set('category', cat);
      const r = await get(`${store.url}${API}?${q}`, { json: true });
      const tp = parseInt(r?.headers?.get('x-wp-totalpages') || '', 10);
      if (isFinite(tp)) totalPages = tp;
      const items = Array.isArray(r?.body) ? r.body : [];
      if (!items.length) break;
      for (const p of items) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        const pr = p.prices || {};
        const minor = pr.currency_minor_unit ?? 0;
        yield {
          id: String(p.id),
          title: decode(p.name),
          variantTitle: '',
          url: p.permalink,
          image: p.images?.[0]?.thumbnail || p.images?.[0]?.src || '',
          price: pr.price,
          compareAt: pr.regular_price !== pr.price ? pr.regular_price : null,
          minorUnit: minor,
          available: p.is_in_stock !== false && p.is_purchasable !== false,
          productType: '',
          vendor: '',
          tags: (p.tags || []).map((t) => t.name),
          categories: (p.categories || []).map((c) => decode(c.name)),
          pokemonContext: fromCategories,
          languageOption: attr(p.attributes, /idioma|language|lenguaje/),
          conditionOption: attr(p.attributes, /condici|condition|estado/),
          finishOption: attr(p.attributes, /foil|acabado|finish|printing/),
        };
      }
      if (items.length < 100) break;
    }
  }
}

function decode(s = '') {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&([A-Za-z])(acute|grave|tilde|uml|circ);/g, (_, l, k) => (l + { acute: '́', grave: '̀', tilde: '̃', uml: '̈', circ: '̂' }[k]).normalize('NFC'))
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

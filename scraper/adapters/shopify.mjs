// Tiendas Shopify: catálogo público en /products.json (250 productos por página, máx. 100 páginas).
// Para no recorrer todo Magic/One Piece/etc., primero busca las colecciones de Pokémon de la tienda.
import { SETS } from '../sets.mjs';
import { fold, detectLanguage } from '../lib/normalize.mjs';

const optFinder = (options, re) => {
  const i = (options || []).findIndex((o) => re.test(String(o.name || '').toLowerCase()));
  return i >= 0 ? `option${i + 1}` : null;
};

const OTHER_TCG = /magic|mtg|one piece|yu-?gi-?oh|digimon|lorcana|dragon ball|riftbound|gundam|flesh and blood|star wars|mitos/;
const SET_NAMES = SETS.filter((s) => !s.generic).flatMap((s) => s.aliases.filter((a) => a.length > 3).map(fold));

// Miniatura de 240 px desde la CDN de Shopify (más liviana que la imagen original).
const thumb = (src) => (src && /cdn\.shopify\.com|\/cdn\/shop\//.test(src) ? `${src}${src.includes('?') ? '&' : '?'}width=240` : src);

export async function detect(store, get) {
  try {
    const r = await get(`${store.url}/products.json?limit=1`, { json: true });
    return Array.isArray(r?.body?.products);
  } catch {
    return false;
  }
}

/** Colecciones que parecen de Pokémon (por nombre, o por edición conocida + descripción). */
export async function pokemonCollections(store, get) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    let r;
    try {
      r = await get(`${store.url}/collections.json?limit=250&page=${page}`, { json: true });
    } catch {
      break;
    }
    const cols = r?.body?.collections || [];
    for (const c of cols) {
      const name = fold(`${c.title} ${c.handle.replace(/-/g, ' ')}`);
      const desc = fold(String(c.description || '').replace(/<[^>]+>/g, ' '));
      if (OTHER_TCG.test(name)) continue;
      const byName = /pokemon|ptcg/.test(name);
      const bySet = SET_NAMES.some((a) => name.includes(a)) && /pokemon/.test(desc) && !OTHER_TCG.test(desc);
      if ((byName || bySet) && c.products_count !== 0) out.push({ handle: c.handle, title: c.title, lang: detectLanguage(c.title) });
    }
    if (cols.length < 250) break;
  }
  // Primero las colecciones con idioma explícito, para heredar ese idioma.
  return out.sort((a, b) => (b.lang ? 1 : 0) - (a.lang ? 1 : 0));
}

export async function* fetchRaw(store, get) {
  let sources;
  if (store.collections?.length) sources = store.collections.map((h) => ({ handle: h, lang: null }));
  else if (!store.onlyPokemon && store.discoverCollections !== false) sources = await pokemonCollections(store, get);
  if (!sources?.length) sources = [{ handle: null, lang: null }];
  const fromCollections = sources[0].handle !== null;

  const seen = new Set();
  for (const src of sources) {
    const path = src.handle ? `/collections/${encodeURIComponent(src.handle)}/products.json` : '/products.json';
    for (let page = 1; page <= Math.min(store.maxPages || 100, 100); page++) {
      let r;
      try {
        r = await get(`${store.url}${path}?limit=250&page=${page}`, { json: true });
      } catch (e) {
        if (page > 1 && e.status === 400) break; // Shopify no entrega más allá de la página 100
        throw e;
      }
      const products = r?.body?.products || [];
      if (!products.length) break;
      for (const p of products) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        const langOpt = optFinder(p.options, /idioma|language|lenguaje|lang/);
        const condOpt = optFinder(p.options, /condici|condition|estado/);
        const finOpt = optFinder(p.options, /printing|acabado|foil|finish|impresi|version/);
        const tags = Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
        for (const v of p.variants || []) {
          yield {
            id: `${p.id}:${v.id}`,
            title: p.title,
            variantTitle: v.title && v.title !== 'Default Title' ? v.title : '',
            url: `${store.url}/products/${p.handle}${(p.variants || []).length > 1 ? `?variant=${v.id}` : ''}`,
            image: thumb(v.featured_image?.src || p.images?.[0]?.src || ''),
            price: v.price,
            compareAt: v.compare_at_price,
            available: v.available !== false,
            productType: p.product_type,
            vendor: p.vendor,
            tags,
            categories: [],
            pokemonContext: fromCollections,
            collectionLang: src.lang || '',
            languageOption: langOpt ? v[langOpt] : '',
            conditionOption: condOpt ? v[condOpt] : '',
            finishOption: finOpt ? v[finOpt] : '',
          };
        }
      }
      if (products.length < 250) break;
    }
  }
}

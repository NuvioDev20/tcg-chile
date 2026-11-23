// Tiendas Jumpseller: usan la interfaz pública de catálogo que la plataforma ofrece en /api/mcp
// (la misma que anuncian en su robots.txt). Entrega 100 productos por consulta con precio, stock y variantes.

let rpcId = 0;

function parseRpc(text) {
  // Puede llegar como JSON directo o como "event: message / data: {...}" (SSE).
  const t = text.trim();
  const json = t.startsWith('{') ? t : t.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
  const msg = JSON.parse(json);
  if (msg.error) throw new Error(`Jumpseller: ${msg.error.message || 'error'}`);
  const content = msg.result?.content?.[0]?.text;
  if (msg.result?.isError) throw new Error(`Jumpseller: ${content || 'error'}`);
  return content ? JSON.parse(content) : msg.result;
}

// Un POST que recibe una redirección (ej. sin "www" → con "www") se convierte en GET, así que primero se
// resuelve la dirección final de la tienda.
const origins = new Map();
async function origin(store, get) {
  if (!origins.has(store.url)) {
    const r = await get(store.url);
    origins.set(store.url, new URL(r.url || store.url).origin);
  }
  return origins.get(store.url);
}

async function call(store, get, name, args = {}) {
  const r = await get(`${await origin(store, get)}/api/mcp`, {
    body: { jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } },
  });
  return parseRpc(r.body);
}

export async function detect(store, get) {
  try {
    const info = await call(store, get, 'get_store_info');
    return !!info;
  } catch {
    return false;
  }
}

async function pokemonCategories(store, get) {
  try {
    const cats = await call(store, get, 'list_categories');
    return (Array.isArray(cats) ? cats : [])
      .map((c) => c.category || c)
      .filter((c) => /pok[eé]mon|ptcg/i.test(`${c.name} ${c.permalink}`))
      .map((c) => c.permalink);
  } catch {
    return [];
  }
}

export async function* fetchRaw(store, get) {
  let cats = store.categories?.length ? store.categories : null;
  if (!cats && !store.onlyPokemon && store.discoverCategories !== false) {
    const found = await pokemonCategories(store, get);
    if (found.length) cats = found;
  }
  const fromCategories = !!cats;
  const seen = new Set();
  for (const category of cats || [null]) {
    for (let page = 1; page <= (store.maxPages || 300); page++) {
      const args = { page, limit: 100 };
      if (category) args.category = category;
      const list = await call(store, get, 'list_products', args);
      const items = Array.isArray(list) ? list : [];
      if (!items.length) break;
      for (const it of items) {
        const p = it.product || it;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        const pid = String(p.id).split('/').pop();
        const base = {
          title: String(p.name || '').trim(),
          url: p.url,
          image: (p.images || [])[0] || '',
          productType: '',
          vendor: p.brand || '',
          tags: [],
          categories: p.categories || [],
          pokemonContext: fromCategories,
          conditionOption: '',
          finishOption: '',
        };
        const variants = p.variants || [];
        if (!variants.length) {
          yield { ...base, id: pid, variantTitle: '', price: p.price, compareAt: p.compare_at_price, available: p.stock_available !== false, languageOption: '' };
          continue;
        }
        for (const v of variants) {
          const opts = v.options || [];
          const opt = (re) => opts.find((o) => re.test(String(o.name || '').toLowerCase()))?.value || '';
          yield {
            ...base,
            id: `${pid}:${String(v.id).split('/').pop()}`,
            variantTitle: opts.map((o) => o.value).filter(Boolean).join(' / '),
            price: v.price ?? p.price,
            compareAt: v.compare_at_price,
            available: v.stock_available !== false,
            languageOption: opt(/idioma|language|lenguaje/),
            conditionOption: opt(/condici|condition|estado/),
            finishOption: opt(/foil|acabado|finish|printing|version/),
          };
        }
      }
      if (items.length < 100) break;
    }
  }
}

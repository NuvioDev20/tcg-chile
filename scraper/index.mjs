#!/usr/bin/env node
// Recolector: lee todas las tiendas de stores.json y genera public/data/products.json
//   node scraper/index.mjs                 → todas las tiendas
//   node scraper/index.mjs afkstore oasis  → sólo esas (por id)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeClient } from './lib/http.mjs';
import { classify, isPokemonTcg, toClp, TYPES, LANGS } from './lib/normalize.mjs';
import { SETS } from './sets.mjs';
import * as shopify from './adapters/shopify.mjs';
import * as woocommerce from './adapters/woocommerce.mjs';
import * as jsonld from './adapters/jsonld.mjs';
import * as jumpseller from './adapters/jumpseller.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = process.env.OUT_DIR || path.join(ROOT, 'public', 'data');
const STATE_FILE = process.env.STATE_FILE || path.join(ROOT, '.cache', 'state.json');
const STORES_FILE = process.env.STORES_FILE || path.join(ROOT, 'stores.json');
const ADAPTERS = { shopify, woocommerce, jumpseller, jsonld };
const DETECT_ORDER = ['shopify', 'woocommerce', 'jumpseller', 'jsonld'];

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Estado anterior: primero la caché local; si no hay (p. ej. en GitHub Actions), lo publicado en el sitio. */
async function loadPreviousState() {
  const local = await loadJson(STATE_FILE, null);
  if (local) return local;
  const base = (process.env.PREV_SITE_URL || '').replace(/\/+$/, '');
  if (base) {
    try {
      const get = async (f) => {
        const r = await fetch(`${base}/data/${f}?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
        return r.ok ? r.json() : null;
      };
      const [data, extra, meta] = await Promise.all([get('products.json'), get('state.json'), get('meta.json')]);
      if (data) {
        const byStore = {};
        for (const l of data.listings || []) (byStore[l.s] ||= []).push(l);
        await mkdir(OUT_DIR, { recursive: true });
        await writeFile(path.join(OUT_DIR, 'products.json'), JSON.stringify({ ...data, listings: [] }));
        if (meta) await writeFile(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta));
        log(`Estado previo descargado de ${base} (${(data.listings || []).length} productos)`);
        return { platforms: extra?.platforms || {}, listingsByStore: byStore, pages: extra?.pages || {} };
      }
    } catch (e) {
      log('No se pudo descargar el estado previo:', e.message);
    }
  }
  return { platforms: {}, listingsByStore: {}, pages: {} };
}

async function resolvePlatform(store, get, state) {
  if (store.platform && store.platform !== 'auto') return store.platform;
  const known = state.platforms?.[store.id];
  if (known && ADAPTERS[known]) return known;
  for (const name of DETECT_ORDER) {
    if (await ADAPTERS[name].detect(store, get)) return name;
  }
  throw new Error('No se reconoció la plataforma de la tienda (ni Shopify, ni WooCommerce, ni Jumpseller, ni sitemap con JSON-LD)');
}

// Algunas plataformas (Jumpseller) limitan los pedidos por IP entre todas sus tiendas:
// no se leen más de N tiendas de la misma plataforma a la vez.
const PLATFORM_LIMIT = { jumpseller: 2 };
const running = {};
const waiting = {};
async function acquire(platform) {
  const max = PLATFORM_LIMIT[platform];
  if (!max) return () => {};
  while ((running[platform] || 0) >= max) await new Promise((r) => (waiting[platform] ||= []).push(r));
  running[platform] = (running[platform] || 0) + 1;
  return () => {
    running[platform]--;
    waiting[platform]?.shift()?.();
  };
}

async function scrapeStore(store, settings, state, now) {
  const get = makeClient({ delayMs: store.delayMs ?? settings.delayMs ?? 700 });
  const platform = await resolvePlatform(store, get, state);
  const release = await acquire(platform);
  try {
    return await scrapeWith(platform, store, settings, get, state, now);
  } finally {
    release();
  }
}

async function scrapeWith(platform, store, settings, get, state, now) {
  const adapter = ADAPTERS[platform];

  const prevPages = new Map(Object.entries(state.pages?.[store.id] || {}));
  const newPages = {};
  const listings = [];
  let seen = 0;

  for await (const raw of adapter.fetchRaw(store, get, { prevByUrl: prevPages })) {
    if (raw._emptyPage) {
      newPages[raw._emptyPage] = { lastmod: raw._lastmod, checkedAt: now, items: [] };
      continue;
    }
    seen++;
    if (raw._page) {
      const pg = (newPages[raw._page] ||= { lastmod: raw._lastmod, checkedAt: now, items: [] });
      const { _page, _lastmod, ...clean } = raw;
      pg.items.push(clean);
    } else if (raw._reused && raw._pageRef && !newPages[raw._pageRef]) {
      newPages[raw._pageRef] = prevPages.get(raw._pageRef);
    }
    if (!isPokemonTcg(raw, store)) continue;
    const price = toClp(raw.price, raw.minorUnit || 0);
    if (!price || price < (store.minPrice ?? settings.minPrice ?? 100)) continue; // precios de relleno ($0, $1…)
    const c = classify(raw, store);
    if (!raw.available && (c.type === 'single' || c.type === 'graded') && !store.keepOutOfStockSingles) continue;
    const compare = toClp(raw.compareAt, raw.minorUnit || 0);
    const l = {
      id: `${store.id}:${raw.id}`,
      s: store.id,
      t: String(raw.title).trim(),
      u: raw.url,
      i: raw.image ? String(raw.image).replace(/^\/\//, 'https://') : '',
      p: price,
      a: raw.available ? 1 : 0,
      ty: c.type,
      l: c.lang || '',
      st: c.set || '',
      g: c.group,
    };
    if (compare && compare > price) l.cp = compare;
    if (raw.variantTitle) l.v = raw.variantTitle;
    if (c.number) l.n = c.number;
    if (c.finish) l.f = c.finish;
    if (c.condition) l.c = c.condition;
    listings.push(l);
  }
  return { platform, listings, pages: platform === 'jsonld' ? newPages : undefined, seen };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

async function main() {
  const cfg = await loadJson(STORES_FILE, null);
  if (!cfg) throw new Error('Falta stores.json');
  const settings = cfg.settings || {};
  const only = process.argv.slice(2);
  const stores = cfg.stores
    .filter((s) => s.enabled !== false)
    .filter((s) => !only.length || only.includes(s.id))
    .map((s) => ({ ...s, url: s.url.replace(/\/+$/, '') }));

  const state = await loadPreviousState();
  const now = new Date().toISOString();
  const prevById = new Map();
  for (const arr of Object.values(state.listingsByStore || {})) for (const l of arr) prevById.set(l.id, l);

  const results = await pool(stores, settings.concurrency || 4, async (store) => {
    const t0 = Date.now();
    try {
      const r = await scrapeStore(store, settings, state, now);
      log(`✔ ${store.name}: ${r.listings.length} productos Pokémon (${r.seen} revisados, ${r.platform}) en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      return { store, ok: true, ...r };
    } catch (e) {
      const old = state.listingsByStore?.[store.id] || [];
      log(`✘ ${store.name}: ${e.message}${old.length ? ` — se mantienen ${old.length} precios anteriores` : ''}`);
      return { store, ok: false, error: e.message, listings: old, platform: state.platforms?.[store.id] || store.platform, stale: old.length > 0 };
    }
  });

  // Historial: precio anterior, cuándo cambió, cuándo apareció y si volvió a tener stock.
  const listingsByStore = {};
  const all = [];
  for (const r of results) {
    const arr = r.ok
      ? r.listings.map((l) => {
          const prev = prevById.get(l.id);
          l.fs = prev?.fs || now;
          if (prev && prev.p !== l.p) {
            l.pp = prev.p;
            l.ch = now;
          } else if (prev?.ch) {
            l.pp = prev.pp;
            l.ch = prev.ch;
          }
          if (prev && !prev.a && l.a) l.rs = now;
          else if (prev?.rs && l.a) l.rs = prev.rs;
          return l;
        })
      : r.listings;
    listingsByStore[r.store.id] = arr;
    all.push(...arr);
  }

  // Si se corrió sólo un subconjunto de tiendas, conservar las demás.
  if (only.length) {
    for (const [sid, arr] of Object.entries(state.listingsByStore || {})) {
      if (!listingsByStore[sid] && cfg.stores.some((s) => s.id === sid && s.enabled !== false)) {
        listingsByStore[sid] = arr;
        all.push(...arr);
      }
    }
  }

  const prevStoreInfo = await loadJson(path.join(OUT_DIR, 'products.json'), { stores: [] });
  const storeInfo = cfg.stores
    .filter((s) => s.enabled !== false)
    .map((s) => {
      const r = results.find((x) => x.store.id === s.id);
      const prev = prevStoreInfo.stores?.find((x) => x.id === s.id);
      if (!r) return prev || { id: s.id, name: s.name, url: s.url, count: (listingsByStore[s.id] || []).length };
      return {
        id: s.id,
        name: s.name,
        url: s.url.replace(/\/+$/, ''),
        city: s.city || '',
        platform: r.platform || '',
        ok: r.ok,
        stale: !!r.stale,
        error: r.ok ? undefined : r.error,
        count: (listingsByStore[s.id] || []).length,
        updatedAt: r.ok ? now : prev?.updatedAt,
      };
    });

  all.sort((a, b) => (a.g < b.g ? -1 : a.g > b.g ? 1 : a.p - b.p));
  const hash = createHash('sha1')
    .update(JSON.stringify(all.map((l) => [l.id, l.p, l.a, l.g]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))))
    .digest('hex')
    .slice(0, 16);
  const prevMeta = await loadJson(path.join(OUT_DIR, 'meta.json'), {});
  const changed = prevMeta.hash !== hash;

  const out = {
    generatedAt: now,
    lastChangeAt: changed ? now : prevMeta.lastChangeAt || now,
    stores: storeInfo,
    sets: SETS.map(({ id, en, es, era, order }) => ({ id, en, es, era, order })),
    types: TYPES,
    langs: LANGS,
    listings: all,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'products.json'), JSON.stringify(out));
  await writeFile(
    path.join(OUT_DIR, 'meta.json'),
    JSON.stringify({ generatedAt: now, lastChangeAt: out.lastChangeAt, hash, count: all.length }),
  );

  await mkdir(path.dirname(STATE_FILE), { recursive: true });
  const platforms = { ...(state.platforms || {}) };
  const pages = { ...(state.pages || {}) };
  for (const r of results) {
    if (r.platform) platforms[r.store.id] = r.platform;
    if (r.ok && r.pages) pages[r.store.id] = r.pages;
  }
  await writeFile(STATE_FILE, JSON.stringify({ savedAt: now, platforms, listingsByStore, pages }));
  // Versión publicada (sin los precios, que ya están en products.json) para la próxima ejecución en la nube.
  await writeFile(path.join(OUT_DIR, 'state.json'), JSON.stringify({ savedAt: now, platforms, pages }));

  const okCount = results.filter((r) => r.ok).length;
  log(`Listo: ${all.length} productos de ${okCount}/${results.length} tiendas. ${changed ? 'Hubo cambios.' : 'Sin cambios.'}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  if (!okCount && results.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Prueba de punta a punta con tiendas simuladas (Shopify, WooCommerce y genérica con JSON-LD).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const prices = { etb: '64990', single: '4500' };

function shopifyProducts() {
  return {
    products: [
      {
        id: 1, title: 'Pokémon TCG: Caos Creciente Elite Trainer Box (Español)', handle: 'etb-caos', product_type: 'Pokemon Sellado', vendor: 'Pokemon', tags: [],
        options: [{ name: 'Title' }], images: [{ src: 'https://example.com/etb.jpg' }],
        variants: [{ id: 11, title: 'Default Title', price: prices.etb, compare_at_price: null, available: true, option1: 'Default Title' }],
      },
      {
        id: 2, title: 'Venusaur ex - 003/165', handle: 'venusaur', product_type: 'Pokemon Singles', vendor: 'x', tags: ['151'],
        options: [{ name: 'Condición' }, { name: 'Idioma' }], images: [],
        variants: [
          { id: 21, title: 'NM / Español', price: prices.single, available: true, option1: 'Near Mint', option2: 'Español' },
          { id: 22, title: 'NM / Inglés', price: '5000', available: false, option1: 'Near Mint', option2: 'Inglés' },
        ],
      },
      { id: 3, title: 'Lightning Bolt', handle: 'bolt', product_type: 'Magic Singles', vendor: 'x', tags: [], options: [], images: [], variants: [{ id: 31, price: '500', available: true }] },
    ],
  };
}

const wooProducts = [
  {
    id: 900, name: 'TCG: Chaos Rising Elite Trainer Box ESPA&Ntilde;OL', permalink: 'http://w/etb', is_in_stock: true, is_purchasable: true,
    prices: { price: '61990', regular_price: '69990', currency_minor_unit: 0 }, categories: [{ name: 'Pokémon TCG' }], tags: [], attributes: [], images: [],
  },
  {
    id: 901, name: 'Venusaur ex 003/165', permalink: 'http://w/ven', is_in_stock: true, is_purchasable: true,
    prices: { price: '3990', regular_price: '3990', currency_minor_unit: 0 }, categories: [{ name: 'Singles Pokemon' }], tags: [],
    attributes: [{ name: 'Idioma', terms: [{ name: 'Español' }] }, { name: 'Condición', terms: [{ name: 'NM' }] }], images: [],
  },
];

function serve(handler) {
  return new Promise((resolve) => {
    const srv = createServer(handler).listen(0, '127.0.0.1', () => resolve(srv));
  });
}

test('recolecta, clasifica, agrupa y registra cambios de precio', async () => {
  const shop = await serve((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/robots.txt') return res.end('User-agent: *\nDisallow: /cart\n');
    if (u.pathname === '/products.json') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(u.searchParams.get('page') === '1' || !u.searchParams.get('page') ? shopifyProducts() : { products: [] }));
    }
    res.writeHead(404).end();
  });
  const woo = await serve((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/wp-json/wc/store/v1/products') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-WP-TotalPages', '1');
      return res.end(JSON.stringify(u.searchParams.get('page') === '1' ? wooProducts : []));
    }
    res.writeHead(404).end();
  });
  const gen = await serve((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/robots.txt') return res.end('User-agent: *\nDisallow: /producto/secreto\n');
    if (u.pathname === '/sitemap.xml')
      return res.end(`<?xml version="1.0"?><urlset><url><loc>http://${req.headers.host}/producto/sobre-151</loc><lastmod>2026-11-01</lastmod></url><url><loc>http://${req.headers.host}/producto/secreto</loc></url></urlset>`);
    if (u.pathname === '/producto/sobre-151')
      return res.end(`<html><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Sobre Pokémon 151 Inglés","offers":{"@type":"Offer","price":"8990","priceCurrency":"CLP","availability":"https://schema.org/InStock"}}</script></html>`);
    res.writeHead(404).end();
  });

  const dir = await mkdtemp(path.join(tmpdir(), 'tcg-'));
  const port = (s) => s.address().port;
  await writeFile(
    path.join(dir, 'stores.json'),
    JSON.stringify({
      settings: { delayMs: 0 },
      stores: [
        { id: 'shop', name: 'Tienda Shopify', url: `http://127.0.0.1:${port(shop)}`, platform: 'auto' },
        { id: 'woo', name: 'Tienda Woo', url: `http://127.0.0.1:${port(woo)}`, platform: 'auto' },
        { id: 'gen', name: 'Tienda Genérica', url: `http://127.0.0.1:${port(gen)}`, platform: 'auto' },
        { id: 'dead', name: 'Tienda Caída', url: 'http://127.0.0.1:1', platform: 'shopify' },
      ],
    }),
  );
  const env = { ...process.env, STORES_FILE: path.join(dir, 'stores.json'), OUT_DIR: path.join(dir, 'out'), STATE_FILE: path.join(dir, 'state.json'), PREV_SITE_URL: '' };

  try {
    await run('node', [path.join(ROOT, 'scraper/index.mjs')], { env });
    let data = JSON.parse(await readFile(path.join(dir, 'out', 'products.json'), 'utf8'));
    const by = (id) => data.listings.find((l) => l.id === id);

    assert.equal(data.stores.find((s) => s.id === 'shop').platform, 'shopify');
    assert.equal(data.stores.find((s) => s.id === 'woo').platform, 'woocommerce');
    assert.equal(data.stores.find((s) => s.id === 'gen').platform, 'jsonld');
    assert.equal(data.stores.find((s) => s.id === 'dead').ok, false);

    assert.ok(!data.listings.some((l) => /Lightning/.test(l.t)), 'Magic se excluye');
    assert.ok(!by('shop:2:22'), 'single agotado se omite');
    assert.ok(!data.listings.some((l) => /secreto/.test(l.u)), 'respeta robots.txt');

    const etbShop = by('shop:1:11');
    const etbWoo = by('woo:900');
    assert.equal(etbShop.ty, 'etb');
    assert.equal(etbShop.g, etbWoo.g, 'ETB de ambas tiendas se agrupan');
    assert.equal(etbWoo.cp, 69990);
    assert.equal(by('shop:2:21').g, by('woo:901').g, 'single se agrupa');
    assert.equal(by('shop:2:21').c, 'NM');
    const pack = data.listings.find((l) => l.s === 'gen');
    assert.deepEqual([pack.ty, pack.st, pack.l, pack.p], ['booster', '151', 'en', 8990]);

    const meta1 = JSON.parse(await readFile(path.join(dir, 'out', 'meta.json'), 'utf8'));

    // Segunda pasada: baja el precio del ETB.
    prices.etb = '59990';
    await run('node', [path.join(ROOT, 'scraper/index.mjs')], { env });
    data = JSON.parse(await readFile(path.join(dir, 'out', 'products.json'), 'utf8'));
    const etb2 = data.listings.find((l) => l.id === 'shop:1:11');
    assert.equal(etb2.p, 59990);
    assert.equal(etb2.pp, 64990);
    assert.ok(etb2.ch);
    const meta2 = JSON.parse(await readFile(path.join(dir, 'out', 'meta.json'), 'utf8'));
    assert.notEqual(meta1.hash, meta2.hash);
  } finally {
    shop.close();
    woo.close();
    gen.close();
  }
});

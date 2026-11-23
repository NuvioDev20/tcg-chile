import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, isPokemonTcg, detectType, detectLanguage, toClp } from '../scraper/lib/normalize.mjs';

const c = (title, extra = {}, store = {}) => classify({ title, tags: [], categories: [], ...extra }, store);

test('sellado: tipo, edición e idioma', () => {
  let r = c('CARTAS POKEMON BOOSTER BOX CAOS CRECIENTE 36 ESPAÑOL');
  assert.deepEqual([r.type, r.set, r.lang], ['box', 'chaos-rising', 'es']);
  r = c('Pokemon Tcg: Mega Evolution Perfect Order - Elite Trainer Box Mega Zygarde En Ingles');
  assert.deepEqual([r.type, r.set, r.lang], ['etb', 'perfect-order', 'en']);
  r = c('TCG: Chaos Rising Sleeved Booster Pack ESPAÑOL');
  assert.deepEqual([r.type, r.set, r.lang], ['booster', 'chaos-rising', 'es']);
  r = c('Pokemon Tcg Journey Together Booster Bundle Español');
  assert.deepEqual([r.type, r.set, r.lang], ['bundle', 'journey-together', 'es']);
  r = c('CARTAS POKEMON CHAOS RISING 3 PACK BLISTER EN');
  assert.deepEqual([r.type, r.set, r.lang], ['blister', 'chaos-rising', 'en']);
  r = c('TCG Paldean Fates Tin Español Al Azar');
  assert.deepEqual([r.type, r.set, r.lang], ['tin', 'paldean-fates', 'es']);
  r = c('Pokemon Tcg Mega Lucario Ex League Battle Deck Inglés');
  assert.deepEqual([r.type, r.lang], ['deck', 'en']);
  r = c('Tcg Cartas Ionos Bellibolt Ex Premium Collection Español');
  assert.deepEqual([r.type, r.lang], ['collection', 'es']);
  r = c('Pokémon TCG JP Munikis Zero Display 30 Sobres');
  assert.deepEqual([r.type, r.lang], ['box', 'ja']);
});

test('el mismo sellado en dos tiendas cae en el mismo grupo', () => {
  const a = c('Pokémon TCG: Megaevolución: Caos Creciente Booster Display (Español)');
  const b = c('TCG: Chaos Rising Booster Display ESPAÑOL');
  assert.equal(a.group, b.group);
  const en = c('CARTAS POKEMON BOOSTER BOX CHAOS RISING 36 INGLES');
  assert.notEqual(a.group, en.group);
});

test('singles: número, edición por total, idioma por opción', () => {
  let r = c('Venusaur Ex - 003/165 - Ultra Rare - Singles Pokemon');
  assert.deepEqual([r.type, r.set, r.number], ['single', '151', '3/165']);
  r = c('Professor\'s Research [Professor Juniper] 085/086', { productType: 'Single', tags: ['edicion_blackbolt&whiteflare'], languageOption: 'Ingles' });
  assert.deepEqual([r.type, r.set, r.lang], ['single', 'black-bolt-white-flare', 'en']);
  r = c('Pikachu ex - 276/217 Español Ascended Heroes Special Illustration Rare');
  assert.deepEqual([r.type, r.set, r.lang, r.number], ['single', 'ascended-heroes', 'es', '276/217']);
  r = c('Shroomish – 005/182 – Destined Rivals – Reverse Holofoil');
  assert.deepEqual([r.type, r.set, r.finish], ['single', 'destined-rivals', 'Reverse Holo']);
  r = c('Yanma sv10-002 EN');
  assert.deepEqual([r.type, r.set, r.lang], ['single', 'destined-rivals', 'en']);
  r = c('Absol – GG16/GG70 – Holo Rare');
  assert.equal(r.type, 'single');
  r = c('Mew ex Mew ex SV: Paldean Fates · 232/091');
  assert.equal(r.set, 'paldean-fates');
  r = c("Team Rocket's Mewtwo ex - 231/182", { categories: ['Singles Pokemon'] });
  assert.equal(r.type, 'single');
  r = c('Charizard Base Set PSA 9');
  assert.deepEqual([r.type, r.set], ['graded', 'base-set']);
});

test('filtro Pokémon', () => {
  assert.equal(isPokemonTcg({ title: 'Hunting Velociraptor', categories: ['Singles Magic'] }), false);
  assert.equal(isPokemonTcg({ title: 'Venusaur ex', categories: ['Singles Pokemon'] }), true);
  assert.equal(isPokemonTcg({ title: 'Liga Pokémon sábado', vendor: 'BinderPOS Event' }), false);
  assert.equal(isPokemonTcg({ title: 'Peluche Pikachu Pokémon 30cm' }), false);
  assert.equal(isPokemonTcg({ title: 'Pikachu ex 149/128' }, { onlyPokemon: true }), true);
  assert.equal(isPokemonTcg({ title: 'Yeti Brawler', productType: 'Riftbound Singles' }, { onlyPokemon: true }), false);
});

test('accesorios no se confunden con sellado', () => {
  assert.equal(detectType({ title: '300 Fundas POKEMON Protectoras Cartas Tcg 66x91mm' }), 'accessory');
  assert.equal(detectType({ title: 'Premium Poster Collection - Mega Gardevoir / Lucario (Inglés)' }), 'collection');
});

test('idioma y precios', () => {
  assert.equal(detectLanguage('Carta X (JP)'), 'ja');
  assert.equal(detectLanguage('Algo sin idioma'), null);
  assert.equal(toClp('70990'), 70990);
  assert.equal(toClp('500.00'), 500);
  assert.equal(toClp('$59.990'), 59990);
  assert.equal(toClp('1999', 2), 20);
});

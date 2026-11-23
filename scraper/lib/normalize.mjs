// Clasifica cada producto: ¿es Pokémon?, tipo, idioma, edición, número de carta, etc.
import { SETS } from '../sets.mjs';

export const fold = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const stripHtml = (s = '') => String(s).replace(/<[^>]*>/g, ' ');

// ── ¿Es Pokémon TCG? ─────────────────────────────────────────────────
const POKEMON_RE = /\bpokemon\b|\bptcg\b|\bpkmn\b/;
const NOT_TCG_RE =
  /\b(peluches?|plush|figuras?|mini ?figuras?|figures?|funko|poleras?|camisetas?|polerones?|llaveros?|tazas?|mochilas?|gorros?|stickers?|videojuegos?|nintendo switch|lego|mega construx|squishmallow|ticket|entrada|inscripcion|gift ?cards?|tarjeta de regalo|giftcard|torneo|liga pokemon|league challenge|evento|event)\b/;
const OTHER_TCG_RE =
  /\b(magic the gathering|mtg|yu-?gi-?oh|one piece card|digimon|lorcana|dragon ball|flesh and blood|riftbound|star wars unlimited|gundam card|mitos y leyendas|weiss schwarz|union arena)\b/;

export function isPokemonTcg(ctx, { onlyPokemon = false } = {}) {
  const meta = fold([ctx.productType, ctx.vendor, ...(ctx.tags || []), ...(ctx.categories || [])].join(' | '));
  const title = fold(ctx.title);
  const all = `${title} | ${meta}`;
  if (NOT_TCG_RE.test(all)) return false;
  if (onlyPokemon || ctx.pokemonContext) return !OTHER_TCG_RE.test(meta) || POKEMON_RE.test(meta);
  if (OTHER_TCG_RE.test(meta) && !POKEMON_RE.test(meta)) return false;
  return POKEMON_RE.test(all);
}

// ── Idioma ───────────────────────────────────────────────────────────
export const LANGS = {
  es: 'Español',
  en: 'Inglés',
  ja: 'Japonés',
  ko: 'Coreano',
  zh: 'Chino',
  pt: 'Portugués',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
};

const LANG_WORDS = [
  ['es', /\b(espanol|spanish|castellano|esp|spa|sp)\b|[\[(]es[\])]|(?:^|[\s\-–|])es$/],
  ['en', /\b(ingles|english|eng|ing)\b|[\[(]en[\])]|(?:^|[\s\-–|])en$/],
  ['ja', /\b(japones|japonesa|japanese|jpn|jap|jp)\b|[\[(]ja[\])]/],
  ['ko', /\b(coreano|korean|kor|kr)\b/],
  ['zh', /\b(chino|chinese|tcn|scn|cn)\b/],
  ['pt', /\b(portugues|portuguese|pt-br)\b/],
  ['fr', /\b(frances|french)\b/],
  ['de', /\b(aleman|german|deutsch)\b/],
  ['it', /\b(italiano|italian)\b/],
];

export function detectLanguage(...texts) {
  for (const t of texts) {
    if (!t) continue;
    const s = fold(Array.isArray(t) ? t.join(' | ') : t);
    for (const [code, re] of LANG_WORDS) if (re.test(s)) return code;
  }
  return null;
}

// ── Tipo de producto ─────────────────────────────────────────────────
export const TYPES = {
  single: { label: 'Single', group: 'singles' },
  graded: { label: 'Carta gradeada', group: 'singles' },
  booster: { label: 'Sobre', group: 'sellado' },
  box: { label: 'Booster Box / Display', group: 'sellado' },
  etb: { label: 'Elite Trainer Box', group: 'sellado' },
  bundle: { label: 'Booster Bundle', group: 'sellado' },
  blister: { label: 'Blister', group: 'sellado' },
  tin: { label: 'Lata (Tin)', group: 'sellado' },
  collection: { label: 'Colección / Caja especial', group: 'sellado' },
  deck: { label: 'Mazo', group: 'sellado' },
  accessory: { label: 'Accesorio', group: 'accesorios' },
  other: { label: 'Otro', group: 'otros' },
};

const CARD_NUMBER_RE = /(?:^|[\s#\-–(\[])([a-z]{0,4}\d{1,3}[a-z]?)\s?\/\s?([a-z]{0,4}\d{1,3})(?=$|[\s\-–)\],.])/i;
const CODE_NUMBER_RE = /\b(sv\d{1,2}(?:pt5|\.5)?|me\d{1,2}|swsh\d{1,2})[\s\-_](\d{1,3})\b/i;

export function detectType(ctx) {
  const meta = fold([ctx.productType, ...(ctx.categories || []), ...(ctx.tags || [])].join(' | '));
  const title = fold(`${ctx.title || ''} ${ctx.variantTitle || ''}`);
  const both = `${title} | ${meta}`;

  if (/\b(fundas?|sleeves?|protectores?|toploaders?|top ?loaders?|binder|carpeta|portfolio|playmat|tapete|deck ?box|porta ?mazos?|dados|dice|album|marcadores|contadores|magnetic holder|one touch)\b/.test(title) &&
      !/\b(booster|sobres?|elite trainer|etb|collection|coleccion)\b/.test(title))
    return 'accessory';
  if (/\b(psa|bgs|cgc|beckett|ace|tag)\s?(10|9\.5|9|8\.5|8|7|6|5|gem mint|mint|pristine)\b|\bgradead[ao]\b|\bgraded\b/.test(both)) return 'graded';
  if (/\b(single|singles|carta suelta|cartas sueltas|cartas individuales|carta individual)\b/.test(meta)) return 'single';

  if (/\b(booster box|booster display|display box|caja de sobres|caja booster|booster caja)\b|\bdisplay\b|\b(36|24|30|18) (sobres|boosters|packs)\b|\bcaja (de )?(36|24|30|18)\b/.test(title)) return 'box';
  if (/\b(elite trainer box|elite trainer|entrenador (de )?elite|caja (de )?entrenador|etb)\b/.test(title)) return 'etb';
  if (/\b(booster bundle|bundle|paquete de 6 sobres)\b/.test(title)) return 'bundle';
  if (/\b(blister|3 ?-?pack|three pack|checklane|check lane|3 sobres)\b/.test(title)) return 'blister';
  if (/\b(tins?|mini tins?|latas?|minilatas?)\b/.test(title)) return 'tin';
  if (/\b(battle deck|league battle deck|theme deck|mazos?|decks?|starter|world championship|ex battle deck|battle academy|academia de combate)\b/.test(title)) return 'deck';
  if (/\b(collection|coleccion|premium|ultra premium|upc|build ?(&|and|y) ?battle|kit|poster|box|caja|chest|cofre|calendar|calendario|advent|trainer'?s toolkit|toolkit|pin)\b/.test(title)) return 'collection';
  if (/\b(booster|boosters|sobre|sobres|pack|sleeved)\b/.test(title)) return 'booster';

  if (CARD_NUMBER_RE.test(title) || CODE_NUMBER_RE.test(title)) return 'single';
  if (/\b(holo|reverse|full art|illustration rare|secret rare|ultra rare|rare|promo|common|uncommon|trainer gallery|ex|vmax|vstar|gx|energy|energia|ball|ediciones variadas|stadium|supporter|item)\b/.test(both)) return 'single';
  return 'other';
}

// ── Número de carta, terminación ─────────────────────────────────────
export function detectCardNumber(title) {
  const t = fold(title);
  let m = t.match(CARD_NUMBER_RE);
  if (m) {
    const clean = (x) => x.replace(/^([a-z]*)0+(\d)/, '$1$2');
    return { number: `${clean(m[1])}/${clean(m[2])}`, total: parseInt(m[2].replace(/\D/g, ''), 10), totalPrefix: m[2].replace(/\d/g, '') };
  }
  m = t.match(CODE_NUMBER_RE);
  if (m) return { number: `${m[1]}-${parseInt(m[2], 10)}`, code: m[1] };
  return null;
}

export function detectFinish(...texts) {
  const s = fold(texts.filter(Boolean).join(' | '));
  if (/\breverse\b|\brev holo\b|\bholo reverso\b|\breverso\b/.test(s)) return 'Reverse Holo';
  if (/\bpoke ?ball (pattern|reverse)\b/.test(s)) return 'Poké Ball';
  if (/\bmaster ?ball\b/.test(s)) return 'Master Ball';
  return '';
}

export function detectCondition(...texts) {
  // Se usa sólo con el valor de la opción "Condición" de la tienda.
  const s = fold(texts.filter(Boolean).join(' | '));
  if (/\b(damaged|dmg|danada|danado)\b/.test(s)) return 'DMG';
  if (/\b(heavily played|hp)\b/.test(s)) return 'HP';
  if (/\b(moderately played|mp)\b/.test(s)) return 'MP';
  if (/\b(lightly played|lp|excellent|ex)\b/.test(s)) return 'LP';
  if (/\b(near mint|nm|mint|m|nuevo|new)\b/.test(s)) return 'NM';
  if (/\b(played|pl|jugada)\b/.test(s)) return 'MP';
  return '';
}

// ── Edición / set ────────────────────────────────────────────────────
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SET_MATCHERS = SETS.map((s) => ({
  set: s,
  res: s.aliases.map((a) => new RegExp(`(?<![\\w/])${escapeRe(fold(a))}(?![\\w/])`)),
  codes: (s.codes || []).map((c) => new RegExp(`(?<![\\w])${escapeRe(c)}(?![\\w])`)),
}));
const TOTALS = (() => {
  const m = new Map();
  for (const s of SETS) if (s.total) m.set(s.total, m.has(s.total) ? null : s.id);
  return m;
})();

function matchSet(texts) {
  const s = fold(texts.filter(Boolean).join(' | ').replace(/[–—:]/g, ' ').replace(/_/g, ' '));
  let best = null;
  for (const { set, res, codes } of SET_MATCHERS) {
    for (const re of [...res, ...codes]) {
      const m = s.match(re);
      if (!m) continue;
      const score = (set.generic ? 0 : 1000) + m[0].length;
      if (!best || score > best.score) best = { id: set.id, score };
    }
  }
  return best?.id || null;
}

/** Busca la edición primero en el título; si no aparece, en etiquetas/categorías; al final por el total del número. */
export function detectSet(texts, cardNumber, lang, secondary = []) {
  const found = matchSet(texts) || matchSet(secondary);
  if (found) return found;
  if (cardNumber?.total && !cardNumber.totalPrefix && lang !== 'ja') {
    const id = TOTALS.get(cardNumber.total);
    if (id) return id;
  }
  return null;
}

// ── Clave para agrupar el mismo producto entre tiendas ───────────────
const NOISE = new Set(
  ('pokemon tcg cartas carta juego de del la las el los y en the trading card game original originales nuevo nueva sellado sealed ' +
   'espanol ingles english spanish japones japanese esp eng jp version idioma producto oficial con sin al azar random a of por ' +
   'single singles nm near mint lp mp hp holo rare rara ultra')
    .split(' '),
);
const typeWords = /\b(booster|boosters|sobre|sobres|pack|sleeved|box|display|caja|elite|trainer|etb|bundle|blister|tin|lata|collection|coleccion|premium|deck|mazo)\b/g;

function tokens(title, setId) {
  let s = fold(stripHtml(title)).replace(/[^a-z0-9/ ]+/g, ' ');
  const set = SETS.find((x) => x.id === setId);
  if (set) for (const a of set.aliases) s = s.replace(new RegExp(`\\b${escapeRe(fold(a)).replace(/[^a-z0-9\\ ]/g, ' ')}\\b`, 'g'), ' ');
  return s
    .replace(typeWords, ' ')
    .split(' ')
    .filter((w) => w && !NOISE.has(w) && !/^\d{1,3}\/\d{1,3}$/.test(w));
}

export function groupKey({ title, type, setId, lang, number, finish }) {
  const L = lang || 'xx';
  if (type === 'single' || type === 'graded') {
    const name = tokens(title.split(/\s[-–|(]\s?|\s\d{1,3}\//)[0], setId).slice(0, 4).join(' ');
    const setPart = number && number.includes('/') ? '' : setId || '?';
    return ['S', type === 'graded' ? 'g' : '', setPart, number || '?', L, finish || '', name].join('|');
  }
  if (['booster', 'box', 'etb', 'bundle'].includes(type) && setId) {
    const pc = /pokemon center/.test(fold(title)) ? 'pc' : '';
    return ['P', type, setId, L, pc].join('|');
  }
  return ['P', type, setId || '?', L, tokens(title, setId).sort().join(' ')].join('|');
}

// ── Utilidades ───────────────────────────────────────────────────────
export function toClp(value, minorUnit = 0) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  if (!isFinite(n)) return null;
  return Math.round(n / 10 ** minorUnit);
}

/** Convierte un producto crudo (ya con título, precio, etc.) en un listado normalizado. */
export function classify(raw, store) {
  const lang =
    detectLanguage(raw.languageOption) ||
    detectLanguage(raw.title) ||
    detectLanguage(raw.variantTitle) ||
    raw.collectionLang ||
    detectLanguage(raw.tags, raw.categories) ||
    store.defaultLanguage ||
    null;
  const type = store.forceType || detectType(raw);
  const finalLang = lang || ((type === 'single' || type === 'graded') && store.defaultSinglesLanguage) || null;
  const num = type === 'single' || type === 'graded' ? detectCardNumber(raw.title) : null;
  const setId = detectSet([raw.title, raw.variantTitle], num, finalLang, [raw.productType, ...(raw.tags || []), ...(raw.categories || [])]);
  const finish = detectFinish(raw.finishOption, raw.variantTitle, raw.title);
  const condition = raw.conditionOption ? detectCondition(raw.conditionOption) || raw.conditionOption : '';
  const number = num?.number || '';
  return {
    type,
    lang: finalLang,
    set: setId,
    number,
    finish,
    condition,
    group: groupKey({ title: raw.title, type, setId, lang: finalLang, number, finish }),
  };
}

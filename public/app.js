// Comparador Pokémon TCG Chile — interfaz
const DATA_URL = 'data/products.json';
const META_URL = 'data/meta.json';
const POLL_MS = 60_000;
const PAGE = 40;
const DROP_DAYS = 7;

const $ = (s) => document.querySelector(s);
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const fold = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let DB = null; // datos cargados
let hash = null;
let groups = []; // resultado filtrado y ordenado
let shown = PAGE;
const open = new Set();

const state = {
  q: '', cat: '', ty: new Set(), l: new Set(), st: new Set(), s: new Set(),
  min: '', max: '', stock: true, drops: false, sort: 'price-asc',
};

function ago(iso) {
  if (!iso) return '';
  const sec = (Date.parse(iso) - Date.now()) / 1000;
  const abs = Math.abs(sec);
  if (abs < 60) return 'hace un momento';
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
  return rtf.format(Math.round(sec / 86400), 'day');
}

// ── Estado en la URL (para compartir búsquedas) ─────────────────────
function writeHash() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.cat) p.set('cat', state.cat);
  for (const k of ['ty', 'l', 'st', 's']) if (state[k].size) p.set(k, [...state[k]].join(','));
  if (state.min) p.set('min', state.min);
  if (state.max) p.set('max', state.max);
  if (!state.stock) p.set('stock', '0');
  if (state.drops) p.set('drops', '1');
  if (state.sort !== 'price-asc') p.set('sort', state.sort);
  const h = p.toString();
  history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.q = p.get('q') || '';
  state.cat = p.get('cat') || '';
  for (const k of ['ty', 'l', 'st', 's']) state[k] = p.has(k) ? new Set(p.get(k).split(',')) : new Set();
  state.min = p.get('min') || '';
  state.max = p.get('max') || '';
  state.stock = p.get('stock') !== '0';
  state.drops = p.get('drops') === '1';
  state.sort = p.get('sort') || 'price-asc';
}

// ── Carga de datos ──────────────────────────────────────────────────
async function load() {
  const res = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudieron cargar los datos (${res.status})`);
  const data = await res.json();
  const setById = Object.fromEntries(data.sets.map((s) => [s.id, s]));
  const storeById = Object.fromEntries(data.stores.map((s) => [s.id, s]));
  const now = Date.now();
  for (const l of data.listings) {
    const set = setById[l.st];
    l.q = fold([l.t, l.v, set?.es, set?.en, l.n, storeById[l.s]?.name].filter(Boolean).join(' '));
    l.cat = data.types[l.ty]?.group || 'otros';
    l.drop = l.pp && l.pp > l.p && l.ch && now - Date.parse(l.ch) < DROP_DAYS * 864e5 ? l.pp - l.p : 0;
    l.rise = l.pp && l.pp < l.p && l.ch && now - Date.parse(l.ch) < DROP_DAYS * 864e5 ? l.p - l.pp : 0;
  }
  DB = { ...data, setById, storeById };
  renderStatus();
  update(false);
}

async function poll() {
  try {
    const r = await fetch(`${META_URL}?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const m = await r.json();
    if (hash && m.hash !== hash) {
      await load();
      toast('Precios actualizados');
    } else if (DB) {
      DB.generatedAt = m.generatedAt;
      renderStatus();
    }
    hash = m.hash;
  } catch {
    /* sin conexión: se reintenta en el próximo ciclo */
  }
}

// ── Filtros ─────────────────────────────────────────────────────────
function passes(l, skip) {
  if (skip !== 'cat' && state.cat && l.cat !== state.cat) return false;
  if (skip !== 'ty' && state.ty.size && !state.ty.has(l.ty)) return false;
  if (skip !== 'l' && state.l.size && !state.l.has(l.l)) return false;
  if (skip !== 'st' && state.st.size && !state.st.has(l.st)) return false;
  if (skip !== 's' && state.s.size && !state.s.has(l.s)) return false;
  if (state.stock && !l.a) return false;
  if (state.drops && !l.drop) return false;
  if (state.min && l.p < +state.min) return false;
  if (state.max && l.p > +state.max) return false;
  if (state.q) {
    for (const w of fold(state.q).split(/\s+/)) if (w && !l.q.includes(w)) return false;
  }
  return true;
}

function counts(facet, key) {
  const c = new Map();
  for (const l of DB.listings) if (passes(l, facet)) c.set(l[key], (c.get(l[key]) || 0) + 1);
  return c;
}

function optRow(name, value, label, n, checked) {
  return `<label class="opt${n ? '' : ' zero'}"><input type="checkbox" data-f="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}/> <span>${esc(label)}</span><span class="n">${n || 0}</span></label>`;
}

function renderFacets() {
  // Tipo
  const ct = counts('ty', 'ty');
  const types = Object.entries(DB.types).filter(([id, t]) => (!state.cat || t.group === state.cat) && (ct.get(id) || state.ty.has(id)));
  $('#f-type').innerHTML = types.map(([id, t]) => optRow('ty', id, t.label, ct.get(id), state.ty.has(id))).join('') || '<span class="muted small">—</span>';

  // Idioma
  const cl = counts('l', 'l');
  const langs = [...Object.keys(DB.langs), ''].filter((k) => cl.get(k) || state.l.has(k));
  $('#f-lang').innerHTML = langs
    .map((k) => `<button type="button" class="chip" data-f="l" data-v="${k}" aria-pressed="${state.l.has(k)}">${esc(DB.langs[k] || 'Sin especificar')}<span class="n">${cl.get(k) || 0}</span></button>`)
    .join('');

  // Edición
  const cs = counts('st', 'st');
  const qset = fold($('#set-search').value);
  const sets = [...DB.sets].sort((a, b) => b.order - a.order).filter((s) => (cs.get(s.id) || state.st.has(s.id)) && (!qset || fold(`${s.es} ${s.en}`).includes(qset)));
  let html = '';
  let era = '';
  for (const s of sets) {
    if (s.era !== era) html += `<div class="era">${esc((era = s.era))}</div>`;
    html += optRow('st', s.id, s.es === s.en ? s.es : `${s.es} · ${s.en}`, cs.get(s.id), state.st.has(s.id));
  }
  if ((cs.get('') || state.st.has('')) && (!qset || 'sin identificar'.includes(qset))) html += `<div class="era">Otros</div>` + optRow('st', '', 'Sin identificar', cs.get(''), state.st.has(''));
  $('#f-set').innerHTML = html || '<span class="muted small">Sin ediciones</span>';

  // Tiendas
  const cst = counts('s', 's');
  $('#f-store').innerHTML = [...DB.stores]
    .sort((a, b) => (cst.get(b.id) || 0) - (cst.get(a.id) || 0) || a.name.localeCompare(b.name))
    .map((s) => optRow('s', s.id, s.name, cst.get(s.id), state.s.has(s.id)))
    .join('');

  // Categorías
  for (const b of document.querySelectorAll('#cats button')) b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat));
  $('#q').value !== state.q && ($('#q').value = state.q);
  $('#stock').checked = state.stock;
  $('#drops').checked = state.drops;
  $('#pmin').value = state.min;
  $('#pmax').value = state.max;
  $('#sort').value = state.sort;
}

function renderActive() {
  const items = [];
  if (state.q) items.push(['q', '', `“${state.q}”`]);
  for (const v of state.ty) items.push(['ty', v, DB.types[v]?.label || v]);
  for (const v of state.l) items.push(['l', v, DB.langs[v] || 'Sin idioma']);
  for (const v of state.st) items.push(['st', v, DB.setById[v]?.es || 'Edición sin identificar']);
  for (const v of state.s) items.push(['s', v, DB.storeById[v]?.name || v]);
  if (state.min) items.push(['min', '', `Desde ${clp.format(state.min)}`]);
  if (state.max) items.push(['max', '', `Hasta ${clp.format(state.max)}`]);
  if (state.drops) items.push(['drops', '', 'Bajas de precio']);
  $('#active').innerHTML = items.map(([k, v, label]) => `<button type="button" data-k="${k}" data-v="${esc(v)}">${esc(label)}</button>`).join('');
  const n = items.length - (state.q ? 1 : 0);
  $('#nfilters').textContent = n ? String(n) : '';
}

// ── Agrupación y orden ──────────────────────────────────────────────
function computeGroups() {
  const map = new Map();
  for (const l of DB.listings) {
    if (!passes(l)) continue;
    let g = map.get(l.g);
    if (!g) map.set(l.g, (g = { key: l.g, items: [] }));
    g.items.push(l);
  }
  const out = [];
  for (const g of map.values()) {
    g.items.sort((a, b) => b.a - a.a || a.p - b.p);
    const avail = g.items.filter((x) => x.a);
    const pool = avail.length ? avail : g.items;
    g.best = pool[0];
    g.min = g.best.p;
    g.max = Math.max(...pool.map((x) => x.p));
    g.stores = new Set(pool.map((x) => x.s)).size;
    g.drop = Math.max(0, ...g.items.map((x) => x.drop || 0));
    g.fs = Math.max(...g.items.map((x) => Date.parse(x.fs || 0)));
    g.img = (g.items.find((x) => x.i) || {}).i || '';
    out.push(g);
  }
  const by = {
    'price-asc': (a, b) => a.min - b.min,
    'price-desc': (a, b) => b.min - a.min,
    stores: (a, b) => b.stores - a.stores || a.min - b.min,
    spread: (a, b) => b.max - b.min - (a.max - a.min),
    drops: (a, b) => b.drop - a.drop || a.min - b.min,
    new: (a, b) => b.fs - a.fs,
    set: (a, b) => (DB.setById[b.best.st]?.order || 0) - (DB.setById[a.best.st]?.order || 0) || a.min - b.min,
    name: (a, b) => a.best.t.localeCompare(b.best.t, 'es'),
  }[state.sort];
  out.sort(by);
  return out;
}

// ── Render de resultados ────────────────────────────────────────────
function tagsFor(l) {
  const set = DB.setById[l.st];
  const t = [`<span class="tag type">${esc(DB.types[l.ty]?.label || 'Otro')}</span>`];
  if (set) t.push(`<span class="tag">${esc(set.es)}</span>`);
  t.push(`<span class="tag lang">${esc(DB.langs[l.l] || 'Idioma sin especificar')}</span>`);
  if (l.n) t.push(`<span class="tag">#${esc(l.n)}</span>`);
  if (l.f) t.push(`<span class="tag">${esc(l.f)}</span>`);
  return t.join('');
}

function offersTable(g) {
  const rows = g.items
    .map((l, i) => {
      const store = DB.storeById[l.s];
      const sub = [l.v, l.c && `Condición ${l.c}`].filter(Boolean).join(' · ');
      const change = l.drop ? `<div class="drop">↓ ${clp.format(l.drop)} ${ago(l.ch)}</div>` : l.rise ? `<div class="up">↑ ${clp.format(l.rise)} ${ago(l.ch)}</div>` : '';
      return `<tr class="${i === 0 && l.a ? 'best' : ''} ${l.a ? '' : 'oos'}">
        <td><b>${esc(store?.name || l.s)}</b>${store?.city ? `<div class="sub">${esc(store.city)}</div>` : ''}</td>
        <td>${esc(l.t)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</td>
        <td class="p">${clp.format(l.p)}${l.cp ? `<s>${clp.format(l.cp)}</s>` : ''}${change}</td>
        <td>${l.a ? '<span class="stock-ok">En stock</span>' : '<span class="stock-no">Agotado</span>'}</td>
        <td><a class="go" href="${esc(l.u)}" target="_blank" rel="noopener nofollow">Ver ↗</a></td>
      </tr>`;
    })
    .join('');
  return `<div class="offers"><table><thead><tr><th>Tienda</th><th>Publicación</th><th>Precio</th><th>Stock</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function offerLabel(g) {
  const n = g.items.length;
  const t = new Set(g.items.map((x) => x.s)).size;
  if (n === 1) return '1 oferta';
  return `${n} ofertas · ${t} ${t === 1 ? 'tienda' : 'tiendas'}`;
}

function card(g) {
  const b = g.best;
  const store = DB.storeById[b.s];
  const img = g.img
    ? `<img class="thumb" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${esc(g.img)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'thumb ph',textContent:'Sin imagen'}))"/>`
    : '<div class="thumb ph">Sin imagen</div>';
  const range = g.stores > 1 && g.max > g.min ? ` · hasta ${clp.format(g.max)}` : '';
  const isOpen = open.has(g.key);
  return `<li class="card" data-key="${esc(g.key)}">
    <div class="card-main" role="button" tabindex="0" aria-expanded="${isOpen}">
      ${img}
      <div><p class="title">${esc(b.t)}</p><div class="tags">${tagsFor(b)}</div></div>
      <div class="price">
        <div class="from">${g.stores > 1 ? 'Mejor precio' : 'Precio'}${b.a ? '' : ' (agotado)'}</div>
        <div class="amt">${clp.format(g.min)}</div>
        <div class="where">en ${esc(store?.name || b.s)}${range}</div>
        ${g.drop ? `<div class="drop">↓ bajó ${clp.format(g.drop)}</div>` : ''}
        <span class="nstores">${offerLabel(g)} ${isOpen ? '▴' : '▾'}</span>
      </div>
    </div>
    ${isOpen ? offersTable(g) : ''}
  </li>`;
}

function renderResults() {
  const list = groups.slice(0, shown);
  $('#results').innerHTML = list.map(card).join('');
  $('#more').hidden = shown >= groups.length;
  $('#more').textContent = `Mostrar más (${(groups.length - shown).toLocaleString('es-CL')} restantes)`;
  $('#empty').hidden = groups.length > 0;
  const offers = groups.reduce((n, g) => n + g.items.length, 0);
  $('#summary').textContent = `${groups.length.toLocaleString('es-CL')} productos · ${offers.toLocaleString('es-CL')} ofertas`;
}

function renderStatus() {
  const ok = DB.stores.filter((s) => s.ok !== false).length;
  const el = $('#status');
  el.className = `status ${ok === DB.stores.length ? 'ok' : 'warn'}`;
  $('#status-text').textContent = `${ok}/${DB.stores.length} tiendas · ${ago(DB.generatedAt)}`;
  el.title = `Revisado ${new Date(DB.generatedAt).toLocaleString('es-CL')}`;
}

function update(resetPage = true) {
  if (!DB) return;
  if (resetPage) shown = PAGE;
  groups = computeGroups();
  renderFacets();
  renderActive();
  renderResults();
  writeHash();
}

// ── Eventos ─────────────────────────────────────────────────────────
let qTimer;
$('#q').addEventListener('input', (e) => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => {
    state.q = e.target.value.trim();
    update();
  }, 200);
});
$('#cats').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.cat = b.dataset.cat;
  for (const t of [...state.ty]) if (state.cat && DB.types[t]?.group !== state.cat) state.ty.delete(t);
  update();
});
$('#filters').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.f) {
    const set = state[t.dataset.f];
    t.checked ? set.add(t.value) : set.delete(t.value);
  } else if (t.id === 'stock') state.stock = t.checked;
  else if (t.id === 'drops') state.drops = t.checked;
  else if (t.id === 'pmin') state.min = t.value;
  else if (t.id === 'pmax') state.max = t.value;
  else return;
  update();
});
$('#f-lang').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const v = b.dataset.v;
  state.l.has(v) ? state.l.delete(v) : state.l.add(v);
  update();
});
$('#set-search').addEventListener('input', renderFacets);
$('#sort').addEventListener('change', (e) => {
  state.sort = e.target.value;
  update();
});
$('#clear').addEventListener('click', () => {
  Object.assign(state, { q: '', ty: new Set(), l: new Set(), st: new Set(), s: new Set(), min: '', max: '', stock: true, drops: false });
  $('#set-search').value = '';
  update();
});
$('#active').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const { k, v } = b.dataset;
  if (k === 'q') state.q = '';
  else if (k === 'min' || k === 'max') state[k] = '';
  else if (k === 'drops') state.drops = false;
  else state[k].delete(v);
  update();
});
function toggleCard(el) {
  const li = el.closest('.card');
  if (!li) return;
  const key = li.dataset.key;
  open.has(key) ? open.delete(key) : open.add(key);
  const g = groups.find((x) => x.key === key);
  if (g) li.outerHTML = card(g);
}
$('#results').addEventListener('click', (e) => {
  if (e.target.closest('a')) return;
  const m = e.target.closest('.card-main');
  if (m) toggleCard(m);
});
$('#results').addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card-main')) {
    e.preventDefault();
    toggleCard(e.target);
  }
});
$('#more').addEventListener('click', () => {
  shown += PAGE;
  renderResults();
});
$('#open-filters').addEventListener('click', () => $('#filters').classList.add('open'));
$('#close-filters').addEventListener('click', () => $('#filters').classList.remove('open'));
$('#status').addEventListener('click', () => {
  $('#stores-when').textContent = `Última revisión: ${new Date(DB.generatedAt).toLocaleString('es-CL')} · Último cambio de precios: ${ago(DB.lastChangeAt)}`;
  $('#stores-list').innerHTML = DB.stores
    .map((s) => {
      const st = s.ok === false ? (s.stale ? `<span class="st" style="color:var(--warn)">⚠ con datos de ${ago(s.updatedAt)}</span>` : '<span class="st" style="color:var(--bad)">✕ sin datos</span>') : `<span class="st" style="color:var(--ok)">● ${ago(s.updatedAt)}</span>`;
      return `<li><div><a href="${esc(s.url)}" target="_blank" rel="noopener"><b>${esc(s.name)}</b></a><div class="muted small">${(s.count || 0).toLocaleString('es-CL')} productos${s.city ? ` · ${esc(s.city)}` : ''}</div></div>${st}</li>`;
    })
    .join('');
  $('#stores-dialog').showModal();
});
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && poll());
window.addEventListener('hashchange', () => {
  readHash();
  update();
});

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3500);
}

// ── Inicio ──────────────────────────────────────────────────────────
readHash();
$('#results').innerHTML = '<li class="skeleton"></li><li class="skeleton"></li><li class="skeleton"></li>';
load()
  .then(poll)
  .catch((e) => {
    $('#results').innerHTML = '';
    $('#summary').textContent = '';
    $('#empty').hidden = false;
    $('#empty').innerHTML = `<p><b>Aún no hay datos.</b></p><p class="small">${esc(e.message)}. Ejecuta <code>npm run scrape</code> o espera a la primera actualización automática.</p>`;
  });
setInterval(poll, POLL_MS);

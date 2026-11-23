// Cliente HTTP educado: se identifica, respeta robots.txt, espera entre pedidos y reintenta.
export const USER_AGENT =
  process.env.SCRAPER_UA || 'ComparadorTCGChile/1.0 (+https://github.com/; comparador de precios)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const robotsCache = new Map();

async function rawFetch(url, { timeoutMs = 30000, accept, body } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      method: body ? 'POST' : 'GET',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: accept || '*/*',
        'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── robots.txt ───────────────────────────────────────────────────────
export const robotsSitemaps = new Map();

function parseRobots(text, origin) {
  robotsSitemaps.set(origin, [...text.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]));
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  for (const line of text.split(/\r?\n/)) {
    const l = line.replace(/#.*/, '').trim();
    const m = l.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === 'allow' || key === 'disallow')) cur.rules.push({ allow: key === 'allow', path: val });
    }
  }
  const ua = USER_AGENT.split('/')[0].toLowerCase();
  const pick = groups.find((g) => g.agents.some((a) => a !== '*' && ua.includes(a))) || groups.find((g) => g.agents.includes('*'));
  return pick ? pick.rules.filter((r) => r.path) : [];
}

function ruleToRe(path) {
  const anchored = path.endsWith('$');
  const body = path.replace(/\$$/, '').replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + body + (anchored ? '$' : ''));
}

export async function sitemapsFromRobots(url) {
  await allowedByRobots(url);
  return robotsSitemaps.get(new URL(url).origin) || [];
}

export async function allowedByRobots(url) {
  const u = new URL(url);
  let rules = robotsCache.get(u.origin);
  if (!rules) {
    try {
      const res = await rawFetch(`${u.origin}/robots.txt`, { timeoutMs: 15000 });
      rules = res.ok ? parseRobots(await res.text(), u.origin) : [];
    } catch {
      rules = [];
    }
    robotsCache.set(u.origin, rules);
  }
  const target = u.pathname + u.search;
  let best = null;
  for (const r of rules) {
    if (ruleToRe(r.path).test(target) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

// ── Pedido con espera y reintentos ───────────────────────────────────
export function makeClient({ delayMs = 700, retries = 5 } = {}) {
  let last = 0;
  return async function get(url, { json = false, allow404 = false, body } = {}) {
    if (!(await allowedByRobots(url))) {
      const e = new Error(`robots.txt no permite leer ${url}`);
      e.code = 'ROBOTS';
      throw e;
    }
    for (let attempt = 0; ; attempt++) {
      const wait = last + delayMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      let res;
      try {
        res = await rawFetch(url, { body, accept: json ? 'application/json, text/event-stream' : 'text/html,application/xhtml+xml,*/*' });
      } catch (err) {
        if (attempt < retries) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        throw err;
      }
      if (res.status === 404 && allow404) return null;
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const ra = parseInt(res.headers.get('retry-after') || '', 10);
        await sleep(isFinite(ra) ? Math.min(ra, 120) * 1000 : (res.status === 429 ? 10000 : 3000) * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        const e = new Error(`HTTP ${res.status} en ${url}`);
        e.status = res.status;
        throw e;
      }
      if (!json) return { body: await res.text(), headers: res.headers, url: res.url };
      const text = await res.text();
      try {
        return { body: JSON.parse(text), headers: res.headers, url: res.url };
      } catch {
        const e = new Error(`La respuesta no es JSON: ${url}`);
        e.code = 'NOT_JSON';
        throw e;
      }
    }
  };
}

import { Auth } from './auth.js';

const GCF_BASE = 'https://us-central1-custom-family-gifts.cloudfunctions.net/v2-call';

// ---------------------------------------------------------------------------
// In-memory store — keyed by "db.col" dot notation
// ---------------------------------------------------------------------------
const store = {};

function storeUpdate(col, record, idField = '_id') {
  if (!store[col]) return;
  const idx = store[col].records.findIndex(r => r[idField] === record[idField]);
  if (idx !== -1) store[col].records[idx] = { ...store[col].records[idx], ...record };
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------
async function gcf(shortUrl, options = {}) {
  const key = Auth.getKey();
  const [fn, qs = ''] = shortUrl.split('?');
  const url = `${GCF_BASE}?cypherKey=${key}&method=${fn}${qs ? '&' + qs : ''}`;

  if (options.body) options.method = 'POST';
  if (!options.method) options.method = 'GET';
  if (!options.headers) options.headers = {};
  if (options.method !== 'GET') options.headers['Content-Type'] = 'application/json';
  options.headers.current_href = location.href;

  const res    = await fetch(url, options);
  const text   = await res.text();
  const result = JSON.parse(text);

  if (result.admin) {
    const el = document.getElementById('nav-key-label');
    if (el) el.textContent = result.admin;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Standard find — v2-mdb, writes result into store
// ---------------------------------------------------------------------------
async function find({ col, q = {}, s = {}, p = {}, per = 25, page = 1 } = {}) {
  const result = await gcf('v2-mdb', {
    body: JSON.stringify({ op: 'find', col, q, s, p, per, page }),
  });

  store[col] = {
    records: result.records,
    page:    result.page,
    per:     result.per,
    total:   result.totalcount,
  };

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const API = {
  gcf,
  find,
  store,
  storeUpdate,
};

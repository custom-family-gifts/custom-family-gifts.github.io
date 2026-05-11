import { API }        from '../core/api.js';
import { formatDate } from '../core/helpers.js';

const COL = 'cfg_log.api_error_log';

const PROJECTION = {
  name:             1,
  message:          1,
  stack:            1,
  urlParams:        1,
  body_JSON:        1,
  body_text:        1,
  headers:          1,
  DEBUG:            1,
  summaryProcessed: 1,
  created:          1,
  modified:         1,
  delete:           1,
};

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
const OID_RE = /^[a-f\d]{24}$/i;

async function fetch(state) {
  const { search } = state.filters;
  let q = {};
  if (search) {
    const t = search.trim();
    q = OID_RE.test(t)
      ? { _id: t }
      : { name: { $regex: t, $options: 'i' } };
  }
  const s = { created: -1 };
  return API.find({ col: COL, q, s, p: PROJECTION, per: state.per, page: state.page });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function jsonBlock(obj) {
  if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return null;
  return `<pre class="text-xs bg-base-300 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">${JSON.stringify(obj, null, 2)}</pre>`;
}

function debugRows(debug) {
  if (!debug || typeof debug !== 'object') return null;
  const rows = Object.entries(debug).map(([k, v]) => {
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `<tr>
      <td class="text-xs opacity-50 pr-3 align-top whitespace-nowrap">${k}</td>
      <td class="text-xs font-mono break-all">${val}</td>
    </tr>`;
  }).join('');
  return `<table class="w-full">${rows}</table>`;
}

// ---------------------------------------------------------------------------
// Drawer template
// ---------------------------------------------------------------------------
const drawerTemplate = (r) => {
  window._currentApiErrorRecord = r;

  const stackHtml = r.stack
    ? `<pre class="text-xs bg-base-300 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">${r.stack}</pre>`
    : `<div class="text-xs opacity-40">No stack trace</div>`;

  const debugHtml  = debugRows(r.DEBUG)  ?? `<div class="text-xs opacity-40">—</div>`;
  const headersHtml = jsonBlock(r.headers) ?? `<div class="text-xs opacity-40">—</div>`;
  const bodyHtml   = jsonBlock(r.body_JSON) ?? (r.body_text
    ? `<pre class="text-xs bg-base-300 rounded p-2 whitespace-pre-wrap break-all">${r.body_text}</pre>`
    : `<div class="text-xs opacity-40">—</div>`);
  const urlHtml    = jsonBlock(r.urlParams) ?? `<div class="text-xs opacity-40">—</div>`;

  return `
    <div class="space-y-3">

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-1">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Error</h3>
          <div class="text-sm font-mono text-error">${r.message || '—'}</div>
          ${r.created ? `<div class="text-xs opacity-40">${formatDate(r.created)}</div>` : ''}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Stack Trace</h3>
          ${stackHtml}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">DEBUG</h3>
          ${debugHtml}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">URL Params</h3>
          ${urlHtml}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Body</h3>
          ${bodyHtml}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Headers</h3>
          ${headersHtml}
        </div>
      </div>

    </div>
  `;
};

// ---------------------------------------------------------------------------
// Page config
// ---------------------------------------------------------------------------
export const apiErrorLog = {
  defaultSort:  'created',
  defaultOrder: -1,
  defaultPer:   50,

  drawerKey:   '_id',
  drawerTitle: (r) => r.name || 'Error',
  drawer:       drawerTemplate,

  filters: [
    { name: 'search', type: 'text', label: 'Search', placeholder: 'function name or _id…' },
  ],

  columns: [
    {
      key:    'name',
      label:  'GCF',
      render: (val) => `<div class="text-sm font-mono">${val || '—'}</div>`,
    },
    {
      key:    'created',
      label:  'Datetime',
      render: (val) => val
        ? `<span class="text-xs opacity-60">${formatDate(val)}</span>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
    {
      key:    'message',
      label:  'Message',
      render: (val) => `<div class="text-sm text-error">${val || '—'}</div>`,
    },
    {
      key:    'DEBUG',
      label:  'Caller',
      render: (val) => val?.gcf_caller
        ? `<div class="text-xs font-mono">${val.gcf_caller}</div>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
  ],

  fetch,
};

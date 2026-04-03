import { API }        from '../core/api.js';
import { formatDate, formatPhone } from '../core/helpers.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Exact Airtable single-select values → [bg, text]
const PIPELINE_COLORS = {
  'HOLD':                    ['#616670', '#ffffff'],
  'ART: Re-Proof':           ['#7C37EF', '#ffffff'],
  'ART: Proof Me':           ['#FFBA05', '#000000'],
  'ART: Done':               ['#048A0E', '#ffffff'],
  'PROOF RDY: Review':       ['#9AE095', '#000000'],
  'PROOF RDY: Email Cust':   ['#048A0E', '#ffffff'],
  'PROOF SENT: waiting':     ['#C4ECFF', '#000000'],
  'APPROVED: Print Me':      ['#39CAFF', '#000000'],
  'PRINTED: Check Delivery': ['#A0C6FF', '#000000'],
  'Delivered':               ['#C4C7CD', '#000000'],
  'Cancelled':               ['#E5E9F0', '#000000'],
};

const ARTIST_COLORS = {
  'Glecy':   ['#56d2ff', '#000000'],
  'Enzo':    ['#e12958', '#ffffff'],
  'Shirley': ['#316cb8', '#ffffff'],
  'Peter':   ['#ffb68e', '#000000'],
  'Lili':    ['#ffdc81', '#000000'],
  'Celina':  ['#7c37ef', '#ffffff'],
  'Ira':     ['#5d6167', '#ffffff'],
  'Janine':  ['#a9e5a5', '#000000'],
};

const artistBadge = (val) => {
  if (!val) return '';
  const [bg, color] = ARTIST_COLORS[val] ?? ['#E5E9F0', '#000000'];
  return `<span class="badge" style="background:${bg};color:${color};border-color:${bg}">${val}</span>`;
};

const pipelineBadge = (val) => {
  if (!val) return '—';
  const colors = PIPELINE_COLORS[val];
  const [bg, color] = colors ?? ['#ef4444', '#ffffff']; // bright red for unknown values
  return `<span class="badge" style="background:${bg};color:${color};border-color:${bg}">${val}</span>`;
};

const COL = 'cfg.orders';

const _schema = (title, fields) => ({ title, collection: COL, idField: 'orderId_raw', endpoint: 'v2-atmdb', fields });

const ORDER_SCHEMAS = {
  pipeline: _schema('Edit Pipeline', [
    { key: 'pipeline',     label: 'Pipeline',     type: 'select', nullable: false,
      options: ['HOLD', 'ART: Re-Proof', 'ART: Proof Me', 'ART: Done', 'PROOF RDY: Review', 'PROOF RDY: Email Cust', 'PROOF SENT: waiting', 'APPROVED: Print Me', 'PRINTED: Check Delivery', 'Delivered', 'Cancelled'] },
    { key: 'chosen_proof', label: 'Chosen Proof', type: 'text', validate: 'proof' },
  ]),
  addons: _schema('Edit Addons', [
    { key: 'isPriority',            label: 'Priority',          type: 'checkbox' },
    { key: 'Needs Digital Art',     label: 'Needs Digital Art', type: 'checkbox' },
    { key: 'email_digital_art_sent', label: 'Digital Art Sent', type: 'datetime', hint: 'Clear this date to trigger a resend of the digital art email.' },
  ]),
  shipping: _schema('Edit Shipping', [
    { key: 'shipAddress', label: 'Ship Address', type: 'textarea', rows: 4 },
  ]),
  options: _schema('Edit Options', [
    { key: 'options', label: 'Options', type: 'textarea', rows: 6 },
  ]),
  printNote: _schema('Edit Print / Gift Note', [
    { key: 'print_note',         label: 'Print Note', type: 'textarea', rows: 3, hint: 'Content here will block printing.' },
    { key: 'to_print_gift_note', label: 'Gift Note',  type: 'textarea', rows: 3, hint: 'Copy from print_note when appropriate' },
  ]),
  customer: _schema('Edit Customer', [
    { key: 'custFirst', label: 'First Name',   type: 'text', validate: 'required' },
    { key: 'custLast',  label: 'Last Name',    type: 'text', validate: 'required' },
    { key: 'email',     label: 'Email',        type: 'text', validate: ['required', 'email'] },
    { key: 'custPhone', label: 'Phone',        type: 'text' },
  ]),
};

const GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.869a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>`;

const PROJECTION = {
  orderId_raw:                       1,
  customer:                          1,
  custFirst:                         1,
  custLast:                          1,
  email:                             1,
  custPhone:                         1,
  artist:                            1,
  pipeline:                          1,
  chosen_proof:                      1,
  items:                             1,
  options:                           1,
  created_shopify_order:             1,
  isPriority:                        1,
  etsy_receipt_id:                   1,
  etsy_receipt_id_saved:             1,
  shopifyOrderId:                    1,
  customer_order_link:               1,
  'order link':                      1,
  etsy_link:                         1,
  at_record_id:                      1,
  print_note:                        1,
  to_print_gift_note:                1,
  'Internal - newest on top please': 1,
  sent_proofs_record: 1,
  'Needs Digital Art': 1,
  email_digital_art_sent: 1,
  shipAddress: 1,
};

// ---------------------------------------------------------------------------
// Fetch — list
// ---------------------------------------------------------------------------
async function fetch(state) {
  const { search, options, notes } = state.filters;
  const filterQueries = [];

  if (search) {
    const clean = search.trim();
    if (clean.charAt(0) === '#' && !isNaN(clean.substring(1))) {
      filterQueries.push({ orderId_raw: +clean.substring(1) });
    } else if (!isNaN(clean.replace(/[-()]/g, ''))) {
      filterQueries.push({ $or: [
        { etsy_receipt_id:    { $regex: clean } },
        { orderId_raw:        +clean },
        { custPhoneSanitized: { $regex: clean.replace(/\D/g, '') } },
      ]});
    } else {
      filterQueries.push({ $or: [
        { customer:    { $regex: clean, $options: 'i' } },
        { shipAddress: { $regex: clean, $options: 'i' } },
      ]});
    }
  }

  if (options) {
    filterQueries.push({ options: { $regex: options.trim(), $options: 'i' } });
  }

  if (notes) {
    filterQueries.push({ $or: [
      { 'Internal - newest on top please': { $regex: notes.trim(), $options: 'i' } },
      { print_note:                        { $regex: notes.trim(), $options: 'i' } },
    ]});
  }

  const q = filterQueries.length === 0 ? {} :
            filterQueries.length === 1 ? filterQueries[0] :
            { $and: filterQueries };

  const s = state.sort ? { [state.sort]: state.order } : { orderId_raw: -1 };

  return API.find({ col: COL, q, s, p: PROJECTION, per: state.per, page: state.page });
}

// ---------------------------------------------------------------------------
// Fetch one — enriched record for the drawer
// ---------------------------------------------------------------------------
async function fetchOne(record) {
  const result = await API.gcf(`v2-getCustomerOrder?orderId=${record.orderId_raw}`);
  API.storeUpdate(COL, result, 'orderId_raw');
  return result;
}

// ---------------------------------------------------------------------------
// Tab: Main — order details
// ---------------------------------------------------------------------------
const _cardHead = (label, schemaKey) => `
  <div class="flex items-center justify-between gap-1">
    <h3 class="text-xs uppercase tracking-wide opacity-60">${label}</h3>
    <button onclick="window._orderEdit('${schemaKey}')" class="btn btn-xs btn-ghost btn-circle -mr-1" title="Edit">${GEAR_SVG}</button>
  </div>`;

const mainTab = (r) => {
  window._currentOrderRecord = r;
  return `
  <div class="grid grid-cols-2 gap-2">

    <!-- Left column -->
    <div class="space-y-2">

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-1">
          ${_cardHead('Pipeline / Chosen Proof', 'pipeline')}
          <div class="space-y-1 text-sm">
            <div>${pipelineBadge(r.pipeline)}</div>
            ${r.chosen_proof ? `<div class="flex gap-1 flex-wrap">
              ${r.chosen_proof.split(',').map(s => `<span class="badge" style="background:#22c55e;color:#fff;border-color:#22c55e">${s.trim().toUpperCase()}</span>`).join('')}
            </div>` : ''}
          </div>
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-1">
          ${_cardHead('Priority / Digital', 'addons')}
          ${(r.isPriority || r['Needs Digital Art']) ? `
          <div class="space-y-1 text-sm">
            ${r.isPriority           ? `<div>⭐ Priority</div>`    : ''}
            ${r['Needs Digital Art'] ? `<div>✅ Digital Art</div>` : ''}
            ${r.email_digital_art_sent
              ? `<div class="text-xs opacity-60">✉️ Digital sent ${new Date(r.email_digital_art_sent).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>`
              : ''}
          </div>` : ''}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-1">
          ${_cardHead('Shipping', 'shipping')}
          ${r.shipAddress
            ? `<div class="text-sm whitespace-pre-wrap">${r.shipAddress}</div>`
            : `<div class="text-sm opacity-30">—</div>`}
        </div>
      </div>

    </div>

    <!-- Right column -->
    <div class="space-y-2">

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-1">
          ${_cardHead('Print / Gift Note', 'printNote')}
          ${(r.print_note || r.to_print_gift_note) ? `
          <div class="space-y-1.5 text-sm">
            ${r.print_note
              ? `<div><span class="text-xs uppercase tracking-wide opacity-50">Print Note</span><div class="whitespace-pre-wrap">${r.print_note}</div></div>`
              : ''}
            ${r.to_print_gift_note
              ? `<div><span class="text-xs uppercase tracking-wide opacity-50">Gift Note</span><div class="whitespace-pre-wrap">${r.to_print_gift_note}</div></div>`
              : ''}
          </div>` : ''}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-1">
          ${_cardHead('Options', 'options')}
          ${r.options
            ? `<div class="text-sm leading-relaxed">${r.options.replace(/\n/g, '<br>')}</div>`
            : `<div class="text-sm opacity-30">—</div>`}
        </div>
      </div>

    </div>

  </div>
`;};

// ---------------------------------------------------------------------------
// Tab: Messages
// ---------------------------------------------------------------------------
const messagesTab = (r) => {
  if (!r.messages?.length) {
    return `<p class="text-sm text-base-content/40 text-center py-12">No messages</p>`;
  }

  const sorted = [...r.messages].sort((a, b) => new Date(b.created) - new Date(a.created));

  const via = (m) => {
    if (m.to === 'CFG Etsy'  || m.from === 'CFG Etsy')  return 'Etsy';
    if (m.to === 'CFG SMS'   || m.from === 'CFG SMS')   return 'SMS';
    if (m.source_name === 'Portal') return 'Form';
    return 'Email';
  };

  return `
    <div class="space-y-3">
      ${sorted.map(m => {
        const isUs = m.from_2 === 'us';
        return `
          <div class="card ${isUs ? 'bg-primary/10 border border-primary/20' : 'bg-base-200'}">
            <div class="card-body py-3 px-4 gap-1.5">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold ${isUs ? 'text-primary' : 'text-base-content/70'}">
                    ${isUs ? 'CFG' : (m.from || 'Customer')}
                  </span>
                  <span class="badge badge-xs badge-ghost">${via(m)}</span>
                </div>
                <span class="text-xs text-base-content/40">${m.created ? formatDate(m.created) : ''}</span>
              </div>
              ${m.subject ? `<div class="text-xs font-medium text-base-content/70">${m.subject}</div>` : ''}
              <div class="text-sm leading-relaxed">${m.html || m.text || '(no content)'}</div>
              ${m.attachments?.length ? `
                <div class="text-xs text-base-content/40 mt-1">
                  📎 ${m.attachments.map(a => a.name).join(', ')}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

// ---------------------------------------------------------------------------
// Tab: Prints — print note, internal notes, proofs
// ---------------------------------------------------------------------------
const printsTab = (r) => {
  const parts = [];

  if (r.print_note) {
    parts.push(`
      <div class="alert alert-info text-sm py-2">
        <span><strong>Print Note:</strong> ${r.print_note}</span>
      </div>
    `);
  }

  if (r['Internal - newest on top please']) {
    parts.push(`
      <div class="card bg-warning/10 border border-warning/30">
        <div class="card-body py-3 px-4 gap-1">
          <h4 class="text-xs uppercase tracking-wide opacity-60">Internal Notes</h4>
          <div class="text-sm whitespace-pre-wrap">${r['Internal - newest on top please']}</div>
        </div>
      </div>
    `);
  }

  if (r.auto_proof_files?.length) {
    const chosen = (r.chosen_proof || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    const proofRows = r.auto_proof_files
      .slice().sort((a, b) => (a.filename > b.filename ? 1 : -1))
      .map(f => {
        const letter    = f.filename?.split('_')[1]?.toLowerCase() ?? '?';
        const num       = +f.filename?.split('_')[0];
        const prefix    = Math.floor(num / 100);
        const approved  = chosen.includes(letter);
        const url       = f.url
          ?? `https://custom-family-gifts.s3.us-east-2.amazonaws.com/${prefix}00-${prefix}99/${num}/_proofs/${num}_${letter}_proof.jpg`;
        return `
          <div class="flex items-center gap-3 text-sm py-1">
            <a href="${url}" target="_blank" class="link link-primary font-mono">
              Proof ${letter.toUpperCase()}
            </a>
            ${f.date ? `<span class="text-xs text-base-content/40">${formatDate(f.date)}</span>` : ''}
            ${approved ? `<span class="badge badge-success badge-sm ml-auto">✔ approved</span>` : ''}
          </div>
        `;
      }).join('');

    parts.push(`
      <div class="card bg-base-200">
        <div class="card-body py-4 gap-1">
          <h3 class="card-title text-sm uppercase tracking-wide opacity-60">Proofs</h3>
          ${proofRows}
        </div>
      </div>
    `);
  }

  if (!parts.length) {
    return `<p class="text-sm text-base-content/40 text-center py-12">No print info</p>`;
  }

  return `<div class="space-y-4">${parts.join('')}</div>`;
};

// ---------------------------------------------------------------------------
// Page config
// ---------------------------------------------------------------------------
export const orders = {
  defaultSort:  'orderId_raw',
  defaultOrder: -1,
  defaultPer:   25,

  drawerKey:   'orderId_raw',
  drawerTitle: (r) => {
    const priority = r.isPriority ? '⭐ ' : '';
    const etsy     = (r.etsy_receipt_id || r.etsy_receipt_id_saved) ? ` <span class="text-orange-400 text-xs">🍊</span>` : '';
    const artist   = r.artist ? `&nbsp;&nbsp;${artistBadge(r.artist)}` : '';
    return `${priority}<span class="font-mono">#${r.orderId_raw}</span>${etsy}${artist}`;
  },

  drawerOverview: (r) => {
    const name  = [r.custFirst, r.custLast].filter(Boolean).join(' ') || r.customer || '—';
    const items = r.items ? r.items.split('\n').filter(Boolean) : [];

    // Pick chosen proof thumbnail, or first available — launches ArtBrowser on click
    let proofHtml = '';
    if (r.sent_proofs_record && r.orderId_raw) {
      const letters = r.sent_proofs_record.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const chosen  = (r.chosen_proof || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const letter  = letters.find(l => chosen.includes(l)) ?? letters.at(-1);
      const id      = r.orderId_raw;
      const prefix  = Math.floor(id / 100);
      const thumb   = `https://custom-family-gifts.s3.us-east-2.amazonaws.com/${prefix * 100}-${prefix * 100 + 99}/${id}/_proofs/${id}_${letter}_proof.jpg`;
      proofHtml = `
        <button class="shrink-0" onclick="window._ArtBrowser.open(${id},${prefix},'${r.sent_proofs_record}','${letter}')">
          <img src="${thumb}" alt="Proof ${letter.toUpperCase()}"
            class="w-16 h-16 object-cover rounded shadow-sm hover:opacity-80 transition-opacity" />
        </button>
      `;
    }

    const phone = formatPhone(r.custPhone);
    return `
      <div class="flex gap-3 items-start">
        ${proofHtml}
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1">
            <div class="font-medium text-sm">${name}</div>
            <button onclick="window._orderEdit('customer')" class="btn btn-xs btn-ghost btn-circle -my-1" title="Edit customer">${GEAR_SVG}</button>
          </div>
          ${r.email
            ? r.email.startsWith('customfamilygifts4+')
              ? `<div class="text-xs opacity-30">no email</div>`
              : `<div class="text-xs text-base-content/50 truncate">${r.email}</div>`
            : ''}
          ${phone   ? `<div class="text-xs text-base-content/50">${phone}</div>` : ''}
          ${items.length ? `
            <div class="mt-1.5 space-y-0.5">
              ${items.map(line => `<div class="text-xs text-base-content/70">${line}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  drawerTabs: [
    {
      id:     'main',
      label:  'Main',
      render: mainTab,
    },
    {
      id:     'messages',
      label:  'Messages',
      count:  (r) => r.messages?.length ?? 0,
      render: messagesTab,
    },
    {
      id:     'prints',
      label:  'Prints',
      count:  (r) => r.auto_proof_files?.length ?? 0,
      render: printsTab,
    },
  ],

  filters: [
    { name: 'search',  type: 'text', label: 'Search',  placeholder: '#id, name, phone, email…' },
    { name: 'options', type: 'text', label: 'Options', placeholder: 'James & Neal…' },
    { name: 'notes',   type: 'text', label: 'Notes',   placeholder: 'print or internal…' },
  ],

  columns: [
    {
      key:      'orderId_raw',
      label:    'Order',
      sortable: true,
      render:   (val, r) => {
        let out = `${r.isPriority ? '⭐ ' : ''}<span class="font-mono">#${val}</span>`;
        if (r.etsy_receipt_id || r.etsy_receipt_id_saved) {
          out += ` <span class="text-orange-400 text-xs">🍊</span>`;
        }
        if (r.created_shopify_order) {
          out += `<br><span class="text-xs opacity-50">${formatDate(r.created_shopify_order)}</span>`;
        }
        return out;
      },
    },
    {
      key:    'sent_proofs_record',
      label:  'Art',
      render: (val, r) => {
        if (!val || !r.orderId_raw) return '';
        const letters = val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (!letters.length) return '';
        const letter = letters.at(-1);
        const id     = r.orderId_raw;
        const prefix = Math.floor(id / 100);
        const thumb  = `https://custom-family-gifts.s3.us-east-2.amazonaws.com/${prefix * 100}-${prefix * 100 + 99}/${id}/_proofs/${id}_${letter}_proof.jpg`;
        return `<button onclick="event.stopPropagation();window._ArtBrowser.open(${id},${prefix},'${val}','${letter}')">
          <img src="${thumb}" alt="Proof ${letter.toUpperCase()}" class="w-12 h-12 object-cover rounded shadow-sm hover:opacity-80 transition-opacity" />
        </button>`;
      },
    },
    {
      key:    'chosen_proof',
      label:  '✔️',
      render: (val) => {
        if (!val) return '';
        const badges = val.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        return `<div class="flex flex-col gap-1">
          ${badges.map(b => `<span class="badge" style="background:#22c55e;color:#fff;border-color:#22c55e">${b}</span>`).join('')}
        </div>`;
      },
    },
    {
      key:    'customer',
      label:  'Customer',
      render: (val, r) => {
        const name = (r.custFirst || r.custLast)
          ? `${r.custFirst || ''} ${r.custLast || ''}`.trim()
          : val || '—';
        const phone = formatPhone(r.custPhone);
        const emailDisplay = r.email?.startsWith('customfamilygifts4+')
          ? `<div class="text-xs opacity-30">no email</div>`
          : r.email ? `<div class="text-xs opacity-50">${r.email}</div>` : '';
        return `<div>${name}</div>${emailDisplay}${phone ? `<div class="text-xs opacity-50">${phone}</div>` : ''}`;
      },
    },
    {
      key:    'pipeline',
      label:  'Pipeline',
      render: (val) => pipelineBadge(val),
    },
    {
      key:    'artist',
      label:  'Artist',
      render: (val) => artistBadge(val),
    },
    {
      key:          'items',
      label:        'Items',
      hideOnMobile: true,
      render: (val) => {
        if (!val || !val.length) return '—';
        return val.split('\n').filter(Boolean).map(line =>
          `<div class="text-xs">${line}</div>`
        ).join('');
      },
    },
  ],

  fetch,
  fetchOne,
};

window._orderEdit = (schemaKey) => {
  window._CrudForm.open(ORDER_SCHEMAS[schemaKey], window._currentOrderRecord);
};

// ---------------------------------------------------------------------------
// Art Browser — proof/final image viewer with pan/zoom
// ---------------------------------------------------------------------------
const ArtBrowser = (() => {
  let _id, _prefix, _letters, _idx, _mode;
  let _scale, _tx, _ty, _dragStart;

  const S3 = 'https://custom-family-gifts.s3.us-east-2.amazonaws.com';

  function _range()      { return `${_prefix * 100}-${_prefix * 100 + 99}`; }
  function _proofUrl(l)  { return `${S3}/${_range()}/${_id}/_proofs/${_id}_${l}_proof.jpg`; }
  function _finalUrl(l)  { return `${S3}/${_range()}/${_id}/${_id}_${l}_final.jpg`; }
  function _activeUrl(l) { return _mode === 'proof' ? _proofUrl(l) : _finalUrl(l); }

  function _applyTransform() {
    document.getElementById('pm-img').style.transform =
      `translate(${_tx}px, ${_ty}px) scale(${_scale})`;
  }

  function _resetTransform() {
    _scale = 1; _tx = 0; _ty = 0;
    _applyTransform();
  }

  function _bindPanZoom() {
    const wrap = document.getElementById('pm-img-wrap');

    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta  = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(10, Math.max(1, _scale * delta));
      // Zoom toward cursor position
      const rect  = wrap.getBoundingClientRect();
      const mx    = e.clientX - rect.left - rect.width  / 2;
      const my    = e.clientY - rect.top  - rect.height / 2;
      _tx = mx + (_tx - mx) * (newScale / _scale);
      _ty = my + (_ty - my) * (newScale / _scale);
      _scale = newScale;
      if (_scale === 1) { _tx = 0; _ty = 0; }
      _applyTransform();
    }, { passive: false });

    wrap.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (_scale === 1) return;
      _dragStart = { x: e.clientX - _tx, y: e.clientY - _ty };
      wrap.style.cursor = 'grabbing';

      function onMove(e) {
        _tx = e.clientX - _dragStart.x;
        _ty = e.clientY - _dragStart.y;
        _applyTransform();
      }
      function onUp() {
        wrap.style.cursor = 'grab';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  function _html() {
    return `
      <div id="pm-img-wrap"
           class="overflow-hidden bg-base-200 flex items-center justify-center"
           style="height:70vh; cursor:grab; user-select:none">
        <img id="pm-img" src="" alt="Proof"
             style="max-width:100%; max-height:70vh; display:block;
                    transform-origin:center center;
                    transition:opacity 0.15s ease" />
      </div>
      <div class="flex items-center justify-between gap-3 px-3 py-2 border-t border-base-300">
        <div id="pm-letters" class="flex gap-1 flex-wrap"></div>
        <div class="flex gap-2 shrink-0 items-center">
          <div class="join">
            <button id="pm-mode-proof" class="join-item btn btn-xs btn-primary"
              onclick="window._ArtBrowser.setMode('proof')">Proof</button>
            <button id="pm-mode-final" class="join-item btn btn-xs btn-ghost"
              onclick="window._ArtBrowser.setMode('final')">Final</button>
          </div>
          <a id="pm-dl" class="btn btn-xs btn-ghost" target="_blank">↓ Download</a>
        </div>
      </div>
    `;
  }

  function _update() {
    const l     = _letters[_idx];
    const imgEl = document.getElementById('pm-img');

    imgEl.style.opacity = '0.15';
    imgEl.onload  = () => { imgEl.style.opacity = '1'; _resetTransform(); };
    imgEl.onerror = () => { imgEl.style.opacity = '1'; };
    imgEl.src = _activeUrl(l);

    document.getElementById('pm-letters').innerHTML = _letters.map((letter, i) =>
      `<button class="btn btn-xs ${i === _idx ? 'btn-primary' : 'btn-ghost'}"
         onclick="window._ArtBrowser.go(${i})">${letter.toUpperCase()}</button>`
    ).join('');

    document.getElementById('pm-mode-proof').className =
      `join-item btn btn-xs ${_mode === 'proof' ? 'btn-primary' : 'btn-ghost'}`;
    document.getElementById('pm-mode-final').className =
      `join-item btn btn-xs ${_mode === 'final'  ? 'btn-primary' : 'btn-ghost'}`;

    const dl    = document.getElementById('pm-dl');
    dl.href     = _activeUrl(l);
    dl.download = `${_id}_${l}_${_mode}.jpg`;
  }

  function open(orderId, orderPrefix, lettersStr, clickedLetter) {
    _id      = orderId;
    _prefix  = orderPrefix;
    _letters = lettersStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    _idx     = Math.max(0, _letters.indexOf(clickedLetter));
    _mode    = 'proof';

    window._Modal.open(_html(), `#${_id} Art`, { boxClass: 'max-w-4xl', bodyClass: 'p-0' });
    _resetTransform();
    _update();
    _bindPanZoom();
  }

  function go(i)      { _idx = i; _resetTransform(); _update(); }
  function setMode(m) { _mode = m; _resetTransform(); _update(); }

  return { open, go, setMode };
})();

window._ArtBrowser = ArtBrowser;

import { API }        from '../core/api.js';
import { Auth }       from '../core/auth.js';
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
    { key: 'shipAddFname',   label: 'First Name', type: 'text', validate: 'required' },
    { key: 'shipAddLname',   label: 'Last Name',  type: 'text', validate: 'required' },
    { key: 'shipAddStreet1', label: 'Street 1',   type: 'text', validate: 'required' },
    { key: 'shipAddStreet2', label: 'Street 2',   type: 'text' },
    { key: 'shipAddCity',    label: 'City',       type: 'text', validate: 'required' },
    { key: 'shipAddState',   label: 'State',      type: 'text', maxlength: 2, hint: '2-letter code (e.g. CA)' },
    { key: 'shipAddZip',     label: 'Zip',        type: 'text' },
    { key: 'shipAddCountry', label: 'Country',    type: 'text', validate: 'required', maxlength: 2, hint: '2-letter code (e.g. US)' },
  ]),
  options: _schema('Edit Options', [
    { key: 'options', label: 'Options', type: 'textarea', rows: 6 },
  ]),
  printNote: _schema('Edit Print / Gift Note', [
    { key: 'print_note',         label: 'Print Note', type: 'textarea', rows: 3, hint: 'Content here will block printing.' },
    { key: 'to_print_gift_note', label: 'Gift Note',  type: 'textarea', rows: 3, hint: 'Copy from print_note when appropriate' },
  ]),
  sentProofs: _schema('Edit Sent Proofs', [
    { key: 'sent_proofs_record', label: 'Sent Proofs', type: 'text', hint: 'Comma delimited, no spaces. Delete to allow resending of a previously sent proof.' },
  ]),
  customer: _schema('Edit Customer', [
    { key: 'custFirst',    label: 'First Name',      type: 'text', validate: 'required' },
    { key: 'custLast',     label: 'Last Name',        type: 'text', validate: 'required' },
    { key: 'email',        label: 'Email',            type: 'text', validate: ['required', 'email'] },
    { key: 'custPhone',    label: 'Phone',            type: 'text' },
    { key: 'shipAddFname', label: 'Ship First Name',  type: 'text', validate: 'required' },
    { key: 'shipAddLname', label: 'Ship Last Name',   type: 'text', validate: 'required' },
  ]),
};

const ITEM_PRODUCTS = [
  'Adventure Map', 'Heart Map', 'Journey', 'Wanderlust',
  'Summit Map', 'Terra Carta', 'Admiration', 'Mapertures',
];

const TRASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`;

const GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.869a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>`;

const PROJECTION = {
  orderId_raw:                       1,
  customer:                          1,
  custFirst:                         1,
  custLast:                          1,
  email:                             1,
  custPhone:                         1,
  shipAddFname:                      1,
  shipAddLname:                      1,
  shipAddStreet1:                    1,
  shipAddStreet2:                    1,
  shipAddCity:                       1,
  shipAddState:                      1,
  shipAddZip:                        1,
  shipAddCountry:                    1,
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
  digital_file_url: 1,
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
          <div class="flex gap-1 flex-wrap items-center text-sm">
            ${pipelineBadge(r.pipeline)}
            ${r.chosen_proof ? r.chosen_proof.split(',').map(s => `<span class="badge" style="background:#22c55e;color:#fff;border-color:#22c55e">${s.trim().toUpperCase()}</span>`).join('') : ''}
          </div>
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-1">
          ${_cardHead('Priority / Digital', 'addons')}
          ${(r.isPriority || r['Needs Digital Art'] || r.email_digital_art_sent) ? `
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
          ${(r.shipAddFname || r.shipAddStreet1) ? `
          <div class="text-sm space-y-0.5">
            ${(r.shipAddFname || r.shipAddLname) ? `<div>${[r.shipAddFname, r.shipAddLname].filter(Boolean).join(' ')}</div>` : ''}
            ${r.shipAddStreet1 ? `<div>${r.shipAddStreet1}</div>` : ''}
            ${r.shipAddStreet2 ? `<div>${r.shipAddStreet2}</div>` : ''}
            ${(r.shipAddCity || r.shipAddState || r.shipAddZip) ? `<div>${[r.shipAddCity, r.shipAddState, r.shipAddZip].filter(Boolean).join(', ')}</div>` : ''}
            ${r.shipAddCountry ? `<div>${r.shipAddCountry}</div>` : ''}
          </div>` : `<div class="text-sm opacity-30">—</div>`}
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
              ? `<div><span class="text-xs uppercase tracking-wide opacity-50">Print Note</span><div class="whitespace-pre-wrap">🛑 ${r.print_note}</div></div>`
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
// Internal notes — parser + tab + compose
// ---------------------------------------------------------------------------
const NOTES_FIELD = 'Internal - newest on top please';

function parseInternalNotes(raw) {
  if (!raw) return [];
  const structured = [];
  const re = /\|\|(\w+)@([^!]+)!!\n([\s\S]*?)==END==/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    structured.push({ author: match[1], ts: match[2].trim(), body: match[3].trim() });
  }
  // Anything that didn't parse — surface as a single legacy block
  const remainder = raw.replace(/\|\|\w+@[^!]+!!\n[\s\S]*?==END==/g, '').trim();
  if (remainder) structured.push({ author: null, ts: null, body: remainder });
  return structured;
}

function _linkify(text) {
  return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="link link-primary break-all">$1</a>');
}

function _noteCard(note) {
  const header = note.author
    ? `<div class="flex items-center justify-between gap-2 mb-1">
         <span class="text-xs font-semibold opacity-90">${note.author}</span>
         <span class="text-xs opacity-60">${formatDate(note.ts)}</span>
       </div>`
    : `<div class="text-xs opacity-60 mb-1">Legacy / unformatted</div>`;
  return `
    <div class="card" style="background:#c75c3a;border-color:#c75c3a;color:#fff">
      <div class="card-body py-3 px-4 gap-0">
        ${header}
        <div class="text-sm whitespace-pre-wrap">${_linkify(note.body)}</div>
      </div>
    </div>`;
}

const notesTab = (r) => {
  window._currentOrderRecord = r;
  const notes = parseInternalNotes(r[NOTES_FIELD]);
  return `
    <style>#overview-internal-note { display: none }</style>
    <div class="flex flex-col gap-3">
      <!-- Compose -->
      <div class="flex flex-col gap-2">
        <div id="note-compose" class="hidden flex-col gap-2">
          <textarea id="note-input" rows="3"
            class="textarea textarea-bordered textarea-sm w-full resize-none"
            placeholder="Write a note…"></textarea>
          <div id="note-error" class="text-error text-xs hidden"></div>
        </div>
        <div class="flex justify-end">
          <button id="note-action-btn" onclick="window._noteComposeToggle()" class="btn btn-primary btn-sm">Add Internal Note</button>
        </div>
      </div>
      <!-- Existing notes -->
      ${notes.length
        ? notes.map(_noteCard).join('')
        : `<p class="text-sm text-base-content/40 text-center py-8">No notes yet</p>`}
    </div>`;
};

window._noteComposeToggle = () => {
  const compose = document.getElementById('note-compose');
  const btn     = document.getElementById('note-action-btn');
  if (!compose.classList.contains('hidden')) {
    // Already open — submit
    window._submitInternalNote();
    return;
  }
  compose.classList.remove('hidden');
  compose.classList.add('flex');
  btn.textContent = 'Post Note';
  document.getElementById('note-input')?.focus();
};

window._submitInternalNote = async () => {
  const input  = document.getElementById('note-input');
  const errEl  = document.getElementById('note-error');
  const btn    = document.getElementById('note-action-btn');
  const text   = input?.value?.trim();
  if (!text) {
    errEl.textContent = 'Note cannot be blank.';
    errEl.classList.remove('hidden');
    return;
  }

  errEl.classList.add('hidden');
  btn.disabled  = true;
  btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

  try {
    await API.gcf('v2-addOrderInternalNote', {
      body: JSON.stringify({
        orderId:   window._currentOrderRecord.orderId_raw,
        message:   text,
        admin_key: Auth.getKey(),
      }),
    });
    const updated = await fetchOne(window._currentOrderRecord);
    window._Drawer?.refresh(updated);
    window._Drawer?.switchTab('notes');
  } catch (err) {
    errEl.textContent = err.message || 'Failed to save note.';
    errEl.classList.remove('hidden');
    btn.disabled    = false;
    btn.textContent = 'Post Note';
  }
};

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
      <div class="card" style="background:#c75c3a;border-color:#c75c3a;color:#fff">
        <div class="card-body py-3 px-4 gap-1">
          <h4 class="text-xs uppercase tracking-wide opacity-70">Internal Notes</h4>
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
// Tab: To Print — fields needed at print time
// ---------------------------------------------------------------------------
const toPrintTab = (r) => {
  window._currentOrderRecord = r;
  const parts = [];

  if (r.print_note) {
    parts.push(`
      <div class="alert alert-warning text-sm py-2">
        <span><strong>🛑 Print Note:</strong> ${r.print_note}</span>
      </div>
    `);
  }

  if (r.to_print_gift_note) {
    parts.push(`
      <div class="card bg-base-200">
        <div class="card-body py-3 px-4 gap-1">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Gift Note</h3>
          <div class="text-sm whitespace-pre-wrap">${r.to_print_gift_note}</div>
        </div>
      </div>
    `);
  }

  if (r.to_prints?.length) {
    const cards = r.to_prints.map(tp => {
      const rows = [
        tp.printer?.length            ? `<div class="text-xs text-base-content/50">Printer: ${tp.printer.join(', ')}</div>` : '',
        tp.print_choice_frame?.length ? `<div class="text-xs text-base-content/50">Frame: ${tp.print_choice_frame.join(', ')}</div>` : '',
        tp.print_choice_size?.length  ? `<div class="text-xs text-base-content/50">Size: ${tp.print_choice_size.join(', ')}</div>` : '',
        tp['2_chosen_proof']          ? `<div class="text-xs text-base-content/50">Chosen Proof: ${tp['2_chosen_proof']}</div>` : '',
      ].filter(Boolean).join('');
      return `
        <div class="card bg-base-200">
          <div class="card-body py-3 px-4 gap-1">
            <div class="flex items-center justify-between gap-1">
              <h3 class="text-sm font-bold">To_Print #${tp.to_print_id}</h3>
              <button onclick="window._toPrintDelete(${tp.to_print_id})" class="btn btn-xs btn-ghost btn-circle -mr-1" title="Delete">${TRASH_SVG}</button>
            </div>
            ${rows}
          </div>
        </div>`;
    }).join('');
    parts.push(cards);
  }

  return `
    <div class="space-y-4">
      ${parts.join('')}
      <button onclick="window._toPrintAdd('${r.at_record_id}', ${r.orderId_raw})"
        class="btn btn-sm btn-outline w-full">+ Add To Print</button>
    </div>`;
};

// ---------------------------------------------------------------------------
// Tab: Misc
// ---------------------------------------------------------------------------
const miscTab = (r) => {
  window._currentOrderRecord = r;
  const id = r.orderId_raw;
  const actionBtns = [
    `<div class="flex flex-col gap-0.5">
      <button id="misc-act-art-done"
          onclick="window._miscAction('misc-act-art-done', 'v2-autoproofMaster?orderId=${id}', 'Process Art Done')"
          class="btn btn-sm btn-outline self-start">Process Art Done</button>
      <p class="text-xs text-base-content/40">Forces art in ART: Done to generate proofs and S3 links now.</p>
    </div>`,
    ...(r.chosen_proof ? [
      `<div class="flex flex-col gap-0.5">
        <button id="misc-act-digital-link"
            onclick="window._miscAction('misc-act-digital-link', 'v2-generateDigitalShareLinks?force=1&orderId=${id}', 'Generate Digital Link')"
            class="btn btn-sm btn-outline self-start">Generate Digital Link</button>
        <p class="text-xs text-base-content/40">Generate Google Drive Links (shareable) for current chosen_proofs.</p>
      </div>`,
    ] : []),
  ];

  const parts = [
    `<div class="card bg-base-200">
      <div class="card-body py-3 px-4 gap-2">
        <h3 class="text-xs uppercase tracking-wide opacity-60">Actions</h3>
        <div class="flex flex-col gap-2">${actionBtns.join('')}</div>
      </div>
    </div>`,
  ];

  parts.push(`
    <div class="card bg-base-200">
      <div class="flex flex-col px-3 py-2 gap-1">
        ${_cardHead('Sent Proofs', 'sentProofs')}
        <div class="text-sm">${r.sent_proofs_record || '<span class="opacity-30">—</span>'}</div>
      </div>
    </div>
  `);

  if (r.digital_file_url) {
    parts.push(`
      <div class="card bg-base-200">
        <div class="card-body py-3 px-4 gap-1">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Digital File URL</h3>
          <div class="text-sm whitespace-pre-wrap break-all">${_linkify(r.digital_file_url)}</div>
        </div>
      </div>
    `);
  }

  return `<div class="space-y-4">${parts.join('')}</div>`;
};

window._miscAction = async (btnId, gcfPath, label) => {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.disabled  = true;
  btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

  try {
    await API.gcf(gcfPath);
    window._Toast?.success(`${label} complete`);
    const updated = await fetchOne(window._currentOrderRecord);
    window._Drawer?.refresh(updated);
    window._Drawer?.switchTab('misc');
  } catch (err) {
    window._Toast?.error(err.message || `${label} failed`);
    btn.disabled  = false;
    btn.innerHTML = label;
  }
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
    const proof    = r.chosen_proof
      ? r.chosen_proof.split(',').map(s => `&nbsp;<span class="badge" style="background:#22c55e;color:#fff;border-color:#22c55e">${s.trim().toUpperCase()}</span>`).join('')
      : '';
    return `${priority}<span class="font-mono">#${r.orderId_raw}</span>${etsy}${artist}${proof}`;
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
        <button class="w-full" onclick="window._ArtBrowser.open(${id},${prefix},'${r.sent_proofs_record}','${letter}')">
          <img src="${thumb}" alt="Proof ${letter.toUpperCase()}"
            class="w-full aspect-square object-cover rounded shadow-sm hover:opacity-80 transition-opacity" />
        </button>
      `;
    }

    // External order links
    const linkItems = [];
    const etsyId = r.etsy_receipt_id || r.etsy_receipt_id_saved;
    if (etsyId) linkItems.push({ label: 'Etsy', href: `https://www.etsy.com/your/orders/sold/904622277150?ref=seller-platform-mcnav&order_id=${etsyId}` });
    if (r.customer_order_link) linkItems.push({ label: 'Smile Cust', href: r.customer_order_link });
    if (r['order link'])       linkItems.push({ label: 'Shopify', href: r['order link'] });
    const linksHtml = linkItems.length ? `
      <div class="flex flex-col gap-0.5 mt-1">
        ${linkItems.map(l => `<a href="${l.href}" target="_blank" rel="noopener" class="link link-primary text-xs">${l.label} ↗</a>`).join('')}
      </div>
    ` : '';

    const phone = formatPhone(r.custPhone);
    const notes = parseInternalNotes(r[NOTES_FIELD]);
    const latestNote = notes[0];
    const moreCount  = notes.length - 1;

    const notesHtml = latestNote ? `
      <div id="overview-internal-note" class="mt-2 card inline-block max-w-full" style="background:#c75c3a;border-color:#c75c3a;color:#fff">
        <div class="card-body py-2 px-3 gap-1">
          <div class="flex items-center justify-between gap-2">
            ${latestNote.author
              ? `<span class="text-xs font-semibold opacity-90">${latestNote.author}</span>
                 <span class="text-xs opacity-60">${formatDate(latestNote.ts)}</span>`
              : `<span class="text-xs opacity-60">Legacy note</span>`}
          </div>
          <div class="text-xs whitespace-pre-wrap line-clamp-3">${latestNote.body}</div>
          ${moreCount > 0
            ? `<button onclick="window._Drawer?.switchTab('notes')"
                 class="btn btn-xs self-start -ml-1 mt-0.5"
                 style="background:rgba(0,0,0,0.2);color:#fff;border-color:transparent">
                 +${moreCount} more
               </button>`
            : ''}
        </div>
      </div>` : '';

    return `
      <div class="grid gap-3 items-start" style="grid-template-columns:1fr 25%">
        <div class="min-w-0">
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
              <div class="flex items-center gap-1">
                <div class="text-xs text-base-content/70">${items[0]}</div>
                ${!r.printed_orders?.length ? `<button onclick="window._itemsGear(${r.orderId_raw})" class="btn btn-xs btn-ghost btn-circle shrink-0 -my-1" title="Print choices">${GEAR_SVG}</button>` : ''}
              </div>
              ${items.slice(1).map(line => `<div class="text-xs text-base-content/70">${line}</div>`).join('')}
            </div>
          ` : ''}
          ${notesHtml}
        </div>
        <div class="flex flex-col">
          ${proofHtml}
          ${linksHtml}
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
      id:     'notes',
      label:  'Internal',
      count:  (r) => parseInternalNotes(r[NOTES_FIELD]).length,
      render: notesTab,
    },
    {
      id:     'messages',
      label:  'Messages',
      count:  (r) => r.messages?.length ?? 0,
      render: messagesTab,
    },
    {
      id:     'toPrint',
      label:  'To Print',
      count:  (r) => r.to_prints?.length ?? 0,
      render: toPrintTab,
    },
    {
      id:     'prints',
      label:  'Prints',
      count:  (r) => r.auto_proof_files?.length ?? 0,
      render: printsTab,
    },
    {
      id:     'misc',
      label:  'Misc',
      render: miscTab,
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
      key:    'Internal - newest on top please',
      label:  'Internal',
      hideOnMobile: true,
      render: (val, r) => {
        const notes = parseInternalNotes(val);
        if (!notes.length) return '';
        const first = notes[0];
        const preview = first.body.replace(/\n/g, ' ').slice(0, 60) + (first.body.length > 60 ? '…' : '');
        const countBadge = notes.length > 1
          ? `<div class="mt-0.5"><span class="badge badge-sm" style="background:#c75c3a;color:#fff;border-color:#c75c3a">+${notes.length - 1} more</span></div>`
          : '';
        return `<button onclick="event.stopPropagation();window._openInternalTab(${r.orderId_raw})"
          class="text-left text-xs max-w-48"
          style="color:#c75c3a">
          <div>${first.author ? `<span class="font-semibold">${first.author}:</span> ` : ''}${preview}</div>
          ${countBadge}
        </button>`;
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

window._itemsGear = async (orderId) => {
  const record = API.store[COL]?.records?.find(r => r.orderId_raw === orderId);
  window._picRows = (record?.items || '').split('\n').filter(Boolean);

  window._Modal.open(
    `<div class="flex justify-center py-8"><span class="loading loading-spinner loading-md"></span></div>`,
    'Item Lines'
  );
  try {
    const data = await API.gcf(`v2-getProductPrintChoice?orderId=${orderId}`);
    window._picProducts = data.products || [];
    window._picOrderId  = orderId;
    _picOpen();
  } catch (err) {
    window._Modal.open(
      `<div class="p-4 text-error text-sm">${err.message || 'Failed to load print choices'}</div>`,
      'Item Lines'
    );
  }
};

function _picUnique(products, key) {
  const map = {};
  for (const p of products) {
    if (!map[p[key]]) map[p[key]] = { featured: false, international: false };
    if (p.featured)      map[p[key]].featured      = true;
    if (p.international) map[p[key]].international = true;
  }
  return map;
}

function _picSizeOpts(all) {
  const map = _picUnique(all, 'size');
  return Object.entries(map)
    .sort(([a, fa], [b, fb]) => {
      if (fa.featured !== fb.featured) return fa.featured ? -1 : 1;
      const area = s => { const [w, h] = s.split('x').map(Number); return w * h; };
      return area(a) - area(b);
    })
    .map(([name]) => `<option value="${name}">${name}</option>`)
    .join('');
}

function _picFrameOpts(all) {
  const map = _picUnique(all, 'frame');
  return Object.entries(map)
    .sort(([a, fa], [b, fb]) => {
      if (fa.featured !== fb.featured) return fa.featured ? -1 : 1;
      return a.localeCompare(b);
    })
    .map(([name]) => `<option value="${name}">${name}</option>`)
    .join('') + '<option value="Digital Only">Digital Only</option>';
}

function _picRowsHtml() {
  return window._picRows.map((row, i) => `
    <div class="flex items-center gap-2 py-1 px-2 bg-base-200 rounded">
      <span class="flex-1 font-mono text-xs">${row}</span>
      <button onclick="window._picDeleteRow(${i})" class="btn btn-xs btn-ghost btn-circle text-error">✕</button>
    </div>
  `).join('');
}

function _picOpen() {
  const all = window._picProducts;
  window._Modal.open(`
    <div class="p-4 flex flex-col gap-3">
      <div id="pic-rows" class="flex flex-col gap-1">${_picRowsHtml()}</div>
      <div class="flex gap-2">
        <select id="pic-product" class="select select-sm select-bordered flex-1" onchange="window._picUpdate()">
          <option value="">Product…</option>
          ${ITEM_PRODUCTS.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
        <select id="pic-size" class="select select-sm select-bordered flex-1" onchange="window._picUpdate()">
          <option value="">Size…</option>
          ${_picSizeOpts(all)}
        </select>
        <select id="pic-frame" class="select select-sm select-bordered flex-1" onchange="window._picUpdate()">
          <option value="">Frame…</option>
          ${_picFrameOpts(all)}
        </select>
      </div>
      <div id="pic-result"></div>
    </div>
  `, 'Item Lines', { boxClass: 'max-w-xl', actions: '<button id="pic-save-btn" onclick="window._picSave()" class="btn btn-sm btn-primary">Save</button>' });
}

window._picUpdate = () => {
  const product  = document.getElementById('pic-product')?.value;
  const size     = document.getElementById('pic-size')?.value;
  const frame    = document.getElementById('pic-frame')?.value;
  const resultEl = document.getElementById('pic-result');
  if (!resultEl) return;

  if (!product || !size || !frame) {
    resultEl.innerHTML = '';
    return;
  }

  const valid = frame === 'Digital Only' || window._picProducts.some(p => p.size === size && p.frame === frame);
  resultEl.innerHTML = valid
    ? `<button onclick="window._picAddRow()" class="btn btn-sm btn-primary">ADD</button>`
    : `<div class="text-sm text-warning py-1">No such print option.</div>`;
};

window._picAddRow = () => {
  const product = document.getElementById('pic-product')?.value;
  const size    = document.getElementById('pic-size')?.value;
  const frame   = document.getElementById('pic-frame')?.value;
  if (!product || !size || !frame) return;

  window._picRows.push(`${product} / ${size.replace('x', '×')} / ${frame}`);
  const rowsEl = document.getElementById('pic-rows');
  if (rowsEl) rowsEl.innerHTML = _picRowsHtml();
  window._picUpdate();
};

window._picSave = async () => {
  if (!window._picRows.length) {
    window._Toast?.error('Add at least one item line before saving.');
    return;
  }
  const btn = document.getElementById('pic-save-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>'; }

  try {
    const result = await API.gcf('v2-orderUpdateItems', {
      body: JSON.stringify({
        orderId_raw: window._picOrderId,
        items:       window._picRows.join('\n'),
      }),
    });
    window._Modal.close();
    window._Toast?.success(`${result.to_print_count} to_print(s) generated.`);
    const updated = await fetchOne({ orderId_raw: window._picOrderId });
    window._Drawer?.refresh(updated);
  } catch (err) {
    window._Toast?.error(err.message || 'Failed to save items.');
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
  }
};

window._picDeleteRow = (idx) => {
  window._picRows.splice(idx, 1);
  const rowsEl = document.getElementById('pic-rows');
  if (rowsEl) rowsEl.innerHTML = _picRowsHtml();
};

window._toPrintDelete = async (toPrintId) => {
  if (!confirm(`Delete #${toPrintId}?`)) return;
  try {
    await API.gcf(`v2-toPrintDelete?to_print_id=${toPrintId}`);
    window._Toast?.success(`#${toPrintId} deleted.`);
    const updated = await fetchOne(window._currentOrderRecord);
    window._Drawer?.refresh(updated);
    window._Drawer?.switchTab('toPrint');
  } catch (err) {
    window._Toast?.error(err.message || 'Delete failed.');
  }
};

window._toPrintAdd = async (atRecordId, orderId) => {
  window._tpAtRecordId = atRecordId;
  window._tpOrderId    = orderId;

  window._Modal.open(
    `<div class="flex justify-center py-8"><span class="loading loading-spinner loading-md"></span></div>`,
    'Add To Print'
  );
  try {
    const data = await API.gcf(`v2-getProductPrintChoice?orderId=${orderId}`);
    window._tpProducts = data.products || [];
    _tpOpen();
  } catch (err) {
    window._Modal.open(
      `<div class="p-4 text-error text-sm">${err.message || 'Failed to load print choices'}</div>`,
      'Add To Print'
    );
  }
};

function _tpSizeOpts() {
  const map = _picUnique(window._tpProducts, 'size');
  return Object.entries(map)
    .sort(([a, fa], [b, fb]) => {
      if (fa.featured !== fb.featured) return fa.featured ? -1 : 1;
      const area = s => { const [w, h] = s.split('x').map(Number); return w * h; };
      return area(a) - area(b);
    })
    .map(([name]) => `<option value="${name}">${name}</option>`)
    .join('');
}

function _tpFrameOpts(size) {
  const filtered = size ? window._tpProducts.filter(p => p.size === size) : window._tpProducts;
  const map = _picUnique(filtered, 'frame');
  return Object.entries(map)
    .sort(([a, fa], [b, fb]) => {
      if (fa.featured !== fb.featured) return fa.featured ? -1 : 1;
      return a.localeCompare(b);
    })
    .map(([name]) => `<option value="${name}">${name}</option>`)
    .join('');
}

function _tpProductOpts(size, frame) {
  return window._tpProducts
    .filter(p => p.size === size && p.frame === frame)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .map(p => {
      const star  = p.featured      ? '⭐ ' : '';
      const globe = p.international ? '🌍 ' : '';
      return `<option value="${p._ATID}">${star}${globe}${p.printer} | ${p.frame} | ${p.size}</option>`;
    })
    .join('');
}

function _tpOpen() {
  window._Modal.open(`
    <div class="p-4 flex flex-col gap-3">
      <div class="flex gap-2">
        <select id="tp-size" class="select select-sm select-bordered flex-1" onchange="window._tpUpdate()">
          <option value="">Size…</option>
          ${_tpSizeOpts()}
        </select>
        <select id="tp-frame" class="select select-sm select-bordered flex-1" onchange="window._tpUpdate()">
          <option value="">Frame…</option>
          ${_tpFrameOpts('')}
        </select>
      </div>
      <select id="tp-product" class="select select-sm select-bordered w-full" disabled>
        <option value="">Select size &amp; frame first…</option>
      </select>
      <div class="flex items-center gap-2">
        <label class="text-sm text-base-content/60 shrink-0">Chosen Proof</label>
        <input id="tp-proof" type="text" maxlength="1" placeholder="A–Z"
          class="input input-sm input-bordered w-16 uppercase"
          oninput="this.value = this.value.replace(/[^a-zA-Z]/g, '').toUpperCase()" />
      </div>
    </div>
  `, 'Add To Print', {
    boxClass: 'max-w-md',
    actions:  '<button id="tp-submit-btn" onclick="window._tpSubmit()" class="btn btn-sm btn-primary">Add To Print</button>',
  });
}

window._tpUpdate = () => {
  const sizeEl  = document.getElementById('tp-size');
  const frameEl = document.getElementById('tp-frame');
  const prodEl  = document.getElementById('tp-product');
  if (!sizeEl || !frameEl || !prodEl) return;

  const size     = sizeEl.value;
  const curFrame = frameEl.value;

  // Rebuild frame options filtered by size, preserve selection if still valid
  frameEl.innerHTML = `<option value="">Frame…</option>${_tpFrameOpts(size)}`;
  if (curFrame && [...frameEl.options].some(o => o.value === curFrame)) frameEl.value = curFrame;

  const frame = frameEl.value;

  if (size && frame) {
    const opts = _tpProductOpts(size, frame);
    prodEl.innerHTML = opts || '<option value="">No match</option>';
    prodEl.disabled  = !opts;
  } else {
    prodEl.innerHTML = '<option value="">Select size &amp; frame first…</option>';
    prodEl.disabled  = true;
  }
};

window._tpSubmit = async () => {
  const product = document.getElementById('tp-product')?.value;
  const size    = document.getElementById('tp-size')?.value;
  const frame   = document.getElementById('tp-frame')?.value;
  const proof   = document.getElementById('tp-proof')?.value;

  if (!size || !frame || !product) {
    window._Toast?.error('Please select size, frame, and product.');
    return;
  }

  const btn = document.getElementById('tp-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>'; }

  try {
    const qs = `order_ATID=${window._tpAtRecordId}&product_ATID=${product}${proof ? `&chosen_proof=${proof}` : ''}`;
    await API.gcf(`v2-toPrintAdd?${qs}`);
  } catch (err) {
    window._Toast?.error(err.message || 'Failed to add to print.');
    if (btn) { btn.disabled = false; btn.textContent = 'Add To Print'; }
    return;
  }

  window._Modal.close();
  window._Toast?.success('To print added.');

  try {
    const updated = await fetchOne({ orderId_raw: window._tpOrderId });
    window._Drawer?.refresh(updated);
    window._Drawer?.switchTab('toPrint');
  } catch (e) {
    console.warn('[toPrintAdd] Drawer refresh failed:', e);
  }
};

window._openInternalTab = (orderId) => {
  const record = API.store[COL]?.records?.find(r => r.orderId_raw === orderId);
  if (record) window._Drawer?.open(record, 'notes', String(orderId));
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

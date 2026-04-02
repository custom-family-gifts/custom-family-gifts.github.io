import { API }        from '../core/api.js';
import { formatDate, formatPhone } from '../core/helpers.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const PIPELINE_COLORS = {
  'Proof Me':  'badge-warning',
  'Proof Sent':'badge-info',
  'Approved':  'badge-success',
  'Print':     'badge-primary',
  'Ship':      'badge-neutral',
  'Complete':  'badge-ghost',
};

const pipelineBadge = (val) => {
  if (!val) return '—';
  const key = Object.keys(PIPELINE_COLORS).find(k => val.toLowerCase().includes(k.toLowerCase()));
  return `<span class="badge badge-sm ${key ? PIPELINE_COLORS[key] : 'badge-ghost'}">${val}</span>`;
};

const COL = 'cfg.orders';

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
  'Internal - newest on top please': 1,
  sent_proofs_record: 1
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
const mainTab = (r) => {
  const itemsHtml = (r.items ? r.items.split('\n').filter(Boolean) : [])
    .map(line => `<div class="text-sm">${line}</div>`)
    .join('');

  const links = [
    r['order link']       && `<a class="link link-primary text-sm" href="${r['order link']}" target="_blank">Admin Order</a>`,
    r.customer_order_link && `<a class="link link-secondary text-sm" href="${r.customer_order_link}" target="_blank">Customer Portal</a>`,
    r.etsy_link           && `<a class="link text-sm" href="${r.etsy_link}" target="_blank">Etsy Listing</a>`,
  ].filter(Boolean).join('<br>');

  return `
    <div class="space-y-4">

      <div class="card bg-base-200">
        <div class="card-body py-3 gap-2">
          <h3 class="card-title text-sm uppercase tracking-wide opacity-60">Order</h3>
          <div class="grid grid-cols-2 gap-y-2 text-sm">
            <span class="text-base-content/50">Order #</span>
            <span class="font-mono">${r.orderId_raw}${r.isPriority ? ' ⭐' : ''}</span>
            <span class="text-base-content/50">Customer</span>
            <span>${r.custFirst || ''} ${r.custLast || ''}</span>
            <span class="text-base-content/50">Email</span>
            <span class="break-all">${r.email || '—'}</span>
            <span class="text-base-content/50">Phone</span>
            <span>${r.custPhone || '—'}</span>
            <span class="text-base-content/50">Created</span>
            <span>${r.created_shopify_order ? formatDate(r.created_shopify_order) : '—'}</span>
            ${r.etsy_receipt_id || r.etsy_receipt_id_saved ? `
              <span class="text-base-content/50">Etsy Receipt</span>
              <span class="text-orange-500">🍊 ${r.etsy_receipt_id || r.etsy_receipt_id_saved}</span>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="card-body py-3 gap-2">
          <h3 class="card-title text-sm uppercase tracking-wide opacity-60">Pipeline</h3>
          <div class="grid grid-cols-2 gap-y-2 text-sm">
            <span class="text-base-content/50">Stage</span>
            <span>${pipelineBadge(r.pipeline)}</span>
            <span class="text-base-content/50">Artist</span>
            <span>${r.artist || '—'}</span>
            ${r.chosen_proof ? `
              <span class="text-base-content/50">Chosen Proof</span>
              <span>✔ ${r.chosen_proof}</span>
            ` : ''}
          </div>
        </div>
      </div>

      ${itemsHtml ? `
        <div class="card bg-base-200">
          <div class="card-body py-3 gap-2">
            <h3 class="card-title text-sm uppercase tracking-wide opacity-60">Items</h3>
            ${itemsHtml}
            ${r.options ? `<div class="text-xs text-base-content/60 mt-1">${r.options}</div>` : ''}
          </div>
        </div>
      ` : ''}

      ${links ? `
        <div class="card bg-base-200">
          <div class="card-body py-3 gap-2">
            <h3 class="card-title text-sm uppercase tracking-wide opacity-60">Links</h3>
            ${links}
          </div>
        </div>
      ` : ''}

    </div>
  `;
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
  drawerTitle: (r) => `#${r.orderId_raw}${r.isPriority ? ' ⭐' : ''}`,

  drawerOverview: (r) => {
    const name  = [r.custFirst, r.custLast].filter(Boolean).join(' ') || r.customer || '—';
    const items = r.items ? r.items.split('\n').filter(Boolean) : [];

    // Pick chosen proof thumbnail, or first available
    let proofHtml = '';
    if (r.auto_proof_files?.length) {
      const chosen = (r.chosen_proof || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const file   = r.auto_proof_files.find(f => {
        const letter = f.filename?.split('_')[1]?.toLowerCase();
        return chosen.includes(letter);
      }) ?? r.auto_proof_files[0];

      if (file) {
        const letter = file.filename?.split('_')[1]?.toLowerCase() ?? '?';
        const num    = +file.filename?.split('_')[0];
        const prefix = Math.floor(num / 100);
        const url    = file.url
          ?? `https://custom-family-gifts.s3.us-east-2.amazonaws.com/${prefix}00-${prefix}99/${num}/_proofs/${num}_${letter}_proof.jpg`;
        proofHtml = `
          <a href="${url}" target="_blank" class="shrink-0">
            <img src="${url}" alt="Proof ${letter.toUpperCase()}"
              class="w-16 h-16 object-cover rounded shadow-sm" />
          </a>
        `;
      }
    }

    return `
      <div class="flex gap-3 items-start">
        ${proofHtml}
        <div class="min-w-0 flex-1">
          <div class="font-medium text-sm">${name}</div>
          ${r.email ? `<div class="text-xs text-base-content/50 truncate">${r.email}</div>` : ''}
          ${items.length ? `
            <div class="mt-1.5 space-y-0.5">
              ${items.map(line => `<div class="text-xs text-base-content/70">${line}</div>`).join('')}
            </div>
          ` : ''}
          ${r.options ? `<div class="text-xs text-base-content/40 mt-0.5">${r.options}</div>` : ''}
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
        const letter  = val.split(',').map(s => s.trim()).filter(Boolean).at(-1);
        if (!letter) return '';
        const id      = r.orderId_raw;
        const prefix  = Math.floor(id / 100);
        const url     = `https://custom-family-gifts.s3.us-east-2.amazonaws.com/${prefix * 100}-${prefix * 100 + 99}/${id}/_proofs/${id}_${letter}_proof.jpg`;
        return `<a href="${url}" target="_blank"><img src="${url}" alt="Proof ${letter.toUpperCase()}" class="w-12 h-12 object-cover rounded shadow-sm" /></a>`;
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
        return `<div>${name}</div>${r.email ? `<div class="text-xs opacity-50">${r.email}</div>` : ''}${phone ? `<div class="text-xs opacity-50">${phone}</div>` : ''}`;
      },
    },
    {
      key:    'pipeline',
      label:  'Pipeline / Artist',
      render: (val, r) => {
        let out = pipelineBadge(val);
        if (r.artist)       out += `<div class="text-xs opacity-60 mt-1">${r.artist}</div>`;
        if (r.chosen_proof) out += `<div class="text-xs opacity-40">✔ ${r.chosen_proof}</div>`;
        return out;
      },
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

// ---------------------------------------------------------------------------
// Column renderers
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

import { API } from '../core/api.js';
import { formatDate } from '../core/helpers.js';

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
};

// ---------------------------------------------------------------------------
// Fetch — list, via api.find → v2-mdb cfg/orders
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
// Fetch one — drawer level, via v2-getCustomerOrder (enriched, no pagination)
// ---------------------------------------------------------------------------
async function fetchOne(record) {
  const result = await API.gcf(`v2-getCustomerOrder?orderId=${record.orderId_raw}`);
  API.storeUpdate(COL, result, 'orderId_raw');
  return result;
}

// ---------------------------------------------------------------------------
// Drawer template — receives the full record
// ---------------------------------------------------------------------------
const drawer = (r) => {
  const itemsHtml = (r.items ? r.items.split('\n').filter(Boolean) : [])
    .map(line => `<div class="text-sm">${line}</div>`)
    .join('');

  const links = [
    r['order link']          && `<a class="link link-primary text-sm" href="${r['order link']}" target="_blank">Admin Order</a>`,
    r.customer_order_link    && `<a class="link link-secondary text-sm" href="${r.customer_order_link}" target="_blank">Customer Portal</a>`,
    r.etsy_link              && `<a class="link text-sm" href="${r.etsy_link}" target="_blank">Etsy Listing</a>`,
  ].filter(Boolean).join('<br>');

  return `
    <div class="space-y-4">

      <div class="card bg-base-200">
        <div class="card-body py-4 gap-2">
          <h3 class="card-title text-sm uppercase tracking-wide opacity-60">Order</h3>
          <div class="grid grid-cols-2 gap-y-2 text-sm">
            <span class="text-base-content/50">Order #</span>
            <span class="font-mono">${r.orderId_raw}${r.isPriority ? ' ⭐' : ''}</span>
            <span class="text-base-content/50">Customer</span>
            <span>${r.custFirst || ''} ${r.custLast || ''}</span>
            <span class="text-base-content/50">Email</span>
            <span>${r.email || '—'}</span>
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
        <div class="card-body py-4 gap-2">
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
          <div class="card-body py-4 gap-2">
            <h3 class="card-title text-sm uppercase tracking-wide opacity-60">Items</h3>
            ${itemsHtml}
            ${r.options ? `<div class="text-xs text-base-content/60 mt-1">${r.options}</div>` : ''}
          </div>
        </div>
      ` : ''}

      ${r.print_note ? `
        <div class="alert alert-info text-sm py-2">
          <span><strong>Print Note:</strong> ${r.print_note}</span>
        </div>
      ` : ''}

      ${links ? `
        <div class="card bg-base-200">
          <div class="card-body py-4 gap-2">
            <h3 class="card-title text-sm uppercase tracking-wide opacity-60">Links</h3>
            ${links}
          </div>
        </div>
      ` : ''}

    </div>
  `;
};

// ---------------------------------------------------------------------------
// Page config
// ---------------------------------------------------------------------------
export const orders = {
  defaultSort:  'orderId_raw',
  defaultOrder: -1,
  defaultPer:   25,

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
      key:    'customer',
      label:  'Customer',
      render: (val, r) => {
        const name = (r.custFirst || r.custLast)
          ? `${r.custFirst || ''} ${r.custLast || ''}`.trim()
          : val || '—';
        return `<div>${name}</div>${r.email ? `<div class="text-xs opacity-50">${r.email}</div>` : ''}`;
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

  drawer,
  fetch,
  fetchOne,
};

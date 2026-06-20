import { API }        from '../core/api.js';
import { formatDate } from '../core/helpers.js';

const COL = 'cfg.shopify_abandoned_checkouts';

async function fetch(state) {
  const { search } = state.filters;
  let q = {};
  if (search) {
    const term = search.trim();
    q = {
      $or: [
        { 'customer.first_name': { $regex: term, $options: 'i' } },
        { 'customer.last_name':  { $regex: term, $options: 'i' } },
        { 'customer.email':      { $regex: term, $options: 'i' } },
        { email:                 { $regex: term, $options: 'i' } },
      ],
    };
  }
  const s = state.sort ? { [state.sort]: state.order } : { created_at: -1 };
  return API.find({ col: COL, q, s, per: state.per, page: state.page });
}

function lineItemsHtml(lineItems) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return `<div class="text-xs opacity-40">No items</div>`;
  }
  return lineItems.map(item => {
    const props = (item.properties || []).filter(p => p.value && p.value.trim());
    const propsHtml = props.length
      ? `<div class="mt-2 space-y-1">
          ${props.map(p => `
            <div class="flex gap-2 text-xs">
              <span class="opacity-50 shrink-0 w-28 truncate">${p.name}</span>
              <span class="break-words">${p.value}</span>
            </div>
          `).join('')}
        </div>`
      : '';
    return `
      <div class="bg-base-300 rounded p-3">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="text-sm font-medium">${item.presentment_title || item.title || '—'}</div>
            ${item.presentment_variant_title ? `<div class="text-xs opacity-50">${item.presentment_variant_title}</div>` : ''}
          </div>
          <div class="text-sm font-mono shrink-0">$${item.line_price || item.price || '0.00'}</div>
        </div>
        ${propsHtml}
      </div>
    `;
  }).join('');
}

const drawerTemplate = (record) => {
  window._currentAbandonedRecord = record;

  const customer   = record.customer || {};
  const fullName   = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || '—';
  const createdAt  = record.created_at  ? formatDate(record.created_at)  : '—';
  const completedAt = record.completed_at ? formatDate(record.completed_at) : null;

  return `
    <div class="space-y-3">

      <div class="card bg-base-200">
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 px-3 py-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60 col-span-2">Customer</h3>
          <div>
            <div class="text-xs opacity-50">Name</div>
            <div class="text-sm">${fullName}</div>
          </div>
          <div>
            <div class="text-xs opacity-50">Email</div>
            <div class="text-sm font-mono break-all">${customer.email || record.email || '—'}</div>
          </div>
          <div>
            <div class="text-xs opacity-50">Created</div>
            <div class="text-sm">${createdAt}</div>
          </div>
          <div>
            <div class="text-xs opacity-50">Completed</div>
            <div class="text-sm ${completedAt ? 'text-success' : 'opacity-40'}">${completedAt ?? 'Not completed'}</div>
          </div>
          <div class="col-span-2">
            <div class="text-xs opacity-50">Total</div>
            <div class="text-sm font-mono">$${record.total_price || '0.00'}</div>
          </div>
        </div>
      </div>

      ${record.abandoned_checkout_url ? `
      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-1">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Recovery URL</h3>
          <a href="${record.abandoned_checkout_url}" target="_blank"
             class="text-xs font-mono text-primary break-all hover:underline">
            ${record.abandoned_checkout_url}
          </a>
        </div>
      </div>
      ` : ''}

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">
            Line Items
            <span class="normal-case opacity-50 ml-1">${Array.isArray(record.line_items) ? record.line_items.length : 0}</span>
          </h3>
          <div class="space-y-2">
            ${lineItemsHtml(record.line_items)}
          </div>
        </div>
      </div>

    </div>
  `;
};

export const abandoned = {
  defaultSort:  'created_at',
  defaultOrder: -1,
  defaultPer:   50,

  drawerKey:   '_id',
  drawerTitle: (record) => {
    const customer = record.customer || {};
    return [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Abandoned Checkout';
  },
  drawer: drawerTemplate,

  filters: [
    { name: 'search', type: 'text', label: 'Search', placeholder: 'name or email…' },
  ],

  columns: [
    {
      key:    'customer',
      label:  'Customer',
      render: (val) => {
        const name = [val?.first_name, val?.last_name].filter(Boolean).join(' ');
        return `<div class="text-sm">${name || '—'}</div>`;
      },
    },
    {
      key:    'email',
      label:  'Email',
      render: (val, record) => {
        const email = val || record?.customer?.email || '';
        return `<div class="text-sm font-mono">${email || '—'}</div>`;
      },
    },
    {
      key:      'created_at',
      label:    'Created',
      sortable: true,
      render:   (val) => val
        ? `<span class="text-xs opacity-60">${formatDate(val)}</span>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
    {
      key:    'completed_at',
      label:  'Completed',
      render: (val) => val
        ? `<span class="text-xs text-success">${formatDate(val)}</span>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
    {
      key:    'total_price',
      label:  'Total',
      render: (val) => val
        ? `<span class="text-sm font-mono">$${val}</span>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
    {
      key:    'line_items',
      label:  'Items',
      render: (val) => {
        const count = Array.isArray(val) ? val.length : 0;
        return count
          ? `<span class="badge badge-sm badge-ghost">${count}</span>`
          : `<span class="text-xs opacity-30">—</span>`;
      },
    },
  ],

  fetch,
};

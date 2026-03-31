// ---------------------------------------------------------------------------
// Mock data — stable, deterministic, no API needed
// ---------------------------------------------------------------------------
const PRODUCT_LINES = ['Mugs', 'Ornaments', 'Frames', 'Prints'];
const STATUSES      = ['active', 'active', 'active', 'active', 'inactive']; // 80% active

const MOCK_RECORDS = Array.from({ length: 87 }, (_, i) => ({
  _id:          String(i + 1),
  id:           i + 1,
  name:         `Product ${i + 1}`,
  product_line: PRODUCT_LINES[i % PRODUCT_LINES.length],
  status:       STATUSES[i % STATUSES.length],
  views:        [1200, 340, 4500, 89, 2300, 780, 3100, 56, 890, 4200][i % 10],
  favorites:    [45, 12, 189, 3, 67, 23, 145, 1, 34, 201][i % 10],
  revenue:      [234.50, 45.00, 890.00, 12.00, 456.75, 123.00, 678.90, 5.00, 167.30, 934.00][i % 10],
}));

// ---------------------------------------------------------------------------
// fetch — mimics the normalized GCF/mongo response shape
// ---------------------------------------------------------------------------
function fetch(state) {
  let records = [...MOCK_RECORDS];

  // Filters
  const { search, product_line, status } = state.filters;
  if (search)       records = records.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  if (product_line) records = records.filter(r => r.product_line === product_line);
  if (status)       records = records.filter(r => r.status === status);

  // Sort
  if (state.sort) {
    records.sort((a, b) => {
      const [av, bv] = [a[state.sort], b[state.sort]];
      return state.order * (av > bv ? 1 : av < bv ? -1 : 0);
    });
  }

  // Paginate
  const totalcount = records.length;
  const start      = (state.page - 1) * state.per;
  records          = records.slice(start, start + state.per);

  return Promise.resolve({ records, recordcount: records.length, totalcount, page: state.page, per: state.per });
}

// ---------------------------------------------------------------------------
// Column renderers
// ---------------------------------------------------------------------------
const statusBadge = (val) =>
  `<span class="badge badge-sm ${val === 'active' ? 'badge-success' : 'badge-error'}">${val}</span>`;

const revenue = (val) =>
  `<span class="font-mono">$${Number(val).toFixed(2)}</span>`;

// ---------------------------------------------------------------------------
// Drawer template — receives the full record
// ---------------------------------------------------------------------------
const drawer = (r) => `
  <div class="space-y-5">

    <div class="stats stats-vertical shadow w-full bg-base-200 rounded-box">
      <div class="stat py-3">
        <div class="stat-title">Views</div>
        <div class="stat-value text-primary text-2xl">${r.views.toLocaleString()}</div>
      </div>
      <div class="stat py-3">
        <div class="stat-title">Favorites</div>
        <div class="stat-value text-secondary text-2xl">${r.favorites}</div>
      </div>
      <div class="stat py-3">
        <div class="stat-title">Revenue</div>
        <div class="stat-value text-2xl">$${Number(r.revenue).toFixed(2)}</div>
      </div>
    </div>

    <div class="card bg-base-200">
      <div class="card-body py-4 gap-2">
        <h3 class="card-title text-sm uppercase tracking-wide opacity-60">Details</h3>
        <div class="grid grid-cols-2 gap-y-2 text-sm">
          <span class="text-base-content/50">ID</span>
          <span class="font-mono">${r.id}</span>
          <span class="text-base-content/50">Product Line</span>
          <span>${r.product_line}</span>
          <span class="text-base-content/50">Status</span>
          <span>${statusBadge(r.status)}</span>
        </div>
      </div>
    </div>

  </div>
`;

// ---------------------------------------------------------------------------
// Page config — the only thing a page author needs to write
// ---------------------------------------------------------------------------
export const test = {
  defaultSort: 'id',
  defaultPer:  25,

  filters: [
    { name: 'search',       type: 'text',   label: 'Name',         placeholder: 'Search name…' },
    { name: 'product_line', type: 'select', label: 'Product Line', options: PRODUCT_LINES },
    { name: 'status',       type: 'select', label: 'Status',       options: ['active', 'inactive'] },
  ],

  columns: [
    { key: 'id',           label: 'ID',           sortable: true },
    { key: 'name',         label: 'Name',         sortable: true },
    { key: 'product_line', label: 'Product Line', sortable: true },
    { key: 'status',       label: 'Status',       render: statusBadge },
    { key: 'views',        label: 'Views',        sortable: true },
    { key: 'favorites',    label: 'Favs',         sortable: true },
    { key: 'revenue',      label: 'Revenue',      sortable: true, render: revenue },
  ],

  drawer,
  fetch,
};

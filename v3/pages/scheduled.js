import { API }        from '../core/api.js';
import { formatDate } from '../core/helpers.js';

const COL = 'cfg.scheduled_tasks';

const PROJECTION = {
  name:               1,
  minutes:            1,
  active:             1,
  gcf_query_db:       1,
  gcf_query_col:      1,
  gcf_query_q:        1,
  gcf_query_p:        1,
  gcf_query_per:      1,
  gcf_execute:        1,
  gcf_execute_params: 1,
  gcf_execute_body:   1,
  last_success:       1,
  last_success2:      1,
  last_success3:      1,
  last_success4:      1,
  last_success5:      1,
};

const EDIT_FIELDS = [
  { key: 'name',               label: 'Name',        type: 'textarea', rows: 2, validate: 'required' },
  { key: 'minutes',            label: 'Minutes',     type: 'text', validate: ['required', 'posint'] },
  { key: 'active',             label: 'Active',      type: 'toggle' },
  { key: 'gcf_query_db',       label: 'Query DB',    type: 'text' },
  { key: 'gcf_query_col',      label: 'Query Col',   type: 'text' },
  { key: 'gcf_query_q',        label: 'Query q',     type: 'textarea', rows: 2 },
  { key: 'gcf_query_p',        label: 'Query p',     type: 'textarea', rows: 2 },
  { key: 'gcf_query_per',      label: 'Query per',   type: 'text', validate: 'numeric' },
  { key: 'gcf_execute',        label: 'GCF Execute', type: 'text', validate: 'required' },
  { key: 'gcf_execute_params', label: 'GCF Params',  type: 'text' },
  { key: 'gcf_execute_body',   label: 'GCF Body',    type: 'textarea', rows: 3 },
];

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
async function fetch(state) {
  const { search } = state.filters;
  const q = search ? { name: { $regex: search.trim(), $options: 'i' } } : {};
  const s = { name: 1 };
  return API.find({ col: COL, q, s, p: PROJECTION, per: state.per, page: state.page });
}

// ---------------------------------------------------------------------------
// Drawer template
// ---------------------------------------------------------------------------
const drawerTemplate = (r) => {
  window._currentScheduledRecord = r;

  const queryHtml = r.gcf_query_db ? `
    <div class="text-xs space-y-0.5">
      <div><span class="opacity-50">db.col</span> ${r.gcf_query_db}.${r.gcf_query_col}</div>
      ${r.gcf_query_q   ? `<div><span class="opacity-50">q</span> <code class="text-xs">${r.gcf_query_q}</code></div>` : ''}
      ${r.gcf_query_p   ? `<div><span class="opacity-50">p</span> <code class="text-xs">${r.gcf_query_p}</code></div>` : ''}
      ${r.gcf_query_per ? `<div><span class="opacity-50">per</span> ${r.gcf_query_per}</div>` : ''}
    </div>
  ` : `<div class="text-xs opacity-40">No query (single run)</div>`;

  const executeHtml = `
    <div class="text-xs space-y-0.5">
      <div><code>${r.gcf_execute}${r.gcf_execute_params || ''}</code></div>
      ${r.gcf_execute_body ? `<div class="opacity-50">${r.gcf_execute_body}</div>` : ''}
    </div>
  `;

  const successes = [r.last_success, r.last_success2, r.last_success3, r.last_success4, r.last_success5]
    .filter(Boolean);

  const successHtml = successes.length
    ? successes.map(d => `<div class="text-xs opacity-60">${formatDate(d)}</div>`).join('')
    : `<div class="text-xs opacity-40">No runs yet</div>`;

  return `
    <div class="space-y-3">

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Schedule</h3>
          <div class="text-sm">Every <strong>${r.minutes}</strong> minute(s)</div>
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Query</h3>
          ${queryHtml}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Execute</h3>
          ${executeHtml}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <h3 class="text-xs uppercase tracking-wide opacity-60">Recent Runs</h3>
          ${successHtml}
        </div>
      </div>

      <div class="flex gap-2">
        <button class="btn btn-sm btn-primary"
          onclick="window._scheduledEdit()">Edit</button>
        <button class="btn btn-sm btn-error btn-outline"
          onclick="window._scheduledDelete('${r._id}')">Delete</button>
      </div>

    </div>
  `;
};

// ---------------------------------------------------------------------------
// Page config
// ---------------------------------------------------------------------------
export const scheduled = {
  defaultSort:  'name',
  defaultOrder: 1,
  defaultPer:   100,

  drawerKey:   '_id',
  drawerTitle: (r) => `${r.name}${!r.active ? ' 💤' : ''}`,
  drawer:       drawerTemplate,

  filters: [
    { name: 'search', type: 'text', label: 'Search', placeholder: 'task name…' },
  ],

  columns: [
    {
      key:    'name',
      label:  'Name',
      render: (val) => `<div class="text-sm">${val}</div>`,
    },
    {
      key:    'gcf_execute',
      label:  'Execute',
      render: (val, r) => `<div class="text-xs font-mono">${val}${r.gcf_execute_params || ''}</div>`,
    },
    {
      key:    'active',
      label:  'Active',
      render: (val) => val
        ? `<span class="badge" style="background:#22c55e;color:#fff;border-color:#22c55e">Active</span>`
        : `<span class="badge badge-ghost">Inactive</span>`,
    },
    {
      key:    'minutes',
      label:  'Every (min)',
      render: (val) => `<span class="text-sm">${val}</span>`,
    },
    {
      key:    'gcf_query_db',
      label:  'Query',
      render: (val, r) => val
        ? `<div class="text-xs font-mono">${val}.${r.gcf_query_col}</div>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
    {
      key:    'last_success',
      label:  'Last Run',
      render: (val) => val
        ? `<span class="text-xs opacity-60">${formatDate(val)}</span>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
  ],

  fetch,
};

// ---------------------------------------------------------------------------
// Globals wired by drawer buttons
// ---------------------------------------------------------------------------
window._scheduledEdit = () => {
  const r = window._currentScheduledRecord;
  window._CrudForm.open(
    { title: 'Edit Scheduled Task', collection: COL, idField: '_id', fields: EDIT_FIELDS },
    r
  );
};

window._scheduledDelete = async (id) => {
  if (!confirm('Delete this scheduled task?')) return;
  try {
    await API.gcf('v2-mdb', {
      toast: 'Deleted',
      body: JSON.stringify({ op: 'delete', col: COL, q: { _id: id } }),
    });
    // Close drawer and reload
    document.getElementById('drawer-close')?.click();
  } catch (err) {
    // error toast handled by API.gcf
  }
};

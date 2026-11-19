import { API }        from '../core/api.js';
import { formatDate } from '../core/helpers.js';

const COL = 'cfg.scheduled_tasks';

const PROJECTION = {
  name:               1,
  minutes:            1,
  schedule_type:      1,
  schedule_hour:      1,
  schedule_minute:    1,
  schedule_weekday:   1,
  schedule_day:       1,
  schedule_timezone:  1,
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

// ---------------------------------------------------------------------------
// Schedule — 'minutes' (every N minutes; also when schedule_type is missing), or
// 'daily' / 'weekly' / 'monthly' at schedule_hour:schedule_minute in schedule_timezone.
// Run by the backend v2-scheduledTasks_initiate.
// ---------------------------------------------------------------------------
const DEFAULT_TIMEZONE = 'America/Los_Angeles';
const RECURRING_TYPES  = ['daily', 'weekly', 'monthly'];
const WEEKDAY_NAMES    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LAST_DAY         = -1;

const pad2 = (number) => String(number).padStart(2, '0');

// Same format as the backend's Slack messages: "15 min(s)", "daily 06:30",
// "weekly Mon,Wed,Fri 09:00", "monthly 1,15,last 09:00"
function scheduleSummary(task) {
  const type = task.schedule_type || 'minutes';
  if (type === 'minutes') return `${task.minutes} min(s)`;
  const time = `${pad2(+task.schedule_hour || 0)}:${pad2(+task.schedule_minute || 0)}`;
  if (type === 'weekly') {
    const days = [].concat(task.schedule_weekday ?? []).map(value => WEEKDAY_NAMES[+value] ?? value);
    return `weekly ${days.join(',')} ${time}`;
  }
  if (type === 'monthly') {
    const days = [].concat(task.schedule_day ?? []).map(value => +value === LAST_DAY ? 'last' : value);
    return `monthly ${days.join(',')} ${time}`;
  }
  return `${type} ${time}`;
}

// "Fri Nov 20 9:00 AM PST", in the task's timezone
function formatSlot(slot, timezone) {
  return slot.toLocaleString('en-US', {
    timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).replace(/,/g, '');
}

// Next-runs list — the edit form preview and the drawer Schedule card
function nextRunsHtml(task) {
  if (!RECURRING_TYPES.includes(task.schedule_type)) return '';
  const hasHour = task.schedule_hour !== null && task.schedule_hour !== undefined && task.schedule_hour !== '';
  const slots   = hasHour ? scheduleSlotsNext(task) : [];
  if (!slots.length) {
    return `<div class="text-xs text-error">Incomplete schedule — this task will never run.</div>`;
  }
  const timezone = task.schedule_timezone || DEFAULT_TIMEZONE;
  return slots.map(slot => `<div class="text-xs opacity-70">${formatSlot(slot, timezone)}</div>`).join('');
}

// --- Slot math: the backend's day matching and timezone conversion, walking forward instead of back ---

// next `count` slot instants after `from`, for a daily/weekly/monthly task
function scheduleSlotsNext(task, from = new Date(), count = 5) {
  const timezone = task.schedule_timezone || DEFAULT_TIMEZONE;
  const hour = +task.schedule_hour || 0, minute = +task.schedule_minute || 0;
  const local = timezoneDateParts(from, timezone);
  const slots = [];
  for (let ahead = 0; ahead <= 400 && slots.length < count; ahead++) {
    const day = new Date(Date.UTC(local.year, local.month, local.day + ahead));
    const year = day.getUTCFullYear(), month = day.getUTCMonth(), date = day.getUTCDate();
    if (!scheduleSlotDayMatches(task, year, month, date, day.getUTCDay())) continue;
    const slot = timezoneLocalToUtc(year, month, date, hour, minute, timezone);
    if (slot > from) slots.push(slot);
  }
  return slots; // empty = invalid config
}

function scheduleSlotDayMatches(task, year, month, date, weekday) {
  if (task.schedule_type == 'daily') return true;
  if (task.schedule_type == 'weekly') return [].concat(task.schedule_weekday ?? []).some(value => +value == weekday);
  if (task.schedule_type == 'monthly') {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return [].concat(task.schedule_day ?? []).some(value => date == ((+value == LAST_DAY) ? lastDay : Math.min(+value, lastDay)));
  }
  return false;
}

function timezoneDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(date);
  const values = {};
  parts.forEach(part => { if (part.type != 'literal') values[part.type] = +part.value; });
  return { year: values.year, month: values.month - 1, day: values.day, hour: values.hour % 24, minute: values.minute, second: values.second };
}

function timezoneOffsetMs(date, timezone) {
  const local = timezoneDateParts(date, timezone);
  return Date.UTC(local.year, local.month, local.day, local.hour, local.minute, local.second) - Math.floor(date.getTime() / 1000) * 1000;
}

function timezoneLocalToUtc(year, month, date, hour, minute, timezone) {
  const localAsUtc = Date.UTC(year, month, date, hour, minute);
  const guess = new Date(localAsUtc - timezoneOffsetMs(new Date(localAsUtc), timezone));
  return new Date(localAsUtc - timezoneOffsetMs(guess, timezone));
}

// ---------------------------------------------------------------------------
// Edit form
// ---------------------------------------------------------------------------
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`,
}));

const WEEKDAY_OPTIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, weekday) => ({ value: weekday, label }));

const DAY_OPTIONS = [
  ...Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
  { value: LAST_DAY, label: 'Last' },
];

const SCHEDULE_HELP = `Each scheduled time runs once, on the first one-minute tick after it.
  If the system is down it can still run late, within 10% of the gap since the previous time
  (daily ≈ 2.4h, weekly ≈ 16.8h, monthly ≈ 3 days); after that it is skipped.
  New tasks wait for their next time.`;

const onlyFor = (...types) => ({ key: 'schedule_type', values: types });

const EDIT_FIELDS = [
  { key: 'name',               label: 'Name',        type: 'textarea', rows: 2, validate: 'required' },
  { key: 'schedule_type',      label: 'Schedule',    type: 'buttons', validate: 'required', options: [
    { value: 'minutes', label: 'Every N min' },
    { value: 'daily',   label: 'Daily' },
    { value: 'weekly',  label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ]},
  { key: 'minutes',            label: 'Minutes',     type: 'text', coerce: 'number', validate: ['required', 'posint'],
    showWhen: onlyFor('minutes') },
  { key: 'schedule_weekday',   label: 'Days',        type: 'buttons', multiple: true, coerce: 'number', validate: 'required',
    columns: 7, options: WEEKDAY_OPTIONS, showWhen: onlyFor('weekly') },
  { key: 'schedule_day',       label: 'Days of month', type: 'buttons', multiple: true, coerce: 'number', validate: 'required',
    columns: 8, options: DAY_OPTIONS, hint: 'Days 29–31 move to the last day in shorter months.',
    showWhen: onlyFor('monthly') },
  { key: 'schedule_hour',      label: 'Hour (Pacific)', type: 'select', nullable: true, coerce: 'number', validate: 'required',
    options: HOUR_OPTIONS, showWhen: onlyFor(...RECURRING_TYPES) },
  { key: 'schedule_minute',    label: 'Minute',      type: 'text', coerce: 'number', validate: 'int', min: 0, max: 59,
    showWhen: onlyFor(...RECURRING_TYPES) },
  { key: 'schedule_preview',   label: 'Next runs',   type: 'preview', render: nextRunsHtml, hint: SCHEDULE_HELP,
    showWhen: onlyFor(...RECURRING_TYPES) },
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
          ${RECURRING_TYPES.includes(r.schedule_type) ? `
            <div class="text-sm font-mono">${scheduleSummary(r)}</div>
            <div class="text-xs opacity-50">Next runs</div>
            ${nextRunsHtml(r)}
          ` : `<div class="text-sm">Every <strong>${r.minutes}</strong> minute(s)</div>`}
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

  actions: `<button class="btn btn-primary btn-sm" onclick="window._scheduledCreate()">+ New</button>`,

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
      key:    'schedule_type',
      label:  'Schedule',
      render: (val, r) => `<span class="text-sm font-mono whitespace-nowrap">${scheduleSummary(r)}</span>`,
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
window._scheduledCreate = () => {
  window._CrudForm.open(
    { title: 'New Scheduled Task', collection: COL, idField: '_id', fields: EDIT_FIELDS },
    { schedule_type: 'minutes', schedule_minute: 0 }
  );
};

window._scheduledEdit = () => {
  const r = window._currentScheduledRecord;
  window._CrudForm.open(
    { title: 'Edit Scheduled Task', collection: COL, idField: '_id', fields: EDIT_FIELDS },
    { ...r, schedule_type: r.schedule_type || 'minutes', schedule_minute: r.schedule_minute ?? 0 }
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

import { API }                    from '../core/api.js';
import { formatDate }             from '../core/helpers.js';

const COL = 'cfg.pa3_routine';

const PROJECTION = {
  title:         1,
  source:        1,
  priority:      1,
  expires_on:    1,
  scripts:       1,
  claimed_on:    1,
  claimed_by:    1,
  success_on:    1,
  error_on:      1,
  error:         1,
  report_on:     1,
  attempt_count: 1,
  imported_by:   1,
  script_count:  1,
  failed_count:  1,
  data:          1,
  created:       1,
  modified:      1,
};

// ---------------------------------------------------------------------------
// Status — derived from the claim/result timestamps (see pa3 README §3.1)
// ---------------------------------------------------------------------------
const STATUSES = {
  success: { label: 'Success', badge: 'badge-success' },
  error:   { label: 'Error',   badge: 'badge-error' },
  running: { label: 'Running', badge: 'badge-info' },
  queued:  { label: 'Queued',  badge: 'badge-warning' },
  expired: { label: 'Expired', badge: 'badge-ghost' },
};

function routineStatus(record) {
  if (record.success_on) return 'success';
  if (record.error_on)   return 'error';
  if (record.claimed_on) return 'running';
  if (record.expires_on && new Date(record.expires_on) < new Date()) return 'expired';
  return 'queued';
}

const statusBadge = (record) => {
  const status = STATUSES[routineStatus(record)];
  return `<span class="badge badge-sm ${status.badge}">${status.label}</span>`;
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const dateCell = (value) => value
  ? `<span class="text-xs opacity-60">${formatDate(value)}</span>`
  : `<span class="text-xs opacity-30">—</span>`;

// ---------------------------------------------------------------------------
// Elapsed — claimed_on to success_on/error_on, in whole seconds. The Power
// Automate loop runs each flow for 210s; the script is allowed 180s of that
// (30s buffer). Unfinished routines count up to now.
// ---------------------------------------------------------------------------
const ELAPSED_ALLOWED = 180;
const ELAPSED_LOOP    = 210;

// error_on on these is when the watchdog flagged the routine, not when it stopped.
const WATCHDOG_CODES = ['PA3_stuck', 'PA3_runner_abandoned', 'PA3_routine_too_long'];

function elapsedHtml(record) {
  if (!record.claimed_on) return `<span class="text-xs opacity-30">—</span>`;

  const finishedOn = record.success_on || record.error_on;
  const seconds    = Math.round((new Date(finishedOn || Date.now()) - new Date(record.claimed_on)) / 1000);
  const watchdog   = WATCHDOG_CODES.includes(record.error?.code);

  const colour = seconds > ELAPSED_LOOP ? 'text-error' : seconds > ELAPSED_ALLOWED ? 'text-warning' : '';
  const title  = watchdog ? ' title="End time is when the watchdog flagged it"' : '';
  const attempt = record.attempt_count > 1
    ? ` <span class="text-xs opacity-40">attempt ${record.attempt_count}</span>`
    : '';

  return `<span class="text-xs font-mono ${colour} ${watchdog ? 'opacity-50' : ''}"${title}>${seconds}s${finishedOn ? '' : '…'}${watchdog ? '*' : ''}</span>${attempt}`;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
const OID_RE = /^[a-f\d]{24}$/i;

function statusQuery(status) {
  const now = new Date().toISOString();
  switch (status) {
    case 'success': return { success_on: { $exists: true, $ne: null } };
    case 'error':   return { error_on: { $exists: true, $ne: null }, success_on: null };
    case 'running': return { claimed_on: { $exists: true, $ne: null }, success_on: null, error_on: null };
    case 'queued':  return { claimed_on: null, success_on: null, error_on: null, expires_on: { $gt: now } };
    default:        return {};
  }
}

async function fetch(state) {
  const { search, status } = state.filters;
  const q = status ? statusQuery(status) : {};
  if (search) {
    const term = search.trim();
    if (OID_RE.test(term)) q._id = term;
    else q.$or = [
      { title:  { $regex: term, $options: 'i' } },
      { source: { $regex: term, $options: 'i' } },
    ];
  }
  const s = { created: -1 };
  return API.find({ col: COL, q, s, p: PROJECTION, per: state.per, page: state.page });
}

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------
const jsonBlock = (value) => (value == null || (typeof value === 'object' && !Object.keys(value).length))
  ? `<div class="text-xs opacity-40">—</div>`
  : `<pre class="text-xs bg-base-300 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;

const section = (title, body) => `
  <div class="card bg-base-200">
    <div class="flex flex-col px-3 py-2 gap-2">
      <h3 class="text-xs uppercase tracking-wide opacity-60">${title}</h3>
      ${body}
    </div>
  </div>`;

const infoRow = (label, value) => `
  <tr>
    <td class="text-xs opacity-50 pr-3 align-top whitespace-nowrap">${label}</td>
    <td class="text-xs break-all">${value}</td>
  </tr>`;

function stepSummary(step) {
  const { timeout, optional, ...rest } = step;
  const [action] = Object.keys(rest);
  return { action, optional: !!optional };
}

// Captured data is routine-level: data.slots.<save_as> holds each extract's
// output. A string longer than this is cut in the preview (full text is one
// click away) so a 20k-char HTML capture doesn't bury the drawer.
const PREVIEW_CHARS = 300;

function dataValueHtml(value) {
  if (typeof value === 'string') {
    if (value.length <= PREVIEW_CHARS) return `<pre class="text-xs bg-base-300 rounded p-2 whitespace-pre-wrap break-all">${escapeHtml(value)}</pre>`;
    return `
      <details class="text-xs">
        <summary class="cursor-pointer font-mono break-all">${escapeHtml(value.slice(0, PREVIEW_CHARS))}… <span class="opacity-40">(${value.length.toLocaleString()} chars)</span></summary>
        <pre class="text-xs bg-base-300 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">${escapeHtml(value)}</pre>
      </details>`;
  }
  if (Array.isArray(value)) {
    return `
      <div class="text-xs opacity-50">${value.length} item${value.length === 1 ? '' : 's'}</div>
      <div class="space-y-1 pl-2 border-l border-base-content/10">
        ${value.map((item, index) => `<div><span class="text-xs opacity-40 font-mono">[${index}]</span>${dataValueHtml(item)}</div>`).join('')}
      </div>`;
  }
  if (value && typeof value === 'object') {
    return `
      <div class="space-y-1 pl-2 border-l border-base-content/10">
        ${Object.entries(value).map(([key, child]) => `<div><span class="text-xs font-mono opacity-60">${escapeHtml(key)}</span>${dataValueHtml(child)}</div>`).join('')}
      </div>`;
  }
  return `<pre class="text-xs bg-base-300 rounded p-2">${escapeHtml(JSON.stringify(value))}</pre>`;
}

function dataSectionHtml(data) {
  if (!data || !Object.keys(data).length) return '';
  // data.scripts is rendered in the script cards above, not here.
  const { slots, scripts, ...rest } = data;
  const slotNames = Object.keys(slots || {});

  const slotsHtml = slotNames.map(slotName => `
    <details class="text-xs">
      <summary class="cursor-pointer font-mono">${escapeHtml(slotName)}</summary>
      ${dataValueHtml(slots[slotName])}
    </details>`).join('');

  // Anything else the report handler stores alongside slots (e.g. html).
  const restHtml = Object.keys(rest).length ? dataValueHtml(rest) : '';

  return section(
    `Captured Data <span class="normal-case opacity-40 ml-1">${slotNames.length} slot${slotNames.length === 1 ? '' : 's'}</span>`,
    `${slotsHtml}${restHtml}`
  );
}

function scriptHtml(script, scriptIndex, record) {
  // data.scripts[i] is the executed result: status, step_index, meta merged by
  // expand functions, and the steps actually run (including spliced ones,
  // tagged expanded_from). Fall back to the planned script until it reports.
  const result = record.data?.scripts?.[scriptIndex];
  const steps  = result?.steps || script.steps || [];
  const meta   = result?.meta  || script.meta;

  const failedStepIndex = result?.status === 'fail'
    ? result.step_index
    : (record.error?.script_index === scriptIndex ? record.error.step_index : null);

  const statusBadgeHtml = result
    ? `<span class="badge badge-xs ${result.status === 'success' ? 'badge-success' : 'badge-error'}">${escapeHtml(result.status)}</span>`
    : '';

  const stepsHtml = steps.map((step, stepIndex) => {
    const { expanded_from, ...bareStep } = step;
    const { action, optional } = stepSummary(bareStep);
    const failedHere = stepIndex === failedStepIndex;
    return `
      <details class="text-xs ${failedHere ? 'text-error' : ''} ${expanded_from != null ? 'pl-3' : ''}">
        <summary class="cursor-pointer font-mono">
          <span class="opacity-40">${stepIndex}</span> ${escapeHtml(action)}${optional ? ' <span class="opacity-40">(optional)</span>' : ''}${expanded_from != null ? ` <span class="opacity-40">↳ from ${expanded_from}</span>` : ''}${failedHere ? ' ← failed' : ''}
        </summary>
        ${jsonBlock(bareStep)}
      </details>`;
  }).join('');

  return section(`
    ${scriptIndex + 1}. <span class="normal-case font-mono">${escapeHtml(script.name)}</span>
    <span class="normal-case opacity-40 ml-1">max ${script.max_time ?? '—'}s</span> ${statusBadgeHtml}
  `, `
    ${meta ? jsonBlock(meta) : ''}
    <div class="space-y-0.5">${stepsHtml}</div>
    ${afterHtml(script.after, result)}
  `);
}

// The script's `after` call (declared on the script, run by v2-pa3ScriptReport
// once the script reports) and what happened: data.scripts[i].after_result.
const AFTER_STATUSES = {
  ok:      'badge-success',
  error:   'badge-error',
  not_run: 'badge-ghost',
};

function afterHtml(after, result) {
  if (!after) return `<div class="text-xs opacity-40 border-t border-base-content/10 pt-2">after: none</div>`;

  const afterResult = result?.after_result;
  const declaration = `<span class="font-mono">${escapeHtml(after.post)}</span>${after.also_on_fail ? ' <span class="opacity-40">(also on fail)</span>' : ''}`;

  let outcomeHtml;
  if (!afterResult) {
    outcomeHtml = `<span class="opacity-40">${result ? 'no record (reported before after_result existed)' : 'waiting for the script to report'}</span>`;
  } else {
    const badge = `<span class="badge badge-xs ${AFTER_STATUSES[afterResult.status] || 'badge-ghost'}">${escapeHtml(afterResult.status)}</span>`;
    const timing = afterResult.started_on
      ? `<span class="opacity-50">${formatDate(afterResult.started_on)} · ${afterResult.ms ?? '—'} ms · attempt ${afterResult.attempt_count ?? 1}</span>`
      : '';
    const detail = afterResult.status === 'error'
      ? `<div class="font-mono text-error break-all">${escapeHtml(afterResult.error?.code)} ${escapeHtml(afterResult.error?.message)}</div>`
      : afterResult.reason
        ? `<div class="opacity-60">${escapeHtml(afterResult.reason)}</div>`
        : '';
    const response = 'result' in afterResult
      ? `<details><summary class="cursor-pointer font-mono">response</summary>${jsonBlock(afterResult.result)}</details>`
      : '';
    outcomeHtml = `${badge} ${timing}${detail}${response}`;
  }

  return `
    <div class="text-xs border-t border-base-content/10 pt-2 space-y-1">
      <div><span class="uppercase tracking-wide opacity-60 mr-1">after</span>${declaration}</div>
      <div>${outcomeHtml}</div>
    </div>`;
}

const drawerTemplate = (record) => {
  window._currentPa3RoutineRecord = record;

  const errorHtml = record.error ? section('Error', `
    <div class="text-sm font-mono text-error">${escapeHtml(record.error.code)}: ${escapeHtml(record.error.message)}</div>
    <div class="text-xs opacity-50">script ${record.error.script_index ?? '—'}, step ${record.error.step_index ?? '—'}</div>
  `) : '';

  const infoHtml = `<table class="w-full">
    ${infoRow('Status',     statusBadge(record))}
    ${infoRow('Source',     `<span class="font-mono">${escapeHtml(record.source) || '—'}</span>`)}
    ${record.imported_by ? infoRow('Imported by', `<span class="font-mono">${escapeHtml(record.imported_by)}</span>`) : ''}
    ${infoRow('Priority',   record.priority ?? 0)}
    ${infoRow('Attempts',   record.attempt_count ?? 0)}
    ${infoRow('Scripts',    `${(record.script_count ?? record.scripts?.length ?? 0) - (record.failed_count ?? 0)} ok / ${record.failed_count ?? 0} failed of ${record.script_count ?? record.scripts?.length ?? 0}`)}
    ${infoRow('Created',    record.created    ? formatDate(record.created)    : '—')}
    ${infoRow('Expires',    record.expires_on ? formatDate(record.expires_on) : '—')}
    ${infoRow('Claimed',    record.claimed_on ? `${formatDate(record.claimed_on)} by <span class="font-mono">${escapeHtml(record.claimed_by)}</span>` : '—')}
    ${infoRow('Succeeded',  record.success_on ? formatDate(record.success_on) : '—')}
    ${infoRow('Failed',     record.error_on   ? formatDate(record.error_on)   : '—')}
    ${infoRow('Elapsed',    elapsedHtml(record))}
  </table>`;

  return `
    <div class="space-y-3">
      ${errorHtml}
      ${section('Routine', infoHtml)}
      ${(record.scripts || []).map((script, index) => scriptHtml(script, index, record)).join('')}
      ${dataSectionHtml(record.data)}
    </div>
  `;
};

// ---------------------------------------------------------------------------
// Page config
// ---------------------------------------------------------------------------
export const pa3Routines = {
  defaultSort:  'created',
  defaultOrder: -1,
  defaultPer:   50,

  drawerKey:   '_id',
  drawerTitle: (record) => record.title || 'Routine',
  drawer:      drawerTemplate,

  filters: [
    { name: 'search', type: 'text',   label: 'Search', placeholder: 'title, source or _id…' },
    { name: 'status', type: 'select', label: 'Status', options: ['queued', 'running', 'success', 'error'] },
  ],

  columns: [
    {
      key:    'title',
      label:  'Title',
      render: (val) => `<div class="text-sm">${escapeHtml(val) || '—'}</div>`,
    },
    {
      key:    'status',
      label:  'Status',
      render: (val, record) => statusBadge(record),
    },
    {
      key:    'source',
      label:  'Source',
      render: (val) => `<div class="text-xs font-mono">${escapeHtml(val) || '—'}</div>`,
    },
    {
      key:    'created',
      label:  'Created',
      render: (val) => dateCell(val),
    },
    {
      key:    'claimed_on',
      label:  'Claimed',
      render: (val, record) => val
        ? `<div class="text-xs opacity-60">${formatDate(val)}</div><div class="text-xs font-mono opacity-40">${escapeHtml(record.claimed_by)}</div>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
    {
      key:    'elapsed',
      label:  'Elapsed',
      render: (val, record) => elapsedHtml(record),
    },
    {
      key:    'error',
      label:  'Error',
      render: (val) => val
        ? `<div class="text-xs text-error font-mono">${escapeHtml(val.code)}</div>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
  ],

  fetch,
};

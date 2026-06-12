import { API }      from './api.js';
import { validate } from './form.js';

function _esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Registry for obj-array row renderers, keyed by container id
const _rowFieldDefs = new Map();

// ---------------------------------------------------------------------------
// Field renderers
// ---------------------------------------------------------------------------
function renderBtnRadio(lf, r) {
  const val     = String(r[lf.key] ?? lf.default ?? lf.options?.[0] ?? '');
  const spanCls = lf.span === 2 ? 'col-span-2' : '';
  return `
    <div class="form-control ${spanCls}">
      <label class="label py-0"><span class="label-text text-xs">${lf.label ?? lf.key}</span></label>
      <input type="hidden" name="${lf.key}" value="${_esc(val)}" />
      <div class="flex gap-1.5 flex-wrap pt-0.5">
        ${(lf.options ?? []).map(opt => {
          const s   = String(opt);
          const cls = lf.colors?.[opt] ?? 'border-base-content/30';
          return `<button type="button" data-btnradio="${lf.key}" data-val="${_esc(s)}"
            class="btn btn-xs btn-outline ${cls} ${val === s ? '' : 'opacity-30'}"
            onclick="window._dfBtnRadio(this)">${opt}</button>`;
        }).join('')}
      </div>
    </div>`;
}

function renderCheckboxGroup(lf, r) {
  const vals = r[lf.key] ?? [];
  return `
    <div class="col-span-2">
      <span class="text-xs opacity-50">${lf.label ?? lf.key}</span>
      <div class="flex flex-wrap gap-3 mt-1">
        ${(lf.options ?? []).map(opt => `
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" name="${lf.key}" value="${_esc(String(opt))}"
              class="checkbox checkbox-xs checkbox-primary" ${vals.includes(opt) ? 'checked' : ''} />
            <span class="text-xs capitalize">${opt}</span>
          </label>`).join('')}
      </div>
    </div>`;
}

function renderObjSubfield(f, value) {
  const strValue = value != null ? String(value) : '';
  if (f.picker) {
    return `
      <div class="flex flex-1 min-w-0 gap-0.5 items-center">
        <input type="text" value="${_esc(strValue)}"
          class="input input-bordered input-xs flex-1 min-w-0"
          data-subfield="${f.key}" />
        <button type="button" class="btn btn-ghost btn-xs btn-square shrink-0"
          onclick="window._dfRunPicker(this,'${f.picker}')" title="Browse">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 5.5 2-2.5 3 5z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>`;
  }
  return `<input type="${f.type === 'number' ? 'number' : 'text'}"
    value="${_esc(strValue)}" step="any"
    class="input input-bordered input-xs ${f.type === 'number' ? 'w-16' : 'flex-1 min-w-0'}"
    data-subfield="${f.key}" />`;
}

function renderObjRow(fields, row = {}) {
  return `
    <div class="df-obj-row flex gap-1 items-center mb-1">
      ${fields.map(f => renderObjSubfield(f, row[f.key])).join('')}
      <button type="button" class="btn btn-ghost btn-xs text-error px-1"
        onclick="this.closest('.df-obj-row').remove()">✕</button>
    </div>`;
}

function renderObjArray(lf, sf, r) {
  const cid  = `df-obj-${lf.key}`;
  _rowFieldDefs.set(cid, sf.fields);
  const rows = r[lf.key] ?? [];
  return `
    <div class="col-span-2">
      <div class="flex gap-1 text-xs text-base-content/40 mb-0.5 pr-6">
        ${sf.fields.map(f =>
          `<span class="${f.type === 'number' ? 'w-16' : 'flex-1'} pl-1">${f.key}</span>`
        ).join('')}
      </div>
      <div id="${cid}">
        ${rows.map(row => renderObjRow(sf.fields, row)).join('')}
      </div>
      <button type="button" class="btn btn-ghost btn-xs self-start mt-1"
        onclick="window._dfAddObjRow('${cid}')">+ Add</button>
    </div>`;
}

function renderField(lf, sf, r) {
  if (lf.render) return lf.render(r[lf.key], r);
  if (lf.display === 'button-radio') return renderBtnRadio(lf, r);
  if (sf.type === 'string[]')        return renderCheckboxGroup(lf, r);
  if (sf.type === 'obj[]')           return renderObjArray(lf, sf, r);

  const spanCls = lf.span === 2 ? 'col-span-2' : '';
  const val     = r[lf.key] ?? '';

  if (sf.type === 'boolean') {
    return `
      <div class="${spanCls}">
        <label class="flex items-center gap-2 cursor-pointer py-1">
          <input type="checkbox" name="${lf.key}" class="checkbox checkbox-sm checkbox-primary"
            ${val ? 'checked' : ''} />
          <span class="text-xs">${lf.label ?? lf.key}</span>
          ${lf.hint ? `<span class="text-xs opacity-40">${lf.hint}</span>` : ''}
        </label>
      </div>`;
  }

  const inputHtml = (() => {
    if (lf.options) return `
      <select name="${lf.key}" class="select select-bordered select-sm">
        <option value="">—</option>
        ${lf.options.map(o => `<option value="${_esc(o)}" ${val === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>`;
    if (sf.type === 'number') return `
      <input type="number" name="${lf.key}" min="0" step="any"
        class="input input-bordered input-sm" value="${val !== null ? val : ''}" />`;
    if (lf.multiline) return `
      <textarea name="${lf.key}" rows="${lf.rows ?? 4}"
        class="textarea textarea-bordered textarea-xs w-full font-mono"
        placeholder="${lf.placeholder ?? ''}">${_esc(String(val))}</textarea>`;
    return `
      <input type="text" name="${lf.key}" value="${_esc(String(val))}"
        placeholder="${lf.placeholder ?? ''}"
        class="input input-bordered input-sm ${lf.mono ? 'font-mono' : ''}" />`;
  })();

  return `
    <div class="form-control ${spanCls}">
      <label class="label py-0"><span class="label-text text-xs">${lf.label ?? lf.key}</span></label>
      ${inputHtml}
    </div>`;
}

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------
function renderSection(section, sMap, r) {
  if (section.render) return section.render(r);

  const header = section.label ? `
    <div class="flex items-baseline justify-between">
      <h3 class="card-title text-sm uppercase tracking-wide opacity-60">${section.label}</h3>
      ${section.note ? `<span class="text-xs opacity-40">${section.note}</span>` : ''}
    </div>` : '';

  const fieldsHtml = (section.fields ?? []).map(f => {
    const lf = typeof f === 'string' ? { key: f } : f;
    const sf = sMap[lf.key];
    return sf ? renderField(lf, sf, r) : '';
  }).join('');

  return `
    <div class="card bg-base-200">
      <div class="card-body py-4 gap-2">
        ${header}
        <div class="grid grid-cols-2 gap-2">
          ${fieldsHtml}
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------
function collectObjArray(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('.df-obj-row')).map(row => {
    const obj = {};
    row.querySelectorAll('[data-subfield]').forEach(el => {
      const v = el.value;
      obj[el.dataset.subfield] = el.type === 'number' ? (v === '' ? null : +v) : v;
    });
    return Object.values(obj).some(v => v !== null && v !== '') ? obj : null;
  }).filter(Boolean);
}

function serializeForm(schema, formEl) {
  const data = new FormData(formEl);
  const doc  = {};
  const _id  = data.get('_id');
  if (_id) doc._id = _id;
  for (const f of schema.fields) {
    if (f.type === 'string[]') {
      doc[f.key] = data.getAll(f.key);
    } else if (f.type === 'obj[]') {
      doc[f.key] = collectObjArray(`df-obj-${f.key}`);
    } else if (f.type === 'boolean') {
      doc[f.key] = data.has(f.key);
    } else if (f.type === 'number') {
      const v = data.get(f.key);
      doc[f.key] = v === '' || v === null ? null : +v;
    } else {
      doc[f.key] = data.get(f.key) ?? '';
    }
  }
  return doc;
}

// ---------------------------------------------------------------------------
// Window globals
// ---------------------------------------------------------------------------
window._dfBtnRadio = function(btn) {
  const name  = btn.dataset.btnradio;
  const val   = btn.dataset.val;
  const input = document.querySelector(`[name="${name}"][type="hidden"]`);
  if (input) input.value = val;
  document.querySelectorAll(`[data-btnradio="${name}"]`).forEach(b => {
    b.dataset.val === val ? b.classList.remove('opacity-30') : b.classList.add('opacity-30');
  });
};

// Pickers registered by feature modules: window._dfPickers['key'] = (input) => void
window._dfPickers = window._dfPickers ?? {};

window._dfRunPicker = function(btn, pickerKey) {
  const input = btn.closest('.df-obj-row')?.querySelector(`[data-subfield]`);
  window._dfPickers[pickerKey]?.(input);
};

window._dfAddObjRow = function(containerId) {
  const fields    = _rowFieldDefs.get(containerId);
  const container = document.getElementById(containerId);
  if (!fields || !container) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderObjRow(fields);
  container.appendChild(tmp.firstElementChild);
};

// ---------------------------------------------------------------------------
// Selection bar — floating action bar for tabs with multi-select checkboxes
// ---------------------------------------------------------------------------
window._dfSelectionChanged = function() {
  const checked = document.querySelectorAll('.df-sel-checkbox:checked');
  const bar     = document.getElementById('df-sel-bar');
  const countEl = document.getElementById('df-sel-count');
  if (!bar || !countEl) return;
  if (checked.length > 0) {
    bar.classList.remove('hidden');
    countEl.textContent = `${checked.length} item${checked.length === 1 ? '' : 's'} selected`;
    bar.querySelectorAll('.df-sel-single-btn').forEach(btn => {
      btn.classList.toggle('hidden', checked.length !== 1);
    });
  } else {
    bar.classList.add('hidden');
  }
};

export function renderSelectionBar(actions) {
  const btns = (actions ?? []).map(action => {
    const extraClass = action.singleOnly ? ' df-sel-single-btn hidden' : '';
    return `<button type="button" class="btn btn-sm ${_esc(action.btnClass ?? 'btn-outline')}${extraClass}"
      onclick="${_esc(action.handler)}">${_esc(action.label)}</button>`;
  }).join('');
  return `
    <div id="df-sel-bar" class="sticky bottom-[-0.75rem] -mx-3 bg-base-100 border-t border-base-200 px-4 py-3 flex items-center gap-3 hidden">
      <span id="df-sel-count" class="text-sm flex-1 opacity-60"></span>
      ${btns}
    </div>`;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
export function makeDrawerTab(schema, layout) {
  const sMap = Object.fromEntries(schema.fields.map(f => [f.key, f]));

  return function renderTab(record) {
    window.drawerFormSubmit = async function() {
      const formEl = document.getElementById('df-form');
      const errEl  = document.getElementById('df-error');
      const btn    = document.getElementById('df-submit');

      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>'; }
      formEl?.classList.add('pointer-events-none', 'opacity-50');
      errEl?.classList.add('hidden');

      try {
        const doc    = serializeForm(schema, formEl);
        const _id    = doc._id ?? null;
        delete doc._id;
        const errors = schema.fields
          .filter(f => f.validate)
          .map(f => { const msg = validate(f, String(doc[f.key] ?? '')); return msg ? `${f.key}: ${msg}` : null; })
          .filter(Boolean);
        if (errors.length) {
          if (errEl) { errEl.textContent = errors.join(' · '); errEl.classList.remove('hidden'); }
          if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
          formEl?.classList.remove('pointer-events-none', 'opacity-50');
          return;
        }
        const endpoint = schema.endpoint ?? 'v2-mdb';
        const body     = schema.endpoint
          ? JSON.stringify(_id ? { _id, ...doc } : doc)
          : _id
            ? JSON.stringify({ op: 'updateVerify', col: schema.collection, q: { _id }, doc })
            : JSON.stringify({ op: 'insertVerify', col: schema.collection, doc });
        const result = await API.gcf(endpoint, { toast: 'Saved', body });
        if (_id && result?.records?.length === 0) {
          window._Table?.markDeleted(_id);
          window._Drawer?.close();
          return;
        }
        const saved = result?.records?.[0] ?? result;
        API.storeUpdate(schema.collection, saved);
        window._Table?.upsertRow(saved);
        window._Drawer?.close();
      } catch {
        // API.gcf already fired a toast for the error
      } finally {
        formEl?.classList.remove('pointer-events-none', 'opacity-50');
        if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
      }
    };

    return `
      <form id="df-form" class="space-y-3 pb-4" onsubmit="event.preventDefault()">
        ${record._id != null ? `<input type="hidden" name="_id" value="${_esc(String(record._id))}" />` : ''}
        ${layout.map(section => renderSection(section, sMap, record)).join('')}
        <div id="df-error" class="alert alert-error text-sm hidden"></div>
        <button id="df-submit" type="button" class="btn btn-primary btn-sm w-full"
          onclick="window.drawerFormSubmit()">Save to Database</button>
      </form>`;
  };
}

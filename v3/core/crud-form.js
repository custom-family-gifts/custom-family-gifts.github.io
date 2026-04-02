import { API } from './api.js';

// ---------------------------------------------------------------------------
// Validators — field.validate: 'proof' | 'email' | 'required' | 'numeric' | 'money'
//              or an array of those
// ---------------------------------------------------------------------------
const VALIDATORS = {
  required: (v) => v.trim()                                          ? null : 'Required',
  numeric:  (v) => !v || /^\d+(\.\d+)?$/.test(v.trim())             ? null : 'Must be a number',
  money:    (v) => !v || /^\d+(\.\d{0,2})?$/.test(v.trim())         ? null : 'Must be a valid amount (e.g. 12.50)',
  email:    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Must be a valid email address',
  proof:    (v) => !v || /^[a-zA-Z](\s*,\s*[a-zA-Z])*\s*$/.test(v.trim()) ? null : 'Letters and commas only (e.g. A, B)',
};

function _validate(field, value) {
  if (!field.validate) return null;
  const rules = Array.isArray(field.validate) ? field.validate : [field.validate];
  for (const rule of rules) {
    const msg = VALIDATORS[rule]?.(value);
    if (msg) return msg;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Field renderers
// ---------------------------------------------------------------------------
function _esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _field(f, record) {
  const val = record[f.key] ?? '';
  const id  = `cf-${f.key}`;
  const lbl = f.label || f.key;

  switch (f.type) {
    case 'textarea':
      return `
        <div class="form-control gap-1">
          <label class="label py-0" for="${id}"><span class="label-text">${lbl}</span></label>
          <textarea id="${id}" name="${f.key}" rows="${f.rows || 3}"
            class="textarea textarea-bordered w-full">${_esc(val)}</textarea>
        </div>`;

    case 'select': {
      const opts = (f.options || []).map(o => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return `<option value="${_esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${_esc(l)}</option>`;
      }).join('');
      return `
        <div class="form-control gap-1">
          <label class="label py-0" for="${id}"><span class="label-text">${lbl}</span></label>
          <select id="${id}" name="${f.key}" class="select select-bordered w-full">
            ${f.nullable ? '<option value="">—</option>' : ''}
            ${opts}
          </select>
        </div>`;
    }

    case 'toggle':
      return `
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-3 py-1">
            <input id="${id}" name="${f.key}" type="checkbox" class="toggle toggle-primary"
              ${val ? 'checked' : ''} />
            <span class="label-text">${lbl}</span>
          </label>
        </div>`;

    default: // text
      return `
        <div class="form-control gap-1">
          <label class="label py-0" for="${id}"><span class="label-text">${lbl}</span></label>
          <input id="${id}" name="${f.key}" type="text" value="${_esc(val)}"
            class="input input-bordered w-full" />
          ${f.validate ? `<span id="${id}-err" class="text-error text-xs hidden"></span>` : ''}
        </div>`;
  }
}

// ---------------------------------------------------------------------------
// Form shell — no submit button; it lives in the modal action bar
// ---------------------------------------------------------------------------
function _render(schema, record) {
  return `
    <form id="cf-form" class="space-y-3 min-w-72">
      ${schema.fields.map(f => _field(f, record)).join('')}
      <div id="cf-error" class="text-error text-sm hidden"></div>
    </form>
  `;
}

// ---------------------------------------------------------------------------
// Submit handler
// ---------------------------------------------------------------------------
async function _handleSubmit(e, schema, record) {
  e.preventDefault();

  const form      = e.target;
  const submitBtn = document.getElementById('cf-submit');
  const errorEl   = form.querySelector('#cf-error');

  errorEl.classList.add('hidden');
  submitBtn.disabled  = true;
  submitBtn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

  // Serialise — toggles are absent from FormData when unchecked
  const data = new FormData(form);
  const set  = {};
  for (const f of schema.fields) {
    if (f.type === 'toggle') {
      set[f.key] = data.has(f.key);
    } else {
      const v = data.get(f.key) ?? '';
      set[f.key] = f.coerce === 'number' ? +v : v;
    }
  }

  // Per-field validation
  let hasErrors = false;
  for (const f of schema.fields) {
    if (!f.validate) continue;
    const errEl = form.querySelector(`#cf-${f.key}-err`);
    const msg   = _validate(f, String(set[f.key] ?? ''));
    if (errEl) {
      errEl.textContent = msg ?? '';
      errEl.classList.toggle('hidden', !msg);
    }
    if (msg) hasErrors = true;
  }
  if (hasErrors) {
    submitBtn.disabled  = false;
    submitBtn.textContent = 'Save';
    return;
  }

  try {
    throw new Error('Need to save to AT');

    const result = await API.gcf('v2-mdb', {
      body: JSON.stringify({
        op:  'updateVerify',
        col: schema.collection,
        q:   { _id: record._id },
        doc: set,
      }),
    });

    API.storeUpdate(schema.collection, result.records[0]);

    window._Modal.close();
    window._Toast?.success('Saved');
    window._Modal.onSuccess?.(result, set, schema);
  } catch (err) {
    const msg = err.message || 'Save failed.';
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Save';
    window._Toast?.error(msg);
  }
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
export const CrudForm = {
  open(schema, record) {
    window._Modal.open(
      _render(schema, record),
      schema.title ?? '',
      {
        actions: `<button id="cf-submit" form="cf-form" type="submit" class="btn btn-primary btn-sm">Save</button>`,
      }
    );
    document
      .getElementById('modal-body')
      .querySelector('#cf-form')
      .addEventListener('submit', (e) => _handleSubmit(e, schema, record));
  },
};

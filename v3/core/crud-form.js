import { API }                             from './api.js';
import { validate, renderField, isShown }  from './form.js';

// ---------------------------------------------------------------------------
// Form shell
// ---------------------------------------------------------------------------
function _render(schema, record) {
  return `
    <form id="cf-form" class="grid grid-cols-2 gap-x-3 gap-y-2 min-w-72">
      ${schema.fields.map(f => renderField(f, record)).join('')}
      <div id="cf-error" class="col-span-2 text-error text-sm hidden"></div>
    </form>
  `;
}

// ---------------------------------------------------------------------------
// Serialise — every field's current value, keyed by field key.
// Checkboxes/toggles are absent from FormData when unchecked.
// coerce: 'number' turns '' into null so 'required' still catches an empty input.
// ---------------------------------------------------------------------------
function _toNumber(value) {
  return value === '' ? null : +value;
}

function _readValues(form, schema) {
  const data   = new FormData(form);
  const values = {};
  for (const f of schema.fields) {
    if (f.type === 'preview') continue;
    if (f.type === 'toggle' || f.type === 'checkbox') {
      values[f.key] = data.has(f.key);
    } else if (f.type === 'buttons' && f.multiple) {
      const selected = data.getAll(f.key);
      values[f.key] = f.coerce === 'number' ? selected.map(Number) : selected;
    } else if (f.type === 'datetime') {
      const dateEl = form.querySelector(`#cf-${f.key}`);
      const timeEl = dateEl?.closest('.dt-wrap')?.querySelector('.dt-time');
      const dateVal = dateEl?.value ?? '';
      if (!dateVal) {
        values[f.key] = null;
      } else {
        const timeVal = timeEl?.value || '00:00';
        values[f.key] = new Date(`${dateVal}T${timeVal}`).toISOString();
      }
    } else {
      const v = data.get(f.key) ?? '';
      values[f.key] = f.coerce === 'number' ? _toNumber(v) : v;
    }
  }
  return values;
}

// Apply showWhen visibility and re-render previews against the current values.
function _refresh(form, schema, record) {
  const values = { ...record, ..._readValues(form, schema) };
  for (const f of schema.fields) {
    form.querySelector(`[data-field="${f.key}"]`)?.classList.toggle('hidden', !isShown(f, values));
    if (f.type === 'preview') {
      const previewEl = form.querySelector(`#cf-${f.key}`);
      if (previewEl) previewEl.innerHTML = f.render(values);
    }
  }
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

  // Hidden (showWhen) fields are neither validated nor saved
  const values = _readValues(form, schema);
  const shown  = schema.fields.filter(f => f.type !== 'preview' && isShown(f, { ...record, ...values }));
  const set    = Object.fromEntries(shown.map(f => [f.key, values[f.key]]));

  // Per-field validation
  let hasErrors = false;
  for (const f of shown) {
    if (!f.validate) continue;
    const errEl = form.querySelector(`#cf-${f.key}-err`);
    const msg   = validate(f, String(set[f.key] ?? ''));
    if (errEl) {
      errEl.textContent = msg ?? '';
      errEl.classList.toggle('hidden', !msg);
    }
    if (msg) hasErrors = true;
  }
  if (hasErrors) {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Save';
    return;
  }

  try {
    const idField  = schema.idField ?? '_id';
    const endpoint = schema.endpoint ?? 'v2-mdb';
    const isNew    = !record[idField];
    const result   = await API.gcf(endpoint, {
      toast: 'Saved',
      body: JSON.stringify(isNew
        ? { op: 'insertVerify', col: schema.collection, doc: set }
        : { op: 'updateVerify', col: schema.collection, q: { [idField]: record[idField] }, doc: set }
      ),
    });

    const saved = result?.records?.[0];
    if (isNew && saved) {
      API.storeUpdate(schema.collection, saved, idField);
      window._Table?.prependRow(saved);
    } else if (!isNew && saved) {
      const merged = { ...record, ...set, ...saved };
      API.storeUpdate(schema.collection, merged, idField);
      window._Table?.updateRow(merged);
      window._Drawer?.refresh(merged);
    } else if (!isNew && result?.records?.length === 0) {
      window._Table?.markDeleted(record[idField]);
      window._Drawer?.close();
    }
    window._Modal.close();
    window._Modal.onSuccess?.(result, set, schema);
  } catch (err) {
    const msg = err.message || 'Save failed.';
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Save';
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
    const form = document.getElementById('modal-body').querySelector('#cf-form');
    form.addEventListener('submit', (e) => _handleSubmit(e, schema, record));
    if (schema.fields.some(f => f.showWhen || f.type === 'preview')) {
      form.addEventListener('input',  () => _refresh(form, schema, record));
      form.addEventListener('change', () => _refresh(form, schema, record));
    }
  },
};

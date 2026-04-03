import { API }                    from './api.js';
import { validate, renderField }  from './form.js';

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

  // Serialise — checkboxes/toggles are absent from FormData when unchecked
  const data = new FormData(form);
  const set  = {};
  for (const f of schema.fields) {
    if (f.type === 'toggle' || f.type === 'checkbox') {
      set[f.key] = data.has(f.key);
    } else if (f.type === 'datetime') {
      const dateEl = form.querySelector(`#cf-${f.key}`);
      const timeEl = dateEl?.closest('.dt-wrap')?.querySelector('.dt-time');
      const dateVal = dateEl?.value ?? '';
      if (!dateVal) {
        set[f.key] = null;
      } else {
        const timeVal = timeEl?.value || '00:00';
        set[f.key] = new Date(`${dateVal}T${timeVal}`).toISOString();
      }
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
    const result   = await API.gcf(endpoint, {
      body: JSON.stringify({
        op:  'updateVerify',
        col: schema.collection,
        q:   { [idField]: record[idField] },
        doc: set,
      }),
    });

    const updated = result?.records?.[0];
    if (updated) {
      const merged = { ...set, ...updated };
      API.storeUpdate(schema.collection, merged, idField);
      window._Drawer?.refresh(merged);
    }
    window._Modal.close();
    window._Toast?.success('Saved');
    window._Modal.onSuccess?.(result, set, schema);
  } catch (err) {
    console.error('[CrudForm] save error:', err);
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

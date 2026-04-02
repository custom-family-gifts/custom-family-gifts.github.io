import { API } from './api.js';

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

  try {
    const result = await API.gcf('v2-mdb', {
      body: JSON.stringify({
        op:     'updateOne',
        col:    schema.collection,
        q:      { [schema.idField]: record[schema.idField] },
        update: { $set: set },
      }),
    });

    API.storeUpdate(schema.collection, { [schema.idField]: record[schema.idField], ...set });

    window._Modal.close();
    window._Modal.onSuccess?.(result, set, schema);
  } catch (err) {
    errorEl.textContent = err.message || 'Save failed.';
    errorEl.classList.remove('hidden');
    submitBtn.disabled   = false;
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
    document
      .getElementById('modal-body')
      .querySelector('#cf-form')
      .addEventListener('submit', (e) => _handleSubmit(e, schema, record));
  },
};

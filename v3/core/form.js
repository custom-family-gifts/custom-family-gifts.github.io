// ---------------------------------------------------------------------------
// Validators — field.validate: 'required' | 'numeric' | 'posint' | 'money' | 'email' | 'proof'
//              or an array of those
// ---------------------------------------------------------------------------
export const VALIDATORS = {
  required: (v) => v.trim()                                                   ? null : 'Required',
  numeric:  (v) => !v || /^\d+(\.\d+)?$/.test(v.trim())                      ? null : 'Must be a number',
  posint:   (v) => !v || (/^\d+$/.test(v.trim()) && +v > 0)                  ? null : 'Must be a positive whole number',
  money:    (v) => !v || /^\d+(\.\d{0,2})?$/.test(v.trim())                  ? null : 'Must be a valid amount (e.g. 12.50)',
  email:    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())         ? null : 'Must be a valid email address',
  proof:    (v) => !v || /^[a-zA-Z](\s*,\s*[a-zA-Z])*\s*$/.test(v.trim())   ? null : 'Letters and commas only (e.g. A, B)',
};

export function validate(field, value) {
  if (!field.validate) return null;
  const rules = Array.isArray(field.validate) ? field.validate : [field.validate];
  for (const rule of rules) {
    const msg = VALIDATORS[rule]?.(value);
    if (msg) return msg;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Field renderer — returns an HTML string for a single field definition
// ---------------------------------------------------------------------------
function _esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderField(f, record) {
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

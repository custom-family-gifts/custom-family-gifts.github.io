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

// Wide types always span both grid columns; all others flow naturally as col-span-1.
const WIDE_TYPES = new Set(['textarea', 'datetime']);

// Shared wrapper: label (+ optional asterisk), input, hint text, validation error slot.
// skipLabel: true for toggle/checkbox where the label is inline with the input.
function _wrap(f, id, lbl, asterisk, inputHtml, { skipLabel = false } = {}) {
  const span      = WIDE_TYPES.has(f.type) ? 'col-span-2' : 'col-span-1';
  const labelHtml = skipLabel ? '' : `
    <label class="label py-0" for="${id}">
      <span class="label-text text-xs">${lbl}${asterisk}</span>
    </label>`;
  const hintHtml = f.hint
    ? `<p class="text-xs text-base-content/40 mt-0.5">${f.hint}</p>`
    : '';
  const errHtml = f.validate
    ? `<span id="${id}-err" class="text-error text-xs hidden"></span>`
    : '';
  return `
    <div class="form-control gap-0.5 ${span}">
      ${labelHtml}
      ${inputHtml}
      ${hintHtml}
      ${errHtml}
    </div>`;
}

export function renderField(f, record) {
  const val = record[f.key] ?? '';
  const id  = `cf-${f.key}`;
  const lbl = f.label || f.key;
  const hasRequired = [f.validate].flat().filter(Boolean).includes('required');
  const asterisk    = hasRequired ? `<span class="text-error ml-0.5">*</span>` : '';

  switch (f.type) {

    case 'textarea':
      return _wrap(f, id, lbl, asterisk, `
        <textarea id="${id}" name="${f.key}" rows="${f.rows || 3}"
          class="textarea textarea-bordered textarea-sm w-full">${_esc(val)}</textarea>`);

    case 'select': {
      const opts = (f.options || []).map(o => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return `<option value="${_esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${_esc(l)}</option>`;
      }).join('');
      return _wrap(f, id, lbl, asterisk, `
        <select id="${id}" name="${f.key}" class="select select-bordered select-sm w-full">
          ${f.nullable ? '<option value="">—</option>' : ''}
          ${opts}
        </select>`);
    }

    case 'toggle':
      return _wrap(f, id, lbl, asterisk, `
        <label class="flex items-center gap-2.5 cursor-pointer py-1 px-0.5">
          <input id="${id}" name="${f.key}" type="checkbox" class="toggle toggle-primary toggle-sm"
            ${val ? 'checked' : ''} />
          <span class="text-xs">${lbl}${asterisk}</span>
        </label>`, { skipLabel: true });

    case 'checkbox':
      return _wrap(f, id, lbl, asterisk, `
        <label class="flex items-center gap-2.5 cursor-pointer py-1 px-0.5">
          <input id="${id}" name="${f.key}" type="checkbox" class="checkbox checkbox-primary checkbox-sm"
            ${val ? 'checked' : ''} />
          <span class="text-xs">${lbl}${asterisk}</span>
        </label>`, { skipLabel: true });

    case 'datetime': {
      let dateVal = '', timeVal = '';
      if (val) {
        const d = new Date(val);
        if (!isNaN(d)) {
          dateVal = d.toISOString().slice(0, 10);
          timeVal = d.toTimeString().slice(0, 5);
        }
      }
      const hasValue = !!dateVal;
      return _wrap(f, id, lbl, asterisk, `
        <div class="dt-wrap flex gap-1 items-center">
          <input id="${id}" class="dt-date input input-bordered input-sm flex-1" type="date" value="${dateVal}" />
          <input class="dt-time input input-bordered input-sm w-28" type="time" value="${timeVal}" />
          <button type="button" class="${hasValue ? '' : 'hidden'} btn btn-ghost btn-sm text-error"
            onclick="var w=this.closest('.dt-wrap');w.querySelector('.dt-date').value='';w.querySelector('.dt-time').value='';this.classList.add('hidden');">
            Clear
          </button>
        </div>`);
    }

    default: // text
      return _wrap(f, id, lbl, asterisk, `
        <input id="${id}" name="${f.key}" type="text" value="${_esc(val)}"
          class="input input-bordered input-sm w-full" />`);
  }
}

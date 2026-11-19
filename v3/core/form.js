// ---------------------------------------------------------------------------
// Validators — field.validate: 'required' | 'numeric' | 'posint' | 'int' | 'money' | 'email' | 'proof'
//              or an array of those. field.min / field.max add an inclusive numeric range check.
// ---------------------------------------------------------------------------
export const VALIDATORS = {
  required: (v) => v.trim()                                                   ? null : 'Required',
  numeric:  (v) => !v || /^\d+(\.\d+)?$/.test(v.trim())                      ? null : 'Must be a number',
  posint:   (v) => !v || (/^\d+$/.test(v.trim()) && +v > 0)                  ? null : 'Must be a positive whole number',
  int:      (v) => !v || /^-?\d+$/.test(v.trim())                            ? null : 'Must be a whole number',
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
  if (value.trim() && (field.min != null || field.max != null)) {
    const number = +value;
    if (field.min != null && number < field.min) return `Must be at least ${field.min}`;
    if (field.max != null && number > field.max) return `Must be at most ${field.max}`;
  }
  return null;
}

// field.showWhen: { key, values } — the field is shown only while field `key` has one of `values`.
export function isShown(field, values) {
  if (!field.showWhen) return true;
  return field.showWhen.values.map(String).includes(String(values[field.showWhen.key] ?? ''));
}

// ---------------------------------------------------------------------------
// Field renderer — returns an HTML string for a single field definition
// ---------------------------------------------------------------------------
function _esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Wide types always span both grid columns; all others flow naturally as col-span-1.
const WIDE_TYPES = new Set(['textarea', 'datetime', 'buttons', 'preview']);

// Shared wrapper: label (+ optional asterisk), input, hint text, validation error slot.
// skipLabel: true for toggle/checkbox where the label is inline with the input.
// record: used for the initial showWhen visibility.
function _wrap(f, id, lbl, asterisk, inputHtml, { skipLabel = false, record = {} } = {}) {
  const span      = (f.full || WIDE_TYPES.has(f.type)) ? 'col-span-2' : 'col-span-1';
  const hidden    = isShown(f, record) ? '' : 'hidden';
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
    <div class="form-control gap-0.5 ${span} ${hidden}" data-field="${f.key}">
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
  const wrap        = (inputHtml, options = {}) => _wrap(f, id, lbl, asterisk, inputHtml, { record, ...options });

  switch (f.type) {

    case 'textarea':
      return wrap(`
        <textarea id="${id}" name="${f.key}" rows="${f.rows || 3}"
          class="textarea textarea-bordered textarea-sm w-full">${_esc(val)}</textarea>`);

    case 'select': {
      const opts = (f.options || []).map(o => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return `<option value="${_esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${_esc(l)}</option>`;
      }).join('');
      return wrap(`
        <select id="${id}" name="${f.key}" class="select select-bordered select-sm w-full">
          ${f.nullable ? '<option value="">—</option>' : ''}
          ${opts}
        </select>`);
    }

    case 'toggle':
      return wrap(`
        <label class="flex items-center gap-2.5 cursor-pointer py-1 px-0.5">
          <input id="${id}" name="${f.key}" type="checkbox" class="toggle toggle-primary toggle-sm"
            ${val ? 'checked' : ''} />
          <span class="text-xs">${lbl}${asterisk}</span>
        </label>`, { skipLabel: true });

    case 'checkbox':
      return wrap(`
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
      return wrap(`
        <div class="dt-wrap flex gap-1 items-center">
          <input id="${id}" class="dt-date input input-bordered input-sm flex-1" type="date" value="${dateVal}" />
          <input class="dt-time input input-bordered input-sm w-28" type="time" value="${timeVal}" />
          <button type="button" class="${hasValue ? '' : 'hidden'} btn btn-ghost btn-sm text-error"
            onclick="var w=this.closest('.dt-wrap');w.querySelector('.dt-date').value='';w.querySelector('.dt-time').value='';this.classList.add('hidden');">
            Clear
          </button>
        </div>`);
    }

    // Button group. Single choice → radios; multiple: true → checkboxes, serialized as an array.
    // options: [{ value, label }]; columns: N lays the buttons out in an N-column grid.
    case 'buttons': {
      const selected  = [].concat(val === '' ? [] : val).map(String);
      const inputType = f.multiple ? 'checkbox' : 'radio';
      const buttons   = (f.options || []).map(o => {
        const optionValue = typeof o === 'object' ? o.value : o;
        const optionLabel = typeof o === 'object' ? o.label : o;
        return `<input type="${inputType}" name="${f.key}" value="${_esc(optionValue)}" aria-label="${_esc(optionLabel)}"
          class="btn btn-sm ${f.columns ? 'w-full px-0' : ''}" ${selected.includes(String(optionValue)) ? 'checked' : ''} />`;
      }).join('');
      const layout = f.columns
        ? `class="grid gap-1" style="grid-template-columns:repeat(${f.columns},minmax(0,1fr))"`
        : `class="flex flex-wrap gap-1"`;
      return wrap(`<div id="${id}" ${layout}>${buttons}</div>`);
    }

    // Read-only, never saved. CrudForm re-renders it on every change: f.render(values) → html.
    case 'preview':
      return wrap(`<div id="${id}">${f.render(record)}</div>`);

    default: // text
      return wrap(`
        <input id="${id}" name="${f.key}" type="text" value="${_esc(val)}"
          ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}
          class="input input-bordered input-sm w-full" />`);
  }
}

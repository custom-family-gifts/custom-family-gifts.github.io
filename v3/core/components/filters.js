import { Router } from '../router.js';

export class Filters {
  #config;
  #onChange;
  #actions;
  #el;

  constructor(config, onChange, actions = '') {
    this.#config = config;
    this.#onChange = onChange;
    this.#actions = actions;
  }

  mount(el) {
    this.#el = el;
    el.innerHTML = `
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body py-3 px-4">
          <div class="flex flex-wrap gap-3 items-end">
            ${this.#config.map(f => this.#renderField(f)).join('')}
            <div class="flex gap-2 pb-0.5">
              <button id="filter-submit" class="btn btn-primary btn-sm">Filter</button>
              <button id="filter-clear" class="btn btn-ghost btn-sm">Clear</button>
            </div>
            ${this.#actions ? `<div class="ml-auto pb-0.5">${this.#actions}</div>` : ''}
          </div>
        </div>
      </div>
    `;

    el.querySelector('#filter-submit').addEventListener('click', () => this.#emit());
    el.querySelector('#filter-clear').addEventListener('click', () => this.#clear());

    el.querySelectorAll('input').forEach(input => {
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.#emit(); });
    });

    // Pre-populate inputs from URL silently (no emit — caller reads URL for initial state)
    const params = Router.getParams();
    this.#config.forEach(f => {
      if (params[f.name]) {
        const input = this.#el.querySelector(`[name="${f.name}"]`);
        if (input) input.value = params[f.name];
      }
    });
  }

  #emit({ syncUrl = true } = {}) {
    const values = {};
    this.#config.forEach(f => {
      const input = this.#el.querySelector(`[name="${f.name}"]`);
      if (input?.value) values[f.name] = input.value;
    });
    if (syncUrl) this.#syncUrl(values);
    this.#onChange(values);
  }

  #clear() {
    this.#el.querySelectorAll('input, select').forEach(i => i.value = '');
    this.#syncUrl({});
    this.#onChange({});
  }

  #syncUrl(filterValues) {
    const params = Router.getParams();
    // Remove all filter keys from current params, then add active ones
    this.#config.forEach(f => delete params[f.name]);
    Router.setParams({ ...params, ...filterValues });
  }

  #renderField(f) {
    const attrs = `name="${f.name}"`;
    if (f.type === 'select') {
      return `
        <div class="form-control gap-1">
          <label class="label py-0">
            <span class="label-text text-xs uppercase tracking-wide opacity-60">${f.label}</span>
          </label>
          <select ${attrs} class="select select-bordered select-sm min-w-32">
            <option value="">All</option>
            ${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}
          </select>
        </div>
      `;
    }
    return `
      <div class="form-control gap-1">
        <label class="label py-0">
          <span class="label-text text-xs uppercase tracking-wide opacity-60">${f.label}</span>
        </label>
        <input type="${f.type ?? 'text'}" ${attrs}
          placeholder="${f.placeholder ?? ''}"
          class="input input-bordered input-sm w-44">
      </div>
    `;
  }
}

export class Table {
  #columns;
  #onSort;
  #onRowClick;
  #el;
  #currentSort  = null;
  #currentOrder = 1;
  #byId         = {};

  constructor(columns, onSort, onRowClick) {
    this.#columns = columns;
    this.#onSort = onSort;
    this.#onRowClick = onRowClick;
  }

  mount(el) {
    this.#el = el;
    this.setLoading(true);
  }

  setLoading(loading) {
    if (loading) {
      this.#el.innerHTML = `
        <div class="flex justify-center items-center p-16">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      `;
    }
  }

  setData(records, sort, order) {
    this.#currentSort = sort;
    this.#currentOrder = order;

    this.#el.innerHTML = `
      <div class="overflow-x-auto rounded-box shadow-sm">
        <table class="table table-zebra table-sm bg-base-100 w-full">
          <thead class="bg-base-200">
            <tr>
              ${this.#columns.map(col => `
                <th class="${col.sortable ? 'cursor-pointer select-none hover:bg-base-300 transition-colors' : ''} ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}"
                    data-sort="${col.sortable ? col.key : ''}">
                  <div class="flex items-center gap-1">
                    ${col.label}
                    ${col.sortable ? this.#sortIcon(col.key) : ''}
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${records.length
              ? records.map(r => `
                  <tr class="hover cursor-pointer" data-id="${r._id ?? r.id}">
                    ${this.#columns.map(col => {
                      let cell;
                      try {
                        cell = col.render ? col.render(r[col.key], r) : (r[col.key] ?? '—');
                      } catch (e) {
                        console.warn(`[Table] render error — col "${col.key}":`, e);
                        cell = '⚠';
                      }
                      return `<td class="${col.hideOnMobile ? 'hidden sm:table-cell' : ''}">${cell}</td>`;
                    }).join('')}
                  </tr>
                `).join('')
              : `<tr>
                   <td colspan="${this.#columns.length}" class="text-center py-16 text-base-content/40">
                     No records found
                   </td>
                 </tr>`
            }
          </tbody>
        </table>
      </div>
    `;

    // Sort headers
    this.#el.querySelectorAll('th[data-sort]').forEach(th => {
      if (!th.dataset.sort) return;
      th.addEventListener('click', () => {
        const newOrder = th.dataset.sort === this.#currentSort ? this.#currentOrder * -1 : 1;
        this.#onSort({ sort: th.dataset.sort, order: newOrder });
      });
    });

    // Row click — index records by id for O(1) lookup
    this.#byId = Object.fromEntries(records.map(r => [String(r._id ?? r.id), r]));
    this.#el.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => this.#onRowClick(this.#byId[tr.dataset.id]));
    });
  }

  upsertRow(record) {
    const id = String(record._id ?? record.id);
    this.#el.querySelector(`tr[data-id="${id}"]`) ? this.updateRow(record) : this.prependRow(record);
  }

  prependRow(record) {
    const id = String(record._id ?? record.id);
    this.#byId[id] = record;
    const tbody = this.#el.querySelector('tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.className = 'hover cursor-pointer';
    tr.dataset.id = id;
    tr.innerHTML = this.#columns.map(col => {
      let cell;
      try {
        cell = col.render ? col.render(record[col.key], record) : (record[col.key] ?? '—');
      } catch (e) {
        cell = '⚠';
      }
      return `<td class="${col.hideOnMobile ? 'hidden sm:table-cell' : ''}">${cell}</td>`;
    }).join('');
    tr.addEventListener('click', () => this.#onRowClick(this.#byId[tr.dataset.id]));
    tbody.prepend(tr);
  }

  updateRow(record) {
    const id = String(record._id ?? record.id);
    this.#byId[id] = record;
    const tr = this.#el.querySelector(`tr[data-id="${id}"]`);
    if (!tr) return;
    tr.innerHTML = this.#columns.map(col => {
      let cell;
      try {
        cell = col.render ? col.render(record[col.key], record) : (record[col.key] ?? '—');
      } catch (e) {
        cell = '⚠';
      }
      return `<td class="${col.hideOnMobile ? 'hidden sm:table-cell' : ''}">${cell}</td>`;
    }).join('');
    if (record.deleted) {
      tr.classList.remove('hover', 'cursor-pointer');
      tr.classList.add('opacity-50', 'pointer-events-none');
    }
  }

  markDeleted(id) {
    const tr = this.#el.querySelector(`tr[data-id="${String(id)}"]`);
    if (!tr) return;
    tr.classList.remove('hover', 'cursor-pointer');
    tr.classList.add('opacity-50', 'pointer-events-none');
  }

  #sortIcon(key) {
    if (key !== this.#currentSort) return `<span class="opacity-20">⇅</span>`;
    return this.#currentOrder === 1
      ? `<span class="text-primary">↑</span>`
      : `<span class="text-primary">↓</span>`;
  }
}

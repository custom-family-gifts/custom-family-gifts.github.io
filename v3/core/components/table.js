export class Table {
  #columns;
  #onSort;
  #onRowClick;
  #el;
  #currentSort = null;
  #currentOrder = 1;

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
    const byId = Object.fromEntries(records.map(r => [String(r._id ?? r.id), r]));
    this.#el.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => this.#onRowClick(byId[tr.dataset.id]));
    });
  }

  #sortIcon(key) {
    if (key !== this.#currentSort) return `<span class="opacity-20">⇅</span>`;
    return this.#currentOrder === 1
      ? `<span class="text-primary">↑</span>`
      : `<span class="text-primary">↓</span>`;
  }
}

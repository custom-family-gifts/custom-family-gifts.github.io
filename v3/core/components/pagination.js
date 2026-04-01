const PER_OPTIONS = [25, 50, 100, 200];

export class Pagination {
  #onPageChange;
  #onPerChange;
  #el;

  constructor(onPageChange, onPerChange) {
    this.#onPageChange = onPageChange;
    this.#onPerChange  = onPerChange;
  }

  mount(el) {
    this.#el = el;
  }

  update({ page, per, total }) {
    const totalPages = Math.ceil(total / per);
    const start = (page - 1) * per + 1;
    const end = Math.min(page * per, total);

    const perSelect = `
      <select class="select select-sm" data-per>
        ${PER_OPTIONS.map(n => `<option value="${n}" ${n === per ? 'selected' : ''}>${n} per</option>`).join('')}
      </select>
    `;

    if (totalPages <= 1) {
      this.#el.innerHTML = total > 0
        ? `<div class="flex justify-between items-center">
             <span class="text-sm text-base-content/50">${total} records</span>
             ${perSelect}
           </div>`
        : '';
      this.#bindPerSelect();
      return;
    }

    this.#el.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="text-sm text-base-content/50">
          ${start}–${end} of ${total.toLocaleString()}
        </span>
        <div class="flex items-center gap-3">
          ${perSelect}
          <div class="join">
            ${this.#pages(page, totalPages).map(p =>
              p === '...'
                ? `<button class="join-item btn btn-sm btn-disabled opacity-40">…</button>`
                : `<button class="join-item btn btn-sm ${p === page ? 'btn-primary' : ''}" data-page="${p}">${p}</button>`
            ).join('')}
          </div>
        </div>
      </div>
    `;

    this.#el.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => this.#onPageChange(Number(btn.dataset.page)));
    });
    this.#bindPerSelect();
  }

  #bindPerSelect() {
    const sel = this.#el.querySelector('[data-per]');
    if (sel) sel.addEventListener('change', () => this.#onPerChange(Number(sel.value)));
  }

  #pages(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  }
}

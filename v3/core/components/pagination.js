export class Pagination {
  #onChange;
  #el;

  constructor(onChange) {
    this.#onChange = onChange;
  }

  mount(el) {
    this.#el = el;
  }

  update({ page, per, total }) {
    const totalPages = Math.ceil(total / per);
    const start = (page - 1) * per + 1;
    const end = Math.min(page * per, total);

    if (totalPages <= 1) {
      this.#el.innerHTML = total > 0
        ? `<div class="text-sm text-base-content/50 text-right">${total} records</div>`
        : '';
      return;
    }

    this.#el.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="text-sm text-base-content/50">
          ${start}–${end} of ${total.toLocaleString()}
        </span>
        <div class="join">
          ${this.#pages(page, totalPages).map(p =>
            p === '...'
              ? `<button class="join-item btn btn-sm btn-disabled opacity-40">…</button>`
              : `<button class="join-item btn btn-sm ${p === page ? 'btn-primary' : ''}" data-page="${p}">${p}</button>`
          ).join('')}
        </div>
      </div>
    `;

    this.#el.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => this.#onChange(Number(btn.dataset.page)));
    });
  }

  #pages(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  }
}

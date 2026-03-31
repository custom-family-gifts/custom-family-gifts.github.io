export class Drawer {
  #template;
  #el;
  #panel;
  #backdrop;
  #body;
  #title;

  constructor(template) {
    this.#template = template;
  }

  mount(el) {
    this.#el = el;
    el.innerHTML = `
      <!-- Backdrop -->
      <div id="drawer-backdrop"
        class="fixed inset-0 bg-black/30 z-40 hidden transition-opacity duration-300">
      </div>

      <!-- Panel -->
      <div id="drawer-panel"
        class="fixed top-0 right-0 h-full w-full max-w-lg bg-base-100 shadow-2xl
               translate-x-full transition-transform duration-300 ease-in-out
               z-50 flex flex-col">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-base-200 shrink-0">
          <h2 id="drawer-title" class="text-base font-semibold truncate pr-4"></h2>
          <button id="drawer-close" class="btn btn-sm btn-ghost btn-circle text-lg">✕</button>
        </div>

        <!-- Body -->
        <div id="drawer-body" class="flex-1 overflow-y-auto p-5"></div>
      </div>
    `;

    this.#panel    = el.querySelector('#drawer-panel');
    this.#backdrop = el.querySelector('#drawer-backdrop');
    this.#body     = el.querySelector('#drawer-body');
    this.#title    = el.querySelector('#drawer-title');

    el.querySelector('#drawer-close').addEventListener('click', () => this.close());
    this.#backdrop.addEventListener('click', () => this.close());

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  open(record) {
    this.#title.textContent = record.name ?? record.title ?? record._id ?? 'Detail';
    this.#body.innerHTML = this.#template
      ? this.#template(record)
      : this.#defaultTemplate(record);

    this.#backdrop.classList.remove('hidden');
    // rAF ensures the translate-x-full class is removed after paint, triggering the transition
    requestAnimationFrame(() => {
      this.#panel.classList.remove('translate-x-full');
    });
  }

  close() {
    this.#panel.classList.add('translate-x-full');
    this.#backdrop.classList.add('hidden');
  }

  // Fallback: renders every key/value as a labeled row
  #defaultTemplate(record) {
    return `
      <div class="divide-y divide-base-200">
        ${Object.entries(record).map(([k, v]) => `
          <div class="flex gap-4 py-2.5">
            <span class="text-xs uppercase tracking-wide text-base-content/40 w-28 shrink-0 pt-0.5">${k}</span>
            <span class="text-sm break-all">${typeof v === 'object' ? JSON.stringify(v) : v}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}

export class Toast {
  #container;

  mount(el) {
    el.innerHTML = `
      <div id="toast-container"
           class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      </div>
    `;
    this.#container = el.querySelector('#toast-container');
  }

  success(message = 'Saved successfully') {
    this.#show(message, 'alert-success', '✓');
  }

  error(message = 'Something went wrong') {
    this.#show(message, 'alert-error', '✕');
  }

  // type: 'alert-success' | 'alert-error' | 'alert-info' | 'alert-warning'
  #show(message, type, icon) {
    const toast = document.createElement('div');
    toast.className = `alert ${type} shadow-lg text-sm pointer-events-auto
      flex items-center gap-2 min-w-48 max-w-xs
      opacity-0 translate-y-2 transition-all duration-200`.replace(/\s+/g, ' ').trim();

    toast.innerHTML = `
      <span class="text-base leading-none">${icon}</span>
      <span>${message}</span>
    `;

    this.#container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-y-2');
    });

    // Animate out then remove
    const DURATION = 3000;
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, DURATION);
  }
}

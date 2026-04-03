import { Auth } from '../auth.js';

export class Nav {
  constructor(routes, router) {
    this.routes = routes;
    this.router = router;
  }

  mount(el) {
    el.innerHTML = this.#render();

    el.querySelectorAll('[data-route]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.router.navigate(a.dataset.route);
      });
    });

    el.querySelector('#nav-key-btn')?.addEventListener('click', () => {
      Auth.updateKey();
    });

    window.addEventListener('hashchange', () => this.#updateActive(el));
    this.#updateActive(el);
  }

  #updateActive(el) {
    const current = window.location.hash.slice(2).split('?')[0];
    el.querySelectorAll('[data-route]').forEach(a => {
      const isActive = a.dataset.route === current;
      a.style.borderBottomColor = isActive ? 'var(--color-primary, #f8886d)' : 'transparent';
      a.style.color = isActive ? 'oklch(var(--bc))' : '';
      a.classList.toggle('is-active', isActive);
    });
  }

  #render() {
    return `
      <div class="navbar bg-base-100 shadow-sm px-6 sticky top-0 z-30">
        <div class="navbar-start">
          <img src="/v3/assets/logo-admin.png" alt="Custom Family Gifts" class="h-10">
        </div>
        <div class="navbar-center">
          <ul class="menu menu-horizontal gap-1 p-0">
            ${this.routes.map(r => `
              <li>
                <a data-route="${r.path}"
                   style="border-bottom: 2px solid transparent; transition: border-color 0.15s, opacity 0.15s;"
                   class="gap-2 text-sm rounded-none text-base-content/60 hover:text-base-content hover:bg-base-200 active:!bg-base-200">
                  ${r.icon ? `<span>${r.icon}</span>` : ''}
                  ${r.label}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="navbar-end">
          <button id="nav-key-btn" class="btn btn-ghost btn-sm text-xs opacity-60 hover:opacity-100">
            welcome <span id="nav-key-label" class="font-mono ml-1">—</span>
          </button>
        </div>
      </div>
    `;
  }
}

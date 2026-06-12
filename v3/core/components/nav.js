import { Auth } from '../auth.js';

export class Nav {
  constructor(routes, router) {
    this.routes = routes;
    this.router = router;
    this.activeSection = this.#sectionForPath(this.#currentPath());
    this.el = null;
  }

  mount(el) {
    this.el = el;
    el.innerHTML = this.#render();
    this.#bindStatic();
    this.#updateActive();

    window.addEventListener('hashchange', () => {
      this.activeSection = this.#sectionForPath(this.#currentPath());
      this.#renderTabs();
      this.#updateActive();
    });
  }

  #bindStatic() {
    this.el.querySelector('#nav-key-btn')?.addEventListener('click', () => Auth.updateKey());

    this.el.querySelector('#nav-center').addEventListener('click', (event) => {
      const sectionBtn = event.target.closest('[data-section]');
      if (sectionBtn) {
        this.activeSection = sectionBtn.dataset.section;
        this.#renderTabs();
        this.#updateActive();
        return;
      }
      const routeLink = event.target.closest('[data-route]');
      if (routeLink) {
        event.preventDefault();
        this.router.navigate(routeLink.dataset.route);
      }
    });
  }

  #renderTabs() {
    this.el.querySelector('#nav-tabs').innerHTML = this.#tabs();
  }

  #updateActive() {
    const current = this.#currentPath();

    this.el.querySelectorAll('[data-section]').forEach(btn => {
      const isActive = btn.dataset.section === this.activeSection;
      btn.style.borderBottomColor = isActive ? 'oklch(var(--p))' : 'transparent';
      btn.style.color = isActive ? 'oklch(var(--bc))' : '';
    });

    this.el.querySelectorAll('[data-route]').forEach(anchor => {
      const isActive = anchor.dataset.route === current;
      anchor.style.borderBottomColor = isActive ? 'oklch(var(--p))' : 'transparent';
      anchor.style.color = isActive ? 'oklch(var(--bc))' : '';
    });
  }

  #currentPath() {
    return window.location.hash.slice(2).split('?')[0];
  }

  #sectionForPath(path) {
    return this.routes.find(r => r.path === path)?.section ?? this.#sections()[0];
  }

  #sections() {
    return [...new Set(this.routes.map(r => r.section).filter(Boolean))];
  }

  #tabs() {
    return this.routes
      .filter(r => r.section === this.activeSection)
      .map(r => `
        <li>
          <a data-route="${r.path}"
             style="border-bottom: 2px solid transparent; transition: border-color 0.15s, opacity 0.15s;"
             class="gap-2 text-sm rounded-none text-base-content/60 hover:text-base-content hover:bg-base-200 active:!bg-base-200">
            ${r.icon ? `<span>${r.icon}</span>` : ''}
            ${r.label}
          </a>
        </li>
      `).join('');
  }

  #render() {
    const sections = this.#sections();
    return `
      <div class="navbar bg-base-100 shadow-sm px-6 sticky top-0 z-30">
        <div class="navbar-start">
          <img src="/v3/assets/logo-admin.png" alt="Custom Family Gifts" class="h-10">
        </div>
        <div id="nav-center" class="navbar-center flex flex-col items-center gap-0">
          <div class="flex gap-5">
            ${sections.map(section => `
              <button data-section="${section}"
                style="border-bottom: 2px solid transparent; transition: border-color 0.15s, color 0.15s;"
                class="text-xs text-base-content/50 hover:text-base-content pb-0.5 bg-transparent border-0 cursor-pointer">
                ${section}
              </button>
            `).join('')}
          </div>
          <ul id="nav-tabs" class="menu menu-horizontal gap-1 p-0">
            ${this.#tabs()}
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

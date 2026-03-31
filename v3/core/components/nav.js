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

    window.addEventListener('hashchange', () => this.#updateActive(el));
    this.#updateActive(el);
  }

  #updateActive(el) {
    const current = window.location.hash.slice(2);
    el.querySelectorAll('[data-route]').forEach(a => {
      a.classList.toggle('active', a.dataset.route === current);
    });
  }

  #render() {
    return `
      <div class="navbar bg-base-100 shadow-sm px-6 sticky top-0 z-30">
        <div class="navbar-start">
          <span class="text-lg font-bold text-primary tracking-tight">CFG Admin</span>
        </div>
        <div class="navbar-center">
          <ul class="menu menu-horizontal gap-1 p-0">
            ${this.routes.map(r => `
              <li>
                <a data-route="${r.path}" class="gap-2 text-sm font-medium">
                  ${r.icon ? `<span>${r.icon}</span>` : ''}
                  ${r.label}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="navbar-end"></div>
      </div>
    `;
  }
}

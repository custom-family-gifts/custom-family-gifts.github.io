export class Router {
  #routes;
  #listeners = [];

  constructor(routes) {
    this.#routes = routes;
    window.addEventListener('hashchange', () => this.#resolve());
  }

  get current() {
    const hash = window.location.hash.slice(2); // strip #/
    return this.#routes.find(r => r.path === hash) ?? this.#routes[0];
  }

  on(fn) {
    this.#listeners.push(fn);
    return this;
  }

  navigate(path) {
    window.location.hash = `#/${path}`;
  }

  start() {
    if (!window.location.hash) {
      window.location.hash = `#/${this.#routes[0].path}`;
    }
    this.#resolve();
  }

  #resolve() {
    this.#listeners.forEach(fn => fn(this.current));
  }
}

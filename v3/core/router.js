export class Router {
  #routes;
  #listeners = [];

  constructor(routes) {
    this.#routes = routes;
    window.addEventListener('hashchange', () => this.#resolve());
  }

  get current() {
    return this.#routes.find(r => r.path === Router.#path()) ?? this.#routes[0];
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

  // Read hash query params — e.g. #/orders?drawer=123&tab=messages → { drawer: '123', tab: 'messages' }
  static getParams() {
    const hash = window.location.hash.slice(2);
    const qi = hash.indexOf('?');
    if (qi === -1) return {};
    return Object.fromEntries(new URLSearchParams(hash.slice(qi + 1)));
  }

  // Write hash query params silently via replaceState (does NOT fire hashchange)
  static setParams(params) {
    const qs = new URLSearchParams(params).toString();
    history.replaceState(null, '', `#/${Router.#path()}${qs ? '?' + qs : ''}`);
  }

  static #path() {
    return window.location.hash.slice(2).split('?')[0];
  }

  #resolve() {
    this.#listeners.forEach(fn => fn(this.current));
  }
}

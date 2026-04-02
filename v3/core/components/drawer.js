import { Router } from '../router.js';

export class Drawer {
  #tabs;
  #template;
  #fetchOne;
  #titleFn;
  #overviewFn;
  #panel;
  #backdrop;
  #body;
  #title;
  #tabBar;
  #overview;
  #activeTab    = null;
  #currentRecord = null;
  #drawerParam  = null;

  // tabsOrTemplate: array of tab configs (tabs mode) OR a render function (single-body mode)
  // titleFn:    optional (record) => string
  // overviewFn: optional (record) => html string — renders above the tab bar
  constructor(tabsOrTemplate, fetchOne = null, titleFn = null, overviewFn = null) {
    if (Array.isArray(tabsOrTemplate)) {
      this.#tabs     = tabsOrTemplate;
      this.#template = null;
    } else {
      this.#tabs     = null;
      this.#template = tabsOrTemplate;
    }
    this.#fetchOne   = fetchOne;
    this.#titleFn    = titleFn;
    this.#overviewFn = overviewFn;
  }

  mount(el) {
    el.innerHTML = `
      <!-- Backdrop -->
      <div id="drawer-backdrop"
        class="fixed inset-0 bg-black/30 z-40 hidden transition-opacity duration-300">
      </div>

      <!-- Panel -->
      <div id="drawer-panel"
        class="fixed top-0 right-0 h-full w-screen max-w-lg bg-base-100 shadow-2xl
               translate-x-full transition-transform duration-300 ease-in-out
               z-50 flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-base-200 shrink-0">
          <h2 id="drawer-title" class="text-base font-semibold truncate pr-4"></h2>
          <button id="drawer-close" class="btn btn-sm btn-ghost btn-circle text-lg">✕</button>
        </div>

        <!-- Overview strip (optional, populated when drawerOverview is configured) -->
        <div id="drawer-overview"></div>

        <!-- Tab bar (populated when in tabs mode) -->
        <div id="drawer-tabbar"></div>

        <!-- Body -->
        <div id="drawer-body" class="flex-1 overflow-y-auto p-3"></div>
      </div>
    `;

    this.#panel    = el.querySelector('#drawer-panel');
    this.#backdrop = el.querySelector('#drawer-backdrop');
    this.#body     = el.querySelector('#drawer-body');
    this.#title    = el.querySelector('#drawer-title');
    this.#overview = el.querySelector('#drawer-overview');
    this.#tabBar   = el.querySelector('#drawer-tabbar');

    el.querySelector('#drawer-close').addEventListener('click', () => this.close());
    this.#backdrop.addEventListener('click', () => this.close());


    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  // drawerParam: the value to put in ?drawer=… (e.g. the order ID string)
  // tabId: optionally restore a specific tab (e.g. from URL)
  async open(record, tabId = null, drawerParam = null) {
    this.#currentRecord = record;
    this.#drawerParam   = drawerParam;

    if (this.#tabs) {
      this.#activeTab = (tabId && this.#tabs.some(t => t.id === tabId))
        ? tabId
        : this.#tabs[0].id;
    }

    this.#updateTitle();
    this.#renderOverview();
    this.#renderTabBar();
    this.#renderBody();
    this.#syncParams();

    document.body.classList.add('overflow-hidden');
    this.#backdrop.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.#panel.classList.remove('translate-x-full');
    });

    if (this.#fetchOne) {
      try {
        const enriched = await this.#fetchOne(record);
        this.#currentRecord = enriched;
        this.#updateTitle();
        this.#renderOverview();
        this.#renderTabBar();
        this.#renderBody();
      } catch (e) {
        console.warn('[Drawer] fetchOne failed:', e);
      }
    }
  }

  close() {
    this.#panel.classList.add('translate-x-full');
    this.#backdrop.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    Router.setParams({});
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  #updateTitle() {
    this.#title.textContent = this.#titleFn
      ? this.#titleFn(this.#currentRecord)
      : (this.#currentRecord.name ?? this.#currentRecord.title ?? this.#currentRecord._id ?? 'Detail');
  }

  #renderOverview() {
    if (!this.#overviewFn) {
      this.#overview.innerHTML = '';
      return;
    }
    this.#overview.innerHTML = `
      <div class="px-5 py-3 bg-base-200/60 border-b border-base-200 shrink-0 max-h-[200px] overflow-y-auto">
        ${this.#overviewFn(this.#currentRecord)}
      </div>
    `;
  }

  #renderTabBar() {
    if (!this.#tabs) {
      this.#tabBar.innerHTML = '';
      return;
    }

    this.#tabBar.innerHTML = `
      <div class="flex border-b border-base-200 shrink-0 overflow-x-auto overflow-y-hidden">
        ${this.#tabs.map(tab => {
          const count  = tab.count ? tab.count(this.#currentRecord) : 0;
          const active = tab.id === this.#activeTab;
          return `
            <button data-tab="${tab.id}"
              class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap
                     -mb-px border-b-2 transition-colors
                     ${active
                       ? 'border-primary text-primary'
                       : 'border-transparent text-base-content/50 hover:text-base-content'}">
              ${tab.label}
              ${count > 0
                ? `<span class="badge badge-xs ${active ? 'badge-primary' : 'badge-ghost'}">${count}</span>`
                : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;

    this.#tabBar.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.#switchTab(btn.dataset.tab));
    });
  }

  #switchTab(tabId) {
    this.#activeTab = tabId;
    this.#renderTabBar();
    this.#renderBody();
    this.#syncParams();
  }

  #renderBody() {
    if (this.#tabs) {
      const tab = this.#tabs.find(t => t.id === this.#activeTab);
      this.#body.innerHTML = tab ? tab.render(this.#currentRecord) : '';
    } else {
      this.#body.innerHTML = this.#template
        ? this.#template(this.#currentRecord)
        : this.#defaultTemplate(this.#currentRecord);
    }
  }

  #syncParams() {
    const p = {};
    if (this.#drawerParam != null) p.drawer = this.#drawerParam;
    if (this.#tabs && this.#activeTab)  p.tab    = this.#activeTab;
    Router.setParams(p);
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

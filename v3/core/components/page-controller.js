import { Filters }    from './filters.js';
import { Table }      from './table.js';
import { Pagination } from './pagination.js';
import { Drawer }     from './drawer.js';
import { Modal }      from './modal.js';
import { CrudForm }   from '../crud-form.js';
import { Router }     from '../router.js';

function readFilterParams(filterConfigs) {
  const params = Router.getParams();
  const filters = {};
  filterConfigs.forEach(f => { if (params[f.name]) filters[f.name] = params[f.name]; });
  return filters;
}

export class PageController {
  #config;
  #el;
  #state;
  #components = {};

  constructor(config, el) {
    this.#config = config;
    this.#el = el;
    this.#state = {
      page:    1,
      per:     config.defaultPer  ?? 25,
      sort:    config.defaultSort  ?? null,
      order:   config.defaultOrder ?? 1,
      filters: readFilterParams(config.filters ?? []),
    };
    this.#render();
    this.#load();
  }

  #render() {
    this.#el.innerHTML = `
      <div class="space-y-4">
        <div id="pc-filters"></div>
        <div id="pc-table"></div>
        <div id="pc-pagination"></div>
      </div>
      <div id="pc-drawer"></div>
      <div id="pc-modal"></div>
    `;

    const q = (id) => this.#el.querySelector(id);

    this.#components.filters = new Filters(
      this.#config.filters ?? [],
      (filters) => {
        this.#state = { ...this.#state, filters, page: 1 };
        this.#load();
      }
    );
    this.#components.filters.mount(q('#pc-filters'));

    this.#components.table = new Table(
      this.#config.columns,
      ({ sort, order }) => {
        this.#state = { ...this.#state, sort, order };
        this.#load();
      },
      (record) => {
        const key   = this.#config.drawerKey ?? '_id';
        const param = String(record[key] ?? record._id);
        this.#components.drawer.open(record, null, param);
      }
    );
    this.#components.table.mount(q('#pc-table'));

    this.#components.pagination = new Pagination(
      (page) => {
        this.#state.page = page;
        this.#load();
      },
      (per) => {
        this.#state = { ...this.#state, per, page: 1 };
        this.#load();
      }
    );
    this.#components.pagination.mount(q('#pc-pagination'));

    this.#components.drawer = new Drawer(
      this.#config.drawerTabs    ?? this.#config.drawer ?? null,
      this.#config.fetchOne      ?? null,
      this.#config.drawerTitle   ?? null,
      this.#config.drawerOverview ?? null,
    );
    this.#components.drawer.mount(q('#pc-drawer'));

    this.#components.modal = new Modal();
    this.#components.modal.mount(q('#pc-modal'));
    window._Modal    = this.#components.modal;
    window._Drawer   = this.#components.drawer;
    window._CrudForm = CrudForm;
  }

  async #load() {
    this.#components.table.setLoading(true);
    try {
      const result = await this.#config.fetch(this.#state);
      this.#components.table.setData(result.records, this.#state.sort, this.#state.order);
      this.#components.pagination.update({
        page:  result.page,
        per:   result.per,
        total: result.totalcount,
      });

      // Restore drawer from URL params — fall back to stub if record isn't on this page
      const params = Router.getParams();
      if (params.drawer) {
        const key    = this.#config.drawerKey ?? '_id';
        const record = result.records.find(r => String(r[key] ?? r._id) === params.drawer)
          ?? { [key]: isNaN(params.drawer) ? params.drawer : +params.drawer };
        this.#components.drawer.open(record, params.tab ?? null, params.drawer);
      }
    } catch (err) {
      this.#el.querySelector('#pc-table').innerHTML = `
        <div class="alert alert-error">
          <span>Failed to load data: ${err.message}</span>
        </div>
      `;
    }
  }

  destroy() {
    this.#el.innerHTML = '';
  }
}

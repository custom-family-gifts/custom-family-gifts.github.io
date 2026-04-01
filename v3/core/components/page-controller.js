import { Filters }    from './filters.js';
import { Table }      from './table.js';
import { Pagination } from './pagination.js';
import { Drawer }     from './drawer.js';

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
      filters: {},
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
      (record) => this.#components.drawer.open(record)
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
      this.#config.drawer ?? null,
      this.#config.fetchOne ?? null,
    );
    this.#components.drawer.mount(q('#pc-drawer'));
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

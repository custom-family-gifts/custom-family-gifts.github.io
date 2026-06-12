# CFG Admin — CLAUDE.md

## What This Is

CFG Admin is the internal order management dashboard for Custom Family Gifts. It is a **vanilla JS SPA** — no framework, no build step, no package.json. Everything ships as static files loaded directly in the browser via ES modules, with Tailwind + DaisyUI pulled from CDN.

Staff use this to view, filter, and edit customer orders, monitor scheduled automation tasks, and review API error logs.

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI framework | None — vanilla JS ES modules |
| Styling | Tailwind CSS (CDN) + DaisyUI v4 (CDN) |
| Routing | Hash-based (`#/orders`, `#/scheduled`, etc.) |
| Backend | Firebase Cloud Functions (GCF) |
| Database | MongoDB (via GCF proxy) |
| Image storage | AWS S3 |
| Auth | Admin key in `localStorage`, passed as `cypherKey` query param |
| Hosting | GitHub Pages (static, no build) |

---

## Architecture

### Entry point
`index.html` loads Tailwind + DaisyUI from CDN, then imports `core/app.js` as an ES module. Everything else is imported from there.

### Routing
Hash-based. `core/router.js` owns URL state including pagination, filters, and drawer-open state as query params. Navigation is `Router.go('#/route?param=val')`.

### API / Data
- All data fetches go through `core/api.js` → GCF endpoint `https://us-central1-custom-family-gifts.cloudfunctions.net/v2-call`
- Results are cached in an in-memory store keyed by MongoDB collection name
- `API.find({ col, q, s, p, page, per })` — standard query
- `API.storeUpdate(col, record)` — patches the cache after a mutation

**Standard GCF/mdb response shape** — all ops (`find`, `insertVerify`, `updateVerify`, `upsertVerify`) return:
```js
{ records: [...], page, per, totalcount }
```
Records are always under `records`, never at the top level. Other keys (`page`, `per`, `totalcount`) are pagination metadata. Access the affected document as `result.records[0]`, not `result.record` or `result` directly.

**Post-save convention** — GCF mutation endpoints return only the keys they touched (partial record). After a successful save, every save path (drawer form, modal, bespoke handler) must merge the partial response with the existing record, then propagate to both cache and table:
```js
const partial = result.records[0];
const merged  = { ...existingRecord, ...partial };
API.storeUpdate(collection, merged);        // keeps in-memory cache consistent
window._Table?.upsertRow(merged);           // patches the matching table row in-place
window._Drawer?.open(merged, tabId, null);  // or .refresh(merged) to stay on current tab
```
Skipping `storeUpdate` or `upsertRow` leaves the table and cache stale without any visible error. Failing to merge (replacing the full record with the partial response) silently drops fields the endpoint did not touch.

### Components
All components in `core/components/` build and return HTML strings — no virtual DOM. Event wiring is via `onclick` attributes and event delegation.

| Component | Role |
|---|---|
| `PageController` | Orchestrates filters, table, pagination, drawer for a page |
| `Table` | Sortable columns, clickable rows, `hideOnMobile` per column |
| `Drawer` | Side panel with optional tabs and overview section |
| `Modal` | Dialog for forms, image viewers, editors |
| `Filters` | Search/filter bar bound to Router params |
| `Pagination` | Page size + page number |
| `Toast` | Success/error notifications |

### Forms / CRUD
- `core/form.js` — renders fields from a schema; types: `text`, `textarea`, `select`, `toggle`, `checkbox`, `datetime`
- `core/crud-form.js` — submits create/update to API; validators: `required`, `numeric`, `posint`, `money`, `email`, `proof`
- Form schemas live in the page files (e.g., `pages/orders.js`)
- **Always use `CrudForm` for mutations.** Do not hand-roll form serialization per-page. If a required field type is missing, add it to `form.js` and `crud-form.js` so every page benefits. Bespoke submit handlers are a last resort and must be flagged as technical debt.

### Auth
`core/auth.js` — on load, if no key in `localStorage`, a modal prompts for it. The key is then appended to every API call as `?cypherKey=...`.

---

## Pages

| Route | File | Purpose |
|---|---|---|
| `#/orders` | `pages/orders.js` | Main order management (search, filter, edit, art viewer, notes) |
| `#/scheduled` | `pages/scheduled.js` | Scheduled automation tasks |
| `#/api-error-log` | `pages/api-error-log.js` | API error monitoring |

Page files export a config object consumed by `PageController`. See `routes.js` for how they're registered.

---

## Building a Page

Use `pages/orders.js` as the reference implementation. A page has four parts:

### 1. `getData(state)` — fetch
Returns records from the API filtered by the current state (search, filters, sort, pagination). Raw MongoDB documents flow through unchanged — do not transform or rename fields here.

```js
async function getData(state) {
  const q = {};
  if (state.filters.search) q.name = { $regex: state.filters.search, $options: 'i' };
  const s = state.sort ? { [state.sort]: state.order } : { name: 1 };
  return API.find({ col: 'cfg.mycol', q, s, per: state.per, page: state.page });
}
```

### 2. `SCHEMA` — data shape
Declares every field the page reads or writes. Types: `string`, `number`, `boolean`, `string[]`, `obj[]`. Used by `makeDrawerTab` to serialize the form correctly.

```js
const SCHEMA = {
  collection: 'cfg.mycol',
  fields: [
    { key: 'name',    type: 'string'  },
    { key: 'cost',    type: 'number'  },
    { key: 'active',  type: 'boolean' },
    { key: 'tags',    type: 'string[]' },
    { key: 'effects', type: 'obj[]', fields: [
      { key: 'effect_id', type: 'string' },
      { key: 'value',     type: 'number' },
    ]},
  ],
};
```

Optionally add `resources` to pre-fetch reference collections on page load:
```js
resources: {
  statuses: { col: 'cfg.status' },
}
```
Fields can annotate `resource: 'statuses'` to signal that the framework should use that data for autocomplete/select when ready.

### 3. `drawerLayout` — form presentation
Declares how the drawer edit form is laid out. Each entry is a card section. Fields are either a bare key string (all defaults) or an object with display hints. The framework resolves field type from `SCHEMA` and rendering from the layout hints.

```js
const drawerLayout = [
  {
    label: 'Basic',
    fields: [
      { key: 'name', label: 'Name', span: 2 },
      { key: 'cost', label: 'Cost' },
      { key: 'active', label: 'Active', span: 2 },
    ],
  },
  {
    label: 'Tags',
    note: 'No selection = no restriction',
    fields: [
      { key: 'tags', label: 'Tags', options: ['fire', 'ice'] },
    ],
  },
  { label: 'Effects', fields: ['effects'] },
];
```

**Layout field options:**
| Property | Purpose |
|---|---|
| `label` | Display label |
| `span: 2` | Full width in 2-col grid |
| `options: []` | Drives select or checkbox-group |
| `display: 'button-radio'` | Render as pill button group instead of select |
| `colors: {}` | Per-option CSS classes for `button-radio` |
| `multiline: true` | Render string as textarea |
| `rows` | Textarea row count |
| `placeholder` | Input placeholder |
| `mono: true` | Monospace font on text input |
| `hint` | Sub-label shown next to boolean checkbox |
| `render: (val, r) => html` | Fully custom field output |
| `note` | Section-level annotation shown in the header |
| `section.render: (r) => html` | Fully custom section output |

`makeDrawerTab(SCHEMA, drawerLayout)` from `core/drawer-form.js` wires these together and handles all serialization. It fixes the empty-array problem (`string[]` always serializes via `FormData.getAll`, `boolean` via `FormData.has`).

**`_id` flows through the form as data.** When a record has `_id`, the form emits `<input type="hidden" name="_id" />` — same pipeline as every other field. `serializeForm` picks it up from `FormData`. At submit time, `_id` is extracted from `doc` to use as the MongoDB query selector (`q: { _id }`), then deleted from `doc` before the `$set` payload. Absence of `_id` in the form means insert; presence means update. Do not capture `_id` in a closure or treat it as architectural state separate from the record.

### 4. `export const page` — the config object
```js
export const page = {
  defaultSort: 'name',
  defaultPer:  100,

  drawerTitle: r => r.name || 'New Item',

  drawerTabs: [
    { id: 'edit', label: 'Edit', render: makeDrawerTab(SCHEMA, drawerLayout) },
  ],

  pageActions: [
    { label: '+ New', handler: () => window._Drawer?.open({ _id: null }, 'edit', null) },
  ],

  filters: [
    { name: 'search', type: 'text',   label: 'Name', placeholder: 'Search…' },
    { name: 'type',   type: 'select', label: 'Type', options: ['a', 'b'] },
  ],

  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'cost', label: 'Cost', sortable: true },
  ],

  fetch: getData,
  init:  loadResources,  // optional — omit if no resources needed
};
```

Register the page in `routes.js`:
```js
import { page as myPage } from './pages/my-page.js';
{ path: 'my-page', label: 'My Page', icon: '…', page: myPage }
```

---

## Key Conventions

- **Window globals for shared state** — `window._currentOrderRecord`, `window._picRows`, etc. Used across inline handlers and components.
- **HTML string rendering** — components return HTML strings; no templating library.
- **No build step** — never introduce a bundler, transpiler, or npm. Keep it static.
- **CDN-only dependencies** — add new libraries via CDN `<script>` tags in `index.html` only if absolutely necessary.
- **DaisyUI theming** — primary color is coral/salmon (`#f8886d`). In DaisyUI 4, set as `--p: 72% 0.12 28` (raw oklch channels, no `oklch()` wrapper).
- **No underscore prefix on module functions** — ES module exports are the privacy boundary; a leading `_` on a non-exported function is redundant and should not be used. The `_` prefix is used on `window.*` globals that are shared cross-component state or handlers (`window._Drawer`, `window._Table`, etc.), where it namespaces them away from native browser properties. Internal window-assigned functions that are local in intent (e.g. `window.drawerFormSubmit`) do not need `_` when the name is spelled out and unambiguous.
- **No single-letter or abbreviated variable names** — use full descriptive names (`record` not `r`, `value` not `v`, `element` not `el`). Exceptions: loop counters (`i`, `j`) and conventional algebra/math variables.

---

## MongoDB Collections

| Collection | Used for |
|---|---|
| `cfg.orders` | Customer orders |
| `cfg.scheduled_tasks` | Automation tasks |
| `cfg_log.api_error_log` | API error records |

---

## External Services

- **GCF base URL**: `https://us-central1-custom-family-gifts.cloudfunctions.net/v2-call`
- **S3 bucket**: `https://custom-family-gifts.s3.us-east-2.amazonaws.com/`

---

## Deployment

GitHub Pages — push static files, no CI needed. The `v3/` directory is served directly.

---

## What Not to Do

- Do not add a framework (React, Vue, Svelte, etc.)
- Do not add a build step or package manager
- Do not introduce CSS-in-JS or component scoping
- Do not refactor the window-global pattern — it is intentional for inline event handlers

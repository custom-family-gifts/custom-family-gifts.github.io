// AutoRefresh — keeps a page's data fresh by reloading when it goes stale and
// the user has stepped away. Shows a small "data age display" in the bottom-right.
//
// Opt in per page via the page config:
//   autoRefresh: true                          // use defaults below
//   autoRefresh: { idleMs, staleMs }           // override thresholds
//
// Mechanism is intentionally simple: a full `location.reload()`. That refreshes
// everything on the page (table, open drawers, etc.) through one path rather
// than juggling several in-place refresh mechanisms.

const DEFAULT_IDLE_MS  = 2  * 60 * 1000; // user must be idle this long before a refresh
const DEFAULT_STALE_MS = 10 * 60 * 1000; // data must be at least this old to refresh
const TICK_MS          = 1000;           // how often the display + checks run

// Interactions that count as the user actively working. mousemove is excluded
// on purpose — passive cursor drift is not intent.
const INTERACTION_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

// Containers whose inputs are NOT "input forms" for refresh purposes: the
// filters bar and the pagination per-page select are navigation, not editing.
// Anything else (drawer edit tabs, modals) counts as an open form and blocks a
// refresh. Add selectors here as new non-form input regions appear.
const NON_FORM_REGIONS = ['#pc-filters', '#pc-pagination'];

function isFormField(element) {
  return element.matches('input, textarea, select');
}

function isHidden(element) {
  // type="hidden" inputs (e.g. the drawer's _id) are never user-facing forms.
  return element.type === 'hidden';
}

function isVisible(element) {
  // Native checkVisibility is the jQuery `:visible` equivalent — it accounts for
  // display:none, visibility:hidden, content-visibility, and opacity:0 (including
  // values inherited from ancestors). This matters because DaisyUI hides a closed
  // .modal via `visibility:hidden`, not `display:none`, so its fields still have
  // layout (offsetParent is non-null) and would otherwise read as visible.
  if (typeof element.checkVisibility === 'function') {
    return element.checkVisibility({
      checkOpacity:       true,
      checkVisibilityCSS: true,
    });
  }
  // Fallback for older engines: offsetParent misses visibility:hidden, so also
  // consult computed style (visibility inherits, so an ancestor's value resolves
  // here too).
  if (element.offsetParent === null) return false;
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.opacity !== '0';
}

function isInNonFormRegion(element) {
  return NON_FORM_REGIONS.some(selector => element.closest(selector) !== null);
}

// Returns the first open input-form field (drawer or modal), or null if none.
function findOpenFormField() {
  const fields = document.querySelectorAll('input, textarea, select');
  for (const field of fields) {
    if (!isFormField(field))     continue;
    if (isHidden(field))         continue;
    if (!isVisible(field))       continue;
    if (isInNonFormRegion(field)) continue;
    return field;
  }
  return null;
}

function formatAge(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export class AutoRefresh {
  #idleMs;
  #staleMs;
  #lastDataLoad   = Date.now();
  #lastInteraction = Date.now();
  #tickId         = null;
  #displayEl      = null;
  #onInteraction;
  #lastLoggedField = undefined; // DEBUG: dedupe console logging of detected field

  constructor(options = {}) {
    const config = options === true ? {} : options;
    this.#idleMs  = config.idleMs  ?? DEFAULT_IDLE_MS;
    this.#staleMs = config.staleMs ?? DEFAULT_STALE_MS;

    this.#onInteraction = () => { this.#lastInteraction = Date.now(); };
  }

  start() {
    this.#buildDisplay();
    INTERACTION_EVENTS.forEach(event =>
      window.addEventListener(event, this.#onInteraction, { passive: true, capture: true })
    );
    this.#tickId = setInterval(() => this.#tick(), TICK_MS);
    this.#tick();
  }

  // Call after every successful data load so the age reflects in-page fetches
  // (filters, pagination) as well as full reloads.
  markLoaded() {
    this.#lastDataLoad = Date.now();
  }

  destroy() {
    if (this.#tickId !== null) clearInterval(this.#tickId);
    INTERACTION_EVENTS.forEach(event =>
      window.removeEventListener(event, this.#onInteraction, { capture: true })
    );
    this.#displayEl?.remove();
    this.#displayEl = null;
  }

  #tick() {
    const now      = Date.now();
    const dataAge  = now - this.#lastDataLoad;
    const idleFor  = now - this.#lastInteraction;
    const isStale  = dataAge >= this.#staleMs;

    const openField = findOpenFormField();
    const formOpen  = openField !== null;

    // DEBUG: log what's blocking, only when it changes
    if (openField !== this.#lastLoggedField) {
      this.#lastLoggedField = openField;
      if (openField) {
        console.log('[AutoRefresh] form-open detected, blocking refresh:', openField);
      } else {
        console.log('[AutoRefresh] no open form — refresh allowed when stale + idle');
      }
    }

    this.#renderDisplay(dataAge, isStale && formOpen);

    if (isStale && !formOpen && idleFor >= this.#idleMs) {
      console.log('[AutoRefresh] reloading — stale + idle + no form');
      location.reload();
    }
  }

  #buildDisplay() {
    const el = document.createElement('div');
    el.id = 'auto-refresh-age';
    el.className =
      'fixed bottom-0 right-0 z-50 text-xs px-2 py-1 rounded ' +
      'text-success pointer-events-none select-none';
    el.style.backgroundColor = '#ddd';
    document.body.appendChild(el);
    this.#displayEl = el;
  }

  #renderDisplay(dataAge, formOpen) {
    if (!this.#displayEl) return;
    this.#displayEl.textContent = `Data is ${formatAge(dataAge)} old`;
    this.#displayEl.classList.toggle('text-error', formOpen);
    this.#displayEl.classList.toggle('text-success', !formOpen);
  }
}

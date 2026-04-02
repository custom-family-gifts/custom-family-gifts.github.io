export class Modal {
  #dialog;
  #boxEl;
  #headerEl;
  #titleEl;
  #bodyEl;
  #actionsEl;

  // onSuccess placeholder — no-op for now, wire up later when action types are defined
  onSuccess = null;

  mount(el) {
    el.innerHTML = `
      <dialog class="modal">
        <div class="modal-box w-auto max-w-2xl min-w-72 flex flex-col max-h-[85vh] p-0">

          <div id="modal-header"
               class="shrink-0 flex items-center justify-between gap-2 px-4 py-1 border-b border-base-300">
            <div class="w-8"></div>
            <h3 id="modal-title" class="font-semibold text-base leading-snug text-center flex-1"></h3>
            <form method="dialog" class="shrink-0 w-8 flex justify-end">
              <button class="btn btn-sm btn-circle btn-ghost">✕</button>
            </form>
          </div>

          <div id="modal-body" class="flex-1 overflow-y-auto"></div>

          <div id="modal-actions"
               class="shrink-0 hidden px-4 py-2 border-t border-base-300 flex justify-end gap-2">
          </div>

        </div>
        <div class="modal-backdrop"></div>
      </dialog>
    `;

    this.#dialog    = el.querySelector('dialog');
    this.#boxEl     = el.querySelector('.modal-box');
    this.#headerEl  = el.querySelector('#modal-header');
    this.#titleEl   = el.querySelector('#modal-title');
    this.#bodyEl    = el.querySelector('#modal-body');
    this.#actionsEl = el.querySelector('#modal-actions');
  }

  // contentHtml  : pre-rendered HTML string
  // title        : optional header string
  // opts.boxClass : extra classes on the modal-box (e.g. 'max-w-4xl')
  // opts.bodyClass: classes on the scrollable body (default 'p-4')
  // opts.noHeader : hide the title/close header
  // opts.actions  : HTML string of buttons for the fixed action bar
  open(contentHtml, title = '', { boxClass = '', bodyClass = 'p-4', noHeader = false, actions = '' } = {}) {
    this.#boxEl.className     = `modal-box w-auto max-w-2xl min-w-72 flex flex-col max-h-[85vh] p-0 ${boxClass}`.trimEnd();
    this.#headerEl.hidden     = noHeader;
    this.#titleEl.textContent = title;
    this.#titleEl.hidden      = !title;
    this.#bodyEl.className    = `flex-1 overflow-y-auto ${bodyClass}`.trimEnd();
    this.#bodyEl.innerHTML    = contentHtml;

    if (actions) {
      this.#actionsEl.innerHTML = actions;
      this.#actionsEl.classList.remove('hidden');
    } else {
      this.#actionsEl.innerHTML = '';
      this.#actionsEl.classList.add('hidden');
    }

    this.#dialog.showModal();
  }

  close() {
    this.#dialog.close();
  }
}

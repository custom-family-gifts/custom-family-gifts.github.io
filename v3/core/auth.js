// Simple admin key auth.
// API.gcf (v2/base/api.js) reads window.Admin.key for the cypherKey — this module sets it.

function showKeyDialog({ title, description, currentKey = '', allowCancel = false }) {
  return new Promise((resolve) => {
    const el = document.createElement('dialog');
    el.className = 'modal modal-open';
    el.innerHTML = `
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg">${title}</h3>
        <p class="text-sm text-base-content/60 mt-1 mb-4">${description}</p>
        <input
          id="auth-key-input"
          type="text"
          class="input input-bordered w-full font-mono"
          placeholder="e.g. 888555"
          value="${currentKey}"
        />
        <div class="modal-action">
          ${allowCancel ? `<button id="auth-cancel" class="btn btn-ghost">Cancel</button>` : ''}
          <button id="auth-submit" class="btn btn-primary">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(el);

    const input = el.querySelector('#auth-key-input');
    const submit = el.querySelector('#auth-submit');
    const cancel = el.querySelector('#auth-cancel');

    // Auto-focus & select existing value
    setTimeout(() => { input.focus(); input.select(); }, 50);

    const confirm = () => {
      document.body.removeChild(el);
      resolve(input.value.trim());
    };

    submit.addEventListener('click', confirm);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm(); });

    if (cancel) {
      cancel.addEventListener('click', () => {
        document.body.removeChild(el);
        resolve(null); // cancelled — no action
      });
    }
  });
}

export const Auth = {
  async init() {
    let key = localStorage.getItem('admin_key');
    if (!key) {
      key = await showKeyDialog({
        title:       'Access Key Required',
        description: 'Enter your staff access key to continue.',
        allowCancel: false,
      });
      if (key) localStorage.setItem('admin_key', key);
    }
    window.Admin = { key };
  },

  async updateKey() {
    const current = localStorage.getItem('admin_key') ?? '';
    const key = await showKeyDialog({
      title:       'Update Access Key',
      description: 'Enter a new key, or clear the field to sign out.',
      currentKey:  current,
      allowCancel: true,
    });
    if (key === null) return; // cancelled
    if (key === '') {
      localStorage.removeItem('admin_key');
    } else {
      localStorage.setItem('admin_key', key);
    }
    location.reload();
  },

  getKey() {
    return window.Admin?.key ?? localStorage.getItem('admin_key');
  },
};

import { API } from '../core/api.js';

const COL = 'cfg.designs';

const _imageUrlField = (slot) => `etsy_image_${slot}_s3_url`;
const _imageKeyField = (slot) => `etsy_image_${slot}_s3_key`;

// Slot 1 is a legacy field, not part of this image system — excluded from
// display, counts, and reordering, but still copied by Clone since it's
// still real data on the record.
const ALL_IMAGE_SLOTS  = Array.from({ length: 20 }, (_, index) => index + 1);
const HIDDEN_IMAGE_SLOTS = new Set([1]);
const IMAGE_SLOTS = ALL_IMAGE_SLOTS.filter(slot => !HIDDEN_IMAGE_SLOTS.has(slot));
const IMAGE_KEYS  = IMAGE_SLOTS.map(_imageUrlField);

const PROJECTION = {
  name:            1,
  etsy_video_url:  1,
  ...Object.fromEntries(ALL_IMAGE_SLOTS.map(slot => [_imageUrlField(slot), 1])),
  ...Object.fromEntries(ALL_IMAGE_SLOTS.map(slot => [_imageKeyField(slot), 1])),
};

const CREATE_FIELDS = [
  { key: 'name', label: 'Name', type: 'text', validate: 'required' },
];

const _schema = (title, fields) => ({ title, collection: COL, idField: '_id', fields });

const DESIGN_SCHEMAS = {
  name: _schema('Rename Design', [
    { key: 'name', label: 'Name', type: 'text', validate: 'required' },
  ]),
  // Video uploads go through a separate endpoint (not built yet) — manual URL entry for now.
  video: _schema('Edit Video URL', [
    { key: 'etsy_video_url', label: 'Etsy Video URL', type: 'text' },
  ]),
};

const GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.869a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>`;

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
async function fetch(state) {
  const { search } = state.filters;
  const q = search ? { name: { $regex: search.trim(), $options: 'i' } } : {};
  const s = { name: 1 };
  return API.find({ col: COL, q, s, p: PROJECTION, per: state.per, page: state.page });
}

// ---------------------------------------------------------------------------
// Overview — name + delete, shown above the tab bar
// ---------------------------------------------------------------------------
const drawerOverview = (record) => {
  window._currentDesignRecord = record;
  return `
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1 min-w-0">
        <div class="font-medium text-sm truncate">${record.name || '—'}</div>
        <button onclick="window._designEdit('name')" class="btn btn-xs btn-ghost btn-circle" title="Rename">${GEAR_SVG}</button>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button class="btn btn-xs btn-outline" onclick="window._designClone()">Clone</button>
        <button class="btn btn-xs btn-error btn-outline" onclick="window._designDelete('${record._id}')">Delete</button>
      </div>
    </div>
  `;
};

// ---------------------------------------------------------------------------
// Image upload slots — pending (uploaded-but-unsaved) temp ids, keyed by slot
// number. Reset whenever a different design's record is rendered; explicitly
// cleared after a successful save.
// ---------------------------------------------------------------------------
let pendingImageUploads = {};
let pendingImageUploadsFor = null;

function _resetPendingUploadsIfNewRecord(record) {
  if (pendingImageUploadsFor !== record._id) {
    pendingImageUploads = {};
    pendingImageUploadsFor = record._id;
  }
}

function _imageSlotHtml(record, slot) {
  const url     = record[_imageUrlField(slot)] || '';
  const pending = !!pendingImageUploads[slot];
  return `
    <div id="design-slot-${slot}"
      class="group relative aspect-square rounded overflow-hidden bg-base-300 border-2 ${pending ? 'border-dashed border-gray-400' : 'border-transparent'} cursor-pointer"
      draggable="${url ? 'true' : 'false'}"
      onclick="document.getElementById('design-slot-input-${slot}').click()"
      ondragstart="window._designSlotDragStart(event, ${slot})"
      ondragend="window._designSlotDragEnd(${slot})"
      ondragover="window._designSlotDragOver(event, ${slot})"
      ondragleave="window._designSlotDragLeave(${slot})"
      ondrop="window._designSlotDrop(event, ${slot})"
      title="Slot ${slot} — click to upload, or drag to reorder / drop an image">
      <img id="design-slot-img-${slot}" src="${url}" alt=""
        class="w-full h-full object-cover ${url ? '' : 'hidden'}" />
      <div id="design-slot-placeholder-${slot}" class="${url ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center text-2xl text-base-content/20 pointer-events-none">+</div>
      <div class="absolute top-0.5 left-1 text-[10px] font-mono text-white bg-black/50 rounded px-1 pointer-events-none">${slot}</div>
      <button type="button" id="design-slot-remove-${slot}"
        class="${(url || pending) ? '' : 'hidden'} absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-black/60 text-white text-[10px] leading-none opacity-25 group-hover:opacity-100 hover:bg-error transition-opacity"
        onclick="event.stopPropagation(); window._designSlotRemove(${slot})" title="Remove image">✕</button>
      <div id="design-slot-spinner-${slot}" class="hidden absolute inset-0 flex items-center justify-center bg-black/40">
        <span class="loading loading-spinner loading-sm text-white"></span>
      </div>
      <input id="design-slot-input-${slot}" type="file" accept="image/*" class="hidden"
        onchange="window._designSlotFileChange(this, ${slot})" />
    </div>`;
}

// ---------------------------------------------------------------------------
// Tab: Etsy Media — video URL + image upload grid
// ---------------------------------------------------------------------------
const etsyMediaTab = (record) => {
  window._currentDesignRecord = record;
  _resetPendingUploadsIfNewRecord(record);

  const videoHtml = record.etsy_video_url
    ? `<a href="${record.etsy_video_url}" target="_blank" rel="noopener" class="link link-primary text-sm break-all">${record.etsy_video_url}</a>`
    : `<div class="text-xs opacity-40">No video</div>`;

  const filledCount = IMAGE_KEYS.filter(key => record[key]).length;
  const hasPending  = Object.keys(pendingImageUploads).length > 0;

  return `
    <div class="space-y-3">

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <div class="flex items-center justify-between gap-1">
            <h3 class="text-xs uppercase tracking-wide opacity-60">Video</h3>
            <button onclick="window._designEdit('video')" class="btn btn-xs btn-ghost btn-circle -mr-1" title="Edit">${GEAR_SVG}</button>
          </div>
          ${videoHtml}
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="flex flex-col px-3 py-2 gap-2">
          <div class="flex items-center justify-between gap-1">
            <h3 class="text-xs uppercase tracking-wide opacity-60">
              Images
              <span class="normal-case opacity-40 ml-1">${filledCount}/${IMAGE_SLOTS.length}</span>
            </h3>
            <button id="design-images-save-btn" class="btn btn-xs btn-primary" ${hasPending ? '' : 'disabled'}
              onclick="window._designImagesSave()">Save</button>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            ${IMAGE_SLOTS.map(slot => _imageSlotHtml(record, slot)).join('')}
          </div>
          <p class="text-xs text-base-content/40">Click a slot to upload or replace an image, then Save.</p>
        </div>
      </div>

    </div>
  `;
};

// ---------------------------------------------------------------------------
// Tab: Etsy Listings — listings whose product_line matches this design's name.
// Cross-collection, so it's loaded async on render and patched into place.
// ---------------------------------------------------------------------------
const ETSY_LISTING_IMAGE_SLOTS = Array.from({ length: 20 }, (_, index) => index + 1);
const _etsyListingImageUrlField = (slot) => `etsy_image_url_${slot}`;

function _etsyListingImagesHtml(listing) {
  const filledCount = ETSY_LISTING_IMAGE_SLOTS.filter(slot => listing[_etsyListingImageUrlField(slot)]).length;
  if (!filledCount) return `<div class="text-xs opacity-40">No images</div>`;
  return `
    <div class="flex flex-col gap-1">
      <span class="text-xs opacity-50">${filledCount}/${ETSY_LISTING_IMAGE_SLOTS.length}</span>
      <div class="grid gap-1" style="grid-template-columns: repeat(10, 2rem)">
        ${ETSY_LISTING_IMAGE_SLOTS.map(slot => {
          const url = listing[_etsyListingImageUrlField(slot)];
          return url
            ? `<a href="${url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
                 <img src="${url}" alt="" class="w-8 h-8 object-cover rounded hover:opacity-80 transition-opacity" />
               </a>`
            : `<div class="w-8 h-8 rounded border border-dashed border-base-content/20 bg-base-300"></div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function _etsyListingCardHtml(listing) {
  return `
    <div class="card bg-base-200">
      <div class="card-body py-2.5 px-3 gap-2">
        <label class="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" class="design-etsy-listing-checkbox checkbox checkbox-sm mt-0.5"
            value="${listing._id}" onchange="window._designEtsyListingsSyncSelectAll()" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium truncate">${listing.title || '—'}</span>
              <div class="flex items-center gap-1 shrink-0">
                ${listing.etsy_image_update_requested ? `<span title="etsy image update requested">⏳</span>` : ''}
                <span class="text-xs font-mono opacity-50">#${listing.listing_id ?? '—'}</span>
              </div>
            </div>
          </div>
        </label>
        ${_etsyListingImagesHtml(listing)}
      </div>
    </div>
  `;
}

function _etsyListingsListHtml(records) {
  if (!records.length) return `<p class="text-sm text-base-content/40 text-center py-8">No Etsy listings for this design</p>`;
  return `
    <div class="flex items-center justify-between gap-2">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" id="design-etsy-listings-select-all" class="checkbox checkbox-sm"
          onchange="window._designEtsyListingsToggleAll(this.checked)" />
        <span class="text-xs">Select all</span>
        <span id="design-etsy-listings-selected-count" class="text-xs opacity-50"></span>
      </label>
      <button id="design-etsy-listings-queue-btn" class="btn btn-xs btn-primary" disabled
        onclick="window._designEtsyListingsQueue()">Queue Image Update</button>
    </div>
    <div class="space-y-2 mt-2">
      ${records.map(_etsyListingCardHtml).join('')}
    </div>
  `;
}

window._designLoadEtsyListings = async (record) => {
  const bodyEl = document.getElementById('design-etsy-listings-body');
  try {
    const result = await API.find({ col: 'cfg.etsy_listing', q: { product_line: record.name }, per: 250 });
    // The drawer may have moved on to a different design (or a different tab
    // may have replaced this DOM) by the time the query resolves.
    if (window._currentDesignRecord?._id !== record._id) return;
    const currentBodyEl = document.getElementById('design-etsy-listings-body');
    if (!currentBodyEl) return;

    currentBodyEl.innerHTML = _etsyListingsListHtml(result.records);
  } catch (err) {
    if (bodyEl) bodyEl.innerHTML = `<p class="text-sm text-error text-center py-8">Failed to load listings.</p>`;
  }
};

const etsyListingsTab = (record) => {
  window._currentDesignRecord = record;
  window._designLoadEtsyListings(record);
  return `
    <div id="design-etsy-listings-body" class="space-y-2">
      <div class="flex justify-center py-8">
        <span class="loading loading-spinner loading-sm text-primary"></span>
      </div>
    </div>
  `;
};

window._designEtsyListingsToggleAll = (checked) => {
  document.querySelectorAll('.design-etsy-listing-checkbox').forEach(checkboxEl => { checkboxEl.checked = checked; });
  window._designEtsyListingsSyncSelectAll();
};

window._designEtsyListingsSyncSelectAll = () => {
  const checkboxes  = [...document.querySelectorAll('.design-etsy-listing-checkbox')];
  const selectAllEl = document.getElementById('design-etsy-listings-select-all');
  const queueBtn    = document.getElementById('design-etsy-listings-queue-btn');
  const countEl     = document.getElementById('design-etsy-listings-selected-count');
  const checkedCount = checkboxes.filter(checkboxEl => checkboxEl.checked).length;

  if (selectAllEl) {
    selectAllEl.checked       = checkedCount > 0 && checkedCount === checkboxes.length;
    selectAllEl.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
  }
  if (queueBtn) queueBtn.disabled = checkedCount === 0;
  if (countEl)  countEl.textContent = checkedCount > 0 ? `(${checkedCount} selected)` : '';
};

window._designEtsyListingsQueue = async () => {
  const record = window._currentDesignRecord;
  const btn    = document.getElementById('design-etsy-listings-queue-btn');
  const ids    = [...document.querySelectorAll('.design-etsy-listing-checkbox:checked')].map(checkboxEl => checkboxEl.value);
  if (!ids.length) return;

  btn.disabled  = true;
  btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

  try {
    await API.gcf('v2-mdb', {
      toast: `Queued ${ids.length} listing${ids.length > 1 ? 's' : ''} for image update`,
      body: JSON.stringify({
        op:          'updateVerify',
        col:         'cfg.etsy_listing',
        q:           { _id: { $in: ids } },
        doc:         { etsy_image_update_requested: true },
        updateCount: ids.length,
      }),
    });
    window._designLoadEtsyListings(record);
  } catch (err) {
    btn.disabled    = false;
    btn.textContent = 'Queue Image Update';
  }
};

// ---------------------------------------------------------------------------
// Page config
// ---------------------------------------------------------------------------
export const designs = {
  defaultSort:  'name',
  defaultOrder: 1,
  defaultPer:   100,

  drawerKey:     '_id',
  drawerTitle:   (record) => record.name || 'Design',
  drawerOverview,

  drawerTabs: [
    {
      id:     'etsy_media',
      label:  'Etsy Media',
      count:  (record) => IMAGE_KEYS.filter(key => record[key]).length,
      render: etsyMediaTab,
    },
    {
      id:     'etsy_listings',
      label:  'Etsy Listings',
      render: etsyListingsTab,
    },
  ],

  actions: `<button class="btn btn-primary btn-sm" onclick="window._designCreate()">+ New</button>`,

  filters: [
    { name: 'search', type: 'text', label: 'Search', placeholder: 'design name…' },
  ],

  columns: [
    {
      key:    'name',
      label:  'Name',
      render: (val) => `<div class="text-sm">${val}</div>`,
    },
    {
      key:    'etsy_video_url',
      label:  'Video',
      render: (val) => val
        ? `<span class="badge badge-sm" style="background:#22c55e;color:#fff;border-color:#22c55e">Yes</span>`
        : `<span class="badge badge-sm badge-ghost">No</span>`,
    },
    {
      key:    'images',
      label:  'Etsy Images',
      render: (val, record) => {
        const urls = IMAGE_KEYS.map(key => record[key]).filter(Boolean);
        return `
          <div class="flex flex-col gap-1">
            <span class="text-xs opacity-50">${urls.length}/${IMAGE_SLOTS.length}</span>
            <div class="grid gap-1" style="grid-template-columns: repeat(10, 2.5rem)">
              ${IMAGE_SLOTS.map(slot => {
                const url = record[_imageUrlField(slot)];
                return url
                  ? `<a href="${url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
                       <img src="${url}" alt="" class="w-10 h-10 object-cover rounded hover:opacity-80 transition-opacity" />
                     </a>`
                  : `<div class="w-10 h-10 rounded border border-dashed border-base-content/20 bg-base-200"></div>`;
              }).join('')}
            </div>
          </div>
        `;
      },
    },
  ],

  fetch,
};

// ---------------------------------------------------------------------------
// Globals wired by drawer buttons
// ---------------------------------------------------------------------------
window._designCreate = () => {
  window._CrudForm.open(
    { title: 'New Design', collection: COL, idField: '_id', fields: CREATE_FIELDS },
    {}
  );
};

window._designEdit = (schemaKey) => {
  window._CrudForm.open(DESIGN_SCHEMAS[schemaKey], window._currentDesignRecord);
};

window._designDelete = async (id) => {
  if (!confirm('Delete this design?')) return;
  try {
    await API.gcf('v2-mdb', {
      toast: 'Deleted',
      body: JSON.stringify({ op: 'delete', col: COL, q: { _id: id } }),
    });
    document.getElementById('drawer-close')?.click();
  } catch (err) {
    // error toast handled by API.gcf
  }
};

// ---------------------------------------------------------------------------
// Clone — new design record with a new name, carrying over every image
// field (including the hidden slot 1) from the current record.
// ---------------------------------------------------------------------------
window._designClone = () => {
  const source = window._currentDesignRecord;
  window._Modal.open(`
    <div class="p-4 flex flex-col gap-2" style="width:24rem;max-width:100%">
      <div class="form-control gap-0.5">
        <label class="label py-0" for="clone-name"><span class="label-text text-xs">Name</span></label>
        <input id="clone-name" type="text" value="${source.name ? `${source.name} (copy)` : ''}"
          class="input input-bordered input-sm w-full" />
      </div>
      <div id="clone-error" class="text-error text-sm hidden"></div>
    </div>
  `, 'Clone Design', {
    boxClass: 'max-w-sm',
    actions: '<button id="clone-submit-btn" onclick="window._designCloneSubmit()" class="btn btn-sm btn-primary">Create</button>',
  });
};

window._designCloneSubmit = async () => {
  const source = window._currentDesignRecord;
  const nameEl = document.getElementById('clone-name');
  const errEl  = document.getElementById('clone-error');
  const btn    = document.getElementById('clone-submit-btn');
  const name   = nameEl?.value?.trim();

  if (!name) {
    errEl.textContent = 'Name is required.';
    errEl.classList.remove('hidden');
    return;
  }

  errEl.classList.add('hidden');
  btn.disabled  = true;
  btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

  const doc = { name };
  for (const slot of ALL_IMAGE_SLOTS) {
    const url = source[_imageUrlField(slot)];
    const key = source[_imageKeyField(slot)];
    if (url) doc[_imageUrlField(slot)] = url;
    if (key) doc[_imageKeyField(slot)] = key;
  }

  try {
    const result  = await API.gcf('v2-mdb', {
      toast: 'Design cloned',
      body: JSON.stringify({ op: 'insertVerify', col: COL, doc }),
    });
    const created = result?.records?.[0];
    window._Modal.close();
    if (created) {
      API.storeUpdate(COL, created, '_id');
      window._Table?.prependRow(created);
      window._Drawer?.open(created, 'etsy_media', String(created._id));
    }
  } catch (err) {
    errEl.textContent = err.message || 'Failed to clone design.';
    errEl.classList.remove('hidden');
    btn.disabled    = false;
    btn.textContent = 'Create';
  }
};

// ---------------------------------------------------------------------------
// Image slot upload — read file, upload for a thumbnail + temp id, stage it
// for the batch save below. Supports both click-to-browse and drag-and-drop.
// ---------------------------------------------------------------------------
function _uploadFileToSlot(slot, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => window._designSlotUpload(slot, reader.result, file.type);
  reader.readAsDataURL(file);
}

window._designSlotFileChange = (inputEl, slot) => {
  const file = inputEl.files?.[0];
  inputEl.value = ''; // allow re-selecting the same file later
  _uploadFileToSlot(slot, file);
};

const REORDER_MIME = 'application/x-design-slot';

window._designSlotDragStart = (event, slot) => {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(REORDER_MIME, String(slot));
  document.getElementById(`design-slot-${slot}`)?.classList.add('opacity-40');
};

window._designSlotDragEnd = (slot) => {
  document.getElementById(`design-slot-${slot}`)?.classList.remove('opacity-40');
};

window._designSlotDragOver = (event, slot) => {
  event.preventDefault();
  document.getElementById(`design-slot-${slot}`)?.classList.add('ring-2', 'ring-primary');
};

window._designSlotDragLeave = (slot) => {
  document.getElementById(`design-slot-${slot}`)?.classList.remove('ring-2', 'ring-primary');
};

window._designSlotDrop = (event, slot) => {
  event.preventDefault();
  document.getElementById(`design-slot-${slot}`)?.classList.remove('ring-2', 'ring-primary');

  // External file (from the OS / file browser) — upload it into this slot.
  if (event.dataTransfer.types.includes('Files')) {
    _uploadFileToSlot(slot, event.dataTransfer.files?.[0]);
    return;
  }

  // Internal drag — reorder an existing image into this slot.
  const fromSlot = +event.dataTransfer.getData(REORDER_MIME);
  if (fromSlot && fromSlot !== slot) window._designSlotsReorder(fromSlot, slot);
};

window._designSlotUpload = async (slot, dataUrl, contentType) => {
  const spinnerEl     = document.getElementById(`design-slot-spinner-${slot}`);
  const imgEl         = document.getElementById(`design-slot-img-${slot}`);
  const placeholderEl = document.getElementById(`design-slot-placeholder-${slot}`);
  const tileEl        = document.getElementById(`design-slot-${slot}`);

  spinnerEl?.classList.remove('hidden');
  try {
    const base64 = dataUrl.split(',')[1] ?? dataUrl;
    const result = await API.gcf('v2-imageUploadTemp', {
      body: JSON.stringify({ data: base64, content_type: contentType }),
    });
    const uploaded = result?.records?.[0];

    pendingImageUploads[slot] = uploaded?._id;

    if (imgEl && uploaded?.s3_url) {
      imgEl.src = uploaded.s3_url;
      imgEl.classList.remove('hidden');
      placeholderEl?.classList.add('hidden');
    }
    tileEl?.classList.add('border-dashed', 'border-gray-400');
    tileEl?.classList.remove('border-transparent');
    document.getElementById(`design-slot-remove-${slot}`)?.classList.remove('hidden');

    const saveBtn = document.getElementById('design-images-save-btn');
    if (saveBtn) saveBtn.disabled = false;
  } catch (err) {
    // error toast handled by API.gcf
  } finally {
    spinnerEl?.classList.add('hidden');
  }
};

// ---------------------------------------------------------------------------
// Remove an image — a pending (not-yet-saved) upload is just discarded
// locally; an already-saved image is nulled out on the record after confirm.
// ---------------------------------------------------------------------------
window._designSlotRemove = (slot) => {
  if (pendingImageUploads[slot]) {
    _cancelPendingUpload(slot);
    return;
  }
  window._designSlotDelete(slot);
};

function _cancelPendingUpload(slot) {
  delete pendingImageUploads[slot];

  const record        = window._currentDesignRecord;
  const url            = record[_imageUrlField(slot)] || '';
  const imgEl          = document.getElementById(`design-slot-img-${slot}`);
  const placeholderEl  = document.getElementById(`design-slot-placeholder-${slot}`);
  const tileEl         = document.getElementById(`design-slot-${slot}`);
  const removeBtnEl    = document.getElementById(`design-slot-remove-${slot}`);

  if (imgEl) {
    imgEl.src = url;
    imgEl.classList.toggle('hidden', !url);
  }
  placeholderEl?.classList.toggle('hidden', !!url);
  tileEl?.classList.remove('border-dashed', 'border-gray-400');
  tileEl?.classList.add('border-transparent');
  removeBtnEl?.classList.toggle('hidden', !url);

  const saveBtn = document.getElementById('design-images-save-btn');
  if (saveBtn) saveBtn.disabled = Object.keys(pendingImageUploads).length === 0;
}

window._designSlotDelete = async (slot) => {
  const record = window._currentDesignRecord;
  if (!record[_imageUrlField(slot)]) return;
  if (!confirm(`Remove image ${slot}?`)) return;

  const doc = {
    _id: record._id,
    [_imageUrlField(slot)]: null,
    [_imageKeyField(slot)]: null,
  };

  try {
    const result = await API.gcf('v2-mdb', {
      toast: 'Image removed',
      body: JSON.stringify({ op: 'updateVerify', col: COL, q: { _id: record._id }, doc }),
    });

    const partial = result?.records?.[0] ?? doc;
    const merged  = { ...record, ...partial };
    API.storeUpdate(COL, merged, '_id');
    window._Table?.upsertRow(merged);
    window._Drawer?.refresh(merged);
  } catch (err) {
    // error toast handled by API.gcf
  }
};

window._designImagesSave = async () => {
  const record  = window._currentDesignRecord;
  const btn     = document.getElementById('design-images-save-btn');
  const entries = Object.entries(pendingImageUploads).filter(([, tempId]) => tempId);
  if (!entries.length) return;

  btn.disabled  = true;
  btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

  try {
    const body = { _id: record._id };
    for (const [slot, tempId] of entries) body[`etsy_image_temp_id_${slot}`] = tempId;

    const result = await API.gcf('v2-etsySmileSaveDesignImages', {
      toast: 'Images saved',
      body: JSON.stringify(body),
    });

    const partial = result?.records?.[0] ?? {};
    const merged  = { ...record, ...partial };
    API.storeUpdate(COL, merged, '_id');
    window._Table?.upsertRow(merged);
    pendingImageUploads = {};
    window._Drawer?.refresh(merged);
  } catch (err) {
    btn.disabled    = false;
    btn.textContent = 'Save';
  }
};

// ---------------------------------------------------------------------------
// Reorder existing images — drag one slot onto another to move it there,
// shifting everything in between. Saves immediately (no separate button)
// since it only rearranges already-saved images, no new upload involved.
// ---------------------------------------------------------------------------
let reorderSaving = false;

window._designSlotsReorder = async (fromSlot, toSlot) => {
  if (reorderSaving) return;
  const record = window._currentDesignRecord;

  const items = IMAGE_SLOTS.map(slot => {
    const url = record[_imageUrlField(slot)];
    return url ? { url, key: record[_imageKeyField(slot)] } : null;
  });
  const [moved] = items.splice(IMAGE_SLOTS.indexOf(fromSlot), 1);
  items.splice(IMAGE_SLOTS.indexOf(toSlot), 0, moved);

  const doc = { _id: record._id };
  IMAGE_SLOTS.forEach((slot, index) => {
    const item = items[index];
    doc[_imageUrlField(slot)] = item?.url ?? null;
    doc[_imageKeyField(slot)] = item?.key ?? null;
  });

  reorderSaving = true;
  try {
    const result = await API.gcf('v2-mdb', {
      toast: 'Order saved',
      body: JSON.stringify({ op: 'updateVerify', col: COL, q: { _id: record._id }, doc }),
    });

    const partial = result?.records?.[0] ?? doc;
    const merged  = { ...record, ...partial };
    API.storeUpdate(COL, merged, '_id');
    window._Table?.upsertRow(merged);
    window._Drawer?.refresh(merged);
  } catch (err) {
    // error toast handled by API.gcf
  } finally {
    reorderSaving = false;
  }
};

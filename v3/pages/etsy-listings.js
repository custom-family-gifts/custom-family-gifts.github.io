import { API } from '../core/api.js';

const COL = 'cfg.etsy_listing';

const IMAGE_SLOTS = Array.from({ length: 20 }, (_, index) => index + 1);
const _imageUrlField = (slot) => `etsy_image_url_${slot}`;

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
async function fetch(state) {
  const { search } = state.filters;
  const q = search ? { title: { $regex: search.trim(), $options: 'i' } } : {};
  const s = state.sort ? { [state.sort]: state.order } : {};
  return API.find({ col: COL, q, s, per: state.per, page: state.page });
}

// ---------------------------------------------------------------------------
// Page config
// ---------------------------------------------------------------------------
export const etsyListings = {
  defaultPer: 100,

  drawerKey:   '_id',
  drawerTitle: (record) => record.title || 'Listing',
  // No drawer template yet — falls back to Drawer's default (every field, labeled).

  filters: [
    { name: 'search', type: 'text', label: 'Search', placeholder: 'listing title…' },
  ],

  columns: [
    {
      key:      'listing_id',
      label:    'Listing ID',
      sortable: true,
      render:   (val) => {
        if (!val) return `<span class="text-sm font-mono opacity-30">—</span>`;
        return `
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-mono">${val}</span>
            <div class="flex gap-2">
              <a href="https://www.etsy.com/listing/${val}" target="_blank" rel="noopener"
                onclick="event.stopPropagation()" class="link link-primary text-xs">View</a>
              <a href="https://www.etsy.com/your/shops/me/listing-editor/edit/${val}" target="_blank" rel="noopener"
                onclick="event.stopPropagation()" class="link link-primary text-xs">Edit</a>
            </div>
          </div>
        `;
      },
    },
    {
      key:    'title',
      label:  'Title',
      render: (val, record) => `
        <div class="flex items-center gap-1">
          <span class="text-sm">${val || '—'}</span>
          ${record.etsy_image_update_requested ? `<span title="etsy image update requested">⏳</span>` : ''}
        </div>
      `,
    },
    {
      key:    'product_line',
      label:  'Product Line',
      render: (val) => val
        ? `<span class="badge badge-sm badge-ghost">${val}</span>`
        : `<span class="text-xs opacity-30">—</span>`,
    },
    {
      key:    'images',
      label:  'Etsy Images',
      render: (val, record) => {
        const filledCount = IMAGE_SLOTS.filter(slot => record[_imageUrlField(slot)]).length;
        if (!filledCount) return `<span class="text-xs opacity-30">—</span>`;
        return `
          <div class="flex flex-col gap-1">
            <span class="text-xs opacity-50">${filledCount}/${IMAGE_SLOTS.length}</span>
            <div class="grid gap-1" style="grid-template-columns: repeat(10, 3.33rem)">
              ${IMAGE_SLOTS.map(slot => {
                const url = record[_imageUrlField(slot)];
                return url
                  ? `<a href="${url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
                       <img src="${url}" alt="" class="w-[3.33rem] h-[3.33rem] object-cover rounded hover:opacity-80 transition-opacity" />
                     </a>`
                  : `<div class="w-[3.33rem] h-[3.33rem] rounded border border-dashed border-base-content/20 bg-base-200"></div>`;
              }).join('')}
            </div>
          </div>
        `;
      },
    },
  ],

  fetch,
};

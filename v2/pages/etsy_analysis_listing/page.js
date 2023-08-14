$(async () => {
  await Navigation.renderAnalysis();
  await Render.try('main', null, true);
});

// renders the filters, page, 
Render.main = async () => {
  var urlParams = API.getUrlParams();

  // paginate defaults
  if (!urlParams.per) urlParams.per = 100;
  if (!urlParams.page) urlParams.page = 1;
  if (!urlParams.sort) urlParams.sort = 'listing_id';
  if (!urlParams.order) urlParams.order = 1;
  // num cast these
  if (urlParams.page) urlParams.page = +urlParams.page;
  if (urlParams.per) urlParams.per = +urlParams.per;
  if (urlParams.order) urlParams.order = +urlParams.order;

  if (urlParams.addon == undefined) urlParams.addon = 0;

  // setup the query object
  var mdbQuery = {
    op: 'find',
    db: 'etsy_analyze', col: 'listing',
    p: {
      original_creation_timestamp: 1,
      num_favorers: 1,
      description: 1,
      listing_id: 1,
      materials: 1,
      processing_min: 1,
      processing_max: 1,
      quantity: 1,
      shop_id: 1,
      state: 1,
      tags: 1,
      taxonomy_id: 1,
      title: 1,
      url: 1,
      views: 1,
      product_line: 1, nickname: 1
    },
    q: {}, s: {},
    per: urlParams.per, page: urlParams.page
  };
  mdbQuery.s[urlParams.sort] = +urlParams.order;

  if (urlParams.addon == '1') mdbQuery.q.title = { $regex: `addon`, $options: 'i' }
  if (urlParams.addon == '0') mdbQuery.q.title = { $not: {$regex: 'addon', $options: 'i'} };
  if (urlParams.product_line) mdbQuery.q.product_line = urlParams.product_line;

  if (urlParams.search) mdbQuery.q.title = { $regex: `${urlParams.search}`.toLowerCase(), $options: 'i' }


  var data = await API.gcf(`v3-mdb`, {
    body: JSON.stringify(mdbQuery)
  });

  // for this page, it's useful to save a copy of the full listings
  mdbQuery.q = {};
  mdbQuery.per = 200;
  var fullListings = await API.gcf(`v3-mdb`, {
    body: JSON.stringify(mdbQuery)
  });
  data.fullListings = fullListings.records;
  Render.fullListings = fullListings.records;

  console.log(data);
  // data.params is the params used in the most recent query - defaults and all
  data.params = urlParams;
  var result = `
    ${await Render.try('filter', data)}
    ${await Render.try('results', data)}
    ${await Render.try('paginate', data)}
  `;

  return result;
};

Render.filter = (data) => {

  // gather product lines
  var product_lines = {};
  data.fullListings.forEach(record => {
    if (record.product_line) {
      product_lines[record.product_line] = true;
    }
  });
  console.log(product_lines);
  var sorted_product_lines = Object.keys(product_lines).sort((a, b) => {
    return (a < b) ? -1 : 1;
  });
  console.log(sorted_product_lines);
  var product_line_filters = '';
  sorted_product_lines.forEach(product_line => {
    product_line_filters += `<option value="${product_line}" ${(data.params.product_line == product_line) ? 'selected':''}>${product_line}</option>`;
  });

  var result = `
    <div class="row">
      <div class="card small" style="width: 150px;">
        <strong>title search</strong>
        <input param type="text" name="search" value="${(data.params.search) ? data.params.search : ''}" />
      </div>

      <div class="card small">
        <strong>product line</strong>
        <select param name="product_line">
          <option value="">--</option>
          ${product_line_filters}
        </select>
      </div>

      <div class="card small" style="width:100px">
        <strong>addon</strong>
        <select param name="addon">
          <option value="1" ${(data.params.addon == '1') ? 'selected' : '' }>YES</option>
          <option value="0" ${(data.params.addon == '0') ? 'selected' : '' }>NO</option>
        </select>
      </div>

      <button class="primary" paramSubmit>Go</button>
      <button class="" paramClear>Clear</button>
    </div>
  `;
  return result;
};

Render.results = (data) => {
  var columnDefs = {
    _checkbox: { },
    delete: { hide: true },
    created: { hide: true },
    modified: { hide: true },
    // hidden
    shop_id: { hide: true },
    listing_id: { hide: true },
    url: { hide: true },
    state: { hide: true },
    original_creation_timestamp: { hide: true },
    taxonomy_id: { hide: true },
    processing_max: { hide: true },
    processing_min: { hide: true },
    quantity: { hide: true },
    tags: { hide: true },
    materials: { hide: true },
    num_favorers: { hide: true },
    nickname: { hide: true },
    // ordered
    listing: {
      order: 0,
      width: '95px',
      display: (value, record) => {
        // calculate epoch for creation date
        var epoch = record.original_creation_timestamp;
        var d = new Date(0);
        d.setUTCSeconds(epoch);
        var html = `
          <span style="cursor:pointer" title="${(record.state == 'active') ? 'Active' : 'Inactive'}">${(record.state == 'active') ? '✅' : '✖️'}</span>
          <a target="_blank" title="goto Etsy" href="${record.url}">${record.listing_id}</a>
          <div style="font-size: 0.9em; color: #bbb" class="datetime">
            ${d.toISOString()}
          </div>
          <div style="font-size: 0.9em; color: #bbb; ${(record.quantity && record.quantity < 100) ? 'color: red;' : ''}">qty: ${record.quantity}</div>
          ${(record.title.toLowerCase().includes('addon') ? '<div style="font-size: 0.9em; color: purple; font-weight:600">addon</div>' : '')}
        `;
        if (record.processing_min) {
          html += `<div style="font-size: 0.9em; color: #bbb">${record.processing_min}-${record.processing_max} d processing</div>`
        }
        return html;
      },
    },
    product_line: {
      order: 0.5,
      title: 'product line',
      display: (value, record) => {
        var html = ``;
        if (record.product_line) html += `<div style="font-weight: 600">${record.product_line}</div>`;
        if (record.nickname) html += `<div><i>${record.nickname}</i></div>`;
        return html;
      }
    },
    title: {
      order: 1,
    },
    description: {
      order: 2,
      title: 'listing description',
      style: 'min-width: 140px',
      display: (value) => {
        var html = `
          <textarea style="height: 100%; font-size: 0.8em; padding: 5px; margin: -9px;" disabled>${value}</textarea>
        `;
        return html;
      }
    },
    SEO: {
      order: 3,
      label: 'Tags / Materials',
      style: 'max-height: 150px; overflow: auto',
      display: (value, record) => {
        var html = ``;
        if (record.tags) {
          html += `<div></div>`;
          record.tags.forEach((tag, i) => {
            html += `
              <span title="tag: ${tag}" style="display: inline-block; padding: 1px 4px; background-color: #1976d2; color: white; font-size: 0.85em; margin: 0 3px 3px 0;">
                <span style="font-size: 0.9em;opacity:0.7;">${record.tags.length - i}.</span> ${tag}
              </span>
            `;
          })
        }
        if (record.materials) {
          record.materials.forEach((tag, i) => {
            html += `
              <span title="material: ${tag}" style="display: inline-block; padding: 1px 4px; background-color: #999; color: white; font-size: 0.85em; margin: 0 3px 3px 0;">
                <span style="font-size: 0.9em;opacity:0.7;">${record.materials.length - i}.</span> ${tag}
              </span>
            `
          });
        }
        return html;
      }
    },
    views: {
      order: 4,
      style: 'text-align: right;',
      width: '80px',
      display: (value, record) => {
        var html = ``;
        if (value) html += `<div title="${value} views">👁️${value}</div>`;
        if (record.num_favorers) html += `<div style="margin-left: 4px;" title="${record.num_favorers} faves">❤️${record.num_favorers}</div>`;
        return html;
      }
    }
  };

  var result = Render.table(data, columnDefs);
  return result;
};

Render.selectedIdsUpdate = (selectedIds, _id) => {
  if (!_id) return;
  Drawer.load({ _id: _id });
};
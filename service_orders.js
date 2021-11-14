Render.try('navigation',[
  { target: "/service_orders.html", label: 'Orders' },
  { target: "/freshdesk.html", label: 'Freshdesk' },
  { target: "/errors.html", label: 'API Errors' },
  { target: "/api_log.html", label: 'API Log' },
], true);
API.promptAdminKey();

Render.header = (data) => {
  var result = `
    <header id="content_header">
      <img id="cfgLogo" src="https://cdn.shopify.com/s/files/1/0060/6725/7434/files/heart.png?v=1607199816">
      <a href="#top" class="button" style="margin-left:60px;">API Errors</a>
    </header>
  `;
  return result;
};

/* nothing here so far - i think most of the logic will be with the render functions */
API.load = (urlParams) => {
  Render.loading('main');

  // paginate defaults
  if (!API.params.per) API.params.per = 25;
  if (!API.params.page) API.params.page = 1;
  if (!API.params.s) API.params.s = { orderId_raw: -1 };
  // apply urlParams
  if (urlParams.page) API.params.page = +urlParams.page;
  if (urlParams.per) API.params.per = +urlParams.per;

  // defaults
  if (urlParams.sort) {
    API.params.s = {}; // default
    API.params.s[urlParams.sort] = -1;
    if (urlParams.order && urlParams.order == 1) API.params.s[urlParams.sort] = 1;
  }

  API.params.q = {};
  // query defaults
  if (urlParams.search) {
    if (urlParams.search.charAt(0) == '#' && !isNaN(urlParams.search.substring(1,999))) {
      API.params.q = { $or: [
        {orderId_raw: +urlParams.search.substring(1, 999)},
      ]};
    } else if (!isNaN(urlParams.search.replace(/-/g,"").replace(/\(/g,"").replace(/\)/g,''))) {
      API.params.q = { $or: [
        {etsy_receipt_id: { $regex: urlParams.search }},
        {orderId_raw: +urlParams.search},
        {custPhoneSanitized: { $regex: urlParams.search.replace(/\D/g, "") }}
      ]};
    } else {
      API.params.q = { $or: [
        {customer: { $regex: urlParams.search, $options: 'i' }},
        {shipAddress: { $regex: urlParams.search, $options: 'i' }}
      ]};
    }
  }

  API.call({
    cacheMS: 4000,
    method: 'v2-mdb',
    httpMethod: 'POST',
    body: JSON.stringify({
      op: 'find',
      db: 'cfg',
      col: 'orders',
      q: API.params.q,
      s: API.params.s,
      p: {
        orderId_raw: 1, items: 1, options: 1,
        custFirst: 1, custLast: 1, email: 1, custPhone: 1,
        artist: 1, pipeline: 1,
        created: 1, isPriority: 1, shopifyOrderId: 1, etsy_receipt_id: 1,
        customer: 1, shipAddress: 1, created_shopify_order: 1, 'Internal - newest on top please': 1,
        print_note: 1, etsy_link: 1, 'order link': 1, customer_order_link: 1, at_record_id: 1
      },
      per: API.params.per,
      page: API.params.page
    }),
    onSuccess: (data) => {
      window.data = data;
      Render.try('main', data, true);
    },
    onFailure: (data) => {
      $('#main').html(`
        <div class="row">
          <p>Ooops. Something went wrong</p>
          <p>Please try back in a few minutes</p>
          <p>Otherwise, reach out to Peter for support</p>
        </div>
      `);
    }
  });
};

Render.main = (data) => {
  var result = `
    ${Render.try('filter', data)}
    ${Render.try('results', data)}
    ${Render.try('paginate', data)}
  `;

  return result;
};

Render.filter = (data) => {
  var urlParams = API.getUrlParams();

  var result = `
    <div class="row">
      <div class="card small">
        <strong>search</strong>
        <input param name="search" placeholder="name, email, phone, ids" value="${urlParams.search || ''}">
      </div>

      <button class="primary" paramSubmit>Go</button>
      <button class="" paramClear>Clear</button>
    </div>
  `;
  return result;
};

Render.results = (data) => {
  var columnDefs = {
    _checkbox: { single: true, hide: false, value: (record) => record.orderId_raw },
    custFirst: { hide: true },
    custLast: { hide: true },
    email: { hide: true },
    custPhone: { hide: true },
    items: { hide: true },
    artist: { hide: true },
    created: { hide: true },
    isPriority: { hide: true },
    etsy_receipt_id: { hide: true },
    shopifyOrderId: { hide: true },
    customer: { hide: true },
    shipAddress: { hide: true },
    created_shopify_order: { hide: true },
    at_record_id: { hide: true },
    customer_order_link: { hide: true },
    'order link': { hide: true },
    etsy_link: { hide: true },
    print_note: { hide: true },
    options: { hide: true },
    'Internal - newest on top please': { hide: true },
    orderId_raw: {
      label: 'order',
      order: 0,
      height: '150px',
      display: (value, record) => {
        var result = `${(record.isPriority) ? '⭐ ' : ''}
        <a target="_blank" href="https://custom-family-gifts.myshopify.com/admin/orders/${record.shopifyOrderId}">
          #${record.orderId_raw}
        </a>`;
        result += `<span class="datetime small">${record.created_shopify_order}</span>`;
        if (record.etsy_receipt_id) result += `<a style="float:right" href="https://www.etsy.com/your/orders/sold/?order_id=${record.etsy_receipt_id}" target="_blank">${record.etsy_receipt_id} 🍊</a>`;
        if (record.items) result += `${renderItems(record.items, record.options)}`;
        if (record['Internal - newest on top please']) {
          result += `<div class="note" style="display:inline-block;width:42%;margin-right:4px;background-color:#f77251"><div class="noteHeader">Internal Note:</div>${record['Internal - newest on top please']}</div>`;
        }
        if (record.print_note) {
          result += `<div class="note" style="display:inline-block;width:42%;margin-right:4px;background-color:#1976d2"><div class="noteHeader">Print Note:</div>${record.print_note}</div>`;
        }
        return result;
      }
    },
    customer: {
      order: 1,
      display: (value, record) => {
        return renderCustomer(record);
      }
    },
    pipeline: {
      label: 'pipeline / artist',
      display: (value, record) => {
        var result = `${renderPipeline(value)}`;
        if (record.artist) result += `${renderArtist(record.artist)}`;
        return result;
      }
    },
    links: {
      hide: false,
      display: (value, record) => {
        return `<div>${renderLinks(record)}</div>`;
      }
    }
  };

  var result = `
    <table id="mainTable">
      ${Render.thead(data, columnDefs)}
      ${Render.tbody(data, columnDefs)}
    </table>
  `;
  return result;
};

Render.selectedIdsUpdate = (selectedIds, orderId) => {
  if (!orderId) return;
  Drawer.load({orderId:orderId});
};

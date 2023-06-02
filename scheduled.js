Navigation.renderAdmin();

/* nothing here so far - i think most of the logic will be with the render functions */
API.load = (urlParams) => {
  Render.loading('main');

  // paginate defaults
  if (!API.params.per) API.params.per = 100;
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

  API.call({
    cacheMS: 0,
    method: 'v2-mdb',
    httpMethod: 'POST',
    body: JSON.stringify({
      op: 'find',
      db: 'cfg',
      col: 'scheduled_tasks',
      q: API.params.q,
      s: API.params.s,
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
    <button class="primary" onclick="showCreateModal()">Create</button>
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
        <input param name="search" placeholder="task name" value="${urlParams.search || ''}">
      </div>

      <button class="primary" paramSubmit>Go</button>
      <button class="" paramClear>Clear</button>
    </div>
  `;
  return result;
};

Render.results = (data) => {
  var columnDefs = {
    _checkbox: { single: true, hide: false, value: (record) => record._id },
    name: { hide: false, order: 0 },
    minutes: { order: 1 },
    gcf_query: {
      order: 2,
      display: (value, record) => {
        var html = '';
        if (record.gcf_query_db) {
          if (record.gcf_query_db) html += `<span>${record.gcf_query_db}.${record.gcf_query_col}</span>`;
          if (record.gcf_query_q) html += `<br><span>q: ${record.gcf_query_q}</span>`;
          if (record.gcf_query_p) html += `<br><span>p: ${record.gcf_query_p}</span>`;
          if (record.gcf_query_per) html += `<br><span>per: ${record.gcf_query_per}</span>`;
        }
        return html;
      }
    },
    gcf_execute: {
      order: 3,
      display: (value, record) => {
        var html = record.gcf_execute;
        if (record.gcf_execute_params) html += `<br><span>${record.gcf_execute_params}</span>`;
        if (record.gcf_execute_body) html += `<br><span>${record.gcf_execute_body}</span>`;
        return html;
      }
    },
    gcf_query_col: { hide: true },
    gcf_query_db: { hide: true },
    gcf_query_q: { hide: true },
    gcf_query_p: { hide: true },
    gcf_query_per: { hide: true },
    gcf_execute_body: { hide: false },
    gcf_body: { hide: true }, // misnamed field, does nothing
    gcf_execute_body: { hide: true },
    gcf_execute_params: { hide: true },
    delete: { hide: true },
    created: { hide: true },
    modified: { hide: true }
  };

  var result = Render.table(data, columnDefs);
  return result;
};

Render.selectedIdsUpdate = (selectedIds, _id) => {
  if (!_id) return;
  Drawer.load({ _id: _id });
};

function showCreateModal() {
  Modal.renderEdit2({
    id: new Date().getTime(),
    title: 'Add Scheduled Task',
    fields: [
      { name: 'name', type: 'textarea', required: true, instructions: 'to identify & describe the scheduled task' },
      { name: 'minutes', type: 'number', required: true, instructions: 'time between trigger' },
      { name: 'active', type: 'boolean', instructions: 'whether or not this scheduled task gets run' },
      { name: 'gcf_query_db', label: 'query mdb.db', type: 'text', instructions: 'leave all query fields blank to do a single run' },
      { name: 'gcf_query_col', label: 'query mdb.col', type: 'text' },
      { name: 'gcf_query_q', label: 'query mdb.q', type: 'textarea', instructions: 'as json' },
      { name: 'gcf_query_p', label: 'query mdb.p', type: 'textarea', instructions: 'as json - passed by key to execute' },
      { name: 'gcf_query_per', label: 'query mdb.per', type: 'number' },
      { name: 'gcf_execute', label: 'gcf execute', type: 'text', required: true, instructions: 'gcf function to be invoked' },
      { name: 'gcf_execute_params', label: 'gcf params', type: 'text', instructions: 'start with ? use ||name|| to use value from query p' },
      { name: 'gcf_execute_body', label: 'gcf body', type: 'textarea', instructions: 'as json' }
    ],
    submitFn: async (formData) => {
      var _id = formData._id;
      delete formData._id; // one does not update the primary key
      var result = await API.gcf(`v2-mdb`, {
        body: JSON.stringify({
          op: 'insert',
          db: 'cfg',
          col: 'scheduled_tasks',
          q: { _id: _id },
          doc: formData
        })
      });
      return result;
    },
    onSuccess: (result) => {
      Toast.show('Scheduled Task created');
      Drawer.load({ _id: result._id });
    }
  });
}

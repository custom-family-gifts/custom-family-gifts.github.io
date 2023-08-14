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
  if (!urlParams.sort) urlParams.sort = 'impressions';
  if (!urlParams.order) urlParams.order = -1;
  // num cast these
  if (urlParams.page) urlParams.page = +urlParams.page;
  if (urlParams.per) urlParams.per = +urlParams.per;
  if (urlParams.order) urlParams.order = +urlParams.order;

  // default search_by
  if (!urlParams.search_by) urlParams.search_by = 'word';

  // setup the query object
  var mdbQuery = {
    op: 'find',
    db: 'etsy_analyze', col: urlParams.search_by,
    q: {}, s: {},
    per: urlParams.per, page: urlParams.page
  };
  mdbQuery.s[urlParams.sort] = +urlParams.order;

  if (urlParams.favorite == '1') mdbQuery.q.favorite = true;
  if (urlParams.favorite == '0') mdbQuery.q.favorite = { $ne: true };
  if (urlParams.ignore == '1') mdbQuery.q.ignore = true;
  if (urlParams.ignore == '0') mdbQuery.q.ignore = { $ne: true };

  if (urlParams.word) mdbQuery.q[urlParams.search_by] = { $regex: `${urlParams.word}`.toLowerCase() }

  // mins
  if (urlParams.min_impressions) mdbQuery.q.impressions = { $gt: +urlParams.min_impressions };
  if (urlParams.min_visits) mdbQuery.q.visits = { $gt: +urlParams.min_visits };
  if (urlParams.min_revenue) mdbQuery.q.revenue = { $gt: +urlParams.min_revenue };
  if (urlParams.min_orders) mdbQuery.q.orders = { $gt: +urlParams.min_orders };
  // maxes
  if (urlParams.max_impressions) mdbQuery.q.impressions = { $lte: +urlParams.max_impressions };
  if (urlParams.max_visits) mdbQuery.q.visits = { $lte: +urlParams.max_visits };
  if (urlParams.max_revenue) mdbQuery.q.revenue = { $lte: +urlParams.max_revenue };
  if (urlParams.max_orders) mdbQuery.q.orders = { $lte: +urlParams.max_orders };

  var data = await API.gcf(`v3-mdb`, {
    body: JSON.stringify(mdbQuery)
  });
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
  var result = `
    <div class="row">
      <div class="card small">
        <strong>search by</strong>
        <select param name="search_by">
          <option ${(data.params.search_by == 'word') ? 'selected' : ''} value="word">word alltime</option>
          <option ${(data.params.search_by == 'keyword') ? 'selected' : ''} value="keyword">keyword alltime</option>
        </select>
      </div>

      <div class="card small" style="width: 150px;">
        <strong>word</strong>
        <input param type="text" name="word" value="${(data.params.word) ? data.params.word : ''}" />
      </div>

      <div class="card small" style="width: 183px;">
        <strong>impressions</strong>
        <div>
          <input placeholder="min" style="width:80px;" param type="number" name="min_impressions" value="${data.params.min_impressions}" />
          <input placeholder="max" style="width:80px;" param type="number" name="max_impressions" value="${data.params.max_impressions}" />
        </div>
      </div>

      <div class="card small" style="width: 183px;">
        <strong>visits</strong>
        <div>
          <input placeholder="min" style="width:80px;" param type="number"  name="min_visits" value="${data.params.min_visits}" />
          <input placeholder="max" style="width:80px;" param type="number" name="max_visits" value="${data.params.max_visits}" />
        </div>
      </div>

      <div class="card small" style="width: 183px;">
        <strong>revenue $</strong>
        <div>
          <input placeholder="min" style="width:80px;" type="number" param name="min_revenue" value="${data.params.min_revenue}" />
          <input placeholder="min" style="width:80px;" type="number" param name="max_revenue" value="${data.params.max_revenue}" />
        </div>
      </div>

      <div class="card small" style="width: 183px;">
        <strong>orders</strong>
        <div>
          <input placeholder="min" style="width:80px;" type="number" param name="min_orders" value="${data.params.min_orders}" />
          <input placeholder="min" style="width:80px;" type="number" param name="max_orders" value="${data.params.max_orders}" />
        </div>
      </div>

      <div class="card small" style="width:100px">
        <strong>favorite</strong>
        <select param name="favorite">
          <option value="">--</option>
          <option value="1" ${(data.params.favorite == '1') ? 'selected' : '' }>YES</option>
          <option value="0" ${(data.params.favorite == '0') ? 'selected' : '' }>NO</option>
        </select>
      </div>

      <div class="card small" style="width:100px">
        <strong>ignore</strong>
        <select param name="ignore">
          <option value="">--</option>
          <option value="1" ${(data.params.ignore == '1') ? 'selected' : '' }>YES</option>
          <option value="0" ${(data.params.ignore == '0') ? 'selected' : '' }>NO</option>
        </select>
      </div>

      <button class="primary" paramSubmit>Go</button>
      <button class="" paramClear>Clear</button>
    </div>
  `;
  return result;
};

async function toggleFavorite(that) {
  var $this = $(that);
  var _id = that.value;
  var currentValue = (+that.getAttribute('mdbvalue')) ? true : false;
  // disable the element first
  $this.prop('disabled', true);

  var updateResult = await API.gcf(`v3-mdb`, {
    body: JSON.stringify({
      op: 'updateVerify',
      db: 'etsy_analyze',
      col: $('[name=search_by').val(),
      q: { _id: _id },
      doc: { favorite: !currentValue }
    })
  });

  $this.prop('checked', updateResult.records[0].favorite);
  $this.prop('disabled', false);
  $this.attr('mdbvalue', (updateResult.records[0].favorite) ? '1' : '0'); // we use 1, 0 instead of true false for js numcasting boolean evalsupdateResult.records[0].favorite
}

async function toggleIgnore(that) {
  var $this = $(that);
  var _id = that.value;
  var currentValue = (+that.getAttribute('mdbvalue')) ? true : false;
  // disable the element first
  $this.prop('disabled', true);

  var updateResult = await API.gcf(`v3-mdb`, {
    body: JSON.stringify({
      op: 'updateVerify',
      db: 'etsy_analyze',
      col: $('[name=search_by').val(),
      q: { _id: _id },
      doc: { ignore: !currentValue }
    })
  });

  $this.prop('checked', updateResult.records[0].favorite);
  $this.prop('disabled', false);
  $this.attr('mdbvalue', (updateResult.records[0].favorite) ? '1' : '0'); // we use 1, 0 instead of true false for js numcasting boolean evalsupdateResult.records[0].favorite
}

Render.results = (data) => {
  var columnDefs = {
    delete: { hide: true },
    created: { hide: true },
    modified: { hide: true },
    count: { hide: true },
    shop_id: { hide: true },
    impressions: { order: 1 },
    visits: { order: 2 },
    clickthru: { order:3, display: (value, record) => {
      if (value == null) return '';
      return `${(value * 100).toFixed(2)}%`;
    } },
    orders: { order: 4},
    revenue: { order: 5, format: 'money' },
    conversion_rate: { display: (value, record) => {
      if (value == null) return '0%';
      return `${value.toFixed(2).replace('.00','')}%`;
    }},
    order_fixed: { hide: true },
    favorite: { display: (value, record) => {
      var html = `
        <input type="checkbox" value="${record._id}" mdbvalue="${(record.favorite) ? 1 : 0}" ${(record.favorite) ? 'checked' : ''} onclick="(async () => await toggleFavorite(this)) ();">
      `;
      return html;
    }},
    ignore: { display: (value, record) => {
      var html = `
        <input type="checkbox" value="${record._id}" mdbvalue="${(record.ignore) ? 1 : 0}" ${(record.ignore) ? 'checked' : ''} onclick="(async () => await toggleIgnore(this)) ();">
      `;
      return html;
    }},
  };

  if (data.records && data.records[0] && data.records[0].word) {
    columnDefs._checkbox = { single: true, hide: false, value: (record) => record._id };
  }

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

Navigation.renderAdmin();

/* nothing here so far - i think most of the logic will be with the render functions */
API.load = (urlParams) => {
  Render.loading('main');

  // paginate defaults
  if (!API.params.per) API.params.per = 10;
  if (!API.params.page) API.params.page = 1;
  if (!API.params.s) API.params.s = { created: -1 };
  // apply urlParams
  if (urlParams.page) API.params.page = +urlParams.page;
  if (urlParams.per) API.params.per = +urlParams.per;

  // defaults
  if (urlParams.sort) {
    API.params.s = {}; // default
    API.params.s[urlParams.sort] = -1;
    if (urlParams.order && urlParams.order == 1) API.params.s[urlParams.sort] = 1;
  }

  // query defaults
  API.params.q = { $and: [] };
  if (urlParams.status == undefined || urlParams.status == 'NOK') {
    API.params.q.$and.push({ responseStatus: { $gt: 299 } });
  }
  if (urlParams.search) {
    if (urlParams.search.length == 24 && !isNaN(urlParams.search.charAt(0))) {
      // _id search
      API.params.q.$and.push({ _id: urlParams.search });
    } else {
      API.params.q.$and.push({
        $or: [
          { method: { $regex: urlParams.search }},
          { cypherKey: { $regex: urlParams.search }}
        ]
      });
    }
  }
  if (API.params.q.$and.length == 0) API.params.q = {};

  var projection = {
    created: 1,
    cypherKey: 1,
    method: 1,
    ip: 1,
    query: 1,
    body: 1,
    elapsedMs: 1,
    // responseBody: 1, // this is really heavy. crashes server when requested
    responseStatus: 1,
    // responseBody: (urlParams.search && urlParams.search.length == 24 && !isNaN(urlParams.search.charAt(0))) ? 1 : 0
  };
  if ((urlParams.search && urlParams.search.length == 24 && !isNaN(urlParams.search.charAt(0)))) projection.responseBody = 1;

  API.call({
    cacheMS: 4000,
    method: 'v2-mdb',
    httpMethod: 'POST',
    body: JSON.stringify({
      op: 'find',
      db: 'cfg_log',
      col: 'api_log',
      q: API.params.q,
      s: API.params.s,
      p: projection,
      per: API.params.per,
      page: API.params.page
    }),
    onSuccess: (data) => {
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
  console.log(data);
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
        <input param name="search" placeholder="_id, method, cypherKey" value="${urlParams.search || ''}">
      </div>

      <div class="card small" style="width: 120px;">
        <strong>status code</strong>
        <select name="status" param>
          <option value="ANY" ${(urlParams.status == 'ANY') ? 'selected' : ''}>- ANY -</option>
          <option value="OK" ${(urlParams.status == 'OK') ? 'selected' : ''}>OK (2xx)</option>
          <option value="NOK" ${(urlParams.status == 'NOK' || urlParams.status == undefined) ? 'selected' : ''}>NOT OK</option>
        </select>
      </div>

      <button class="primary" paramSubmit>Go</button>
      <button class="" paramClear>Clear</button>
    </div>
  `;
  return result;
};

//
// created: 1,
// cypherKey: 1,
// method: 1,
// ip: 1,
// hostname: 1,
// url: 1,
// query: 1,
// body: 1,
// elapsedMs: 1,
// responseBody: 1,
// responseStatus: 1

Render.results = (data) => {
  var columnDefs = {
    created: { order: 0, width: '60px' },
    cypherKey: { hide: true },
    ip: { hide: true },
    responseStatus: { hide: true },
    elapsedMs: { hide: true },
    query: { hide: true },
    body: { hide: true },
    method: {
      display: (data, record) => {
        var result = `${data}`;
        if (record.cypherKey) {
          result += `
            <div><code>cypherKey: ${record.cypherKey}</code></div>
          `;
        }
        if (record.ip) {
          result += `
            <div><code>ip: ${record.ip}</code></div>
          `;
        }
        return result;
      }
    },
    request: {
      display: (data, record) => {
        var result = '';
        var scrubbedParams = Object.assign({}, record.query);
        delete scrubbedParams.cypherKey;
        delete scrubbedParams.method;
        Object.keys(scrubbedParams).forEach(key => {
          if (result != '') result += '<br>';
          result += `
            <code>${key}=${scrubbedParams[key]}</code>
          `;
        });
        if (Object.keys(record.body).length > 0) {
          if (result != '') result += '<br>';
          result += `
            <code>${JSON.stringify(record.body, null, 2)}</code>
          `;
        }
        return result;
      }
    },
    responseBody: { hide: true },
    response: {
      height: "150px",
      display: (data, record) => {
        var result = '';
        if (record.responseStatus) result += `<code style="${(record.responseStatus > 400) ? 'color:red' : 'color:green' }">status_code: ${record.responseStatus} </code> `;
        if (record.elapsedMs) {
          var color = '';
          if (record.elapsedMs > 3000) color = 'color:#eb8200';
          if (record.elapsedMS > 5000) color = 'color:red';
          result += `<code style="${color}">${record.elapsedMs}ms</code>`;
        }
        if (record.responseBody && Object.keys(record.responseBody).length > 0) {
          result += `
            <br><code>${JSON.stringify(record.responseBody)}</code>
          `;
        } else {
          result += `
            <br><code>(click on _id to see response)</code>
          `;
          result += `<br><a href="javascript:loadSpecificId('${record._id}')"><code>_id:${record._id}</code></a>`;
        }
        return result;
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

function loadSpecificId(_id) {
  API.setUrlParam('search', _id);
  location.reload();
}

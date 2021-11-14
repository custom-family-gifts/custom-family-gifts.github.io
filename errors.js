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
  if (!API.params.per) API.params.per = 250;
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
  if (urlParams.name) API.params.q.$and.push({ name: { $regex: urlParams.name } });
  if (urlParams.message) API.params.q.$and.push({ message: { $regex: urlParams.message } });
  if (urlParams.param) {
    var paramKey = urlParams.param.split('=')[0] || 'xx';
    var paramValue = urlParams.param.split('=')[1] || 'xx';
    var paramQuery = { urlParams: {} };
    paramQuery.urlParams[paramKey] = paramValue;
    API.params.q.$and.push(paramQuery);
  }
  if (urlParams.isResolved == 'YES') API.params.q.$and.push({ resolved: true });
  if (urlParams.isResolved == 'NO' || urlParams.isResolved == undefined) API.params.q.$and.push({ resolved: { $exists: false } });
  if (API.params.q.$and.length == 0) API.params.q = {};

  API.call({
    cacheMS: 0,
    method: 'v2-mdb',
    httpMethod: 'POST',
    body: JSON.stringify({
      op: 'find',
      db: 'cfg_log',
      col: 'api_error_log',
      q: API.params.q,
      s: API.params.s,
      p: {
        created: 1, name: 1, message: 1, stack: 1,
        urlParams: 1, body_JSON: 1, headers: 1, DEBUG: 1,
        resolved: 1, resolved_on: 1, resolved_by: 1, resolved_reason: 1
        ,body_text: 1
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
  // after the render, group the data
  setTimeout(() => {
    groupResults(data);
  }, 150);

  return result;
};

Render.filter = (data) => {
  var urlParams = API.getUrlParams();

  var resolveAllButton = `
    <button style="display:none;" class="secondary" id="resolveSelected" onclick="resolveSelected(this)">resolve <span>${data.records.length}<span></button>
  `;

  var result = `
    <div class="row">
      <div class="card small">
        <strong>gcf name</strong>
        <input param name="name" placeholder="v2-solve.." value="${urlParams.name || ''}">
      </div>

      <div class="card small">
        <strong>message</strong>
        <input param name="message" placeholder="create failed.." value="${urlParams.message || ''}">
      </div>

      <div class="card small">
        <strong>param (exact)</strong>
        <input param name="param" placeholder="orderId=123.." value="${urlParams.param || ''}">
      </div>

      <div class="card small" style="width: 120px;">
        <strong>is resolved</strong>
        <select name="isResolved" param>
          <option value="ANY" ${(urlParams.isResolved == 'ANY') ? 'selected' : ''}>- ANY -</option>
          <option value="YES" ${(urlParams.isResolved == 'YES') ? 'selected' : ''}>YES</option>
          <option value="NO" ${(urlParams.isResolved == 'NO' || urlParams.isResolved == undefined) ? 'selected' : ''}>NO</option>
        </select>
      </div>

      <button class="primary" paramSubmit>Go</button>
      <button class="" paramClear>Clear</button>
      ${resolveAllButton}
    </div>
  `;
  return result;
};

Render.results = (data) => {
  var columnDefs = {
    _checkbox: { hide: false },
    resolved: { hide: true },
    resolved_on: { hide: true },
    resolved_by: { hide: true },
    resolved_reason: { hide: true },
    created: { order: 0, width: '80px' },
    message: { width: '120px', height: '150px' },
    name: { order: 1, label: 'gcf name', width: '200px',
      display: (value, record) => {
        var result = value;
        if (record.resolved) {
          result += `
            <div class="resolved">
              <div>✅ resolved on ${new Date(record.resolved_on).toDateString()}</div>
              <div>by ${record.resolved_by}</div>
              <div>reason: <code>${record.resolved_reason}</code></div>
            </div>
          `;
        } else {
          result += `
            <br>
            <input id="reason_${record._id}" placeholder="reason" />
            <button id="button_${record._id}" class="tertiary small" onclick="resolveError('${record._id}')">Resolve</button>
          `;
        }
        return result;
      }
    },
    stack: {
      width: "300px",
      height: "150px",
      order: 2,
      style: "max-height:100px; overflow-y: auto;",
      display: (value, record) => {
        return `
          <code>${value}</code>
        `;
      }
    },
    headers: { hide: true },
    urlParams: {
      order: 3,
      label: 'caller',
      height: '150px',
      display: (value, record) => {
        if (value == undefined) return '--';
        var result = '';
        var urlParamCounter = 0;
        for (var key in value) {
          result += `<div class="code"><code title="url params">${(urlParamCounter) ? '&' : '?'}${key}=${value[key]}</code></div>`;
          urlParamCounter++;
        }
        if (record.body_JSON && Object.keys(record.body_JSON).length > 0) {
          result += `<div class="code"><code title="body json" style="color:purple">${JSON.stringify(record.body_JSON, null, 2)}</code></div>`;
        }
        if (record.body_text) {
          result += `<div class="code"><code title="body text" style="color:purple">${record.body_text}</code></div>`;
        }
        if (record.headers && Object.keys(record.headers).length > 0) {
          for (var key in record.headers) {
            result += `<div class="code"><code title="headers" style="color:blue">[${key}]: ${record.headers[key]}</code></div>`;
          }
        }
        return result;
      }
    },
    body_JSON: { hide: true },
    body_text: { hide: true},
    DEBUG: {
      height: '150px',
      display: (value) => {
        var result = '';
        if (value && Object.keys(value).length > 0) {
          result += `<div class="code"><code title="debug">${JSON.stringify(value, null, 2)}</code></div>`;
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

Render.selectedIdsUpdate = (selectedIds) => {
  if (Object.keys(selectedIds).length > 0) {
    $('#resolveSelected').show();
    $('#resolveSelected span').text(Object.keys(selectedIds).length);
  } else {
    $('#resolveSelected').hide();
  }
};

function groupResults(data) {
  var $rows = $('#mainTable tbody tr');
  var rowsByNameAndMessage = {};
  console.log('data',data);
  for (var i = 0; i < $rows.length; i++) {
    if (data.records[i]) {
      var nameAndMessage = `${data.records[i].name}_${data.records[i].message}`.substring(0, 100);
      if (!rowsByNameAndMessage[nameAndMessage]) { // first occurence
        rowsByNameAndMessage[nameAndMessage] = {
          firstOccurrence: i+((data.page-1) * data.per),
          count: 0,
          laterOccurrences: [],
          latestOccurrence: new Date()
        };
      } else {
        rowsByNameAndMessage[nameAndMessage].laterOccurrences.push(i);
        rowsByNameAndMessage[nameAndMessage].count++;
        $($rows[i]).attr('firstOccurrence', rowsByNameAndMessage[nameAndMessage].firstOccurrence);
        var occurrenceDate = new Date(data.records[i].created);
        if (occurrenceDate < rowsByNameAndMessage[nameAndMessage].latestOccurrence) {
          rowsByNameAndMessage[nameAndMessage].latestOccurrence = occurrenceDate;
        }
      }
    }
  }
  // now do interface for hiding / showing by nameAndMessage
  for (var key in rowsByNameAndMessage) {
    if (rowsByNameAndMessage[key].laterOccurrences.length > 1) {
      $(`tr[firstOccurrence=${rowsByNameAndMessage[key].firstOccurrence}]`).hide();
      // insert a summary row after first occurrence
      $(`tr[record=${rowsByNameAndMessage[key].firstOccurrence}]`).after(`
        <tr class="summary" summaryOf="${rowsByNameAndMessage[key].firstOccurrence}">
          <td colspan="99" style="color: red; border-top: none;">
            <a href="javascript:showGrouped(${rowsByNameAndMessage[key].firstOccurrence})">show</a>
            ${rowsByNameAndMessage[key].laterOccurrences.length} similar errors since ${rowsByNameAndMessage[key].latestOccurrence.toDateString()}
          </td>
        </tr>
      `);
    }
  }
}

function showGrouped(firstOccurrence) {
  $(`tr[summaryOf=${firstOccurrence}]`).hide();
  $(`tr[firstOccurrence=${firstOccurrence}]`).show();
}

function resolveSelected() {
  if (Object.keys(Render.selectedIds).length == 0) return;
  var reason = prompt('reason');
  if (!reason) return;
  var confirm = prompt(`resolving ${Object.keys(Render.selectedIds).length} with reason [${reason}] - type YES to proceed`) || '';

  if (confirm.toLowerCase() != 'yes') return;
  var $button = $('#resolveSelected');
  $button.hide();

  // $tr.css({ opacity: 0.4 });

  var _ids = [];
  for (var id in Render.selectedIds) {
    _ids.push(id);
    $(`input[_id=${id}]`).closest('tr').css({ opacity: 0.4 });
  }

  API.call({
    cacheMS: 0,
    method: 'v2-apiErrorLogResolve',
    httpMethod: 'POST',
    body: JSON.stringify({
      zKey: API.zKey,
      _ids: _ids,
      reason: reason
    }),
    onSuccess: (data) => {
      console.log('SUCCESS', data);
      // search for success trs
      data.records.forEach(row => {
        $(`input[_id=${row._id}]`).closest('tr').remove();
      });
    },
    onFailure: (data) => {
      $('tr[record]').css({ opacity: 1 });
      $button.show().removeClass('tertiary').addClass('secondary');
    }
  });
}

function resolveError(_id) {
  var $input = $('#reason_'+_id);
  var $button = $('#button_'+_id);
  var $tr = $button.closest('tr');
  var reason = $input.val();
  if (!reason) {
    $input.css({borderColor:'red'});
    return;
  }
  $button.hide();
  $tr.css({ opacity: 0.4 });

  API.call({
    cacheMS: 0,
    method: 'v2-apiErrorLogResolve',
    httpMethod: 'POST',
    body: JSON.stringify({
      zKey: API.zKey,
      _ids: [_id],
      reason: reason
    }),
    onSuccess: (data) => {
      $tr.remove();
    },
    onFailure: (data) => {
      $tr.css({ opacity: 1 });
      $button.show().removeClass('tertiary').addClass('secondary');
    }
  });
}

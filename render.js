const Render = {
  loading: function(id) {
    $(`#${id}`).html(`<div class="row"><p><div class="spinner"></div></p></div>`);
  },
  try: (id, data) => {
    try {
      setTimeout(function() {
        Render.toLocalTime();
        Render.followAnchor();
      }, 150);
      return Render[id](data);
    } catch (e) {
      API.errorLog({
        name: `Render.try('${id}')`,
        message: e.message,
        stack: e.stack,
        url: (window && window.location) ? window.location.href : 'unknown',
        type: 'client_render_error'
      });
      console.warn(e);
      return '<p>🤷‍♀️ something went wrong...</p>'
    }
  },
  toLocalTime: () => {
    $('.datetime').each(function(i, span) {
      var $span = $(span).removeClass('datetime').addClass('localtime');
      var date = new Date($span.text());
      $span.attr('iso8601', $span.text());
      $span.text(Render.formatDate(date));
    });
  },
  formatDate: (datetime) => {
    if (typeof datetime == 'string') datetime = new Date(datetime);
    var month = Render.toMonth(datetime.getMonth());
    var hour = (datetime.getHours() > 12) ? datetime.getHours() - 12 : datetime.getHours();
    var ampm = (datetime.getHours() > 11) ? `pm` : `am`;
    if (hour == 0) {
      hour = 12;
    }
    var minutes = (datetime.getMinutes() < 10) ? `0${datetime.getMinutes()}` : `${datetime.getMinutes()}`;
    var time = `${hour}:${minutes}${ampm}`;
    return `${month} ${datetime.getDate()}, ${time}`;
  },
  stripHTML: (html) => {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  },
  toMonth: (int) => { // starts from 0
    var month = '';
    switch (int) {
      case 0: month = 'Jan'; break;
      case 1: month = 'Feb'; break;
      case 2: month = 'Mar'; break;
      case 3: month = 'Apr'; break;
      case 4: month = 'May'; break;
      case 5: month = 'Jun'; break;
      case 6: month = 'Jul'; break;
      case 7: month = 'Aug'; break;
      case 8: month = 'Sep'; break;
      case 9: month = 'Oct'; break;
      case 10: month = 'Nov'; break;
      case 11: month = 'Dec'; break;
    }
    return month;
  },
  followAnchor: () => {
    try {
      if (Render.followedAnchor) return;
      var anchor = window.location.href.split('#')[1];
      if (!anchor) return;
      Render.followedAnchor = true;
      var $anchor = $("#"+anchor);
      if ($anchor.length == 0) return;
      $([document.documentElement, document.body]).animate({
        scrollTop: $anchor.offset().top - 62
      }, 250);
    } catch (e) {
      console.warn(e);
    }
  },
  // table functions
  thead: (mdbData, definition = {}) => { // default to hiding those 2 internal cols
    var columnDefs = buildTableDefinition(mdbData, definition);
    if (!mdbData.records) throw new Error('invalid data');
    // skim the data for columns
    var headers = '<th colspan="99">No Data</th>';
    if (mdbData.recordcount > 0) {
      headers = '';
      columnDefs.order.forEach((column) => {
        var columnDef = columnDefs.columns[column];
        if (!columnDef.hide) {
          var style = '';
          if (columnDef.width) style = ` style="max-width:${columnDef.width}" `;
          headers += `<th${style}>${columnDef.label || column}</th>`;
        }
      });
    }

    var scaffold = `<thead>${headers}</thead>`;
    return scaffold;
  },
  tbody: (mdbData, definition = {}) => { // default to hiding those 2 internal cols
    var columnDef = buildTableDefinition(mdbData, definition);
    if (!mdbData.records) throw new Error('invalid data');
    // skim the data for columns
    var rows = '';

    mdbData.records.forEach((record) => {
      var rowTD = '';
      columnDef.order.forEach((column) => {
        rowTD += Render.td(record[column], columnDef.columns[column], record);
      });

      rows += `<tr>${rowTD}</tr>`;
    });

    var scaffold = `
      <tbody>
        ${rows}
      </tbody>
    `;
    return scaffold;
  },
  td: (value, columnDef, record) => {
    if (columnDef.hide) return '';
    var formattedValue = ''; // raw formatted
    var displayValue = ''; // displayValues have html mods

    if (typeof columnDef.format == 'function'){
      formattedValue = columnDef.format(value, record);
      displayValue = formattedValue;
      if (columnDef.display) displayValue = columnDef.display(value, record);
    } else if (typeof columnDef.display == 'function') { // reverse of format - a single function should work
      displayValue = columnDef.display(value, record);
      formattedValue = displayValue;
    } else if (value == undefined || value == null) {
      formattedValue = '--';
      displayValue = '--';
    } else if (columnDef.format == 'datetime'){
      formattedValue = Render.formatDate(new Date(value)) + ` ${new Date(value).getFullYear()}`;
      displayValue = formattedValue;
    } else if (columnDef.format == 'link') {
      formattedValue = value;
      displayValue = `<a href="${value}">${value.split('?')[0]}</a>`;
    } else if (columnDef.format == 'money') {
      formattedValue = `$${value.toFixed(2)}`;
      displayValue = formattedValue;
    } else if (typeof value == 'object' || typeof value == 'array') {
      formattedValue == 'xx';
      displayValue = `${typeof value} - needs function`;
    } else {
      formattedValue = value;
      displayValue = value;
    }
    var style = '';
    if (columnDef.width) style = ` style="max-width:${columnDef.width}" `;
    return `<td ${style} title="${record}" data-label="${columnDef.displayLabel}">${displayValue}</td>`;
  },
  paginate: (data) => {
    // how many pages?
    var pageMax = 1 + (data.totalcount - (data.totalcount % data.per)) / data.per;

    var pages = ``;
    for (var i = 1; i <= pageMax; i++) {
      pages += `<option value="${i}" ${(i == data.page) ? 'selected': ''}>${i}</option>`;
    }

    var result = `
      <div class="row">

        <button class="${(data.page < 3) ? 'hide' : ''}" onclick="API.setPage(1)">|◀</button>
        <button class="${(data.page < 2) ? 'hide' : ''}" onclick="API.setPage(${data.page-1})">◀</button>

        <div class="card small">
          <strong>page</strong>
          <strong class="right">results ${(data.totalcount == 0) ? 0 : (data.per * (data.page - 1) + 1)} - ${data.per * (data.page - 1) + data.recordcount} of ${data.totalcount}</strong>
          <select param name="page" onchange="API.setUrlParam('page', $(this).val());setTimeout(() => { API.load(API.getUrlParams()); }, 150)">
            ${pages}
          </select>
        </div>

        <button class="${(pageMax <= data.page) ? 'hide': ''}" onclick="API.setPage(${data.page+1})">▶</button>
        <button class="${(pageMax-1 <= data.page) ? 'hide': ''}" onclick="API.setPage(${pageMax})">▶|</button>

        <div class="card small">
          <strong>per page</strong>
          <select param name="per" onchange="API.setUrlParam('per', $(this).val());setTimeout(() => { API.load(API.getUrlParams()); }, 150)">
            <option value="10" ${(data.per == 10) ? 'selected': ''}>10</option>
            <option value="25" ${(data.per == 25) ? 'selected': ''}>25</option>
            <option value="50" ${(data.per == 50) ? 'selected': ''}>50</option>
            <option value="100" ${(data.per == 100) ? 'selected': ''}>100</option>
          </select>
        </div>
      </div>

      ${(data.recordcount == 0 && data.totalcount > 0) ? `<span class="toast" style="background-color:red;">${data.totalcount} results but not on this page</span>` : ''}
    `;
    return result;
  }
};

function buildTableDefinition(mdbData, definition) {
  var defaultHide = { _id: { hide: true }, _i: { hide: true } };

  var columnsByDataKey = {};
  // since mdb documents may have different keys, this is how to normalize the column order.
  // basically see what the most common ordering is for columns - according to the data presented
  mdbData.records.forEach((record) => {
    Object.keys(record).forEach((key, i) => {
      if (!columnsByDataKey[key]) columnsByDataKey[key] = { positions: [], key: key };
      columnsByDataKey[key].positions.push(i);
    });
  });

  // now, for each column, see what position that key appears most often
  // each record may present columns in different order depending on what's available
  var columns = {};
  Object.keys(columnsByDataKey).forEach((key) => {
    var column = columnsByDataKey[key];
    var counts = {};
    column.positions.forEach((i) => {
      if (counts[i] === undefined) counts[i] = 0;
      counts[i]++;
    });
    counts[9] = 1;
    // put into an array and sort counts so the highest count is index 0
    var countsArr = [];
    Object.keys(counts).forEach((i) => {
      countsArr.push({ order: i, count:counts[i] });
    });
    var sortedCountsArr = countsArr.sort((a,b) => {
      return (a.count < b.count) ? 1 : -1;
    });
    // take the results and put into colums
    columns[column.key] = { order: +sortedCountsArr[0].order, key: column.key };
  });

  // for columns, try to solve column type going through data
  mdbData.records.forEach((record) => {
    Object.keys(columns).forEach((key) => {
      var value = record[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'string' || typeof value === 'number') {
          value = `${value}`; // typecast to string
          columns[key].format = 'string';
          if ((value.length === 20 || value.length === 24) && value.charAt(value.length-1) === 'Z' && value.charAt(13) === ":") {
            columns[key].format = 'datetime';
          }
          // test for html first
          if (value.charAt(0) == '<' && value.charAt(value.length-1) == '>') {
            columns[key].format = 'html';
          } else if (value.split('@').length === 2 && value.split('.').length >= 2) {  // probably email
            columns[key].format = 'email';
          }
        }
      } else {
        columns[key].format = typeof value;
      }
    });
  });

  // for columns, merge with incoming definition overrides
  Object.keys(columns).forEach((key) => {
    columns[key] = Object.assign(columns[key], defaultHide[key] || {}, definition[key] || {});

  });

  // check for definitions that aren't columns (computed)
  Object.keys(definition).forEach((key) => {
    if (!columns[key]) {
      columns[key] = definition[key];
      definition[key].key = key;
      if (definition[key].order == undefined) definition[key].order = 99;
    }
  });

  // also compute here what label to display - name or label
  Object.keys(columns).forEach((key) => {
    columns[key].displayLabel = columns[key].label || columns[key].key;
  });

  // finally sort the columns by position
  var columnsArr = [];
  Object.keys(columns).forEach((key) => {
    columnsArr.push(columns[key]);
  });
  var sortedColumns = columnsArr.sort((a, b) => {
    return (a.order < b.order) ? -1 : 1;
  });
  var simpleSortedColumns = sortedColumns.map((column) => { return column.key });

  return {
    columns: columns,
    order: simpleSortedColumns
  };
}

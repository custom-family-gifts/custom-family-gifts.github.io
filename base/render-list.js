/* assumes render.js & api.js above it */
Render.thead = (mdbData, definition = {}, data) => { // default to hiding those 2 internal cols
  var columnDefs = buildTableDefinition(mdbData, definition);

  var currentSort = mdbData.sort;

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

        var currentSort = (mdbData.sort[column] != undefined) ? true : false;
        var changeToOrder = -1;
        if (currentSort && mdbData.sort[column] == -1) changeToOrder = 1;
        var sortIcon = '';
        if (currentSort) {
          sortIcon = (mdbData.sort[column] == 1) ? ' 🔼' : ' 🔽';
        }
        if (column == '_checkbox') {
          if (columnDef.single) {
            headers += `<th class="_checkbox"></th>`;
          } else {
            headers += `
              <th class="_checkbox">
                <input type="checkbox" name="selectAll" onclick="Render.toggleAllSelected()" />
              </th>
            `;
          }
        } else {
          headers += `
            <th${style}>
              <a href="javascript:void(0)" onclick="API.setSort('${column}', ${changeToOrder});">
                ${columnDef.label || column}${sortIcon}
              </a>
            </th>
          `;
        }
      }
    });
  }

  var scaffold = `<thead>${headers}</thead>`;
  return scaffold;
};

Render.tbody = (mdbData, definition = {}) => { // default to hiding those 2 internal cols
  var columnDef = buildTableDefinition(mdbData, definition);
  if (!mdbData.records) throw new Error('invalid data');
  // skim the data for columns
  var rows = '';

  // clear all checkboxes and selectedIds whenever new load
  Render.selectedIdsReset()

  mdbData.records.forEach((record) => {
    var rowTD = '';
    columnDef.order.forEach((column) => {
      rowTD += Render.td(record[column], columnDef.columns[column], record);
    });

    rows += `<tr record="${record._i}">${rowTD}</tr>`;
  });

  var scaffold = `
    <tbody>
      ${rows}
    </tbody>
  `;
  return scaffold;
};

Render.td = (value, columnDef, record) => {
  if (columnDef.hide) return '';
  var formattedValue = ''; // raw formatted
  var displayValue = ''; // displayValues have html mods

  if (columnDef.key == '_checkbox') {
    var id = record._id;
    if (columnDef.value && typeof columnDef.value == 'function') id = columnDef.value(record);
    columnDef.class = '_checkbox';
    displayValue = `<input _id="${id}" type="checkbox" name="selectId_${id}" onclick="Render.toggleSelected('${id}', ${columnDef.single})" />`;
  } else if (typeof columnDef.format == 'function'){
    formattedValue = columnDef.format(value, record);
    displayValue = formattedValue;
    try {
      if (columnDef.display) displayValue = columnDef.display(value, record);
    } catch (e) {
      console.warn(e, value, record);
      displayValue = `[⚠ display error]${e}`;
    }
  } else if (typeof columnDef.display == 'function') { // reverse of format - a single function should work
    try {
      displayValue = columnDef.display(value, record);
    } catch (e) {
      console.warn(e, value, record);
      displayValue = `[⚠ display error]${e}`;
    }
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
  if (columnDef.width) style = `max-width:${columnDef.width};`;
  if (columnDef.height) style += `max-height:${columnDef.height};overflow-y:auto;";`
  if (style != '') style = ' style="' + style + '" ';
  return `<td class="${columnDef.class}" ${style} title="${value}" data-label="${columnDef.displayLabel}">${displayValue}</td>`;
};

Render.paginate = (data) => {
  // how many pages?
  var pageMax = 1 + (data.totalcount - (data.totalcount % data.per)) / data.per;

  var pages = ``;
  for (var i = 1; i <= pageMax; i++) {
    pages += `<option value="${i}" ${(i == data.page) ? 'selected': ''}>${i}</option>`;
  }

  var result = `
    <div class="row paginate">
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

      <div class="card small" style="width: 120px;">
        <strong>per page</strong>
        <select param name="per" onchange="API.setUrlParam('per', $(this).val());setTimeout(() => { API.load(API.getUrlParams()); }, 150)">
          <option value="10" ${(data.per == 10) ? 'selected': ''}>10</option>
          <option value="25" ${(data.per == 25) ? 'selected': ''}>25</option>
          <option value="50" ${(data.per == 50) ? 'selected': ''}>50</option>
          <option value="100" ${(data.per == 100) ? 'selected': ''}>100</option>
          <option value="250" ${(data.per == 250) ? 'selected': ''}>250</option>
        </select>
      </div>
    </div>

    ${(data.recordcount == 0 && data.totalcount > 0) ? `<span class="toast" style="background-color:red;">${data.totalcount} results but not on this page</span>` : ''}
  `;
  return result;
};

function buildTableDefinition(mdbData, definition) {
  var defaultHide = { _id: { hide: true }, _i: { hide: true }, _checkbox: { hide: true } };

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
    if (key == '_checkbox') columns[key].order = -1; // checkbox always sorts to -1
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

// list page checkboxes
Render.selectedIds = {};
Render.toggleSelected = (_id, single = false) => {
  var $checkbox = $(`[name=selectId_${_id}]`);
  if ($checkbox.length == 0) throw new Error(`Could not find checkbox for[name=selectId_${_id}]`);
  if (single) {
    // deselect all currently selected
    for (var key in Render.selectedIds) {
      $(`[name=selectId_${key}]`).prop('checked', false);
    }
    Render.selectedIds = {};
  }
  if ($checkbox.prop('checked')) {
    Render.selectedIds[_id] = true;
  } else {
    delete Render.selectedIds[_id];
    _id = null;
  }
  Render.selectedIdsUpdate(Render.selectedIds, _id);
};

Render.toggleAllSelected = () => {
  var $checkboxes = $('input[type=checkbox][name^=selectId_]');

  if ($($checkboxes[0]).prop('checked')) { // see if first checkbox checked
    for (var i = 0; i < $checkboxes.length; i++) {
      $($checkboxes[i]).prop('checked', false);
      delete Render.selectedIds[$($checkboxes[i]).attr('_id')];
    }
    $('input[name=selectAll]').prop('checked', false);
  } else {
    for (var i = 0; i < $checkboxes.length; i++) {
      $($checkboxes[i]).prop('checked', true);
      Render.selectedIds[$($checkboxes[i]).attr('_id')] = true;
    }
    $('input[name=selectAll]').prop('checked', true);
  }
  Render.selectedIdsUpdate(Render.selectedIds);
};
Render.selectedIdsUpdate = (selectedIds) => {
  console.warn('Render.selectedIdsUpdate() needs to be overridden.');
}
Render.selectedIdsReset = () => {
  Render.selectedIds = {};
  $('input[type=checkbox][_id]').prop('checked', false);
  Render.selectedIdsUpdate(Render.selectedIds);
}

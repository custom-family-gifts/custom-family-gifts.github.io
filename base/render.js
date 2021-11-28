// Render: general functions useful for interface
const Render = {
  loading: function(id) {
    $(`#${id}`).html(`<div class="row"><p><div class="spinner"></div></p></div>`);
  },
  try: (id, data, inject = false) => {
    try {
      setTimeout(function() {
        Render.toLocalTime();
        Render.followAnchor();
      }, 150);
      if (inject) {
        $(function() {
          $('#'+id).html(Render[id](data));
        })
      } else {
        return Render[id](data);
      }
    } catch (e) {
      API.errorLog({
        name: `Render.try('${id}')`,
        message: e.message,
        stack: e.stack,
        url: (window && window.location) ? window.location.href : 'unknown',
        type: 'client_render_error'
      });
      console.warn(e);
      if (inject) {
        $(function() {
          $('#'+id).html('<p>🤷‍♀️ something went wrong...</p>');
        });
      } else {
        return '<p>🤷‍♀️ something went wrong...</p>';
      }
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
    if (datetime == null || datetime == undefined) return `--`;
    var month = Render.toMonth(datetime.getMonth());
    var hour = (datetime.getHours() > 12) ? datetime.getHours() - 12 : datetime.getHours();
    var ampm = (datetime.getHours() > 11) ? `pm` : `am`;
    if (hour == 0) {
      hour = 12;
    }
    var minutes = (datetime.getMinutes() < 10) ? `0${datetime.getMinutes()}` : `${datetime.getMinutes()}`;
    var time = `${hour}:${minutes}${ampm}`;
    // previous year format
    if (datetime.getFullYear() != new Date().getFullYear()) {
      return `${datetime.getFullYear()}-${datetime.getMonth()+1}-${datetime.getDate()} ${hour}${ampm}`;
    }
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
  navigation: (navDef = []) => {
    var buttons = '';
    navDef.forEach(nav => {
      var current = '';
      if (nav.target.includes('/')) {
        var pathSplit = location.pathname.split('/');
        if (pathSplit[pathSplit.length-1].includes(nav.target.split('/')[1])) {
          current = '<div class="currentBar"></div>';
        }
        var target = nav.target;
        if (pathSplit.length > 2) { // local development, the paths have full filepath, vs onlien it'll be simply /error
          pathSplit.pop();
          target = pathSplit.join('/') + nav.target;
        }
      }
      buttons += `<a href="${target}" class="button">${current}${nav.label}</a>`;
    });
    var result = `
      <div id="navBG"></div>
      <header id="content_header">
        <img id="cfgLogo" src="https://cdn.shopify.com/s/files/1/0060/6725/7434/files/heart.png?v=1607199816">
        ${buttons}
      </header>
    `;
    return result;
  },
  link: (url, name) => {
    return `
      <style>
        .link > span {
          cursor: pointer;
          opacity: 0.5;
        }
        .link > span: hover {
          opacity: 1;
        }
      </style>
      <span class="link">
        <span onclick="Render.linkToClipboard('${url}')">📋</span>
        <a target="_blank" href="${url}">${name} ▶</a>
      </span>
    `;
  },
  linkToClipboard: (value) => {
    navigator.clipboard.writeText(value);
    Toast.show('copied to clipboard', 1);
  },
  button: (options) => {
    if (!options.class) options.class = '';
    options.class += ` renderButton`;

    var innards = ``;
    for (var attr in options) {
      if (options[attr] == null) { // properties such as disabled
        innards += ` ${attr} `;
      } else {
        innards += ` ${attr}="${options[attr]}" `;
      }
    }
    var html = `
      <button ${innards}>
        ${options.text}
        <span class="spinnerSpacer"><b class="spinner primary"></b></span>
      </button>
    `;
    return html;
  }
};

var Toast = {
  initted: false,
  init: () => {
    if (!Toast.initted) {
      $('body').append('<span id="toast" class="toast" style="display:none;">default message</span>');
      Render.toastInitted = true;
    }
  },
  show: (message, type = 0, durationMs = 2000) => { // -1 = negative, 0 = neutral, 1 = positive (green);
    if (!Toast.initted) Toast.init();
    if (type == 0) message = '✅ ' + message;
    if (type == -1) message = '❌ ' + message;
    // make a log of this toast in console
    if (type == -1) console.log('TOAST ISSUE', message, type);
    $('#toast').text(message).attr('class', `toast type_${type}`).show();
    setTimeout(function() {
      $('#toast').fadeOut();
    }, durationMs);
  },
};

// Popup modal, + generic edit functionality
var Modal = {
  initted: false,
  currentId: 1000,
  getUniqueId: () => {
    Modal.currentId++;
    return Modal.currentId;
  },
  fns: {}, // sorted by unique id by reference. allows rendered html to access complex data & paramters
  init: () => {
    if (Modal.initted) return;
    // add css
    $('body').append(`
      <style>
        #modalOverlay {
          position: fixed;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          z-index: 999998;
          background-color: rgba(0,0,0,0.5);
          overflow: hidden;
          text-align: center;
          display: none;
        }
        #modalOverlay.transparent {
          background-color: transparent;
          pointer-events: none;
        }
        .modalContents {
          background-color: #ddd;
          padding:5px;
          min-width: 150px;
          max-width: 80vw;
          max-height: 80vh;
        }
        .modalContents > *  {
          vertical-align: top;
        }
        #modal {
          z-index: 999999;
          background-color: white;
          display: inline-block;

          position: absolute;
          top: 35%;
          left: 33%;

          transform: translate(-50%, -50%);
          pointer-events: all;
          box-shadow:4px 4px 18px rgb(0 0 0 / 35%);
        }
        .modalBar {
          background-color: white;
          height: 25px;
          padding: 8px;
          text-align: left;
          cursor: default;
        }
        .modalClose {
          padding: 15px;
          width: 12px;
          height: 12px;
          text-align: center;
          line-height: 7px;
          font-size: 20px;
          cursor: pointer;
          opacity: 0.7;
          position: absolute;
          right: 0;
          top: 0;
          z-index: 1000000
        }
        .modalClose:hover {
          background-color: #ddd;
          opacity:1;
        }
        .modalDraggable {
          color: white;
          position: absolute;
          top: -20px;
          left: 5px;
          font-size: 12px;
          opacity: 0.65;
        }
        @media screen and (max-width: 1220px) {
          #modal {
            top: 35%;
            left: 50%;
          }
        }
      </style>
    `);
    // add scaffold
    $('body').append(`
      <div id="modalOverlay" onclick="if(Modal.overlayExit)Modal.hide();">
        <div id="modal">
          <div class="modalDraggable">drag me to move</div>
          <div class="modalBar">
          </div>
          <div class="modalClose" onclick="Modal.hide()">×</div>
          <div class="modalContents"></div>
        </div>
      </div>
    `);
    Modal.$modal = $('#modal');
    Modal.initDraggable();
    Modal.initted = true;
  },
  initDraggable: () => {
    $('.modalBar').on('mousedown', (evt) => {
      // console.log('mousedown', evt);
      Modal.modalDrag = true;
      // set the modal initial values
      Modal.modalY = Modal.$modal.offset().top;
      Modal.modalX = Modal.$modal.offset().left;
      var modalHeight = Modal.$modal.height();
      var modalWidth = Modal.$modal.width();
      var windowHeight = $(window).outerHeight();
      var windowWidth = $(window).outerWidth();
      Modal.modalYMax = windowHeight - modalHeight;
      Modal.modalXMax = windowWidth - modalWidth;
      // move the modal to absolute locations
      Modal.$modal.css({
        position: 'absolute',
        left: Modal.modalX,
        top: Modal.modalY,
        transform: 'none'
      });

      // se the mouse initial values
      Modal.initialMouseX = evt.originalEvent.clientX;
      Modal.initialMouseY = evt.originalEvent.clientY;
    });
    $(document).on('mouseup.modal', (evt) => {
      // console.log('mouseup', evt);
      if (Modal.modalDrag) Modal.modalDrag = false;
    });
    $(document).on('mousemove.modal', (evt) => {
      // console.log('mousemove', evt);
      if (!Modal.modalDrag) return;
      var left = Modal.modalX + (evt.originalEvent.clientX - Modal.initialMouseX);
      var top = Modal.modalY + (evt.originalEvent.clientY - Modal.initialMouseY);
      if (left < 0) left = 0;
      if (top < 0) top = 0;
      if (top > Modal.modalYMax) top = Modal.modalYMax;
      if (left > Modal.modalXMax) left = Modal.modalXMax;
      Modal.$modal.css({
        left: left,
        top: top
      });
    });
  },
  overlayExit: false,
  render: (titleHtml, html, overlayExit = false) => {
    Modal.overlayExit = overlayExit;
    if (!overlayExit) {
      $('#modalOverlay').addClass('transparent');
      // add controls and border
    } else {
      $('#modalOverlay').removeClass('transparent');
    }
    $('.modalContents').html(html);
    $('.modalBar').html(titleHtml);
    Modal.show();
  },
  shown: false,
  show: () => {
    Modal.shown = true;
    $('#modalOverlay').show();
  },
  hide: () => {
    $('#modalOverlay').hide();
    Modal.shown = false;
    Modal.$modal.attr('style', '');
  },
  renderEdit: (_ATID, title, fieldsArr, currentData = {}, table = 'orders', onsubmit = Modal.updateATFields) => { // unsubmit is uninvoked
    if (!fieldsArr) throw new Error('needs Fields');
    if (!_ATID) throw new Error('needs _ATID');
    if (!title) title = 'needs title';

    var modalFnId = Modal.getUniqueId();
    if (!onsubmit) throw new Error('Modal.renderEdit requires [onsubmit] parameter of uninvoked fn');
    Modal.fns[modalFnId] = () => {
      if (Modal.validateEditForm()) {
        console.log(onsubmit);
        onsubmit();
      }
    };

    var html = `
      <style>
        #modal label {
          font-size: 14px;
        }
        .inputLabel {
          min-width: 150px;
          display: inline-block;
          text-align: right;
          vertical-align: top;
        }
        #modal input, #modal select, #modal textarea {
          width: 230px;
          margin: 4px;
          font-size: 14px;
          padding: 3px 6px;
        }
        #modal textarea {
          height: 150px;
          resize: vertical;
        }
        #modal input.validationFailed, #modal select.validationFailed, #modal textarea.validationFailed {
          border: 1px dashed red;
        }
        #modal .updated {
          color: blue;
        }
        #modal .input-group {
          position: relative;
        }
        #modal .hasIns {
          margin-top: -4px;
        }
        .ins {
          line-height: 13px;
          margin-top: -3px;
          margin-bottom: 3px;
          font-size: 12px;
          opacity: 0.5;
          text-align: right;
          width: 142px;
        }
      </style>
      <form _ATID="${_ATID}" table="${table}" style="margin:0;padding:0">
    `;
    fieldsArr.forEach(field => {
      var currentFieldData = currentData[field.name];
      if (currentFieldData == undefined) currentFieldData = '';
      var input = `
        <input
          ${(field.required)?'required':''}
          type="text"
          value="${currentFieldData}"
          name="${field.name}"
          placeholder="${(field.required) ? 'required' : ''}"
          onchange="Modal.validateEditField(this)"
          onkeyup="Modal.validateEditField(this)"
          ${(field.maxLength) ? `maxlength="${field.maxLength}"` : ''}
          onblur="Modal.validateEditField(this)"
          originalValue_btoa="${btoa(unescape(encodeURIComponent(currentFieldData)))}"
        />
      `;
      if (field.textarea) {
        input = `
          <textarea
            ${(field.required)?'required':''}
            name="${field.name}"
            onchange="Modal.validateEditField(this)"
            onblur="Modal.validateEditField(this)"
            onkeyup="Modal.validateEditField(this)"
            ${(field.maxLength) ? `maxlength="${field.maxLength}"` : ''}
            originalValue_btoa="${btoa(unescape(encodeURIComponent(currentFieldData)))}"
          >${currentFieldData}</textarea>
        `;
      }
      if (field.boolean) {
        input = `
          <select
            boolean="1"
            ${(field.required)?'required':''}
            name="${field.name}"
            onchange="Modal.validateEditField(this)"
            onblur="Modal.validateEditField(this)"
            originalValue_btoa="${btoa(unescape(encodeURIComponent(currentFieldData)))}"
          >
            <option ${(currentFieldData) ? 'selected':''} value="true">✅ YES</option>
            <option ${(!currentFieldData) ? 'selected':''} value="false">❌ NO</option>
          </select>
        `;
      }
      if (field.options) {
        input = `
          <select
            ${(field.required)?'required':''}
            name="${field.name}"
            onchange="Modal.validateEditField(this)"
            onblur="Modal.validateEditField(this)"
            originalValue_btoa="${btoa(unescape(encodeURIComponent(currentFieldData)))}"
          >
        `;
        // if current value not in options, add it
        if (!field.options.includes(currentFieldData) && currentFieldData != undefined) field.options.push(currentFieldData);
        field.options.forEach(option => {
          var selected = (currentData[field.name] != undefined)
          input += `<option value="${option}" ${(currentFieldData == option)?'selected':''}>${option || '--'}</option>`;
        });
        input += `</select>`;
      }
      var asterisk = (field.required) ? '<b style="color:orangered">*</b> ' : '';
      html += `
        <div class="row">
          <div class="input-group">
            <div class="inputLabel">
              <label class="${(field.instructions) ? 'hasIns':''}" for="${field.name}">${asterisk}${field.label || field.name}</label>
              ${(field.instructions) ? `<div class="ins">${field.instructions}</div>` : ''}
            </div>
            ${input}
          </div>
        </div>
      `;
    });
    html += '</form>';

    html += Render.button({
      class: '',
      text: 'update',
      disabled: null,
      style: "margin-top:12px;float:right",
      onclick: `Modal.fns[${modalFnId}]()`
    });

    // attempt to select the first input
    setTimeout(() => {
      var $inputs = $('#modal input, #modal textarea');
      if ($inputs.length && $($inputs[0]).val() == '') $inputs[0].select();
    },200);

    Modal.render(title, html);
  },
  validateEditField: (element) => {
    var $element = $(element);
    var value = $element.val();
    var originalValue = decodeURIComponent(escape(atob($element.attr('originalValue_btoa'))));
    if (element.required) {
      if (value == '') {
        var ok = true;
        $element.addClass('validationFailed');
      } else {
        $element.removeClass('validationFailed');
      }
    }
    if (value != originalValue) {
      $element.addClass('updated');
    } else {
      $element.removeClass('updated');
    }
    Modal.validateEditForm();
  },
  validateEditForm: () => {
    var $required = $('#modal form .validationFailed');
    var $updated = $('#modal form .updated');
    if ($required.length == 0 && $updated.length) {
      $('#modal button').prop('disabled', false).addClass('primary');
      return true;
    } else {
      $('#modal button').prop('disabled', true).removeClass('primary');
      return false;
    }
  },
  updateATFields: () => {
    // collect the data
    var $form = $('#modal form');
    var _ATID = $form.attr('_ATID');
    var table = $form.attr('table');
    if (!table || !_ATID) throw new Error(`invalid edit form table:[${table} _ATID:[${_ATID}]`);
    // get all fields
    var $inputs = $form.find('input, select, textarea');
    var updateFields = {};
    var ok = true;
    $inputs.each(function(i,item) {
      var $item = $(item);
      var value = $item.val();
      if (item.required && value == '') {
        ok = false;
      }
      if ($item.attr('boolean') == '1') {
        if (value == 'true') value = true;
        if (value == 'false') value = false;
      }
      updateFields[item.name] = value;
      if (item.tagName.toLowerCase() == 'select' && value == '') updateFields[item.name] = null;
    });
    if (!ok) return;
    Modal.editLoading();
    API.call({
      cacheMS: 0,
      method: 'v2-updateAirtableFields',
      body: JSON.stringify({
        _ATID: _ATID,
        table: table,
        fields: updateFields
      }),
      onSuccess: (data) => {
        Modal.editSuccess();
      },
      onFailure: (data) => {
        Modal.editFailure();
      }
    });
  },
  editLoading: () => {
    var $form = $('#modal form');
    var $inputs = $form.find('input, select, textarea');
    $inputs.prop('disabled', true);
    $('#modal button').addClass('loading').prop('disabled', true);
    $('#drawer').addClass('modalLoading');
  },
  editSuccess: () => {
    $('#drawer').removeClass('modalLoading');
    Modal.hide();
    Drawer.reload();
  },
  editFailure: (message = 'something went wrong.', duration = 5000) => {
    var $form = $('#modal form');
    var $inputs = $form.find('input, select, textarea');
    $('#drawer').removeClass('modalLoading');
    Toast.show(message, -1, duration);
    $inputs.prop('disabled', false);
  }
};

var Navigation = {

};

/* The login interface - top right */
var Admin = {
  // table functions
  name: null, // comes from successful api call
  key: localStorage.getItem('admin_key') || null,
  init: () => { // call init if you want the page to be authenticated
    if (!Admin.key) {
      var key_attempt = prompt('enter your access key');
      localStorage.setItem('admin_key', key_attempt);
      Admin.key = key_attempt;
    }
    API.zKey = Admin.key; // if it's invalid API will fail. go ahead and set anything the user wants
    API.z = '';
    $(() => {
      Admin.render();
    });
  },
  render: () => {
    $('body').append(`
      <div id="adminKey">welcome <a href="javascript:API.newAdminKey(true)">${Admin.getName()}</a></div>
    `);
  },
  updateKey: () => {
    var key_attempt = prompt('enter your access key');
    localStorage.setItem('admin_key', key_attempt);
    location.reload();
  },
  setName: (name) => {
    if (Admin.name) return;
    Admin.name = name;
    $('#adminKey a').text(Admin.name);
  },
  getName: () => {
    // you may be tempted to hard code this. But it exposes authentication info in viewable code
    return Admin.key;
  },
};


$(() => {
  Modal.init();
});

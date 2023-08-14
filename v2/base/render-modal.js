// Popup modal, + generic edit functionality
var Modal = {
  initted: false,
  currentId: 1000,
  getUniqueId: () => { // the uniqueId system is used to allow onclick events (inline html) to invoke with complex parameters
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
  isAbsolute: false,
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

      if (!Modal.isAbsolute) {
        // move the modal to absolute locations
        Modal.$modal.css({
          position: 'absolute',
          left: Modal.modalX,
          top: Modal.modalY - $(window).scrollTop(),
          transform: 'none'
        });
        Modal.isAbsolute;
      }

      // se the mouse initial values
      Modal.initialMouseX = evt.originalEvent.clientX;
      Modal.initialMouseY = evt.originalEvent.clientY + $(window).scrollTop();
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
    // check modal position
    if (Modal.$modal.offset().top - $(window).scrollTop() < 0) {
      Modal.$modal.css({
        position: 'absolute',
        left: Modal.$modal.offset().left,
        top: 0,
        transform: 'none'
      });
    }
    console.log(Modal.$modal.offset());
  },
  hide: () => {
    $('#modalOverlay').hide();
    Modal.shown = false;
    Modal.$modal.attr('style', '');
    Modal.isAbsolute = false;
  },
  renderEdit: (options = {}) => { // unsubmit is uninvoked
    if (!options.id) options.id = new Date().getTime();
    if (!options.fields) throw new Error('needs Fields');
    if (!options.title) title = 'needs title';
    if (!options.submit) throw new Error('Modal.renderEdit requires options.submit parameter async fn');
    if (!options.onSuccess) throw new Error('Modal.renderEdit requires onSuccess async function');

    var modalFnId = Modal.getUniqueId();
    Modal.fns[modalFnId] = async () => {
      if (Modal.validateEditForm()) {
        var values = Modal.getEditValues(options.id);
        var response = await options.submit(values);
        await options.onSuccess(response);
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
      <form id="${options.id}" style="margin:0;padding:0;max-height:calc(100vh - 150px);overflow-y:auto;">
    `;
    options.fields.forEach(field => {
      if (field.value == undefined) field.value = "";
      var input = '';
      if (field.type == 'text' || field.type == 'number' || !field.type) {
        input = `
          <input
            ${(field.required)?'required':''}
            cast="${field.type}"
            type="${field.type || 'text'}"
            value="${field.value}"
            name="${field.name}"
            placeholder="${(field.required) ? 'required' : ''}"
            onchange="Modal.validateEditField(this)"
            onkeyup="Modal.validateEditField(this)"
            ${(field.maxLength) ? `maxlength="${field.maxLength}"` : ''}
            onblur="Modal.validateEditField(this)"
            originalValue_btoa="${btoa(unescape(encodeURIComponent(field.value)))}"
          />
        `;
      }
      if (field.type == 'hidden') {
        input = `
          <input name="${field.name}" type="hidden" value="${field.value}">
        `;
      }
      if (field.type == 'textarea') {
        input = `
          <textarea
            ${(field.required)?'required':''}
            name="${field.name}"
            onchange="Modal.validateEditField(this)"
            onblur="Modal.validateEditField(this)"
            onkeyup="Modal.validateEditField(this)"
            ${(field.maxLength) ? `maxlength="${field.maxLength}"` : ''}
            originalValue_btoa="${btoa(unescape(encodeURIComponent(field.value)))}"
          >${field.value}</textarea>
        `;
      }
      if (field.type == 'boolean') {
        input = `
          <select
            cast="boolean"
            ${(field.required)?'required':''}
            name="${field.name}"
            onchange="Modal.validateEditField(this)"
            onblur="Modal.validateEditField(this)"
            originalValue_btoa="${btoa(unescape(encodeURIComponent(field.value)))}"
          >
            <option ${(field.value) ? 'selected':''} value="true">✅ YES</option>
            <option ${(!field.value) ? 'selected':''} value="false">❌ NO</option>
          </select>
        `;
      }
      if (field.type == 'select') {
        if (!field.options || !Array.isArray(field.options)) throw new Error('select requires field.options (array)');
        input = `
          <select
            cast="string"
            ${(field.required)?'required':''}
            name="${field.name}"
            onchange="Modal.validateEditField(this)"
            onblur="Modal.validateEditField(this)"
            originalValue_btoa="${btoa(unescape(encodeURIComponent(field.value)))}"
          >
        `;
        // if current value not in options, add it
        if (!field.options.includes(field.value) && field.value != undefined) field.options.push(field.value);
        field.options.forEach(option => {
          var selected = (field.value != undefined)
          input += `<option value="${option}" ${(field.value == option)?'selected':''}>${option || '--'}</option>`;
        });
        input += `</select>`;
      }
      var asterisk = (field.required) ? '<b style="color:orangered">*</b> ' : '';
      html += `
        <div class="row ${(field.type == 'hidden') ? ' hidden' : ''}">
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

    Modal.render(options.title, html);
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
  getEditValues: (formId) => {
    var $form = $(`form#${formId}`);
    var $inputs = $form.find('input, select, textarea');
    var values = {};
    // TOOD: checkboxes & radios ?
    for (var i = 0; i < $inputs.length; i++) {
      var $input = $($inputs[i]);
      var tagName = $input.prop('tagName').toLowerCase();
      var cast = $input.attr('cast') || null;
      var name = $input.attr("name");
      var val = $input.val();
      if (tagName == 'select' && cast == 'boolean') val = (val == 'true') ? true : false;
      if (cast == 'number') val = +val;
      values[name] = val;
    }
    return values;
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

$(() => {
  Modal.init();
});
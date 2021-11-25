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
  adminKey: () => {
    $(function() {
      var admin_key = localStorage.getItem('admin_key') || null;
      if (!admin_key) return;
      $('body').append(`
        <div id="adminKey">welcome <a href="javascript:API.newAdminKey(true)">${admin_key}</a></div>
      `);
    });
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
        if (pathSplit.length > 1) { // local development, the paths have full filepath, vs onlien it'll be simply /error
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
  toastInitted: false,
  initToast: () => {
    if (!Render.toastInitted) {
      $('body').append('<span id="toast" class="toast" style="display:none;">default message</span>');
      Render.toastInitted = true;
    }
  },
  toast: (message, type = 0, durationMs = 2000) => { // -1 = negative, 0 = neutral, 1 = positive (green);
    if (!Render.toastInitted) Render.initToast();
    if (type == 0) message = '✅ ' + message;
    if (type == -1) message = '❌ ' + message;
    // make a log of this toast in console
    console.log('TOAST', message, type);
    $('#toast').text(message).attr('class', `toast type_${type}`).show();
    setTimeout(function() {
      $('#toast').fadeOut();
    }, durationMs);
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
    Render.toast('copied to clipboard', 1);
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
  },
  modalInitted: false,
  initModal: () => {
    if (Render.modalInitted) return;
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
        }
        .modalContents > *  {
          vertical-align: top;
        }
        #modal {
          z-index: 999999;
          background-color: white;
          display: inline-block;
          min-width: 150px;
          min-height: 150px;
          position: absolute;
          top: 35%;
          left: 30%;
          max-width: 80%;
          max-height: 80%;
          transform: translate(-50%, -50%);
          pointer-events: all;
          overflow: auto;
          box-shadow: 4px 4px 12px rgb(0 0 0 / 30%);
        }
        .modalBar {
          background-color: white;
          height: 25px;
          padding: 8px;
          text-align: left;
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
        @media screen and (max-width: 1220px) {
          #modal {
            top: 35%;
            left: 50%;
          }
        }
      </style>
    `);
    $('body').append('');
    $('body').append(`
      <div id="modalOverlay" onclick="if(Render.modalOverlayExit)Render.modalHide();">
        <div id="modal">
          <div class="modalBar">
          </div>
          <div class="modalClose" onclick="Render.modalHide()">×</div>
          <div class="modalContents"></div>
        </div>
      </div>
    `);
    Render.$modal = $('#modal');
    $('.modalBar').on('mousedown', (evt) => {
      // console.log('mousedown', evt);
      Render.modalDrag = true;
      // set the modal initial values
      Render.modalY = Render.$modal.offset().top;
      Render.modalX = Render.$modal.offset().left;
      var modalHeight = Render.$modal.height();
      var modalWidth = Render.$modal.width();
      var windowHeight = $(window).outerHeight();
      var windowWidth = $(window).outerWidth();
      Render.modalYMax = windowHeight - modalHeight;
      Render.modalXMax = windowWidth - modalWidth;
      // move the modal to absolute locations
      Render.$modal.css({
        position: 'absolute',
        left: Render.modalX,
        top: Render.modalY,
        transform: 'none'
      });

      // se the mouse initial values
      Render.initialMouseX = evt.originalEvent.clientX;
      Render.initialMouseY = evt.originalEvent.clientY;
    });
    $(document).on('mouseup.modal', (evt) => {
      // console.log('mouseup', evt);
      if (Render.modalDrag) Render.modalDrag = false;
    });
    $(document).on('mousemove.modal', (evt) => {
      // console.log('mousemove', evt);
      if (!Render.modalDrag) return;
      var left = Render.modalX + (evt.originalEvent.clientX - Render.initialMouseX);
      var top = Render.modalY + (evt.originalEvent.clientY - Render.initialMouseY);
      if (left < 0) left = 0;
      if (top < 0) top = 0;
      if (top > Render.modalYMax) top = Render.modalYMax;
      if (left > Render.modalXMax) left = Render.modalXMax;
      Render.$modal.css({
        left: left,
        top: top
      });
    });
    Render.modalInitted = true;
  },
  modalOverlayExit: true,
  modal: (titleHtml, html, overlayExit = false) => {
    Render.modalOverlayExit = overlayExit;
    if (!overlayExit) {
      $('#modalOverlay').addClass('transparent');
      // add controls and border
    } else {
      $('#modalOverlay').removeClass('transparent');
    }
    $('')
    $('.modalContents').html(html);
    $('.modalBar').html(titleHtml);
    Render.modalShow();
  },
  modalShow: () => {
    // Render.$modal.attr('style', '');
    $('#modalOverlay').show();
  },
  modalHide: () => {
    $('#modalOverlay').hide();
    Render.$modal.attr('style', '');
  }
};
$(() => {
  Render.initModal();
});

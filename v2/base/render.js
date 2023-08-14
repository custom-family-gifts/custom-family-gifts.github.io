// Render: general functions useful for interface
const Render = {
  loading: function(id) {
    $(`#${id}`).html(`<div class="row"><p><div class="spinner"></div></p></div>`);
  },
  try: async (id, data, inject = false) => {
    try {
      // look for exisitng item
      if (inject) {
        $(`#${id} > *`).css({ opacity: 0.5 });
      }

      var html = await Render[id](data);
      setTimeout(function() {
        Render.toLocalTime();
        Render.followAnchor();
      }, 150);

      if (inject) {
        $('#'+id).html(html);
      } else {
        return html;
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
          $('#'+id).html('<p title="something went wrong...">⚠️🪲</p>');
        });
      } else {
        return '<p title="something went wrong...">⚠️🪲</p>';
      }
    }
  },
  toLocalTime: () => {
    $('.datetime').each(function(i, span) {
      var $span = $(span).removeClass('datetime').addClass('localtime');
      var date = new Date($span.text().trim());
      $span.attr('iso8601', $span.text().trim());
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
    var isLocal = !location.host.includes('smile.customfamilygifts.com');
    var buttons = '';
    navDef.forEach(nav => {
      var currentBar = '';
      if (!isLocal) nav.target.replace('.html','');

      if (nav.target.includes('/')) {
        if (location.href.includes(nav.target)) currentBar = '<div class="currentBar"></div>';
      }
      buttons += `<a href="..${nav.target}" class="button">${currentBar}${nav.label}</a>`;
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

    if (options.instructions) {
      options.class += ` hasInstructions`;
    }

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
        ${(options.instructions) ? `<span class="instructions">${options.instructions}</span>` : ''}
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
      <div id="adminKey">welcome <a href="javascript:Admin.updateKey()">${Admin.getName()}</a></div>
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
$(function() {
  Admin.init();
});

var Navigation = {
  renderAnalysis: () => {
    Render.try('navigation', [
      { target: "/etsy_analysis_seo/index.html", label: 'SEO Analysis' },
      { target: "/etsy_analysis_listing/index.html", label: 'Listing Analysis' },
    ], true)
  },
  renderAdmin: () => {
    Render.try('navigation',[
      { target: "/service_orders.html", label: 'Orders' },
      { target: "/freshdesk.html", label: 'Freshdesk' },
      { target: "/errors.html", label: 'API Errors' },
      { target: "/api_log.html", label: 'API Log' },
      { target: "/scheduled.html", label: 'Scheduled' },
    ], true);
    Admin.init();
  },
  renderArtist: () => {
    Render.try('navigation',[
      { target: "/maps.html", label: 'Map database' },
    ], true);
    Admin.init();

    var urlParams = API.getUrlParams();

    var search = `
      <div style="display: inline-block">
        <input style="vertical-align:top;" param name="search" placeholder="Search" value="${urlParams.search || ''}">

        <input style="vertical-align:top;" param name="exclude" placeholder="Exclude" value="${urlParams.exclude || ''}">

        <button style="display: inline-block; background-color: #1976d2; color: white; border: 5px solid white; box-sizing: border-box; line-height: 20px;" class="primary" paramSubmit>Go</button>
        <button style="display: inline-block; background-color: #ddd; border: 5px solid white; box-sizing: border-box; line-height: 20px;"  class="" paramClear>Clear</button>
      </div>
    `;

    setTimeout(function() {
      $('header#content_header > a').after(search);
    }, 250);
  }
};

function codeTD(value) {
  return `<textarea spellcheck="false" class="code" disabled>${sanitizeCodeDisplay(value)}</textarea>`;
}

function sanitizeCodeDisplay(string) {
  if (string == undefined) return '';
  if (typeof string == 'object') string = JSON.stringify(string);
  // numbers
  string = `${string}`;
  return string.replace(/<style/g,'<!style').replace(/<script/g,'<!script').replace(/\<link/g,'<!link').replace(/\<base/g,'<!base');
};

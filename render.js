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
  }
};

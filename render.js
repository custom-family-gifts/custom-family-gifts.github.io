const Render = {
  loading: function(id) {
    $(`#${id}`).html(`<div class="row"><p><div class="spinner"></div></p></div>`);
  },
  try: (id, data) => {
    try {
      setTimeout(function() {
        Render.toLocalTime();
      }, 150)
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
  }
};

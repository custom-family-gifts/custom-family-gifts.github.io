/* nothing here so far - i think most of the logic will be with the render functions */
API.load = (urlParams) => {
  Render.loading('main');
  // defaults
  API.params.q = { $and: [] };

  if (!API.params.per) API.params.per = 10;
  if (!API.params.page) API.params.page = 1;
  if (!API.params.s) API.params.s = { fd_updated_at: -1 };

  if (API.params.page) API.params.page = 1;
  if (API.params.per) API.params.per = 10;

  // apply urlParams
  if (urlParams.page) API.params.page = +urlParams.page;
  if (urlParams.per) API.params.per = +urlParams.per;

  // handle search
  if (urlParams.search && isNaN(urlParams.search)) {
    API.params.q = {
      $and: [
        {
          $text: {
            $search: `${urlParams.search}`,
            $caseSensitive: false,
            $diacriticSensitive: false
          }
        }
      ]
    };
  } else if (urlParams.search != '' && !isNaN(urlParams.search))  {
    API.params.q = {
      $and: [
        {
          $or: [
            { ticket_id: +urlParams.search },
            { order_number: +urlParams.search }
          ]
        }
      ]
    };
  } else {
    API.params.q = {}
  }

  // has orderId
  if (urlParams.hasOrderId == 'NO') {
    API.params.q.$and.push({
      $or: [
        { order_number: 0 },
        { order_number: { $exists: false } }
      ]
    });

  } else if (urlParams.hasOrderId == 'YES') {
    API.params.q.$and.push(
      { order_number: { $ne: 0 } },
    );
    API.params.q.$and.push(
      { order_number: { $exists: true } }
    );
  }

  console.log(API.params.q);

  API.params.search = urlParams.search || '';

  API.call({
    cacheMS: 4000,
    method: 'v2-mdb',
    httpMethod: 'POST',
    body: JSON.stringify({
      op: 'find',
      db: 'cfg',
      col: 'freshdesk_ticket',
      q: API.params.q,
      s: API.params.s,
      p: {
        ticket_id: 1,
        fd_updated_at: 1,
        fd_subject: 1,
        requester_email: 1,
        requester_name: 1,
        order_number: 1,
        messages: 1,
        order_number_solve_count: 1
      },
      per: API.params.per,
      page: API.params.page
    }),
    onSuccess: (data) => {
      console.log(data);
      $('#main').html(Render.try('main',data));
    },
    onFailure: (data) => {
      console.log(data);
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
    ${Render.try('header', data)}
    ${Render.try('results', data)}
    ${Render.try('paginate', data)}
  `;
  return result;
};

Render.filter = (data) => {
  var result = `
    <div class="row">
      <button class="primary" paramSubmit>Go</button>
      <div class="card small">
        <strong>search</strong>
        <input param name="search" placeholder="order/ticket# name/email" value="${API.params.search || ''}">
      </div>

      <div class="card small">
        <strong>has order #</strong>
        <select name="hasOrderId" param>
          <option value="">- ANY -</option>
          <option value="YES" ${(API.getUrlParams().hasOrderId == 'YES') ? 'selected' : ''}>YES</option>
          <option value="NO" ${(API.getUrlParams().hasOrderId == 'NO') ? 'selected' : ''}>NO</option>
        </select>
      </div>
    </div>
  `;
  return result;
};

Render.header = (data) => {
  var result = `
    <header id="content_header">
      <img id="cfgLogo" src="https://cdn.shopify.com/s/files/1/0060/6725/7434/files/heart.png?v=1607199816">
      <a href="#top" class="button" style="margin-left:60px;">Freshdesk Tickets</a>
    </header>
  `;
  return result;
};

Render.results = (data) => {
  var columnDefs = {
    ticket_id: {
      width: '70px',
      format: (value) => { return value },
      display: (value) => { return `<a href="https://customfamilygifts.freshdesk.com/a/tickets/${value}" target="_blank">${value}<span class="icon-link"></span></a>` },
    },
    requester: {
      format: (value, record) => {
        return `${record.requester_name}${(record.requester_email) ? `<br>${record.requester_email}` : ''}`;
      }
    },
    requester_name: { hide: true },
    requester_email: { hide: true },
    order_number: { label: 'order', order: 3, width: '90px' },
    order_number_solve_count: { label: 'solve #', order: 3.5, width: '70px' },
    fd_updated_at: { label: 'updated', order: 0, width: '90px' },
    messages: {
      label: 'latest_msg',
      format: (messages) => {
        if (messages.length == 0) return '--';
        return `${messages.length} message(s)`;
      },
      display: (messages) => {
        if (messages.length == 0) return '--';
        var result = `<div class="tall">`;
        for (var i = messages.length - 1; i >= 0; i--) {
          var message = messages[i];
          result += `<h6>[${i+1}] from: ${message.from_2} - ${Render.formatDate(message.created)}</h6><code>${Render.stripHTML(message.html)}</code><br><br>`;
        }
        return result + '</div>';
      }
    }
  };

  var result = `
    <table>
      ${Render.thead(data, columnDefs)}
      ${Render.tbody(data, columnDefs)}
    </table>
  `;
  return result;
};

Drawer.init({
  title: (data) => {
    return `${(data.isPriority) ? '⭐ ' : ''}Order #${data.orderId_raw}`;
  },
  apiCall: (params) => {
    if (!params.orderId) throw new Error('Drawer needs orderId');
    var call = {
      method: 'v2-getServiceOrder',
      urlParams: '&orderId='+params.orderId
    };
    return call;
  },
  renderOverview: (data) => {
    console.log(data);
    return `
      <div class="row" style="position:absolute;top:6px;left:184px;">${renderPipeline(data.pipeline)} ${renderArtist(data.artist)}</div>
      <div style="white-space: nowrap">
        <div class="drawerDiv" style="width:calc(100% - 138px);display:inline-block">
          <div class="row">${renderItems(data.items, data.options)}</div>
          ${renderCustomer(data)}
        </div>
        <div class="drawerDiv" style="width:90px;display:inline-block;text-align: right;">
          ${renderLinks(data)}
        </div>
      </div>
    `
  },
  tabs: [
    {
      name: 'main',
      render: (data) => {
        return 'wah wah';
      }
    },
    {
      name: (data) => {
        messages = data.messages || [];
        var name = 'messages';
        if (messages.length > 0) name += ` ${Drawer.renderTabCount(messages.length)}`
        return name;
      },
      render: (data) => {
        if (!data.messages) data.messages = [];
        console.log('messages', data);
        var result = '';
        if (data.messages.length == 0) {
          result += `<div class="message" style="background-color: #ddd;font-size: 0.9em;">🙈 no messages found in freshdesk</div>`;
        }
        result += `<div class="message" style="background-color: #ddd;font-size: 0.9em;">NOTE: Freshdesk tickets without correct order_number will now appear here.</div>`;
        for (var i = data.messages.length-1; i >= 0; i--) {
          var message = data.messages[i];
          result += `
            <div class="message ${message.from_2}">
              <div class="messageBar">
                ${renderFrom(message.from, message.source_name)}
                <span class="messageFrom">${message.from}</span>
                <a class="fdLink" target="_blank" href="https://customfamilygifts.freshdesk.com/a/tickets/${message.ticket_id}">fd:${message.ticket_id}</a>
                <span class="messageDatetime datetime">${message.created}</span>
              </div>
              <div class="messageContent">${message.html}</div>
            </div>
          `;
        }
        if (data.etsy_receipt_id) {
          result += `<div class="message" style="background-color: #ddd;font-size: 0.9em;">🍊 NOTE: Rarely, The origin etsy request may not appear here or in FD.<br>If the conversation feels like something is missing. Check the Etsy Order Link</div>`;
        }
        return result;
      }
    }
  ]
});

function renderFrom(from, source_name) {
  if (source_name.toLowerCase() == 'facebook') return `<img src="./assets/facebook.png" style="background-color: white" />`;
  if (from == 'CFG Etsy') return `<img src="./assets/etsy.png" />`;
  if (source_name.toLowerCase().includes('email')) return `<img src="./assets/gmail.png" />`;
  return '';
}

var MAPCOUNT_NAMES = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18
};
function renderItems(items, options) {
  if (!items) return 'no items';
  if (!options) options = [];
  // returns the map count as well
  var itemsArray = items.split('\n');
  var optionsArray = options.split('\n');
  var mapCountArray = optionsArray.filter(option => {
    if (option.toLowerCase().includes('[map count]:')) {
      return true;
    } else {
      return false;
    }
  });
  var mapCountValues = mapCountArray.map((mapcount => {
    var mapcountArr = mapcount.split('[map count]:');
    if (mapcountArr.length == 2) return mapcountArr[1].trim();
    return null;
  }));

  var result = ``;
  itemsArray.forEach((itemLine, i) => {
    var itemSplit = itemLine.split('/');
    if (itemSplit.length != 3) return result += `<div>${itemLine}</div>`;
    result += `
      <ul class="items"><li>${itemSplit[0]}</li><li>${itemSplit[1]}</li><li>${itemSplit[2]}</li>${(mapCountValues[i]) ? `<li>${MAPCOUNT_NAMES[mapCountValues[i]] || mapCountValues[i]} map</li>` : ''}</ul>
    `;
  });


  return result;
}

function renderPipeline(pipeline) {
  var bgColor = 'black';
  var color = 'white';
  if (!pipeline) {
    pipeline = 'uncategorized';
    bgColor = 'red';
    color = 'white';
  }

  if (pipeline.toLowerCase().includes('hold')) {
    bgColor = '#666';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('re-proof')) {
    bgColor = '#8b46ff';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('art: done')) {
    bgColor = '#20c933';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('proof me')) {
    bgColor = '#fcb400';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('review')) {
    bgColor = '#93e088';
    color = 'black';
  }
  if (pipeline.toLowerCase().includes('email')) {
    bgColor = '#20c933';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('proof sent')) {
    bgColor = '#d0f0fd';
    color = 'black';
  }
  if (pipeline.toLowerCase().includes('approved')) {
    bgColor = '#18bfff';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('printed')) {
    bgColor = '#9cc7ff';
    color = 'black';
  }
  if (pipeline.toLowerCase().includes('delivered')) {
    bgColor = '#999';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('cancelled')) {
    bgColor = '#bbb';
    color = 'white';
  }
  return `<span class="tag" style="color:${color};background-color:${bgColor}">${pipeline}</span>`;
}

function renderLinks(order) {
  // service view
  var atLinkUrl = `https://airtable.com/appa8QniOsPWSRDEF/tblBu8Y9Hvjwiz2Mm/viwEtrRRKxWAhjgLM/${order.at_record_id}?blocks=hide`;
  if (order.etsy_link && order.etsy_link.length) atLinkUrl = `https://airtable.com/appa8QniOsPWSRDEF/tblBu8Y9Hvjwiz2Mm/viwdXoP1FZhFXT0q0/${order.at_record_id}?blocks=hide`;
  if (order.pipeline.toLowerCase() == 'delivered') atLinkUrl = `https://airtable.com/appa8QniOsPWSRDEF/tblBu8Y9Hvjwiz2Mm/viwaLSolT6dAYWC7f/${order.at_record_id}?blocks=hide`

  var result = `
  ${(order.at_record_id) ? `
    <a class="orderLinks" target="_blank" href="${atLinkUrl}">Airtable link ▶</a>
  ` : ''}
  ${(order.customer_order_link) ? `
    <a class="orderLinks" target="_blank" href="${order.customer_order_link}">Smile Cust Link ▶</a>
  ` : ''}
  ${(order.customer_order_link) ? `
    <a class="orderLinks" target="_blank" href="https://smile.customfamilygifts.com/service_orders?drawer_orderId=${order.orderId_raw}">Smile Link ▶</a>
  ` : ''}
  ${(order['order link']) ? `
    <a class="orderLinks" target="_blank" href="${order['order link']}">Shopify Link ▶</a>
  ` : ''}
  ${(order.etsy_link && order.etsy_link.length) ? `
    <a class="orderLinks" target="_blank" href="${order.etsy_link[0]}">Etsy Link ▶</a>
  ` : ''}
  ${(order.etsy_link && order.etsy_link.length) ? `
    <input class="orderLinks" name="" value="${order.etsy_link[0]}" onclick="$(this).select()" />
  ` : ''}
  `;
  return result;
}

function renderOptions(value) {
  var result = ``;
  if (!value) value = '';
  value.split('\n').forEach(row => {
    result += `<br>${row}`
  });
  return `<div style="font-size:0.8em;">${result.substring(4, 999)}</div>`;
}

function renderArtist(artist) {
  var bgColor = 'black';
  var color = 'white';
  if (!artist) return '';

  switch (artist) {
    case 'Janine':
      bgColor = '#20d9d2';
      color = 'white';
    break;
    case 'Johnnica':
      bgColor = '#cdb0ff';
      color = 'black';
    break;
    case 'Deb':
      bgColor = '#3cd04d';
      color = 'white';
    break;
    case 'Ira':
      bgColor = '#ff08c2';
      color = 'white';
    break;
    case 'Glecy':
      bgColor = '#18bfff';
      color = 'white';
    break;
    case 'Eliza':
      bgColor = '#2d7ff9';
      color = 'white';
    break;
    case 'Kamille':
      bgColor = '#fcb400';
      color = 'white';
    break;
    case 'Peter':
      bgColor = '#ffa981';
      color = 'black';
    break;
    case 'Mei':
      bgColor = '#ffdaf6';
      color = 'black';
    break;
    case 'Sarah':
      bgColor = '#ffdaf6';
      color = 'black';
    break;
    case 'Tina':
      bgColor = '#444444';
      color = 'black';
    break;

  }
  return `<span class="tag" style="color:${color};background-color:${bgColor}">${artist}</span>`;
}

function renderCustomer(order) {
  var result = `${order.custFirst} ${order.custLast}`;
  result += `<br>📧 ${order.email}`;
  if (order.custPhone) result += `<br>📞 ${order.custPhone}`;
  if (order.shipAddress) result += `<br><div class="small" style="display:block;">${order.shipAddress.replace(/\n/g,'<br>')}</div>`;
  return result;
}

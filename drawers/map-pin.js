Drawer.init({
  title: (data) => {
    setTimeout(function() {
      Pin.renderDrawerTitle();
    }, 100);
    return '';
  },
  apiCall: (params) => {
    var call = {
      method: 'testEndpoint', // do nothing essentially
    };
    return call;
  },
  renderOverview: (data) => {
    setTimeout(function() {
      Pin.renderDrawerOverview()
    }, 100);
    return '';
  },
  tabs: [
    {
      name: 'pinned',
      render: (data) => {
        Pin.renderPinned();
      }
    },
  ]
});


Pin = {
  orderId: null,
  locationId: 0,
  pins: [],
  modified: null,
  init: () => {
    Pin.initInterface();
    Pin.load();
    Pin.reflect();
  },
  load: () => {
    try {
      var packageJSON = localStorage.getItem('pinData');
      if (packageJSON) {
        var package = JSON.parse(packageJSON);
        Pin.orderId = package.orderId;
        Pin.locationId = package.locationId;
        Pin.modified = package.modified;
        Pin.pins = package.pins;
      }
    } catch (e) { /* do nothing*/
      console.warn(e, e.message);
      if (e.message.includes('valid JSON')) localStorage.removeItem('pinData');
    }

  },
  save: () => {
    var package = {
      orderId: Pin.orderId,
      locationId: Pin.locationId,
      pins: Pin.pins,
      modified: new Date().toISOString()
    };
    localStorage.setItem('pinData', JSON.stringify(package));
  },
  clearOrderId: () => {
    delete Pin.orderId;
    Pin.save();
    Pin.reflect();
  },
  setOrderId: (orderId) => {
    Pin.orderId = orderId;
    Pin.save();
    Pin.reflect();
  },
  toggleCrop: (crop_id) => {
    var isOn = false;
    Pin.pins.forEach((pin, i) => {
      if (Pin.orderId) {
        if (pin.crop_id == crop_id && pin.orderId == Pin.orderId) isOn = true;
      } else {
        if (pin.crop_id == crop_id) isOn = true;
      }
    });
    if (isOn) {
      Pin.removeCrop(crop_id);
    } else {
      Pin.addCrop(crop_id);
    }
  },
  removeCrop: (crop_id) => {
    var newPins = [];
    Pin.pins.forEach((pin) => {
      if (Pin.orderId) {
        if (pin.crop_id != crop_id || pin.orderId != Pin.orderId) newPins.push(pin);
      } else {
        if (pin.crop_id != crop_id) newPins.push(pin);
      }
    });
    Pin.pins = newPins;
    Pin.save();
    Pin.reflect();
  },
  addCrop: (crop_id) => {
    var newPin = { crop_id: crop_id };
    if (Pin.orderId) newPin.orderId = Pin.orderId;
    if (Pin.locationId) newPin.locationId = Pin.locationId;
    Pin.pins.push(newPin);
    Pin.save();
    Pin.reflect();
  },
  toggleMap: (map_id) => {
    var isOn = false;
    Pin.pins.forEach((pin, i) => {
      if (Pin.orderId) {
        if (pin.map_id == map_id && pin.orderId == Pin.orderId) isOn = true;
      } else {
        if (pin.map_id == map_id) isOn = true;
      }
    });
    if (isOn) {
      Pin.removeMap(map_id);
    } else {
      Pin.addMap(map_id);
    }
  },
  removeMap: (map_id) => {
    var newPins = [];
    Pin.pins.forEach((pin) => {
      if (Pin.orderId) {
        if (pin.map_id != map_id || pin.orderId != Pin.orderId) newPins.push(pin);
      } else {
        if (pin.map_id != map_id) newPins.push(pin);
      }
    });
    Pin.pins = newPins;
    Pin.save();
    Pin.reflect();
  },
  addMap: (map_id) => {
    var newPin = { map_id: map_id };
    if (Pin.orderId) newPin.orderId = Pin.orderId;
    if (Pin.locationId) newPin.locationId = Pin.locationId;
    Pin.pins.push(newPin);
    Pin.save();
    Pin.reflect();
  },
  reflect: () => {
    // the search results
    // clear all
    $('button.pin.pinned').removeClass('pinned');

    Pin.pins.forEach(pin => {
      var current = false;
      if (Pin.orderId) {
        if (pin.orderId == Pin.orderId) current = true;
      } else {
        if (!pin.orderId) current = true;
      }

      if (pin.crop_id && current) $(`button.pin[crop_id=${pin.crop_id}]`).addClass('pinned');
      if (pin.map_id && current) $(`button.pin[map_id=${pin.map_id}]`).addClass('pinned');
    });

    Pin.renderNav();
    Pin.renderDrawerOverview();
    Pin.renderDrawerTitle();
    Pin.renderPinned();
  },
  drawerToggle: () => {
    if (Drawer.shown) {
      Drawer.hide();
    } else {
      Drawer.load();
    }
  },
  initInterface: () => {
    var $navToggle = $('#pinNavToggle');
    if ($navToggle.length) return;

    $navToggle = $(`<button id="pinNavToggle" onclick="Pin.drawerToggle()"></button>`);
    $('#content_header').append($navToggle);
  },
  renderNav: () => {
    var pinnedCount = 0;
    Pin.pins.forEach(pin => {
      if (Pin.orderId) {
        if (Pin.orderId == pin.orderId) {
          pinnedCount++;
        }
      } else {
        if (!pin.orderId) pinnedCount++;
      }
    });

    // nav
    if (pinnedCount) {
      $('#pinNavToggle').addClass('hasPins');
    } else {
      $('#pinNavToggle').removeClass('hasPins');
    }

    $('#pinNavToggle').html(`
      <span class="count">${pinnedCount}</span> 📌 ${(Pin.orderId) ? ` #${Pin.orderId}` : ''}
    `);
  },
  renderDrawerOverview: () => {
    var html = '';
    if (!Pin.orderId) {
      html = `#<input type="number" placeholder="1234" onkeyup="if(event.keyCode == 13)Pin.setOrderId($('input[name=addOrderId]').val())" name="addOrderId" /><button onclick="Pin.setOrderId($('input[name=addOrderId]').val())">Add Order</button>`;
      $('#drawerOverview').html(html);
    } else {
      OrderLoader.render(Pin.orderId);
    }
    return '';
  },
  getPinTally: () => {
    var tally = {
      noorder: 0
    };
    Pin.pins.forEach(pin => {
      if (!pin.orderId) tally.noorder++;
      if (pin.orderId) {
        if (!tally[pin.orderId]) tally[pin.orderId] = 0;
        tally[pin.orderId]++;
      }
    });
    return tally;
  },
  renderDrawerTitle: () => {
    var tally = Pin.getPinTally();

    var currentOrder = '';
    if (Pin.orderId) {
      currentOrder = `<li class="current" onclick="Pin.setOrderId(${Pin.orderId})">${(tally[Pin.orderId]) ? tally[Pin.orderId] + ` 📌 ` : ''}#${Pin.orderId}</li>`;
    }

    var noOrder = '';

    // solve other orders
    var otherOrders = [];
    Object.keys(tally).forEach(key => {
      if (key == 'noorder') noOrder = `<li class="${(!Pin.orderId) ? 'current' : ''}" onclick="Pin.clearOrderId()">${(tally.noorder) ? tally.noorder + ` 📌 ` : ''}No Order</li>`;
      if (key == Pin.orderId && key != 'noorder') return; // ignore
      otherOrders.push(key);
    });

    var otherHtml = ``;
    otherOrders.forEach(pin => {
      if (pin != 'noorder') {
        otherHtml += `<li onclick="Pin.setOrderId(${pin})">${(tally[pin]) ? tally[pin] + ` 📌 ` : ''}#${pin}</li>`;
      }
    });

    var addOrder = '<li class="add" onclick="Pin.clearOrderId()">Add Order</li>';
    $('#drawerTitle').html(`
      ${noOrder}
      ${currentOrder}
      ${otherHtml}
      ${addOrder}
    `);
  },
  renderPinned: () => {
    var result = '';
    var pinnedCount = 0;
    Pin.pins.forEach((pin) => {
      if (!Pin.orderId && pin.orderId) return;
      if (Pin.orderId && pin.orderId != Pin.orderId) return;

      if (pin.crop_id) {
        pinnedCount++;
        result += `
          <div class="drawerPinned result">
            <div class="drawerPinnedTitle">Crop #${pin.crop_id}</div>

            <div class="buttons left">
              <button id="zoom_${pin.crop_id}" type="button" class="overlayButton zoom right" onclick="toggleZoom('drawerCrop_${pin.crop_id}')">🔎</button>
            </div>

            <div class="buttons right">
              <button id="download_${pin.crop_id} "type="button" class="overlayButton download left"><a target="_blank" href="http://image.customfamilygifts.com/S3B/crops/${pin.crop_id}.jpg" download="${pin.crop_id}.jpg" >💾</a></button>
              <button crop_id="${pin.crop_id}" onclick="Pin.toggleCrop(${pin.crop_id});" type="button" class="overlayButton pin left pinned">📌</button>
            </div>
            <img id="drawerCrop_${pin.crop_id}" src="https://custom-family-gifts.s3.us-east-2.amazonaws.com/S3B/crops/${pin.crop_id}_m.jpg" />
          </div>
        `;
      }

      if (pin.map_id) {
        pinnedCount++;
        result += `
          <div class="drawerPinned result">
            <div class="drawerPinnedTitle">Full Map #${pin.map_id}</div>

            <div class="buttons left">
              <button id="zoom_${pin.map_id}" type="button" class="overlayButton zoom right" onclick="toggleZoom('drawerPin_${pin.map_id}', 30)">🔎</button>
            </div>

            <div class="buttons right">
              <button id="download_${pin.map_id}" type="button" class="overlayButton download left"><a target="_blank" href="http://image.customfamilygifts.com/S3B/${pin.map_id}/${pin.map_id}.jpg" download="${pin.map_id}.jpg" >💾</a></button>
              <button map_id="${pin.map_id}" type="button" class="overlayButton pin left pinned" onclick="Pin.toggleMap(${pin.map_id});">📌</button>
            </div>
            <img id="drawerPin_${pin.map_id}" src="https://custom-family-gifts.s3.us-east-2.amazonaws.com/S3B/${pin.map_id}/${pin.map_id}_m.jpg" />
          </div>
        `;
      }
    });

    if (pinnedCount == 0) result = `<span>Nothing Pinned ${(Pin.orderId) ? ` for #${Pin.orderId}` : ''}</span>`

    $('#drawerContents').html(result);
  },
  closeOrder: function(orderId) {
    var newPins = [];
    Pin.pins.forEach(pin => {
      if (pin.orderId != orderId) newPins.push(pin);
    });
    if (Pin.orderId == orderId) Pin.orderId = null;
    Pin.pins = newPins;
    Pin.save();
    Pin.reflect();
  }
};

// orderLoader
var OrderLoader = {
  render: async function(orderId) {
    $('.orderLoaderError').remove();
    var html = '';
    try {
      var order = await OrderLoader.load(orderId);
      html = `
        <div style="display: inline-block; width: 48%; height 100%; vertical-align: top;">
          ${order.items}

          ${(order.notes) ? `
            <br><br>
            ${order.notes}
          ` : ''}
        </div>

        <div style="display: inline-block; width: 48%; height: 100%; vertical-align: top;">
          <textarea disabled spellcheck="false" style="width:100%; height: 100%; cursor: text; padding: 3px 6px; font-size: 13px;">${order.options}</textarea>
        </div>
      `;
    } catch (e) {
      html = `<div class="orderLoaderError" style="color:red">Could not load #${orderId}</div>`;
    }

    html += `<button onclick="Pin.closeOrder(${orderId})">close order</button>`;

    $('#drawerOverview').html(html);
  },
  load: async function(orderId) {
    var order = OrderLoader.loadCacheOrder(orderId);
    if (order) return order;

    try {
      var response = await fetch(`https://us-central1-custom-family-gifts.cloudfunctions.net/v2-call?cypherKey=${API.zKey || API.z}&method=v2-getCustomerOrder&orderId=${orderId}`);
      var data = await response.json();
      if (data.orderId_raw != orderId) {
        throw new Error(`Expected #${orderId} got ${data.orderId_raw}`);
      }
      var order = OrderLoader.saveCacheOrder(data);
      console.log(order);
      return order;
    } catch (e) {
      console.warn(e);
      return null;
    }
  },
  saveCacheOrder: function (order) {
    var cache = OrderLoader.getCache();
    var strippedOrder = {
      options: order.options,
      items: order.items,
      notes: order[`Internal - newest on top please`]
    };

    cache[order.orderId_raw] = strippedOrder;
    localStorage.setItem('OrderLoader_orders', JSON.stringify(cache));

    return strippedOrder;
  },
  getCache: function() {
    var cacheJSON = localStorage.getItem('OrderLoader_orders');
    var cache = {}
    if (cacheJSON) {
      try {
        cache = JSON.parse(cacheJSON);
      } catch (e) {
        cache = {};
      }
    }
    return cache;
  },
  loadCacheOrder: function(orderId) {
    var cache = OrderLoader.getCache();
    if (cache[orderId]) {
      console.log('OrderLoader cache hit!');
      return cache[orderId];
    }
    return null;
  }
};

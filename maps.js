Navigation.renderArtist();

/* nothing here so far - i think most of the logic will be with the render functions */
API.load = (urlParams) => {
  Render.loading('main');

  console.log(urlParams);

  API.call({
    cacheMS: 3000,
    method: 'v2-searchMaps',
    httpMethod: 'POST',
    urlParams: `&search=${encodeURIComponent(urlParams.search)}&exclude=${encodeURIComponent(urlParams.exclude)}`,
    onSuccess: (data) => {
      addRecentSearch(urlParams.search);
      window.data = data;
      Render.try('main', data, true);
      setTimeout(() => {
        initRecentSearch();
        detectOffScreenResults();
        $('input[name=search]').select();
        Pin.init();
      }, 100);
    },
    onFailure: (data) => {
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
    ${Render.try('results', data)}
  `;

  return result;
};

Render.filter = (data) => {
  var urlParams = API.getUrlParams();
  var result = '';

  return result;
};

Render.results = (data) => {
  console.log(data);
  return renderResults(data);
};

Render.selectedIdsUpdate = (selectedIds, orderId) => {
  if (!orderId) return;
  Drawer.load({orderId:orderId});
};

function renderResults(data) {
  return `
    ${(data.maps.recordcount) ? `<button onclick="scrollToCrops()" id="cropsOut">Found ${data.crops.recordcount} Crops ☝️</button>` : ''}
    ${(data.maps.recordcount) ? `<button onclick="scrollToMaps()" id="mapsOut">Found ${data.maps.recordcount} Full Maps 👇</button>` : ''}
    ${(data.context_maps && data.context_maps.recordcount) ? `<button onclick="scrollToContexts()" id="contextOut">${data.context_maps.recordcount} Full Maps with "<u>${data.context_terms}</u>" 👇</button>` : ''}

    <table id="mainTable">
      ${renderCrops(data.crops)}
      ${renderMaps(data.maps)}
      ${renderContext(data.context_maps, data.context_terms)}
    </table>
  `;
}

function renderContext(context_maps, context_terms) {
  if (!context_maps || !context_maps.recordcount || !context_terms) return '';
  return `
    <thead id="contextHead" style="margin-top: 45px;">
      <th>${context_maps.recordcount} Maps with "<u>${context_terms}</u>"</th>
    </thead>

    <tr>
      <td>${renderMapResults(context_maps, context_terms)}</td>
    </tr>
  `;
}

function renderCrops(crops) {
  return `
    <thead id="cropsHead">
      <th>Found ${crops.recordcount} Crops <button type="button" onclick="toggleTable(this)">hide</button></th>
    </thead>

    <tr>
      <td>${renderCropResults(crops)}</td>
    </tr>
  `;
}

function renderCropResults(crops) {
  var urlParams = API.getUrlParams();
  var result = '';
  console.log(crops);
  if (crops.recordcount == 0) return `No results`;

  crops.records.forEach(row => {
    var dl_full_path = '';
    if (row.dl_name) dl_full_path = `https://custom-family-gifts.s3.us-east-2.amazonaws.com/S3B/crops_dl/${row.dl_name}`;
    var crop_path = `https://custom-family-gifts.s3.us-east-2.amazonaws.com/S3B/crops/${row.crop_id}.jpg`;

    result += `
      <div class="result" style="border-style: dashed; border-color:#f0f0f0">
        ${(row.source_map_id) ? `<div onclick="mapSearch('#${row.source_map_id}')" onclick="mapSearch('#${row.source_map_id}')" class="source">source #${row.source_map_id}</div>` : ''}
        <div class="resolution">${renderStars(row.style_rating)}${row.width} x ${row.height}</div>
        <div class="title">${colorSearchText(row.search, urlParams.search, '')}</div>
        <img crop_id="${row.crop_id}" id="cropImg_${row.crop_id}" loading="lazy" src="https://custom-family-gifts.s3.us-east-2.amazonaws.com/S3B/crops/${row.crop_id}_m.jpg" ${(dl_full_path) ? 'dl_full_path="'+dl_full_path+'"' : ''} />
        <div class="buttons left">
          <button id="zoom_${row.crop_id}" type="button" class="overlayButton zoom right" onclick="toggleZoom('cropImg_${row.crop_id}')">🔎</button>
        </div>
        <div class="buttons right">
          <button id="download_${row.crop_id} "type="button" class="overlayButton download left"><a target="_blank" href="${(dl_full_path) ? dl_full_path : crop_path}">💾</a></button>
          <button crop_id="${row.crop_id}" onclick="Pin.toggleCrop(${row.crop_id}, '${dl_full_path}');" type="button" class="overlayButton pin left">📌</button>
        </div>
        <span class="image_message_container"><span></span></span>
      </div>
    `;
  });

  return result;
}

function renderStars(rating) {
  if (!rating) return '';
  var string = '<span style="letter-spacing:-3px;font-size:11px;">';
  for (var i = 0; i < rating; i++) {
    string += '⭐';
  }
  string += '</span> ';
  return string;
}

function renderMapResults(maps, context) {
  var urlParams = API.getUrlParams();
  var result = '';
  if (maps.recordcount == 0) return `No results`;

  maps.records.forEach(row => {
    var boldMapIdSearch = row.search.replace(`#${row.map_id}`, `<b>#${row.map_id}</b>`)
    result += `
      <div class="result map">
        <div class="resolution">${renderStars(row.style_rating)}${row.width} x ${row.height}</div>
        <div class="title">${colorSearchText(boldMapIdSearch, urlParams.search, context)}</div>
        <img map_id="${row.map_id}" id="mapImg_${row.map_id}" loading="lazy" src="https://custom-family-gifts.s3.us-east-2.amazonaws.com/S3B/${row.map_id}/${row.map_id}_m.jpg" />
        <div class="buttons left">
          <button id="zoom_${row.map_id}" type="button" class="overlayButton zoom right" onclick="toggleZoom('mapImg_${row.map_id}', 30)">🔎</button>
        </div>
        <div class="buttons right">
          <button id="download_${row.map_id}" type="button" class="overlayButton download left"><a target="_blank" href="https://custom-family-gifts.s3.us-east-2.amazonaws.com/S3B/${row.map_id}/${row.map_id}.jpg" download="${row.map_id}.jpg" >💾</a></button>
          <button map_id="${row.map_id}" type="button" class="overlayButton pin left" onclick="Pin.toggleMap(${row.map_id});">📌</button>
        </div>
        <span class="image_message_container"><span></span></span>
      </div>
    `;
  });

  return result;
}


function renderMaps(maps) {
  return `
    <thead id="mapsHead" style="margin-top: 45px; vertical-align:top; margin-right:3px;">
      <th>Found ${maps.recordcount} Full Maps <button type="button" onclick="toggleTable(this)">hide</button></th>
    </thead>

    <tr>
      <td>${renderMapResults(maps)}</td>
    </tr>
  `;
}

var zooms = {};
function toggleZoom(id, maxZoom = 8) {
  // loadFullCrop(id);
  var $img = $('#'+id);
  if ($img.closest('.result').find('button.zoom').hasClass('on')) {
    $img.removeClass('zoom');
    stopZoom(id);
  } else {
    $img.addClass('zoom');
    startZoom(id, maxZoom);
  }
}
function startZoom(id, maxZoom = 8) {
  // find any other zoom and stop it
  var $zoomOnButtons = $('button.zoom.on');
  for (var i = 0; i < $zoomOnButtons.length; i++) {
    $($zoomOnButtons.get(i)).click();
  }

  var isMap = Boolean(id.substring(0,3) == 'map');

  zooms[id] = new dmuka.Zoom({
    element: document.getElementById(id),
    minZoom: 0.9,
    maxZoom: maxZoom,
    increment: 0.3,
    parentPadding: 0,
    onZoom: (x) => {
      var crop_id = id.split('_')[1];
      var $img = $('#'+id);
      var style = $img.attr('style');
      var zoom = +style.split('matrix(')[1].split(',')[0];
      // console.log($img, $img.length, zoom);
      if (zoom > (maxZoom-1) && !$img.hasClass('full')) {
        loadFullCrop(id);
      }
    }
  });

  var $img = $('#'+id);
  if(isMap) {
    loadLargeCrop(id);
  } else {
    loadFullCrop(id);
  }
  $img.closest('.result').find('button.zoom').addClass('on');
}
function stopZoom(id) {
  var $img = $('#'+id);
  zooms[id].zoomClear();
  $img.attr('style','');
  $img.closest('.result').find('button.zoom').removeClass('on');
  var contents = $img.parent().contents();
  $img.parent().replaceWith(contents);
}
function loadFullCrop(id) {
  var $img = $('#'+id);
  if ($img.hasClass('full')) return;
  $img.addClass('full');
  $img.closest('.result').find('.image_message_container span').show().text('loading FULL image...');

  var fullSrc = $img.attr('src').replace('_m', '').replace('_l','');
  if ($img.attr('dl_full_path')) fullSrc = $img.attr('dl_full_path');
  var $newImg = $(`<img style="display:none;" id="full_${id}" src="${fullSrc}" onload="swapFullCrop('${id}')" />`);
  $img.after($newImg);
}
function swapFullCrop(id) {
  var $img = $('#'+id);
  var $fullImg = $(`#full_${id}`);
  $img.attr('src', $fullImg.attr('src'));
  $img.closest('.result').find('.image_message_container span').fadeIn().text('FULL image loaded.');
  setTimeout(function() {
    $img.closest('.result').find('.image_message_container span').fadeOut()
  }, 2000);
}

function loadLargeCrop(id) {
  var $img = $('#'+id);
  if ($img.hasClass('large') || $img.hasClass('full')) return;
  $img.addClass('large');
  $img.closest('.result').find('.image_message_container span').fadeIn().text('loading medium image...');

  var largeSrc = $img.attr('src').replace('_m', '_l');
  var $newImg = $(`<img style="display:none;" id="large_${id}" src="${largeSrc}" onload="swapLargeCrop('${id}')" />`);
  $img.after($newImg);
}
function swapLargeCrop(id) {
  var $img = $('#'+id);
  var $largeImg = $(`#large_${id}`);
  $img.attr('src', $largeImg.attr('src'));
  $img.closest('.result').find('.image_message_container span').fadeIn().text('medium image loaded.');
  setTimeout(function() {
    $img.closest('.result').find('.image_message_container span').fadeOut()
  }, 2000);
}

$(() => {
  initDetectOffscreenResults();
});

function initDetectOffscreenResults() {
  if ($('body').hasClass('initDetectOffscreenResults')) return;
  $('body').addClass('initDetectOffscreenResults');

  $(window).on('scroll', function() {
    detectOffScreenResults();
  });
}
function detectOffScreenResults() {
  var windowHeight = $(window).height();
  var currentScrollTop = $(window).scrollTop();
  var cropsY = $('#cropsHead').offset().top;
  var mapsY = $('#mapsHead').offset().top;

  var $contextHead = $('#contextHead');

  if (cropsY < currentScrollTop) {
    $('#cropsOut').show();
  } else {
    $('#cropsOut').hide();
  }

  if (mapsY > (currentScrollTop + windowHeight)) {
    $('#mapsOut').show();
  } else {
    $('#mapsOut').hide();
  }

  if ($contextHead.length) {
    var contextY = $contextHead.offset().top;
    if (contextY > (currentScrollTop + windowHeight)) {
      $('#contextOut').show();
    } else {
      $('#contextOut').hide();
    }
  }

}
function scrollToCrops() {
  $("html, body").animate({ scrollTop: 0 }, 1000);
}
function scrollToMaps() {
  var mapsY = $('#mapsHead').offset().top - 50;
  $("html, body").animate({ scrollTop: mapsY }, 1000);
}
function scrollToContexts() {
  var mapsY = $('#contextHead').offset().top - 50;
  $("html, body").animate({ scrollTop: mapsY }, 1000);
}

function toggleTable(btn) {
  var $btn = $(btn);
  var $td = $btn.closest('thead').next('tbody').find('td');
  if (!$btn.hasClass('hideTable')) {
    $td.attr('wasHeight', $td.height());
    $td.addClass('hideTable');
    $btn.addClass('hideTable').text('show');
  } else {
    $btn.removeClass('hideTable').text('hide');
    $td.removeClass('hideTable');
  }
  detectOffScreenResults();
}

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function colorSearchText(text, search, context) {
  var terms = {};
  fullSearch = context + ' ' + search;
  fullSearch.toLowerCase().trim().split(',').forEach(commaSplit => {
    commaSplit.trim().split(' ').forEach(term => {
      terms[term] = true;
    });
  });

  var textLower = text.toLowerCase();

  Object.keys(terms).forEach(term => {
    var index = textLower.indexOf(term);
    if (textLower.indexOf(term) > -1) {
      var substring = text.substring(index, index + term.length);
      text = text.replace(substring, `<u>${substring}</u>`);
      textLower = textLower.replace(substring.toLowerCase(), `<u>${substring.toLowerCase()}</u>`);
    }
  });

  return text;
}

function mapSearch(searchTerm) {
  $('input[name=search]').val(searchTerm).change();
  $('#recentSearch').hide();
  $('button[paramsubmit]').click();
}

function addRecentSearch(searchTerm) {
  if (!searchTerm) return;
  var recent = getRecentSearch();
  if (!(searchTerm.toLowerCase() in recent.termsLC)) {
    recent.order.push(searchTerm);
    recent.termsLC[searchTerm.toLowerCase()] = 1;

    if (recent.order.length > 5) {
      var pop = recent.order.shift();
      delete recent.termsLC[pop.toLowerCase()];
    }
  }
  localStorage.setItem('recentSearchJSON', JSON.stringify(recent));
  return getRecentSearch();
}

function getRecentSearch() {
  var recentJSON = localStorage.getItem('recentSearchJSON');
  var recent = {
    order: [],
    termsLC: {}
  };
  if (recentJSON) {
    try {
      recent = JSON.parse(recentJSON);
    } catch(e) { /* */ }
  }
  return recent;
}

function showRecentSearch() {
  var recent = getRecentSearch();
  var $input = $('input[name=search]');
  var $recentSearch = $('#recentSearch').show();
  $recentSearch.html('');

  if (recent.order && recent.order.length) {
    recent.order.forEach(searchTerm => {
      if (searchTerm.toLowerCase() == $input.val().toLowerCase()) return;
      $recentSearch.append(`<span onclick="mapSearch('${searchTerm}')">${searchTerm}</span>`)
    });
  }
}

function initRecentSearch() {
  var $input = $('input[name=search]');
  var $recentSearch = $('#recentSearch').hide();

  $input.on('click', () => {
    showRecentSearch();
  });
  $input.on('blur', () => {
    setTimeout(() => {
      $('#recentSearch').hide();
    }, 150);
  });
}



function savePins(data) { // only if logged in
  // save
}

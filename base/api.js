/* use this to call GCF to leverage AUTH & browser caching
  AUTH - all calls to GCF require a urlParam named cypherKey - which is generated by the current page URL route parameter q
  CACHE - all GET calls to GCF will be cached by {{z}}_{{method}}_{{cypherKey}}
*/
var API = {};

API.init = function() {
  // solve for z (url param)
  var urlParams = API.getUrlParams();
  if (urlParams.z) API.z = urlParams.z || ''; // API.z is the "auth" a client sends to api for access
  if (localStorage) API.zKey = localStorage.getItem(`key_${API.z}`);

  // enable global error reporting
  window.addEventListener("error", function (e, f, g) {
    API.errorLog({
      name: 'window.eventListener',
      message: e.message,
      stack: e.stack,
      url: (window && window.location) ? window.location.href : null,
      type: 'client_js_error'
    });
    return false;
  });

  API.purgeApiCache(); // clean up localstorage of old caches

  $(document).ready(() => {
    if (!API.load) throw new Error('undefined API.load() - need to know what to load');
    API.load(API.getUrlParams());
  });

  window.onbeforeunload = function(){
    API.currentCall.abort();
  }
}

API.currentCall = null;
API.call = function(options) {
  /* args:
    httpMethod, // POST GET...
    method, // GCF function name
    params, // ?asdf=1234
    package, // obj to be passed into POST as JSON
    onSuccess, // executed after success
    onFailure // executed after failure
  */
  if (!options.httpMethod) options.httpMethod = 'GET';
  if (!options.method) throw new Error('needs method');
  // 1. check the browser cache
  var cachedData = null;
  try {
    cachedData = API.getCache(options.method, options.cacheMS);
  } catch (e) {
    API.errorLog({
      name: 'API.getCache',
      message: e.message,
      stack: e.stack,
      url: (window && window.location) ? window.location.href : null,
      type: 'client_js_error'
    });
  }
  if (cachedData) {
    return options.onSuccess(cachedData);
  }

  if (!options.urlParams) options.urlParams = '';

  // 2. check the browser for a auth key

  // 3. make the call
  var callURL = `https://us-central1-custom-family-gifts.cloudfunctions.net/v2-call?cypherKey=${API.zKey || API.z}&method=${options.method}${options.urlParams}`;
  if (options.body) options.httpMethod = 'POST';
  var ajaxOptions = {
    method: `${options.httpMethod}`,
    headers: (options.httpMethod == 'GET') ? {} : { "Content-Type": "application/json" }
  };
  if (options.body) ajaxOptions.data = options.body;

  API.currentCall = $.ajax(callURL, ajaxOptions).done(function(data, status, res) {
    if (res.status == 200) {
      if (localStorage && API.z) localStorage.setItem(`key_${API.z}`, data.key); // record auth key - to skip Airtable AUTH
      if (options.onSuccess) options.onSuccess(data);
      // save the cache
      API.saveCache(options.method, data);
      if (data.admin) Admin.setName(data.admin);
    } else if (res.status == 202) {
      if (options.onFailure) options.onFailure(data, res.status);
    } else {
      // fail condition
      if (options.onFailure) options.onFailure(data, res.status);
      API.clearCache(options.method);
    }
  }).fail(function(err) {
    if (options.onFailure) options.onFailure(err, err.status);
    console.log(err);
    API.errorLog({
      name: options.method,
      message: `${err.status} ${err.responseText.substring(0,250)}`,
      stack: err.responseJSON,
      url: callURL,
      type: 'client_api_error'
    });
  });
};

/* Caching logic */
API.cacheExpire = 60000; // 60s
API.saveCache = function(method, data) {
  if (!localStorage) return;
  data.cacheDatetime = new Date().toISOString();
  try {
    localStorage.setItem(API.getCacheKey(method), JSON.stringify(data));
  } catch (e) {
    console.warn(e);
  }
}

API.purgeApiCache = function() {
  // checks all the cache keys to remove old cache data that's expired.
  var nowEpoch = new Date().getTime();
  for (var key in localStorage) {
    var keyParts = key.split('_');
    if (keyParts[0] == 'api') {
      if (keyParts[keyParts.length-1] < nowEpoch) localStorage.removeItem(key);
    }
  }
}

API.getCacheKey = function(method) {
  // add epoch - midnight of next day for key that is unique to each day
  // also easily num compared to see if expired or not
  var nowEpoch = new Date().getTime();
  var day = 86400000;
  var uniqueDayKey = nowEpoch - (nowEpoch % day) + day;
  return `api_${method}_${API.z}_${window.location.search}_${uniqueDayKey}`;
}

API.getCache = function(method, cacheMS) {
  if (!localStorage) return;
  if (cacheMS == undefined) cacheMS = API.cacheExpire;
  var cacheKey = API.getCacheKey(method);
  var cached = localStorage.getItem(cacheKey);
  if (cached) {
    var cacheData = JSON.parse(cached);
    // see how old cached copy is
    var cacheDatetime = new Date(cacheData.cacheDatetime);
    cacheData.cacheAgeMs = new Date() - cacheDatetime;
    delete cacheData.cacheDatetime;
    if (cacheData.cacheAgeMs < cacheMS) {
      console.log('cachehit ' + cacheKey);
      cacheData.cacheHit = true; // show that this came from cache
      return cacheData;
    } else {
      // remove from browser cache
      localStorage.removeItem(cacheKey);
    }
  }
  return null;
}

API.clearCache = function(method) {
  if (!localStorage) return;
  localStorage.removeItem(`${method}_${API.z}`);
}

API.errorLog = function(log) {
  log.log = 'error_log';
  log.userAgent = 'unknown';
  log.timezone = new Date().getTimezoneOffset();
  if (window && window.navigator) log.userAgent = window.navigator.userAgent;
  var callURL = `https://us-central1-custom-family-gifts.cloudfunctions.net/v2-log?`;
  $.ajax(callURL,{
    method: `POST`,
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify(log)
  }).done(function(data, status) {
    // console.log(data);
    // console.log(status);
  });
}

API.params = {}; // what actually gets pass to API. contains default values and can be influenced by urlParams
API.getUrlParams = function() {
  // gets the params from url
  var url = window.location.search;
  var paramSplit2 = (url.split('?')[1]) ? url.split('?')[1].split('&') : [];
  var result = {};
  var paramSplit3 = paramSplit2.forEach((item) => { // count=13
    var itemSplit = item.split('=');
    var key = itemSplit[0];
    var value = itemSplit[1];
    if (value == undefined || value == null) value = '';
    result[key] = decodeURIComponent(value.replace(/\+/g, ' '));
  });
  return result;
};
API.setUrlParam = function(name, value) { // pushes param changes to url
  var params = API.getUrlParams();
  params[name] = value;
  API.paramsToUrl(params);
};
API.paramsToUrl = function(paramObj) {
  // reflect this to API.params at this time, which includes default paramters for API
  API.params = Object.assign({}, API.params, paramObj);

  var result = '';
  Object.keys(paramObj).forEach((key) => {
    if (key === undefined || key === null) return;
    if (paramObj[key] != null && paramObj[key] != undefined && paramObj[key] != '') {
      if (result != '') result += '&';
      result += `${key}${(paramObj[key]) ? '='+encodeURIComponent(paramObj[key]) : ''}`;
    }
  });
  window.history.pushState('page', 'cfg', window.location.pathname + '?' + result);
  return result;
}
// set reactive input elements with attr 'param'
$(document).on('change blur', "*[param]", function (event) {
  var $el = $(event.target);
  var name = $el.attr('name');
  var value = $el.val();
  API.setUrlParam(name, value);
});
$(document).on('keydown', 'input[param]', function (event) {
  if (event.type == 'keydown' && event.keyCode != 13) return;
  try{
    if (Drawer.shown || Render.modalShown) return;
  } catch(e) {/* try catch because maybe Render doesn't exist */}

  setTimeout(() => {
    API.setUrlParam('page', 1);
    var params = Object.assign(API.getUrlParams(), { page: 1 });
    API.load(API.getUrlParams());
  }, 150);
});
$(document).on('click', 'button[paramSubmit]', function (event) {
  setTimeout(() => {
    API.setUrlParam('page', 1);
    API.load(API.getUrlParams());
  }, 150);
});
$(document).on('click', 'button[paramClear]', function (event) {
  setTimeout(() => {
    window.location = location.href.split('?')[0];
  }, 150);
});
API.setPage = function(page) {
  API.setUrlParam('page', page);
  setTimeout(() => {
    API.load(API.getUrlParams());
  }, 150);
;}
API.setSort = function(sort, order) {
  API.setUrlParam('sort', sort);
  API.setUrlParam('order', order);
  setTimeout(() => {
    API.load(API.getUrlParams());
  }, 150);
}

API.init();

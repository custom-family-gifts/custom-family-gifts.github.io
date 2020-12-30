/* use this to call GCF to leverage AUTH & browser caching
  AUTH - all calls to GCF require a urlParam named cypherKey - which is generated by the current page URL route parameter q
  CACHE - all GET calls to GCF will be cached by {{z}}_{{method}}_{{cypherKey}}
*/
var API = {};

API.init = function() {
  // solve for z (url param)
  var paramSplit1 = location.href.split('?');
  var paramSplit2 = (paramSplit1[1]) ? paramSplit1[1].split('&') : [];
  API.z = (paramSplit2[0]) ? paramSplit2[0].split('=')[1] : null;
  // get rid of anchors (#)
  if (API.z) API.z = API.z.split('#')[0];
  // check for auth stored
  if (localStorage) API.zKey = localStorage.getItem(`key_${API.z}`);
}

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
  var cachedData = API.getCache(options.method);
  if (cachedData) {
    return options.onSuccess(cachedData);
  }

  // 2. check the browser for a auth key

  // 3. make the call
  var callURL = `https://us-central1-custom-family-gifts.cloudfunctions.net/v2-call?cypherKey=${API.zKey || API.z}&method=${options.method}`;
  $.ajax(callURL,{
    method: `${options.httpMethod}`,
    headers: (options.httpMethod == 'GET') ? {} : { "Content-Type": "application/json" }
  }).done(function(data, status, res) {
    if (res.status == 200) {
      if (localStorage) localStorage.setItem(`key_${API.z}`, data.key); // record auth key - to skip Airtable AUTH
      if (options.onSuccess) options.onSuccess(data);
      // save the cache
      API.saveCache(options.method, data);
    } else if (res.status == 202) {
      API.saveCache(options.method, data);
    } else {
      // fail condition
      if (options.onFailure) options.onFailure(data, res.status);
      API.clearCache(options.method);
    }
  });
};

// call this for main page renders
API.render = function(id, method) {
  var $div = $(`#${id}`);
  $div.html('<div class="spinner"></div>');

  API.call({
    method: 'v2-renderOrderProofs',
    onSuccess: (data) => {
      $div.html(data.result);
    },
    onFailure: (data) => {
      console.log('faile');
      $div.html(`oops.. 🤦‍♀️ something broke`);
    }
  });
}

/* Caching logic */
API.cacheExpire = 60000; // 60s
API.saveCache = function(method, data) {
  if (!localStorage) return;
  data.cacheDatetime = new Date().toISOString();
  localStorage.setItem(`${method}_${API.z}`, JSON.stringify(data));
}

API.getCache = function(method) {
  if (!localStorage) return;
  var cached = localStorage.getItem(`${method}_${API.z}`);
  if (cached) {
    var cacheData = JSON.parse(cached);
    // see how old cached copy is
    var cacheDatetime = new Date(cacheData.cacheDatetime);
    cacheData.cacheAgeMs = new Date() - cacheDatetime;
    delete cacheData.cacheDatetime;
    if (cacheData.cacheAgeMs < API.cacheExpire) {
      console.log('cachehit ' + method);
      return cacheData;
    }
  }
  return null;
}

API.clearCache = function(method) {
  if (!localStorage) return;
  localStorage.removeItem(`${method}_${API.z}`);
}

API.init();


var Drawer = {
  initted: false,
  apiCall: null,
  title: null,
  tabs: null,
  data: null,
  renderExtra: null,
  init: function(drawerObj) {
    if (!drawerObj.title) throw new Error('Drawer.init() requires title (data) => {}');
    if (!drawerObj.apiCall) throw new Error('Drawer.init() requires apiCall (params) => {}');
    if (!drawerObj.tabs) throw new Error('Drawer.init() requires tabs []');
    if (!drawerObj.renderOverview) throw new Error('Drawer.init() requires renderOverview (fn)');
    this.tabs = drawerObj.tabs;
    this.title = drawerObj.title;
    this.apiCall = drawerObj.apiCall;
    this.transformData = drawerObj.transformData;
    this.renderOverview = drawerObj.renderOverview;
    this.renderExtra = drawerObj.renderExtra;

    if (this.initted) return;
    $(() => {
      $(document).on('keydown', function(e) {
        if (e.keyCode == 27) {
          try {
            Drawer.hide();
          } catch (e) {/* do nothing */}
        }
      });
      $('body').append(`
        <style>
          #drawer {
            display: none;
            position: fixed;
            right: 0;
            top: 56px;
            background-color: white;
            height: calc(100% - 56px);
            width: 80vw;
            max-width: 600px;
            z-index: 9999;
            border-left: 1px solid #bbb;
          }
          #drawer * {
            font-size: 14px;
          }
          .drawerDiv {
            vertical-align: top;
          }
          #drawerOverlay {
            display: none;
            position: fixed;
            left:0;
            top: 56px;
            background-color: rgba(0,0,0,0.7);
            height: calc(100% - 56px);
            width: 100%;
            z-index: 9998;
          }
          body.showDrawer {
            overflow: hidden;
          }
          body.showDrawer #drawer, body.showDrawer #drawerOverlay {
            display: block;
          }
          #drawerNav, #drawerTitleBar {
            margin: 0;
            padding: 0;
            border-bottom: 1px solid #ddd;
            font-size: 0;
            background-color: #e3e3e3;
          }
          #drawerNav {
            border-top: 3px solid #ddd;
          }
          #drawerNav li, #drawerTitleBar li {
            display: inline-block;
            list-style: none;
            border-right: 1px solid #ddd;
            height: 40px;
            line-height: 40px;
            padding: 0px 15px;
            vertical-align: top;
            cursor: default;
            background-color: white;
          }
          #drawerNav li[onclick], #drawerTitleBar li[onclick] {
            cursor: pointer;
            color: rgba(0,0,0,0.6);
          }
          #drawerNav li[onclick]:hover, #drawerTitleBar li[onclick]:hover {
            color: rgba(0,0,0,0.9);
            background-color: #ffeded;
          }
          #drawerNav li[onclick].selected {
            background-color: white;
            opacity: 1;
            color: rgba(0,0,0,0.9);
            cursor: default;
            border-bottom: 3px solid #f8886d;
            box-sizing: border-box;
          }
          #drawerTitleBar li#drawerClose {
            width: 10px;
            text-align: center;
            font-size: 30px;
            line-height: 37px;
            padding: 0px;
            width: 40px;
            font-weight: 100;
            border-right: none;
            background-color: white;
          }
          #drawerTitle {
            font-weight: 600;
            padding: 0px 15px 0px 1px !important;
          }
          #drawerContents {
            height: calc(100% - 282px); /* 200px for overview, 41px for topNavbar, 41px for tabsNavbar */
            overflow-y: auto;
            overflow-x: hidden;
          }
          #drawerOverview {
            height: 200px;
            padding: 6px 11px;
          }
          .tabCount {
            font-size: 11px !important;
            padding: 2px 4px 2px 3px;
            background-color: #ddd;
            font-weight: 600;
          }
          .tabCount.hasCount {
            background-color: #f8886d;
            color: white;
          }
          #drawerExtra {
            position: absolute;
            left: -190px;
            width: 180px;
            padding: 5px;
            height: 100vh;
            overflow-y: auto;
          }
          #drawerContents .card {
            padding: 4px 8px;
            width: 90%;
            display: inline-block;
            margin: 7px 0px 0px 7px;
            vertical-align: top;
          }
          #drawerContents .card-title {
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            font-size: 12px;
            border-bottom: 1px solid #ddd;
            line-height: 20px;
            padding-bottom: 3px;
          }
          .drawerLoadingOverlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.5);
            top: 0;
            left: 0;
            z-index: 9999;
            display: none;
          }
          #drawer progress {
            height: 39px;
            border: 15px solid #f1f1f1;
            margin-top: 0;
          }
          #drawer.loading .drawerLoadingOverlay{
            display: block;
          }
          #drawer.modalLoading .drawerLoadingOverlay {
            display: block;
          }
          #drawer.modalLoading progress {
            display: none;
          }
          progress::-webkit-progress-value {
            transition: 1s width;
          }
          #drawerContents .column {
            margin:0;
            padding: 0;
            display: inline-block;
            width: 50%;
            vertical-align: top;
          }
        </style>
      `);
      $('body').append('<div id="drawerOverlay"></div>');
      $('body').append(`
        <div id="drawer">
          <div class="drawerLoadingOverlay">
            <progress id="drawerLoadingProgress" style="transition: all 0.5s ease;" class="primary" value="450" max="1000"></progress>
          </div>
          <div id="drawerExtra">
          </div>
          <ul id="drawerTitleBar">
            <li id="drawerClose" onclick="Drawer.hide();">×</li>
            <li id="drawerTitle"></li>
          </ul>

          <div id="drawerOverview"></div>

          <ul id="drawerNav">
          </ul>

          <div id="drawerContents"></div>
        </div>
      `);
      this.initted = true;

      // check to see if drawer should open by looking for drawer params
      var drawerParams = this.getParams();
      if (Object.keys(drawerParams).length) {
        this.load(drawerParams);
      }
    });
  },
  loadProgress: 0,
  loadProgressBegin: () => {
    var $bar = $('#drawerLoadingProgress');
    Drawer.loadProgress = 0;
    $bar.attr('value', 0);
    Drawer.loadProgressInterval = setInterval(() => {
      var progressRemaining = 950 - Drawer.loadProgress; // not 1000 so it never gets THAT close
      var percent = 6;
      var rand = 3 * Math.random(); // 0-10
      percent += rand;
      var progress = progressRemaining * (percent / 100);

      Drawer.loadProgress += progress;
      $bar.attr('value', Drawer.loadProgress);
    }, 150);
  },
  loadProgressEnd: () => {
    clearInterval(Drawer.loadProgressInterval);
  },
  reload: function() {
    var params = Drawer.getParams();
    Drawer.load(params);
  },
  shown: false,
  load: function(params) {
    Drawer.loadProgressBegin();
    if (Modal.shown) {
      Modal.hide();
    }
    this.paramsToUrl(params);
    this.show();
    this.data = null;
    this.clearTabButtons();
    $('#drawer').addClass("loading");
    $('#drawerTitle').text('loading...')
    $('#drawerExtra').append('<div class="drawerLoadingOverlay"></div>')
    var callObj = Object.assign({
      cacheMS: 0,
      onSuccess: (data) => {
        if (Drawer.transformData && typeof Drawer.transformData == 'function') {
          data = Drawer.transformData(data);
        }
        var urlParams = API.getUrlParams();
        var currentTab = 0;
        if (urlParams.drawerTabIndex) {
          currentTab = +urlParams.drawerTabIndex;
        }
        Drawer.data = data;
        Drawer.renderTabButtons(data);
        var overviewHtml = Drawer.renderOverview(data);
        $('#drawerOverview').html(overviewHtml);
        Drawer.renderTab(currentTab);
        $('#drawerTitle').html(Drawer.title(data));
        if (Drawer.renderExtra && typeof Drawer.renderExtra == 'function') {
          $('#drawerExtra').html(Drawer.renderExtra(data))
        }
        Render.toLocalTime();
        $('#drawer').removeClass("loading");
        Drawer.loadProgressEnd();
      },
      onFailure: (data) => {
        $('#drawer').removeClass("loading");
        $('#drawerContents').html(`
          <div>💥 something went wrong... try again in a few</div>
        `);
        $('#drawerExtra').html('');
        Drawer.loadProgressEnd();
      }
    }, this.apiCall(params));
    API.call(callObj);
  },
  show: function() {
    Drawer.shown = true;
    $('body').addClass('showDrawer');
  },
  hide: function() {
    Drawer.shown = false;
    Render.selectedIdsReset();
    $('#drawerContents').html('');
    $('#drawerExtra').html('');
    $('#drawerOverview').html('');
    $('body').removeClass('showDrawer');
    // clear url Params
    var urlParams = API.getUrlParams();
    for (var key in urlParams) {
      if (key.substring(0,7) == 'drawer_') delete urlParams[key];
      if (key == 'drawerTabIndex') delete urlParams[key];
    }
    API.paramsToUrl(urlParams);
    // drawer stuff
    if (Render.modalShown) Render.modalHide();

  },
  clearTabButtons: function() {
    var $nav = $('ul#drawerNav');
    // clear out old tabs
    $nav.find('.drawerTab').remove();
  },
  renderTabButtons: function (data) {
    var $nav = $('ul#drawerNav');
    // clear out old tabs
    $nav.find('.drawerTab').remove();
    Drawer.tabs.forEach((tab, i) => {
      var tabTitle = tab.name;
      if (typeof tab.name == 'function') tabTitle = tab.name(data);
      $nav.append(`<li class="drawerTab" tab="${i}" onclick="Drawer.renderTab(${i})">${tabTitle}</li>`)
    });
  },
  renderTab: function(tabIndex) {
    // store the tabIndex in arguments
    API.setUrlParam('drawerTabIndex', tabIndex);

    var html = Drawer.tabs[tabIndex].render(Drawer.data);
    $('#drawerContents').html(html);
    $('.drawerTab.selected').removeClass('selected');
    $(`.drawerTab[tab=${tabIndex}]`).addClass('selected');
    Render.toLocalTime();
  },
  renderTabCount: function(count) {
    return `<span class="tabCount ${(count) ? 'hasCount' :''}">${count}</span>`;
  },
  paramsToUrl: function(params) {
    var allParams = API.getUrlParams();

    // drawer params get key appended in front
    var drawerParams = {}
    for (var key in params) {
      // history.pushState({},"URL Rewrite Example","https://stackoverflow.com/example")
      allParams[`drawer_${key}`] = params[key];
    }
    API.paramsToUrl(allParams);
  },
  getParams: function() {
    var allParams = API.getUrlParams();
    var normalParams = {};
    for (var key in allParams) {
      if (key.substring(0,7) == 'drawer_') {
        normalParams[key.substring(7,999)] = allParams[key];
      }
    }
    return normalParams;
  }
};

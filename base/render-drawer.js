
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
            padding: 6px 11px;
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
        </style>
      `);
      $('body').append('<div id="drawerOverlay"></div>');
      $('body').append(`
        <div id="drawer">
          <div id="drawerExtra"></div>
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
  load: function(params) {
    console.log('load', params);
    this.paramsToUrl(params);

    this.show();
    this.data = null;
    this.clearTabButtons();
    $('#drawerOverview').html('<div class="spinner"></div>');
    $('#drawerTitle').text('loading...')
    $('#drawerContents').html('<div class="spinner"></div>');
    $('#drawerExtra').html('');
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
        $('#drawerTitle').text(Drawer.title(data));
        if (Drawer.renderExtra && typeof Drawer.renderExtra == 'function') {
          $('#drawerExtra').html(Drawer.renderExtra(data))
        }
        Render.toLocalTime();
      },
      onFailure: (data) => {
        $('#drawerContents').html(`
          <div>💥 something went wrong... try again in a few</div>
        `);
        $('#drawerExtra').html('');
      }
    }, this.apiCall(params));
    API.call(callObj);
  },
  show: function() {
    $('body').addClass('showDrawer');
  },
  hide: function() {
    Render.selectedIdsReset();
    $('body').removeClass('showDrawer');
    // clear url Params
    var urlParams = API.getUrlParams();
    for (var key in urlParams) {
      if (key.substring(0,7) == 'drawer_') delete urlParams[key];
      if (key == 'drawerTabIndex') delete urlParams[key];
    }
    API.paramsToUrl(urlParams);
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

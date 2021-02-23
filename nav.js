var Nav = {
  parents: [ // when the parent is clicked on will nav to first child
    { name: 'service', pages: [
      { name: "freshdesk", page: 'freshdesk' },
      { name: "orders", page: 'service_order' }
    ]},
    { name: 'tech', pages: [
      { name: 'api errors', page: 'api_error_log' },
      { name: 'etsy send msg', page: 'etsy_send_msg' }
    ]},
  ]
};

Login = {
  success: (code, user) => {
    if (localStorage) localStorage.setItem(`LoginCode`, code);
    if (localStorage) localStorage.setItem('LoginUser', user);
    var currentNav = getCurrentNav();
    var ref = `${getNavUrl(currentNav.page, Nav.parents[0].pages[0].page)}`;
    var refSplit = window.location.search.split('?ref=');
    if (refSplit.length > 1) {
      ref = decodeURIComponent(refSplit[1]);
    }
    window.location.assign(ref);
  },
  fail: () => {
    if (localStorage) localStorage.removeItem(`LoginCode`);
    if (localStorage) localStorage.removeItem('LoginUser');
  },
  init: () => {
    var currentNav = getCurrentNav();
    // check localstorage for code
    if (localStorage) Login.code = localStorage.getItem(`LoginCode`) || null;
    if (localStorage) Login.user = localStorage.getItem('LoginUser') || null;

    // see if we logged in
    if (Login.code || currentNav.page == 'service_login') return; // all good - nothing to do;
    // GOT HERE? Uh Oh, not logged in
    var referrer = encodeURIComponent(window.location.href);
    window.location.assign(getNavUrl(currentNav.page, 'service_login') + `?ref=${referrer}`);
  },
  code: null,
  user: null
};
Login.init();

function getCurrentNav() {
  var currentPage = window.location.pathname.split('/').reverse()[0].replace('.html', ''); // desk dev has .html
  var hasHtml = Boolean(window.location.pathname.indexOf('.html') > 0);
  var currentParent = '';
  var currentParentObj = null;
  var currentPageObj = null;
  Nav.parents.forEach((parent) => {
    parent.pages.forEach((page) => {
      if (page.page == currentPage) {
         currentParent = parent.name;
         currentParentObj = parent;
         currentPageObj = page;
      }
    });
  });
  return {
    parent: currentParent,
    parentObj: currentParentObj,
    page: currentPage,
    pageObj: currentPageObj
  };
}
function getNavUrl(currentPage, navPage) {
  var urlWithoutParams = window.location.href.replace(window.location.search, '');
  return urlWithoutParams.replace(currentPage, navPage);
}

const NavCss = `
  <style>
    #content_header a {
      padding-top: 14px;
      font-size: 0.9em;
    }
    #content_header > a.selected {
      border-bottom: 2px solid #f78c72;
    }
    #parentNav {
      position: absolute;
      top: 0;
      left: 60px;
      z-index: 99;
      text-transform: uppercase;
      font-size: 0.8em;
    }
    #parentNav a {
      padding: 0 9px;
      opacity: 0.5;
    }
    #parentNav a.selected {
      opacity: 1;
    }
    #parentNav a b {
      display: none;
    }
    #parentNav a.selected b {
      color: #fe7c5d;
      margin-right: 4px;
      display: inline-block;
    }
  </style>
`;

// requires render.js
if (typeof Render == 'undefined') var Render = {}; // when called from service_login there is no Render obj
Render.serviceNav = () => {
  var currentNav = getCurrentNav();
  var parentNavHtml = ``;
  var childNavHtml = ``;
  // render parent Nav
  Nav.parents.forEach(parent => {
    var isCurrentParent = (parent.name == currentNav.parent);
    parentNavHtml += `<a href="${getNavUrl(currentNav.page, parent.pages[0].page)}" class="${(isCurrentParent) ? 'selected' : ''}">${(isCurrentParent) ? '<b class="dot">•</b>' : ''}${parent.name}</a>`;
  });
  // calculate child nav
  console.log(currentNav);
  currentNav.parentObj.pages.forEach(page => {
    childNavHtml += `<a href="${getNavUrl(currentNav.page, page.page)}" class="button ${(page.name == currentNav.page) ? 'selected' : ''}" style="">${page.name}</a>`;
  });
  var result = `
    ${NavCss}
    <header id="content_header">
      <img id="cfgLogo" src="https://cdn.shopify.com/s/files/1/0060/6725/7434/files/heart.png?v=1607199816">

      <div id="parentNav">
        ${parentNavHtml}
      </div>
      ${childNavHtml}

      <a href="#" class="button" style="float:right">🙋‍♀️ ${Login.user}</a>
    </header>
  `;
  return result;
};

$(() => {
  if(!Render.try) return;
  $('#content_header').html(Render.try('serviceNav'));
});

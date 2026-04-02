import { Auth }           from './auth.js';
import { Router }         from './router.js';
import { Nav }            from './components/nav.js';
import { PageController } from './components/page-controller.js';
import { Toast }          from './components/toast.js';
import { routes }         from '../routes.js';

await Auth.init();

const router = new Router(routes);
const nav = new Nav(routes, router);

nav.mount(document.getElementById('nav'));

const toastEl = document.createElement('div');
document.body.appendChild(toastEl);
window._Toast = new Toast();
window._Toast.mount(toastEl);

let currentController = null;

router.on((route) => {
  currentController?.destroy();
  currentController = new PageController(route.page, document.getElementById('page'));
});

router.start();

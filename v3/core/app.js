import { Auth }           from './auth.js';
import { Router }         from './router.js';
import { Nav }            from './components/nav.js';
import { PageController } from './components/page-controller.js';
import { routes }         from '../routes.js';

await Auth.init();

const router = new Router(routes);
const nav = new Nav(routes, router);

nav.mount(document.getElementById('nav'));

let currentController = null;

router.on((route) => {
  currentController?.destroy();
  currentController = new PageController(route.page, document.getElementById('page'));
});

router.start();

import { test }   from './pages/test.js';
import { orders } from './pages/orders.js';

// Each route becomes a nav item automatically.
// Add a new page by adding one entry here.
export const routes = [
  { path: 'orders', label: 'Orders', icon: '📦', page: orders },
  { path: 'test',   label: 'Test Page', icon: '🧪', page: test },
];

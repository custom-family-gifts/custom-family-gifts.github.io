import { orders }    from './pages/orders.js';
import { scheduled } from './pages/scheduled.js';

// Each route becomes a nav item automatically.
// Add a new page by adding one entry here.
export const routes = [
  { path: 'orders',    label: 'Orders',    icon: '📦', page: orders },
  { path: 'scheduled', label: 'Scheduled', icon: '⏰', page: scheduled },
];

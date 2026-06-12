import { orders }      from './pages/orders.js';
import { scheduled }   from './pages/scheduled.js';
import { apiErrorLog } from './pages/api-error-log.js';

// Each route becomes a nav item automatically.
// Add a new page by adding one entry here.
export const routes = [
  { path: 'orders',        label: 'Orders',        icon: '📦', section: 'Service', page: orders },
  { path: 'scheduled',     label: 'Scheduled',     icon: '⏰', section: 'Tech',    page: scheduled },
  { path: 'api-error-log', label: 'API Error Log', icon: '🚨', section: 'Tech',    page: apiErrorLog },
];

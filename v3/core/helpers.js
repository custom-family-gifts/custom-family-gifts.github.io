export function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return phone;
}

// M-D H:mm AM/PM  (current year)  or  M-D-YY H:mm AM/PM  (other year)
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const currentYear = new Date().getFullYear();
  const yy = String(d.getFullYear()).slice(-2);
  const M = d.getMonth() + 1;
  const D = d.getDate();
  let H = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ampm = H >= 12 ? 'PM' : 'AM';
  H = H % 12 || 12;
  const datePart = d.getFullYear() === currentYear ? `${M}-${D}` : `${M}-${D}-${yy}`;
  return `${datePart} ${H}:${mm} ${ampm}`;
}

// Relative readout using the 2 most significant non-zero units.
// e.g. "4 months 22 days ago", "4 hours 23 minutes ago", "15 minutes 23 seconds ago"
export function formatAgo(date) {
  const then = date instanceof Date ? date : new Date(date);
  if (isNaN(then)) return '';
  const now = new Date();

  let from = then, to = now, suffix = 'ago';
  if (then > now) { from = now; to = then; suffix = 'from now'; }

  let years   = to.getFullYear() - from.getFullYear();
  let months  = to.getMonth()    - from.getMonth();
  let days    = to.getDate()     - from.getDate();
  let hours   = to.getHours()    - from.getHours();
  let minutes = to.getMinutes()  - from.getMinutes();
  let seconds = to.getSeconds()  - from.getSeconds();

  if (seconds < 0) { seconds += 60; minutes--; }
  if (minutes < 0) { minutes += 60; hours--; }
  if (hours   < 0) { hours   += 24; days--; }
  if (days    < 0) {
    const daysInPrevMonth = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    days += daysInPrevMonth; months--;
  }
  if (months  < 0) { months += 12; years--; }

  const units = [
    ['year', years], ['month', months], ['day', days],
    ['hour', hours], ['minute', minutes], ['second', seconds],
  ].filter(([, n]) => n > 0);

  const picked = (units.length ? units : [['second', 0]]).slice(0, 2);
  const label = picked.map(([unit, n]) => `${n} ${unit}${n === 1 ? '' : 's'}`).join(' ');
  return `${label} ${suffix}`;
}

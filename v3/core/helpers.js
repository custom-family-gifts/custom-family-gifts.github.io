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

/** Older cached PostgreSQL timestamps also need normalization on Hermes. */
export function messageDate(value: string) {
  let iso=value.trim().replace(/^(\d{4}-\d{2}-\d{2}) /,'$1T').replace(/(\.\d{3})\d+/,'$1');
  if(/T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(iso))iso+='Z';
  return new Date(iso.replace(/([+-]\d{2})$/,'$1:00'));
}

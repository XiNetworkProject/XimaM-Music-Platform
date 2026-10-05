/** Reject late responses after a filter/account change, blur or mutation. */
export function createNotificationRequestGate() {
  let version = 0;
  return {
    begin() { const request = ++version; return () => request === version; },
    invalidate() { version += 1; },
  };
}

let owner: symbol | null = null;
export function acquireMicrophone() {
  if (owner) return null;
  const lease = Symbol('microphone'); owner = lease;
  return () => { if (owner === lease) owner = null; };
}

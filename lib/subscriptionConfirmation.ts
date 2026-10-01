/** A return URL alone never proves a payment or an entitlement. */
export function subscriptionConfirmed(verified:boolean, payload:unknown):boolean {
  const p=payload as {hasSubscription?:boolean;userSubscription?:{status?:string}}|null;
  return verified && p?.hasSubscription===true && ['active','trialing'].includes(p.userSubscription?.status||'');
}

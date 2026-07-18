export function diagnosticsEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_DIAGNOSTIC_ROUTES === 'true';
}

export function diagnosticsEnabled() {
  return process.env.NODE_ENV !== 'production';
}

const DIAGNOSTIC_PAGE_SEGMENT = /^(?:debug(?:-|$)|test(?:-|$)|diagnostic(?:-|$)|dev(?:-|$)|playground(?:-|$)|sandbox(?:-|$))/i;

export function isDiagnosticPagePath(pathname: string) {
  const firstSegment = pathname.split('/').filter(Boolean)[0] || '';
  return DIAGNOSTIC_PAGE_SEGMENT.test(firstSegment);
}

export function shouldBlockDiagnosticPage(pathname: string, environment = process.env.NODE_ENV) {
  return environment === 'production' && isDiagnosticPagePath(pathname);
}

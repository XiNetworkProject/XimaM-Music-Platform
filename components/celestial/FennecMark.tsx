/** Shared vector signature. No client runtime or sprite animation. */
export default function FennecMark({ className = '', width, height }: { className?: string; width?: number; height?: number }) {
  return <svg className={className} width={width} height={height} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false"><path d="M7 5c8 2 12 7 17 13C29 12 33 7 41 5c1 11-1 18-6 22l3 8-14 9-14-9 3-8C8 23 6 16 7 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="m11 11 5 11M37 11l-5 11m-17 8 4 2m14-2-4 2m-7 5 2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="m24 22 1.1 3.2L28 26l-2.9.8L24 30l-1.1-3.2L20 26l2.9-.8Z" fill="currentColor"/></svg>;
}

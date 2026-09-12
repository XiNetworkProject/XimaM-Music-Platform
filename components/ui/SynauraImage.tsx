'use client';

import { useState, type ImgHTMLAttributes } from 'react';

/** Presentation fallback only: the original failed request remains visible to monitoring. */
export function SynauraImage({ src, alt, fallbackSrc = '/default-cover.svg', onError, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc?: string }) {
  const [failedSource, setFailedSource] = useState<string>();
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const failed = !src || failedSource === src;
  if (failed && fallbackFailed) {
    return <span role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} className={`inline-block bg-[var(--syn-surface-muted)] ${props.className || ''}`} style={props.style} />;
  }
  return <img {...props} alt={alt || ''} src={failed ? fallbackSrc : src} srcSet={failed ? undefined : props.srcSet} onError={event => {
    onError?.(event);
    if (failed) setFallbackFailed(true);
    else { setFailedSource(src); setFallbackFailed(false); }
  }} />;
}

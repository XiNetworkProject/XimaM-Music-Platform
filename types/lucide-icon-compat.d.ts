import type { ReactElement } from 'react';

/**
 * lucide-react 0.292 exposes an icon named `LucideIcon`, which TypeScript 5.9
 * may resolve as a namespace when it is imported as a type. Merge a callable
 * component signature into that namespace so dynamic icon collections remain
 * correctly typed without changing runtime exports.
 */
declare module 'lucide-react' {
  interface LucideIcon {
    (props: { className?: string }): ReactElement | null;
  }
}

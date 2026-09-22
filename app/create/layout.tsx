import type { ReactNode } from 'react';

/** /create is now only an entry URL; no page-specific chrome or animation. */
export default function CreateLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="celestial-auth-route" data-v2-area="auth">{children}</div>
  );
}

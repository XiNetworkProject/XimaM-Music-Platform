import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#eef0f3] text-[#171313]">
      <div className="fixed inset-0 bg-[linear-gradient(135deg,rgba(255,111,97,0.14)_0%,transparent_28%),linear-gradient(225deg,rgba(124,92,255,0.12)_0%,transparent_30%),linear-gradient(20deg,rgba(0,194,203,0.10)_0%,transparent_32%),linear-gradient(135deg,#f8f9fb_0%,#eef0f3_52%,#f5f0ea_100%)]" />
      <div className="fixed inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(58,59,64,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(58,59,64,0.14)_1px,transparent_1px)] [background-size:38px_38px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-3 sm:p-6">
        {children}
      </div>
    </div>
  );
}

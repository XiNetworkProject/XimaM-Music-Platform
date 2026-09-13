export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <div className="v2-personal v2-personal--stats" data-v2-area="stats">{children}</div>;
}



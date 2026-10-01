'use client';
import SynauraUniversalSearch from '@/components/synaura/SynauraUniversalSearch';
import NotificationCenter from '@/components/NotificationCenter';
/** Legacy route chrome delegates to the same search engine and accessible input. */
export default function TopSearchBar() {
  return (
    <div className="v2-service-search sticky top-0 z-40 px-4 py-3">
      <div className="flex items-center gap-3">
        <SynauraUniversalSearch compact />
        <NotificationCenter />
      </div>
    </div>
  );
}

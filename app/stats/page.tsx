import { Suspense } from "react";
import CreatorAnalytics from "@/components/analytics/CreatorAnalytics";

export default function StatsPage() {
  return (
    <Suspense fallback={<div role="status">Chargement des statistiques…</div>}>
      <CreatorAnalytics />
    </Suspense>
  );
}

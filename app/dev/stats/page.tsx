import { Suspense } from "react";
import { notFound } from "next/navigation";
import StatsLab from "./StatsLab";
export default function StatsLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={<p>Chargement de l’aperçu…</p>}>
      <StatsLab clock={new Date().toISOString()} />
    </Suspense>
  );
}

"use client";
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import CreatorAnalytics from "@/components/analytics/CreatorAnalytics";
import { demoAnalytics } from "./fixture";
import JourneyLab from './JourneyLab';
export default function StatsLab({ clock }: { clock: string }) {
  const params = useSearchParams();
  const empty = params.get("empty") === "1";
  const factory = useCallback(
    (query: string) => demoAnalytics(query, empty, new Date(clock)),
    [empty, clock]
  );
  return params.get('journeys')==='1' ? <JourneyLab /> : <CreatorAnalytics demoFactory={factory} />;
}

"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Download, Loader2 } from "lucide-react";
import { SynauraImage } from "@/components/ui/SynauraImage";
import {
  comparisonCsv,
  comparisonQuery,
} from "@/lib/creatorAnalytics/insights";
import {
  formatAnalyticsNumber as fmt,
  metricValue,
  type AnalyticsMetric,
  type CreatorAnalytics,
} from "@/lib/creatorAnalytics/model";
import { useCreatorAnalytics } from "./useCreatorAnalytics";
import AnalyticsChart from "./AnalyticsChart";

type Props = {
  report: CreatorAnalytics;
  owner: string | null;
  query: string;
  refresh: number;
  selected: [string, string];
  onSelect: (ids: [string, string]) => void;
  demoFactory?: (query: string) => CreatorAnalytics;
};
const metrics = [
  ["plays", "Écoutes"],
  ["listeners", "Auditeurs"],
  ["likes", "J’aime"],
  ["completion", "Jusqu’au bout"],
] as const;

/** Mounted only in the comparison tab: exactly two bounded, cancellable reads. */
export default function AnalyticsComparison({
  report,
  owner,
  query,
  refresh,
  selected,
  onSelect,
  demoFactory,
}: Props) {
  const first =
    report.tracks.find((t) => t.id === selected[0]) || report.tracks[0];
  const second =
    report.tracks.find((t) => t.id === selected[1] && t.id !== first?.id) ||
    report.tracks.find((t) => t.id !== first?.id);
  const queryA = comparisonQuery(query, first?.id || ""),
    queryB = comparisonQuery(query, second?.id || "");
  const demoA = useMemo(
    () => (first ? demoFactory?.(queryA) : undefined),
    [demoFactory, queryA, first?.id]
  );
  const demoB = useMemo(
    () => (second ? demoFactory?.(queryB) : undefined),
    [demoFactory, queryB, second?.id]
  );
  const a = useCreatorAnalytics(
    first && second ? owner : null,
    queryA,
    refresh,
    demoA
  );
  const b = useCreatorAnalytics(
    first && second ? owner : null,
    queryB,
    refresh,
    demoB
  );
  const [metric, setMetric] = useState<AnalyticsMetric>("plays");
  const [message, setMessage] = useState("");
  if (!first || !second)
    return (
      <section className="analytics-panel analytics-state">
        <h2>Deux sons, un regard neuf.</h2>
        <p>
          Il faut au moins deux morceaux dans cette sélection pour les comparer.
          Essaie « Tous les sons ».
        </p>
      </section>
    );
  const ready =
    a.data &&
    b.data &&
    a.data.period.start === b.data.period.start &&
    a.data.period.end === b.data.period.end;
  const download = () => {
    if (!a.data || !b.data || !ready) return;
    const url = URL.createObjectURL(
      new Blob([comparisonCsv(a.data, b.data, first.title, second.title)], {
        type: "text/csv;charset=utf-8;",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `synaura-${
      demoFactory ? "demo-" : ""
    }comparaison-${report.period.start.slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Comparaison exportée.");
  };
  return (
    <section className="analytics-comparison">
      <div className="analytics-section-intro">
        <div>
          <span className="analytics-eyebrow">DEUX SONS. LA MÊME ÉCHELLE.</span>
          <h2>Qu’est-ce qui fait la différence ?</h2>
          <p>
            La même période, les mêmes mesures. Pas de courbes artificiellement
            normalisées.
          </p>
        </div>
        <button type="button" onClick={download} disabled={!ready}>
          <Download size={16} />
          Exporter la comparaison
        </button>
      </div>
      <div className="analytics-compare-pickers">
        {[first, second].map((track, index) => (
          <label key={index} data-series={index ? "b" : "a"}>
            <span className="analytics-series-badge">{index ? "B" : "A"}</span>
            <SynauraImage
              src={track.cover || "/default-cover.svg"}
              alt=""
              className="analytics-cover"
            />
            <span>
              <small>Morceau {index ? "B" : "A"}</small>
              <select
                aria-label={`Morceau ${index ? "B" : "A"}`}
                value={track.id}
                onChange={(e) =>
                  onSelect(
                    index
                      ? [first.id, e.target.value]
                      : [e.target.value, second.id]
                  )
                }
              >
                {report.tracks.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.id === (index ? first.id : second.id)}
                  >
                    {t.title}
                  </option>
                ))}
              </select>
            </span>
          </label>
        ))}
      </div>
      {a.error || b.error ? (
        <div role="alert" className="analytics-panel analytics-state">
          <h2>Comparaison indisponible</h2>
          <p>{a.error || b.error}</p>
          <p>
            Actualise pour réessayer. Aucun chiffre manquant n’est remplacé par
            zéro.
          </p>
        </div>
      ) : !ready ? (
        <div className="analytics-panel analytics-state" role="status">
          <Loader2 size={24} />
          <p>On rapproche les deux morceaux…</p>
        </div>
      ) : (
        <>
          <section className="analytics-panel">
            <div
              className="analytics-compare-metrics"
              role="group"
              aria-label="Mesure de comparaison"
            >
              {metrics.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={metric === key}
                  onClick={() => setMetric(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="analytics-head-to-head">
              {[a.data!, b.data!].map((data, index) => (
                <div key={index} data-series={index ? "b" : "a"}>
                  <small>{index ? second.title : first.title}</small>
                  <strong>
                    {fmt(
                      metricValue(data.current, metric),
                      metric === "completion"
                    )}
                  </strong>
                  <span>{metrics.find(([key]) => key === metric)?.[1]}</span>
                </div>
              ))}
              <span aria-hidden="true" className="analytics-versus">
                vs
              </span>
            </div>
            <AnalyticsChart
              current={a.data!.daily}
              previous={b.data!.daily}
              metric={metric}
              compare
              currentLabel={`A · ${first.title}`}
              previousLabel={`B · ${second.title}`}
            />
            <p className="analytics-footnote">
              Les audiences peuvent se recouper : n’additionne pas leurs
              uniques. « Jusqu’au bout » reste une mesure de parcours regroupés,
              disponible à partir de cinq parcours.
            </p>
          </section>
          <div className="analytics-panel analytics-comparison-facts">
            <ArrowRight size={18} />
            <p>
              {a.data!.current.plays === b.data!.current.plays
                ? "Les deux morceaux ont le même nombre de départs enregistrés."
                : `${
                    a.data!.current.plays > b.data!.current.plays
                      ? first.title
                      : second.title
                  } compte ${fmt(
                    Math.abs(a.data!.current.plays - b.data!.current.plays)
                  )} départs enregistrés de plus sur la période.`}{" "}
              <span>
                Ce constat ne mesure ni la qualité artistique ni l’exposition
                reçue.
              </span>
            </p>
          </div>
        </>
      )}
      <p className="sr-only" role="status">
        {message}
      </p>
    </section>
  );
}

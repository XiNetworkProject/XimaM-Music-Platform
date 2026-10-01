"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  analyticsDate,
  formatAnalyticsNumber as fmt,
  metricValue,
  type AnalyticsMetric,
  type AnalyticsPoint,
} from "@/lib/creatorAnalytics/model";

export default function AnalyticsChart({
  current,
  previous,
  metric,
  compare,
  currentLabel = "Période sélectionnée",
  previousLabel = "Période précédente",
}: {
  current: AnalyticsPoint[];
  previous: AnalyticsPoint[];
  metric: AnalyticsMetric;
  compare: boolean;
  currentLabel?: string;
  previousLabel?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const [chartWidth, setChartWidth] = useState(860);
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const measure = () =>
      setChartWidth(Math.max(240, element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const values = current.map((point) => metricValue(point, metric));
  const oldValues = compare
    ? previous.map((point) => metricValue(point, metric))
    : [];
  // Both series must share an axis. Independently normalized charts mislead.
  const maximum =
    metric === "completion"
      ? 100
      : Math.max(
          4,
          ...values.map((v) => v || 0),
          ...oldValues.map((v) => v || 0)
        );
  const width = chartWidth,
    height = 220,
    left = 44,
    right = 12,
    top = 14,
    bottom = 28;
  const x = (i: number) =>
    left + (i / Math.max(1, values.length - 1)) * (width - left - right);
  const y = (v: number) =>
    height - bottom - (v / maximum) * (height - bottom - top);
  const path = (points: Array<number | null>) => {
    let pen = false;
    return points
      .map((v, i) => {
        if (v === null) {
          pen = false;
          return "";
        }
        const s = `${pen ? "L" : "M"}${x(i)},${y(v)}`;
        pen = true;
        return s;
      })
      .join(" ");
  };
  const active = Math.min(current.length - 1, hover ?? current.length - 1);
  const selected = current[active],
    old = previous[active];
  const percent = metric === "completion";
  return (
    <div className="analytics-chart">
      <div className="analytics-chart-readout" aria-live="polite">
        <span>{selected ? analyticsDate(selected.date) : "Aucune mesure"}</span>
        <strong>
          {selected ? fmt(metricValue(selected, metric), percent) : "—"}
        </strong>
        {compare && old && (
          <small>
            {analyticsDate(old.date)} : {fmt(metricValue(old, metric), percent)}
          </small>
        )}
      </div>
      <svg
        ref={chartRef}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Évolution quotidienne, valeurs détaillées dans le tableau ci-dessous"
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setHover(
            Math.max(
              0,
              Math.min(
                values.length - 1,
                Math.round(
                  ((((event.clientX - bounds.left) / bounds.width) * width -
                    left) /
                    (width - left - right)) *
                    (values.length - 1)
                )
              )
            )
          );
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`chart-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--analytics-accent)"
              stopOpacity=".22"
            />
            <stop
              offset="100%"
              stopColor="var(--analytics-accent)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={left}
              x2={width - right}
              y1={y(maximum * ratio)}
              y2={y(maximum * ratio)}
              stroke="currentColor"
              opacity=".1"
            />
            <text
              x={left - 8}
              y={y(maximum * ratio) + 4}
              textAnchor="end"
              className="analytics-axis"
            >
              {maximum >= 1000
                ? `${+((maximum * ratio) / 1000).toFixed(1)}k`
                : Math.round(maximum * ratio)}
              {percent ? "%" : ""}
            </text>
          </g>
        ))}
        {values.length > 1 && values.every((v) => v !== null) && (
          <path
            d={`${path(values)} L${x(values.length - 1)},${y(0)} L${x(0)},${y(
              0
            )} Z`}
            fill={`url(#chart-${id})`}
          />
        )}
        {compare && (
          <path
            d={path(oldValues)}
            fill="none"
            stroke="var(--analytics-compare)"
            strokeDasharray="5 6"
            strokeWidth="2"
          />
        )}
        <path
          className="analytics-chart-line"
          d={path(values)}
          fill="none"
          stroke="var(--analytics-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {selected && values[active] !== null && (
          <g>
            <line
              x1={x(active)}
              x2={x(active)}
              y1={top}
              y2={height - bottom}
              stroke="var(--analytics-accent)"
              opacity=".25"
            />
            <circle
              cx={x(active)}
              cy={y(values[active]!)}
              r="5"
              fill="var(--analytics-accent)"
              stroke="var(--syn-surface)"
              strokeWidth="3"
            />
          </g>
        )}
        {[0, Math.floor((current.length - 1) / 2), current.length - 1]
          .filter((v, i, a) => v >= 0 && a.indexOf(v) === i)
          .map((i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 4}
              textAnchor={
                i === 0 ? "start" : i === current.length - 1 ? "end" : "middle"
              }
              className="analytics-axis"
            >
              {analyticsDate(current[i].date)}
            </text>
          ))}
      </svg>
      <input
        className="analytics-chart-slider"
        type="range"
        min="0"
        max={Math.max(0, current.length - 1)}
        value={Math.max(0, active)}
        onChange={(e) => setHover(Number(e.target.value))}
        aria-label="Jour inspecté sur le graphique"
        aria-valuetext={
          selected
            ? `${analyticsDate(selected.date)} : ${fmt(
                metricValue(selected, metric),
                percent
              )}`
            : "Aucune donnée"
        }
      />
      <div className="analytics-chart-legend">
        <span>
          <i />
          {currentLabel}
        </span>
        {compare && (
          <span>
            <i />
            {previousLabel}
          </span>
        )}
        <small>Jours complets · UTC</small>
      </div>
      <details className="analytics-data-table">
        <summary>Voir les valeurs jour par jour</summary>
        <div
          className="analytics-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Valeurs quotidiennes"
        >
          <table>
            <thead>
              <tr>
                <th>Date UTC</th>
                <th>{currentLabel}</th>
                {compare && <th>{previousLabel}</th>}
              </tr>
            </thead>
            <tbody>
              {current.map((point, i) => (
                <tr key={point.date}>
                  <td>{analyticsDate(point.date)}</td>
                  <td>{fmt(metricValue(point, metric), percent)}</td>
                  {compare && (
                    <td>
                      {previous[i]
                        ? `${analyticsDate(previous[i].date)} : ${fmt(
                            metricValue(previous[i], metric),
                            percent
                          )}`
                        : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

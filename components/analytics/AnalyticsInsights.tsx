"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Repeat2,
  Users,
} from "lucide-react";
import { SynauraImage } from "@/components/ui/SynauraImage";
import {
  catalogueSignals,
  movingTracks,
} from "@/lib/creatorAnalytics/insights";
import {
  formatAnalyticsNumber as fmt,
  changePercent,
  type CreatorAnalytics,
} from "@/lib/creatorAnalytics/model";

export function Momentum({
  report,
  onSelect,
}: {
  report: CreatorAnalytics;
  onSelect: (id: string) => void;
}) {
  const [direction, setDirection] = useState<"up" | "down">("up");
  const rows = movingTracks(report.tracks, direction).slice(0, 4),
    facts = catalogueSignals(report);
  return (
    <section className="analytics-panel analytics-momentum">
      <div className="analytics-panel-heading">
        <div>
          <span className="analytics-eyebrow">CE QUI ÉVOLUE</span>
          <h2>Les mouvements de ton catalogue</h2>
          <p>Différence d’écoutes avec la période précédente, en volume.</p>
        </div>
        <div
          role="group"
          aria-label="Direction de progression"
          className="analytics-momentum-toggle"
        >
          <button
            type="button"
            aria-pressed={direction === "up"}
            onClick={() => setDirection("up")}
          >
            <ArrowUpRight size={15} />
            Hausses
          </button>
          <button
            type="button"
            aria-pressed={direction === "down"}
            onClick={() => setDirection("down")}
          >
            <ArrowDownRight size={15} />
            Baisses
          </button>
        </div>
      </div>
      <div className="analytics-momentum-grid">
        <div>
          {rows.length ? (
            rows.map((t) => {
              const difference = t.plays - t.previousPlays,
                change = changePercent(t.plays, t.previousPlays);
              return (
                <button
                  type="button"
                  key={t.id}
                  className="analytics-track-row"
                  onClick={() => onSelect(t.id)}
                >
                  <SynauraImage
                    src={t.cover || "/default-cover.svg"}
                    alt=""
                    className="analytics-cover"
                  />
                  <span className="analytics-track-name">
                    <strong>{t.title}</strong>
                    <small>
                      {fmt(t.previousPlays)} → {fmt(t.plays)} écoutes
                    </small>
                  </span>
                  <span
                    className="analytics-track-value"
                    data-direction={direction}
                  >
                    <strong>
                      {difference > 0 ? "+" : ""}
                      {fmt(difference)}
                    </strong>
                    <small>
                      {change === null
                        ? "Sans base précédente"
                        : `${change > 0 ? "+" : ""}${fmt(change, true)}`}
                    </small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              );
            })
          ) : (
            <p className="analytics-empty-inline">
              Aucun morceau {direction === "up" ? "en hausse" : "en baisse"}{" "}
              dans la sélection chargée.
            </p>
          )}
          {report.trackCount > report.tracks.length && (
            <p className="analytics-footnote">
              Analyse limitée aux {report.tracks.length} sons chargés, pas à
              l’ensemble du catalogue.
            </p>
          )}
        </div>
        <div className="analytics-catalogue-facts">
          <div>
            <strong>{fmt(facts.topThreeShare, true)}</strong>
            <span>des écoutes portées par tes trois premiers sons</span>
          </div>
          <div>
            <strong>
              {facts.activeDays}
              <small> / {report.period.days}</small>
            </strong>
            <span>jours avec au moins une écoute enregistrée</span>
          </div>
          <div>
            <strong>{fmt(facts.averageDaily)}</strong>
            <span>écoutes par jour en moyenne, jours à zéro compris</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LoyalAudience({ report }: { report: CreatorAnalytics }) {
  const a = report.audience,
    total = report.current.listeners;
  const previousRate = a.previousListeners
    ? (a.returning / a.previousListeners) * 100
    : null;
  const share = total ? (a.returning / total) * 100 : 0;
  return (
    <section className="analytics-panel analytics-loyalty">
      <div className="analytics-panel-heading">
        <div>
          <span className="analytics-eyebrow">AU-DELÀ DU PREMIER PLAY</span>
          <h2>Ils reviennent écouter.</h2>
          <p>Comptes identifiés uniquement · {fmt(total)} sur cette période.</p>
        </div>
        <Repeat2 size={22} />
      </div>
      <div className="analytics-loyalty-grid">
        <div>
          <div className="analytics-return-share">
            <strong>{fmt(total ? share : null, true)}</strong>
            <span>
              de l’audience actuelle était déjà présente sur la période
              précédente
            </span>
          </div>
          <div
            className="analytics-audience-split"
            role="img"
            aria-label={`${fmt(a.returning)} auditeurs de retour, ${fmt(
              a.notSeenPreviously
            )} non observés sur la période précédente`}
          >
            <i style={{ width: `${share}%` }} />
          </div>
          <div className="analytics-audience-legend">
            <span>
              <i />
              {fmt(a.returning)} de retour
            </span>
            <span>
              <i />
              {fmt(a.notSeenPreviously)} non observés avant
            </span>
          </div>
          <p className="analytics-footnote">
            « Non observés avant » signifie absents de la période comparée, pas
            nouveaux utilisateurs ni premières écoutes à vie.
          </p>
        </div>
        <div className="analytics-loyalty-numbers">
          <div>
            <Users size={17} />
            <strong>{fmt(previousRate, true)}</strong>
            <span>
              des {fmt(a.previousListeners)} auditeurs précédents reviennent sur
              la période actuelle
            </span>
          </div>
          <div>
            <Repeat2 size={17} />
            <strong>{fmt(a.multipleDays)}</strong>
            <span>
              comptes ont écouté sur plusieurs jours · {fmt(a.singleDay)} sur un
              seul jour
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

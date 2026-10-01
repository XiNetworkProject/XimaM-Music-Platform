'use client';
import { type CreatorAnalytics, formatAnalyticsNumber as fmt } from '@/lib/creatorAnalytics/model';

export function AnalyticsEvidence({report, social = false}: {report: CreatorAnalytics; social?: boolean}) {
  const e=report.evidence;
  if (!e) return <p className="analytics-content-note">Ces mesures ne sont pas encore disponibles.</p>;
  if (social) {
    return <section className="analytics-panel"><h2>La visibilité de tes posts et clips</h2><p className="analytics-footnote">Affichages enregistrés sur la période dans les surfaces instrumentées. Pas des vues vidéo ni des personnes uniques. Tous les posts et clips du compte, hors filtre musical.</p>
      <div className="analytics-secondary-grid">{['post','clip'].map(type=>{
        const rows=report.daily.map(d=>({date:d.date,count:e.social.filter(r=>r.type===type&&r.date.slice(0,10)===d.date.slice(0,10)).reduce((n,r)=>n+r.displays,0)}));
        const total=rows.reduce((n,r)=>n+r.count,0), max=Math.max(1,...rows.map(r=>r.count));
        return <div key={type}><h3>{type==='post'?'Posts':'Clips'} · {fmt(total)} affichages</h3><div className="analytics-evidence-bars" role="img" aria-label={`${type} : ${fmt(total)} affichages enregistrés`}>
          {rows.map(r=><i key={r.date} title={`${r.date.slice(0,10)} : ${r.count}`} style={{height:`${r.count/max*100}%`}} />)}</div>
          <details><summary>Valeurs quotidiennes</summary><ul>{rows.map(r=><li key={r.date}>{r.date.slice(0,10)} : {fmt(r.count)}</li>)}</ul></details>
          {!total&&<p>Aucun affichage enregistré. Cela ne prouve pas l’absence d’exposition.</p>}</div>;
      })}</div></section>;
  }
  const r=e.retention, ranked=[...e.exposure].sort((a,b)=>b.displays-a.displays), top=ranked[0];
  return <>
    <section className="analytics-panel"><span className="analytics-eyebrow">DE L’EXPOSITION À L’ÉCOUTE</span><h2>Où ton son est rencontré</h2>
      <p className="analytics-footnote">L’écoute associée suit un affichage du même morceau, par le même compte, sous 30 minutes et dans la période. Association, pas preuve de conversion ; une écoute peut être associée à plusieurs surfaces. Anonymes exclus des associations.</p>
      {top ? <p>{top.source} représente {fmt(top.displays)} affichages, le volume le plus élevé parmi les surfaces mesurées. Ce n’est pas nécessairement la source de toutes tes écoutes.</p> : <p>Pas d’exposition enregistrée. Aucun taux n’est estimé.</p>}
      <div className="analytics-evidence-sources">{ranked.map((s,i)=><div key={`${s.source}-${i}`}><strong>{s.source}</strong><span>{fmt(s.displays)} affichages</span><span>{fmt(s.followedByPlay)} / {fmt(s.identifiedPairs)} couples compte–morceau avec écoute associée</span></div>)}</div>
      <p className="analytics-footnote">{fmt(e.actions.shares)} événements de partage · {fmt(e.actions.playlistAdds)} ajouts à une playlist signalés. Ce ne sont pas des destinataires atteints ou des ajouts encore actifs. L’abonnement au créateur n’est pas attribué artificiellement à un morceau.</p>
    </section>
    <section className="analytics-panel"><span className="analytics-eyebrow">PASSAGES OBSERVÉS</span><h2>Ce qui est réellement parcouru</h2><p>{fmt(r.plays)} écoutes avec un identifiant de mesure, sur {fmt(report.current.plays)} démarrages enregistrés.</p>
      {r.plays>=5 ? <><div className="analytics-evidence-bars analytics-retention-bars" role="img" aria-label="Part des écoutes mesurées ayant parcouru chaque tranche de cinq pour cent">{r.buckets.map(b=><i key={b.bucket} style={{height:`${Math.min(100,b.plays/r.plays*100)}%`}} title={`${b.bucket*5}–${(b.bucket+1)*5} % du son : ${fmt(b.plays/r.plays*100,true)}`} />)}</div><div className="analytics-chart-legend"><span>Début</span><span>Milieu</span><span>Fin</span></div><details><summary>Lire les passages mesurés</summary><ul>{r.buckets.map(b=><li key={b.bucket}>{b.bucket*5}–{(b.bucket+1)*5} % du morceau : {fmt(b.plays)} écoutes, {fmt(b.plays/r.plays*100,true)}</li>)}</ul></details></> : <p>La courbe apparaîtra à partir de cinq écoutes instrumentées. Les écoutes historiques ne sont pas reconstituées.</p>}
      <p className="analytics-footnote">Une tranche est comptée après une seconde observée, ou la moitié de la tranche pour un morceau court. Sauts et trous de mesure ignorés ; reprises dédupliquées dans une écoute. Collecte indicative du lecteur musical web, pas une rétention seconde par seconde ni une mesure antifraude. Une fin de période ou un événement perdu peut réduire la couverture.</p>
    </section>
  </>;
}

'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AlertCircle, Check, Clock3, X } from 'lucide-react';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';
import { acknowledgeStudioActivity, getStudioActivity, hydrateStudioActivity, subscribeStudioActivity } from '@/lib/studio/clientActivity';
import { operationLabels, outcomeLabels, type StudioFeedback } from '@/lib/studio/feedback';
import './studio-activity.css';
const empty: StudioFeedback[] = [];
export default function StudioActivity({ owner, checkGeneration }: { owner?: string; checkGeneration?: (task: string) => void }) {
  const [open, setOpen] = useState(false);
  const items = useSyncExternalStore(subscribeStudioActivity, () => getStudioActivity(owner), () => empty);
  useEffect(() => { if (owner) hydrateStudioActivity(owner); }, [owner]);
  const issues = items.filter(item => ['failed','uncertain','warning'].includes(item.state) && !item.acknowledged);
  const latest = issues[0];
  return <>
    <button className="sa-toggle" onClick={() => setOpen(true)} aria-label={`Activité du Studio${issues.length ? ` · ${issues.length} points à vérifier` : ''}`}><Clock3 size={16}/><span>Activité</span>{issues.length > 0 && <b>{issues.length}</b>}</button>
    {latest && !open && <div className="sa-notice" role="status"><AlertCircle size={17}/><button onClick={() => setOpen(true)}><strong>{operationLabels[latest.kind]} · {outcomeLabels[latest.state]}</strong><span>{latest.message}</span></button><button aria-label="Masquer ce rappel, conserver dans l’activité" onClick={() => owner && acknowledgeStudioActivity(owner, latest.id)}><X size={15}/></button></div>}
    <SynauraOverlay open={open} onClose={() => setOpen(false)} ariaLabel="Activité du Studio" size="md"><section className="sa-journal"><header><span>LE SUIVI DE VOS CRÉATIONS</span><h2>Que s’est-il passé ?</h2><p>Étape, heure et raison connue. Les 40 dernières opérations sont conservées 30 jours sur cet appareil, pour ce compte.</p></header>
      {!items.length && <p>Aucune opération suivie sur cet appareil pour le moment.</p>}
      {items.map(item => <article key={item.id} data-state={item.state}><header><strong>{operationLabels[item.kind]}</strong><span>{item.state === 'success' ? <Check size={14}/> : item.state === 'pending' ? <Clock3 size={14}/> : <AlertCircle size={14}/>} {outcomeLabels[item.state]}</span></header><small>{item.stage} · <time dateTime={new Date(item.updatedAt).toISOString()}>{new Date(item.updatedAt).toLocaleString('fr-FR')}</time></small><p>{item.message}</p>{item.advice && <p className="sa-advice">{item.advice}</p>}{(item.taskId || item.code) && <details><summary>Référence et détail technique</summary>{item.code && <code>{item.code}</code>}{item.taskId && <code>Demande : {item.taskId}</code>}</details>}{item.canCheck && item.state === 'uncertain' && item.kind === 'generation' && item.taskId && checkGeneration && <button onClick={() => checkGeneration(item.taskId!)}>Vérifier cette demande · sans regénérer</button>}{!item.acknowledged && ['failed','uncertain','warning'].includes(item.state) && <button onClick={() => owner && acknowledgeStudioActivity(owner, item.id)}>Compris · garder dans l’historique</button>}</article>)}
      <p className="sa-footnote">Aucune génération n’est relancée depuis ce journal. Un statut inconnu n’est ni un échec confirmé, ni une confirmation de remboursement.</p>
    </section></SynauraOverlay>
  </>;
}

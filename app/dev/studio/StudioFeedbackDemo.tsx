'use client';
import { reportStudioActivity } from '@/lib/studio/clientActivity';
import { feedbackFailure } from '@/lib/studio/feedback';
export default function StudioFeedbackDemo() {
  return <button type="button" onClick={() => {
    reportStudioActivity('studio-lab', { id: 'demo-policy', kind: 'generation', stage: 'Réponse fournisseur · simulation', taskId: 'demo-rejection', ...feedbackFailure('Le fournisseur a refusé le contenu audio.', { code: 'CONTENT_POLICY' }) });
    reportStudioActivity('studio-lab', { id: 'demo-upload', kind: 'upload', stage: 'Enregistrement · simulation', ...feedbackFailure('', { stage: 'save' }) });
    reportStudioActivity('studio-lab', { id: 'demo-connection', kind: 'generation', stage: 'Suivi · simulation', taskId: 'demo-timeout', ...feedbackFailure('Connexion au suivi interrompue.', { uncertain: true }) });
  }} style={{ margin: 6, padding: '6px 12px', fontSize: 11, background: '#292333', borderRadius: 8 }}>Simuler des incidents · aucun envoi</button>;
}

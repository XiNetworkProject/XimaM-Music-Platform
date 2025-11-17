'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Cloud,
  Upload,
  Image as ImageIcon,
  FileText,
  LogOut,
  Save,
  Eye,
  AlertCircle,
  ArrowRight,
  Clock4,
  RefreshCw,
  RotateCcw,
  History,
  FileEdit,
  Send,
  Calendar,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Copy,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';
import { notify } from '@/components/NotificationCenter';

interface MeteoDashboardClientProps {
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface Bulletin {
  id: string;
  title?: string;
  content?: string;
  image_url: string;
  image_public_id: string;
  is_current: boolean;
  status?: 'draft' | 'published' | 'scheduled';
  scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
}

function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relativeTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'dans le futur';

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'à l’instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;

  const diffJ = Math.floor(diffH / 24);
  if (diffJ === 1) return 'hier';
  return `il y a ${diffJ} j`;
}

function AlertempsDashboardBackground() {
  return null;
}

export default function MeteoDashboardClient({ user }: MeteoDashboardClientProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBulletin, setCurrentBulletin] = useState<Bulletin | null>(null);
  const [publishedHistory, setPublishedHistory] = useState<Bulletin[]>([]);
  const [drafts, setDrafts] = useState<Bulletin[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<'publish' | 'draft' | 'schedule'>('publish');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledBulletins, setScheduledBulletins] = useState<Bulletin[]>([]);
  const [stats, setStats] = useState<{
    bulletinId: string;
    totalViews: number;
    viewsPerDay: { date: string; count: number }[];
    bySource: { source: string; count: number }[];
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [duplicatedImageUrl, setDuplicatedImageUrl] = useState<string | null>(null);
  const [showV2Modal, setShowV2Modal] = useState(false);
  const [v2FeatureIndex, setV2FeatureIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Templates de bulletins
  const METEO_TEMPLATES = [
    {
      id: 'classic',
      label: 'Bulletin classique',
      title: 'Bulletin météo du jour',
      content:
        "Lundi [DATE]\n\nUne journée marquée par une alternance de nuages, d'éclaircies et d'averses sur l'est et le sud-ouest tandis que le nord-ouest et le sud-est bénéficiera de belles éclaircies entre deux passages nuageux.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nMardi [DATE]\n\nLe temps s'améliore nettement : retour d'un soleil généreux au nord comme au sud, malgré quelques brumes matinales dans les plaines. De rares nuages résiduels circuleront près de la frontière belge.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nMercredi [DATE]\n\nUn changement de temps avec l'arrivée d'une perturbation apportant pluie et un net refroidissement, notamment sur le nord. Les premières flocons apparaîtront sur les reliefs à basse altitude de l'est. Le sud restera sous un ciel partagé mais plus sec.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nJeudi [DATE]\n\nLa perturbation s'évacue lentement vers l'est mais laisse encore beaucoup de nuages et des averses, parfois mêlées de neige sur les basses altitudes. Quelques éclaircies au nord-ouest et près de la Méditerranée avec un peu de brume matinale.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nIndice de confiance : 3/5\n\nRésumé de la tendance\n\nDébut de semaine variable mais plutôt lumineux, notamment mardi.\nRefroidissement marqué dès mercredi avec l'arrivée des précipitations.\nRetour d'un temps gris et humide pour jeudi, avec un peu de neige en altitude.\nUne semaine typiquement hivernale qui s'installe progressivement.",
    },
    {
      id: 'vigilance',
      label: 'Bulletin vigilance',
      title: 'Vigilance météo en cours',
      content:
        "Lundi [DATE]\n\nUn épisode de mauvais temps est en cours sur la région avec des précipitations soutenues et des rafales de vent localement fortes. Des cumuls importants sont attendus, notamment sur les reliefs où des risques de crues sont possibles.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nMardi [DATE]\n\nLa perturbation continue de sévir avec des précipitations abondantes et des vents violents. Des inondations localisées sont possibles dans les zones à risque. Restez vigilants et évitez les déplacements non essentiels.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nMercredi [DATE]\n\nL'amélioration s'amorce progressivement mais les précipitations persistent encore, notamment sur l'est. Les vents commencent à faiblir mais restent encore modérés à forts par endroits.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nJeudi [DATE]\n\nRetour à un temps plus calme avec une amélioration générale. Quelques averses résiduelles subsistent mais le vent faiblit nettement. Les conditions s'améliorent progressivement.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nIndice de confiance : 4/5\n\nRésumé de la tendance\n\nÉpisode de mauvais temps marqué en début de semaine avec précipitations abondantes et vents forts.\nRisques de crues et d'inondations localisées, notamment sur les reliefs.\nAmélioration progressive à partir de mercredi avec un retour au calme jeudi.\nRestez informés et respectez les consignes de sécurité.",
    },
    {
      id: 'weekend',
      label: 'Bulletin week-end',
      title: 'Tendance météo pour le week-end',
      content:
        "Samedi [DATE]\n\nUn week-end qui débute sous un ciel partagé avec des passages nuageux alternant avec de belles éclaircies. Les températures restent douces pour la saison avec un vent faible à modéré. Conditions globalement agréables pour les activités en extérieur.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nDimanche [DATE]\n\nAmélioration progressive avec un temps plus sec et lumineux. Le soleil devient plus généreux, notamment en matinée. Quelques nuages résiduels en fin de journée mais sans précipitation. Idéal pour les sorties.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nLundi [DATE]\n\nDébut de semaine qui conserve un temps plutôt agréable avec un ciel variable. Quelques passages nuageux mais sans pluie significative. Les températures restent douces.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nMardi [DATE]\n\nLe temps se dégrade légèrement avec l'arrivée de nuages plus nombreux et quelques averses possibles, notamment sur l'ouest. Les températures commencent à baisser.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nIndice de confiance : 3/5\n\nRésumé de la tendance\n\nWeek-end agréable avec un temps globalement favorable, surtout dimanche.\nConditions idéales pour les activités en extérieur.\nDébut de semaine qui conserve un temps doux avant une dégradation progressive mardi.\nUn week-end à profiter avant le retour d'un temps plus incertain.",
    },
  ] as const;

  // Carrousel des fonctionnalités de la V2
  const v2Features = [
    {
      id: 'validation',
      title: 'Validation intelligente',
      icon: Shield,
      iconWrapperClass: 'bg-blue-500/20 border-blue-400/30',
      description: 'Évite les erreurs avant la mise en ligne.',
      bullets: [
        'Check-list visuelle avant publication',
        'Vérification automatique de l’image, du titre et de la description',
        'Validation frontend et backend synchronisées',
      ],
    },
    {
      id: 'historique',
      title: 'Historique complet & restauration',
      icon: History,
      iconWrapperClass: 'bg-purple-500/20 border-purple-400/30',
      description: 'Garde une trace de tous les bulletins passés.',
      bullets: [
        'Archivage de tous les bulletins publiés',
        'Restauration en un clic d’un ancien bulletin',
        'Conservation des dates et de l’image d’origine',
      ],
    },
    {
      id: 'brouillons',
      title: 'Brouillons avancés',
      icon: FileEdit,
      iconWrapperClass: 'bg-yellow-500/20 border-yellow-400/30',
      description: 'Prépare tes bulletins tranquillement.',
      bullets: [
        'Enregistrer un bulletin sans le publier',
        'Reprendre un brouillon et le modifier à tout moment',
        'Gestion séparée des brouillons et des publications',
      ],
    },
    {
      id: 'programmation',
      title: 'Programmation automatique',
      icon: Calendar,
      iconWrapperClass: 'bg-purple-500/20 border-purple-400/30',
      description: 'Automatise la mise en ligne.',
      bullets: [
        'Planification à une date et heure précises',
        'Publication automatique côté serveur',
        'Vue dédiée des bulletins programmés',
      ],
    },
    {
      id: 'statistiques',
      title: 'Statistiques d’affichage',
      icon: BarChart3,
      iconWrapperClass: 'bg-pink-500/20 border-pink-400/30',
      description: 'Comprends comment ton bulletin est consulté.',
      bullets: [
        'Total des vues sur 7 jours',
        'Histogramme par jour',
        'Répartition des vues par source (home, page météo, widget, ...)',
      ],
    },
    {
      id: 'templates',
      title: 'Modèles rapides',
      icon: FileText,
      iconWrapperClass: 'bg-cyan-500/20 border-cyan-400/30',
      description: 'Gagne du temps sur la rédaction.',
      bullets: [
        'Modèles prêts à l’emploi (classique, vigilance, week-end, ...)',
        'Structure de texte déjà mise en forme',
        'Application en un clic sur le formulaire',
      ],
    },
    {
      id: 'duplication',
      title: 'Duplication intelligente',
      icon: Copy,
      iconWrapperClass: 'bg-indigo-500/20 border-indigo-400/30',
      description: 'Réutilise facilement un ancien bulletin.',
      bullets: [
        'Duplication complète du titre et du contenu',
        'Réutilisation de l’image existante',
        'Idéal pour adapter un bulletin à un nouveau jour',
      ],
    },
    {
      id: 'interface',
      title: 'Interface optimisée',
      icon: Zap,
      iconWrapperClass: 'bg-emerald-500/20 border-emerald-400/30',
      description: 'Pensée pour un usage quotidien confortable.',
      bullets: [
        'Design moderne, lisible et cohérent avec Synaura',
        'Vue responsive (desktop & mobile)',
        'Aperçu en temps réel du bulletin à publier',
      ],
    },
  ] as const;

  // Fonction pour charger les statistiques
  const fetchStats = async (bulletinId?: string) => {
    try {
      setLoadingStats(true);
      const url = bulletinId 
        ? `/api/meteo/stats?bulletinId=${bulletinId}&days=7`
        : '/api/meteo/stats?days=7';
      
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();

      if (response.ok && data.bulletinId) {
        setStats(data);
      } else {
        setStats(null);
        if (data.error) {
          console.error('Erreur chargement stats:', data.error);
        }
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fonction pour charger l'historique (accessible partout)
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      
      // Charger les bulletins publiés
      const publishedRes = await fetch('/api/meteo/bulletins?status=published', { cache: 'no-store' });
      const publishedJson = await publishedRes.json();
      if (publishedRes.ok && Array.isArray(publishedJson.bulletins)) {
        setPublishedHistory(publishedJson.bulletins);
      } else {
        setPublishedHistory([]);
      }

      // Charger les brouillons
      const draftsRes = await fetch('/api/meteo/bulletins?status=draft', { cache: 'no-store' });
      const draftsJson = await draftsRes.json();
      if (draftsRes.ok && Array.isArray(draftsJson.bulletins)) {
        setDrafts(draftsJson.bulletins);
      } else {
        setDrafts([]);
      }

      // Charger les bulletins programmés
      const scheduledRes = await fetch('/api/meteo/bulletins?status=scheduled', { cache: 'no-store' });
      const scheduledJson = await scheduledRes.json();
      if (scheduledRes.ok && Array.isArray(scheduledJson.bulletins)) {
        setScheduledBulletins(scheduledJson.bulletins);
      } else {
        setScheduledBulletins([]);
      }
    } catch (e) {
      console.error('Erreur chargement historique:', e);
      setPublishedHistory([]);
      setDrafts([]);
      setScheduledBulletins([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Charger le bulletin actuel et l'historique au montage
  useEffect(() => {
    const fetchCurrentBulletin = async () => {
      try {
        setLoadingCurrent(true);
        const response = await fetch('/api/meteo/bulletin', { cache: 'no-store' });
        const data = await response.json();

        if (response.ok && data.bulletin) {
          setCurrentBulletin(data.bulletin);
          // Charger les stats pour le bulletin actuel
          await fetchStats(data.bulletin.id);
        } else {
          setCurrentBulletin(null);
          setStats(null);
        }
      } catch (error) {
        console.error('Erreur chargement bulletin:', error);
        setCurrentBulletin(null);
      } finally {
        setLoadingCurrent(false);
      }
    };

    fetchCurrentBulletin();
    fetchHistory();

    // Vérifier et publier les bulletins programmés toutes les minutes
    const checkScheduledInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/meteo/bulletin/publish-scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (response.ok && data.publishedCount > 0) {
          // Rafraîchir l'historique si des bulletins ont été publiés
          await fetchHistory();
          // Rafraîchir le bulletin courant
          const currentRes = await fetch('/api/meteo/bulletin', { cache: 'no-store' });
          const currentData = await currentRes.json();
          if (currentRes.ok && currentData.bulletin) {
            setCurrentBulletin(currentData.bulletin);
          }
        }
      } catch (error) {
        // Silencieux, on ne veut pas spammer les erreurs
        console.debug('Vérification bulletins programmés:', error);
      }
    }, 60000); // Toutes les minutes

    return () => clearInterval(checkScheduledInterval);
  }, []);

  // Cleanup URL.createObjectURL quand on change de fichier / démonte
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      notify.error('Veuillez sélectionner un fichier image (PNG, JPG, etc.)');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      notify.error("L'image ne doit pas dépasser 10MB");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleResetForm = () => {
    setTitle('');
    setContent('');
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDuplicatedImageUrl(null);
    setIsScheduled(false);
    setScheduledDate('');
    setScheduledTime('');
    setSubmitMode('publish');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Appliquer un template
  const applyTemplate = (templateId: string) => {
    const template = METEO_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setTitle(template.title);
    setContent(template.content);
    notify.info(`Modèle "${template.label}" appliqué`);
  };

  // Dupliquer un bulletin
  const handleDuplicate = async (bulletinId: string) => {
    try {
      const response = await fetch(`/api/meteo/bulletin/${bulletinId}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de charger le bulletin');
      }

      // Remplir le formulaire
      setTitle(data.title || '');
      setContent(data.content || '');
      setDuplicatedImageUrl(data.image_url || null);
      
      // Réinitialiser les autres états
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setEditingDraftId(null);
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');
      setSubmitMode('publish');

      notify.success('Bulletin dupliqué dans le formulaire');
      
      // Scroller vers le formulaire
      setTimeout(() => {
        document.getElementById('bulletin-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Impossible de charger ce bulletin pour duplication';
      notify.error(msg);
    }
  };

  const handlePrefillFromCurrent = () => {
    if (!currentBulletin) return;
    setTitle(currentBulletin.title || '');
    setContent(currentBulletin.content || '');
    notify.info('Titre et description pré-remplis depuis le bulletin actuel');
  };

  const handleEditDraft = (bulletin: Bulletin) => {
    setEditingDraftId(bulletin.id);
    setTitle(bulletin.title || '');
    setContent(bulletin.content || '');
    setPreviewUrl(bulletin.image_url);
    setSubmitMode('draft'); // Par défaut, on reste en mode brouillon
    // Scroll vers le formulaire
    setTimeout(() => {
      document.getElementById('bulletin-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingDraftId(null);
    handleResetForm();
    setSubmitMode('publish');
  };

  const handlePublishScheduled = async () => {
    try {
      const response = await fetch('/api/meteo/bulletin/publish-scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la publication des bulletins programmés');
      }

      notify.success(`${data.publishedCount} bulletin(s) programmé(s) publié(s) avec succès !`);
      
      // Rafraîchir l'historique et les bulletins programmés
      await fetchHistory();
      
      // Rafraîchir le bulletin courant
      const currentRes = await fetch('/api/meteo/bulletin', { cache: 'no-store' });
      const currentData = await currentRes.json();
      if (currentRes.ok && currentData.bulletin) {
        setCurrentBulletin(currentData.bulletin);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de la publication';
      notify.error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validation frontend
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier l'image
    // Pour l'édition, on peut garder l'image existante (pas besoin de nouvelle image)
    // Pour la création, on doit avoir une image (selectedFile ou duplicatedImageUrl)
    const hasImage = selectedFile || duplicatedImageUrl || (editingDraftId && (previewUrl || true)); // true car on garde l'image existante en édition
    if (!editingDraftId && !hasImage) {
      errors.push("Aucune image n'est sélectionnée pour ce bulletin.");
    }

    // Vérifier le titre (warning seulement)
    if (!title.trim()) {
      warnings.push("Le titre est vide, il est recommandé d'en ajouter un.");
    }

    // Vérifier le contenu
    if (!content.trim()) {
      errors.push("La description est vide, merci d'ajouter quelques lignes.");
    } else if (content.trim().length < 20) {
      warnings.push("La description est très courte, pensez à ajouter plus de détails.");
    }

    // Afficher les erreurs (bloquantes)
    if (errors.length > 0) {
      errors.forEach((msg) => notify.error(msg));
      return; // Stoppe la soumission
    }

    // Afficher les warnings (non bloquants)
    if (warnings.length > 0) {
      warnings.forEach((msg) => notify.info(msg));
      // On continue quand même, mais l'utilisateur est informé
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      // Déterminer le mode final
      let finalMode = submitMode;
      if (isScheduled && !editingDraftId) {
        finalMode = 'schedule';
        // Combiner date et heure en ISO string
        if (!scheduledDate || !scheduledTime) {
          notify.error('Veuillez remplir la date et l\'heure de programmation');
          setLoading(false);
          return;
        }
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        formData.append('scheduledAt', scheduledDateTime.toISOString());
      }

      formData.append('mode', finalMode);

      const url = editingDraftId 
        ? `/api/meteo/bulletin/${editingDraftId}`
        : '/api/meteo/bulletin';
      const method = editingDraftId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la publication');
      }

      notify.success(data.message || (editingDraftId ? 'Brouillon modifié avec succès' : 'Bulletin publié avec succès'));

      // Reset form
      handleResetForm();
      setEditingDraftId(null);
      setSubmitMode('publish');

      // Mettre à jour le bulletin courant si publié
      if (submitMode === 'publish' && data.bulletin) {
        setCurrentBulletin(data.bulletin);
      }

      // Rafraîchir l'historique et les brouillons
      await fetchHistory();

    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Erreur lors de la publication';
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/meteo/login');
  };

  const handleRefreshCurrent = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/meteo/bulletin', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.bulletin) {
        setCurrentBulletin(data.bulletin);
        notify.success('Bulletin actualisé');
      } else {
        setCurrentBulletin(null);
      }
    } catch (error) {
      console.error(error);
      notify.error('Impossible de rafraîchir le bulletin actuel');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRestore = async (bulletinId: string) => {
    if (restoringId || loading) return;

    try {
      setRestoringId(bulletinId);
      const response = await fetch('/api/meteo/bulletin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bulletinId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la restauration');
      }

      // Mettre à jour le bulletin courant
      if (data.bulletin) {
        setCurrentBulletin(data.bulletin);
      }

      // Rafraîchir l'historique et les brouillons
      await fetchHistory();

      notify.success('Bulletin restauré avec succès !');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de la restauration';
      notify.error(msg);
    } finally {
      setRestoringId(null);
    }
  };

  const handlePublishDraft = async (bulletinId: string) => {
    if (publishingDraftId || loading) return;

    try {
      setPublishingDraftId(bulletinId);
      const response = await fetch('/api/meteo/bulletin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bulletinId, status: 'published' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la publication');
      }

      // Mettre à jour le bulletin courant
      if (data.bulletin) {
        setCurrentBulletin(data.bulletin);
      }

      // Rafraîchir l'historique et les brouillons
      await fetchHistory();

      notify.success('Brouillon publié avec succès !');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de la publication';
      notify.error(msg);
    } finally {
      setPublishingDraftId(null);
    }
  };

  const upcomingPreview = useMemo(() => {
    // Aperçu "ce qui sera publié" : image choisie + titre/contenu
    // Priorité : previewUrl (nouveau fichier) > duplicatedImageUrl (image dupliquée) > currentBulletin.image_url
    const image = previewUrl || duplicatedImageUrl || currentBulletin?.image_url || null;
    return {
      image,
      title: title || currentBulletin?.title || 'Nouveau bulletin météo',
      content:
        content ||
        currentBulletin?.content ||
        'Votre description météo apparaîtra ici.',
    };
  }, [previewUrl, duplicatedImageUrl, currentBulletin, title, content]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      <AlertempsDashboardBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* HEADER */}
        <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="w-full px-3 sm:px-4 lg:px-8 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 shadow-[0_0_25px_rgba(59,130,246,0.7)] flex-shrink-0">
                <Cloud className="w-4 h-4 sm:w-6 sm:h-6 text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg lg:text-xl font-semibold tracking-tight truncate">
                    Alertemps
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/10 px-1.5 sm:px-2 py-[2px] text-[9px] sm:text-[10px] uppercase tracking-wide text-sky-200/90 flex-shrink-0">
                    Dashboard météo
                  </span>
                  <button
                    onClick={() => setShowV2Modal(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-2 sm:px-2.5 py-[2px] text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-emerald-200/95 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:from-emerald-500/30 hover:to-teal-500/30 hover:shadow-[0_0_16px_rgba(16,185,129,0.5)] transition-all cursor-pointer flex-shrink-0"
                    title="Découvrir les nouveautés de la V2"
                  >
                    V2
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-white/65 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  <span className="hidden sm:inline">Gestion des bulletins affichés sur la page publique Synaura • Panneau amélioré avec l'évolution de Synaura</span>
                  <span className="sm:hidden">Panneau admin météo V2</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <div className="hidden sm:flex flex-col items-end text-xs text-white/70">
                <span className="truncate max-w-[180px]">
                  {user.name || user.email}
                </span>
                <span className="text-[10px]">
                  Accès réservé Alertemps
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-100 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm transition-colors flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden min-[375px]:inline">Déconnexion</span>
                <span className="min-[375px]:hidden">Déco</span>
              </button>
            </div>
          </div>
        </header>

        {/* CONTENU */}
        <main className="flex-1">
          <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-16 py-6 sm:py-8">
            {/* Bandeau V2 défilant */}
            <section className="mb-4">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600/30 via-teal-500/25 to-sky-500/25 shadow-[0_0_28px_rgba(16,185,129,0.4)]">
                {/* Glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left,_rgba(16,185,129,0.45),_transparent_55%),radial-gradient(circle_at_right,_rgba(56,189,248,0.35),_transparent_55%)] opacity-70" />

                <div className="relative flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
                  <div className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/20 border border-emerald-300/60 flex-shrink-0">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex animate-marquee gap-10 whitespace-nowrap text-[10px] sm:text-xs md:text-sm text-emerald-50">
                      <span className="inline-flex items-center gap-1">
                        <strong className="font-semibold text-emerald-200">V2 du panneau Alertemps</strong>
                        <span>• Brouillons & modification avancée</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span>Programmation automatique des bulletins</span>
                        <span>• Historique complet & restauration en un clic</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span>Statistiques d&apos;affichage intégrées (vues & sources)</span>
                        <span>• Modèles rapides pour rédiger plus vite</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span>Duplication intelligente pour réutiliser un bulletin</span>
                        <span>• Validation front + back pour éviter les erreurs</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span>Interface optimisée et responsive</span>
                        <span>• Profonde intégration avec Synaura</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowV2Modal(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black/40 hover:bg-black/50 border border-emerald-300/60 px-2.5 sm:px-3 py-1 text-[9px] sm:text-xs font-medium text-emerald-100 transition-colors flex-shrink-0"
                  >
                    <span className="hidden xs:inline">En savoir plus</span>
                    <span className="xs:hidden">Détails V2</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </section>

            {/* Bandeau quick actions */}
            <section className="mb-6 grid grid-cols-1 md:grid-cols-[2.2fr,1.3fr] gap-4">
              <div className="rounded-2xl border border-white/12 bg-black/40 backdrop-blur-xl p-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/40">
                    <Clock4 className="w-5 h-5 text-sky-300" />
                  </div>
                  <div className="text-xs">
                    <p className="text-white/80 font-medium">
                      Bulletin public Alertemps
                    </p>
                    {currentBulletin ? (
                      <p className="text-white/60">
                        Dernière mise à jour :{' '}
                        <span className="font-medium">
                          {relativeTime(currentBulletin.updated_at)}
                        </span>{' '}
                        ({formatDateTime(currentBulletin.updated_at)})
                      </p>
                    ) : (
                      <p className="text-white/60">
                        Aucun bulletin publié pour le moment.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleRefreshCurrent}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        refreshing ? 'animate-spin' : ''
                      }`}
                    />
                    <span>Actualiser</span>
                  </button>
                  <Link
                    href="/meteo"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-sky-100 hover:bg-sky-500/25"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Voir la page publique</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-400/35 bg-yellow-500/10 backdrop-blur-xl p-3.5 flex gap-3">
                <div className="mt-0.5">
                  <AlertCircle className="w-5 h-5 text-yellow-200" />
                </div>
                <div className="text-[11px] text-yellow-50/95">
                  <p className="font-semibold mb-0.5">
                    Rappel : un seul bulletin actif
                  </p>
                  <p>
                    La publication d&apos;un nouveau bulletin remplace le précédent
                    et met directement à jour l&apos;image affichée sur Synaura.
                  </p>
                </div>
              </div>
            </section>

            {/* GRID PRINCIPALE : historique / formulaire / preview */}
            <section className="grid grid-cols-1 lg:grid-cols-[1.2fr,1.6fr,1.2fr] gap-6">
              {/* Colonne gauche : stats + historique + brouillons + programmés */}
              <div className="space-y-4">
                {/* Section Statistiques d'affichage */}
                {currentBulletin && (
                  <div className="rounded-2xl border border-white/12 bg-black/40 backdrop-blur-2xl p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-400/40">
                        <BarChart3 className="w-4 h-4 text-purple-300" />
                      </div>
                      <h2 className="text-sm font-semibold text-white">
                        Statistiques d&apos;affichage
                      </h2>
                    </div>

                    {loadingStats ? (
                      <div className="h-32 flex items-center justify-center text-xs text-white/70">
                        <div className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Chargement des statistiques...
                        </div>
                      </div>
                    ) : stats ? (
                      <div className="space-y-4">
                        {/* Total des vues */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-white">
                            {stats.totalViews.toLocaleString('fr-FR')}
                          </span>
                          <span className="text-xs text-white/60">
                            vue{stats.totalViews > 1 ? 's' : ''} sur 7 jours
                          </span>
                        </div>

                        {/* Histogramme des vues par jour */}
                        {stats.viewsPerDay.length > 0 && (
                          <div>
                            <p className="text-[10px] text-white/60 mb-2">
                              Évolution quotidienne
                            </p>
                            <div className="flex items-end gap-1 h-24">
                              {stats.viewsPerDay.map((day) => {
                                const maxCount = Math.max(...stats.viewsPerDay.map((d) => d.count), 1);
                                const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                                const date = new Date(day.date);
                                const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'short' });
                                const dayNumber = date.getDate();

                                return (
                                  <div
                                    key={day.date}
                                    className="flex-1 flex flex-col items-center gap-1 group"
                                  >
                                    <div className="w-full flex flex-col items-center justify-end h-full">
                                      <div
                                        className="w-full rounded-t bg-gradient-to-t from-purple-500/80 to-purple-400/60 hover:from-purple-400 to-purple-300 transition-all cursor-pointer group-hover:opacity-90"
                                        style={{ height: `${Math.max(height, 4)}%` }}
                                        title={`${day.count} vue${day.count > 1 ? 's' : ''} le ${day.date}`}
                                      />
                                    </div>
                                    <div className="text-[9px] text-white/50 text-center leading-tight">
                                      <div>{dayLabel}</div>
                                      <div className="font-medium">{dayNumber}</div>
                                    </div>
                                    {day.count > 0 && (
                                      <div className="text-[9px] text-purple-300 font-medium mt-0.5">
                                        {day.count}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Par source */}
                        {stats.bySource.length > 0 && (
                          <div>
                            <p className="text-[10px] text-white/60 mb-2">
                              Par source
                            </p>
                            <div className="space-y-1.5">
                              {stats.bySource.map((source) => {
                                const percentage = stats.totalViews > 0
                                  ? Math.round((source.count / stats.totalViews) * 100)
                                  : 0;
                                const sourceLabel = source.source === 'home'
                                  ? 'Page d\'accueil'
                                  : source.source === 'meteo_page'
                                  ? 'Page météo'
                                  : source.source === 'widget'
                                  ? 'Widget'
                                  : source.source === 'unknown'
                                  ? 'Inconnue'
                                  : source.source;

                                return (
                                  <div
                                    key={source.source}
                                    className="flex items-center justify-between gap-2 text-xs"
                                  >
                                    <span className="text-white/80 capitalize">
                                      {sourceLabel}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-white/60 w-12 text-right text-[10px]">
                                        {source.count} ({percentage}%)
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/25 bg-white/5 px-4 py-4 text-xs text-white/70 text-center">
                        <p>Aucune statistique disponible</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Historique des bulletins */}
                <div className="rounded-2xl border border-white/12 bg-black/40 backdrop-blur-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-400/40">
                      <History className="w-4 h-4 text-sky-300" />
                    </div>
                    <h2 className="text-sm font-semibold text-white">
                      Historique des bulletins
                    </h2>
                  </div>

                  {loadingHistory ? (
                    <div className="h-32 flex items-center justify-center text-xs text-white/70">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Chargement de l'historique...
                      </div>
                    </div>
                  ) : publishedHistory.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/25 bg-white/5 px-4 py-6 text-xs text-white/70 text-center">
                      <p>Aucun bulletin précédent</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {publishedHistory.slice(0, 10).map((bulletin) => (
                        <div
                          key={bulletin.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/15 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={bulletin.image_url}
                              alt={bulletin.title || 'Bulletin'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-medium text-white truncate">
                                {bulletin.title || 'Sans titre'}
                              </p>
                              {bulletin.is_current && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-[1px] text-[9px] uppercase tracking-wide text-emerald-100 flex-shrink-0">
                                  Actuel
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-white/55">
                              {formatDateTime(bulletin.created_at)}
                            </p>
                          </div>
                          {!bulletin.is_current && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDuplicate(bulletin.id)}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] text-white/80 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Dupliquer</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRestore(bulletin.id)}
                                disabled={restoringId === bulletin.id || loading}
                                className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[10px] text-sky-100 hover:bg-sky-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                              >
                                {restoringId === bulletin.id ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-sky-300/30 border-t-sky-300 rounded-full animate-spin" />
                                    <span>Restauration...</span>
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Restaurer</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {publishedHistory.length > 10 && (
                        <p className="text-[10px] text-white/50 text-center pt-2">
                          {publishedHistory.length - 10} autre(s) bulletin(s) plus ancien(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Section Brouillons */}
                <div className="rounded-2xl border border-white/12 bg-black/40 backdrop-blur-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-yellow-500/15 border border-yellow-400/40">
                      <FileEdit className="w-4 h-4 text-yellow-300" />
                    </div>
                    <h2 className="text-sm font-semibold text-white">
                      Brouillons
                    </h2>
                  </div>

                  {loadingHistory ? (
                    <div className="h-24 flex items-center justify-center text-xs text-white/70">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Chargement...
                      </div>
                    </div>
                  ) : drafts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/25 bg-white/5 px-4 py-4 text-xs text-white/70 text-center">
                      <p>Aucun brouillon</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {drafts.map((bulletin) => (
                        <div
                          key={bulletin.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 border border-white/15 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={bulletin.image_url}
                              alt={bulletin.title || 'Brouillon'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">
                              {bulletin.title || 'Sans titre'}
                            </p>
                            <p className="text-[10px] text-white/55">
                              {formatDateTime(bulletin.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDuplicate(bulletin.id)}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] text-white/80 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Dupliquer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditDraft(bulletin)}
                              disabled={editingDraftId === bulletin.id || loading}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] text-white/90 hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            >
                              <FileEdit className="w-3 h-3" />
                              <span>Modifier</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePublishDraft(bulletin.id)}
                              disabled={publishingDraftId === bulletin.id || loading}
                              className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[10px] text-sky-100 hover:bg-sky-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            >
                            {publishingDraftId === bulletin.id ? (
                              <>
                                <span className="w-3 h-3 border-2 border-sky-300/30 border-t-sky-300 rounded-full animate-spin" />
                                <span>Publication...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                <span>Publier</span>
                              </>
                            )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section Bulletins programmés */}
                <div className="rounded-2xl border border-white/12 bg-black/40 backdrop-blur-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-400/40">
                        <Clock4 className="w-4 h-4 text-purple-300" />
                      </div>
                      <h2 className="text-sm font-semibold text-white">
                        Bulletins programmés
                      </h2>
                    </div>
                    {scheduledBulletins.length > 0 && (
                      <button
                        type="button"
                        onClick={handlePublishScheduled}
                        className="text-[10px] text-purple-300 hover:text-purple-200 underline"
                      >
                        Forcer publication
                      </button>
                    )}
                  </div>

                  {loadingHistory ? (
                    <div className="h-24 flex items-center justify-center text-xs text-white/70">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Chargement...
                      </div>
                    </div>
                  ) : scheduledBulletins.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/25 bg-white/5 px-4 py-4 text-xs text-white/70 text-center">
                      <p>Aucun bulletin programmé</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {scheduledBulletins.map((bulletin) => {
                        const scheduledDate = bulletin.scheduled_at 
                          ? new Date(bulletin.scheduled_at) 
                          : null;
                        const isPast = scheduledDate && scheduledDate < new Date();
                        
                        return (
                          <div
                            key={bulletin.id}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 border border-white/15 flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={bulletin.image_url}
                                alt={bulletin.title || 'Bulletin programmé'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white truncate">
                                {bulletin.title || 'Sans titre'}
                              </p>
                              <p className="text-[10px] text-white/55">
                                {scheduledDate 
                                  ? `Programmé le ${formatDateTime(scheduledDate)}`
                                  : 'Date non définie'}
                              </p>
                              {isPast && (
                                <p className="text-[9px] text-yellow-300 mt-0.5">
                                  ⚠️ Heure passée, en attente de publication
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePublishDraft(bulletin.id)}
                              disabled={publishingDraftId === bulletin.id || loading}
                              className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-500/15 px-2.5 py-1 text-[10px] text-purple-100 hover:bg-purple-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            >
                              {publishingDraftId === bulletin.id ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
                                  <span>Publication...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3" />
                                  <span>Publier maintenant</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Colonne centrale : formulaire complet */}
              <div id="bulletin-form" className="rounded-2xl border border-white/14 bg-black/50 backdrop-blur-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-sky-400" />
                    <h2 className="text-sm font-semibold text-white">
                      {editingDraftId ? 'Modifier le brouillon' : 'Publier un nouveau bulletin'}
                    </h2>
                  </div>
                  {editingDraftId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-xs text-white/60 hover:text-white/90 underline"
                    >
                      Annuler
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 text-sm">
                  {/* Upload d'image */}
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-2">
                      Image du bulletin {!editingDraftId && <span className="text-red-400">*</span>}
                      {editingDraftId && <span className="text-white/50 text-[10px] ml-1">(optionnel, laisser vide pour garder l'image actuelle)</span>}
                    </label>

                    <div className="relative border-2 border-dashed border-white/20 rounded-xl p-5 text-center hover:border-sky-400/50 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {previewUrl ? (
                        <div className="space-y-3">
                          <div className="mx-auto w-full max-w-xs aspect-[16/9] bg-white/5 rounded-xl overflow-hidden border border-white/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs text-white/75">
                            {selectedFile?.name}{' '}
                            <span className="text-white/50">
                              (
                              {selectedFile
                                ? (selectedFile.size / (1024 * 1024)).toFixed(2)
                                : '0'}
                              {' '}
                              MB)
                            </span>
                          </p>
                          <div className="flex items-center justify-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/5 px-3 py-1 hover:bg-white/10"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              {editingDraftId ? 'Changer l\'image' : 'Changer d\'image'}
                            </button>
                            {!editingDraftId && (
                              <button
                                type="button"
                                onClick={handleResetForm}
                                className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-red-100 hover:bg-red-500/20"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/5 rounded-xl border border-white/20 mx-auto">
                            <ImageIcon className="w-7 h-7 text-sky-300" />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-sky-300 hover:text-sky-200 font-medium text-xs"
                            >
                              Cliquer pour sélectionner une image
                            </button>
                            <p className="text-[11px] text-white/55 mt-1">
                              PNG, JPG… jusqu&apos;à 10MB. Format paysage (16:9)
                              recommandé pour un rendu optimal.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modèles rapides */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-white/60 mb-2">
                      Modèles rapides
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {METEO_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyTemplate(tpl.id)}
                          className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/10 hover:border-white/30 transition-colors"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Titre */}
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-xs font-medium text-white/80 mb-1.5"
                    >
                      Titre du bulletin (optionnel)
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-400/70 focus:border-sky-400/60"
                      placeholder="Ex : Bulletin météo du 15 novembre"
                    />
                  </div>

                  {/* Contenu */}
                  <div>
                    <label
                      htmlFor="content"
                      className="block text-xs font-medium text-white/80 mb-1.5"
                    >
                      Description (optionnelle)
                    </label>
                    <textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-400/70 focus:border-sky-400/60 resize-none"
                      placeholder="Ex : Vigilance pluie/vent sur le Nord, amélioration prévue en fin de journée..."
                    />
                    <p className="mt-1 text-[10px] text-white/50">
                      Tu peux utiliser plusieurs lignes, elles seront affichées
                      telles quelles sur la page publique.
                    </p>
                  </div>

                  {/* Programmation */}
                  {!editingDraftId && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isScheduled}
                          onChange={(e) => {
                            setIsScheduled(e.target.checked);
                            if (e.target.checked) {
                              setSubmitMode('schedule');
                            } else {
                              setSubmitMode('publish');
                            }
                          }}
                          className="w-4 h-4 rounded border-white/30 bg-white/5 text-sky-400 focus:ring-sky-400/50"
                        />
                        <span className="text-xs font-medium text-white/90">
                          Programmer ce bulletin
                        </span>
                      </label>
                      {isScheduled && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-white/70 mb-1">
                              Date
                            </label>
                            <input
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/20 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400/70"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-white/70 mb-1">
                              Heure
                            </label>
                            <input
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/20 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400/70"
                              required
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Check-list de validation */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                    <p className="text-[10px] font-medium text-white/70 mb-2">
                      Validation avant publication
                    </p>
                    <div className="space-y-1.5">
                      {/* Image */}
                      <div className="flex items-center gap-2 text-xs">
                        {selectedFile || duplicatedImageUrl || editingDraftId ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        )}
                        <span
                          className={
                            selectedFile || duplicatedImageUrl || editingDraftId
                              ? 'text-white/90'
                              : 'text-red-300'
                          }
                        >
                          Image {editingDraftId ? 'existante' : 'sélectionnée'}
                        </span>
                      </div>

                      {/* Titre */}
                      <div className="flex items-center gap-2 text-xs">
                        {title.trim() ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                        )}
                        <span className={title.trim() ? 'text-white/90' : 'text-yellow-300'}>
                          Titre {title.trim() ? 'présent' : '(recommandé)'}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="flex items-center gap-2 text-xs">
                        {content.trim() ? (
                          content.trim().length >= 20 ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                          )
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        )}
                        <span
                          className={
                            !content.trim()
                              ? 'text-red-300'
                              : content.trim().length < 20
                              ? 'text-yellow-300'
                              : 'text-white/90'
                          }
                        >
                          Description{' '}
                          {!content.trim()
                            ? 'vide'
                            : content.trim().length < 20
                            ? '(trop courte)'
                            : 'complète'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Boutons */}
                  <div className="pt-2 space-y-3">
                    {!isScheduled ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="submit"
                          onClick={() => setSubmitMode('publish')}
                          disabled={loading || (!selectedFile && !editingDraftId)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:opacity-95 text-sm font-semibold text-white py-2.5 px-4 shadow-[0_0_24px_rgba(56,189,248,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                        >
                          {loading && submitMode === 'publish' ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Publication...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>Publier</span>
                            </>
                          )}
                        </button>
                        <button
                          type="submit"
                          onClick={() => setSubmitMode('draft')}
                          disabled={loading || (!selectedFile && !editingDraftId)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-semibold text-white py-2.5 px-4 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                        >
                          {loading && submitMode === 'draft' ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Enregistrement...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Brouillon</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading || !selectedFile || !scheduledDate || !scheduledTime}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-400 hover:opacity-95 text-sm font-semibold text-white py-2.5 px-4 shadow-[0_0_24px_rgba(168,85,247,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                      >
                        {loading && submitMode === 'schedule' ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Programmation...</span>
                          </>
                        ) : (
                          <>
                            <Clock4 className="w-4 h-4" />
                            <span>Programmer le bulletin</span>
                          </>
                        )}
                      </button>
                    )}
                    <p className="text-[10px] text-white/55 text-center">
                      {isScheduled ? (
                        <>
                          <strong>Programmé</strong> : sera publié automatiquement à la date/heure choisie.
                        </>
                      ) : (
                        <>
                          <strong>Publier</strong> : affiche immédiatement sur la page publique.
                          <br />
                          <strong>Brouillon</strong> : enregistre sans publier, visible uniquement ici.
                        </>
                      )}
                    </p>
                  </div>
                </form>
              </div>

              {/* Colonne droite : bulletin actuel + prévisualisation */}
              <div className="space-y-4">
                {/* Bulletin actuel */}
                <div className="rounded-2xl border border-white/14 bg-black/45 backdrop-blur-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-sky-400" />
                      <h2 className="text-sm font-semibold text-white">
                        Bulletin actuellement affiché
                      </h2>
                    </div>
                    {currentBulletin && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-[2px] text-[10px] uppercase tracking-wide text-emerald-100">
                        Actif
                      </span>
                    )}
                  </div>

                  {loadingCurrent ? (
                    <div className="h-32 flex items-center justify-center text-xs text-white/70">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Chargement du bulletin...
                      </div>
                    </div>
                  ) : currentBulletin ? (
                    <div className="flex gap-4">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white/5 rounded-xl overflow-hidden flex-shrink-0 border border-white/15">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentBulletin.image_url}
                          alt="Bulletin météo actuel"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 text-xs">
                        {currentBulletin.title && (
                          <h3 className="text-sm font-semibold text-white mb-1">
                            {currentBulletin.title}
                          </h3>
                        )}
                        {currentBulletin.content && (
                          <p className="text-white/75 mb-2 whitespace-pre-line">
                            {currentBulletin.content}
                          </p>
                        )}
                        <p className="text-[11px] text-white/55 flex items-center gap-1">
                          <Clock4 className="w-3 h-3" />
                          Publié le {formatDateTime(currentBulletin.created_at)}
                        </p>

                        <button
                          type="button"
                          onClick={handlePrefillFromCurrent}
                          className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Reprendre titre & description
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/25 bg-white/5 px-4 py-6 text-xs text-white/70 text-center">
                      <p className="font-medium mb-1">
                        Aucun bulletin n&apos;est encore publié
                      </p>
                      <p>
                        Publie un premier bulletin avec une image 16:9 (large) pour
                        l’afficher sur la page publique Alertemps.
                      </p>
                    </div>
                  )}
                </div>

                {/* Aperçu du prochain bulletin */}
                <div className="rounded-2xl border border-white/12 bg-black/40 backdrop-blur-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-400/40">
                      <ImageIcon className="w-4 h-4 text-sky-300" />
                    </div>
                    <h2 className="text-sm font-semibold text-white">
                      Aperçu du prochain bulletin
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/15 bg-gradient-to-br from-sky-900/40 to-slate-900/80 flex items-center justify-center">
                      {upcomingPreview.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={upcomingPreview.image}
                          alt="Aperçu nouveau bulletin"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-xs text-white/65">
                          <ImageIcon className="w-6 h-6 text-sky-300" />
                          Image en attente…
                        </div>
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-white truncate">
                        {upcomingPreview.title}
                      </p>
                      <p className="text-white/75 mt-1 line-clamp-3">
                        {upcomingPreview.content}
                      </p>
                      <p className="text-[10px] text-white/55 mt-2">
                        Cet aperçu combine ce que tu as saisi avec l&apos;image
                        sélectionnée. Ce sera l&apos;affichage final sur la page publique
                        après publication.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Modal V2 - Fonctionnalités */}
      {showV2Modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowV2Modal(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-gradient-to-br from-[#050214] via-[#05010b] to-[#020010] shadow-[0_0_60px_rgba(16,185,129,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                  <Sparkles className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Panneau Admin Météo V2</h2>
                  <p className="text-xs text-white/60">Nouvelle version améliorée avec Synaura</p>
                </div>
              </div>
              <button
                onClick={() => setShowV2Modal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-5 sm:p-7 space-y-6 sm:space-y-8">
              {/* Introduction */}
              <div className="rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600/25 via-emerald-500/20 to-teal-500/20 p-4 sm:p-5 shadow-[0_0_28px_rgba(16,185,129,0.45)]">
                <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
                  <strong className="text-emerald-200">Bienvenue dans la V2 du panneau admin météo !</strong>{' '}
                  Cette nouvelle version apporte de nombreuses améliorations et fonctionnalités pour faciliter la gestion de vos bulletins météo sur Synaura.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] sm:text-xs text-emerald-50/95">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 border border-emerald-300/60">
                    <CheckCircle2 className="w-3 h-3" />
                    Brouillons & modification
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 border border-emerald-300/60">
                    <Clock4 className="w-3 h-3" />
                    Programmation automatique
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 border border-emerald-300/60">
                    <BarChart3 className="w-3 h-3" />
                    Statistiques d&apos;affichage
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 border border-emerald-300/60">
                    <History className="w-3 h-3" />
                    Historique & restauration
                  </span>
                </div>
              </div>

              {/* Carrousel des fonctionnalités */}
              <div className="space-y-3 sm:space-y-4">
                {v2Features.length > 0 && (
                  <div className="rounded-2xl border border-white/12 bg-white/5/90 bg-black/30 p-4 sm:p-5">
                    {(() => {
                      const feature = v2Features[v2FeatureIndex] ?? v2Features[0];
                      const Icon = feature.icon;
                      return (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-lg border ${feature.iconWrapperClass}`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-[11px] sm:text-xs text-emerald-200/90 uppercase tracking-wide font-medium">
                                  Fonctionnalité V2 #{v2FeatureIndex + 1}
                                </p>
                                <h3 className="text-sm sm:text-base font-semibold text-white">
                                  {feature.title}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-white/70 mt-1">
                                  {feature.description}
                                </p>
                              </div>
                            </div>
                            <div className="hidden sm:flex flex-col items-end text-[10px] text-white/60">
                              <span>
                                {v2FeatureIndex + 1} / {v2Features.length}
                              </span>
                            </div>
                          </div>

                          <ul className="mt-3 sm:mt-4 text-[11px] sm:text-xs text-white/75 space-y-1.5 sm:space-y-2 ml-0 sm:ml-10">
                            {feature.bullets.map((item) => (
                              <li key={item} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setV2FeatureIndex((i) => Math.max(0, i - 1))}
                                disabled={v2FeatureIndex === 0}
                                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] sm:text-xs text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <ArrowRight className="w-3 h-3 rotate-180" />
                                Précédent
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setV2FeatureIndex((i) =>
                                    Math.min(v2Features.length - 1, i + 1),
                                  )
                                }
                                disabled={v2FeatureIndex === v2Features.length - 1}
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-500/20 px-2.5 py-1 text-[10px] sm:text-xs text-emerald-50 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Suivant
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {v2Features.map((f, idx) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setV2FeatureIndex(idx)}
                                  className={`h-1.5 rounded-full transition-all ${
                                    idx === v2FeatureIndex
                                      ? 'w-5 bg-emerald-400'
                                      : 'w-2.5 bg-white/30 hover:bg-white/60'
                                  }`}
                                  aria-label={`Aller à la fonctionnalité ${idx + 1}`}
                                />
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Timeline & Footer */}
              <div className="space-y-4 sm:space-y-5">
                {/* Timeline des étapes */}
                <div className="rounded-xl border border-white/10 bg-black/40 p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-white/70 mb-3 font-medium">
                    Comment utiliser la V2 au quotidien :
                  </p>
                  <div className="flex flex-col md:flex-row md:items-stretch md:gap-4">
                    {/* Ligne verticale / horizontale */}
                    <div className="hidden md:flex flex-col justify-between mr-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div className="w-px flex-1 bg-gradient-to-b from-emerald-400/70 via-emerald-300/30 to-transparent" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div className="w-px flex-1 bg-gradient-to-b from-emerald-400/70 via-emerald-300/30 to-transparent" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div className="w-px flex-1 bg-gradient-to-b from-emerald-400/70 via-emerald-300/30 to-transparent" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 text-[11px] sm:text-xs">
                      <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-emerald-200 font-semibold">
                          <Shield className="w-3.5 h-3.5" /> Étape 1
                        </span>
                        <p className="text-white/80 font-medium">Préparer le bulletin</p>
                        <p className="text-white/60">
                          Choisis un modèle, écris le texte et vérifie la check-list.
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-emerald-200 font-semibold">
                          <Clock4 className="w-3.5 h-3.5" /> Étape 2
                        </span>
                        <p className="text-white/80 font-medium">Publier ou programmer</p>
                        <p className="text-white/60">
                          Publie immédiatement ou programme la diffusion à l&apos;heure voulue.
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-emerald-200 font-semibold">
                          <History className="w-3.5 h-3.5" /> Étape 3
                        </span>
                        <p className="text-white/80 font-medium">Suivre & ajuster</p>
                        <p className="text-white/60">
                          Consulte l&apos;historique, restaure ou duplique un bulletin si besoin.
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-emerald-200 font-semibold">
                          <BarChart3 className="w-3.5 h-3.5" /> Étape 4
                        </span>
                        <p className="text-white/80 font-medium">Analyser les vues</p>
                        <p className="text-white/60">
                          Surveille les statistiques pour adapter la communication météo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bandeau Synaura + bouton de fermeture */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 py-3 flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                    <div className="text-[11px] sm:text-xs text-emerald-100">
                      <p className="font-medium text-emerald-200">
                        Évolution continue avec Synaura
                      </p>
                      <p>
                        Ce panneau V2 est conçu pour s&apos;intégrer parfaitement à l&apos;écosystème Synaura et aux futures évolutions d&apos;Alertemps.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] sm:text-xs text-white/70">
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Powered by Synaura · Alertemps</span>
                    </span>
                    <button
                      onClick={() => setShowV2Modal(false)}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white font-semibold px-5 sm:px-6 py-2.5 text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                    >
                      <FileCheck className="w-4 h-4" />
                      Parfait, j&apos;ai compris !
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

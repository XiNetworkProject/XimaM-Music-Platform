// components/AIRemixSection.tsx
'use client';

import React, { useState } from 'react';
import { Upload, Music, Settings, Sparkles, Loader2 } from 'lucide-react';
import { useUploadCover } from '@/hooks/useUploadCover';
import { notify } from '@/components/NotificationCenter';

interface AIRemixSectionProps {
  onRemixComplete?: () => void;
}

export default function AIRemixSection({ onRemixComplete }: AIRemixSectionProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  
  const [customMode, setCustomMode] = useState(true);
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState('V4_5');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [styleWeight, setStyleWeight] = useState(65);
  const [weirdness, setWeirdness] = useState(50);
  const [audioWeight, setAudioWeight] = useState(65);
  
  const [taskId, setTaskId] = useState<string | null>(null);
  const { state, tracks, error } = useUploadCover(taskId || undefined);

  // Upload du fichier
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('audio/')) {
      notify.error('Erreur', 'Veuillez sélectionner un fichier audio');
      return;
    }

    // Vérifier la taille (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      notify.error('Erreur', 'Fichier trop volumineux (max 50MB)');
      return;
    }

    setUploadedFile(file);
    
    // Upload vers le serveur
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/suno/upload-audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      const data = await response.json();
      setUploadedUrl(data.url);
      
      notify.success('Succès', 'Fichier audio uploadé avec succès !');
    } catch (error: any) {
      console.error('Erreur upload:', error);
      notify.error('Erreur', error.message || 'Erreur lors de l\'upload');
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };

  // Générer le remix/cover
  const handleGenerate = async () => {
    if (!uploadedUrl) {
      notify.error('Erreur', 'Veuillez d\'abord uploader un fichier audio');
      return;
    }

    // Validation selon le mode
    if (customMode) {
      if (!style || !title) {
        notify.error('Erreur', 'Titre et style sont requis en mode personnalisé');
        return;
      }
      if (!instrumental && !prompt) {
        notify.error('Erreur', 'Les paroles sont requises pour une version non-instrumentale');
        return;
      }
    } else {
      if (!prompt) {
        notify.error('Erreur', 'Description requise');
        return;
      }
    }

    try {
      const payload: any = {
        uploadUrl: uploadedUrl,
        customMode,
        instrumental,
        model
      };

      if (customMode) {
        payload.title = title;
        payload.style = style;
        if (!instrumental) payload.prompt = prompt;
        payload.styleWeight = styleWeight / 100;
        payload.weirdnessConstraint = weirdness / 100;
        payload.audioWeight = audioWeight / 100;
      } else {
        payload.prompt = prompt;
      }

      const response = await fetch('/api/suno/upload-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la génération');
      }

      const data = await response.json();
      setTaskId(data.taskId);
      
      notify.success('Succès', 'Génération du remix en cours...');
    } catch (error: any) {
      console.error('Erreur génération:', error);
      notify.error('Erreur', error.message || 'Erreur lors de la génération');
    }
  };

  // Effet pour notifier la complétion
  React.useEffect(() => {
    if (state === 'success' && tracks.length > 0) {
      notify.success('Succès', `Remix terminé ! ${tracks.length} piste(s) générée(s)`);
      if (onRemixComplete) onRemixComplete();
      
      // Reset
      setTaskId(null);
      setUploadedFile(null);
      setUploadedUrl('');
      setTitle('');
      setStyle('');
      setPrompt('');
    }
  }, [state, tracks]);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white-upload backdrop-blur-upload border border-upload rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground-primary mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          1. Uploader un fichier audio
        </h3>
        
        <label className="block">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading || state === 'generating'}
          />
          <div className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all hover:border-accent-purple hover:bg-accent-purple/5
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            ${uploadedFile ? 'border-accent-purple bg-accent-purple/10' : 'border-border-primary'}
          `}>
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
                <p className="text-sm text-foreground-secondary">Upload en cours...</p>
              </div>
            ) : uploadedFile ? (
              <div className="flex flex-col items-center gap-2">
                <Music className="w-8 h-8 text-accent-purple" />
                <p className="text-sm font-medium text-foreground-primary">{uploadedFile.name}</p>
                <p className="text-xs text-foreground-secondary">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-foreground-secondary" />
                <p className="text-sm text-foreground-primary">Cliquez pour uploader</p>
                <p className="text-xs text-foreground-secondary">MP3, WAV, OGG, M4A (max 50MB)</p>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Settings Section */}
      {uploadedUrl && (
        <div className="bg-white-upload backdrop-blur-upload border border-upload rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground-primary mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            2. Paramètres du remix
          </h3>

          {/* Mode */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={customMode}
                onChange={(e) => setCustomMode(e.target.checked)}
                className="w-4 h-4 text-accent-purple rounded focus:ring-accent-purple"
              />
              <span className="text-sm text-foreground-primary">Mode personnalisé</span>
            </label>
          </div>

          {/* Instrumental */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={instrumental}
                onChange={(e) => setInstrumental(e.target.checked)}
                className="w-4 h-4 text-accent-purple rounded focus:ring-accent-purple"
              />
              <span className="text-sm text-foreground-primary">Instrumental (sans paroles)</span>
            </label>
          </div>

          {customMode ? (
            <>
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-foreground-primary mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Mon remix génial"
                  maxLength={100}
                  className="w-full px-4 py-2 bg-background-secondary border border-border-primary rounded-lg 
                           text-foreground-primary placeholder-foreground-tertiary
                           focus:outline-none focus:ring-2 focus:ring-accent-purple"
                />
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium text-foreground-primary mb-2">
                  Style musical *
                </label>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="Pop, Rock, Electronic..."
                  maxLength={1000}
                  className="w-full px-4 py-2 bg-background-secondary border border-border-primary rounded-lg 
                           text-foreground-primary placeholder-foreground-tertiary
                           focus:outline-none focus:ring-2 focus:ring-accent-purple"
                />
              </div>

              {/* Paroles (si non-instrumental) */}
              {!instrumental && (
                <div>
                  <label className="block text-sm font-medium text-foreground-primary mb-2">
                    Paroles *
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Écrivez vos paroles..."
                    maxLength={5000}
                    rows={4}
                    className="w-full px-4 py-2 bg-background-secondary border border-border-primary rounded-lg 
                             text-foreground-primary placeholder-foreground-tertiary resize-none
                             focus:outline-none focus:ring-2 focus:ring-accent-purple"
                  />
                </div>
              )}

              {/* Sliders avancés */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-foreground-primary mb-2">
                    Influence du style: {styleWeight}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={styleWeight}
                    onChange={(e) => setStyleWeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground-primary mb-2">
                    Créativité: {weirdness}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weirdness}
                    onChange={(e) => setWeirdness(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground-primary mb-2">
                    Influence audio source: {audioWeight}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={audioWeight}
                    onChange={(e) => setAudioWeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Mode simple */
            <div>
              <label className="block text-sm font-medium text-foreground-primary mb-2">
                Description *
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décrivez le style souhaité pour le remix..."
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2 bg-background-secondary border border-border-primary rounded-lg 
                         text-foreground-primary placeholder-foreground-tertiary resize-none
                         focus:outline-none focus:ring-2 focus:ring-accent-purple"
              />
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      {uploadedUrl && (
        <button
          onClick={handleGenerate}
          disabled={state === 'generating' || uploading}
          className="w-full bg-gradient-to-r from-accent-purple to-accent-blue 
                   text-white py-4 rounded-xl font-semibold
                   hover:opacity-90 transition-opacity
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
        >
          {state === 'generating' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Générer le remix (10 crédits)
            </>
          )}
        </button>
      )}

      {/* Status */}
      {state === 'generating' && (
        <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-4 text-center">
          <p className="text-sm text-foreground-primary">
            Génération en cours... Cela peut prendre quelques minutes.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}


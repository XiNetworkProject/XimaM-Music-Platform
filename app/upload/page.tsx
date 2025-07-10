'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Music, 
  Image, 
  X, 
  Play, 
  Pause, 
  Volume2,
  Mic,
  Calendar,
  Tag,
  FileText,
  ArrowLeft,
  Check,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import BottomNav from '@/components/BottomNav';

interface UploadFormData {
  title: string;
  artist: string;
  album?: string;
  genre: string[];
  tags: string[];
  description: string;
  lyrics?: string;
  isExplicit: boolean;
  isPublic: boolean;
  copyright: {
    owner: string;
    year: number;
    rights: string;
  };
}

interface UploadProgress {
  audio: number;
  cover: number;
}

// Fonction pour upload direct vers Cloudinary
const uploadToCloudinary = async (file: File, resourceType: 'video' | 'image' = 'video') => {
  // 1. Obtenir la signature d'upload
  const timestamp = Math.round(new Date().getTime() / 1000);
  const publicId = `${resourceType === 'video' ? 'track' : 'cover'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const signatureResponse = await fetch('/api/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamp, publicId, resourceType }),
  });

  if (!signatureResponse.ok) {
    throw new Error('Erreur lors de la génération de la signature');
  }

  const { signature, apiKey, cloudName } = await signatureResponse.json();

  // 2. Upload direct vers Cloudinary - paramètres dans le même ordre que la signature
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', resourceType === 'video' ? 'ximam/audio' : 'ximam/images');
  formData.append('public_id', publicId);
  formData.append('resource_type', resourceType);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  if (resourceType === 'image') {
    formData.append('width', '800');
    formData.append('height', '800');
    formData.append('crop', 'fill');
  }

  console.log('Upload params:', {
    folder: resourceType === 'video' ? 'ximam/audio' : 'ximam/images',
    public_id: publicId,
    resource_type: resourceType,
    timestamp: timestamp.toString(),
    api_key: apiKey,
    signature,
  });

  // Log des paramètres FormData pour debug
  console.log('FormData entries:');
  Array.from(formData.entries()).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.text();
    console.error('Erreur upload Cloudinary:', errorData);
    throw new Error('Erreur lors de l\'upload vers Cloudinary');
  }

  return await uploadResponse.json();
};

export default function UploadPage() {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ audio: 0, cover: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    artist: user?.name || '',
    album: '',
    genre: [],
    tags: [],
    description: '',
    lyrics: '',
    isExplicit: false,
    isPublic: true,
    copyright: {
      owner: user?.name || '',
      year: new Date().getFullYear(),
      rights: 'Tous droits réservés'
    }
  });

  // Vérifier l'authentification
  requireAuth();

  const onAudioDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('Veuillez sélectionner un fichier audio valide');
        return;
      }
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioPreview(url);
    }
  }, []);

  const onCoverDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image valide');
        return;
      }
      setCoverFile(file);
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    }
  }, []);

  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onAudioDrop,
    accept: { 'audio/*': [] },
    maxFiles: 1
  });

  const { getRootProps: getCoverRootProps, getInputProps: getCoverInputProps, isDragActive: isCoverDragActive } = useDropzone({
    onDrop: onCoverDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  const handleInputChange = (field: keyof UploadFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyrightChange = (field: keyof UploadFormData['copyright'], value: any) => {
    setFormData(prev => ({
      ...prev,
      copyright: { ...prev.copyright, [field]: value }
    }));
  };

  const addGenre = (genre: string) => {
    if (genre && !formData.genre.includes(genre)) {
      setFormData(prev => ({ ...prev, genre: [...prev.genre, genre] }));
    }
  };

  const removeGenre = (genre: string) => {
    setFormData(prev => ({ ...prev, genre: prev.genre.filter(g => g !== genre) }));
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!audioFile) {
      toast.error('Veuillez sélectionner un fichier audio');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Veuillez saisir un titre');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ audio: 0, cover: 0 });

    try {
      // Upload audio vers Cloudinary
      const audioLoadingToast = toast.loading('Upload audio en cours...');
      setUploadProgress(prev => ({ ...prev, audio: 25 }));
      
      const audioResult = await uploadToCloudinary(audioFile, 'video');
      setUploadProgress(prev => ({ ...prev, audio: 75 }));
      toast.dismiss(audioLoadingToast);

      // Upload cover si fourni
      let coverResult = null;
      if (coverFile) {
        const coverLoadingToast = toast.loading('Upload image de couverture...');
        setUploadProgress(prev => ({ ...prev, cover: 25 }));
        
        coverResult = await uploadToCloudinary(coverFile, 'image');
        setUploadProgress(prev => ({ ...prev, cover: 75 }));
        toast.dismiss(coverLoadingToast);
      }

      setUploadProgress({ audio: 100, cover: 100 });

      // Sauvegarder en base de données
      const saveLoadingToast = toast.loading('Sauvegarde en cours...');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: audioResult.secure_url,
          audioPublicId: audioResult.public_id,
          coverUrl: coverResult?.secure_url || null,
          coverPublicId: coverResult?.public_id || null,
          trackData: formData,
          duration: audioResult.duration || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.dismiss(saveLoadingToast);
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      const result = await response.json();
      toast.dismiss(saveLoadingToast);
      
      toast.success('Musique uploadée avec succès !');
      router.push('/');
    } catch (error) {
      // Fermer toutes les notifications de chargement en cas d'erreur
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress({ audio: 0, cover: 0 });
    }
  };

  const steps = [
    { id: 1, title: 'Fichiers', icon: Upload },
    { id: 2, title: 'Informations', icon: FileText },
    { id: 3, title: 'Droits', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="container mx-auto px-4 pt-16 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold gradient-text flex items-center gap-3 mb-2">
              <Upload size={28} className="text-purple-400" />
              Upload de Musique
            </h1>
            <p className="text-white/60 text-lg">Partagez vos créations avec la communauté.</p>
          </div>

      {/* Progress Steps */}
          <div className="glass-effect rounded-xl p-6 mb-8">
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      currentStep >= step.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check size={20} />
                    ) : (
                      <step.icon size={20} />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-1 mx-2 transition-colors ${
                        currentStep > step.id ? 'bg-primary-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            className="glass-effect rounded-xl p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Étape 1: Upload des fichiers */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold mb-6">Upload des fichiers</h2>
                
                {/* Upload Audio */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Music size={20} />
                    <span>Fichier Audio</span>
                  </h3>
                  
                  <div
                    {...getAudioRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                      isAudioDragActive
                        ? 'border-primary-500 bg-primary-500/10'
                        : audioFile
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <input {...getAudioInputProps()} />
                    {audioFile ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Music size={24} className="text-green-400" />
                          <span className="font-medium">{audioFile.name}</span>
                        </div>
                        <div className="text-sm text-white/60">
                          {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        {audioPreview && (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setIsPlaying(!isPlaying)}
                              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <span className="text-sm">Prévisualiser</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload size={48} className="mx-auto text-white/60" />
                        <div>
                          <p className="font-medium">Glissez votre fichier audio ici</p>
                          <p className="text-sm text-white/60">ou cliquez pour sélectionner</p>
                        </div>
                        <p className="text-xs text-white/40">
                          Formats supportés: MP3, WAV, FLAC (max 50MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Cover */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Image size={20} />
                    <span>Image de Couverture (optionnel)</span>
                  </h3>
                  
                  <div
                    {...getCoverRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                      isCoverDragActive
                        ? 'border-primary-500 bg-primary-500/10'
                        : coverFile
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <input {...getCoverInputProps()} />
                    {coverFile ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Image size={24} className="text-green-400" />
                          <span className="font-medium">{coverFile.name}</span>
                        </div>
                        <div className="text-sm text-white/60">
                          {(coverFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        {coverPreview && (
                          <div className="flex justify-center">
                            <img
                              src={coverPreview}
                              alt="Aperçu"
                              className="w-32 h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Image size={48} className="mx-auto text-white/60" />
                        <div>
                          <p className="font-medium">Glissez votre image ici</p>
                          <p className="text-sm text-white/60">ou cliquez pour sélectionner</p>
                        </div>
                        <p className="text-xs text-white/40">
                          Formats supportés: JPG, PNG, WebP (max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bars */}
                {(uploadProgress.audio > 0 || uploadProgress.cover > 0) && (
                  <div className="space-y-4">
                    {uploadProgress.audio > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Upload Audio</span>
                          <span>{uploadProgress.audio}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress.audio}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {uploadProgress.cover > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Upload Image</span>
                          <span>{uploadProgress.cover}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress.cover}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-end pt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    disabled={!audioFile || isUploading}
                    className="px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-white/20 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </motion.div>
            )}

            {/* Étape 2: Informations */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold mb-6">Informations de la piste</h2>
                
                {/* Titre */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Titre *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="Titre de votre musique"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-primary-500 transition-colors resize-none"
                    placeholder="Décrivez votre musique..."
                  />
                </div>

                {/* Genre */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Genre</label>
                  <div className="flex flex-wrap gap-2">
                    {['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'Country', 'R&B'].map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => formData.genre.includes(genre) ? removeGenre(genre) : addGenre(genre)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          formData.genre.includes(genre)
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-1 bg-primary-500/20 px-3 py-1 rounded-full">
                        <span className="text-sm">{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-primary-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Ajouter un tag..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          addTag(input.value.trim());
                          input.value = '';
                        }
                      }
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={!formData.title.trim()}
                    className="px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-white/20 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </motion.div>
            )}

            {/* Étape 3: Droits */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold mb-6">Droits et paramètres</h2>
                
                {/* Copyright */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Calendar size={20} />
                    <span>Informations de copyright</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Propriétaire</label>
                      <input
                        type="text"
                        value={formData.copyright.owner}
                        onChange={(e) => handleCopyrightChange('owner', e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                        placeholder="Votre nom ou nom d'artiste"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Année</label>
                      <input
                        type="number"
                        value={formData.copyright.year}
                        onChange={(e) => handleCopyrightChange('year', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                        placeholder="2024"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Droits</label>
                    <select
                      value={formData.copyright.rights}
                      onChange={(e) => handleCopyrightChange('rights', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                    >
                      <option value="Tous droits réservés">Tous droits réservés</option>
                      <option value="Creative Commons">Creative Commons</option>
                      <option value="Domaine public">Domaine public</option>
                    </select>
                  </div>
                </div>

                {/* Paramètres */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Settings size={20} />
                    <span>Paramètres</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPublic}
                        onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                        className="w-5 h-5 text-primary-500 bg-white/10 border-white/20 rounded focus:ring-primary-500"
                      />
                      <span>Rendre public</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isExplicit}
                        onChange={(e) => handleInputChange('isExplicit', e.target.checked)}
                        className="w-5 h-5 text-primary-500 bg-white/10 border-white/20 rounded focus:ring-primary-500"
                      />
                      <span>Contenu explicite</span>
                    </label>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                  >
                    Précédent
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-white/20 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                  >
                    {isUploading ? 'Upload en cours...' : 'Publier'}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </motion.div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
} 
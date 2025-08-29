'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Brain, Music, Zap, Target, Clock, Users, Star, 
  Play, Pause, Download, Share2, Heart, Headphones, 
  ArrowRight, ChevronRight, CheckCircle, Lightbulb, 
  BarChart3, Globe, Award, Crown
} from 'lucide-react';

export default function AIGeneratorPage() {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState('pop');
  const [selectedMood, setSelectedMood] = useState('energetic');
  const [selectedDuration, setSelectedDuration] = useState(180);
  const [isGenerating, setIsGenerating] = useState(false);

  const genres = [
    { id: 'pop', name: 'Pop', icon: '🎵', color: 'from-pink-500 to-purple-600' },
    { id: 'rock', name: 'Rock', icon: '🤘', color: 'from-red-500 to-orange-600' },
    { id: 'electronic', name: 'Électronique', icon: '⚡', color: 'from-blue-500 to-cyan-600' },
    { id: 'jazz', name: 'Jazz', icon: '🎷', color: 'from-amber-500 to-yellow-600' },
    { id: 'classical', name: 'Classique', icon: '🎻', color: 'from-emerald-500 to-teal-600' },
    { id: 'hiphop', name: 'Hip-Hop', icon: '🎤', color: 'from-purple-500 to-indigo-600' }
  ];

  const moods = [
    { id: 'energetic', name: 'Énergique', icon: '🔥', color: 'from-red-500 to-orange-600' },
    { id: 'chill', name: 'Détendu', icon: '😌', color: 'from-blue-500 to-cyan-600' },
    { id: 'romantic', name: 'Romantique', icon: '💕', color: 'from-pink-500 to-rose-600' },
    { id: 'mysterious', name: 'Mystérieux', icon: '🌙', color: 'from-purple-500 to-indigo-600' },
    { id: 'happy', name: 'Joyeux', icon: '😊', color: 'from-yellow-500 to-green-600' },
    { id: 'melancholic', name: 'Mélancolique', icon: '🌧️', color: 'from-gray-500 to-blue-600' }
  ];

  const durations = [
    { value: 60, label: '1 min' },
    { value: 180, label: '3 min' },
    { value: 300, label: '5 min' },
    { value: 600, label: '10 min' }
  ];

  const features = [
    {
      icon: Brain,
      title: 'IA Avancée',
      description: 'Technologie de pointe basée sur les derniers modèles de génération musicale',
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: Zap,
      title: 'Génération Rapide',
      description: 'Créez des morceaux complets en moins de 2 minutes',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Target,
      title: 'Personnalisation Totale',
      description: 'Contrôlez le genre, l\'ambiance, la durée et bien plus encore',
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: Users,
      title: 'Collaboration IA',
      description: 'L\'IA s\'adapte à votre style et vous aide à développer vos idées',
      color: 'from-orange-500 to-red-600'
    }
  ];

  const benefits = [
    {
      icon: '🎯',
      title: 'Inspiration Illimitée',
      description: 'Trouvez de nouvelles idées musicales en quelques clics'
    },
    {
      icon: '⚡',
      title: 'Productivité Décuplée',
      description: 'Accélérez votre processus de création musicale'
    },
    {
      icon: '🎨',
      title: 'Exploration Créative',
      description: 'Découvrez des styles et genres que vous n\'auriez jamais explorés'
    },
    {
      icon: '💡',
      title: 'Apprentissage Continu',
      description: 'L\'IA vous aide à comprendre les structures musicales'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Choisissez vos Préférences',
      description: 'Sélectionnez le genre, l\'ambiance et la durée souhaités',
      icon: Target
    },
    {
      step: 2,
      title: 'L\'IA Analyse et Crée',
      description: 'Notre intelligence artificielle génère une composition unique',
      icon: Brain
    },
    {
      step: 3,
      title: 'Personnalisez le Résultat',
      description: 'Ajustez les éléments selon vos préférences',
      icon: Music
    },
    {
      step: 4,
      title: 'Téléchargez et Partagez',
      description: 'Récupérez votre création et partagez-la avec le monde',
      icon: Download
    }
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulation de génération
    setTimeout(() => {
      setIsGenerating(false);
      // Ici vous pourriez rediriger vers un player ou afficher le résultat
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header Hero */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Fond avec particules */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-pink-900/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,20,147,0.1),transparent_50%)]"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          {/* Badge de statut */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-blue-500/30 rounded-full"
          >
            <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
            <span className="text-white/90 text-sm font-medium">Nouveau</span>
            <Sparkles size={14} className="text-blue-400" />
          </motion.div>

          {/* Titre principal */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-tight"
            style={{
              textShadow: '0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(147, 51, 234, 0.3)'
            }}
          >
            Générateur
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              IA Musicale
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-8"
          >
            Créez des morceaux uniques et professionnels en quelques clics grâce à notre intelligence artificielle de pointe
          </motion.p>

          {/* CTA Principal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-3 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>Commencer la Création</span>
                  <ArrowRight size={24} />
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/subscriptions')}
              className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-semibold hover:bg-white/20 transition-all duration-300 flex items-center space-x-3"
            >
              <Crown size={20} />
              <span>Voir les Abonnements</span>
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Section Fonctionnalités */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pourquoi Choisir Notre IA ?
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Une technologie révolutionnaire qui transforme votre créativité musicale
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '50px' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <div className="relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 h-full">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                    <feature.icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Comment ça marche */}
      <section className="py-20 bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Comment ça Marche ?
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              En 4 étapes simples, créez votre musique unique
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '50px' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative text-center"
              >
                {/* Numéro d'étape */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {step.step}
                </div>
                
                <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-4">
                    <step.icon size={24} className="text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>

                {/* Flèche entre les étapes */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ChevronRight size={32} className="text-blue-500/50" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Générateur Interactif */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Testez le Générateur
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Personnalisez vos préférences et créez votre première composition
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-3xl p-8">
              {/* Sélection du genre */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4">Choisissez un Genre</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => setSelectedGenre(genre.id)}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        selectedGenre === genre.id
                          ? `bg-gradient-to-br ${genre.color} border-transparent`
                          : 'bg-white/5 border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-2">{genre.icon}</div>
                      <div className="text-sm font-medium text-white">{genre.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélection de l'ambiance */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4">Choisissez une Ambiance</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {moods.map((mood) => (
                    <button
                      key={mood.id}
                      onClick={() => setSelectedMood(mood.id)}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        selectedMood === mood.id
                          ? `bg-gradient-to-br ${mood.color} border-transparent`
                          : 'bg-white/5 border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-2">{mood.icon}</div>
                      <div className="text-sm font-medium text-white">{mood.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélection de la durée */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4">Choisissez la Durée</h3>
                <div className="flex flex-wrap gap-4">
                  {durations.map((duration) => (
                    <button
                      key={duration.value}
                      onClick={() => setSelectedDuration(duration.value)}
                      className={`px-6 py-3 rounded-xl border transition-all duration-300 ${
                        selectedDuration === duration.value
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-transparent'
                          : 'bg-white/5 border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-white font-medium">{duration.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bouton de génération */}
              <div className="text-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Génération en cours...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <Sparkles size={24} />
                      <span>Générer ma Musique</span>
                      <ArrowRight size={24} />
                    </div>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section Avantages */}
      <section className="py-20 bg-gradient-to-r from-green-900/10 via-emerald-900/10 to-teal-900/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Avantages du Générateur IA
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Découvrez pourquoi les musiciens choisissent notre technologie
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '50px' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex items-start space-x-4"
              >
                <div className="text-4xl">{benefit.icon}</div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                  <p className="text-gray-400">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section CTA Final */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '50px' }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Prêt à Révolutionner votre Créativité ?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Rejoignez des milliers de musiciens qui utilisent déjà notre générateur IA
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerate}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-3"
              >
                <Sparkles size={24} />
                <span>Essayer Gratuitement</span>
                <ArrowRight size={24} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/subscriptions')}
                className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-semibold hover:bg-white/20 transition-all duration-300 flex items-center space-x-3"
              >
                <Crown size={20} />
                <span>Voir les Plans Premium</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

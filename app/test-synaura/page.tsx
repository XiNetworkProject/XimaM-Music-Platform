'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import SynauraLoader from '@/components/SynauraLoader';
import LoadingScreen from '@/components/LoadingScreen';
import BottomNav from '@/components/BottomNav';

export default function TestSynauraPage() {
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [loadingText, setLoadingText] = useState('Chargement...');

  const handleShowFullScreen = () => {
    setShowFullScreen(true);
    setTimeout(() => setShowFullScreen(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* En-tête */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Test Synaura Loader
        </h1>
        <p className="text-gray-400 mt-2">
          Découvrez les différentes animations du symbole Synaura
        </p>
      </div>

      {/* Grille de démonstration */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Taille Small */}
          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Petit</h3>
            <div className="flex justify-center">
              <SynauraLoader size="sm" text="Petit loader" />
            </div>
          </motion.div>

          {/* Taille Medium */}
          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Moyen</h3>
            <div className="flex justify-center">
              <SynauraLoader size="md" text="Loader moyen" />
            </div>
          </motion.div>

          {/* Taille Large */}
          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Grand</h3>
            <div className="flex justify-center">
              <SynauraLoader size="lg" text="Grand loader" />
            </div>
          </motion.div>

          {/* Taille Extra Large */}
          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Très Grand</h3>
            <div className="flex justify-center">
              <SynauraLoader size="xl" text="Très grand loader" />
            </div>
          </motion.div>
        </div>

        {/* Contrôles */}
        <div className="mt-12 space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-center">Contrôles</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Texte de chargement</label>
                <input
                  type="text"
                  value={loadingText}
                  onChange={(e) => setLoadingText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Entrez un texte..."
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleShowFullScreen}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all duration-200"
                >
                  Afficher écran plein
                </button>
              </div>
            </div>

            {/* Loader avec texte personnalisé */}
            <div className="mt-6 flex justify-center">
              <SynauraLoader size="lg" text={loadingText} />
            </div>
          </div>
        </div>

        {/* Informations */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-center">À propos du symbole Synaura</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-purple-400 mb-2">Design</h4>
              <p className="text-gray-300 text-sm">
                Le symbole Synaura représente un "S" stylisé avec des dégradés aurora boréale 
                (cyan, violet, rose) et des effets de lueur pulsante.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-cyan-400 mb-2">Animations</h4>
              <p className="text-gray-300 text-sm">
                Animations fluides avec rotation, pulsation, tracé progressif et effets de particules 
                pour une expérience visuelle immersive.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Écran de chargement plein */}
      {showFullScreen && (
        <LoadingScreen 
          text="Test écran plein..." 
          size="xl"
          fullScreen={true}
        />
      )}

      <BottomNav />
    </div>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { User } from 'lucide-react';

export default function ProfileUserPage() {
  const { username } = useParams();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="container mx-auto px-4 pt-16 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold gradient-text flex items-center gap-3 mb-2">
              <User size={28} className="text-purple-400" />
              Profil de {username}
            </h1>
            <p className="text-white/60 text-lg">Découvrez les créations de cet artiste.</p>
          </div>
          
          <div className="glass-effect rounded-xl p-6">
            <div className="text-center">
              <p className="text-lg">Ceci est la page de profil dynamique pour l'utilisateur <b>{username}</b>.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
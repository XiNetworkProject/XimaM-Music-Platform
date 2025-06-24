'use client';

import { useParams } from 'next/navigation';

export default function ProfileUserPage() {
  const { username } = useParams();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
      <h1 className="text-3xl font-bold mb-4">Profil de {username}</h1>
      <p className="text-lg">Ceci est la page de profil dynamique pour l'utilisateur <b>{username}</b>.</p>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1>Modifier le profil</h1>
      </div>
    </div>
  );
} 
import { useState, useEffect } from 'react';

interface RegistrationStatus {
  userCount: number;
  isRegistrationOpen: boolean;
  maxUsers: number;
  remainingSlots: number;
}

export function useRegistrationStatus() {
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch('/api/auth/registration-status');
        const data: RegistrationStatus = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Erreur vérification statut inscription:', error);
        // En cas d'erreur, permettre l'inscription
        setStatus({
          userCount: 0,
          isRegistrationOpen: true,
          maxUsers: 50,
          remainingSlots: 50
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  return { status, isLoading };
}

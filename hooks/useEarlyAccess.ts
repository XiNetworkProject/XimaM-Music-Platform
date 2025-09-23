import { useState, useEffect } from 'react';

interface EarlyAccessResponse {
  hasAccess: boolean;
  reason: string;
}

export function useEarlyAccess() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    const checkEarlyAccess = async () => {
      try {
        const response = await fetch('/api/auth/check-early-access');
        const data: EarlyAccessResponse = await response.json();
        
        setHasAccess(data.hasAccess);
        setReason(data.reason);
      } catch (error) {
        console.error('Erreur vérification accès anticipé:', error);
        // En cas d'erreur, permettre l'accès pour éviter de bloquer l'app
        setHasAccess(true);
        setReason('error_fallback');
      } finally {
        setIsLoading(false);
      }
    };

    checkEarlyAccess();
  }, []);

  return { hasAccess, isLoading, reason };
}

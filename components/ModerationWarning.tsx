'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import contentModerator from '@/lib/contentModeration';

interface ModerationWarningProps {
  content: string;
  onModerationChange?: (result: any) => void;
  className?: string;
}

export default function ModerationWarning({
  content,
  onModerationChange,
  className = ''
}: ModerationWarningProps) {
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Analyser le contenu en temps réel
  useEffect(() => {
    if (!content.trim()) {
      setModerationResult(null);
      onModerationChange?.(null);
      return;
    }

    const analyzeContent = async () => {
      setIsAnalyzing(true);
      
      // Simuler un délai pour l'analyse
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = contentModerator.analyzeContent(content);
      setModerationResult(result);
      onModerationChange?.(result);
      setIsAnalyzing(false);
    };

    const timeoutId = setTimeout(analyzeContent, 500);
    return () => clearTimeout(timeoutId);
  }, [content, onModerationChange]);

  if (!moderationResult && !isAnalyzing) {
    return null;
  }

  const getWarningLevel = () => {
    if (!moderationResult) return 'info';
    if (moderationResult.score >= 0.8) return 'error';
    if (moderationResult.score >= 0.5) return 'warning';
    return 'info';
  };

  const getWarningMessage = () => {
    if (!moderationResult) return '';
    
    if (moderationResult.score >= 0.8) {
      return 'Contenu inapproprié détecté. Ce commentaire ne peut pas être publié.';
    }
    if (moderationResult.score >= 0.5) {
      return 'Contenu potentiellement inapproprié détecté. Veuillez réviser votre commentaire.';
    }
    return 'Contenu acceptable.';
  };

  const getWarningIcon = () => {
    const level = getWarningLevel();
    switch (level) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getWarningColor = () => {
    const level = getWarningLevel();
    switch (level) {
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`border-l-4 p-4 rounded-r-lg ${getWarningColor()} ${className}`}
      >
        <div className="flex items-start gap-3">
          {getWarningIcon()}
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">
                {isAnalyzing ? 'Analyse en cours...' : 'Modération du contenu'}
              </h4>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showDetails ? 'Masquer' : 'Détails'}
              </button>
            </div>

            {!isAnalyzing && moderationResult && (
              <>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {getWarningMessage()}
                </p>

                {moderationResult.score > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Score de risque: {Math.round(moderationResult.score * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          moderationResult.score >= 0.8
                            ? 'bg-red-500'
                            : moderationResult.score >= 0.5
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${moderationResult.score * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {moderationResult.flags.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Problèmes détectés:
                        </h5>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          {moderationResult.flags.map((flag: string, index: number) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {moderationResult.suggestions.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Suggestions:
                        </h5>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          {moderationResult.suggestions.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {moderationResult.censoredText && moderationResult.censoredText !== content && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Version censurée:
                        </h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                          {moderationResult.censoredText}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}

            {isAnalyzing && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Analyse du contenu...
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 
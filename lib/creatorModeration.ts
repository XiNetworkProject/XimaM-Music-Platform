import { supabase } from './supabase';

interface CreatorFilter {
  id: string;
  creator_id: string;
  filter_type: 'word' | 'phrase' | 'regex' | 'user';
  filter_value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ModerationAction {
  action: 'delete' | 'favorite' | 'filter' | 'unfilter';
  comment_id: string;
  reason?: string;
  creator_id: string;
  track_id: string;
}

class CreatorModerationService {
  private filters: Map<string, CreatorFilter[]> = new Map();
  private customFilters: Map<string, Set<string>> = new Map(); // creatorId -> Set of blocked words

  constructor() {
    this.loadFilters();
  }

  // Charger les filtres depuis Supabase
  async loadFilters() {
    try {
      const { data: filters, error } = await supabase
        .from('creator_filters')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Erreur chargement filtres Supabase:', error);
        return;
      }

      // Organiser les filtres par créateur
      filters?.forEach(filter => {
        if (!this.filters.has(filter.creator_id)) {
          this.filters.set(filter.creator_id, []);
        }
        this.filters.get(filter.creator_id)!.push(filter);
      });

      console.log('✅ Filtres de modération créateur chargés depuis Supabase');
    } catch (error) {
      console.error('❌ Erreur chargement filtres:', error);
    }
  }

  // Ajouter un mot filtré pour un créateur
  async addCustomFilter(creatorId: string, word: string): Promise<boolean> {
    try {
      // Ajouter en mémoire
      if (!this.customFilters.has(creatorId)) {
        this.customFilters.set(creatorId, new Set());
      }
      this.customFilters.get(creatorId)!.add(word.toLowerCase());

      // Sauvegarder dans Supabase
      const { error } = await supabase
        .from('creator_filters')
        .insert({
          creator_id: creatorId,
          filter_type: 'word',
          filter_value: word.toLowerCase(),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Erreur sauvegarde filtre Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur ajout filtre personnalisé:', error);
      return false;
    }
  }

  // Supprimer un mot filtré pour un créateur
  async removeCustomFilter(creatorId: string, word: string): Promise<boolean> {
    try {
      // Supprimer de la mémoire
      const filters = this.customFilters.get(creatorId);
      if (filters) {
        filters.delete(word.toLowerCase());
      }

      // Supprimer de Supabase
      const { error } = await supabase
        .from('creator_filters')
        .delete()
        .eq('creator_id', creatorId)
        .eq('filter_value', word.toLowerCase());

      if (error) {
        console.error('❌ Erreur suppression filtre Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur suppression filtre personnalisé:', error);
      return false;
    }
  }

  // Obtenir les mots filtrés d'un créateur
  async getCustomFilters(creatorId: string): Promise<string[]> {
    try {
      // D'abord essayer de récupérer depuis Supabase
      const { data: filters, error } = await supabase
        .from('creator_filters')
        .select('filter_value')
        .eq('creator_id', creatorId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Erreur récupération filtres Supabase:', error);
        // Fallback sur la mémoire
        const memoryFilters = this.customFilters.get(creatorId);
        return memoryFilters ? Array.from(memoryFilters) : [];
      }

      return filters?.map(f => f.filter_value) || [];
    } catch (error) {
      console.error('❌ Erreur récupération filtres personnalisés:', error);
      return [];
    }
  }

  // Vérifier si un contenu contient des mots filtrés par le créateur
  async checkCustomFilters(creatorId: string, content: string): Promise<{
    hasBlockedWords: boolean;
    blockedWords: string[];
    shouldFilter: boolean;
  }> {
    try {
      const filters = this.customFilters.get(creatorId);
      if (!filters || filters.size === 0) {
        return { hasBlockedWords: false, blockedWords: [], shouldFilter: false };
      }

      const lowerContent = content.toLowerCase();
      const blockedWords: string[] = [];

      for (const word of Array.from(filters)) {
        if (lowerContent.includes(word)) {
          blockedWords.push(word);
        }
      }

      return {
        hasBlockedWords: blockedWords.length > 0,
        blockedWords,
        shouldFilter: blockedWords.length > 0
      };
    } catch (error) {
      console.error('❌ Erreur vérification filtres personnalisés:', error);
      return { hasBlockedWords: false, blockedWords: [], shouldFilter: false };
    }
  }

  // Appliquer les filtres de modération sur un commentaire
  async moderateComment(commentId: string, content: string, creatorId: string): Promise<{
    shouldModerate: boolean;
    reason?: string;
    action: 'allow' | 'filter' | 'delete';
  }> {
    try {
      // Vérifier les filtres personnalisés du créateur
      const customFilterResult = await this.checkCustomFilters(creatorId, content);
      
      if (customFilterResult.shouldFilter) {
        return {
          shouldModerate: true,
          reason: `Contenu filtré par le créateur: ${customFilterResult.blockedWords.join(', ')}`,
          action: 'filter'
        };
      }

      // Vérifier les filtres globaux
      const globalFilters = this.filters.get('global') || [];
      for (const filter of globalFilters) {
        if (filter.filter_type === 'word' && content.toLowerCase().includes(filter.filter_value)) {
          return {
            shouldModerate: true,
            reason: `Mot filtré globalement: ${filter.filter_value}`,
            action: 'filter'
          };
        }
      }

      return {
        shouldModerate: false,
        action: 'allow'
      };
    } catch (error) {
      console.error('❌ Erreur modération commentaire:', error);
      return {
        shouldModerate: false,
        action: 'allow'
      };
    }
  }

  // Enregistrer une action de modération
  async logModerationAction(action: ModerationAction): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('moderation_actions')
        .insert({
          action: action.action,
          comment_id: action.comment_id,
          reason: action.reason,
          creator_id: action.creator_id,
          track_id: action.track_id,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Erreur log action modération Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur log action modération:', error);
      return false;
    }
  }

  // Obtenir l'historique des actions de modération d'un créateur
  async getModerationHistory(creatorId: string, limit: number = 50): Promise<ModerationAction[]> {
    try {
      const { data: actions, error } = await supabase
        .from('moderation_actions')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erreur récupération historique modération Supabase:', error);
        return [];
      }

      return actions?.map(action => ({
        action: action.action,
        comment_id: action.comment_id,
        reason: action.reason,
        creator_id: action.creator_id,
        track_id: action.track_id
      })) || [];
    } catch (error) {
      console.error('❌ Erreur récupération historique modération:', error);
      return [];
    }
  }

  // Obtenir les statistiques de modération d'un créateur
  async getModerationStats(creatorId: string): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    recentActivity: number;
  }> {
    try {
      const { data: actions, error } = await supabase
        .from('moderation_actions')
        .select('*')
        .eq('creator_id', creatorId);

      if (error) {
        console.error('❌ Erreur récupération stats modération Supabase:', error);
        return { totalActions: 0, actionsByType: {}, recentActivity: 0 };
      }

      const totalActions = actions?.length || 0;
      const actionsByType: Record<string, number> = {};
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      let recentActivity = 0;

      actions?.forEach(action => {
        const actionType = action.action;
        actionsByType[actionType] = (actionsByType[actionType] || 0) + 1;
        
        if (new Date(action.created_at) > oneWeekAgo) {
          recentActivity++;
        }
      });

      return { totalActions, actionsByType, recentActivity };
    } catch (error) {
      console.error('❌ Erreur récupération stats modération:', error);
      return { totalActions: 0, actionsByType: {}, recentActivity: 0 };
    }
  }

  // Rafraîchir les filtres depuis Supabase
  async refreshFilters(): Promise<void> {
    await this.loadFilters();
  }
}

export const creatorModerationService = new CreatorModerationService();
export default creatorModerationService; 
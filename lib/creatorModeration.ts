import dbConnect from './db';
import Comment from '@/models/Comment';
import Track from '@/models/Track';
import User from '@/models/User';

interface CreatorFilter {
  _id: string;
  creatorId: string;
  filterType: 'word' | 'phrase' | 'regex' | 'user';
  filterValue: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ModerationAction {
  action: 'delete' | 'favorite' | 'filter' | 'unfilter';
  commentId: string;
  reason?: string;
  creatorId: string;
  trackId: string;
}

class CreatorModerationService {
  private filters: Map<string, CreatorFilter[]> = new Map();
  private customFilters: Map<string, Set<string>> = new Map(); // creatorId -> Set of blocked words

  constructor() {
    this.loadFilters();
  }

  // Charger les filtres depuis la base de données
  async loadFilters() {
    try {
      await dbConnect();
      // Ici on pourrait charger les filtres depuis une collection dédiée
      // Pour l'instant, on utilise des filtres en mémoire
      console.log('✅ Filtres de modération créateur chargés');
    } catch (error) {
      console.error('❌ Erreur chargement filtres:', error);
    }
  }

  // Ajouter un mot filtré pour un créateur
  async addCustomFilter(creatorId: string, word: string): Promise<boolean> {
    try {
      if (!this.customFilters.has(creatorId)) {
        this.customFilters.set(creatorId, new Set());
      }
      this.customFilters.get(creatorId)!.add(word.toLowerCase());
      return true;
    } catch (error) {
      console.error('Erreur ajout filtre personnalisé:', error);
      return false;
    }
  }

  // Supprimer un mot filtré pour un créateur
  async removeCustomFilter(creatorId: string, word: string): Promise<boolean> {
    try {
      const filters = this.customFilters.get(creatorId);
      if (filters) {
        filters.delete(word.toLowerCase());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur suppression filtre personnalisé:', error);
      return false;
    }
  }

  // Obtenir les mots filtrés d'un créateur
  async getCustomFilters(creatorId: string): Promise<string[]> {
    try {
      const filters = this.customFilters.get(creatorId);
      return filters ? Array.from(filters) : [];
    } catch (error) {
      console.error('Erreur récupération filtres personnalisés:', error);
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
      console.error('Erreur vérification filtres personnalisés:', error);
      return { hasBlockedWords: false, blockedWords: [], shouldFilter: false };
    }
  }

  // Vérifier si un utilisateur est le créateur d'une piste
  async isTrackCreator(trackId: string, userId: string): Promise<boolean> {
    try {
      await dbConnect();
      const track = await Track.findById(trackId);
      return track?.artist.toString() === userId;
    } catch (error) {
      console.error('Erreur vérification créateur:', error);
      return false;
    }
  }

  // Supprimer un commentaire (créateur ou utilisateur)
  async deleteComment(
    commentId: string, 
    userId: string, 
    reason: string = 'user'
  ): Promise<boolean> {
    try {
      await dbConnect();
      
      const comment = await Comment.findById(commentId);
      if (!comment) return false;

      const track = await Track.findById(comment.track);
      if (!track) return false;

      // Vérifier les permissions
      const isCreator = track.artist.toString() === userId;
      const isCommentAuthor = comment.user.toString() === userId;

      if (!isCreator && !isCommentAuthor) {
        throw new Error('Permissions insuffisantes');
      }

      // Marquer comme supprimé au lieu de supprimer physiquement
      await Comment.findByIdAndUpdate(commentId, {
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date(),
        deletionReason: reason
      });

      return true;
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
      return false;
    }
  }

  // Adorer un commentaire (créateur seulement)
  async favoriteComment(commentId: string, creatorId: string): Promise<boolean> {
    try {
      await dbConnect();
      
      const comment = await Comment.findById(commentId);
      if (!comment) return false;

      const track = await Track.findById(comment.track);
      if (!track) return false;

      // Vérifier que c'est bien le créateur
      if (track.artist.toString() !== creatorId) {
        throw new Error('Seul le créateur peut adorer ses commentaires');
      }

      // Basculer l'état d'adoration
      const isCurrentlyFavorite = comment.isCreatorFavorite;
      
      await Comment.findByIdAndUpdate(commentId, {
        isCreatorFavorite: !isCurrentlyFavorite,
        creatorFavoriteAt: !isCurrentlyFavorite ? new Date() : undefined,
        creatorFavoriteBy: !isCurrentlyFavorite ? creatorId : undefined
      });

      return true;
    } catch (error) {
      console.error('Erreur adoration commentaire:', error);
      return false;
    }
  }

  // Filtrer un commentaire (créateur seulement)
  async filterComment(
    commentId: string, 
    creatorId: string, 
    reason: string
  ): Promise<boolean> {
    try {
      await dbConnect();
      
      const comment = await Comment.findById(commentId);
      if (!comment) return false;

      const track = await Track.findById(comment.track);
      if (!track) return false;

      // Vérifier que c'est bien le créateur
      if (track.artist.toString() !== creatorId) {
        throw new Error('Seul le créateur peut filtrer les commentaires');
      }

      await Comment.findByIdAndUpdate(commentId, {
        customFiltered: true,
        customFilterReason: reason
      });

      return true;
    } catch (error) {
      console.error('Erreur filtrage commentaire:', error);
      return false;
    }
  }

  // Défiltrer un commentaire
  async unfilterComment(commentId: string, creatorId: string): Promise<boolean> {
    try {
      await dbConnect();
      
      const comment = await Comment.findById(commentId);
      if (!comment) return false;

      const track = await Track.findById(comment.track);
      if (!track) return false;

      // Vérifier que c'est bien le créateur
      if (track.artist.toString() !== creatorId) {
        throw new Error('Seul le créateur peut défiltrer les commentaires');
      }

      await Comment.findByIdAndUpdate(commentId, {
        customFiltered: false,
        customFilterReason: undefined
      });

      return true;
    } catch (error) {
      console.error('Erreur défiltrage commentaire:', error);
      return false;
    }
  }

  // Récupérer les commentaires avec filtres créateur
  async getFilteredComments(
    trackId: string, 
    userId?: string,
    includeDeleted: boolean = false,
    includeFiltered: boolean = false
  ) {
    try {
      await dbConnect();
      
      const track = await Track.findById(trackId);
      if (!track) return [];

      const isCreator = userId && track.artist.toString() === userId;
      
      // Construire la requête de base
      let query: any = { 
        track: trackId, 
        parentComment: { $exists: false } 
      };

      // Si pas créateur, exclure les commentaires supprimés et filtrés
      if (!isCreator) {
        query.isDeleted = { $ne: true };
        query.customFiltered = { $ne: true };
      } else if (!includeDeleted) {
        // Si créateur mais pas includeDeleted, exclure seulement les supprimés
        query.isDeleted = { $ne: true };
      }

      // Si créateur et pas includeFiltered, exclure les filtrés
      if (isCreator && !includeFiltered) {
        query.customFiltered = { $ne: true };
      }

      const comments = await Comment.find(query)
        .populate('user', 'name username avatar')
        .populate({
          path: 'replies',
          match: isCreator ? {} : { isDeleted: { $ne: true }, customFiltered: { $ne: true } },
          populate: {
            path: 'user',
            select: 'name username avatar'
          }
        })
        .sort({ createdAt: -1 });

      return comments;
    } catch (error) {
      console.error('Erreur récupération commentaires filtrés:', error);
      return [];
    }
  }

  // Récupérer les statistiques de modération pour un créateur
  async getModerationStats(trackId: string, creatorId: string) {
    try {
      await dbConnect();
      
      const track = await Track.findById(trackId);
      if (!track || track.artist.toString() !== creatorId) {
        throw new Error('Accès non autorisé');
      }

      const stats = await Comment.aggregate([
        { $match: { track: track._id } },
        {
          $group: {
            _id: null,
            totalComments: { $sum: 1 },
            deletedComments: { $sum: { $cond: ['$isDeleted', 1, 0] } },
            filteredComments: { $sum: { $cond: ['$customFiltered', 1, 0] } },
            favoriteComments: { $sum: { $cond: ['$isCreatorFavorite', 1, 0] } },
            averageModerationScore: { $avg: '$moderationScore' }
          }
        }
      ]);

      return stats[0] || {
        totalComments: 0,
        deletedComments: 0,
        filteredComments: 0,
        favoriteComments: 0,
        averageModerationScore: 0
      };
    } catch (error) {
      console.error('Erreur statistiques modération:', error);
      return null;
    }
  }

  // Vérifier les permissions de modération
  async checkModerationPermissions(
    trackId: string, 
    userId: string
  ): Promise<{
    canDelete: boolean;
    canFavorite: boolean;
    canFilter: boolean;
    isCreator: boolean;
  }> {
    try {
      await dbConnect();
      
      const track = await Track.findById(trackId);
      if (!track) {
        return {
          canDelete: false,
          canFavorite: false,
          canFilter: false,
          isCreator: false
        };
      }

      const isCreator = track.artist.toString() === userId;

      return {
        canDelete: true, // Tout le monde peut supprimer ses propres commentaires
        canFavorite: isCreator, // Seul le créateur peut adorer
        canFilter: isCreator, // Seul le créateur peut filtrer
        isCreator
      };
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      return {
        canDelete: false,
        canFavorite: false,
        canFilter: false,
        isCreator: false
      };
    }
  }
}

export default new CreatorModerationService(); 
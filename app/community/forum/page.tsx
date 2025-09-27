'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, Plus, Search, Filter, ThumbsUp, Reply, Clock, User, Tag, AlertCircle, Lightbulb, HelpCircle, Bug } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
    username: string;
    avatar?: string;
  };
  category: 'question' | 'suggestion' | 'bug' | 'general';
  tags: string[];
  likes: number;
  replies: number;
  createdAt: string;
  isLiked?: boolean;
}

const categories = [
  { id: 'all', label: 'Tous', icon: MessageSquare },
  { id: 'question', label: 'Questions', icon: HelpCircle },
  { id: 'suggestion', label: 'Suggestions', icon: Lightbulb },
  { id: 'bug', label: 'Bugs', icon: Bug },
  { id: 'general', label: 'Général', icon: MessageSquare },
] as const;

export default function CommunityForumPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'question' as const,
    tags: [] as string[],
  });

  // Charger les posts depuis l'API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedCategory !== 'all') params.append('category', selectedCategory);
        if (searchQuery) params.append('search', searchQuery);
        
        const response = await fetch(`/api/community/posts?${params.toString()}`);
        if (!response.ok) throw new Error('Erreur lors du chargement des posts');
        
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedCategory, searchQuery]);

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleLike = async (postId: string) => {
    if (!session?.user) {
      toast.error('Vous devez être connecté pour liker');
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.isLiked) {
        // Supprimer le like
        const response = await fetch(`/api/community/posts/likes?post_id=${postId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setPosts(prev => prev.map(p => 
            p.id === postId 
              ? { ...p, isLiked: false, likes: p.likes - 1 }
              : p
          ));
        }
      } else {
        // Ajouter le like
        const response = await fetch('/api/community/posts/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId })
        });
        if (response.ok) {
          setPosts(prev => prev.map(p => 
            p.id === postId 
              ? { ...p, isLiked: true, likes: p.likes + 1 }
              : p
          ));
        }
      }
    } catch (error) {
      console.error('Erreur lors du like:', error);
      toast.error('Erreur lors du like');
    }
  };

  const handleSubmitPost = async () => {
    if (!session?.user) {
      toast.error('Vous devez être connecté pour poster');
      return;
    }

    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Titre et contenu requis');
      return;
    }

    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création du post');
      }

      const post = await response.json();
      setPosts(prev => [post, ...prev]);
      setNewPost({ title: '', content: '', category: 'question', tags: [] });
      setShowNewPost(false);
      toast.success('Post publié avec succès !');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la publication');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen w-full text-[var(--text)] pb-20">
      <div className="w-full p-2 sm:p-3">
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-white/[0.02] backdrop-blur-xl max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="flex h-fit w-full flex-row items-center justify-between p-4 text-[var(--text)] max-md:p-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 bg-blue-500/10 border border-blue-500/20">
                <MessageSquare size={24} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl max-md:text-lg font-bold">Forum Communauté</h1>
                <p className="text-[var(--text-muted)] text-sm">Posez vos questions, partagez vos idées</p>
              </div>
            </div>
            {session?.user && (
              <button
                onClick={() => setShowNewPost(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nouveau post</span>
              </button>
            )}
          </div>

          {/* Filtres et recherche */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Rechercher dans le forum..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              
              {/* Catégories */}
              <div className="flex gap-2 overflow-x-auto">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all duration-200 ${
                        selectedCategory === category.id
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="text-sm">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Liste des posts */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun post trouvé</h3>
                <p className="text-[var(--text-muted)]">Essayez de modifier vos filtres ou créez le premier post !</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const CategoryIcon = categories.find(c => c.id === post.category)?.icon || MessageSquare;
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 hover:bg-[var(--surface-3)] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                            <CategoryIcon size={16} className="text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1 hover:text-blue-400 cursor-pointer">
                              {post.title}
                            </h3>
                            <p className="text-[var(--text-muted)] text-sm mb-2 line-clamp-2">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                              <div className="flex items-center gap-1">
                                <User size={12} />
                                <span>{post.author.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock size={12} />
                                <span>{formatDate(post.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-[var(--surface-3)] text-[var(--text-muted)] text-xs rounded-lg border border-[var(--border)]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 ${
                              post.isLiked
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10'
                            }`}
                          >
                            <ThumbsUp size={14} />
                            <span className="text-sm">{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200">
                            <Reply size={14} />
                            <span className="text-sm">{post.replies}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal nouveau post */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewPost(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">Nouveau post</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titre</label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Titre de votre post..."
                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie</label>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="question">Question</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="bug">Bug</option>
                    <option value="general">Général</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Contenu</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Décrivez votre question, suggestion ou problème..."
                    rows={6}
                    className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewPost(false)}
                  className="flex-1 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] rounded-xl hover:bg-[var(--surface-4)] transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitPost}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
                >
                  Publier
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
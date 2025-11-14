'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  MessageSquare,
  Plus,
  Search,
  ThumbsUp,
  Reply,
  Clock,
  HelpCircle,
  Bug,
  Lightbulb,
  Wand2,
  Filter,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { categorizePost, suggestTags } from '@/lib/postCategorization';
import Avatar from '@/components/Avatar';

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
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [postId: string]: any[] }>({});
  const [newComment, setNewComment] = useState('');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'question' as 'question' | 'suggestion' | 'bug' | 'general',
    tags: [] as string[],
  });
  const [autoCategorizeEnabled, setAutoCategorizeEnabled] = useState(true);

  // Catégorisation automatique en temps réel
  useEffect(() => {
    if (!autoCategorizeEnabled) return;

    const timeoutId = setTimeout(() => {
      if (newPost.title.trim() || newPost.content.trim()) {
        const suggestedCategory = categorizePost(newPost.title, newPost.content);
        const suggestedTags = suggestTags(newPost.title, newPost.content);

        setNewPost((prev) => ({
          ...prev,
          category: suggestedCategory,
          tags: suggestedTags,
        }));
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [newPost.title, newPost.content, autoCategorizeEnabled]);

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
        const postsData = data.posts || [];

        // Récupérer les informations utilisateur pour chaque post
        const postsWithAuthors = await Promise.all(
          postsData.map(async (post: any) => {
            try {
              const userResponse = await fetch(`/api/users/by-id/${post.user_id}`);
              if (userResponse.ok) {
                const userData = await userResponse.json();

                // Vérifier si l'utilisateur a liké ce post
                let isLiked = false;
                if (session?.user?.id) {
                  try {
                    const likesResponse = await fetch(
                      `/api/community/posts/likes?post_id=${post.id}`,
                    );
                    if (likesResponse.ok) {
                      const likes = await likesResponse.json();
                      isLiked = likes.some(
                        (like: any) => like.user_id === session.user.id,
                      );
                      console.log(`Post ${post.id} - isLiked: ${isLiked}`);
                    }
                  } catch (error) {
                    console.error('Erreur lors de la vérification du like:', error);
                  }
                }

                return {
                  ...post,
                  createdAt: post.created_at,
                  isLiked,
                  likes: Number(post.likes_count) || 0,
                  replies: Number(post.replies_count) || 0,
                  author: {
                    id: userData.id,
                    name: userData.name,
                    username: userData.username,
                    avatar: userData.avatar,
                  },
                };
              }
            } catch (error) {
              console.error(
                "Erreur lors de la récupération de l'utilisateur:",
                error,
              );
            }

            return {
              ...post,
              createdAt: post.created_at,
              likes: Number(post.likes_count) || 0,
              replies: Number(post.replies_count) || 0,
              author: {
                id: post.user_id,
                name: 'Utilisateur inconnu',
                username: 'unknown',
                avatar: null,
              },
            };
          }),
        );

        setPosts(postsWithAuthors);
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedCategory, searchQuery, session?.user?.id]);

  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    return matchesCategory && matchesSearch;
  });

  const handleLike = async (postId: string) => {
    if (!session?.user) {
      toast.error('Vous devez être connecté pour liker');
      return;
    }

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      console.log(
        `Tentative de like pour le post ${postId}, statut actuel: ${post.isLiked}`,
      );

      if (post.isLiked) {
        const response = await fetch(
          `/api/community/posts/likes?post_id=${postId}`,
          {
            method: 'DELETE',
          },
        );
        if (response.ok) {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, isLiked: false, likes: p.likes - 1 } : p,
            ),
          );
        }
      } else {
        const response = await fetch('/api/community/posts/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId }),
        });

        console.log('Like response status:', response.status);
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Like error:', errorData);

          if (errorData.error === 'Post déjà liké') {
            console.log('Post déjà liké - mise à jour du statut');
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId
                  ? { ...p, isLiked: true, likes: p.likes + 1 }
                  : p,
              ),
            );
            return;
          }

          throw new Error(errorData.error || 'Erreur lors du like');
        }

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, isLiked: true, likes: p.likes + 1 } : p,
          ),
        );
      }
    } catch (error) {
      console.error('Erreur lors du like:', error);
      toast.error('Erreur lors du like');
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (showComments === postId) {
      setShowComments(null);
    } else {
      setShowComments(postId);
      if (!comments[postId]) {
        try {
          const response = await fetch(
            `/api/community/posts/replies?post_id=${postId}`,
          );
          if (response.ok) {
            const replies = await response.json();
            setComments((prev) => ({ ...prev, [postId]: replies }));
          }
        } catch (error) {
          console.error('Erreur lors du chargement des commentaires:', error);
        }
      }
    }
  };

  const handleSubmitComment = async (postId: string) => {
    if (!session?.user) {
      toast.error('Vous devez être connecté pour commenter');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Commentaire requis');
      return;
    }

    try {
      const response = await fetch('/api/community/posts/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, content: newComment.trim() }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création du commentaire');
      }

      const reply = await response.json();

      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), reply],
      }));

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, replies: p.replies + 1 } : p,
        ),
      );

      setNewComment('');
      toast.success('Commentaire ajouté !');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'ajout du commentaire");
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
        body: JSON.stringify(newPost),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création du post');
      }

      const post = await response.json();

      const postWithAuthor = {
        ...post,
        createdAt: post.created_at,
        likes: Number(post.likes_count) || 0,
        replies: Number(post.replies_count) || 0,
        author: {
          id: session.user.id,
          name: (session.user as any).name || 'Utilisateur',
          username: (session.user as any).username || 'user',
          avatar:
            (session.user as any).avatar ||
            (session.user as any).image ||
            '/default-avatar.png',
        },
      };

      setPosts((prev) => [postWithAuthor, ...prev]);
      setNewPost({ title: '', content: '', category: 'question', tags: [] });
      setShowNewPost(false);
      toast.success('Post publié avec succès !');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la publication');
    }
  };

  const handleAutoCategorize = () => {
    if (!newPost.title.trim() && !newPost.content.trim()) {
      toast.error(
        'Veuillez saisir un titre ou un contenu pour la catégorisation automatique',
      );
      return;
    }

    const suggestedCategory = categorizePost(newPost.title, newPost.content);
    const suggestedTags = suggestTags(newPost.title, newPost.content);

    setNewPost((prev) => ({
      ...prev,
      category: suggestedCategory,
      tags: suggestedTags,
    }));

    toast.success(
      `Catégorie suggérée : ${
        categories.find((c) => c.id === suggestedCategory)?.label
      }`,
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="relative min-h-screen text-white pb-20">
      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 md:px-8 py-6 md:py-10">
        {/* Card principale */}
        <div className="rounded-3xl border border-white/10 bg-transparent backdrop-blur-xl overflow-hidden">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-white/10">
            <div className="flex items-start gap-3">
              <div className="relative mt-1">
                <div className="absolute inset-0 rounded-2xl bg-blue-500/80 blur-xl opacity-70" />
                <div className="relative w-10 h-10 rounded-2xl bg-black/70 border border-white/15 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-300" />
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">
                  Synaura
                </p>
                <h1 className="text-xl md:text-2xl font-semibold">
                  Forum Communauté
                </h1>
                <p className="text-xs md:text-sm text-white/65 mt-1 max-w-xl">
                  Posez vos questions, partagez vos idées, signalez les bugs et
                  aidez à construire l&apos;avenir de Synaura.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {session?.user ? (
                <button
                  onClick={() => setShowNewPost(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 via-fuchsia-500 to-cyan-400 text-white shadow-[0_0_24px_rgba(59,130,246,0.8)] hover:scale-[1.02] active:scale-100 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouveau post</span>
                </button>
              ) : (
                <p className="text-[11px] text-white/55">
                  Connectez-vous pour participer aux discussions.
                </p>
              )}
            </div>
          </div>

          {/* Bandeau info */}
          <div className="px-4 md:px-6 py-3 border-b border-white/10 bg-white/5 flex items-center gap-2 text-[11px] text-white/70">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
            <p>
              Merci de rester respectueux et constructif. Pour les bugs
              critiques, utilisez de préférence la catégorie <span className="font-semibold text-red-300">Bug</span>.
            </p>
          </div>

          {/* FILTRES + RECHERCHE */}
          <div className="px-4 md:px-6 py-4 border-b border-white/10 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un post (titre, contenu, tags)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-300/70"
                />
              </div>

              {/* Catégories */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-white/60 px-2">
                  <Filter className="w-3 h-3" /> Catégories :
                </span>
                {categories.map((category) => {
                  const Icon = category.icon;
                  const active = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                        active
                          ? 'bg-blue-500/30 text-blue-50 border border-blue-400/70 shadow-[0_0_18px_rgba(59,130,246,0.7)]'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* LISTE DES POSTS */}
          <div className="px-4 md:px-6 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                <p className="text-sm text-white/70">
                  Chargement des discussions...
                </p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 mx-auto text-white/25 mb-3" />
                <h3 className="text-sm font-semibold mb-1">
                  Aucun post trouvé
                </h3>
                <p className="text-xs text-white/60">
                  Ajustez vos filtres ou soyez le premier à lancer une
                  discussion !
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredPosts.map((post) => {
                  const CategoryIcon =
                    categories.find((c) => c.id === post.category)?.icon ||
                    MessageSquare;

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl bg-white/5 border border-white/10 p-3.5 md:p-4 hover:bg-white/8 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/35 to-purple-500/35 border border-blue-400/50 shadow-[0_0_16px_rgba(59,130,246,0.7)]">
                            <CategoryIcon className="w-4 h-4 text-blue-50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm md:text-base font-semibold mb-1 text-white hover:text-blue-300 cursor-pointer line-clamp-2">
                              {post.title}
                            </h3>
                            <p className="text-xs md:text-sm text-white/65 mb-2 line-clamp-2">
                              {post.content}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
                              <div className="flex items-center gap-1.5">
                                <Avatar
                                  src={
                                    (post.author.avatar || '')
                                      .replace(
                                        '/upload/',
                                        '/upload/f_auto,q_auto/',
                                      ) || null
                                  }
                                  name={post.author.name}
                                  username={post.author.username}
                                  size="xs"
                                />
                                <span>{post.author.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(post.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 text-[10px] text-white/55">
                            <Tag className="w-3 h-3" /> Tags :
                          </span>
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full bg-black/40 border border-white/15 text-[11px] text-white/70"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                              post.isLiked
                                ? 'bg-red-500/25 text-red-100 border border-red-400/70 shadow-[0_0_14px_rgba(248,113,113,0.7)]'
                                : 'bg-black/40 text-white/60 border border-white/15 hover:bg-red-500/15 hover:text-red-200 hover:border-red-400/60'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>{post.likes || 0}</span>
                          </button>
                          <button
                            onClick={() => handleToggleComments(post.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-black/40 text-white/60 border border-white/15 hover:bg-blue-500/20 hover:text-blue-100 hover:border-blue-400/70 transition-all"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            <span>{post.replies || 0} réponses</span>
                          </button>
                        </div>
                      </div>

                      {/* Commentaires */}
                      {showComments === post.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 border-t border-white/10 pt-3 space-y-3"
                        >
                          {/* Formulaire commentaire */}
                          {session?.user && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Ajouter un commentaire..."
                                className="flex-1 px-3 py-2 text-sm rounded-2xl bg-black/40 border border-white/15 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-blue-400/60"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSubmitComment(post.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleSubmitComment(post.id)}
                                className="px-4 py-2 rounded-2xl text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-[0_0_18px_rgba(59,130,246,0.7)] hover:scale-[1.01] active:scale-100 transition-transform"
                              >
                                Envoyer
                              </button>
                            </div>
                          )}

                          {/* Liste commentaires */}
                          <div className="space-y-2.5">
                            {comments[post.id]?.length ? (
                              comments[post.id].map((comment: any) => (
                                <div
                                  key={comment.id}
                                  className="flex gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/10"
                                >
                                  <Avatar
                                    src={
                                      (comment.profiles?.avatar || '')
                                        .replace(
                                          '/upload/',
                                          '/upload/f_auto,q_auto/',
                                        ) || null
                                    }
                                    name={comment.profiles?.name}
                                    username={comment.profiles?.username}
                                    size="sm"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-xs font-medium text-white">
                                        {comment.profiles?.name ||
                                          'Utilisateur inconnu'}
                                      </span>
                                      <span className="text-[10px] text-white/50">
                                        {formatDate(comment.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-white/70">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-[11px] text-white/55 py-3">
                                Aucun commentaire pour le moment
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL NOUVEAU POST */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={() => setShowNewPost(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl bg-transparent border border-white/10 backdrop-blur-xl p-5 md:p-6"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Nouveau post
                  </h2>
                  <p className="text-xs text-white/60">
                    Explique clairement ton problème, idée ou question pour
                    obtenir de meilleures réponses.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-white/80">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) =>
                      setNewPost((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Titre de votre post..."
                    className="w-full px-3 py-2 text-sm rounded-2xl bg-black/40 border border-white/15 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-blue-400/60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_minmax(0,1fr)] gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-white/80">
                      Catégorie
                    </label>
                    <select
                      value={newPost.category}
                      onChange={(e) =>
                        setNewPost((prev) => ({
                          ...prev,
                          category: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-2xl bg-black/40 border border-white/15 text-white outline-none focus:ring-2 focus:ring-blue-400/60"
                    >
                      <option value="question">Question</option>
                      <option value="suggestion">Suggestion</option>
                      <option value="bug">Bug</option>
                      <option value="general">Général</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-white/80 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Tags suggérés
                    </label>
                    <div className="min-h-[40px] rounded-2xl bg-black/40 border border-white/15 px-2 py-1.5 flex flex-wrap gap-1.5">
                      {newPost.tags.length > 0 ? (
                        newPost.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 rounded-full bg-blue-500/25 border border-blue-400/70 text-[11px] text-blue-50"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-white/40">
                          Les tags apparaîtront ici après la
                          catégorisation automatique.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-white/80">
                    Contenu
                  </label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) =>
                      setNewPost((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Décrivez votre question, suggestion ou problème avec le plus de détails possible..."
                    rows={6}
                    className="w-full px-3 py-2 text-sm rounded-2xl bg-black/40 border border-white/15 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-blue-400/60 resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleAutoCategorize}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_18px_rgba(168,85,247,0.8)] hover:scale-[1.02] active:scale-100 transition-transform"
                    >
                      <Wand2 className="w-4 h-4" />
                      Catégoriser automatiquement
                    </button>
                    <label className="inline-flex items-center gap-2 text-[11px] text-white/70">
                      <input
                        type="checkbox"
                        checked={autoCategorizeEnabled}
                        onChange={(e) =>
                          setAutoCategorizeEnabled(e.target.checked)
                        }
                        className="rounded border-white/30 bg-black/60"
                      />
                      Auto-catégorisation en temps réel
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowNewPost(false)}
                  className="flex-1 px-4 py-2 rounded-2xl text-sm font-medium bg-black/40 border border-white/15 text-white hover:bg-black/60 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitPost}
                  className="flex-1 px-4 py-2 rounded-2xl text-sm font-semibold bg-gradient-to-r from-blue-500 via-fuchsia-500 to-cyan-400 text-white shadow-[0_0_24px_rgba(59,130,246,0.9)] hover:scale-[1.01] active:scale-100 transition-transform"
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

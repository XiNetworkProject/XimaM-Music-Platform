'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Users, MessageCircleQuestion, Wrench, Bug, HelpCircle, Plus, X, ThumbsUp, MessageSquare, Filter, SortAsc 
} from 'lucide-react';

type PostType = 'question' | 'improvement' | 'bug';
type PostStatus = 'open' | 'in_progress' | 'resolved';

interface ProductPost {
  id: string;
  type: PostType;
  title: string;
  content: string;
  status: PostStatus;
  votes: number;
  commentsCount: number;
  createdAt: string;
  author: { id: string; name: string; username: string; avatar?: string };
}

interface FaqItem { id: string; question: string; answer: string }

export const dynamic = 'force-dynamic';

export default function ProductCommunityPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'questions' | 'improvements' | 'bugs' | 'faq'>('questions');
  const [items, setItems] = useState<ProductPost[]>([]);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formType, setFormType] = useState<PostType>('question');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'votes'>('recent');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (activeTab === 'faq') {
          const res = await fetch('/api/community/product/faq', { headers: { 'Cache-Control': 'no-store' } }).catch(() => null);
          if (res && res.ok) {
            const data = await res.json();
            setFaq(Array.isArray(data?.items) ? data.items : []);
          } else {
            // fallback mock FAQ
            setFaq([
              { id: '1', question: 'Comment proposer une idée ?', answer: 'Créez un sujet dans l’onglet Améliorations.' },
              { id: '2', question: 'Comment signaler un bug ?', answer: 'Ouvrez un ticket dans l’onglet Bugs avec étapes de reproduction.' }
            ]);
          }
          setItems([]);
        } else {
          const typeMap: Record<typeof activeTab, PostType> = {
            questions: 'question',
            improvements: 'improvement',
            bugs: 'bug',
            faq: 'question'
          };
          const type = typeMap[activeTab];
          const res = await fetch(`/api/community/product/posts?type=${type}&sort=${sortBy}`, { headers: { 'Cache-Control': 'no-store' } }).catch(() => null);
          if (res && res.ok) {
            const data = await res.json();
            setItems(Array.isArray(data?.posts) ? data.posts : []);
          } else {
            // fallback mock data
            setItems([
              {
                id: 'mock-1', type, title: 'Exemple de sujet', content: 'Décrivez clairement votre idée ou question.',
                status: 'open', votes: 3, commentsCount: 1, createdAt: new Date().toISOString(),
                author: { id: 'u1', name: 'Invité', username: 'invite' }
              }
            ]);
          }
          setFaq([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab, sortBy]);

  const sortedItems = useMemo(() => {
    if (sortBy === 'votes') return [...items].sort((a, b) => b.votes - a.votes);
    return [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [items, sortBy]);

  const createPost = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/community/product/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: formType, title: formTitle, content: formContent })
      }).catch(() => null);
      if (res && res.ok) {
        setShowModal(false);
        setFormContent('');
        setFormTitle('');
        // recharger
        setActiveTab(formType === 'question' ? 'questions' : formType === 'improvement' ? 'improvements' : 'bugs');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="container mx-auto px-4 pt-16 pb-24 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Users className="text-purple-400" /> Communauté du produit
          </h1>
          <p className="text-white/60 mt-1">Questions, idées, bugs et FAQ pour améliorer Synaura.</p>
        </div>

        {/* Tabs */}
        <div className="glass-effect rounded-xl p-2 mb-6 flex gap-1 bg-white/10">
          <button onClick={() => setActiveTab('questions')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab==='questions'?'bg-gradient-to-r from-purple-600 to-pink-600':'hover:bg-white/10'} transition-colors`}> 
            <MessageCircleQuestion size={16} className="inline mr-2"/> Questions
          </button>
          <button onClick={() => setActiveTab('improvements')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab==='improvements'?'bg-gradient-to-r from-purple-600 to-pink-600':'hover:bg-white/10'} transition-colors`}>
            <Wrench size={16} className="inline mr-2"/> Améliorations
          </button>
          <button onClick={() => setActiveTab('bugs')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab==='bugs'?'bg-gradient-to-r from-purple-600 to-pink-600':'hover:bg-white/10'} transition-colors`}>
            <Bug size={16} className="inline mr-2"/> Bugs
          </button>
          <button onClick={() => setActiveTab('faq')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab==='faq'?'bg-gradient-to-r from-purple-600 to-pink-600':'hover:bg-white/10'} transition-colors`}>
            <HelpCircle size={16} className="inline mr-2"/> FAQ
          </button>
        </div>

        {/* Toolbar */}
        {activeTab !== 'faq' && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white/70">
              <Filter size={16}/> Filtrer
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSortBy(sortBy==='recent'?'votes':'recent')} className="px-3 py-1.5 bg-white/10 rounded-lg text-sm hover:bg-white/15">
                <SortAsc size={14} className="inline mr-1"/> Trier: {sortBy==='recent'?'Récents':'Votes'}
              </button>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded-lg text-sm">
                <Plus size={16}/> Nouveau sujet
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="glass-effect rounded-xl p-4">
          {loading ? (
            <div className="text-center py-12 text-white/70">Chargement…</div>
          ) : activeTab === 'faq' ? (
            <div className="space-y-4">
              {faq.map(item => (
                <div key={item.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="font-semibold mb-1">{item.question}</h3>
                  <p className="text-white/70 text-sm whitespace-pre-line">{item.answer}</p>
                </div>
              ))}
              {faq.length === 0 && (
                <div className="text-center py-12 text-white/60">Aucune entrée FAQ pour le moment.</div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedItems.map(post => (
                <div key={post.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-white/40 mb-1">{new Date(post.createdAt).toLocaleString()}</div>
                      <h3 className="font-semibold truncate">{post.title}</h3>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${post.status==='open'?'border-yellow-400/40 text-yellow-300':post.status==='in_progress'?'border-blue-400/40 text-blue-300':'border-green-400/40 text-green-300'}`}>
                      {post.status==='open'?'Ouvert':post.status==='in_progress'?'En cours':'Résolu'}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 mt-2 whitespace-pre-line line-clamp-3">{post.content}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-white/70">
                    <button className="flex items-center gap-1 hover:text-white" onClick={async () => {
                      await fetch(`/api/community/product/posts/${post.id}/vote`, { method: 'POST' }).catch(()=>{});
                      setItems(prev => prev.map(p => p.id===post.id?{...p, votes: p.votes+1}:p));
                    }}>
                      <ThumbsUp size={14}/> {post.votes}
                    </button>
                    <button className="flex items-center gap-1 hover:text-white" onClick={() => router.push(`/community/product/${post.id}`)}>
                      <MessageSquare size={14}/> {post.commentsCount}
                    </button>
                  </div>
                </div>
              ))}
              {sortedItems.length === 0 && (
                <div className="text-center py-12 text-white/60">Aucun sujet pour le moment.</div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal création */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="w-full max-w-lg bg-white/10 border border-white/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Nouveau sujet</h3>
                <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20" onClick={() => setShowModal(false)}><X size={16}/></button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button onClick={() => setFormType('question')} className={`py-2 rounded-lg text-sm ${formType==='question'?'bg-purple-600':'bg-white/10 hover:bg-white/15'}`}>
                  <MessageCircleQuestion size={14} className="inline mr-1"/> Question
                </button>
                <button onClick={() => setFormType('improvement')} className={`py-2 rounded-lg text-sm ${formType==='improvement'?'bg-purple-600':'bg-white/10 hover:bg-white/15'}`}>
                  <Wrench size={14} className="inline mr-1"/> Amélioration
                </button>
                <button onClick={() => setFormType('bug')} className={`py-2 rounded-lg text-sm ${formType==='bug'?'bg-purple-600':'bg-white/10 hover:bg-white/15'}`}>
                  <Bug size={14} className="inline mr-1"/> Bug
                </button>
              </div>
              <input value={formTitle} onChange={e=>setFormTitle(e.target.value)} placeholder="Titre" className="w-full mb-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none" />
              <textarea value={formContent} onChange={e=>setFormContent(e.target.value)} placeholder="Décrivez votre sujet..." rows={5} className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none"/>
              <div className="flex gap-2 justify-end mt-4">
                <button className="px-3 py-2 bg-white/10 rounded-lg" onClick={()=>setShowModal(false)}>Annuler</button>
                <button className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg" onClick={createPost} disabled={creating}>
                  {creating?'Publication...':'Publier'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



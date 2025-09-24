'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Save, X, Image as ImageIcon, Palette, Type, AlignLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface Announcement {
  id: string;
  title: string;
  description: string;
  background_image_url?: string;
  background_color: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    background_image_url: '',
    background_color: '#6366f1',
    order_index: 0
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements);
      } else {
        toast.error('Erreur lors du chargement des annonces');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingAnnouncement ? '/api/admin/announcements' : '/api/admin/announcements';
      const method = editingAnnouncement ? 'PUT' : 'POST';
      
      const payload = editingAnnouncement 
        ? { id: editingAnnouncement.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingAnnouncement ? 'Annonce mise à jour' : 'Annonce créée');
        setShowForm(false);
        setEditingAnnouncement(null);
        setFormData({
          title: '',
          description: '',
          background_image_url: '',
          background_color: '#6366f1',
          order_index: 0
        });
        fetchAnnouncements();
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      description: announcement.description,
      background_image_url: announcement.background_image_url || '',
      background_color: announcement.background_color,
      order_index: announcement.order_index
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

    try {
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Annonce supprimée');
        fetchAnnouncements();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: announcement.id,
          is_active: !announcement.is_active
        })
      });

      if (response.ok) {
        toast.success(`Annonce ${announcement.is_active ? 'désactivée' : 'activée'}`);
        fetchAnnouncements();
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const moveAnnouncement = async (id: string, direction: 'up' | 'down') => {
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return;

    const currentIndex = announcement.order_index;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    const targetAnnouncement = announcements.find(a => a.order_index === newIndex);
    if (!targetAnnouncement) return;

    try {
      // Échanger les positions
      await Promise.all([
        fetch('/api/admin/announcements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, order_index: newIndex })
        }),
        fetch('/api/admin/announcements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetAnnouncement.id, order_index: currentIndex })
        })
      ]);

      toast.success('Ordre mis à jour');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Gestion des Annonces</h1>
          <p className="text-white/70">Gérez le carrousel de l'accueil</p>
        </div>

        {/* Bouton Ajouter */}
        <div className="mb-6">
          <button
            onClick={() => {
              setShowForm(true);
              setEditingAnnouncement(null);
              setFormData({
                title: '',
                description: '',
                background_image_url: '',
                background_color: '#6366f1',
                order_index: announcements.length
              });
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus size={20} />
            Nouvelle Annonce
          </button>
        </div>

        {/* Formulaire */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingAnnouncement ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingAnnouncement(null);
                  }}
                  className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Titre */}
                  <div>
                    <label className="flex items-center gap-2 text-white/90 mb-2">
                      <Type size={16} />
                      Titre
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Titre de l'annonce"
                      required
                    />
                  </div>

                  {/* Couleur de fond */}
                  <div>
                    <label className="flex items-center gap-2 text-white/90 mb-2">
                      <Palette size={16} />
                      Couleur de fond
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        className="w-16 h-12 rounded-xl border border-white/20"
                      />
                      <input
                        type="text"
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="flex items-center gap-2 text-white/90 mb-2">
                    <AlignLeft size={16} />
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                    placeholder="Description de l'annonce"
                    required
                  />
                </div>

                {/* Image de fond */}
                <div>
                  <label className="flex items-center gap-2 text-white/90 mb-2">
                    <ImageIcon size={16} />
                    Image de fond (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.background_image_url}
                    onChange={(e) => setFormData({ ...formData, background_image_url: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                {/* Ordre */}
                <div>
                  <label className="flex items-center gap-2 text-white/90 mb-2">
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    className="w-32 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Save size={16} />
                    {editingAnnouncement ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingAnnouncement(null);
                    }}
                    className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Liste des annonces */}
        <div className="space-y-4">
          {announcements.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-white">{announcement.title}</h3>
                    <div className="flex items-center gap-2">
                      {announcement.is_active ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                          Inactif
                        </span>
                      )}
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                        Ordre: {announcement.order_index}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-white/70 mb-4">{announcement.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span>Couleur: {announcement.background_color}</span>
                    {announcement.background_image_url && (
                      <span>Image: ✓</span>
                    )}
                    <span>Créé: {new Date(announcement.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {/* Ordre */}
                  <button
                    onClick={() => moveAnnouncement(announcement.id, 'up')}
                    disabled={index === 0}
                    className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveAnnouncement(announcement.id, 'down')}
                    disabled={index === announcements.length - 1}
                    className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    <ArrowDown size={16} />
                  </button>

                  {/* Actions */}
                  <button
                    onClick={() => toggleActive(announcement)}
                    className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title={announcement.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {announcement.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Modifier"
                  >
                    <Edit size={16} />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {announcements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">Aucune annonce pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
}

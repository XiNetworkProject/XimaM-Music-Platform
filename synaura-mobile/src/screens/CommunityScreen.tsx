import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
  LayoutAnimation,
  UIManager,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { api, CommunityPost } from '../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACCENT = '#7B61FF';
const ACCENT_CYAN = '#00D0BB';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.08)';

type FAQItem = { _id?: string; question: string; answer: string; category?: string };
type TabId = 'forum' | 'faq';

const CommunityScreen: React.FC = () => {
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState<TabId>('forum');
  const [loading, setLoading] = useState(true);

  // Community stats
  const [communityStats, setCommunityStats] = useState({ resolved: 0, posts: 0, members: 0 });

  // Forum
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);

  // FAQ
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [postsRes, faqRes, statsRes] = await Promise.all([
      api.getCommunityPosts(),
      api.getFAQ(),
      api.getCommunityStats(),
    ]);

    if (postsRes.success) {
      setPosts(postsRes.data.posts ?? []);
    }
    if (faqRes.success) {
      setFaqs((faqRes.data.faqs ?? []).map((f: any, i: number) => ({
        _id: f._id ?? String(i),
        question: f.question ?? f.title ?? '',
        answer: f.answer ?? f.content ?? '',
        category: f.category,
      })));
    }
    if (statsRes.success) {
      const s = statsRes.data.stats ?? {};
      setCommunityStats({
        resolved: s.resolved ?? s.questionsResolved ?? 0,
        posts: s.posts ?? s.totalPosts ?? 0,
        members: s.members ?? s.totalMembers ?? 0,
      });
    }
    setLoading(false);
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Erreur', 'Le titre et le contenu sont requis.');
      return;
    }
    setPosting(true);
    const res = await api.createCommunityPost({ title: newTitle.trim(), content: newContent.trim() });
    setPosting(false);
    if (res.success) {
      setNewTitle('');
      setNewContent('');
      setShowNewPost(false);
      loadData();
    } else {
      Alert.alert('Erreur', 'Impossible de créer le post.');
    }
  };

  const togglePost = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPost(expandedPost === id ? null : id);
  };

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const timeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}j`;
      return `${Math.floor(days / 30)}mois`;
    } catch { return ''; }
  };

  const filteredFaqs = faqSearch.trim()
    ? faqs.filter(f =>
        f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
        f.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
        (f.category ?? '').toLowerCase().includes(faqSearch.toLowerCase())
      )
    : faqs;

  const faqCategories = [...new Set(faqs.map(f => f.category).filter(Boolean))] as string[];

  if (loading) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard icon="checkmark-circle-outline" value={communityStats.resolved} label="Résolues" color={ACCENT_CYAN} />
          <StatCard icon="chatbubbles-outline" value={communityStats.posts} label="Posts" color={ACCENT} />
          <StatCard icon="people-outline" value={communityStats.members} label="Membres" color="#FFB800" />
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, activeTab === 'forum' && styles.tabActive]} onPress={() => setActiveTab('forum')}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={activeTab === 'forum' ? ACCENT : colors.textTertiary} />
            <Text style={[styles.tabText, activeTab === 'forum' && styles.tabTextActive]}>Forum</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'faq' && styles.tabActive]} onPress={() => setActiveTab('faq')}>
            <Ionicons name="help-circle-outline" size={18} color={activeTab === 'faq' ? ACCENT : colors.textTertiary} />
            <Text style={[styles.tabText, activeTab === 'faq' && styles.tabTextActive]}>FAQ</Text>
          </Pressable>
        </View>

        {/* Forum Tab */}
        {activeTab === 'forum' && (
          <View>
            {/* New Post Button */}
            {!showNewPost ? (
              <Pressable style={styles.newPostButton} onPress={() => setShowNewPost(true)}>
                <LinearGradient
                  colors={[ACCENT, '#6F4CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.newPostGradient}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.newPostText}>Créer un post</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={styles.newPostForm}>
                <Text style={styles.newPostFormTitle}>Nouveau post</Text>
                <TextInput
                  style={styles.input}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Titre"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={newContent}
                  onChangeText={setNewContent}
                  placeholder="Contenu..."
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  numberOfLines={4}
                />
                <View style={styles.newPostActions}>
                  <Pressable style={styles.cancelButton} onPress={() => { setShowNewPost(false); setNewTitle(''); setNewContent(''); }}>
                    <Text style={styles.cancelText}>Annuler</Text>
                  </Pressable>
                  <Pressable style={styles.submitButton} onPress={handleCreatePost} disabled={posting}>
                    {posting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitText}>Publier</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Posts List */}
            {posts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyText}>Aucun post pour le moment</Text>
                <Text style={styles.emptySubText}>Sois le premier à publier !</Text>
              </View>
            ) : (
              posts.map((post) => {
                const isExpanded = expandedPost === post._id;
                return (
                  <Pressable key={post._id} onPress={() => togglePost(post._id)}>
                    <View style={[styles.postCard, isExpanded && styles.postCardExpanded]}>
                      <View style={styles.postHeader}>
                        {post.author?.avatar ? (
                          <Image source={{ uri: post.author.avatar }} style={styles.postAvatar} />
                        ) : (
                          <LinearGradient colors={[ACCENT, ACCENT_CYAN]} style={styles.postAvatar}>
                            <Text style={styles.postAvatarInitial}>
                              {(post.author?.username ?? '?').charAt(0).toUpperCase()}
                            </Text>
                          </LinearGradient>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.postAuthor}>{post.author?.name ?? post.author?.username ?? 'Anonyme'}</Text>
                          <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                        </View>
                        {post.category && (
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{post.category}</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.postTitle}>{post.title}</Text>
                      <Text style={styles.postContent} numberOfLines={isExpanded ? undefined : 2}>
                        {post.content}
                      </Text>

                      <View style={styles.postFooter}>
                        <View style={styles.postStat}>
                          <Ionicons name="heart-outline" size={16} color={colors.textTertiary} />
                          <Text style={styles.postStatText}>{post.likes ?? 0}</Text>
                        </View>
                        <View style={styles.postStat}>
                          <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
                          <Text style={styles.postStatText}>{post.replies ?? 0}</Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textTertiary}
                          style={{ marginLeft: 'auto' }}
                        />
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <View>
            {/* Search */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                value={faqSearch}
                onChangeText={setFaqSearch}
                placeholder="Rechercher dans la FAQ..."
                placeholderTextColor="rgba(255,255,255,0.25)"
              />
              {faqSearch.length > 0 && (
                <Pressable onPress={() => setFaqSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* Category chips */}
            {faqCategories.length > 0 && !faqSearch && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ gap: 8 }}>
                {faqCategories.map((cat, i) => (
                  <Pressable key={i} style={styles.chip} onPress={() => setFaqSearch(cat)}>
                    <Text style={styles.chipText}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* FAQ items */}
            {filteredFaqs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="help-circle-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyText}>
                  {faqSearch ? 'Aucun résultat' : 'Aucune FAQ disponible'}
                </Text>
              </View>
            ) : (
              filteredFaqs.map((faq) => {
                const faqId = faq._id ?? faq.question;
                const isOpen = expandedFaq === faqId;
                return (
                  <Pressable key={faqId} onPress={() => toggleFaq(faqId)}>
                    <View style={[styles.faqCard, isOpen && styles.faqCardOpen]}>
                      <View style={styles.faqHeader}>
                        <Ionicons
                          name={isOpen ? 'remove-circle-outline' : 'add-circle-outline'}
                          size={20}
                          color={isOpen ? ACCENT_CYAN : ACCENT}
                        />
                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                      </View>
                      {isOpen && (
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      )}
                      {faq.category && (
                        <View style={styles.faqCategoryWrap}>
                          <Text style={styles.faqCategoryText}>{faq.category}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function Header({ navigation }: { navigation: any }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle}>Communauté</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

function StatCard({ icon, value, label, color }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020017' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { flex: 1, paddingHorizontal: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase' },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: 'rgba(123,97,255,0.15)' },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textTertiary },
  tabTextActive: { color: ACCENT },

  newPostButton: { marginBottom: 16 },
  newPostGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  newPostText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  newPostForm: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  newPostFormTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  newPostActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textTertiary },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: ACCENT,
    minWidth: 90,
    alignItems: 'center',
  },
  submitText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  postCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    marginBottom: 10,
  },
  postCardExpanded: { borderColor: 'rgba(123,97,255,0.3)' },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarInitial: { fontSize: 14, fontWeight: '700', color: '#fff' },
  postAuthor: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  postTime: { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  categoryBadge: {
    backgroundColor: 'rgba(123,97,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: { fontSize: 11, fontWeight: '600', color: ACCENT },
  postTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  postContent: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  postFooter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  postStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postStatText: { fontSize: 13, color: colors.textTertiary },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: colors.textPrimary,
    fontSize: 14,
  },

  chipScroll: { marginBottom: 16 },
  chip: {
    backgroundColor: 'rgba(123,97,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: ACCENT },

  faqCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    marginBottom: 8,
  },
  faqCardOpen: { borderColor: 'rgba(0,208,187,0.3)' },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 20 },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  faqCategoryWrap: { marginTop: 8 },
  faqCategoryText: { fontSize: 11, color: colors.textTertiary, fontStyle: 'italic' },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emptyText: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },
  emptySubText: { fontSize: 13, color: colors.textTertiary, opacity: 0.7, textAlign: 'center' },
});

export default CommunityScreen;

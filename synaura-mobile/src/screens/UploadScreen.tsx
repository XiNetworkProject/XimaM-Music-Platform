import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const TOTAL_STEPS = 4;

const GENRES = [
  'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Électronique', 'Jazz', 'Soul',
  'Afrobeat', 'Reggae', 'Classique', 'Latin', 'Country', 'Metal',
  'Indie', 'Lo-fi', 'Drill', 'Dancehall', 'Gospel', 'Autre',
];

type MockFile = {
  name: string;
  size: number;
  type: string;
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
};

const UploadScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // Step 1
  const [selectedFile, setSelectedFile] = useState<MockFile | null>(null);

  // Step 2
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState(user?.name || '');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [explicit, setExplicit] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  // Step 3
  const [coverUri, setCoverUri] = useState<string | null>(null);

  const handleSelectFile = useCallback(() => {
    Alert.alert(
      'Sélectionner un fichier',
      'Choisissez un fichier audio depuis votre appareil.\n\nFormats acceptés : MP3, WAV, M4A, AAC, FLAC\nTaille max : 100 MB',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Simuler un fichier',
          onPress: () => {
            setSelectedFile({
              name: 'mon-morceau.mp3',
              size: 8_540_000,
              type: 'audio/mpeg',
            });
          },
        },
      ],
    );
  }, []);

  const handleSelectCover = useCallback(() => {
    Alert.alert(
      'Choisir une image',
      'Sélectionnez une image de couverture.\nFormat carré recommandé, min 500×500px.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Simuler une image',
          onPress: () => setCoverUri('mock'),
        },
      ],
    );
  }, []);

  const canGoNext = useCallback(() => {
    switch (step) {
      case 1: return !!selectedFile;
      case 2: return title.trim().length > 0;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  }, [step, selectedFile, title]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const payload = {
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim() || undefined,
        genre: genre || undefined,
        description: description.trim() || undefined,
        lyrics: lyrics.trim() || undefined,
        explicit,
        isPublic,
      };
      const res = await api.publishTrack(payload);
      if (res.success) {
        setPublished(true);
        Alert.alert('Publié !', 'Votre morceau a été publié avec succès.');
      } else {
        Alert.alert('Erreur', res.error || 'Une erreur est survenue.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de publier le morceau.');
    } finally {
      setPublishing(false);
    }
  }, [title, artist, album, genre, description, lyrics, explicit, isPublic]);

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const s = i + 1;
        const active = s === step;
        const done = s < step;
        return (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                active && styles.stepDotActive,
                done && styles.stepDotDone,
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>
                  {s}
                </Text>
              )}
            </View>
            {i < TOTAL_STEPS - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Sélectionner un fichier audio</Text>
      <Text style={styles.stepSubtitle}>
        Choisissez le fichier que vous souhaitez publier sur Synaura.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.dropzone, pressed && styles.dropzonePressed]}
        onPress={handleSelectFile}
      >
        {selectedFile ? (
          <View style={styles.fileSelected}>
            <View style={styles.fileIconWrap}>
              <Ionicons name="musical-note" size={32} color={colors.accentBrand} />
            </View>
            <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
            <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
            <Pressable
              style={styles.changeFileBtn}
              onPress={handleSelectFile}
            >
              <Text style={styles.changeFileBtnText}>Changer de fichier</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.uploadIconCircle}>
              <Ionicons name="cloud-upload-outline" size={48} color={colors.accentBrand} />
            </View>
            <Text style={styles.dropzoneTitle}>Glissez ou sélectionnez</Text>
            <Text style={styles.dropzoneSubtitle}>
              MP3, WAV, M4A, AAC, FLAC — max 100 MB
            </Text>
            <View style={styles.selectBtn}>
              <LinearGradient
                colors={['#7B61FF', '#00D0BB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.selectBtnGradient}
              >
                <Ionicons name="folder-open-outline" size={18} color="#fff" />
                <Text style={styles.selectBtnText}>Sélectionner un fichier audio</Text>
              </LinearGradient>
            </View>
          </>
        )}
      </Pressable>

      <View style={styles.formatsRow}>
        {['MP3', 'WAV', 'M4A', 'AAC', 'FLAC'].map((f) => (
          <View key={f} style={styles.formatBadge}>
            <Text style={styles.formatBadgeText}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Informations du morceau</Text>

      <Text style={styles.label}>Titre *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Titre du morceau"
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={styles.label}>Artiste</Text>
      <TextInput
        style={styles.input}
        value={artist}
        onChangeText={setArtist}
        placeholder="Nom de l'artiste"
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={styles.label}>Album (optionnel)</Text>
      <TextInput
        style={styles.input}
        value={album}
        onChangeText={setAlbum}
        placeholder="Nom de l'album"
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={styles.label}>Genre</Text>
      <Pressable
        style={styles.pickerBtn}
        onPress={() => setShowGenrePicker(!showGenrePicker)}
      >
        <Text style={[styles.pickerBtnText, !genre && { color: colors.textTertiary }]}>
          {genre || 'Sélectionner un genre'}
        </Text>
        <Ionicons
          name={showGenrePicker ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {showGenrePicker && (
        <View style={styles.genreGrid}>
          {GENRES.map((g) => (
            <Pressable
              key={g}
              style={[styles.genreChip, genre === g && styles.genreChipActive]}
              onPress={() => { setGenre(g); setShowGenrePicker(false); }}
            >
              <Text style={[styles.genreChipText, genre === g && styles.genreChipTextActive]}>
                {g}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>Description (optionnel)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Décrivez votre morceau..."
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.label}>Paroles (optionnel)</Text>
      <TextInput
        style={[styles.input, styles.textAreaLarge]}
        value={lyrics}
        onChangeText={setLyrics}
        placeholder="Collez les paroles ici..."
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
      />

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Ionicons name="warning-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.toggleLabel}>Contenu explicite</Text>
        </View>
        <Switch
          value={explicit}
          onValueChange={setExplicit}
          trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(123,97,255,0.5)' }}
          thumbColor={explicit ? colors.accentBrand : '#ccc'}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Ionicons name={isPublic ? 'globe-outline' : 'lock-closed-outline'} size={20} color={colors.textSecondary} />
          <Text style={styles.toggleLabel}>{isPublic ? 'Public' : 'Privé'}</Text>
        </View>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(0,208,187,0.5)' }}
          thumbColor={isPublic ? colors.accentBlue : '#ccc'}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Image de couverture</Text>
      <Text style={styles.stepSubtitle}>
        Ajoutez une pochette à votre morceau pour le rendre plus attractif.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.coverArea, pressed && { opacity: 0.8 }]}
        onPress={handleSelectCover}
      >
        {coverUri ? (
          <View style={styles.coverPreview}>
            <LinearGradient
              colors={['rgba(123,97,255,0.3)', 'rgba(0,208,187,0.3)']}
              style={styles.coverPlaceholderGradient}
            >
              <Ionicons name="image" size={64} color={colors.accentBrand} />
              <Text style={styles.coverPlaceholderText}>Image sélectionnée</Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.coverPlaceholder}>
            <LinearGradient
              colors={['rgba(123,97,255,0.15)', 'rgba(0,208,187,0.15)']}
              style={styles.coverPlaceholderGradient}
            >
              <Ionicons name="image-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.coverPlaceholderLabel}>Aucune image</Text>
            </LinearGradient>
          </View>
        )}
      </Pressable>

      <Pressable style={styles.chooseCoverBtn} onPress={handleSelectCover}>
        <Ionicons name="images-outline" size={18} color={colors.accentBrand} />
        <Text style={styles.chooseCoverBtnText}>
          {coverUri ? 'Changer l\'image' : 'Choisir une image'}
        </Text>
      </Pressable>

      <Text style={styles.coverHint}>
        Format carré recommandé, min 500×500px. JPG ou PNG.
      </Text>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Résumé & Publication</Text>
      <Text style={styles.stepSubtitle}>
        Vérifiez les informations avant de publier.
      </Text>

      <View style={styles.summaryCard}>
        <SummaryRow label="Fichier" value={selectedFile?.name || '—'} icon="musical-note" />
        <SummaryRow label="Titre" value={title || '—'} icon="text" />
        <SummaryRow label="Artiste" value={artist || '—'} icon="person" />
        {album ? <SummaryRow label="Album" value={album} icon="disc" /> : null}
        {genre ? <SummaryRow label="Genre" value={genre} icon="pricetag" /> : null}
        {description ? <SummaryRow label="Description" value={description} icon="document-text" truncate /> : null}
        {lyrics ? <SummaryRow label="Paroles" value="Incluses" icon="mic" /> : null}
        <SummaryRow label="Couverture" value={coverUri ? 'Image ajoutée' : 'Aucune'} icon="image" />
        <SummaryRow label="Visibilité" value={isPublic ? 'Public' : 'Privé'} icon={isPublic ? 'globe' : 'lock-closed'} />
        {explicit && <SummaryRow label="Explicit" value="Oui" icon="warning" />}
      </View>

      {publishing && (
        <View style={styles.publishingRow}>
          <ActivityIndicator size="small" color={colors.accentBrand} />
          <Text style={styles.publishingText}>Publication en cours...</Text>
        </View>
      )}

      {published && (
        <View style={styles.publishedBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#00D0BB" />
          <Text style={styles.publishedText}>Morceau publié avec succès !</Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Upload</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomBar}>
        {step > 1 && (
          <Pressable
            style={styles.backBtn}
            onPress={() => setStep((s) => s - 1)}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
            <Text style={styles.backBtnText}>Retour</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        {step < TOTAL_STEPS ? (
          <Pressable
            style={[styles.nextBtn, !canGoNext() && styles.nextBtnDisabled]}
            onPress={() => canGoNext() && setStep((s) => s + 1)}
            disabled={!canGoNext()}
          >
            <LinearGradient
              colors={canGoNext() ? ['#7B61FF', '#00D0BB'] : ['#333', '#333']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              <Text style={styles.nextBtnText}>Suivant</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.publishBtn, (publishing || published) && styles.nextBtnDisabled]}
            onPress={handlePublish}
            disabled={publishing || published}
          >
            <LinearGradient
              colors={published ? ['#00D0BB', '#00D0BB'] : ['#7B61FF', '#00D0BB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              {publishing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={published ? 'checkmark-circle' : 'rocket'} size={18} color="#fff" />
                  <Text style={styles.nextBtnText}>
                    {published ? 'Publié !' : 'Publier'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const SummaryRow: React.FC<{
  label: string;
  value: string;
  icon: string;
  truncate?: boolean;
}> = ({ label, value, icon, truncate }) => (
  <View style={styles.summaryRow}>
    <View style={styles.summaryIconWrap}>
      <Ionicons name={icon as any} size={16} color={colors.accentBrand} />
    </View>
    <View style={styles.summaryTextWrap}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={truncate ? 2 : 1}>
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepDotActive: {
    backgroundColor: 'rgba(123,97,255,0.25)',
    borderColor: colors.accentBrand,
  },
  stepDotDone: {
    backgroundColor: colors.accentBrand,
    borderColor: colors.accentBrand,
  },
  stepDotText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  stepDotTextActive: {
    color: colors.accentBrand,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: colors.accentBrand,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  stepContent: { paddingTop: 8 },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },

  // Step 1 — File
  dropzone: {
    borderWidth: 2,
    borderColor: 'rgba(123,97,255,0.3)',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,97,255,0.04)',
    minHeight: 220,
  },
  dropzonePressed: { opacity: 0.7 },
  uploadIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(123,97,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dropzoneTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dropzoneSubtitle: {
    color: colors.textTertiary,
    fontSize: 13,
    marginBottom: 20,
  },
  selectBtn: { borderRadius: 24, overflow: 'hidden' },
  selectBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  selectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileSelected: { alignItems: 'center' },
  fileIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(123,97,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fileName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  changeFileBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accentBrand,
  },
  changeFileBtnText: {
    color: colors.accentBrand,
    fontSize: 13,
    fontWeight: '600',
  },
  formatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  formatBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  formatBadgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },

  // Step 2 — Metadata
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textArea: { minHeight: 80 },
  textAreaLarge: { minHeight: 120 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pickerBtnText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  genreChipActive: {
    backgroundColor: 'rgba(123,97,255,0.2)',
    borderColor: colors.accentBrand,
  },
  genreChipText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  genreChipTextActive: {
    color: colors.accentBrand,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: 15,
  },

  // Step 3 — Cover
  coverArea: {
    alignSelf: 'center',
    width: SCREEN_W * 0.65,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  coverPreview: { flex: 1 },
  coverPlaceholder: { flex: 1 },
  coverPlaceholderGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },
  coverPlaceholderText: {
    color: colors.accentBrand,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  coverPlaceholderLabel: {
    color: colors.textTertiary,
    fontSize: 14,
    marginTop: 8,
  },
  chooseCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.accentBrand,
  },
  chooseCoverBtnText: {
    color: colors.accentBrand,
    fontSize: 14,
    fontWeight: '600',
  },
  coverHint: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },

  // Step 4 — Review
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(123,97,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextWrap: { flex: 1 },
  summaryLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 1,
  },
  publishingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  publishingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  publishedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: 'rgba(0,208,187,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
  },
  publishedText: {
    color: '#00D0BB',
    fontSize: 15,
    fontWeight: '600',
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  nextBtn: { borderRadius: 24, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  publishBtn: { borderRadius: 24, overflow: 'hidden' },
});

export default UploadScreen;

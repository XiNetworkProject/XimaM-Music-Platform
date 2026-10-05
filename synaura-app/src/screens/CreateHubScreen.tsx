import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getMusicChallenge } from '@/api/client';
import { CreateArrivalBanner } from '@/components/create/CreateArrivalBanner';
import { CreationLaunchpad } from '@/components/create/CreationLaunchpad';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { CollectionSurface, CollectionHeader, CollectionHeading, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export function CreateHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const layout = useResponsiveLayout();
  const p = useCollectionPalette();
  const challengeId: string = route.params?.challengeId || '';
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (challengeId) void getMusicChallenge(challengeId).then(challenge => { if (active) setChallengeTitle(challenge.title); }).catch(() => {});
    return () => { active = false; };
  }, [challengeId]);
  const open = (screen: string) => navigation.navigate(screen, challengeId ? { challengeId } : undefined);
  return <CollectionSurface><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[layout.pageContent, { paddingTop: layout.insets.top + 8, paddingBottom: layout.miniPlayerClearance + 20, gap: 22 }]}>
    <CollectionHeader title="À toi de créer" onBack={() => navigation.goBack()} />
    {challengeId ? <CreateArrivalBanner context="challenge" title={challengeTitle} /> : null}
    <CreationLaunchpad onCreateWithAI={() => open('AIStudio')} onPublishTrack={() => open('Upload')} onPublishClip={() => open('ClipComposer')} onCreatePost={() => open('CreatePost')} onCreateVariation={() => open('CreateVariation')} />
    <View style={{ marginTop: 12 }}><CollectionHeading title="À plusieurs, c’est encore mieux." />
      {[{ title: 'Demander un avis', category: 'feedback', icon: 'chatbubbles-outline' }, { title: 'Trouver une collab', category: 'collab', icon: 'people-outline' }, { title: 'Lancer un défi remix', category: 'remix', icon: 'repeat-outline' }].map(item => <EntryPressable key={item.category} accessibilityRole="button" onPress={() => navigation.navigate('Community', { compose: true, category: item.category })} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 62, gap: 15 }}><Ionicons name={item.icon as any} size={22} color={p.blue} /><Text style={{ flex: 1, color: p.text, fontSize: 15, fontWeight: '600' }}>{item.title}</Text><Ionicons name="arrow-forward" size={18} color={p.muted} /></EntryPressable>)}
    </View>
  </ScrollView></CollectionSurface>;
}

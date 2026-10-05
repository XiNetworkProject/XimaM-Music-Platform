import React from 'react';
import { ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EntryMotionScope } from '@/components/entry/EntryAtmosphere';
import { CreationLaunchpad, type CreationActions } from './CreationLaunchpad';

type Props = CreationActions & { visible: boolean; onClose: () => void };
export function CreateMenuSheet({ visible, onClose, ...actions }: Props) {
  const tactile = (action: () => void) => () => { void Haptics.selectionAsync().catch(() => {}); action(); };
  return <BottomSheet visible={visible} onClose={onClose} title="À toi de créer" maxHeight="92%">
    <EntryMotionScope active={visible}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>
      <CreationLaunchpad onCreateWithAI={tactile(actions.onCreateWithAI)} onPublishTrack={tactile(actions.onPublishTrack)} onPublishClip={tactile(actions.onPublishClip)} onCreatePost={tactile(actions.onCreatePost)} onCreateVariation={tactile(actions.onCreateVariation)} />
    </ScrollView></EntryMotionScope>
  </BottomSheet>;
}
export default CreateMenuSheet;

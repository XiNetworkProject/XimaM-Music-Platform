import React from 'react';
import { useRoute } from '@react-navigation/native';
import { CuratedCollection } from '@/components/mobile/CuratedCollection';
export function DiscoverMoodScreen() { const route = useRoute<any>(); return <CuratedCollection kind="mood" moodId={route.params?.moodId} />; }
export default DiscoverMoodScreen;

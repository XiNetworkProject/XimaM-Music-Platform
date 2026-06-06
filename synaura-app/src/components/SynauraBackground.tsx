import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/tokens';

export function SynauraBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(124,92,255,0.35)', 'rgba(0,208,187,0.10)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowTop}
      />
      <LinearGradient
        colors={['transparent', 'rgba(255,77,141,0.12)', 'rgba(5,2,20,1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowBottom}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowTop: {
    position: 'absolute',
    top: -140,
    left: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  glowBottom: {
    position: 'absolute',
    right: -120,
    bottom: -160,
    width: 420,
    height: 420,
    borderRadius: 210,
  },
});

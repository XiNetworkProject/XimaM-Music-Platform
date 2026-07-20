import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';

type State = {
  error: Error | null;
  recoveryKey: number;
};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null, recoveryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SynauraUI] render failed', error, info.componentStack);
  }

  private retry = () => {
    this.setState((current) => ({ error: null, recoveryKey: current.recoveryKey + 1 }));
  };

  render() {
    if (!this.state.error) return <React.Fragment key={this.state.recoveryKey}>{this.props.children}</React.Fragment>;

    return (
      <View style={styles.root}>
        <View style={styles.icon}>
          <Ionicons name="refresh" size={24} color={colors.paper} />
        </View>
        <Text style={styles.title}>Cette page a rencontre un souci.</Text>
        <Text style={styles.text}>Synaura reste ouverte. Relance simplement l'interface.</Text>
        <Pressable accessibilityLabel="Relancer l'interface" onPress={this.retry} style={styles.button}>
          <Text style={styles.buttonText}>Relancer</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  title: {
    marginTop: 6,
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  text: {
    maxWidth: 300,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    minWidth: 150,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.text,
  },
  buttonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '900',
  },
});

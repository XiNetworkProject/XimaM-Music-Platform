import React from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SynauraBackground } from '@/components/SynauraBackground';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { colors } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export function AuthScreen({
  children,
  keyboardOffset = 0,
}: {
  children: React.ReactNode;
  keyboardOffset?: number;
}) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  return (
    <SynauraBackground variant="warm">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
        style={styles.fill}
      >
        <ScrollView
          contentContainerStyle={[
            styles.screenContent,
            layout.pageContent,
            { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SynauraBackground>
  );
}

export function AuthTopBar({
  caption,
  onBack,
}: {
  caption: string;
  onBack: () => void;
}) {
  const layout = useResponsiveLayout();
  return (
    <View style={styles.topBar}>
      <View style={styles.brand}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/synaura-symbol-2026.png')} style={styles.logo} />
        </View>
        <View>
          <Text style={styles.brandName}>Synaura</Text>
          <Text style={styles.brandCaption}>{caption}</Text>
        </View>
      </View>
      <Pressable accessibilityLabel="Retour" onPress={onBack} style={[styles.backButton, layout.isNarrow && styles.backButtonNarrow]}>
        <Ionicons name="arrow-back" size={17} color="rgba(23,19,19,0.58)" />
        {!layout.isNarrow ? <Text style={styles.backText}>Accueil</Text> : null}
      </Pressable>
    </View>
  );
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  const layout = useResponsiveLayout();
  return <Reveal distance={8} scaleFrom={0.99} style={[styles.card, layout.isNarrow && styles.cardNarrow]}>{children}</Reveal>;
}

export function AuthTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  const layout = useResponsiveLayout();
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text maxFontSizeMultiplier={1.2} style={[styles.title, layout.isNarrow && styles.titleNarrow]}>{title}</Text>
      <Text maxFontSizeMultiplier={1.25} style={styles.subtitle}>{text}</Text>
    </View>
  );
}

export function AuthField({
  label,
  icon,
  rightIcon,
  onRightPress,
  ...props
}: TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={17} color="rgba(23,19,19,0.34)" style={styles.inputIcon} />
        <TextInput
          {...props}
          placeholderTextColor="rgba(23,19,19,0.30)"
          style={[styles.input, rightIcon ? styles.inputWithRight : null, props.style]}
        />
        {rightIcon && onRightPress ? (
          <Pressable accessibilityLabel="Afficher ou masquer" onPress={onRightPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={18} color="rgba(23,19,19,0.42)" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function AuthAlert({
  text,
  kind = 'error',
}: {
  text: string;
  kind?: 'error' | 'success';
}) {
  return (
    <View style={[styles.alert, kind === 'success' && styles.alertSuccess]}>
      <Ionicons
        name={kind === 'success' ? 'checkmark-circle' : 'alert-circle'}
        size={17}
        color={kind === 'success' ? '#15803D' : '#B42318'}
      />
      <Text style={[styles.alertText, kind === 'success' && styles.alertTextSuccess]}>{text}</Text>
    </View>
  );
}

export function AuthPrimaryButton({
  label,
  loading,
  disabled,
  icon,
  onPress,
}: {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.primaryButton, (disabled || loading) && styles.disabled]}
      scaleTo={0.97}
    >
      {loading ? <ActivityIndicator color="#FFFAF2" /> : (
        <>
          <Text style={styles.primaryText}>{label}</Text>
          {icon ? <Ionicons name={icon} size={17} color="#FFFAF2" /> : null}
        </>
      )}
    </MotionPressable>
  );
}

export function AuthGoogleButton({ onPress }: { onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={styles.googleButton} scaleTo={0.98}>
      <Ionicons name="logo-google" size={19} color="#4285F4" />
      <Text style={styles.googleText}>Continuer avec Google</Text>
    </MotionPressable>
  );
}

export function AuthDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>OU AVEC EMAIL</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function AuthInfo({ title, text, icon }: { title: string; text: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.info}>
      {icon ? <Ionicons name={icon} size={17} color={colors.violet} /> : null}
      <View style={styles.infoBody}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionGhost: {
    minWidth: 96,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.055)',
  },
  actionGhostText: { color: 'rgba(23,19,19,0.56)', fontSize: 13, fontWeight: '900' },
  link: { color: colors.violet, fontSize: 12, fontWeight: '900' },
  mutedLink: { color: 'rgba(23,19,19,0.46)', fontSize: 12, fontWeight: '900' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchText: { color: 'rgba(23,19,19,0.48)', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  legalText: { color: 'rgba(23,19,19,0.38)', fontSize: 11, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  legalLink: { color: 'rgba(23,19,19,0.65)', fontWeight: '900' },
  formGap: { gap: 15 },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screenContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 18 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 1 },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  logo: { width: 38, height: 38, resizeMode: 'contain' },
  brandName: { color: colors.text, fontSize: 21, lineHeight: 23, fontWeight: '900' },
  brandCaption: { marginTop: 2, color: 'rgba(23,19,19,0.40)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  backButton: { height: 40, paddingHorizontal: 11, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: 'rgba(255,255,255,0.48)' },
  backButtonNarrow: { width: 38, paddingHorizontal: 0, justifyContent: 'center' },
  backText: { color: 'rgba(23,19,19,0.52)', fontSize: 11, fontWeight: '900' },
  card: {
    borderTopWidth: 2,
    borderTopColor: colors.text,
    paddingTop: 24,
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  cardNarrow: { paddingHorizontal: 0 },
  titleBlock: { marginBottom: 24 },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  title: { marginTop: 9, color: colors.text, fontSize: 36, lineHeight: 40, fontWeight: '900' },
  titleNarrow: { fontSize: 31, lineHeight: 36 },
  subtitle: { marginTop: 10, color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  field: { gap: 7 },
  fieldLabel: { color: 'rgba(23,19,19,0.50)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 15, zIndex: 2 },
  input: {
    height: 50,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingLeft: 44,
    paddingRight: 14,
    color: '#171313',
    fontSize: 13,
    fontWeight: '600',
  },
  inputWithRight: { paddingRight: 48 },
  rightIcon: { position: 'absolute', right: 4, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  alert: { marginBottom: 14, padding: 11, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)' },
  alertSuccess: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.20)' },
  alertText: { flex: 1, color: '#B42318', fontSize: 12, lineHeight: 17, fontWeight: '800' },
  alertTextSuccess: { color: '#15803D' },
  primaryButton: { flex: 1, height: 54, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: colors.text },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.88 },
  googleButton: { height: 52, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleText: { color: '#171313', fontSize: 13, fontWeight: '900' },
  divider: { marginVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(23,19,19,0.09)' },
  dividerText: { color: 'rgba(23,19,19,0.32)', fontSize: 9, fontWeight: '900' },
  info: { flexDirection: 'row', gap: 9, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  infoBody: { flex: 1, minWidth: 0 },
  infoTitle: { color: 'rgba(23,19,19,0.45)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  infoText: { marginTop: 3, color: 'rgba(23,19,19,0.54)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
});

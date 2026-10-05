import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { EntryMotionScope } from '@/components/entry/EntryAtmosphere';
import { mobile, SoundRoom } from '@/components/mobile/SoundRoom';
import { SynauraMark } from '@/components/brand/SynauraMark';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { entry } from '@/theme/entry';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export const authColors = { text: mobile.text, textSecondary: mobile.muted, textTertiary: mobile.faint, surface: mobile.surface, surfaceStrong: mobile.raised, surfaceMuted: mobile.raised, border: mobile.line, borderStrong: mobile.line, violet: mobile.blue, coral: mobile.blue, cyan: mobile.blue };
const colors = authColors;

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
    <EntryMotionScope><SoundRoom quiet>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
        style={styles.fill}
      >
        <ScrollView
          contentContainerStyle={[
            styles.screenContent,
            layout.pageContent,
            { maxWidth: 540, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SoundRoom></EntryMotionScope>
  );
}

export function AuthTopBar({
  caption,
  onBack,
}: {
  caption: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <EntryPressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></EntryPressable>
      <SynauraMark size={29} wordmark />
      <View style={{ width: 44 }} />
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
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={17} color={colors.textTertiary} style={styles.inputIcon} />
        <TextInput
          {...props}
          onFocus={event => { setFocused(true); props.onFocus?.(event); }}
          onBlur={event => { setFocused(false); props.onBlur?.(event); }}
          accessibilityLabel={props.accessibilityLabel || label}
          selectionColor={mobile.blue}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, focused && { borderColor: mobile.blue, backgroundColor: '#172536' }, rightIcon ? styles.inputWithRight : null, props.style]}
        />
        {rightIcon && onRightPress ? (
          <Pressable accessibilityLabel="Afficher ou masquer" onPress={onRightPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={18} color={colors.textSecondary} />
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
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.alert, kind === 'success' && styles.alertSuccess]}>
      <Ionicons
        name={kind === 'success' ? 'checkmark-circle' : 'alert-circle'}
        size={17}
        color={kind === 'success' ? '#81DEB2' : '#FFAAAD'}
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
    <EntryPressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.primaryButton, (disabled || loading) && styles.disabled]}
      scaleTo={0.97}
    >
      <LinearGradient pointerEvents="none" colors={['#E5F2FF', '#BBD9FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {loading ? <ActivityIndicator color="#070A10" /> : (
        <>
          <Text style={styles.primaryText}>{label}</Text>
          {icon ? <Ionicons name={icon} size={17} color="#070A10" /> : null}
        </>
      )}
    </EntryPressable>
  );
}

export function AuthGoogleButton({
  onPress,
  loading,
  disabled,
}: {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.providerButton, (disabled || loading) && styles.disabled]}
      scaleTo={0.98}
    >
      {loading ? <ActivityIndicator color={colors.textSecondary} /> : (
        <>
          <Ionicons name="logo-google" size={19} color="#4285F4" />
          <Text style={styles.providerText}>Continuer avec Google</Text>
        </>
      )}
    </MotionPressable>
  );
}

export function AuthPhoneButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.providerButton, disabled && styles.disabled]}
      scaleTo={0.98}
    >
      <Ionicons name="phone-portrait-outline" size={19} color={colors.cyan} />
      <Text style={styles.providerText}>Continuer avec le téléphone</Text>
    </MotionPressable>
  );
}

export function AuthCheckRow({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons name="checkmark" size={15} color="#070A10" /> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export function AuthDivider({ label = 'ou avec ton email' }: { label?: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
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
    backgroundColor: colors.surfaceMuted,
  },
  actionGhostText: { color: colors.textSecondary, fontSize: 13, fontWeight: '900' },
  link: { color: colors.violet, fontSize: 12, fontWeight: '900' },
  mutedLink: { color: colors.textSecondary, fontSize: 12, fontWeight: '900' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  legalText: { color: colors.textTertiary, fontSize: 11, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  legalLink: { color: colors.textSecondary, fontWeight: '900' },
  formGap: { gap: 15 },
});

const styles = StyleSheet.create({
  fill: { flex: 1 }, screenContent: { flexGrow: 1, paddingHorizontal: 25 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }, backButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  card: { paddingHorizontal: 6, paddingBottom: 20 }, cardNarrow: { paddingHorizontal: 4 },
  titleBlock: { marginBottom: 32 }, eyebrow: { color: mobile.blue, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { marginTop: 15, color: mobile.text, fontFamily: 'Inter_600SemiBold', fontSize: 35, lineHeight: 42 }, titleNarrow: { fontSize: 30, lineHeight: 37 }, subtitle: { color: mobile.muted, fontSize: 14, lineHeight: 22, marginTop: 13 },
  field: { gap: 9 }, fieldLabel: { color: '#D0D9E9', fontSize: 12, fontWeight: '500' }, inputWrap: { position: 'relative', justifyContent: 'center' }, inputIcon: { position: 'absolute', left: 16, zIndex: 2 },
  input: { minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: mobile.line, backgroundColor: 'rgba(19,28,42,.92)', paddingLeft: 46, paddingRight: 16, color: mobile.text, fontSize: 16 }, inputWithRight: { paddingRight: 48 }, rightIcon: { position: 'absolute', right: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  alert: { marginBottom: 16, padding: 14, borderRadius: 14, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(239,68,68,.12)' }, alertSuccess: { backgroundColor: 'rgba(34,197,94,.12)' }, alertText: { flex: 1, color: '#FFAAAD', fontSize: 13, lineHeight: 19 }, alertTextSuccess: { color: '#81DEB2' },
  primaryButton: { flexGrow: 1, minHeight: 56, overflow: 'hidden', borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, primaryText: { color: mobile.bg, fontSize: 15, fontWeight: '700' }, disabled: { opacity: .45 },
  providerButton: { minHeight: 54, borderRadius: 16, backgroundColor: '#162031', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 }, providerText: { color: mobile.text, fontSize: 14, fontWeight: '500' },
  checkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: 11 }, checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1, borderColor: mobile.faint, backgroundColor: mobile.surface, alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { borderColor: mobile.blue, backgroundColor: mobile.blue }, checkLabel: { flex: 1, color: mobile.muted, fontSize: 12, lineHeight: 19 },
  divider: { marginVertical: 23, flexDirection: 'row', alignItems: 'center', gap: 14 }, dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: mobile.line }, dividerText: { color: mobile.faint, fontSize: 11 },
  info: { flexDirection: 'row', gap: 11, padding: 15, borderRadius: 16, backgroundColor: mobile.surface }, infoBody: { flex: 1, minWidth: 0 }, infoTitle: { color: mobile.text, fontSize: 12, fontWeight: '600' }, infoText: { marginTop: 5, color: mobile.muted, fontSize: 12, lineHeight: 18 },
});

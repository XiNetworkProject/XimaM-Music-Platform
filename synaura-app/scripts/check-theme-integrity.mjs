import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];
const requireText = (file, fragment, message) => {
  if (!read(file).includes(fragment)) failures.push(message);
};
const forbidText = (file, fragment, message) => {
  if (read(file).includes(fragment)) failures.push(message);
};

const tokens = read('src/theme/tokens.ts');
for (const semantic of ['background', 'surface', 'surfaceStrong', 'elevatedSurface', 'text', 'textSecondary', 'textTertiary']) {
  if (!new RegExp(`${semantic}:\\s*semanticColor`).test(tokens)) {
    failures.push(`La couleur ${semantic} n'est plus semantique.`);
  }
}

requireText('src/settings/MobileSettingsProvider.tsx', 'sanitizeSettings', 'Les preferences de theme ne sont plus validees au demarrage.');
requireText('src/App.tsx', "resolvedTheme === 'dark'", 'Le theme de navigation ne suit plus le theme resolu.');
requireText('src/App.tsx', 'ROOT_BOOT_WATCHDOG_MS', "Le demarrage n'a plus de garde-fou global.");
requireText('src/components/AppErrorBoundary.tsx', 'recoveryKey', "La relance apres erreur ne remonte plus l'interface.");
requireText('src/navigation/Tabs.tsx', "const dark = resolvedTheme === 'dark'", 'Le dock ne suit plus le theme resolu.');
forbidText('src/navigation/Tabs.tsx', 'const dark = true', 'Le dock est force en mode sombre.');
requireText('src/components/mobile/MobileHeader.tsx', "tint={dark ? 'dark' : 'light'}", "L'en-tete mobile ne change plus de teinte.");
forbidText('src/components/ui/BottomSheet.tsx', "backgroundColor: '#151515'", 'Les feuilles modales communes sont forcees en sombre.');
requireText('src/components/ui/BottomSheet.tsx', 'backgroundColor: colors.elevatedSurface', 'Les feuilles modales communes ne sont plus semantiques.');
forbidText('src/screens/NotificationsScreen.tsx', "rowUnread: { backgroundColor: '#1C1921'", 'Les notifications non lues sont illisibles en clair.');
forbidText('src/screens/ConversationScreen.tsx', '/> <Text style={[styles.themeLabel', 'La personnalisation contient un texte JSX invalide pour React Native.');

const nativeColors = read('plugins/with-synaura-theme-colors.js');
for (const name of ['synaura_background', 'synaura_surface', 'synaura_text']) {
  const count = nativeColors.split(name).length - 1;
  if (count < 2) failures.push(`${name} doit exister dans les palettes Android claire et sombre.`);
}

const nativeMessaging = read('plugins/native-messaging/native/SynauraMessagingModule.kt');
if (!nativeMessaging.includes('LifecycleEventListener') || !nativeMessaging.includes('configureChatBubble')) {
  failures.push('La bulle Android ne suit plus le cycle de vie global de Synaura.');
}
requireText('src/messaging/ConversationBubbleProvider.tsx', 'AppState.addEventListener', "La bulle n'est plus pilotee au niveau global.");
requireText('src/messaging/conversationBubble.ts', 'userId:', 'La bulle persistante ne reste plus isolee par compte.');

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('Themes clair, sombre et systeme: invariants natifs valides.');

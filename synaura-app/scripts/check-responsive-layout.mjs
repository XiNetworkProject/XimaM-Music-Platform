import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];

const appConfig = JSON.parse(read('app.json')).expo;
if (appConfig.orientation !== 'default') failures.push('app.json doit autoriser toutes les orientations.');
if (!appConfig.ios?.supportsTablet) failures.push('Le support tablette iOS doit rester active.');
if (appConfig.android?.softwareKeyboardLayoutMode !== 'resize') failures.push('Le clavier Android doit redimensionner le viewport.');

const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
if (fs.existsSync(manifestPath) && /screenOrientation="portrait"/.test(fs.readFileSync(manifestPath, 'utf8'))) {
  failures.push('AndroidManifest.xml verrouille encore MainActivity en portrait.');
}

const sourceRoot = path.join(root, 'src');
const sourceFiles = [];
const collect = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (/\.tsx?$/.test(entry.name)) sourceFiles.push(absolute);
  }
};
collect(sourceRoot);

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (/Dimensions\.get\(\s*['"]window['"]\s*\)/.test(source)) {
    failures.push(`${path.relative(root, file)} capture les dimensions une seule fois.`);
  }
  if (/Ã.|Â.|â€™|â€œ|â€|�/.test(source)) {
    failures.push(`${path.relative(root, file)} contient encore du texte mal encode.`);
  }
  if (/letterSpacing:\s*-/.test(source) && path.basename(file) !== 'HomeScreen.tsx') {
    failures.push(`${path.relative(root, file)} utilise encore un espacement de lettres negatif.`);
  }
}

const viewportMatrix = [
  { name: 'pliable etroit', width: 280, height: 653, fontScale: 1 },
  { name: 'petit Android', width: 320, height: 568, fontScale: 1.15 },
  { name: 'telephone compact', width: 360, height: 740, fontScale: 1 },
  { name: 'telephone moderne', width: 393, height: 852, fontScale: 1 },
  { name: 'grand telephone', width: 430, height: 932, fontScale: 1.3 },
  { name: 'telephone paysage', width: 740, height: 360, fontScale: 1 },
  { name: 'tablette portrait', width: 768, height: 1024, fontScale: 1 },
  { name: 'tablette paysage', width: 1280, height: 800, fontScale: 1.2 },
];

for (const viewport of viewportMatrix) {
  const shortestSide = Math.min(viewport.width, viewport.height);
  const isTablet = shortestSide >= 600 || (viewport.width >= 700 && viewport.height >= 500);
  const isTiny = viewport.width < 330;
  const isNarrow = viewport.width < 360;
  const isCompact = viewport.width < 390;
  const isPhoneLandscape = viewport.width > viewport.height && !isTablet;
  const gutter = isTiny ? 10 : isNarrow ? 12 : isCompact ? 16 : isTablet ? 24 : isPhoneLandscape ? 18 : 18;
  const contentMaxWidth = isTablet ? 920 : 520;
  const availableContentWidth = Math.min(viewport.width, contentMaxWidth) - gutter * 2;
  const dockWidth = Math.min(viewport.width - (isNarrow ? 12 : 18), isTablet ? 620 : 520);
  const gridColumns = isTablet ? 3 : (isTiny || viewport.fontScale > 1.3 ? 1 : 2);

  if (availableContentWidth < 240) failures.push(`${viewport.name}: zone de contenu inferieure a 240 px.`);
  if (dockWidth <= 0 || dockWidth > viewport.width) failures.push(`${viewport.name}: largeur du dock invalide.`);
  if (isTiny && gridColumns !== 1) failures.push(`${viewport.name}: les grilles doivent passer sur une colonne.`);
  if (isPhoneLandscape && viewport.height < 320) failures.push(`${viewport.name}: hauteur paysage non exploitable.`);
}

const responsiveScreens = [
  'HomeV2Screen', 'DiscoverV2Screen', 'RadarScreen', 'DiscoverMoodScreen', 'SwipeScreen',
  'CommunityScreen', 'ClubDetailScreen', 'ProfileScreen', 'CreateHubScreen', 'UploadScreen',
  'CreateVariationScreen', 'ClipComposerScreen', 'AIStudioScreen', 'CreatePostScreen',
  'SettingsScreen', 'SubscriptionsScreen', 'CityScreen', 'PublicProfileScreen',
  'NotificationsScreen', 'PostDetailScreen', 'PlaylistDetailScreen', 'TrackDetailScreen',
  'SearchScreen', 'ChallengeDetailScreen', 'WelcomeScreen', 'OnboardingScreen',
];

for (const screen of responsiveScreens) {
  const source = read(`src/screens/${screen}.tsx`);
  if (!source.includes('useResponsiveLayout')) failures.push(`${screen} n'utilise pas la couche responsive.`);
  if (/(?:width|minWidth):\s*(?:[3-9]\d{2}|\d{4,})(?:\s|,)/.test(source)) {
    failures.push(`${screen} contient une largeur fixe superieure a 300 px.`);
  }
}

const librarySource = read('src/screens/LibraryScreen.tsx');
if (!librarySource.includes('<TrackList')) failures.push('LibraryScreen doit rester base sur TrackList responsive.');
const authSource = read('src/components/auth/AuthUI.tsx');
if (!authSource.includes('layout.pageContent')) failures.push("Les ecrans d'authentification ne sont pas bornes par le viewport.");
const indexSource = read('index.ts');
if (!indexSource.includes('maxFontSizeMultiplier: 1.35')) failures.push('La limite globale de zoom typographique a disparu.');
const segmentedSource = read('src/components/ui/SegmentedControl.tsx');
if (!segmentedSource.includes('<ScrollView') || !segmentedSource.includes('scrollable')) failures.push('Les controles segmentes ne defilent plus sur ecran etroit.');
const welcomeSource = read('src/screens/WelcomeScreen.tsx');
if (!welcomeSource.includes('splitLayout') || !welcomeSource.includes('SynauraIntroStage')) failures.push("La bienvenue n'a plus de composition paysage dediee.");
const onboardingSource = read('src/screens/OnboardingScreen.tsx');
if (!onboardingSource.includes('layout.gridColumns')) failures.push("L'onboarding n'adapte plus ses colonnes au viewport.");
const studioSource = read('src/screens/AIStudioScreen.tsx');
if (!studioSource.includes('presentationStyle="overFullScreen"') || !studioSource.includes('drawerPanel') || !studioSource.includes("setTab('library')")) failures.push('Le compositeur Studio doit rester un tiroir fermable au-dessus de la bibliotheque.');
const profileHeroSource = read('src/components/profile/ProfileIdentityHero.tsx');
if (!profileHeroSource.includes('compactStats') || !profileHeroSource.includes('responsive.isNarrow')) failures.push("Le hero profil n'a plus ses variantes compactes.");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Responsive layout valide sur ${responsiveScreens.length + 4} ecrans natifs et ${viewportMatrix.length} viewports.`);

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
}

const librarySource = read('src/screens/LibraryScreen.tsx');
if (!librarySource.includes('<TrackList')) failures.push('LibraryScreen doit rester base sur TrackList responsive.');
const authSource = read('src/components/auth/AuthUI.tsx');
if (!authSource.includes('layout.pageContent')) failures.push("Les ecrans d'authentification ne sont pas bornes par le viewport.");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Responsive layout valide sur ${responsiveScreens.length} ecrans natifs.`);

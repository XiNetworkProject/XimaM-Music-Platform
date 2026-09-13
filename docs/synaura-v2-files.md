# Synaura V2 — liste exacte des fichiers candidats

Baseline de référence : `d0ac45379227b4ad86042b6b8eb2156535f1b817`.

Ce relevé décrit les **148 fichiers sources, styles, assets web, tests, scripts et documents attribués au travail V2** : **112 fichiers suivis modifiés**, **36 nouveaux fichiers**. Il ne constitue ni un staging ni une autorisation de commit. L’index est vide au relevé.

La sélection recoupe les périmètres réellement travaillés et l’état Git ; elle ne prend pas l’intégralité du worktree sale. Les 12 modifications préexistantes listées plus bas sont exclues, comme les applications natives, environnements, caches et anciens artifacts. Les résultats de captures générés sont décrits séparément, pas mélangés aux sources à versionner.

`M` = fichier suivi modifié depuis la baseline ; `N` = nouveau fichier local non suivi. Les modifications à venir ne sont pas anticipées : refaire ce relevé avant tout éventuel staging.

## Routes, cadres, erreurs et métadonnées web — 68 fichiers

| État | Fichier |
|---|---|
| M | [app/admin/layout.tsx](<../app/admin/layout.tsx>) |
| M | [app/ai-generator/page.tsx](<../app/ai-generator/page.tsx>) |
| M | [app/ai-library/page.tsx](<../app/ai-library/page.tsx>) |
| M | [app/album/[id]/page.tsx](<../app/album/[id]/page.tsx>) |
| M | [app/auth/layout.tsx](<../app/auth/layout.tsx>) |
| M | [app/boosters/BoostersClient.tsx](<../app/boosters/BoostersClient.tsx>) |
| N | [app/boosters/layout.tsx](<../app/boosters/layout.tsx>) |
| M | [app/challenges/[id]/page.tsx](<../app/challenges/[id]/page.tsx>) |
| N | [app/challenges/layout.tsx](<../app/challenges/layout.tsx>) |
| N | [app/city/layout.tsx](<../app/city/layout.tsx>) |
| N | [app/clips/[id]/layout.tsx](<../app/clips/[id]/layout.tsx>) |
| M | [app/clips/[id]/page.tsx](<../app/clips/[id]/page.tsx>) |
| M | [app/clips/new/page.tsx](<../app/clips/new/page.tsx>) |
| M | [app/community/[club]/page.tsx](<../app/community/[club]/page.tsx>) |
| M | [app/community/faq/page.tsx](<../app/community/faq/page.tsx>) |
| M | [app/community/forum/[id]/page.tsx](<../app/community/forum/[id]/page.tsx>) |
| M | [app/community/forum/new/page.tsx](<../app/community/forum/new/page.tsx>) |
| M | [app/community/forum/page.tsx](<../app/community/forum/page.tsx>) |
| N | [app/community/layout.tsx](<../app/community/layout.tsx>) |
| M | [app/community/page.tsx](<../app/community/page.tsx>) |
| M | [app/create/page.tsx](<../app/create/page.tsx>) |
| M | [app/create/variation/page.tsx](<../app/create/variation/page.tsx>) |
| N | [app/dev/v2/page.tsx](<../app/dev/v2/page.tsx>) |
| N | [app/dev/v2/V2Review.tsx](<../app/dev/v2/V2Review.tsx>) |
| M | [app/discover/DiscoverClient.tsx](<../app/discover/DiscoverClient.tsx>) |
| M | [app/discover/DiscoverMoodTiles.tsx](<../app/discover/DiscoverMoodTiles.tsx>) |
| M | [app/download/page.tsx](<../app/download/page.tsx>) |
| M | [app/embed/[trackId]/EmbedPlayerClient.tsx](<../app/embed/[trackId]/EmbedPlayerClient.tsx>) |
| M | [app/error.tsx](<../app/error.tsx>) |
| M | [app/global-error.tsx](<../app/global-error.tsx>) |
| M | [app/join/[code]/page.tsx](<../app/join/[code]/page.tsx>) |
| M | [app/layout.tsx](<../app/layout.tsx>) |
| N | [app/legal/layout.tsx](<../app/legal/layout.tsx>) |
| M | [app/legal/page.tsx](<../app/legal/page.tsx>) |
| N | [app/library/layout.tsx](<../app/library/layout.tsx>) |
| M | [app/library/LibraryClient.tsx](<../app/library/LibraryClient.tsx>) |
| M | [app/messages/[conversationId]/page.tsx](<../app/messages/[conversationId]/page.tsx>) |
| N | [app/messages/layout.tsx](<../app/messages/layout.tsx>) |
| M | [app/messages/page.tsx](<../app/messages/page.tsx>) |
| M | [app/not-found.tsx](<../app/not-found.tsx>) |
| N | [app/notifications/layout.tsx](<../app/notifications/layout.tsx>) |
| M | [app/notifications/page.tsx](<../app/notifications/page.tsx>) |
| M | [app/opengraph-image.tsx](<../app/opengraph-image.tsx>) |
| M | [app/partnerships/page.tsx](<../app/partnerships/page.tsx>) |
| M | [app/playlists/[id]/page.tsx](<../app/playlists/[id]/page.tsx>) |
| M | [app/posts/[id]/page.tsx](<../app/posts/[id]/page.tsx>) |
| N | [app/posts/layout.tsx](<../app/posts/layout.tsx>) |
| M | [app/posts/page.tsx](<../app/posts/page.tsx>) |
| M | [app/profile/[username]/page.tsx](<../app/profile/[username]/page.tsx>) |
| M | [app/publish/page.tsx](<../app/publish/page.tsx>) |
| M | [app/radar/page.tsx](<../app/radar/page.tsx>) |
| M | [app/reset-password/page.tsx](<../app/reset-password/page.tsx>) |
| N | [app/search/layout.tsx](<../app/search/layout.tsx>) |
| M | [app/search/page.tsx](<../app/search/page.tsx>) |
| N | [app/settings/layout.tsx](<../app/settings/layout.tsx>) |
| M | [app/settings/SettingsClient.tsx](<../app/settings/SettingsClient.tsx>) |
| M | [app/stats/layout.tsx](<../app/stats/layout.tsx>) |
| M | [app/stats/page.tsx](<../app/stats/page.tsx>) |
| M | [app/studio/library/page.tsx](<../app/studio/library/page.tsx>) |
| M | [app/studio/StudioClient.tsx](<../app/studio/StudioClient.tsx>) |
| N | [app/subscriptions/layout.tsx](<../app/subscriptions/layout.tsx>) |
| M | [app/subscriptions/page.tsx](<../app/subscriptions/page.tsx>) |
| M | [app/subscriptions/success/page.tsx](<../app/subscriptions/success/page.tsx>) |
| N | [app/support/layout.tsx](<../app/support/layout.tsx>) |
| M | [app/support/page.tsx](<../app/support/page.tsx>) |
| M | [app/track/[id]/TrackPageClient.tsx](<../app/track/[id]/TrackPageClient.tsx>) |
| M | [app/upload/page.tsx](<../app/upload/page.tsx>) |
| N | [app/v2.css](<../app/v2.css>) |

## Composants et styles de présentation — 61 fichiers

| État | Fichier |
|---|---|
| M | [components/actions/ActionsSurface.tsx](<../components/actions/ActionsSurface.tsx>) |
| M | [components/ai-studio/GenerationTimeline.tsx](<../components/ai-studio/GenerationTimeline.tsx>) |
| M | [components/ai-studio/LibraryClipsList.tsx](<../components/ai-studio/LibraryClipsList.tsx>) |
| M | [components/ai-studio/LibraryMiddlePanel.tsx](<../components/ai-studio/LibraryMiddlePanel.tsx>) |
| M | [components/ai-studio/RightPanelImproved.tsx](<../components/ai-studio/RightPanelImproved.tsx>) |
| M | [components/ai-studio/TrackInspector.tsx](<../components/ai-studio/TrackInspector.tsx>) |
| M | [components/AppSidebar.tsx](<../components/AppSidebar.tsx>) |
| M | [components/audio/SynauraWaveform.tsx](<../components/audio/SynauraWaveform.tsx>) |
| M | [components/BoosterOpenModal.tsx](<../components/BoosterOpenModal.tsx>) |
| M | [components/brand/SynauraLogo.tsx](<../components/brand/SynauraLogo.tsx>) |
| M | [components/city/SynauraCityPage.tsx](<../components/city/SynauraCityPage.tsx>) |
| M | [components/clips/ClipUploadIndicator.tsx](<../components/clips/ClipUploadIndicator.tsx>) |
| M | [components/comments/CommentsSurface.tsx](<../components/comments/CommentsSurface.tsx>) |
| M | [components/context-surfaces/ContextSurfaceController.tsx](<../components/context-surfaces/ContextSurfaceController.tsx>) |
| M | [components/create/CreateArrivalBanner.tsx](<../components/create/CreateArrivalBanner.tsx>) |
| M | [components/DailySpinModal.tsx](<../components/DailySpinModal.tsx>) |
| M | [components/discover/DiscoverSynaura.module.css](<../components/discover/DiscoverSynaura.module.css>) |
| M | [components/discover/DiscoverSynaura.tsx](<../components/discover/DiscoverSynaura.tsx>) |
| M | [components/discover/SynauraSonicIntro.module.css](<../components/discover/SynauraSonicIntro.module.css>) |
| M | [components/discover/SynauraSonicIntro.tsx](<../components/discover/SynauraSonicIntro.tsx>) |
| M | [components/discover/SynauraSonicScene.tsx](<../components/discover/SynauraSonicScene.tsx>) |
| M | [components/discover/synauraSonicShaders.ts](<../components/discover/synauraSonicShaders.ts>) |
| M | [components/enter/EnterSynaura.tsx](<../components/enter/EnterSynaura.tsx>) |
| M | [components/enter/EntryFrame.tsx](<../components/enter/EntryFrame.tsx>) |
| M | [components/enter/SynauraEntryLoading.tsx](<../components/enter/SynauraEntryLoading.tsx>) |
| M | [components/FullScreenPlayer.tsx](<../components/FullScreenPlayer.tsx>) |
| M | [components/home/HomeFlowPrelude.tsx](<../components/home/HomeFlowPrelude.tsx>) |
| M | [components/home/ScrollPostSlide.tsx](<../components/home/ScrollPostSlide.tsx>) |
| M | [components/home/SynauraScroll.tsx](<../components/home/SynauraScroll.tsx>) |
| M | [components/mobile/AndroidAppPrompt.tsx](<../components/mobile/AndroidAppPrompt.tsx>) |
| M | [components/onboarding/OnboardingFlow.tsx](<../components/onboarding/OnboardingFlow.tsx>) |
| M | [components/PageTransition.tsx](<../components/PageTransition.tsx>) |
| M | [components/player/Waveform.tsx](<../components/player/Waveform.tsx>) |
| M | [components/profile/ProfilePeekSurface.tsx](<../components/profile/ProfilePeekSurface.tsx>) |
| M | [components/radar/RadarSection.tsx](<../components/radar/RadarSection.tsx>) |
| M | [components/studio/Center/QueuePanel.tsx](<../components/studio/Center/QueuePanel.tsx>) |
| M | [components/studio/Center/StudioTimeline.tsx](<../components/studio/Center/StudioTimeline.tsx>) |
| M | [components/studio/LeftDock/GeneratorForm.tsx](<../components/studio/LeftDock/GeneratorForm.tsx>) |
| M | [components/studio/LeftDock/ProjectSwitcher.tsx](<../components/studio/LeftDock/ProjectSwitcher.tsx>) |
| M | [components/studio/Library/LibraryPanel.tsx](<../components/studio/Library/LibraryPanel.tsx>) |
| M | [components/studio/RightDock/ABCompare.tsx](<../components/studio/RightDock/ABCompare.tsx>) |
| M | [components/studio/RightDock/Inspector.tsx](<../components/studio/RightDock/Inspector.tsx>) |
| M | [components/studio/ui/MobileTabs.tsx](<../components/studio/ui/MobileTabs.tsx>) |
| M | [components/synaura/SynauraCountdownBanner.tsx](<../components/synaura/SynauraCountdownBanner.tsx>) |
| M | [components/synaura/SynauraPrimaryDock.tsx](<../components/synaura/SynauraPrimaryDock.tsx>) |
| M | [components/synaura/SynauraShell.tsx](<../components/synaura/SynauraShell.tsx>) |
| M | [components/synaura/SynauraUniversalSearch.tsx](<../components/synaura/SynauraUniversalSearch.tsx>) |
| M | [components/theme/SynauraThemeProvider.tsx](<../components/theme/SynauraThemeProvider.tsx>) |
| M | [components/TikTokPlayer.tsx](<../components/TikTokPlayer.tsx>) |
| M | [components/TopSearchBar.tsx](<../components/TopSearchBar.tsx>) |
| M | [components/TrackCover.tsx](<../components/TrackCover.tsx>) |
| M | [components/ui/SynauraOverlay.tsx](<../components/ui/SynauraOverlay.tsx>) |
| M | [components/ui/SynauraPrimitives.tsx](<../components/ui/SynauraPrimitives.tsx>) |
| M | [components/ui/SynauraToastViewport.tsx](<../components/ui/SynauraToastViewport.tsx>) |
| N | [components/v2/contexts-v2.css](<../components/v2/contexts-v2.css>) |
| N | [components/v2/creation-v2.css](<../components/v2/creation-v2.css>) |
| N | [components/v2/music-v2.css](<../components/v2/music-v2.css>) |
| N | [components/v2/personal-v2.css](<../components/v2/personal-v2.css>) |
| N | [components/v2/PersonalRouteFrame.tsx](<../components/v2/PersonalRouteFrame.tsx>) |
| N | [components/v2/ServiceFrame.tsx](<../components/v2/ServiceFrame.tsx>) |
| M | [components/variations/PendingApprovalsModal.tsx](<../components/variations/PendingApprovalsModal.tsx>) |

## Identité, chrome et utilitaire du player — 4 fichiers

| État | Fichier |
|---|---|
| M | [lib/brand.ts](<../lib/brand.ts>) |
| N | [lib/brandV2.ts](<../lib/brandV2.ts>) |
| N | [lib/playerOpening.ts](<../lib/playerOpening.ts>) |
| M | [lib/routeChrome.ts](<../lib/routeChrome.ts>) |

## Assets web — 2 fichiers

| État | Fichier |
|---|---|
| N | [public/brand/v2/reference-symbol.svg](<../public/brand/v2/reference-symbol.svg>) |
| M | [public/default-cover.svg](<../public/default-cover.svg>) |

## Tests sources et outillage local — 10 fichiers

| État | Fichier |
|---|---|
| N | [scripts/synaura-v2-capture.mjs](<../scripts/synaura-v2-capture.mjs>) |
| N | [scripts/synaura-v2-inventory.mjs](<../scripts/synaura-v2-inventory.mjs>) |
| N | [scripts/synaura-v2-local-gate.mjs](<../scripts/synaura-v2-local-gate.mjs>) |
| M | [tests/audio-core.test.mjs](<../tests/audio-core.test.mjs>) |
| M | [tests/discover-enter-phase4a.test.mjs](<../tests/discover-enter-phase4a.test.mjs>) |
| M | [tests/final-hardening-phase4b8.test.mjs](<../tests/final-hardening-phase4b8.test.mjs>) |
| N | [tests/music-v2-presentation.test.mjs](<../tests/music-v2-presentation.test.mjs>) |
| N | [tests/synaura-v2-personal.test.mjs](<../tests/synaura-v2-personal.test.mjs>) |
| N | [tests/v2-creation-presentation.test.mjs](<../tests/v2-creation-presentation.test.mjs>) |
| N | [tests/v2-shell-presentation.test.mjs](<../tests/v2-shell-presentation.test.mjs>) |

## Documentation V2 — 3 fichiers

| État | Fichier |
|---|---|
| N | [docs/synaura-v2-files.md](<../docs/synaura-v2-files.md>) |
| N | [docs/synaura-v2-personal-social-implementation.md](<../docs/synaura-v2-personal-social-implementation.md>) |
| N | [docs/synaura-v2-route-coverage.md](<../docs/synaura-v2-route-coverage.md>) |

## Portée des changements

- Cadre commun, tokens nocturnes, marque exacte, navigation, Entry, players et surfaces contextuelles : adaptation web V2 et contrôles existants conservés selon leur propriétaire.
- Musique : compositions Live/Discover/Track/Profile/Album/Playlist, art, métadonnées, listes et présentation des commandes.
- Création : carrefour Create, AI/Library, Studio, Upload, Clip/Variation/Publish et composants de travail.
- Personnel/social/service : bibliothèque, recherche, conversations, activité, Community/Post/Clip/Challenge, compte, récupération, services, documents légaux et sorties auxiliaires.
- `lib/playerOpening.ts` appartient au correctif local d’ouverture du player de cette candidate ; ce fichier n’est pas une migration ni un second moteur audio.
- Les tests historiques modifiés dans cette liste restent identifiés comme tels ; le résultat de la suite/type-check/build et le scan de secrets sont consignés par le gate général, pas déduits de ce seul inventaire.
- `app/dev/v2` et les scripts `synaura-v2-*` sont des outils de QA locale. Le laboratoire est indisponible en production et ne fournit aucun bypass serveur de session.
- Les pages inchangées qui délèguent à un client ou héritent d’un layout ne sont pas artificiellement ajoutées à la liste des fichiers modifiés. Leur couverture est dans [la matrice de routes](synaura-v2-route-coverage.md).

## Modifications suivies préexistantes exclues — 12 fichiers

Aucun de ces fichiers n’a été réattribué à V2, annulé ou supprimé par cette tâche :

- `PLAY_STORE.md`
- `capacitor.config.ts`
- `docs/aura-performance-accessibility-phase4b8.md`
- `docs/fixes/community-posts-500.md`
- `docs/live-experience-phase4b-final.md`
- `synaura-app/app.json`
- `synaura-app/google-services.json`
- `synaura-app/plugins/native-messaging/native/SynauraBubbleActivity.kt`
- `synaura-app/plugins/native-messaging/native/SynauraBubbleManager.kt`
- `synaura-app/plugins/native-messaging/native/SynauraMessagingModule.kt`
- `synaura-app/plugins/native-messaging/native/SynauraMessagingPackage.kt`
- `synaura-app/plugins/with-synaura-native-messaging.js`

Le répertoire natif `synaura-app/`, la configuration Capacitor et les données/configurations Android ne font pas partie de ce lot web. Le nom d’un fichier de configuration présent dans cette exclusion ne signifie pas que son contenu a été scanné ou jugé publiable.

## Autres éléments volontairement hors liste candidate

- `.claude/`, `docs.zip`, les documents et captures historiques 4B déjà non suivis, notamment les dossiers Comments/Moments, Contextual Actions, Desktop/Mobile Polish et Live Experience.
- `supabase/.temp/`, fichiers d’environnement, clés, dumps, caches, `.next/`, dépendances installées, sorties de build, fichiers temporaires et logs. Aucune inclusion par glob de ces catégories.
- Tout artifact hors `artifacts/synaura-v2/` : ancien ou non attribué à V2, non repris dans ce lot.

### Preuves V2 générées, distinctes des sources

`artifacts/synaura-v2/` contient l’inventaire initial, les campagnes PNG/HTML/JSON et les éventuels rapports du gate local. Ce sont des **preuves dérivées locales**, pas une autorisation de versionner tout `artifacts/`. Les fichiers effectivement cités, dates, statuts et limites de fixture sont détaillés dans [la matrice](synaura-v2-route-coverage.md). Les campagnes partielles ou échouées restent des preuves de tentative, jamais un PASS.

L’original `artifacts/synaura-v2/routes-initial.json` est laissé intact. Son SHA-256 de contrôle est `9126263ab7c4fa383d4d32193586d2ae9474d7d7b2e7e6e215aa048344ba10aa`. Ne pas relancer un générateur qui l’écraserait pour actualiser la matrice finale.

## Limites et étape de revue

Aucun fichier de ce relevé n’a été staged par la tâche documentaire. Ce relevé ne certifie pas l’absence absolue de secret dans l’historique du dépôt ; le gate général doit rapporter le scan des seuls ajouts candidats et ses limites, sans exposer les valeurs détectées.

Avant un éventuel commit autorisé : relire les différences de chaque fichier candidat, actualiser les éventuels ajouts depuis ce relevé, exclure à nouveau les éléments préexistants, examiner le contenu staged et rejouer les contrôles. Aucun commit, push ou déploiement n’est effectué ou annoncé par ce document.

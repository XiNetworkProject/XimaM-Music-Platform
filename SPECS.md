# Synaura Mobile – Spécifications

Stack :
- Expo + React Native + TypeScript
- Navigation : @react-navigation/native (bottom tabs + stack)
- Audio : expo-av pour le player
- Etat global : Zustand ou Context API pour le player
- Requêtes : fetch/Supa API (comme sur la web app)

Design :
- Thème sombre violet/bleu, très proche de Synaura.fr
- Fonts modernes sans-serif
- Beaucoup de cards avec images cover arrondies
- Effets de blur léger / dégradés

Écrans principaux :
- Onboarding / Signin / Signup
- Home (reco “Pour toi”, Tendances, Génération IA, Nouveaux créateurs, etc.)
- TikTok-like player (swipe vertical)
- Full-screen player classique
- Bibliothèque (likes, playlists)
- Profil utilisateur

Fonctionnalités clés :
- Player global persistant (mini-player en bas + plein écran)
- Lecture en arrière-plan
- Contrôles système : play/pause/next sur Android
- Connexion aux API Supabase existantes

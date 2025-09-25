# Optimisation Cloudinary (Synaura)

Objectif: réduire 2× à 5× la bande passante Cloudinary sans changement visuel/UX.

## Composants ajoutés

- utils/cloudinary.ts
  - cldUrl: génère une URL Cloudinary optimisée avec f_auto,q_auto et dimensions (w/h/crop).
  - extractPublicIdFromUrl: utilitaire pour convertir une URL Cloudinary brute en publicId.
- components/CloudinaryImage.tsx
  - Wrapper autour de next/image forçant f_auto,q_auto, lazy-loading, sizes responsive, placeholder configurable.

## Bonnes pratiques

- Utiliser systématiquement CloudinaryImage pour toute image Cloudinary.
- Spécifier width et height (intrinsèques) pour un layout stable et des images correctement dimensionnées.
- Garder sizes adapté à la grille responsive.
- Ne pas randomiser d’URL (éviter timestamps/Math.random) pour préserver le cache CDN.
- Précharger uniquement les images critiques (prop priority de next/image).

## Exemple

```tsx
import CloudinaryImage from '@/components/CloudinaryImage';

// Avant
// <img src="https://res.cloudinary.com/<cloud>/image/upload/v123/folder/cover.png" alt="cover" />

// Après
<CloudinaryImage
  publicId="folder/cover.png"
  alt="Cover"
  width={320}
  height={320}
  crop="fill"
/>
```

## Audio / Vidéo lourds

Éviter d’utiliser Cloudinary pour mp3/wav/longues vidéos. Prévoir un provider séparé (ex: stockage objet) et pointer les lecteurs vers ces URLs.

## Mesure

- DevTools > Network > Img: vérifier les tailles transférées et le cache (200 vs 304/Memory Cache).
- Lighthouse Performance: “Properly sized images” vert, pas d’avertissements width/height.

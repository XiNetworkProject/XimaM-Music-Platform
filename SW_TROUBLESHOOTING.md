# Guide de Résolution des Problèmes Service Worker

## 🚨 Erreurs Courantes

### Erreur : "FetchEvent resulted in a network error response"

**Symptômes :**
```
The FetchEvent for "http://localhost:3000/_next/static/css/app/layout.css?v=1751311690397" resulted in a network error response: the promise was rejected.
```

**Causes possibles :**
1. Service Worker intercepte les ressources Next.js avant qu'elles soient disponibles
2. Cache corrompu
3. Conflit entre plusieurs versions du SW
4. Ressources avec paramètres de version dynamiques

## 🔧 Solutions

### Solution 1 : Nettoyage Automatique

Le script `force-update.js` est automatiquement chargé et devrait corriger la plupart des problèmes.

### Solution 2 : Nettoyage Manuel (Console)

Ouvrez la console du navigateur (F12) et exécutez :

```javascript
// Charger le script de diagnostic
fetch('/scripts/fix-sw-errors.js')
  .then(response => response.text())
  .then(script => eval(script));

// Ou exécuter directement
cleanServiceWorker();
```

### Solution 3 : Nettoyage Complet

1. **Ouvrir les DevTools** (F12)
2. **Aller dans l'onglet Application**
3. **Service Workers** → Cliquer sur "Unregister"
4. **Storage** → "Clear storage" → "Clear site data"
5. **Recharger la page**

### Solution 4 : Mode Incognito

Tester dans une fenêtre de navigation privée pour éviter les conflits de cache.

## 🛠️ Diagnostic

### Vérifier l'état du Service Worker

```javascript
// Dans la console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('SW enregistrés:', registrations);
});

// Vérifier les caches
caches.keys().then(names => {
  console.log('Caches:', names);
});
```

### Tester les ressources

```javascript
// Tester les ressources problématiques
fetch('/_next/static/css/app/layout.css')
  .then(response => console.log('CSS OK:', response.status))
  .catch(error => console.error('CSS ERREUR:', error));
```

## 🔄 Mise à Jour du Service Worker

### Version Automatique

Le SW se met à jour automatiquement quand vous modifiez `sw-optimized.js`.

### Version Manuelle

```javascript
// Forcer la mise à jour
navigator.serviceWorker.ready.then(registration => {
  registration.update();
});
```

## 📱 Problèmes Spécifiques Mobile

### Capacitor/Android

1. **Nettoyer le cache de l'app** :
   ```bash
   npx cap run android --clear
   ```

2. **Rebuilder l'app** :
   ```bash
   npx cap sync android
   ```

### iOS

1. **Nettoyer Safari** : Réglages → Safari → Effacer historique et données
2. **Rebuilder l'app** :
   ```bash
   npx cap sync ios
   ```

## 🚀 Prévention

### Bonnes Pratiques

1. **Versioning** : Toujours incrémenter `CACHE_VERSION` dans le SW
2. **Nettoyage** : Supprimer les anciens caches lors de l'activation
3. **Gestion d'erreurs** : Intercepter et gérer les erreurs de fetch
4. **Tests** : Tester après chaque modification du SW

### Configuration Recommandée

```javascript
// Dans sw-optimized.js
const CACHE_VERSION = 'v4'; // Incrémenter à chaque modification

// Nettoyage automatique des anciens caches
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, AUDIO_CACHE, API_CACHE];
  
  return Promise.all(
    cacheNames.map(cacheName => {
      if (!currentCaches.includes(cacheName)) {
        return caches.delete(cacheName);
      }
    })
  );
}
```

## 📞 Support

Si les problèmes persistent :

1. **Vérifier les logs** dans la console
2. **Tester en mode développement** (`npm run dev`)
3. **Vérifier la configuration** de Next.js
4. **Consulter les DevTools** → Application → Service Workers

## 🔍 Debug Avancé

### Activer les logs détaillés

```javascript
// Dans la console
localStorage.setItem('sw-debug', 'true');
location.reload();
```

### Analyser les requêtes

```javascript
// Intercepter toutes les requêtes
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch:', args[0]);
  return originalFetch.apply(this, args);
};
```

---

**Note :** Ce guide est spécifique à XimaM et peut nécessiter des ajustements selon votre configuration. 
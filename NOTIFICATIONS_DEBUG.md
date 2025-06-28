# 🔧 Guide de Debug - Notifications XimaM

## Problème
Les notifications ne s'affichent pas correctement, probablement à cause d'un problème de cache du service worker.

## Solutions

### 1. Page de Debug (Recommandé)
Accédez à la page de debug : `/debug-sw`

Cette page vous permet de :
- ✅ Vérifier le statut du service worker
- ✅ Tester les permissions de notification
- ✅ Forcer la mise à jour du service worker
- ✅ Nettoyer tous les caches
- ✅ Tester les notifications audio

### 2. Script de Console
Ouvrez la console du navigateur (F12) et exécutez :

```javascript
// Charger le script de debug
fetch('/scripts/load-debug-script.js').then(r => r.text()).then(eval);

// Ou directement
window.forceUpdateSW?.main();
```

### 3. Nettoyage Manuel

#### Étape 1 : Vérifier les permissions
```javascript
console.log('Permission:', Notification.permission);
```

#### Étape 2 : Désenregistrer le service worker
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  return Promise.all(registrations.map(reg => reg.unregister()));
});
```

#### Étape 3 : Nettoyer les caches
```javascript
caches.keys().then(names => {
  return Promise.all(names.map(name => caches.delete(name)));
});
```

#### Étape 4 : Recharger la page
```javascript
window.location.reload();
```

### 4. Vérifications

#### Service Worker
- ✅ Enregistré : `navigator.serviceWorker.getRegistration()`
- ✅ Actif : Vérifier dans DevTools > Application > Service Workers
- ✅ Version : Vérifier les logs dans la console

#### Notifications
- ✅ Permission accordée : `Notification.permission === 'granted'`
- ✅ Test simple : `new Notification('Test')`
- ✅ Service worker actif : Vérifier les logs

### 5. Logs de Debug

#### Dans la console du navigateur :
```
🔧 Forçage de la mise à jour du service worker...
🔄 Désenregistrement du service worker actuel...
✅ Service workers désenregistrés
🔄 Réenregistrement du service worker...
✅ Service worker réenregistré
✅ Service worker activé
🗑️ Suppression du cache: ximam-audio-v2
✅ Tous les caches ont été supprimés
🎉 Mise à jour terminée avec succès !
```

#### Dans le service worker :
```
Service Worker installé v3
Service Worker activé v3
Message reçu du service worker: {type: "UPDATE_NOTIFICATION", ...}
✅ Notification affichée avec succès
```

### 6. Problèmes Courants

#### ❌ "Permission non accordée"
```javascript
// Demander la permission
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission);
});
```

#### ❌ "Service worker non actif"
```javascript
// Vérifier l'état
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Actif:', !!reg.active);
  console.log('En attente:', !!reg.waiting);
});
```

#### ❌ "Cache non nettoyé"
```javascript
// Forcer le nettoyage
caches.keys().then(names => {
  console.log('Caches:', names);
  return Promise.all(names.map(name => caches.delete(name)));
});
```

### 7. Test Complet

1. **Ouvrir** `/debug-sw`
2. **Cliquer** "🔍 Vérifier SW"
3. **Cliquer** "🔐 Demander Permission" (si nécessaire)
4. **Cliquer** "🧪 Test Notification"
5. **Cliquer** "🎵 Test Audio"
6. **Cliquer** "🔄 Forcer Update" (si problème)
7. **Vérifier** les logs

### 8. Résolution Automatique

Le script de debug fait automatiquement :
- ✅ Désenregistrement du service worker
- ✅ Nettoyage des caches
- ✅ Réenregistrement avec nouvelle version
- ✅ Test des notifications
- ✅ Rechargement de la page

### 9. Support

Si le problème persiste :
1. Vérifiez les logs dans la console
2. Testez sur un autre navigateur
3. Vérifiez les paramètres de notification du système
4. Désactivez les extensions qui pourraient interférer

---

**Note** : Les notifications nécessitent HTTPS en production et une permission explicite de l'utilisateur. 
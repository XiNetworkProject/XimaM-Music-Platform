# 🎵 Test de Navigation Audio - Guide de Diagnostic

## 🔍 Problème
Les boutons "Suivant" et "Précédent" ne fonctionnent pas quand il n'y a pas de file d'attente.

## 🧪 Tests à Effectuer

### 1. **Page de Test Interactive**
Allez sur `/test-audio` pour tester en temps réel :
- ✅ Vérifier l'état actuel
- ✅ Charger des pistes de test
- ✅ Tester les boutons suivant/précédent
- ✅ Voir les logs détaillés

### 2. **Console du Navigateur**
Ouvrez la console (F12) et exécutez :

```javascript
// Charger le script de test
fetch('/scripts/test-audio-navigation.js').then(r => r.text()).then(eval);

// Ou tester manuellement
testAudioNavigation();
```

### 3. **Vérifications Manuelles**

#### Étape 1 : Vérifier les pistes disponibles
```javascript
// Dans la console
console.log('Pistes disponibles:', window.audioService?.allTracks?.length);
console.log('Pistes dans la queue:', window.audioService?.queue?.length);
```

#### Étape 2 : Vérifier les fonctions
```javascript
// Dans la console
console.log('Fonction nextTrack:', typeof window.audioService?.actions?.nextTrack);
console.log('Fonction previousTrack:', typeof window.audioService?.actions?.previousTrack);
```

#### Étape 3 : Tester manuellement
```javascript
// Dans la console
window.audioService?.actions?.nextTrack();
window.audioService?.actions?.previousTrack();
```

## 🔧 Solutions Possibles

### **Problème 1 : Pas de pistes chargées**
```javascript
// Solution : Charger les pistes
const response = await fetch('/api/tracks');
const tracks = await response.json();
window.audioService.actions.setAllTracks(tracks);
```

### **Problème 2 : Fonctions non exposées**
```javascript
// Vérifier que les fonctions sont bien exposées
console.log('Provider:', window.audioPlayer);
console.log('Service:', window.audioService);
```

### **Problème 3 : Cache du navigateur**
```javascript
// Forcer le rechargement
window.location.reload();
```

## 📊 Logs Attendus

### **Succès**
```
🎵 Sélection aléatoire intelligente pour la piste suivante...
🎵 Piste similaire sélectionnée: [Titre]
✅ Bouton suivant exécuté
```

### **Échec**
```
❌ Aucune piste disponible dans la bibliothèque
❌ Service audio non trouvé
❌ Erreur bouton suivant: [Erreur]
```

## 🎯 Diagnostic Rapide

### **Test 1 : Vérification de base**
1. Allez sur `/test-audio`
2. Cliquez "📚 Charger Pistes"
3. Vérifiez que des pistes sont chargées
4. Cliquez "▶️ Suivant"
5. Vérifiez les logs

### **Test 2 : Test avec une piste**
1. Chargez des pistes
2. Jouez une piste
3. Cliquez "Suivant" pendant la lecture
4. Vérifiez qu'une nouvelle piste est sélectionnée

### **Test 3 : Test sans file d'attente**
1. Jouez une seule piste
2. Cliquez "Suivant"
3. Vérifiez qu'une piste intelligente est sélectionnée

## 🚨 Problèmes Courants

### **"Aucune piste disponible"**
- ✅ Vérifiez que l'API `/api/tracks` fonctionne
- ✅ Vérifiez que des pistes existent en base
- ✅ Vérifiez les permissions d'accès

### **"Fonction non définie"**
- ✅ Vérifiez que le service audio est initialisé
- ✅ Vérifiez que le provider est bien monté
- ✅ Vérifiez les erreurs de compilation

### **"Pas de changement de piste"**
- ✅ Vérifiez les logs de sélection
- ✅ Vérifiez que `allTracks` contient des pistes
- ✅ Vérifiez que les recommandations fonctionnent

## 🔄 Résolution Automatique

Si les tests échouent, utilisez le script de réparation :

```javascript
// Script de réparation automatique
fetch('/scripts/force-update-sw.js').then(r => r.text()).then(eval);
window.forceUpdateSW.main();
```

## 📱 Test Mobile

Sur mobile, vérifiez aussi :
- ✅ Les contrôles tactiles fonctionnent
- ✅ Les notifications sont reçues
- ✅ L'audio se charge correctement

---

**Note** : Si aucun test ne fonctionne, le problème peut venir de la configuration du serveur ou de la base de données. 
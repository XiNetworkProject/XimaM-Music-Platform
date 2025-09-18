# 🎵 Guide de Test - Nouvelle Interface Générateur IA

## 🚀 Nouveautés de l'Interface

### ✨ Fonctionnalités Ajoutées

1. **🎛️ Mode Personnalisé** : Toggle pour basculer entre mode description et mode personnalisé
2. **📝 Titre** : Champ pour définir le titre de la chanson
3. **🎼 Style de Musique** : Zone de texte libre pour décrire le style
4. **🎤 Paroles** : Zone de texte pour écrire ses propres paroles
5. **🎹 Instrumental** : Toggle pour générer de la musique sans voix
6. **⚙️ Sélecteur de Modèle** : Choix entre V3.5, V4, V4.5+

## 🧪 Tests à Effectuer

### 1. **Test du Mode Description** (Par Défaut)

**Étapes :**
1. Allez sur `/ai-generator`
2. Vérifiez que le toggle "Mode personnalisé" est **désactivé**
3. Remplissez le champ "Description de la chanson"
4. Choisissez un modèle (V4 recommandé)
5. Cliquez sur "Générer de la musique"

**Exemple de test :**
```
Description: "Une chanson pop joyeuse avec des guitares acoustiques et une mélodie accrocheuse"
Modèle: V4
```

### 2. **Test du Mode Personnalisé**

**Étapes :**
1. Activez le toggle "Mode personnalisé"
2. Remplissez le **Titre** : "Mon Chant d'Été"
3. Remplissez le **Style de musique** : "Pop rock avec guitare électrique et batterie dynamique"
4. Activez le toggle **Instrumental** si vous voulez de la musique sans voix
5. Optionnel : Ajoutez des **Paroles** personnalisées
6. Choisissez un modèle (V4.5+ pour plus de qualité)
7. Cliquez sur "Générer de la musique"

**Exemple de test complet :**
```
Titre: "Étoiles de la Nuit"
Style: "Ballade pop romantique avec piano et violon"
Instrumental: Non (avec voix)
Paroles: "Sous les étoiles de la nuit
Je pense à toi mon amour
Tes yeux brillent comme des diamants
Dans l'obscurité de ce jour"
Modèle: V4.5+
```

### 3. **Test des Limites de Caractères**

**Titre :** Pas de limite visible (mais raisonnable)
**Style :** 1000 caractères max
**Paroles :** 5000 caractères max
**Description :** 199 caractères max

### 4. **Test des Modèles**

**V3.5 :** Équilibré, jusqu'à 4 minutes
**V4 :** Haute qualité, jusqu'à 4 minutes
**V4.5+ :** Avancé, jusqu'à 8 minutes

## 🎯 Scénarios de Test

### **Scénario 1 : Chanson Pop Simple**
```
Mode: Description
Description: "Une chanson pop énergique avec synthétiseur et voix claire"
Modèle: V4
```

### **Scénario 2 : Instrumental Jazz**
```
Mode: Personnalisé
Titre: "Jazz Nocturne"
Style: "Jazz smooth avec saxophone tenor et piano acoustique"
Instrumental: Oui
Modèle: V4.5+
```

### **Scénario 3 : Rock avec Paroles**
```
Mode: Personnalisé
Titre: "Rebelle du Temps"
Style: "Rock alternatif avec guitare électrique distordue et batterie puissante"
Instrumental: Non
Paroles: "Je suis un rebelle du temps
Qui lutte contre l'oubli
Mon cœur bat au rythme de la liberté
Et ma voix crie vers l'infini"
Modèle: V4
```

### **Scénario 4 : Musique Électronique**
```
Mode: Description
Description: "Musique électronique futuriste avec des beats synthétiques et des effets spatiaux"
Modèle: V4.5+
```

## 🔍 Points de Vérification

### **Interface :**
- ✅ Toggle "Mode personnalisé" fonctionne
- ✅ Sélecteur de modèle fonctionne
- ✅ Champs se remplissent correctement
- ✅ Compteurs de caractères fonctionnent
- ✅ Toggle "Instrumental" fonctionne
- ✅ Bouton "Générer" s'active/désactive selon les conditions

### **Génération :**
- ✅ Mode description génère avec la description
- ✅ Mode personnalisé utilise titre + style + paroles
- ✅ Toggle instrumental respecté
- ✅ Modèle sélectionné utilisé
- ✅ Durée par défaut : 2 minutes (120s)

### **Affichage du Résultat :**
- ✅ Titre affiché correctement
- ✅ Style affiché
- ✅ Badge "Instrumental" si activé
- ✅ Paroles affichées si fournies
- ✅ Boutons Écouter/Télécharger/Partager fonctionnels

## 🐛 Problèmes Potentiels

### **Erreurs à Vérifier :**
1. **Validation des champs** : Titre et style requis en mode personnalisé
2. **Limites de caractères** : Messages d'erreur appropriés
3. **Quota** : Messages quand quota épuisé
4. **Génération** : Messages d'erreur si échec
5. **Lecteur** : Intégration avec le lecteur principal

### **Messages d'Erreur Attendus :**
- "Veuillez remplir le titre et le style de musique" (mode personnalisé)
- "Veuillez décrire la musique que vous souhaitez" (mode description)
- "Quota épuisé. Améliorez votre plan pour continuer."
- "Erreur lors de la génération"

## 📊 Métriques de Test

### **Performance :**
- Temps de génération : 30-120 secondes
- Taille des fichiers générés : Variable selon la durée
- Qualité audio : Selon le modèle choisi

### **Utilisabilité :**
- Interface intuitive et responsive
- Transitions fluides entre les modes
- Feedback visuel approprié

## 🎵 Résultats Attendus

### **Mode Description :**
- Génération basée sur la description uniquement
- IA génère automatiquement titre, style, paroles

### **Mode Personnalisé :**
- Respect du titre fourni
- Respect du style décrit
- Respect des paroles fournies
- Respect du choix instrumental

### **Qualité selon le Modèle :**
- **V3.5** : Qualité correcte, génération rapide
- **V4** : Bonne qualité, équilibre temps/qualité
- **V4.5+** : Excellente qualité, génération plus longue

---

## ✅ Checklist de Test

- [ ] Mode description fonctionne
- [ ] Mode personnalisé fonctionne
- [ ] Toggle instrumental fonctionne
- [ ] Sélecteur de modèle fonctionne
- [ ] Validation des champs fonctionne
- [ ] Compteurs de caractères fonctionnent
- [ ] Génération réussie
- [ ] Affichage du résultat correct
- [ ] Intégration lecteur principal
- [ ] Téléchargement fonctionne
- [ ] Partage fonctionne
- [ ] Messages d'erreur appropriés

**🎯 Interface prête pour les tests !** 🎵✨

# 🔧 Guide de Dépannage - Système de Messagerie

## Erreurs Courantes et Solutions

### 1. Erreurs SSE (Server-Sent Events)

**Problème :**
```
api/messages/notifications:1 Failed to load resource: net::ERR_FAILED
Erreur SSE: Event
```

**Cause :**
- Tentatives de connexion SSE répétées
- Utilisateur non connecté
- Problèmes de réseau
- Route API non disponible

**Solutions :**

#### Solution Immédiate (Mode Développement)
Le hook `useMessageNotifications` a été modifié pour désactiver les SSE en mode développement :

```typescript
// En mode développement, on désactive temporairement les SSE
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 Mode développement: notifications SSE désactivées');
  setIsConnected(true);
  return;
}
```

#### Solution Complète (Production)
1. **Vérifier la connexion MongoDB :**
   ```bash
   node scripts/test-messages-api.js
   ```

2. **Vérifier les variables d'environnement :**
   ```bash
   # .env.local
   MONGODB_URI=mongodb+srv://...
   NEXTAUTH_SECRET=your-secret
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Redémarrer le serveur de développement :**
   ```bash
   npm run dev
   ```

### 2. Erreurs 500 sur les Routes API

**Problème :**
```
api/messages/conversations:1 Failed to load resource: the server responded with a status of 500
```

**Solutions :**

#### Vérifier la Base de Données
```bash
# Tester la connexion MongoDB
node scripts/test-messages-api.js
```

#### Vérifier les Modèles
Assurez-vous que les modèles `Conversation` et `Message` sont correctement définis :

```typescript
// models/Conversation.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  accepted: boolean;
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Vérifier l'Authentification
Assurez-vous que l'utilisateur est connecté avant d'accéder aux routes :

```typescript
const session = await getServerSession(authOptions);
if (!session || !session.user) {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
}
```

### 3. Problèmes de Navigation

**Problème :**
```
Failed to fetch RSC payload for https://xima-m-music-platform.vercel.app/profile
```

**Solutions :**

#### Vérifier les Routes
1. Assurez-vous que la page `/profile/[username]` existe
2. Vérifiez que l'utilisateur a un `username` valide
3. Redirigez vers `/auth/signin` si non connecté

#### Corriger la Navigation
```typescript
// Dans BottomNav.tsx
const handleProfileClick = () => {
  if (session?.user?.username) {
    router.push(`/profile/${session.user.username}`);
  } else {
    router.push('/auth/signin');
  }
};
```

### 4. Erreurs de Statistiques

**Problème :**
```
api/stats/community:1 Failed to load resource: the server responded with a status of 500
```

**Solutions :**

#### Vérifier les Routes de Statistiques
1. Vérifiez que la route `/api/stats/community` existe
2. Assurez-vous que la base de données est accessible
3. Vérifiez les permissions d'accès

### 5. Problèmes de Performance

**Solutions :**

#### Optimiser les Requêtes
```typescript
// Utiliser lean() pour les requêtes en lecture seule
const conversations = await Conversation.find({
  participants: session.user.id
})
  .populate('participants', 'name username avatar')
  .populate('lastMessage')
  .sort({ updatedAt: -1 })
  .lean();
```

#### Mise en Cache
```typescript
// Ajouter des en-têtes de cache appropriés
headers: {
  'Cache-Control': 'public, max-age=300', // 5 minutes
}
```

## Commandes de Diagnostic

### 1. Tester la Base de Données
```bash
node scripts/test-messages-api.js
```

### 2. Vérifier les Variables d'Environnement
```bash
node scripts/check-auth-config.js
```

### 3. Tester les Routes API
```bash
# Test local
curl http://localhost:3000/api/messages/conversations

# Test avec authentification
curl -H "Cookie: next-auth.session-token=..." http://localhost:3000/api/messages/conversations
```

### 4. Vérifier les Logs
```bash
# Logs du serveur de développement
npm run dev

# Logs de production (Vercel)
vercel logs
```

## Prévention des Erreurs

### 1. Gestion d'Erreurs Robuste
```typescript
try {
  const response = await fetch('/api/messages/conversations');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('Erreur API:', error);
  // Gérer l'erreur gracieusement
}
```

### 2. États de Chargement
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchConversations = async () => {
  setIsLoading(true);
  setError(null);
  try {
    // ... fetch data
  } catch (error) {
    setError('Erreur lors du chargement');
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Reconnexion Intelligente
```typescript
// Dans useMessageNotifications.ts
const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Reconnecter seulement si l'utilisateur est toujours connecté
reconnectTimeoutRef.current = setTimeout(() => {
  if (session?.user && status === 'authenticated') {
    connectToNotifications();
  }
}, 5000);
```

## Support

Si les problèmes persistent :

1. **Vérifiez les logs du serveur** pour des erreurs détaillées
2. **Testez en mode incognito** pour éviter les problèmes de cache
3. **Vérifiez la console du navigateur** pour des erreurs JavaScript
4. **Redémarrez le serveur de développement** pour nettoyer l'état

---

*Dernière mise à jour : ${new Date().toLocaleDateString('fr-FR')}* 
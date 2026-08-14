import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import {
  authenticateLocalPassword,
  getLocalProfileByEmail,
  getLocalProfileById,
  matchOrCreateGoogleAccount,
  type LocalProfile,
} from '@/lib/localAuth';

function sessionUser(profile: LocalProfile) {
  return {
    id: profile.id,
    email: profile.email || '',
    name: profile.name || profile.username || 'Membre Synaura',
    username: profile.username || '',
    avatar: profile.avatar || undefined,
    role: profile.role || 'user',
    isVerified: Boolean(profile.is_verified),
    bio: profile.bio || undefined,
    location: profile.location || undefined,
    website: profile.website || undefined,
    isArtist: Boolean(profile.is_artist),
    artistName: profile.artist_name || undefined,
    genre: Array.isArray(profile.genre) ? profile.genre.map(String) : [],
    totalPlays: Number(profile.total_plays || 0),
    totalLikes: Number(profile.total_likes || 0),
    lastSeen: profile.last_seen || undefined,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    ] : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const profile = await authenticateLocalPassword(credentials.email, credentials.password);
          return profile ? sessionUser(profile) : null;
        } catch (error) {
          console.error('[auth] echec de connexion PostgreSQL:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile: oauthProfile }) {
      if (account?.provider !== 'google') return true;
      if (!user.email || !account.providerAccountId) return false;
      try {
        const profile = await matchOrCreateGoogleAccount({
          email: user.email,
          providerAccountId: account.providerAccountId,
          name: user.name,
          avatar: user.image,
          emailVerified: (oauthProfile as { email_verified?: boolean } | undefined)?.email_verified,
        });
        // Le JWT NextAuth doit conserver le UUID auth.users existant, jamais l'id Google.
        user.id = profile.id;
        Object.assign(user, sessionUser(profile));
        return true;
      } catch (error) {
        console.error('[auth] association du compte Google impossible:', error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role || 'user';
        token.isVerified = Boolean(user.isVerified);
        token.isArtist = Boolean(user.isArtist);
        token.artistName = user.artistName;
        token.genre = user.genre || [];
        token.totalPlays = Number(user.totalPlays || 0);
        token.totalLikes = Number(user.totalLikes || 0);
        token.lastSeen = user.lastSeen;
      }
      return token;
    },
    async session({ session, token }) {
      const id = typeof token.id === 'string' ? token.id : '';
      let profile = id ? await getLocalProfileById(id).catch(() => null) : null;
      if (!profile && session.user?.email) {
        profile = await getLocalProfileByEmail(session.user.email).catch(() => null);
      }
      if (profile) session.user = { ...session.user, ...sessionUser(profile) };
      return session;
    },
    async redirect({ url, baseUrl }) {
      // baseUrl est calcule par NextAuth depuis NEXTAUTH_URL ou la requete courante.
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        // URL invalide: retour sur l'origine de la requete.
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production',
};

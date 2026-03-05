import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// Configuration des URLs selon l'environnement
const getAuthUrls = () => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://xima-m-music-platform.vercel.app'
    : process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return {
    baseUrl,
    signInUrl: `${baseUrl}/auth/signin`,
    errorUrl: `${baseUrl}/auth/error`
  };
};

const { baseUrl, signInUrl, errorUrl } = getAuthUrls();

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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Récupérer l'utilisateur depuis Supabase Auth
          const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
            email: credentials.email.toLowerCase(),
            password: credentials.password
          });

          if (authError || !user) {
            console.log('❌ Erreur authentification Supabase:', authError?.message);
            return null;
          }

          // Récupérer le profil utilisateur depuis la table profiles
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError || !profile) {
            console.log('❌ Erreur récupération profil:', profileError?.message);
            return null;
          }

          console.log('✅ Connexion Supabase réussie pour:', profile.email);

          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            username: profile.username,
            avatar: profile.avatar,
            role: profile.role || 'user',
            isVerified: profile.is_verified || false,
            bio: profile.bio,
            location: profile.location,
            website: profile.website,
            isArtist: profile.is_artist || false,
            artistName: profile.artist_name,
            genre: profile.genre || [],
            totalPlays: profile.total_plays || 0,
            totalLikes: profile.total_likes || 0,
            lastSeen: profile.last_seen,
          };
        } catch (error) {
          console.error('❌ Erreur lors de l\'authentification Supabase:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile: oauthProfile }) {
      if (account?.provider === 'google' && user?.email) {
        try {
          const email = user.email.toLowerCase();
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

          if (!existing) {
            const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
            let username = baseUsername;
            let suffix = 1;
            while (true) {
              const { data: taken } = await supabase.from('profiles').select('id').eq('username', username).single();
              if (!taken) break;
              username = `${baseUsername}${suffix++}`;
            }

            const { data: authUser } = await supabaseAdmin.auth.admin.listUsers();
            let supabaseUserId: string | undefined;
            const existingAuth = authUser?.users?.find(u => u.email === email);

            if (existingAuth) {
              supabaseUserId = existingAuth.id;
            } else {
              const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                email,
                email_confirm: true,
                user_metadata: { name: user.name, avatar_url: user.image },
              });
              if (createErr || !created.user) {
                console.error('Google OAuth: failed to create Supabase auth user', createErr);
                return true;
              }
              supabaseUserId = created.user.id;
            }

            await supabaseAdmin.from('profiles').insert({
              id: supabaseUserId,
              name: user.name || username,
              username,
              email,
              avatar: user.image || null,
              is_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            console.log('✅ Nouveau profil Google créé:', username);
          }
        } catch (err) {
          console.error('Google OAuth signIn callback error:', err);
        }
      }
      return true;
    },

    async session({ session, token }) {
      console.log('🔄 Mise à jour de la session Supabase pour:', session.user?.email);
      
      if (session.user?.email) {
        try {
          // Récupérer le profil utilisateur depuis Supabase
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', session.user.email)
            .single();
          
          if (profile && !profileError) {
            // Étendre la session avec les propriétés personnalisées
            const extendedUser = {
              ...session.user,
              id: profile.id,
              name: profile.name, // Toujours utiliser le nom à jour depuis la DB
              username: profile.username,
              avatar: profile.avatar,
              role: profile.role || 'user',
              isVerified: profile.is_verified || false,
              bio: profile.bio,
              location: profile.location,
              website: profile.website,
              isArtist: profile.is_artist || false,
              artistName: profile.artist_name,
              genre: profile.genre || [],
              totalPlays: profile.total_plays || 0,
              totalLikes: profile.total_likes || 0,
              lastSeen: profile.last_seen,
            };
            
            // Remplacer l'utilisateur de la session
            session.user = extendedUser;
            console.log('✅ Session Supabase mise à jour avec les données utilisateur');
          } else {
            console.warn('⚠️ Profil Supabase non trouvé pour:', session.user.email);
          }
        } catch (error) {
          console.error('❌ Erreur lors de la récupération de la session Supabase:', error);
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google' && user.email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email.toLowerCase())
            .single();
          if (profile) {
            token.id = profile.id;
            token.username = profile.username;
            token.role = profile.role || 'user';
            token.isVerified = profile.is_verified || false;
            token.isArtist = profile.is_artist || false;
            token.artistName = profile.artist_name;
            token.genre = profile.genre || [];
            token.totalPlays = profile.total_plays || 0;
            token.totalLikes = profile.total_likes || 0;
            token.lastSeen = profile.last_seen;
          }
        } else {
          const extendedToken = {
            ...token,
            id: user.id,
            username: user.username,
            role: user.role,
            isVerified: user.isVerified,
            isArtist: user.isArtist,
            artistName: user.artistName,
            genre: user.genre,
            totalPlays: user.totalPlays,
            totalLikes: user.totalLikes,
            lastSeen: user.lastSeen,
          };
          Object.assign(token, extendedToken);
        }
        console.log('🔑 JWT mis à jour pour:', user.email);
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log('🔄 Redirection Supabase:', { url, baseUrl });
      
      // Toujours rediriger vers l'accueil après authentification
      return baseUrl;
    },
  },
  pages: {
    signIn: signInUrl,
    error: errorUrl,
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production',
}; 
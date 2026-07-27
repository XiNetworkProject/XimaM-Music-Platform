import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
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

export const authOptionsSupabase: NextAuthOptions = {
  providers: [
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
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError || !profile) {
            console.log('❌ Erreur récupération profil:', profileError?.message);
            return null;
          }

          console.log('✅ Connexion Supabase réussie pour:', user.id);

          return {
            id: profile.id,
            email: user.email,
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
    async session({ session, token }) {
      console.log('🔄 Mise à jour de la session Supabase pour:', session.user?.email);
      
      if (token.id) {
        try {
          // Récupérer le profil utilisateur depuis Supabase
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', String(token.id))
            .single();
          
          if (profile && !profileError) {
            // Étendre la session avec les propriétés personnalisées
            const extendedUser = {
              ...session.user,
              id: profile.id,
              username: profile.username,
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
    async jwt({ token, user }) {
      if (user) {
        // Étendre le token avec les propriétés personnalisées
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
        
        // Retourner le token étendu
        Object.assign(token, extendedToken);
        console.log('🔑 JWT Supabase mis à jour pour:', user.email);
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

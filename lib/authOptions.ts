import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { compare } from 'bcryptjs';

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
          await dbConnect();
          const user = await User.findOne({ email: credentials.email.toLowerCase() });
          
          if (!user || !user.password) {
            console.log('❌ Utilisateur non trouvé ou pas de mot de passe:', credentials.email);
            return null;
          }

          const isPasswordValid = await compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            console.log('❌ Mot de passe incorrect pour:', credentials.email);
            return null;
          }

          console.log('✅ Connexion réussie pour:', user.email);

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            role: user.role,
            isVerified: user.isVerified,
          };
        } catch (error) {
          console.error('❌ Erreur lors de l\'authentification:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      console.log('🔄 Mise à jour de la session pour:', session.user?.email);
      
      if (session.user?.email) {
        try {
          await dbConnect();
          const user = await User.findOne({ email: session.user.email }).select('-__v');
          
          if (user) {
            session.user.id = user._id.toString();
            session.user.username = user.username;
            session.user.role = user.role;
            session.user.isVerified = user.isVerified;
            session.user.avatar = user.avatar;
            session.user.bio = user.bio;
            session.user.location = user.location;
            session.user.website = user.website;
            session.user.socialLinks = user.socialLinks;
            console.log('✅ Session mise à jour avec les données utilisateur');
          } else {
            console.warn('⚠️ Utilisateur non trouvé en base pour:', session.user.email);
          }
        } catch (error) {
          console.error('❌ Erreur lors de la récupération de la session:', error);
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.isVerified = user.isVerified;
        console.log('🔑 JWT mis à jour pour:', user.email);
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log('🔄 Redirection:', { url, baseUrl });
      
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
  debug: process.env.NODE_ENV === 'development', // Debug seulement en développement
  // Configuration simplifiée pour Vercel
  useSecureCookies: process.env.NODE_ENV === 'production',
}; 
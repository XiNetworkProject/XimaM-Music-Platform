import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
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
    callbackUrl: `${baseUrl}/api/auth/callback/google`,
    signInUrl: `${baseUrl}/auth/signin`,
    errorUrl: `${baseUrl}/auth/error`
  };
};

const { baseUrl, callbackUrl, signInUrl, errorUrl } = getAuthUrls();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
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

        await dbConnect();
        const user = await User.findOne({ email: credentials.email });
        
        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);
        
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          isVerified: user.isVerified,
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 Tentative de connexion:', { 
        provider: account?.provider, 
        email: user.email,
        hasImage: !!user.image 
      });

      if (account?.provider === 'google') {
        try {
          await dbConnect();
          
          // Vérifier si l'utilisateur existe déjà
          const existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            console.log('👤 Création d\'un nouvel utilisateur Google:', user.email);
            
            // Créer un nouvel utilisateur
            const username = user.email?.split('@')[0] || user.name?.toLowerCase().replace(/\s+/g, '');
            
            // Vérifier si le username est unique
            let uniqueUsername = username;
            let counter = 1;
            while (await User.findOne({ username: uniqueUsername })) {
              uniqueUsername = `${username}${counter}`;
              counter++;
            }
            
            const newUser = new User({
              email: user.email,
              name: user.name,
              username: uniqueUsername,
              avatar: user.image,
              isVerified: true,
              role: 'user',
              provider: 'google',
              providerId: account.providerAccountId,
            });
            
            await newUser.save();
            console.log('✅ Nouvel utilisateur créé:', uniqueUsername);
          } else {
            console.log('✅ Utilisateur existant trouvé:', existingUser.username);
          }
          
          return true;
        } catch (error) {
          console.error('❌ Erreur lors de la connexion Google:', error);
          // En cas d'erreur MongoDB, on autorise quand même la connexion
          // L'utilisateur sera créé lors de la prochaine tentative
          return true;
        }
      }
      return true;
    },
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
      // Gestion spéciale pour les redirections dans l'app mobile
      console.log('🔄 Redirection:', { url, baseUrl });
      
      // Si c'est une URL relative, on la rend absolue
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // Si c'est une URL externe qui ne correspond pas à notre domaine, on redirige vers l'accueil
      if (url.startsWith('http') && !url.startsWith(baseUrl)) {
        return baseUrl;
      }
      
      return url;
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
  debug: true, // Activer le debug pour voir les logs
  // Configuration simplifiée pour Vercel
  useSecureCookies: process.env.NODE_ENV === 'production',
}; 
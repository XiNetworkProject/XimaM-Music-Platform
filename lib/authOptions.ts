import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { compare } from 'bcryptjs';

// Forcer l'URL de production
const NEXTAUTH_URL = process.env.NODE_ENV === 'production' 
  ? 'https://xima-m-music-platform.vercel.app'
  : process.env.NEXTAUTH_URL;

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
      if (account?.provider === 'google') {
        try {
          await dbConnect();
          
          // Vérifier si l'utilisateur existe déjà
          const existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
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
          }
          
          return true;
        } catch (error) {
          console.error('Erreur lors de la connexion Google:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
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
          }
        } catch (error) {
          console.error('Erreur lors de la récupération de la session:', error);
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
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Configuration explicite pour l'URL de production
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined,
      },
    },
  },
}; 
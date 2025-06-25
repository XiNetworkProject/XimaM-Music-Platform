import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Forcer l'URL de production pour NextAuth
if (process.env.NODE_ENV === 'production') {
  process.env.NEXTAUTH_URL = 'https://xima-m-music-platform.vercel.app';
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 
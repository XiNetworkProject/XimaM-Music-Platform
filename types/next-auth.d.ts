import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username: string;
      role: 'user' | 'artist' | 'admin';
      isVerified: boolean;
      avatar?: string;
      bio?: string;
      location?: string;
      website?: string;
      socialLinks?: {
        twitter?: string;
        instagram?: string;
        youtube?: string;
        spotify?: string;
      };
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username: string;
    role: 'user' | 'artist' | 'admin';
    isVerified: boolean;
    avatar?: string;
    bio?: string;
    location?: string;
    website?: string;
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      youtube?: string;
      spotify?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: 'user' | 'artist' | 'admin';
    isVerified: boolean;
  }
} 
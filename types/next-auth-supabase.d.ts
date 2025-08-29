import { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      role: string
      isVerified: boolean
      bio?: string
      location?: string
      website?: string
      isArtist: boolean
      artistName?: string
      genre: string[]
      totalPlays: number
      totalLikes: number
      lastSeen?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    username: string
    role: string
    isVerified: boolean
    bio?: string
    location?: string
    website?: string
    isArtist: boolean
    artistName?: string
    genre: string[]
    totalPlays: number
    totalLikes: number
    lastSeen?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    role: string
    isVerified: boolean
    bio?: string
    location?: string
    website?: string
    isArtist: boolean
    artistName?: string
    genre: string[]
    totalPlays: number
    totalLikes: number
    lastSeen?: string
  }
}

import { NextResponse } from 'next/server';

export async function GET() {
  // Mock d'événements live
  const events = [
    {
      _id: '1',
      title: 'Session Acoustic Live',
      artist: {
        _id: 'a1',
        name: 'Luna Sky',
        username: 'luna_sky',
        avatar: '/default-avatar.png',
      },
      viewers: 1200,
      status: 'live',
      coverUrl: '/default-cover.jpg',
      startTime: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
      _id: '2',
      title: 'Production en Direct',
      artist: {
        _id: 'a2',
        name: 'DJ Nova',
        username: 'dj_nova',
        avatar: '/default-avatar.png',
      },
      viewers: 856,
      status: 'live',
      coverUrl: '/default-cover.jpg',
      startTime: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      _id: '3',
      title: 'Jam Session',
      artist: {
        _id: 'a3',
        name: 'The Groove Collective',
        username: 'groove_collective',
        avatar: '/default-avatar.png',
      },
      viewers: 2100,
      status: 'live',
      coverUrl: '/default-cover.jpg',
      startTime: new Date(Date.now() - 1000 * 60 * 5),
    },
  ];
  return NextResponse.json({ events });
} 
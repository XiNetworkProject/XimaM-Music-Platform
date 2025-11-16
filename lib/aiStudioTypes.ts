// lib/aiStudioTypes.ts

export interface GeneratedTrack {
  id: string;
  audioUrl: string;
  prompt: string;
  title: string;
  style: string;
  lyrics: string;
  isInstrumental: boolean;
  duration: number;
  createdAt: string;
  imageUrl?: string;
}

export interface AIStudioPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  defaults: {
    title?: string;
    description?: string;
    style?: string;
    tags?: string[];
    isInstrumental?: boolean;
    weirdness?: number;
    styleInfluence?: number;
    audioWeight?: number;
  };
}


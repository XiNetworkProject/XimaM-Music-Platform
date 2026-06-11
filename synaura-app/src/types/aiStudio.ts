export type AIModelVersion = 'V5_5' | 'V5' | 'V4_5PLUS' | 'V4_5';
export type GenerationModeKind = 'simple' | 'custom' | 'remix';
export type GenerationStatus = 'idle' | 'pending' | 'completed' | 'failed';
export type SunoState = 'idle' | 'pending' | 'first' | 'success' | 'error';
export type GenerationDuration = 60 | 120 | 180;

export interface GeneratedTrack {
  id: string;
  sunoAudioId?: string;
  generationTaskId?: string;
  audioUrl: string;
  backupAudioUrls?: string[];
  prompt: string;
  title: string;
  style: string;
  lyrics: string;
  isInstrumental: boolean;
  duration: number;
  createdAt: string;
  imageUrl?: string;
}

export interface AIStudioPreferences {
  modelVersion: AIModelVersion;
  generationDuration: GenerationDuration;
  generationModeKind: GenerationModeKind;
  sortBy: 'newest' | 'oldest' | 'title';
  filterBy: 'all' | 'instrumental' | 'with-lyrics' | 'liked' | 'trashed';
  isInstrumental: boolean;
}

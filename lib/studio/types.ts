export type StudioTrackStatus = 'ready' | 'generating' | 'failed';

export type StudioTrack = {
  id: string;
  title: string;
  artistName: string;
  createdAt: string;
  generationTaskId?: string;
  durationSec?: number;
  bpm?: number;
  key?: string;
  hasVocals?: boolean;
  language?: 'fr' | 'en' | 'auto';
  tags: string[];
  prompt: string;
  lyrics?: string;
  negativePrompt?: string;
  model: string;
  seed?: number;
  creativity?: number;
  audioUrl?: string;
  coverUrl?: string;
  isFavorite?: boolean;
  status: StudioTrackStatus;
  progress?: number;
  error?: string;
  projectId?: string;
  versionOf?: string;
  source?: 'ai_track';
  raw?: any;
};

export type StudioProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pinnedTags: string[];
  defaultModel?: string;
  defaultBpm?: number;
  defaultKey?: string;
  archived?: boolean;
};

export type GenerationJob = {
  id: string; // taskId backend (Suno)
  projectId: string;
  createdAt: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress?: number;
  error?: string;
  trackIds?: string[];
  paramsSnapshot: any;
};

export type StudioQueueStatus = 'pending' | 'running' | 'done' | 'failed';

export type StudioQueueItem = {
  id: string; // local id
  taskId?: string; // set once started
  projectId: string;
  createdAt: string;
  status: StudioQueueStatus;
  progress?: number;
  error?: string;
  paramsSnapshot: any;
};

export type StudioQueueConfig = {
  maxConcurrency: 1 | 2 | 3;
  autoRun: boolean;
};


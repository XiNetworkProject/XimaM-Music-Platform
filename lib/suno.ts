// lib/suno.ts

const BASE = process.env.SUNO_API_BASE || "https://api.sunoapi.org";

export interface SunoGenerateRequest {
  customMode?: boolean;
  prompt?: string;
  model?: string;
  instrumental?: boolean;
  callBackUrl?: string;
}

export interface SunoCustomGenerateRequest {
  title: string;
  style: string;
  prompt?: string;
  instrumental: boolean;
  model?: string;
  negativeTags?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  callBackUrl?: string;
}

export interface SunoGenerateResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface SunoTrack {
  id: string;
  title?: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  duration?: number;
  playCount?: number;
  likeCount?: number;
  shareCount?: number;
  // Propriétés supplémentaires de Suno
  sourceAudioUrl?: string;
  sourceStreamAudioUrl?: string;
  sourceImageUrl?: string;
  prompt?: string;
  modelName?: string;
  tags?: string;
  createTime?: number;
}

export interface SunoRecordInfo {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: "pending" | "first" | "success" | "error";
    tracks?: SunoTrack[];
    error?: string;
    response?: {
      taskId: string;
      sunoData?: SunoTrack[];
    };
    errorMessage?: string;
  };
}

// Génération simple (mode non-personnalisé)
export async function generateMusic(request: SunoGenerateRequest): Promise<SunoGenerateResponse> {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    throw new Error("SUNO_API_KEY manquant");
  }

  const response = await fetch(`${BASE}/api/v1/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data?.msg || `Erreur Suno: ${response.status}`);
  }

  return data;
}

// Génération personnalisée (mode custom)
export async function generateCustomMusic(request: SunoCustomGenerateRequest): Promise<SunoGenerateResponse> {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    throw new Error("SUNO_API_KEY manquant");
  }

  // Validation selon les règles customMode
  if (!request.title) {
    throw new Error("title requis");
  }
  if (!request.style) {
    throw new Error("style requis");
  }
  if (request.instrumental === false && !request.prompt) {
    throw new Error("prompt requis quand instrumental=false");
  }

  const payload = {
    customMode: true,
    instrumental: request.instrumental,
    title: request.title,
    style: request.style,
    prompt: request.instrumental ? undefined : request.prompt,
    model: request.model ?? "V4_5",
    negativeTags: request.negativeTags,
    vocalGender: request.vocalGender,
    styleWeight: request.styleWeight ?? 0.65,
    weirdnessConstraint: request.weirdnessConstraint ?? 0.5,
    audioWeight: request.audioWeight ?? 0.65,
    callBackUrl: request.callBackUrl,
  };

  const response = await fetch(`${BASE}/api/v1/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data?.msg || `Erreur Suno: ${response.status}`);
  }

  return data;
}

// Récupération des informations d'une génération
export async function getRecordInfo(taskId: string): Promise<SunoRecordInfo> {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    throw new Error("SUNO_API_KEY manquant");
  }

  const response = await fetch(`${BASE}/api/v1/generate/record-info?taskId=${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data?.msg || `Erreur Suno: ${response.status}`);
  }

  return data;
}

// Fonction utilitaire pour créer un prompt avec des hints de production
export function createProductionPrompt(
  basePrompt: string,
  options: {
    bpm?: number;
    key?: string;
    durationHint?: string;
  } = {}
): string {
  const { bpm = 128, key = "A minor", durationHint = "radio edit 2:30–3:00 with intro / verse / pre / drop" } = options;
  
  return `${basePrompt}

[Production notes]
BPM: ${bpm}
Key: ${key}
Structure hint: ${durationHint}`;
}

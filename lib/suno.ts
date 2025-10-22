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

export interface SunoUploadCoverRequest {
  uploadUrl: string;
  customMode: boolean;
  instrumental: boolean;
  model?: string;
  prompt?: string; // description (non-custom) ou lyrics (custom non-instrumental)
  title?: string;  // requis si customMode=true
  style?: string;  // requis si customMode=true
  negativeTags?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  callBackUrl?: string;
}

// Upload du fichier audio VERS Suno à partir d'une URL publique (Cloudinary)
export async function uploadAudioByUrlToSuno(sourceUrl: string): Promise<{ uploadUrl: string }> {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    throw new Error("SUNO_API_KEY manquant");
  }

  // Endpoint File Upload API (upload via URL)
  const response = await fetch(`${BASE}/api/v1/file/upload/url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: sourceUrl }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.msg || `Erreur upload fichier Suno: ${response.status}`);
  }
  const uploadUrl = data?.data?.uploadUrl || data?.data?.url || data?.data?.fileUrl;
  if (!uploadUrl) {
    throw new Error('uploadUrl manquant dans la réponse Suno');
  }
  return { uploadUrl };
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

// Upload & Cover (Remix sur un audio fourni)
export async function uploadAndCoverAudio(request: SunoUploadCoverRequest): Promise<SunoGenerateResponse> {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    throw new Error("SUNO_API_KEY manquant");
  }

  // Validation selon la documentation officielle
  if (!request.uploadUrl) {
    throw new Error("uploadUrl requis");
  }
  if (request.customMode) {
    if (!request.title) throw new Error("title requis en mode Custom");
    if (!request.style) throw new Error("style requis en mode Custom");
    if (request.instrumental === false && !request.prompt) {
      throw new Error("prompt (lyrics) requis quand instrumental=false en mode Custom");
    }
  } else {
    // Non-custom: seul prompt est requis (et uploadUrl)
    if (!request.prompt) throw new Error("prompt requis en mode Non-custom");
  }

  const payload: any = {
    uploadUrl: request.uploadUrl,
    customMode: request.customMode,
    instrumental: request.instrumental,
    model: request.model ?? "V4_5",
    callBackUrl: request.callBackUrl,
  };

  if (request.customMode) {
    payload.title = request.title;
    payload.style = request.style;
    payload.prompt = request.instrumental ? undefined : request.prompt; // lyrics uniquement si non-instrumental
    payload.negativeTags = request.negativeTags;
    payload.vocalGender = request.vocalGender;
    payload.styleWeight = request.styleWeight ?? 0.65;
    payload.weirdnessConstraint = request.weirdnessConstraint ?? 0.5;
    payload.audioWeight = request.audioWeight ?? 0.65;
  } else {
    // Non-custom: seulement prompt + uploadUrl
    payload.prompt = request.prompt;
  }

  const response = await fetch(`${BASE}/api/v1/generate/upload-cover`, {
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

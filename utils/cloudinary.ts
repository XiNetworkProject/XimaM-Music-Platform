export type CloudinaryKind = 'image' | 'video';

export function cldUrl({
  cloudName,
  publicId,
  width,
  height,
  crop = 'fill',
  kind = 'image',
  formatParams = 'f_auto,q_auto'
}: {
  cloudName: string;
  publicId: string;
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'pad';
  kind?: CloudinaryKind;
  formatParams?: string;
}) {
  const base = `https://res.cloudinary.com/${cloudName}/${kind}/upload`;
  const size = width || height ? `w_${width ?? ''}${height ? `,h_${height}` : ''},c_${crop}` : '';
  const transfo = [size, formatParams].filter(Boolean).join(',');
  const cleaned = `${base}/${transfo}/${publicId}`
    .replace(/\/+,/g, '/')
    .replace(/,+\//g, '/');
  return cleaned;
}

// Extraire le publicId depuis une URL Cloudinary complète
export function extractPublicIdFromUrl(url: string): { publicId: string; kind: CloudinaryKind } | null {
  try {
    const u = new URL(url);
    if (!/\.cloudinary\.com$/.test(u.hostname)) return null;
    // Format attendu: /<kind>/upload/<transformations...>/<publicId>
    const parts = u.pathname.split('/').filter(Boolean);
    // .../[image|video]/upload/.../<publicId>
    const kind = (parts[1] as CloudinaryKind) || 'image';
    const uploadIdx = parts.findIndex((p) => p === 'upload');
    if (uploadIdx === -1) return null;
    const publicIdParts = parts.slice(uploadIdx + 2); // skip 'upload' and transformations
    if (publicIdParts.length === 0) return null;
    const publicId = publicIdParts.join('/');
    return { publicId, kind };
  } catch {
    return null;
  }
}

// Optimiser une URL arbitraire Cloudinary (sinon retourne l'URL telle quelle)
export function optimizeCloudinarySrc(url: string, opts?: { width?: number; height?: number; crop?: 'fill'|'fit'|'scale'|'thumb'|'pad'; cloudName?: string }): string {
  const parsed = extractPublicIdFromUrl(url);
  if (!parsed) return url;
  const cloudName = opts?.cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
  const { width, height, crop = 'fill' } = opts || {};
  try {
    return cldUrl({ cloudName, publicId: parsed.publicId, width, height, crop, kind: parsed.kind });
  } catch {
    return url;
  }
}



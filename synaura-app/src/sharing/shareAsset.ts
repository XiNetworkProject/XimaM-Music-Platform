import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export type ShareDownloadProgress = {
  written: number;
  expected: number;
  ratio: number;
};

export type CachedShareImage = {
  uri: string;
  size: number;
};

function safeFilePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 72) || 'carte';
}

function headerValue(headers: Record<string, string>, name: string) {
  const key = Object.keys(headers).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : '';
}

export async function cacheRemoteShareImage(
  remoteUrl: string,
  fileKey: string,
  onProgress?: (progress: ShareDownloadProgress) => void,
): Promise<CachedShareImage> {
  if (!remoteUrl) throw new Error('Adresse de carte absente.');
  if (!FileSystem.cacheDirectory) throw new Error('Stockage temporaire indisponible.');

  const destination = `${FileSystem.cacheDirectory}synaura-${safeFilePart(fileKey)}.png`;
  await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined);

  const download = FileSystem.createDownloadResumable(
    remoteUrl,
    destination,
    {
      cache: false,
      headers: {
        Accept: 'image/png,image/*;q=0.9',
        'Cache-Control': 'no-cache',
      },
    },
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      const expected = Math.max(0, Number(totalBytesExpectedToWrite || 0));
      const written = Math.max(0, Number(totalBytesWritten || 0));
      onProgress?.({
        written,
        expected,
        ratio: expected > 0 ? Math.min(1, written / expected) : 0,
      });
    },
  );

  try {
    const result = await download.downloadAsync();
    if (!result || result.status < 200 || result.status >= 300) {
      throw new Error(`Generation refusee (${result?.status || 'reseau'}).`);
    }

    const contentType = headerValue(result.headers || {}, 'content-type').toLowerCase();
    if (contentType && !contentType.startsWith('image/')) {
      throw new Error('La reponse recue n est pas une image.');
    }

    const info = await FileSystem.getInfoAsync(result.uri);
    const size = info.exists && !info.isDirectory && 'size' in info ? Number(info.size || 0) : 0;
    if (!info.exists || info.isDirectory || size < 1024) {
      throw new Error('La carte generee est vide.');
    }

    onProgress?.({ written: size, expected: size, ratio: 1 });
    return { uri: result.uri, size };
  } catch (error) {
    await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined);
    throw error;
  }
}

export async function shareCachedImage(uri: string, title: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Le partage de fichiers n est pas disponible sur cet appareil.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: title,
    UTI: 'public.png',
  });
}

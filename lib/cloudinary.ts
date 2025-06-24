import { v2 as cloudinary } from 'cloudinary';

// Types pour les résultats Cloudinary
export interface CloudinaryResult {
  public_id: string;
  secure_url: string;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload d'image (cover, avatar, etc.)
export const uploadImage = async (file: Buffer, options: any = {}): Promise<CloudinaryResult> => {
  try {
    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'ximam/images',
          resource_type: 'image',
          quality: 'auto',
          ...options,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryResult);
        }
      ).end(file);
    });

    return result;
  } catch (error) {
    console.error('Erreur upload image:', error);
    throw new Error('Échec de l\'upload de l\'image');
  }
};

// Upload d'audio
export const uploadAudio = async (file: Buffer, options: any = {}): Promise<CloudinaryResult> => {
  try {
    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'ximam/audio',
          resource_type: 'video', // Cloudinary traite l'audio comme une vidéo
          format: 'mp3',
          quality: 'auto',
          ...options,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryResult);
        }
      ).end(file);
    });

    return result;
  } catch (error) {
    console.error('Erreur upload audio:', error);
    throw new Error('Échec de l\'upload de l\'audio');
  }
};

// Supprimer un fichier
export const deleteFile = async (publicId: string, resourceType: 'image' | 'video' = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Erreur suppression fichier:', error);
    throw new Error('Échec de la suppression du fichier');
  }
};

// Générer une URL signée pour l'upload direct
export const generateUploadSignature = (params: any) => {
  return cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
};

// Optimiser une image existante
export const optimizeImage = (publicId: string, options: any = {}) => {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    ...options,
  });
};

export default cloudinary; 
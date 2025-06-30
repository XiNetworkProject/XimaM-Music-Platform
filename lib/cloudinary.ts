import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

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
    console.log('🔄 Début upload Cloudinary...');
    console.log('Options:', options);
    console.log('Taille buffer:', file.length);
    
    // Vérifier la configuration Cloudinary
    console.log('🔍 Vérification config Cloudinary...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Présent' : '❌ Manquant');
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Présent' : '❌ Manquant');
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Configuration Cloudinary incomplète');
    }
    
    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      // Options par défaut plus simples
      const uploadOptions = {
        folder: 'ximam/images',
        resource_type: 'image',
        quality: 'auto',
        ...options,
      };
      
      console.log('🔄 Création upload stream avec options:', uploadOptions);
      
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('❌ Erreur Cloudinary dans callback:', error);
            console.error('Type d\'erreur:', error.constructor.name);
            console.error('Propriétés erreur:', Object.keys(error));
            
            if (error && typeof error === 'object' && 'http_code' in error) {
              console.error('Code HTTP:', (error as any).http_code);
              console.error('Message:', (error as any).message);
            }
            
            reject(error);
          } else {
            console.log('✅ Upload Cloudinary réussi:', result);
            resolve(result as CloudinaryResult);
          }
        }
      );
      
      console.log('🔄 Envoi du buffer vers Cloudinary...');
      uploadStream.end(file);
    });

    return result;
  } catch (error) {
    console.error('❌ Erreur upload image:', error);
    
    // Gestion spécifique des erreurs Cloudinary
    if (error && typeof error === 'object' && 'http_code' in error) {
      const cloudinaryError = error as any;
      console.error('Code erreur Cloudinary:', cloudinaryError.http_code);
      console.error('Message erreur Cloudinary:', cloudinaryError.message);
      
      if (cloudinaryError.http_code === 400) {
        throw new Error('Paramètres d\'upload invalides');
      } else if (cloudinaryError.http_code === 401) {
        throw new Error('Credentials Cloudinary invalides');
      } else if (cloudinaryError.http_code === 403) {
        throw new Error('Permissions Cloudinary insuffisantes');
      } else if (cloudinaryError.http_code === 429) {
        throw new Error('Quota Cloudinary dépassé');
      } else if (cloudinaryError.http_code === 500) {
        throw new Error('Erreur serveur Cloudinary');
      }
    }
    
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

// Générer une signature pour l'upload direct (méthode manuelle pour contrôle total)
export const generateUploadSignature = (params: any) => {
  console.log('=== GENERATE SIGNATURE ===');
  console.log('Input params:', params);
  
  // Trier les paramètres par ordre alphabétique
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result: any, key) => {
      result[key] = params[key];
      return result;
    }, {});

  console.log('Sorted params:', sortedParams);

  // Créer la chaîne à signer au format key=value&key=value
  const signString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  console.log('String to sign:', signString);
  console.log('API Secret:', process.env.CLOUDINARY_API_SECRET?.substring(0, 10) + '...');

  // Générer la signature SHA1
  const signature = crypto
    .createHash('sha1')
    .update(signString + process.env.CLOUDINARY_API_SECRET!)
    .digest('hex');

  console.log('Generated signature:', signature);
  console.log('=== END GENERATE SIGNATURE ===');
  
  return signature;
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
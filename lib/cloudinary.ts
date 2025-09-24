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

// Upload d'image via API REST directe (méthode alternative)
export const uploadImageDirect = async (file: Buffer, options: any = {}): Promise<CloudinaryResult> => {
  try {
    console.log('🔄 Début upload Cloudinary via API REST directe...');
    
    // Vérifier la configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Configuration Cloudinary incomplète');
    }
    
    // Préparer les paramètres avec timestamp et signature
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp,
      folder: options.folder || 'ximam/images',
      resource_type: 'image',
      ...options
    };
    
    // Générer la signature
    const signature = generateUploadSignature(params);
    
    console.log('📤 Paramètres upload:', { ...params, signature });
    
    // URL de l'API Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    // Créer FormData avec authentification signée
    const formData = new FormData();
    formData.append('file', `data:image/png;base64,${file.toString('base64')}`);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('api_key', process.env.CLOUDINARY_API_KEY!);
    formData.append('folder', params.folder);
    formData.append('resource_type', params.resource_type);
    
    // Ajouter les options supplémentaires
    if (options.quality) formData.append('quality', options.quality);
    if (options.format) formData.append('format', options.format);
    
    console.log('🔄 Envoi requête HTTP vers Cloudinary...');
    
    // Faire la requête HTTP sans authentification Basic (utilise la signature)
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    console.log('📥 Réponse Cloudinary reçue');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur HTTP Cloudinary:', response.status, errorText);
      throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Upload réussi via API REST:', result);
    
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
    
  } catch (error) {
    console.error('❌ Erreur upload via API REST:', error);
    throw error;
  }
};

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
  
  // Filtrer les paramètres à exclure de la signature
  const excludedParams = ['file'];
  const filteredParams = Object.keys(params)
    .filter(key => !excludedParams.includes(key))
    .sort()
    .reduce((result: any, key) => {
      result[key] = params[key];
      return result;
    }, {});

  console.log('Filtered params (excluded file):', filteredParams);

  // Créer la chaîne à signer au format key=value&key=value
  // Cloudinary exige un ordre spécifique : timestamp, public_id, folder, resource_type
  const orderedParams = [
    ['timestamp', filteredParams.timestamp],
    ['public_id', filteredParams.publicId],
    ['folder', filteredParams.folder],
    ['resource_type', filteredParams.resource_type]
  ].filter(([key, value]) => value !== undefined);

  const signString = orderedParams
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
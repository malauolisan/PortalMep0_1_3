import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export interface ImageOptimizationStats {
  originalSize: number;
  optimizedSize: number;
  reductionPercentage: number;
  width: number;
  height: number;
  mimeType: string;
}

export interface OptimizeOptions {
  maxDimension?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg' | 'image/png' | 'auto';
  folder?: string;
}

export interface OptimizedImageResult {
  blob: Blob;
  dataUrl: string;
  stats: ImageOptimizationStats;
  fileName: string;
}

export interface UploadResult {
  url: string;
  stats: ImageOptimizationStats;
  isFirebaseStorage: boolean;
}

/**
 * Format bytes to readable string (e.g. 1.2 MB, 84 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Converts a base64 Data URL to a Blob safely and synchronously
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const byteString = atob(parts[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: mime });
  } catch (err) {
    console.error('[ImageOptimizer] Falha ao converter dataUrl em Blob:', err);
    return new Blob([], { type: 'image/jpeg' });
  }
}

/**
 * Checks if the browser supports canvas.toDataURL with webp format
 */
function checkWebPSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

const isWebPSupported = typeof window !== 'undefined' ? checkWebPSupport() : false;

/**
 * Get optimal dimension and quality preset based on context folder
 */
export function getFolderPresets(folder: string): { maxDimension: number; quality: number } {
  switch (folder) {
    case 'slides':
    case 'banners':
    case 'hero':
      return { maxDimension: 1600, quality: 0.82 };
    case 'users':
    case 'avatars':
      return { maxDimension: 400, quality: 0.80 };
    case 'institutions':
    case 'modules':
      return { maxDimension: 1000, quality: 0.80 };
    case 'news':
    case 'articles':
    case 'events':
    default:
      return { maxDimension: 1200, quality: 0.80 };
  }
}

/**
 * Optimizes an image client-side before upload.
 * Resizes large high-res photos to crisp web dimensions and encodes to lightweight WebP.
 * Uses synchronous canvas export and timeout protection to prevent hanging.
 */
export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<OptimizedImageResult> {
  const originalSize = file.size;

  // Preserve SVG as-is (vector format)
  if (file.type === 'image/svg+xml') {
    const dataUrl = await fileToDataUrl(file);
    return {
      blob: file,
      dataUrl,
      fileName: file.name,
      stats: {
        originalSize,
        optimizedSize: originalSize,
        reductionPercentage: 0,
        width: 0,
        height: 0,
        mimeType: file.type,
      },
    };
  }

  // Preserve animated GIF if detected
  if (file.type === 'image/gif') {
    const dataUrl = await fileToDataUrl(file);
    return {
      blob: file,
      dataUrl,
      fileName: file.name,
      stats: {
        originalSize,
        optimizedSize: originalSize,
        reductionPercentage: 0,
        width: 0,
        height: 0,
        mimeType: file.type,
      },
    };
  }

  // Determine preset defaults based on folder if provided
  const preset = options.folder ? getFolderPresets(options.folder) : { maxDimension: 1200, quality: 0.80 };
  const maxDim = options.maxDimension ?? preset.maxDimension;
  const quality = options.quality ?? preset.quality;

  // Determine target format
  let targetMime = 'image/jpeg';
  let targetExt = 'jpg';

  if (options.format === 'image/png') {
    targetMime = 'image/png';
    targetExt = 'png';
  } else if (options.format === 'image/jpeg') {
    targetMime = 'image/jpeg';
    targetExt = 'jpg';
  } else if (isWebPSupported) {
    targetMime = 'image/webp';
    targetExt = 'webp';
  }

  return new Promise((resolve, reject) => {
    let objectUrl = '';
    let hasResolved = false;

    // Safety timeout to prevent hanging forever on corrupted images
    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(new Error('Tempo esgotado ao processar a imagem. Formato pode não ser suportado.'));
      }
    }, 8000);

    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // Fallback to FileReader if createObjectURL fails
      const reader = new FileReader();
      reader.onload = () => processImageData(reader.result as string);
      reader.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Erro ao ler o arquivo de imagem.'));
      };
      reader.readAsDataURL(file);
      return;
    }

    const processImageData = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        if (hasResolved) return;
        clearTimeout(timeoutId);
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
        }

        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width === 0 || height === 0) {
            hasResolved = true;
            reject(new Error('Dimensões da imagem inválidas.'));
            return;
          }

          // Calculate proportional aspect ratio resize
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          // Draw image onto canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: targetMime !== 'image/jpeg' });

          if (!ctx) {
            hasResolved = true;
            reject(new Error('Não foi possível inicializar o renderizador de imagem.'));
            return;
          }

          // High quality smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // For JPEG, fill background with white to avoid transparent black background
          if (targetMime === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Synchronous export via toDataURL (rock-solid across all browsers)
          let dataUrl = canvas.toDataURL(targetMime, quality);
          let actualMime = targetMime;

          // If browser does not support WebP encoding, fallback to JPEG
          if (targetMime === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
            targetMime = 'image/jpeg';
            targetExt = 'jpg';
            actualMime = 'image/jpeg';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          const blob = dataUrlToBlob(dataUrl);
          const optimizedSize = blob.size;
          const reduction = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

          const cleanBaseName = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 40);
          const finalFileName = `${cleanBaseName || 'imagem'}.${targetExt}`;

          hasResolved = true;
          resolve({
            blob,
            dataUrl,
            fileName: finalFileName,
            stats: {
              originalSize,
              optimizedSize,
              reductionPercentage: reduction,
              width,
              height,
              mimeType: actualMime,
            },
          });
        } catch (canvasErr) {
          hasResolved = true;
          reject(canvasErr);
        }
      };

      img.onerror = () => {
        if (hasResolved) return;
        clearTimeout(timeoutId);
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
        }
        hasResolved = true;
        reject(new Error('Não foi possível ler os dados da imagem. Verifique se o arquivo não está corrompido.'));
      };

      img.src = src;
    };

    processImageData(objectUrl);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an optimized image to Firebase Storage with automatic client-side compression
 * and fallback to lightweight inline dataUrl if Storage is not configured, slow or blocked by CORS.
 * Strict timeout prevents the UI from ever hanging in "Otimizando..." state.
 */
export async function uploadOptimizedImage(
  file: File,
  folder: string,
  options: OptimizeOptions = {}
): Promise<UploadResult> {
  // 1. Optimize image in-memory first (instant, ~50ms)
  const optimized = await optimizeImage(file, { ...options, folder });

  // 2. Try Firebase Storage with a strict 2-second timeout to avoid any hang
  try {
    const timestamp = Date.now();
    const safePath = `${folder}/${timestamp}_${optimized.fileName}`;
    const storageRef = ref(storage, safePath);

    const uploadAction = async () => {
      await uploadBytes(storageRef, optimized.blob, {
        contentType: optimized.stats.mimeType,
        cacheControl: 'public, max-age=31536000, immutable',
      });
      return await getDownloadURL(storageRef);
    };

    // Strict 2000ms timeout guard
    const timeoutGuard = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage timeout')), 2000)
    );

    const downloadUrl = await Promise.race([uploadAction(), timeoutGuard]);
    if (downloadUrl) {
      return {
        url: downloadUrl,
        stats: optimized.stats,
        isFirebaseStorage: true,
      };
    }
  } catch (storageError) {
    console.info(
      `[ImageOptimizer] Armazenamento externo em nuvem indisponível ou lento para '${folder}'. Usando imagem otimizada ultraleve (${optimized.stats.mimeType}):`,
      storageError
    );
  }

  // 3. Fallback to lightweight optimized Data URL (safe size for Firestore)
  return {
    url: optimized.dataUrl,
    stats: optimized.stats,
    isFirebaseStorage: false,
  };
}

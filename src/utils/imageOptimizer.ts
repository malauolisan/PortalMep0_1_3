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
 * Checks if the browser supports canvas.toDataURL/toBlob with webp format
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
      return { maxDimension: 1600, quality: 0.85 };
    case 'users':
    case 'avatars':
      return { maxDimension: 400, quality: 0.85 };
    case 'institutions':
      return { maxDimension: 1000, quality: 0.82 };
    case 'news':
    case 'articles':
    case 'events':
    default:
      return { maxDimension: 1280, quality: 0.82 };
  }
}

/**
 * Optimizes an image client-side before upload.
 * Resizes large high-res photos to crisp web dimensions and encodes to lightweight WebP.
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
  const preset = options.folder ? getFolderPresets(options.folder) : { maxDimension: 1280, quality: 0.82 };
  const maxDim = options.maxDimension ?? preset.maxDimension;
  const quality = options.quality ?? preset.quality;

  // Determine output format (WebP is standard, fallback to JPEG for older browsers)
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
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido ou corrompido.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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
          reject(new Error('Não foi possível inicializar o contexto gráfico.'));
          return;
        }

        // Apply high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // For JPEG, fill background with white to avoid transparent black artifacts
        if (targetMime === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback to dataURL
              const dataUrl = canvas.toDataURL(targetMime, quality);
              const byteString = atob(dataUrl.split(',')[1]);
              const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const fallbackBlob = new Blob([ab], { type: mimeString });
              const optimizedSize = fallbackBlob.size;
              const reduction = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

              const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
              const finalFileName = `${cleanBaseName}.${targetExt}`;

              resolve({
                blob: fallbackBlob,
                dataUrl,
                fileName: finalFileName,
                stats: {
                  originalSize,
                  optimizedSize,
                  reductionPercentage: reduction,
                  width,
                  height,
                  mimeType: targetMime,
                },
              });
              return;
            }

            const dataUrl = canvas.toDataURL(targetMime, quality);
            const optimizedSize = blob.size;
            const reduction = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

            const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const finalFileName = `${cleanBaseName}.${targetExt}`;

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
                mimeType: targetMime,
              },
            });
          },
          targetMime,
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
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
 * and fallback to lightweight inline dataUrl if Storage is not configured.
 */
export async function uploadOptimizedImage(
  file: File,
  folder: string,
  options: OptimizeOptions = {}
): Promise<UploadResult> {
  // 1. Optimize image in-memory first (blazing fast, ~100ms)
  const optimized = await optimizeImage(file, { ...options, folder });

  // 2. Try Firebase Storage with the compressed Blob
  try {
    const timestamp = Date.now();
    const safePath = `${folder}/${timestamp}_${optimized.fileName}`;
    const storageRef = ref(storage, safePath);

    await uploadBytes(storageRef, optimized.blob, {
      contentType: optimized.stats.mimeType,
      cacheControl: 'public, max-age=31536000, immutable',
    });

    const downloadUrl = await getDownloadURL(storageRef);
    if (downloadUrl) {
      return {
        url: downloadUrl,
        stats: optimized.stats,
        isFirebaseStorage: true,
      };
    }
  } catch (storageError) {
    console.warn(
      `[ImageOptimizer] Firebase Storage indisponível para '${folder}', utilizando formato comprimido otimizado (${optimized.stats.mimeType}):`,
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

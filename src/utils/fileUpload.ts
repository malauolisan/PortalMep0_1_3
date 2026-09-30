export interface UploadedFileResult {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function uploadPortalFile(file: File): Promise<UploadedFileResult> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  const response = await fetch('/api/upload-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dataUrl,
      fileName: file.name,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Falha no upload do arquivo (HTTP ${response.status})`);
  }

  const result = await response.json();
  return {
    url: result.url,
    fileName: result.fileName || file.name,
    fileSize: result.fileSize || file.size,
    fileType: result.fileType || file.type || 'application/octet-stream',
  };
}

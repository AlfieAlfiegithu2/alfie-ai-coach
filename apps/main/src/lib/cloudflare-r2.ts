// Cloudflare R2 Storage Utilities
// This replaces Supabase storage to reduce egress costs

export interface R2UploadResult {
  success: boolean;
  url: string;
  key: string;
  error?: string;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

// R2 Configuration - Update these with your Cloudflare R2 details
const R2_CONFIG: R2Config = {
  accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '',
  accessKeyId: import.meta.env.VITE_CLOUDFLARE_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta.env.VITE_CLOUDFLARE_SECRET_ACCESS_KEY || '',
  bucketName: import.meta.env.VITE_CLOUDFLARE_R2_BUCKET || 'alfie-ai-audio',
  publicUrl: import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL || 'https://your-bucket.your-domain.com'
};

// Upload file to R2
export async function uploadToR2(
  file: File, 
  path: string, 
  options?: { contentType?: string; cacheControl?: string }
): Promise<R2UploadResult> {
  try {
    // For client-side uploads, we'll use a serverless function
    // This prevents exposing R2 credentials in the browser
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    if (options?.contentType) formData.append('contentType', options.contentType);
    if (options?.cacheControl) formData.append('cacheControl', options.cacheControl);

    const response = await fetch('/api/r2-upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('R2 upload error:', error);
    return {
      success: false,
      url: '',
      key: '',
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

// Generate public URL for R2 file
export function getR2PublicUrl(key: string): string {
  return `${R2_CONFIG.publicUrl}/${key}`;
}

// Delete file from R2
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const response = await fetch('/api/r2-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    return response.ok;
  } catch (error) {
    console.error('R2 delete error:', error);
    return false;
  }
}

// List files in R2 (for admin purposes)
export async function listR2Files(prefix?: string): Promise<string[]> {
  try {
    const response = await fetch('/api/r2-list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix }),
    });

    if (!response.ok) {
      throw new Error(`List failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.files || [];
  } catch (error) {
    console.error('R2 list error:', error);
    return [];
  }
}

// Audio-specific utilities
export const AudioR2 = {
  // Upload pronunciation recording
  uploadPronunciation: async (file: File, testId: string, itemId: string): Promise<R2UploadResult> => {
    const path = `pronunciation/${testId}/${itemId}/${Date.now()}.webm`;
    return uploadToR2(file, path, { contentType: 'audio/webm' });
  },

  // Upload speaking test recording
  uploadSpeaking: async (file: File, testId: string, key: string): Promise<R2UploadResult> => {
    const path = `speaking/${testId}/${key}_${Date.now()}.webm`;
    return uploadToR2(file, path, { contentType: 'audio/webm' });
  },

  // Upload listening audio
  uploadListening: async (file: File, testId: string, filename: string): Promise<R2UploadResult> => {
    const path = `listening/${testId}/${filename}`;
    return uploadToR2(file, path, { contentType: 'audio/mpeg' });
  },

  // Upload admin audio
  uploadAdminAudio: async (file: File, category: string, filename: string): Promise<R2UploadResult> => {
    const path = `admin/${category}/${Date.now()}-${filename}`;
    return uploadToR2(file, path, { contentType: 'audio/mpeg' });
  },

  // Upload avatar
  uploadAvatar: async (file: File, userId: string): Promise<R2UploadResult> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `avatars/${userId}/avatar.${ext}`;
    return uploadToR2(file, path, { contentType: file.type });
  },

  // Get audio URL
  getAudioUrl: (audioPath: string): string => {
    return getR2PublicUrl(audioPath);
  }
};

// Cloudflare R2 Storage Utilities
// This replaces Supabase storage to reduce egress costs
import { supabase } from "@/integrations/supabase/client";

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

// Upload file to R2 directly (client-side)
export async function uploadToR2(
  file: File,
  path: string,
  options?: { contentType?: string; cacheControl?: string }
): Promise<R2UploadResult> {
  try {
    // Direct R2 upload using AWS SDK approach
    const contentType = options?.contentType || file.type;
    const cacheControl = options?.cacheControl || 'public, max-age=31536000';

    // Prepare the upload
    const endpoint = `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
    const canonicalPath = `/${R2_CONFIG.bucketName}/${path.split('/').map(encodeURIComponent).join('/')}`;
    const url = `${endpoint}${canonicalPath}`;

    // Create AWS Signature V4
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = await sha256(await file.arrayBuffer());

    const canonicalRequest = [
      'PUT',
      canonicalPath,
      '',
      `host:${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
      '',
      'host;x-amz-content-sha256;x-amz-date',
      payloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      await sha256(canonicalRequest)
    ].join('\n');

    const signingKey = await getSignatureKey(R2_CONFIG.secretAccessKey, dateStamp, 'auto', 's3');
    const signatureBytes = await hmac(signingKey, stringToSign);
    const signature = Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

    // Upload to R2
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    let publicUrl: string;
    if (R2_CONFIG.publicUrl) {
      if (R2_CONFIG.publicUrl.includes('.r2.dev')) {
        publicUrl = `${R2_CONFIG.publicUrl}/${path}`;
      } else if (R2_CONFIG.publicUrl.includes('cloudflarestorage.com')) {
        const base = R2_CONFIG.publicUrl.endsWith(`/${R2_CONFIG.bucketName}`)
          ? R2_CONFIG.publicUrl
          : `${R2_CONFIG.publicUrl}/${R2_CONFIG.bucketName}`;
        publicUrl = `${base}/${path}`;
      } else {
        publicUrl = `${R2_CONFIG.publicUrl}/${path}`;
      }
    } else {
      publicUrl = `https://${R2_CONFIG.bucketName}.${R2_CONFIG.accountId}.r2.dev/${path}`;
    }

    return {
      success: true,
      url: publicUrl,
      key: path,
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Upload failed';

    return {
      success: false,
      url: '',
      key: '',
      error: message,
    };
  }
}

// AWS Signature V4 helpers
async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
  const encoder = new TextEncoder();

  let kDate = await hmac(encoder.encode('AWS4' + key), dateStamp);
  let kRegion = await hmac(kDate, regionName);
  let kService = await hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

async function sha256(data: string | ArrayBuffer) {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate public URL for R2 file
export function getR2PublicUrl(key: string): string {
  return `${R2_CONFIG.publicUrl}/${key}`;
}

// Delete file from R2
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    // Direct R2 delete using AWS SDK approach
    const endpoint = `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
    const canonicalPath = `/${R2_CONFIG.bucketName}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const url = `${endpoint}${canonicalPath}`;

    // Create AWS Signature V4
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = await sha256('');

    const canonicalRequest = [
      'DELETE',
      canonicalPath,
      '',
      `host:${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
      '',
      'host;x-amz-content-sha256;x-amz-date',
      payloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      await sha256(canonicalRequest)
    ].join('\n');

    const signingKey = await getSignatureKey(R2_CONFIG.secretAccessKey, dateStamp, 'auto', 's3');
    const signatureBytes = await hmac(signingKey, stringToSign);
    const signature = Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
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
    // Direct R2 list using AWS SDK approach
    const endpoint = `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
    const canonicalPath = `/${R2_CONFIG.bucketName}/`;
    const queryParams = prefix ? `list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=1000` : 'list-type=2&max-keys=1000';
    const url = `${endpoint}${canonicalPath}?${queryParams}`;

    // Create AWS Signature V4
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalQueryString = queryParams.split('&').sort().join('&');
    const canonicalRequest = [
      'GET',
      canonicalPath,
      canonicalQueryString,
      `host:${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
      '',
      'host;x-amz-content-sha256;x-amz-date',
      payloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      await sha256(canonicalRequest)
    ].join('\n');

    const signingKey = await getSignatureKey(R2_CONFIG.secretAccessKey, dateStamp, 'auto', 's3');
    const signatureBytes = await hmac(signingKey, stringToSign);
    const signature = Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`List failed: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const files: string[] = [];

    // Simple XML parsing for S3 list response
    const keyMatches = xmlText.matchAll(/<Key>([^<]+)<\/Key>/g);
    for (const match of keyMatches) {
      files.push(match[1]);
    }

    return files;
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

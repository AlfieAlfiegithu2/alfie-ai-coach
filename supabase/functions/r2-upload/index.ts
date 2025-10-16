import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME') || 'alfie-ai-audio';
const R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing Cloudflare R2 configuration');
}

// Generate AWS Signature V4
function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(regionName).digest();
  const kService = createHmac('sha256', kRegion).update(serviceName).digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
  return kSigning;
}

function sha256(data: string | ArrayBuffer) {
  const hashSum = createHmac('sha256', '');
  hashSum.update(typeof data === 'string' ? data : new Uint8Array(data));
  return hashSum.digest('hex');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('Missing Cloudflare R2 configuration');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    const contentType = formData.get('contentType') as string || file.type;
    const cacheControl = formData.get('cacheControl') as string || 'public, max-age=31536000';

    if (!file || !path) {
      throw new Error('Missing file or path');
    }

    console.log('📤 Uploading to R2:', { path, size: file.size, type: contentType });

    // Prepare the upload
    const fileBuffer = await file.arrayBuffer();
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const url = `${endpoint}/${R2_BUCKET_NAME}/${path}`;
    
    // Create signature
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    const payloadHash = sha256(fileBuffer);
    
    const canonicalRequest = [
      'PUT',
      `/${R2_BUCKET_NAME}/${path}`,
      '',
      `content-type:${contentType}`,
      `host:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
      '',
      'content-type;host;x-amz-content-sha256;x-amz-date',
      payloadHash
    ].join('\n');
    
    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest)
    ].join('\n');
    
    const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, 'auto', 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

    // Upload to R2
    const uploadResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
        'Host': `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('R2 upload failed:', uploadResponse.status, errorText);
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const publicUrl = `${R2_PUBLIC_URL}/${path}`;

    console.log('✅ Upload successful:', publicUrl);

    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      key: path,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ R2 upload error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

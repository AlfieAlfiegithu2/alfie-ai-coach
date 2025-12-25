import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac, createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-r2-path, x-r2-cache-control',
};

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
let R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID') || Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY') || Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

// Debug: Log all available env vars that start with CLOUDFLARE
const allEnvVars = Deno.env.toObject();
const cloudflareVars = Object.keys(allEnvVars).filter(k => k.includes('CLOUDFLARE'));
console.log('🔍 Available CLOUDFLARE env vars:', cloudflareVars);
console.log('🔍 Environment variable lengths:', {
  accountId: R2_ACCOUNT_ID?.length || 0,
  accessKeyId: R2_ACCESS_KEY_ID?.length || 0,
  secretKey: R2_SECRET_ACCESS_KEY?.length || 0,
  accountIdValue: R2_ACCOUNT_ID ? `${R2_ACCOUNT_ID.slice(0, 8)}...${R2_ACCOUNT_ID.slice(-8)}` : 'missing',
  accessKeyIdValue: R2_ACCESS_KEY_ID ? `${R2_ACCESS_KEY_ID.slice(0, 8)}...${R2_ACCESS_KEY_ID.slice(-8)}` : 'missing',
});

// Fix Access Key ID if it's 64 characters - Cloudflare R2 Access Key IDs must be exactly 32 characters
// Try both first 32 and last 32 characters to see which works
if (R2_ACCESS_KEY_ID && R2_ACCESS_KEY_ID.length === 64) {
  console.warn(`⚠️ Access Key ID is 64 characters. Cloudflare requires 32 characters.`);
  console.warn(`   Trying first 32 characters: ${R2_ACCESS_KEY_ID.slice(0, 32)}...`);
  // Try first 32 characters first (most common case)
  R2_ACCESS_KEY_ID = R2_ACCESS_KEY_ID.slice(0, 32);
}

// Validate Access Key ID format - Cloudflare R2 Access Key IDs must be exactly 32 characters
// Validation moved inside serve handler to prevent boot crashes
// if (R2_ACCESS_KEY_ID && R2_ACCESS_KEY_ID.length !== 32) { ... }

// Get bucket name - if it looks like a hash (64 hex chars), use default instead
let R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET') || Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
if (!R2_BUCKET_NAME || /^[a-f0-9]{64}$/i.test(R2_BUCKET_NAME)) {
  // If bucket name is missing or looks like a hash, use default
  R2_BUCKET_NAME = 'alfie-ai-audio';
  console.log('⚠️ Using default bucket name: alfie-ai-audio');
}

const R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing Cloudflare R2 configuration', {
    hasAccountId: !!R2_ACCOUNT_ID,
    hasAccessKeyId: !!R2_ACCESS_KEY_ID,
    hasSecret: !!R2_SECRET_ACCESS_KEY,
  });
}

// Validate Account ID format (should be 32+ hex chars) - Cloudflare account IDs can be 32 or 64 hex characters
if (R2_ACCOUNT_ID && !/^[a-f0-9]{32,64}$/i.test(R2_ACCOUNT_ID)) {
  console.warn(`⚠️ CLOUDFLARE_ACCOUNT_ID format may be invalid: "${R2_ACCOUNT_ID.slice(0, 8)}..." (expected 32-64 hex characters, but proceeding anyway)`);
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
  const hash = createHash('sha256');
  hash.update(typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data));
  return hash.digest('hex');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Access Key ID format - Cloudflare R2 Access Key IDs must be exactly 32 characters
    if (R2_ACCESS_KEY_ID && R2_ACCESS_KEY_ID.length !== 32) {
      console.error(`❌ Invalid CLOUDFLARE_ACCESS_KEY_ID length: ${R2_ACCESS_KEY_ID.length} characters (expected 32)`);
      throw new Error(`Invalid CLOUDFLARE_ACCESS_KEY_ID: length is ${R2_ACCESS_KEY_ID.length}, must be exactly 32 characters. Please check your Cloudflare R2 API token Access Key ID.`);
    }
    const urlObj = new URL(req.url);

    // Diagnostic mode: quick signed GET to list 1 object from the bucket
    if (req.method === 'GET' && urlObj.searchParams.get('diagnose') === '1') {
      console.log('🔍 Diagnostic - Environment check:', {
        accountIdLength: R2_ACCOUNT_ID?.length || 0,
        accessKeyIdLength: R2_ACCESS_KEY_ID?.length || 0,
        secretKeyLength: R2_SECRET_ACCESS_KEY?.length || 0,
        bucket: R2_BUCKET_NAME,
      });

      if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: 'missing_config',
            details: {
              hasAccountId: !!R2_ACCOUNT_ID,
              hasAccessKeyId: !!R2_ACCESS_KEY_ID,
              hasSecret: !!R2_SECRET_ACCESS_KEY,
              bucket: R2_BUCKET_NAME,
              accountIdLength: R2_ACCOUNT_ID?.length || 0,
              accessKeyIdLength: R2_ACCESS_KEY_ID?.length || 0,
              secretKeyLength: R2_SECRET_ACCESS_KEY?.length || 0,
              accountIdLooksValid: !!R2_ACCOUNT_ID && /^[a-f0-9]{32}$/i.test(R2_ACCOUNT_ID),
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const canonicalPath = `/${R2_BUCKET_NAME}/`;
      const canonicalQueryString = 'list-type=2&max-keys=1';
      const listUrl = `${endpoint}${canonicalPath}?${canonicalQueryString}`;

      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.slice(0, 8);
      const payloadHash = 'UNSIGNED-PAYLOAD';

      const diagnosticCanonicalRequest = [
        'GET',
        canonicalPath,
        canonicalQueryString,
        `host:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        `x-amz-content-sha256:${payloadHash}`,
        `x-amz-date:${amzDate}`,
        '',
        'host;x-amz-content-sha256;x-amz-date',
        payloadHash,
      ].join('\n');

      const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
      const diagnosticStringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256(diagnosticCanonicalRequest),
      ].join('\n');

      const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, 'auto', 's3');
      const signature = createHmac('sha256', signingKey).update(diagnosticStringToSign).digest('hex');
      const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

      const diagResp = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'x-amz-content-sha256': payloadHash,
          'x-amz-date': amzDate,
          'Authorization': authorizationHeader,
        },
      });

      const diagText = await diagResp.text();
      const r2Code = diagText.match(/<Code>([\s\S]*?)<\/Code>/)?.[1] || null;
      const r2StringToSign = diagText.match(/<StringToSign>([\s\S]*?)<\/StringToSign>/)?.[1] || null;

      return new Response(
        JSON.stringify({
          ok: diagResp.ok,
          status: diagResp.status,
          r2_code: r2Code,
          endpoint,
          bucket: R2_BUCKET_NAME,
          account_id_valid: !!R2_ACCOUNT_ID && /^[a-f0-9]{32}$/i.test(R2_ACCOUNT_ID),
          access_key_id_masked: R2_ACCESS_KEY_ID ? `${R2_ACCESS_KEY_ID.slice(0, 4)}...${R2_ACCESS_KEY_ID.slice(-4)}` : null,
          public_url: R2_PUBLIC_URL || null,
          our_string_to_sign: diagnosticStringToSign,
          r2_string_to_sign: r2StringToSign,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      const missingVars = [];
      if (!R2_ACCOUNT_ID) missingVars.push('CLOUDFLARE_ACCOUNT_ID');
      if (!R2_ACCESS_KEY_ID) missingVars.push('CLOUDFLARE_ACCESS_KEY_ID or CLOUDFLARE_R2_ACCESS_KEY_ID');
      if (!R2_SECRET_ACCESS_KEY) missingVars.push('CLOUDFLARE_SECRET_ACCESS_KEY or CLOUDFLARE_R2_SECRET_ACCESS_KEY');

      throw new Error(`Missing Cloudflare R2 configuration. Please set these environment variables in Supabase Edge Function secrets: ${missingVars.join(', ')}`);
    }

    // Check if account ID is the placeholder value
    if (R2_ACCOUNT_ID === 'replace_with_32_char_account_id') {
      throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured. Please set it in Supabase Edge Function secrets. You can find your Account ID in Cloudflare Dashboard > R2 > Overview.');
    }

    // Warn if account ID format looks invalid but don't block (Cloudflare account IDs can be 32 or 64 hex characters)
    if (R2_ACCOUNT_ID && !/^[a-f0-9]{32,64}$/i.test(R2_ACCOUNT_ID)) {
      console.warn(`⚠️ CLOUDFLARE_ACCOUNT_ID format may be invalid: "${R2_ACCOUNT_ID.slice(0, 8)}..." (expected 32-64 hex characters, but proceeding anyway)`);
      // Don't throw - allow upload to proceed as Cloudflare might accept various formats
    }

    // Check for streaming upload (raw body)
    if (urlObj.searchParams.get('action') === 'stream') {
      const path = req.headers.get('x-r2-path');
      const contentType = req.headers.get('content-type') || 'application/octet-stream';
      const cacheControl = req.headers.get('x-r2-cache-control') || 'public, max-age=31536000';

      if (!path) {
        throw new Error('Missing x-r2-path header');
      }

      console.log('🌊 Streaming upload to R2:', { path, contentType });

      const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const canonicalPath = `/${R2_BUCKET_NAME}/${path.split('/').map(encodeURIComponent).join('/')}`;
      const r2Url = `${endpoint}${canonicalPath}`;

      // Create signature
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.slice(0, 8);
      const payloadHash = 'UNSIGNED-PAYLOAD';

      const canonicalRequest = [
        'PUT',
        canonicalPath,
        '',
        `host:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
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
        sha256(canonicalRequest)
      ].join('\n');

      const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, 'auto', 's3');
      const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

      const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

      // Stream the request body directly to R2
      const uploadResponse = await fetch(r2Url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
          'x-amz-content-sha256': payloadHash,
          'x-amz-date': amzDate,
          'Authorization': authorizationHeader,
        },
        body: req.body, // Pipe the stream
        duplex: 'half', // Required for streaming bodies in some fetch implementations
      } as any);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ R2 streaming upload failed:', uploadResponse.status, errorText);
        throw new Error(`Streaming upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
      }

      // Calculate public URL
      let publicUrl: string;
      if (R2_PUBLIC_URL && !R2_PUBLIC_URL.includes('REPLACE') && !R2_PUBLIC_URL.includes('replace_with')) {
        if (R2_PUBLIC_URL.includes('.r2.dev')) {
          publicUrl = `${R2_PUBLIC_URL}/${path}`;
        } else if (R2_PUBLIC_URL.includes('cloudflarestorage.com')) {
          const base = R2_PUBLIC_URL.endsWith(`/${R2_BUCKET_NAME}`)
            ? R2_PUBLIC_URL
            : `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}`;
          publicUrl = `${base}/${path}`;
        } else {
          publicUrl = `${R2_PUBLIC_URL}/${path}`;
        }
      } else {
        publicUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${path}`;
      }

      console.log("🔗 Generated Public URL:", publicUrl);
      if (publicUrl.includes("replace_with") || publicUrl.includes("REPLACE")) {
        console.warn("⚠️ Warning: Public URL contains placeholder text. Please check CLOUDFLARE_R2_PUBLIC_URL or CLOUDFLARE_ACCOUNT_ID secrets.");
      }

      console.log('✅ Streaming upload successful:', publicUrl);

      return new Response(JSON.stringify({
        success: true,
        url: publicUrl,
        key: path,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this is a JSON request for a presigned URL
    const contentTypeHeader = req.headers.get('content-type') || '';
    if (contentTypeHeader.includes('application/json')) {
      const { operation, path, contentType } = await req.json();

      if (operation === 'configure_cors') {
        console.log('🔧 Configuring CORS for bucket:', R2_BUCKET_NAME);

        const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
        const canonicalPath = `/${R2_BUCKET_NAME}`;
        const canonicalQueryString = 'cors=';

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.slice(0, 8);

        const corsConfig = `
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`.trim();

        const payloadHash = sha256(corsConfig);

        const canonicalRequest = [
          'PUT',
          canonicalPath,
          canonicalQueryString,
          `host:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
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
          sha256(canonicalRequest)
        ].join('\n');

        const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, 'auto', 's3');
        const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

        const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

        const corsUrl = `${endpoint}${canonicalPath}?${canonicalQueryString}`;

        const corsResponse = await fetch(corsUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/xml',
            'x-amz-content-sha256': payloadHash,
            'x-amz-date': amzDate,
            'Authorization': authorizationHeader,
          },
          body: corsConfig
        });

        if (!corsResponse.ok) {
          const errorText = await corsResponse.text();
          console.error('❌ Failed to configure CORS:', corsResponse.status, errorText);
          throw new Error(`Failed to configure CORS: ${corsResponse.status} - ${errorText}`);
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'CORS configuration updated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (operation === 'presign') {
        if (!path) throw new Error('Missing path');

        console.log('🔑 Generating presigned URL for:', path);

        const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
        const canonicalPath = `/${R2_BUCKET_NAME}/${path.split('/').map(encodeURIComponent).join('/')}`;

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.slice(0, 8);
        const expires = 3600; // 1 hour

        const credentialScope = `${dateStamp}/auto/s3/aws4_request`;

        const queryParams = new URLSearchParams({
          'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
          'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${credentialScope}`,
          'X-Amz-Date': amzDate,
          'X-Amz-Expires': expires.toString(),
          'X-Amz-SignedHeaders': 'host',
        });

        // Canonical Request
        const canonicalRequest = [
          'PUT',
          canonicalPath,
          queryParams.toString(),
          `host:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          '',
          'host',
          'UNSIGNED-PAYLOAD'
        ].join('\n');

        const stringToSign = [
          'AWS4-HMAC-SHA256',
          amzDate,
          credentialScope,
          sha256(canonicalRequest)
        ].join('\n');

        const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, 'auto', 's3');
        const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

        queryParams.append('X-Amz-Signature', signature);

        const uploadUrl = `${endpoint}${canonicalPath}?${queryParams.toString()}`;

        // Calculate public URL
        let publicUrl: string;
        if (R2_PUBLIC_URL && !R2_PUBLIC_URL.includes('REPLACE') && !R2_PUBLIC_URL.includes('replace_with')) {
          if (R2_PUBLIC_URL.includes('.r2.dev')) {
            publicUrl = `${R2_PUBLIC_URL}/${path}`;
          } else if (R2_PUBLIC_URL.includes('cloudflarestorage.com')) {
            const base = R2_PUBLIC_URL.endsWith(`/${R2_BUCKET_NAME}`)
              ? R2_PUBLIC_URL
              : `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}`;
            publicUrl = `${base}/${path}`;
          } else {
            publicUrl = `${R2_PUBLIC_URL}/${path}`;
          }
        } else {
          publicUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${path}`;
        }

        return new Response(JSON.stringify({
          success: true,
          uploadUrl,
          publicUrl,
          key: path
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    const contentType = formData.get('contentType') as string || file.type;
    const cacheControl = formData.get('cacheControl') as string || 'public, max-age=31536000';

    if (!file || !path) {
      throw new Error('Missing file or path');
    }

    console.log('📤 Uploading to R2 (Legacy Mode):', { path, size: file.size, type: contentType });

    // Prepare the upload
    const fileBuffer = await file.arrayBuffer();
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const canonicalPath = `/${R2_BUCKET_NAME}/${path.split('/').map(encodeURIComponent).join('/')}`;
    const url = `${endpoint}${canonicalPath}`;

    // Create signature
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      'PUT',
      canonicalPath,
      '',
      `host:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
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
      sha256(canonicalRequest)
    ].join('\n');

    const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, 'auto', 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

    // Upload to R2
    const uploadResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('R2 upload failed:', uploadResponse.status, errorText);

      // Provide helpful error message for 401 Unauthorized
      if (uploadResponse.status === 401) {
        const helpfulError = `Upload failed: 401 Unauthorized. This usually means the Access Key ID or Secret Access Key is incorrect. 
        
Please verify your Cloudflare R2 credentials:
1. Go to Cloudflare Dashboard > R2 > Manage R2 API Tokens
2. Create a new token or view existing token
3. Copy the Access Key ID (should be exactly 32 characters)
4. Copy the Secret Access Key (should be 64 characters)
5. Update Supabase secrets:
   - CLOUDFLARE_R2_ACCESS_KEY_ID = <32-char Access Key ID>
   - CLOUDFLARE_R2_SECRET_ACCESS_KEY = <64-char Secret Access Key>

Current Access Key ID length: ${R2_ACCESS_KEY_ID?.length || 'unknown'}
Current Secret Access Key length: ${R2_SECRET_ACCESS_KEY?.length || 'unknown'}

Original error: ${errorText}`;
        throw new Error(helpfulError);
      }

      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
    }

    let publicUrl: string;
    // Check if R2_PUBLIC_URL is set and doesn't contain placeholder text
    if (R2_PUBLIC_URL && !R2_PUBLIC_URL.includes('REPLACE') && !R2_PUBLIC_URL.includes('replace_with')) {
      if (R2_PUBLIC_URL.includes('.r2.dev')) {
        // Expecting format: https://<bucket>.<account_id>.r2.dev or https://pub-<hash>.r2.dev
        publicUrl = `${R2_PUBLIC_URL}/${path}`;
      } else if (R2_PUBLIC_URL.includes('cloudflarestorage.com')) {
        // Expecting format: https://<account_id>.r2.cloudflarestorage.com[/<bucket>]
        const base = R2_PUBLIC_URL.endsWith(`/${R2_BUCKET_NAME}`)
          ? R2_PUBLIC_URL
          : `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}`;
        publicUrl = `${base}/${path}`;
      } else {
        // Custom domain or other format
        publicUrl = `${R2_PUBLIC_URL}/${path}`;
      }
    } else {
      // Fallback to public r2.dev domain using actual account ID
      publicUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${path}`;
    }

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

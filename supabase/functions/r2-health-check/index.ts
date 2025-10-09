import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, ListBucketsCommand, HeadBucketCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const CLOUDFLARE_R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

    const results = {
      env_vars: {
        CLOUDFLARE_ACCOUNT_ID: !!CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_R2_ACCESS_KEY_ID: !!CLOUDFLARE_R2_ACCESS_KEY_ID,
        CLOUDFLARE_R2_SECRET_ACCESS_KEY: !!CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        CLOUDFLARE_R2_BUCKET_NAME: !!CLOUDFLARE_R2_BUCKET_NAME,
        CLOUDFLARE_R2_PUBLIC_URL: !!CLOUDFLARE_R2_PUBLIC_URL,
      },
      values: {
        CLOUDFLARE_ACCOUNT_ID: CLOUDFLARE_ACCOUNT_ID ? CLOUDFLARE_ACCOUNT_ID.substring(0, 8) + '...' : 'MISSING',
        CLOUDFLARE_R2_BUCKET_NAME: CLOUDFLARE_R2_BUCKET_NAME || 'MISSING',
        CLOUDFLARE_R2_PUBLIC_URL: CLOUDFLARE_R2_PUBLIC_URL || 'MISSING',
      },
      tests: {
        connection: false,
        bucket_exists: false,
        bucket_accessible: false,
      }
    };

    // Check if all required env vars are present
    const missingVars = Object.entries(results.env_vars).filter(([_, exists]) => !exists);
    if (missingVars.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing environment variables: ${missingVars.map(([name]) => name).join(', ')}`,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize R2 client
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    try {
      // Test connection by listing buckets
      const listCommand = new ListBucketsCommand({});
      const listResponse = await r2Client.send(listCommand);
      results.tests.connection = true;
      results.tests.bucket_exists = listResponse.Buckets?.some(bucket => bucket.Name === CLOUDFLARE_R2_BUCKET_NAME) || false;

      // Test bucket accessibility
      if (results.tests.bucket_exists) {
        const headCommand = new HeadBucketCommand({ Bucket: CLOUDFLARE_R2_BUCKET_NAME });
        await r2Client.send(headCommand);
        results.tests.bucket_accessible = true;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'R2 configuration is working correctly!',
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `R2 connection failed: ${error.message}`,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

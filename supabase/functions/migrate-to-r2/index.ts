import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.454.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET') || 'alfie-ai-audio';
const R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing Cloudflare R2 configuration');
}

// Initialize S3 client for R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { bucketName, dryRun = false } = await req.json();

    if (!bucketName) {
      throw new Error('Missing bucketName');
    }

    console.log(`🔄 Starting migration from ${bucketName} to R2${dryRun ? ' (DRY RUN)' : ''}`);

    // List all files in the Supabase bucket
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No files to migrate',
        migrated: 0,
        errors: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📁 Found ${files.length} files to migrate`);

    let migrated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const file of files) {
      try {
        console.log(`📤 Migrating: ${file.name}`);

        if (dryRun) {
          console.log(`✅ [DRY RUN] Would migrate: ${file.name}`);
          migrated++;
          continue;
        }

        // Download file from Supabase
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(file.name);

        if (downloadError) {
          throw new Error(`Download failed: ${downloadError.message}`);
        }

        // Upload to R2
        const command = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: `${bucketName}/${file.name}`,
          Body: await fileData.arrayBuffer(),
          ContentType: file.metadata?.mimetype || 'application/octet-stream',
          CacheControl: 'public, max-age=31536000',
        });

        await r2Client.send(command);

        console.log(`✅ Migrated: ${file.name}`);
        migrated++;

      } catch (error) {
        console.error(`❌ Failed to migrate ${file.name}:`, error);
        errors++;
        errorDetails.push(`${file.name}: ${error.message}`);
      }
    }

    console.log(`🎉 Migration complete: ${migrated} migrated, ${errors} errors`);

    return new Response(JSON.stringify({
      success: true,
      message: `Migration complete: ${migrated} migrated, ${errors} errors`,
      migrated,
      errors,
      errorDetails: errorDetails.slice(0, 10) // Limit error details
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

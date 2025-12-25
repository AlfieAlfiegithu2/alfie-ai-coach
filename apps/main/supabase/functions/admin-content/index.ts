// supabase/functions/admin-content/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Restrict CORS to allowed origins only
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3009',
  'http://localhost:8080',
  'https://alfie-ai-coach.vercel.app',
  'https://alfie.app',
  'https://www.alfie.app'
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Validate admin session token
async function validateAdminSession(supabaseAdmin: any, sessionToken: string): Promise<boolean> {
  if (!sessionToken) return false;

  try {
    const { data, error } = await supabaseAdmin.rpc('validate_admin_session', {
      session_token: sessionToken
    });

    if (error || !data || data.length === 0) {
      console.log('Session validation failed:', error?.message || 'No valid session');
      return false;
    }

    return true;
  } catch (e) {
    console.error('Session validation error:', e);
    return false;
  }
}

// Log admin actions for audit trail
async function logAdminAction(supabaseAdmin: any, adminId: string, action: string, details: any) {
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: adminId,
      action,
      details: JSON.stringify(details),
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to log admin action:', e);
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();

    // Get session token from request body or authorization header
    const sessionToken = requestBody.sessionToken ||
      req.headers.get('x-admin-session') ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      console.error('No session token provided');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate the session token
    const isValidSession = await validateAdminSession(supabaseAdmin, sessionToken);

    if (!isValidSession) {
      console.error('Invalid or expired session token');
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Admin session validated successfully');
    console.log('Received request:', requestBody.action || 'content operation');

    // Handle different action types
    if (requestBody.action) {
      const { action, type, id, data, payload } = requestBody;

      // Log the action for audit
      await logAdminAction(supabaseAdmin, 'admin', action, { type, id });

      switch (action) {
        case 'delete':
          if (type === 'questions' && id) {
            console.log('Deleting question with ID:', id);
            const { error } = await supabaseAdmin
              .from('questions')
              .delete()
              .eq('id', id);

            if (error) {
              console.error('Delete error:', error);
              throw new Error(`Delete failed: ${error.message}`);
            }

            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
          break;

        case 'update':
          if (type === 'questions' && id && data) {
            console.log('Updating question with ID:', id, 'Data:', data);
            const { error } = await supabaseAdmin
              .from('questions')
              .update({
                question_number_in_part: data.question_number_in_part,
                question_text: data.question_text,
                question_type: data.question_type,
                choices: data.choices,
                correct_answer: data.correct_answer,
                explanation: data.explanation
              })
              .eq('id', id);

            if (error) {
              console.error('Update error:', error);
              throw new Error(`Update failed: ${error.message}`);
            }

            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
          break;

        case 'upload_questions':
          if (payload && Array.isArray(payload)) {
            console.log('Uploading questions via action payload:', payload.length);

            const questionsToInsert = payload.map((q: any) => ({
              test_id: q.test_id,
              part_number: q.part_number || 1,
              question_number_in_part: q.question_number_in_part || 1,
              question_text: q.question_text || '',
              question_type: q.question_type || 'multiple_choice',
              choices: q.choices || '',
              correct_answer: q.correct_answer || '',
              explanation: q.explanation || '',
              passage_text: q.passage_text || null,
            }));

            const { data, error } = await supabaseAdmin
              .from('questions')
              .insert(questionsToInsert)
              .select();

            if (error) {
              console.error('Database insert error:', error);
              throw new Error(`Insert failed: ${error.message}`);
            }

            return new Response(JSON.stringify({ success: true, data }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
          break;
      }
    }

    // Legacy support for different request formats
    let action, payload;

    if (requestBody.questions) {
      // Old CSV upload format from AdminReadingManagement
      action = 'upload_questions';
      payload = requestBody.questions;
    } else if (requestBody.type && requestBody.data) {
      // Legacy useAdminContent format 
      action = requestBody.type === 'tests' ? 'create_test' : 'upload_questions';
      payload = requestBody.data;
    } else {
      // Single question format for manual adding
      action = 'upload_questions';
      payload = Array.isArray(requestBody) ? requestBody : [requestBody];
    }

    let data, error;

    switch (action) {
      case 'create_test':
        ({ data, error } = await supabaseAdmin
          .from('tests')
          .insert(payload)
          .select()
          .single());
        break;

      case 'upload_questions':
        ({ data, error } = await supabaseAdmin
          .from('questions')
          .insert(payload)
          .select());
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Database Error: ${error.message}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function critical error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' },
    });
  }
});
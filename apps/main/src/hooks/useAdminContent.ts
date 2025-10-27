// src/hooks/useAdminContent.ts
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNewTest = async (testType: string, module: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Creating new test:', { testType, module });

      // First, get the count of existing tests to determine the next test number
      // Count tests by test_type only (not by module) to get generic test numbers
      const { count, error: countError } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true })
        .eq('test_type', testType);

      if (countError) {
        console.error('Error counting tests:', countError);
        throw countError;
      }

      const newTestNumber = (count || 0) + 1;
      // Create generic test names like "IELTS Test 1", "IELTS Test 2", etc.
      const testName = `${testType.toUpperCase()} Test ${newTestNumber}`;

      console.log('Inserting new test:', { testName, testType, module });

      // Insert the new test
      const { data, error: insertError } = await supabase
        .from('tests')
        .insert({
          test_name: testName,
          test_type: testType,
          module: module,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting test:', insertError);
        throw insertError;
      }

      console.log('Test created successfully:', data);
      setLoading(false);
      return data;
    } catch (err: any) {
      console.error('Error creating new test:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  const createContent = async (type: string, data: any) => {
    setLoading(true);
    try {
      console.log('Creating content:', type, data);
      
      // For tests specifically, use direct Supabase insert
      if (type === 'tests') {
        const { data: result, error } = await supabase
          .from('tests')
          .insert(data)
          .select()
          .single();

        if (error) {
          console.error('Supabase insert error:', error);
          throw new Error(`Database Error: ${error.message}`);
        }
        
        console.log('Content created successfully:', result);
        return { data: result };
      }

      // For CSV uploads, use the Edge Function
      if (type === 'csv_upload') {
        const { data: result, error } = await supabase.functions.invoke('admin-content', {
          body: { 
            questions: data.questions,
            adminKeypass: 'myye65402086'
          },
        });

        if (error) {
          console.error('CSV upload error:', error);
          throw error;
        }
        
        return { success: true, data: result };
      }

      // For other types, use the Edge Function (for backward compatibility)
      const { data: result, error } = await supabase.functions.invoke('admin-content', {
        body: { 
          action: 'create', 
          type, 
          data,
          adminKeypass: 'myye65402086'
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      return result;
    } catch (error: any) {
      console.error('Create content error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateContent = async (type: string, data: any) => {
    setLoading(true);
    try {
      console.log('Updating content:', type, data);
      
      // For backward compatibility with existing components
      const { data: result, error } = await supabase.functions.invoke('admin-content', {
        body: { 
          action: 'update', 
          type, 
          data,
          adminKeypass: 'myye65402086'
        },
      });

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      
      return result;
    } catch (error: any) {
      console.error('Update content error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteContent = async (type: string, id: string) => {
    setLoading(true);
    try {
      console.log('Deleting content:', type, id);
      
      // For backward compatibility with existing components
      const { data: result, error } = await supabase.functions.invoke('admin-content', {
        body: { 
          action: 'delete', 
          type, 
          data: { id },
          adminKeypass: 'myye65402086'
        },
      });

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      return result;
    } catch (error: any) {
      console.error('Delete content error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const listContent = async (type: string) => {
    setLoading(true);
    try {
      console.log('Listing content for type:', type);
      
      if (type === 'tests') {
        const { data: result, error } = await supabase
          .from('tests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase select error:', error);
          throw new Error(`Database Error: ${error.message}`);
        }
        
        console.log(`Found ${result?.length || 0} ${type} records`);
        return { data: result };
      }

      if (type === 'questions') {
        const { data: result, error } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase select error:', error);
          throw new Error(`Database Error: ${error.message}`);
        }
        
        console.log(`Found ${result?.length || 0} ${type} records`);
        return { data: result };
      }

      // For other types, use the Edge Function for backward compatibility
      const { data: result, error } = await supabase.functions.invoke('admin-content', {
        body: { 
          action: 'list', 
          type,
          adminKeypass: 'myye65402086'
        },
      });

      if (error) {
        console.error('List content error:', error);
        throw error;
      }
      
      return result;
    } catch (error: any) {
      console.error('List content error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadAudio = async (file: File) => {
    setLoading(true);
    try {
      const originalName = file.name || 'audio.wav';
      const ext = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : 'wav';
      const base = originalName.replace(/\.[^/.]+$/, '');
      const safeBase = base
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/[^a-zA-Z0-9_-]+/g, '-') // replace spaces & specials with '-'
        .replace(/-+/g, '-') // collapse dashes
        .replace(/^-|-$/g, '') // trim dashes
        .toLowerCase();
      const fileName = `${Date.now()}-${safeBase}.${ext}`;
      const path = `admin/speaking/${fileName}`;
      
      console.log('📤 Uploading audio to R2:', { originalName, fileName, size: file.size, type: file.type });
      
      // Create FormData for R2 upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      formData.append('contentType', file.type || 'audio/mpeg');
      formData.append('cacheControl', 'public, max-age=31536000');

      // Use API key for authentication (admin is not Supabase-authenticated)
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const functionUrl = `https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1/r2-upload`;

      // Upload to R2 via edge function using fetch (supabase.functions.invoke doesn't support FormData)
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ R2 upload error:', response.status, errorText);
        throw new Error(`Upload failed ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data || !data.success) {
        throw new Error(data?.error || 'Upload failed');
      }

      console.log('✅ Audio uploaded successfully:', data.url);
      return { success: true, url: data.url };
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createNewTest,
    createContent,
    updateContent,
    deleteContent,
    listContent,
    uploadAudio
  };
}
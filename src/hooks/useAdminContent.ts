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
      const { count, error: countError } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true })
        .eq('test_type', testType)
        .eq('module', module);

      if (countError) {
        console.error('Error counting tests:', countError);
        throw countError;
      }

      const newTestNumber = (count || 0) + 1;
      const testName = `${testType.toUpperCase()} ${module.charAt(0).toUpperCase() + module.slice(1)} Test ${newTestNumber}`;

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

  const createContent = async (type: 'tests', data: any) => {
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

      // For other types, throw error as they should use specific functions
      throw new Error(`Unsupported content type: ${type}`);
    } catch (error: any) {
      console.error('Create content error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const listContent = async (type: 'tests' | 'questions') => {
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

      throw new Error(`Unsupported content type: ${type}`);
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
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      return { success: true, url: publicData.publicUrl };
    } catch (error: any) {
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
    listContent,
    uploadAudio
  };
}
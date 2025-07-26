import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminContent() {
  const [loading, setLoading] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.warn('No admin token found');
      return '';
    }
    return `Bearer ${token}`;
  };

  const createContent = async (type: string, data: any) => {
    setLoading(true);
    try {
      const authHeader = getAuthHeader();
      if (!authHeader) {
        throw new Error('Authentication required. Please login again.');
      }

      const { data: result, error } = await supabase.functions.invoke('admin-content', {
        body: { action: 'create', type, data },
        headers: { authorization: authHeader }
      });

      if (error) {
        console.error('Admin content creation error:', error);
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
      const authHeader = getAuthHeader();
      if (!authHeader) {
        throw new Error('Authentication required. Please login again.');
      }

      const { data: result, error } = await supabase.functions.invoke('admin-content', {
        body: { action: 'update', type, data },
        headers: { authorization: authHeader }
      });

      if (error) {
        console.error('Admin content update error:', error);
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
      const { data: result, error } = await supabase.functions.invoke('admin-content', {
        body: { action: 'delete', type, data: { id } },
        headers: { authorization: getAuthHeader() }
      });

      if (error) throw error;
      return result;
    } finally {
      setLoading(false);
    }
  };

  const listContent = async (type: string) => {
    setLoading(true);
    try {
      const authHeader = getAuthHeader();
      if (!authHeader) {
        throw new Error('Authentication required. Please login again.');
      }

      const { data: result, error } = await supabase.functions.invoke('admin-content', {
        body: { action: 'list', type },
        headers: { authorization: authHeader }
      });

      if (error) {
        console.error('Admin content list error:', error);
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
    createContent,
    updateContent,
    deleteContent,
    listContent,
    uploadAudio
  };
}
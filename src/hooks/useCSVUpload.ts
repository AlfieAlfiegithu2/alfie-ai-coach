import { useState } from 'react';
import { useAdminContent } from '@/hooks/useAdminContent';
import { toast } from 'sonner';

export function useCSVUpload() {
  const [uploading, setUploading] = useState(false);
  const { createContent } = useAdminContent();

  const uploadCSV = async (csvData: any[], testId: string, testType: string, partNumber: number) => {
    setUploading(true);
    try {
      const result = await createContent('csv_upload', {
        csvData,
        testId,
        testType,
        partNumber
      });

      if (result.success) {
        toast.success(`Successfully uploaded ${csvData.length} questions for Part ${partNumber}`);
        return { success: true, data: result.data };
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('CSV upload error:', error);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    uploadCSV
  };
}
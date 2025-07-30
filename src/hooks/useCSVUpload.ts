import { useState } from 'react';
import { useAdminContent } from '@/hooks/useAdminContent';
import { toast } from 'sonner';

export function useCSVUpload() {
  const [uploading, setUploading] = useState(false);
  const { createContent } = useAdminContent();

  const uploadCSV = async (csvData: any[], testId: string, testType: string, partNumber: number, module?: string) => {
    setUploading(true);
    try {
      const result = await createContent('csv_upload', {
        csvData,
        testId,
        testType,
        partNumber,
        module
      });

      if (result.success) {
        toast.success(`Successfully uploaded ${csvData.length} questions for Part ${partNumber}`);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('CSV upload error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      toast.error(`Upload failed: ${errorMessage}`);
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
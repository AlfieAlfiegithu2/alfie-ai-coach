import { useState } from 'react';
import { useAdminContent } from '@/hooks/useAdminContent';
import { toast } from 'sonner';

export function useCSVUpload() {
  const [uploading, setUploading] = useState(false);
  const { createContent } = useAdminContent();

  const uploadCSV = async (csvData: any[], testId: string, testType: string, partNumber: number, module?: string) => {
    setUploading(true);
    try {
      console.log('useCSVUpload: Starting upload with data:', { testId, testType, partNumber, module, questionCount: csvData.length });
      
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
        console.error('Upload result error:', result);
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('CSV upload error:', error);
      
      // Extract detailed error message from backend response
      let errorMessage = 'Unknown error occurred';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      // Handle structured error responses from the backend
      if (error?.response?.data) {
        const backendError = error.response.data;
        if (backendError.error) {
          errorMessage = backendError.error;
          if (backendError.details) {
            errorMessage += ` Details: ${backendError.details}`;
          }
        }
      }
      
      toast.error(`Upload failed: ${errorMessage}`);
      
      // Re-throw with the detailed message for the component to catch
      const detailedError = new Error(errorMessage) as any;
      detailedError.response = error.response; // Preserve original response if it exists
      throw detailedError;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    uploadCSV
  };
}
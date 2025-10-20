import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import LoadingAnimation from '@/components/animations/LoadingAnimation';

const SentenceMastery = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session from the auth hook
    const sessionData = sessionStorage.getItem('sentence_mastery_auth');
    
    if (sessionData) {
      try {
        const context = JSON.parse(sessionData);
        if (context?.token && context?.userId) {
          // Redirect to the Sentence Mastery application
          // This will be proxied to the Earthworm app via Vite proxy (/earthworm -> localhost:5174)
          window.location.href = '/earthworm/';
          return;
        }
      } catch (error) {
        console.error('Error parsing session data:', error);
      }
    }

    // If no valid session, redirect back to dashboard
    navigate('/ielts-portal');
  }, [navigate]);

  return (
    <StudentLayout title="Sentence Mastery" showBackButton backPath="/ielts-portal">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingAnimation size="lg" message="Loading Sentence Mastery..." />
      </div>
    </StudentLayout>
  );
};

export default SentenceMastery;

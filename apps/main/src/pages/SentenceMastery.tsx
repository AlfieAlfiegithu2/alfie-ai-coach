import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SentenceMastery = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Directly redirect to the proxied Earthworm app
    // The /earthworm path is proxied to localhost:3000 (Earthworm dev server)
    window.location.href = '/earthworm/';
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Loading Sentence Mastery...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
};

export default SentenceMastery;

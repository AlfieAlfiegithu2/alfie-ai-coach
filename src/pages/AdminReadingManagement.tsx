// src/pages/AdminReadingManagement.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse'; // A robust CSV parsing library

// --- Helper Components (can be in the same file or imported) ---
const AdminHeader = ({ title }: { title: string }) => (
  <div className="mb-6">
    <h1 className="text-3xl font-bold text-white">{title}</h1>
    <p className="text-gray-400">Manage the content for this test part by part.</p>
  </div>
);

const PartUploader = ({ partNumber, testId }: { partNumber: number; testId: string }) => {
  const [passage, setPassage] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedQuestions = results.data.map((row: any) => ({
            question_number_in_part: parseInt(row['Question Number'], 10),
            question_text: row['Question Text'],
            question_type: row['Type'],
            choices: row['Choices'],
            correct_answer: row['Correct Answer'],
            explanation: row['Explanation'],
          }));
          setQuestions(parsedQuestions);
          setSuccess(false); // Reset success state on new file
        },
      });
    }
  };

  const handleSavePart = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    if (questions.length === 0) {
      setError('No questions to upload. Please select a valid CSV file.');
      setIsLoading(false);
      return;
    }

    const questionsWithData = questions.map(q => ({
      ...q,
      test_id: testId,
      part_number: partNumber,
      passage_text: q.question_number_in_part === 1 ? passage : null, // Add passage to first question
    }));

    try {
      const { data, error: functionError } = await supabase.functions.invoke('admin-content', {
        body: { questions: questionsWithData },
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      setSuccess(true);
    } catch (err: any) {
      console.error(`Error saving Part ${partNumber}:`, err);
      setError(`Upload Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1C2333] p-6 rounded-lg mb-4">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
        Part {partNumber}
        {success && <span className="ml-3 text-green-400 text-sm">(✓ Saved)</span>}
      </h2>
      <div className="space-y-4">
        <textarea
          placeholder="Paste the passage text for this part here..."
          className="w-full p-3 bg-[#0D1117] text-white rounded-md border border-gray-600"
          rows={8}
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Upload Questions CSV</label>
          <input
            type="file"
            accept=".csv"
            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#3B82F6] file:text-white hover:file:bg-[#2563EB]"
            onChange={handleFileUpload}
          />
          {questions.length > 0 && <p className="text-xs text-gray-400 mt-1">{questions.length} questions parsed.</p>}
        </div>
        <button
          onClick={handleSavePart}
          disabled={isLoading}
          className="w-full py-2 px-4 bg-[#3B82F6] text-white font-semibold rounded-lg hover:bg-[#2563EB] disabled:bg-gray-500"
        >
          {isLoading ? 'Saving...' : `Save Part ${partNumber}`}
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    </div>
  );
};


// --- Main Page Component ---
export default function AdminReadingManagement() {
  const { testId } = useParams<{ testId: string }>();
  const [testName, setTestName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTestDetails = async () => {
      if (testId) {
        const { data, error } = await supabase
          .from('tests')
          .select('test_name')
          .eq('id', testId)
          .single();
        if (error) {
          console.error('Error fetching test name:', error);
          navigate('/admin/ielts/reading'); // Redirect if test not found
        } else {
          setTestName(data.test_name);
        }
      }
    };
    fetchTestDetails();
  }, [testId, navigate]);


  if (!testId) return <p className="text-white">Loading or invalid test ID...</p>;

  return (
    <div className="p-8">
      <AdminHeader title={`Manage Test: ${testName}`} />
      <PartUploader partNumber={1} testId={testId} />
      <PartUploader partNumber={2} testId={testId} />
      <PartUploader partNumber={3} testId={testId} />
    </div>
  );
}
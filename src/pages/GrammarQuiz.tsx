import { useParams } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import VocabularyQuizPreview from "@/components/VocabularyQuizPreview";

const GrammarQuiz = () => {
  const { testId } = useParams();
  return (
    <StudentLayout title="Grammar Fix-it Quiz" showBackButton backPath="/ielts-portal">
      <section className="max-w-3xl mx-auto">
        {testId && <VocabularyQuizPreview skillTestId={testId} />}
      </section>
    </StudentLayout>
  );
};

export default GrammarQuiz;

import { useParams } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";

export default function VocabReview() {
  const { deckId } = useParams();

  return (
    <StudentLayout title="Review" showBackButton>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-sm text-muted-foreground">
              Review feature temporarily unavailable. Please check back later.
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}

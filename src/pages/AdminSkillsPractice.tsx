import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SKILLS } from "@/lib/skills";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const AdminSkillsPractice = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Skills Practice Management | Admin";
  }, []);

  return (
    <AdminLayout title="Skills Practice Management" showBackButton>
      <section className="space-y-4">
        <p className="text-muted-foreground">
          Add and manage practice questions across 8 targeted skill types. These will appear instantly in the student portal.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SKILLS.map((s) => (
            <Card
              key={s.slug}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/admin/skills/${s.slug}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{`Manage: ${s.label}`}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button size="sm" variant="secondary">Open Manager</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminSkillsPractice;

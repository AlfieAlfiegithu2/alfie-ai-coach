import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronRight, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DictationLevel {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
}

interface DictationTopic {
    id: string;
    level_id: string;
    title: string;
    slug: string;
    description: string;
    order_index: number;
    icon: string;
    sentence_count?: number;
    audio_count?: number;
}

const AdminDictationLevel = () => {
    const { levelSlug } = useParams<{ levelSlug: string }>();
    const [level, setLevel] = useState<DictationLevel | null>(null);
    const [topics, setTopics] = useState<DictationTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTopic, setEditingTopic] = useState<DictationTopic | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newTopic, setNewTopic] = useState({ title: "", description: "", icon: "📝" });
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        if (levelSlug) {
            loadData();
        }
    }, [levelSlug]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get level info
            const { data: levelData, error: levelError } = await supabase
                .from("dictation_levels")
                .select("*")
                .eq("slug", levelSlug)
                .single();

            if (levelError) throw levelError;
            setLevel(levelData);
            document.title = `${levelData.name} Topics | Admin`;

            // Get topics for this level
            const { data: topicsData, error: topicsError } = await supabase
                .from("dictation_topics")
                .select("*")
                .eq("level_id", levelData.id)
                .order("order_index");

            if (topicsError) throw topicsError;

            // Get sentence counts per topic
            const { data: sentencesData } = await supabase
                .from("dictation_sentences")
                .select("topic_id, audio_url_us, audio_url_uk");

            // Enrich topics with counts
            const enrichedTopics = (topicsData || []).map((topic) => {
                const topicSentences = sentencesData?.filter((s) => s.topic_id === topic.id) || [];
                return {
                    ...topic,
                    sentence_count: topicSentences.length,
                    audio_count: topicSentences.filter((s) => s.audio_url_us || s.audio_url_uk).length,
                };
            });

            setTopics(enrichedTopics);
        } catch (err) {
            console.error("Error loading data:", err);
            toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
    };

    const handleAddTopic = async () => {
        if (!level || !newTopic.title.trim()) return;

        try {
            const slug = generateSlug(newTopic.title);
            const orderIndex = topics.length + 1;

            const { error } = await supabase.from("dictation_topics").insert({
                level_id: level.id,
                title: newTopic.title.trim(),
                slug,
                description: newTopic.description.trim(),
                icon: newTopic.icon || "📝",
                order_index: orderIndex,
            });

            if (error) throw error;

            toast({ title: "Success", description: "Topic added successfully" });
            setIsAddDialogOpen(false);
            setNewTopic({ title: "", description: "", icon: "📝" });
            loadData();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to add topic";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        }
    };

    const handleUpdateTopic = async (topic: DictationTopic) => {
        try {
            const { error } = await supabase
                .from("dictation_topics")
                .update({
                    title: topic.title,
                    description: topic.description,
                    icon: topic.icon,
                })
                .eq("id", topic.id);

            if (error) throw error;

            toast({ title: "Success", description: "Topic updated" });
            setEditingTopic(null);
            loadData();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to update topic";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        }
    };

    const handleDeleteTopic = async (topicId: string) => {
        if (!confirm("Delete this topic and all its sentences? This cannot be undone.")) return;

        try {
            const { error } = await supabase.from("dictation_topics").delete().eq("id", topicId);
            if (error) throw error;

            toast({ title: "Success", description: "Topic deleted" });
            loadData();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete topic";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        }
    };

    const getLevelColor = (slug: string) => {
        switch (slug) {
            case "beginner": return "bg-green-500/10 text-green-600 border-green-200";
            case "intermediate": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
            case "advanced": return "bg-red-500/10 text-red-600 border-red-200";
            default: return "bg-gray-500/10 text-gray-600 border-gray-200";
        }
    };

    if (loading) {
        return (
            <AdminLayout title="Loading..." showBackButton>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </AdminLayout>
        );
    }

    if (!level) {
        return (
            <AdminLayout title="Level Not Found" showBackButton>
                <p className="text-muted-foreground">The requested level could not be found.</p>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={`${level.icon} ${level.name} Topics`} showBackButton>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Badge className={getLevelColor(level.slug)}>{level.name}</Badge>
                        <p className="text-muted-foreground mt-1">{level.description}</p>
                    </div>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Topic
                    </Button>
                </div>

                {/* Topics Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {topics.map((topic) => (
                        <Card
                            key={topic.id}
                            className="hover:shadow-md transition-all group"
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{topic.icon}</span>
                                        {editingTopic?.id === topic.id ? (
                                            <Input
                                                value={editingTopic.title}
                                                onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                                                className="h-8"
                                            />
                                        ) : (
                                            <CardTitle className="text-base">{topic.title}</CardTitle>
                                        )}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        #{topic.order_index}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {editingTopic?.id === topic.id ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editingTopic.description}
                                            onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })}
                                            placeholder="Description"
                                            rows={2}
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleUpdateTopic(editingTopic)}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setEditingTopic(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                            {topic.description || "No description"}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                            <span>{topic.sentence_count || 0} / 20 sentences</span>
                                            <span>{topic.audio_count || 0} with audio</span>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{ width: `${(topic.sentence_count || 0) / 20 * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => navigate(`/admin/dictation/${levelSlug}/${topic.slug}`)}
                                            >
                                                Manage Sentences
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingTopic(topic)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteTopic(topic.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {topics.length === 0 && (
                        <div className="col-span-3 text-center py-12 text-muted-foreground">
                            No topics yet. Click "Add Topic" to create one.
                        </div>
                    )}
                </div>
            </div>

            {/* Add Topic Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Topic</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={newTopic.title}
                                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                                placeholder="e.g., Weather"
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={newTopic.description}
                                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                                placeholder="Brief description of the topic"
                                rows={2}
                            />
                        </div>
                        <div>
                            <Label htmlFor="icon">Icon (Emoji)</Label>
                            <Input
                                id="icon"
                                value={newTopic.icon}
                                onChange={(e) => setNewTopic({ ...newTopic, icon: e.target.value })}
                                placeholder="📝"
                                className="w-20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddTopic} disabled={!newTopic.title.trim()}>
                            Add Topic
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default AdminDictationLevel;

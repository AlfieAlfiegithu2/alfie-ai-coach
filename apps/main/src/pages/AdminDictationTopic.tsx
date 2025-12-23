import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Save, Volume2, VolumeX, Upload, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface DictationTopic {
    id: string;
    title: string;
    slug: string;
    description: string;
    icon: string;
    level_id: string;
}

interface DictationSentence {
    id: string;
    topic_id: string;
    sentence_text: string;
    audio_url_us: string | null;
    audio_url_uk: string | null;
    order_index: number;
    hints: string | null;
}

const AdminDictationTopic = () => {
    const { levelSlug, topicSlug } = useParams<{ levelSlug: string; topicSlug: string }>();
    const [topic, setTopic] = useState<DictationTopic | null>(null);
    const [sentences, setSentences] = useState<DictationSentence[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
    const [newSentence, setNewSentence] = useState("");
    const [bulkSentences, setBulkSentences] = useState("");
    const [playingAudio, setPlayingAudio] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (levelSlug && topicSlug) {
            loadData();
        }
    }, [levelSlug, topicSlug]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get level first
            const { data: levelData, error: levelError } = await supabase
                .from("dictation_levels")
                .select("id")
                .eq("slug", levelSlug)
                .single();

            if (levelError) throw levelError;

            // Get topic
            const { data: topicData, error: topicError } = await supabase
                .from("dictation_topics")
                .select("*")
                .eq("level_id", levelData.id)
                .eq("slug", topicSlug)
                .single();

            if (topicError) throw topicError;
            setTopic(topicData);
            document.title = `${topicData.title} Sentences | Admin`;

            // Get sentences
            const { data: sentencesData, error: sentencesError } = await supabase
                .from("dictation_sentences")
                .select("*")
                .eq("topic_id", topicData.id)
                .order("order_index");

            if (sentencesError) throw sentencesError;
            setSentences(sentencesData || []);
        } catch (err) {
            console.error("Error loading data:", err);
            toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddSentence = async () => {
        if (!topic || !newSentence.trim()) return;

        try {
            const orderIndex = sentences.length + 1;

            const { error } = await supabase.from("dictation_sentences").insert({
                topic_id: topic.id,
                sentence_text: newSentence.trim(),
                order_index: orderIndex,
            });

            if (error) throw error;

            toast({ title: "Success", description: "Sentence added" });
            setIsAddDialogOpen(false);
            setNewSentence("");
            loadData();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to add sentence";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        }
    };

    const handleBulkAdd = async () => {
        if (!topic || !bulkSentences.trim()) return;

        try {
            const lines = bulkSentences
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

            if (lines.length === 0) return;

            const startIndex = sentences.length + 1;
            const newSentences = lines.map((text, idx) => ({
                topic_id: topic.id,
                sentence_text: text,
                order_index: startIndex + idx,
            }));

            const { error } = await supabase.from("dictation_sentences").insert(newSentences);

            if (error) throw error;

            toast({ title: "Success", description: `Added ${lines.length} sentences` });
            setIsBulkAddOpen(false);
            setBulkSentences("");
            loadData();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to add sentences";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        }
    };

    const handleUpdateSentence = async (sentence: DictationSentence) => {
        setSaving(sentence.id);
        try {
            const { error } = await supabase
                .from("dictation_sentences")
                .update({
                    sentence_text: sentence.sentence_text,
                    hints: sentence.hints,
                })
                .eq("id", sentence.id);

            if (error) throw error;
            toast({ title: "Saved", description: "Sentence updated" });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to update";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteSentence = async (sentenceId: string) => {
        if (!confirm("Delete this sentence?")) return;

        try {
            const { error } = await supabase.from("dictation_sentences").delete().eq("id", sentenceId);
            if (error) throw error;

            toast({ title: "Deleted", description: "Sentence removed" });
            loadData();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete";
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
        }
    };

    const playAudio = (url: string, id: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        if (playingAudio === id) {
            setPlayingAudio(null);
            return;
        }
        audioRef.current = new Audio(url);
        audioRef.current.play();
        setPlayingAudio(id);
        audioRef.current.onended = () => setPlayingAudio(null);
    };

    const updateSentenceField = (id: string, field: keyof DictationSentence, value: string) => {
        setSentences((prev) =>
            prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
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

    if (!topic) {
        return (
            <AdminLayout title="Topic Not Found" showBackButton>
                <p className="text-muted-foreground">The requested topic could not be found.</p>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={`${topic.icon} ${topic.title}`} showBackButton>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-muted-foreground">{topic.description}</p>
                        <Badge variant="outline" className="mt-2">
                            {sentences.length} / 20 sentences
                        </Badge>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsBulkAddOpen(true)}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Bulk Add
                        </Button>
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Sentence
                        </Button>
                    </div>
                </div>

                {/* Sentences Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Sentences</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sentences.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                No sentences yet. Add your first one above.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Sentence</TableHead>
                                        <TableHead className="w-32">US Audio</TableHead>
                                        <TableHead className="w-32">UK Audio</TableHead>
                                        <TableHead className="w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sentences.map((sentence) => (
                                        <TableRow key={sentence.id}>
                                            <TableCell className="font-medium text-muted-foreground">
                                                {sentence.order_index}
                                            </TableCell>
                                            <TableCell>
                                                <Textarea
                                                    value={sentence.sentence_text}
                                                    onChange={(e) =>
                                                        updateSentenceField(sentence.id, "sentence_text", e.target.value)
                                                    }
                                                    onBlur={() => handleUpdateSentence(sentence)}
                                                    rows={2}
                                                    className="min-w-[300px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {sentence.audio_url_us ? (
                                                    <Button
                                                        size="sm"
                                                        variant={playingAudio === `${sentence.id}-us` ? "default" : "outline"}
                                                        onClick={() => playAudio(sentence.audio_url_us!, `${sentence.id}-us`)}
                                                    >
                                                        <Volume2 className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="ghost" disabled>
                                                        <VolumeX className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {sentence.audio_url_uk ? (
                                                    <Button
                                                        size="sm"
                                                        variant={playingAudio === `${sentence.id}-uk` ? "default" : "outline"}
                                                        onClick={() => playAudio(sentence.audio_url_uk!, `${sentence.id}-uk`)}
                                                    >
                                                        <Volume2 className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="ghost" disabled>
                                                        <VolumeX className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleUpdateSentence(sentence)}
                                                        disabled={saving === sentence.id}
                                                    >
                                                        {saving === sentence.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Save className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDeleteSentence(sentence.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Audio Upload Info */}
                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Audio Generation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <p>Audio files will be generated separately using TTS with both American and British accents.</p>
                        <p className="mt-1">The audio will be stored on Cloudflare R2 for zero egress costs.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Add Single Sentence Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Sentence</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="sentence">Sentence Text</Label>
                            <Textarea
                                id="sentence"
                                value={newSentence}
                                onChange={(e) => setNewSentence(e.target.value)}
                                placeholder="Enter the sentence students will transcribe"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddSentence} disabled={!newSentence.trim()}>
                            Add Sentence
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Add Dialog */}
            <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Bulk Add Sentences</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="bulk">Sentences (one per line)</Label>
                            <Textarea
                                id="bulk"
                                value={bulkSentences}
                                onChange={(e) => setBulkSentences(e.target.value)}
                                placeholder="Enter sentences, one per line:
The weather is nice today.
I would like a cup of coffee.
Please close the door behind you."
                                rows={10}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {bulkSentences.split("\n").filter((l) => l.trim()).length} sentences detected
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkAddOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleBulkAdd} disabled={!bulkSentences.trim()}>
                            Add All Sentences
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default AdminDictationTopic;

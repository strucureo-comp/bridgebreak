'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPlanningNotes, createPlanningNote, updatePlanningNote, deletePlanningNote } from '@/lib/firebase/database';
import { useAuth } from '@/lib/firebase/auth-context';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Book, Loader2, StickyNote } from 'lucide-react';
import type { PlanningNote } from '@/lib/db/types';

export default function AdminPlansPage() {
    const { user } = useAuth();
    const [notes, setNotes] = useState<PlanningNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Editor State
    const [editorTitle, setEditorTitle] = useState('');
    const [editorContent, setEditorContent] = useState('');
    const [editorCategory, setEditorCategory] = useState<'idea' | 'strategy' | 'todo' | 'other'>('idea');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchNotes();
        }
    }, [user]);

    const fetchNotes = async () => {
        setLoading(true);
        const data = await getPlanningNotes();
        setNotes(data);
        setLoading(false);
    };

    const handleSelectNote = (note: PlanningNote) => {
        setSelectedNoteId(note.id);
        setEditorTitle(note.title);
        setEditorContent(note.content);
        setEditorCategory(note.category);
        setIsEditing(true);
    };

    const handleCreateNew = () => {
        setSelectedNoteId(null);
        setEditorTitle('');
        setEditorContent('');
        setEditorCategory('idea');
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!editorTitle.trim()) {
            toast.error('Title is required');
            return;
        }

        setSaving(true);
        try {
            if (selectedNoteId) {
                await updatePlanningNote(selectedNoteId, {
                    title: editorTitle,
                    content: editorContent,
                    category: editorCategory
                });
                toast.success('Note updated');
            } else {
                const newId = await createPlanningNote({
                    title: editorTitle,
                    content: editorContent,
                    category: editorCategory,
                    created_by: user?.id || 'unknown'
                });
                if (newId) setSelectedNoteId(newId);
                toast.success('Note created');
            }
            await fetchNotes();
        } catch (error) {
            toast.error('Failed to save note');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this note?')) {
            await deletePlanningNote(id);
            toast.success('Note deleted');
            if (selectedNoteId === id) {
                setSelectedNoteId(null);
                setEditorTitle('');
                setEditorContent('');
                setIsEditing(false);
            }
            await fetchNotes();
        }
    };

    return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col h-[calc(100vh-8rem)]">
                <div className="mb-6 flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Planning Notebook</h1>
                        <p className="text-muted-foreground">Detailed space for ideas, strategies, and future plans</p>
                    </div>
                    <Button onClick={handleCreateNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Entry
                    </Button>
                </div>

                <div className="flex-1 grid grid-cols-12 gap-6 h-full min-h-0 bg-background/50">
                    {/* Sidebar List */}
                    <div className="col-span-12 md:col-span-4 lg:col-span-3 border rounded-lg bg-card overflow-hidden flex flex-col shadow-sm">
                        <div className="p-4 border-b bg-muted/40 font-medium flex items-center gap-2">
                            <Book className="h-4 w-4" />
                            All Notes
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {loading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : notes.length === 0 ? (
                                <div className="text-center p-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                                    <StickyNote className="h-8 w-8 opacity-20" />
                                    No notes yet. Create one!
                                </div>
                            ) : (
                                notes.map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => handleSelectNote(note)}
                                        className={`p-3 rounded-md cursor-pointer transition-all border hover:bg-accent hover:text-accent-foreground group relative ${selectedNoteId === note.id ? 'bg-accent text-accent-foreground border-primary/20 shadow-sm' : 'bg-transparent border-transparent'
                                            }`}
                                    >
                                        <div className="font-medium truncate pr-6">{note.title || 'Untitled'}</div>
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                            <span className="capitalize bg-muted px-1.5 py-0.5 rounded text-[10px] ring-1 ring-inset ring-foreground/10">{note.category}</span>
                                            <span className="opacity-70">{new Date(note.updated_at).toLocaleDateString()}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                            onClick={(e) => handleDelete(note.id, e)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col h-full min-h-0">
                        {isEditing ? (
                            <Card className="h-full flex flex-col border shadow-sm overflow-hidden">
                                <div className="p-4 border-b flex items-center justify-between bg-card/50">
                                    <div className="flex items-center gap-4 flex-1 mr-4">
                                        <div className="p-2 bg-primary/10 rounded-full hidden sm:block">
                                            <StickyNote className="h-5 w-5 text-primary" />
                                        </div>
                                        <Input
                                            value={editorTitle}
                                            onChange={(e) => setEditorTitle(e.target.value)}
                                            placeholder="Note Title..."
                                            className="text-lg font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto bg-transparent placeholder:text-muted-foreground/50"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={editorCategory}
                                            onValueChange={(val: any) => setEditorCategory(val)}
                                        >
                                            <SelectTrigger className="w-[110px] h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="idea">Idea</SelectItem>
                                                <SelectItem value="strategy">Strategy</SelectItem>
                                                <SelectItem value="todo">To Do</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button onClick={handleSave} disabled={saving} size="sm">
                                            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                                            Save
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 p-0 overflow-hidden relative bg-card">
                                    <Textarea
                                        value={editorContent}
                                        onChange={(e) => setEditorContent(e.target.value)}
                                        placeholder="Write your plans and ideas here..."
                                        className="w-full h-full resize-none border-none focus-visible:ring-0 p-6 text-base leading-relaxed"
                                    />
                                </div>
                            </Card>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5 p-12 text-center">
                                <div className="bg-muted/20 p-4 rounded-full mb-4">
                                    <Book className="h-8 w-8 opacity-40" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground">Select a note to view</h3>
                                <p className="text-sm max-w-md mt-2 mb-6">Select a note from the sidebar to view detailed plans, or create a new entry to add your ideas.</p>
                                <Button variant="default" onClick={handleCreateNew}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New Entry
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}

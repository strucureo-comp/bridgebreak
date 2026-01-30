'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getPlanningNotes, createPlanningNote, updatePlanningNote, deletePlanningNote } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Lightbulb, Target, CheckSquare, MoreHorizontal, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { PlanningNote } from '@/lib/db/types';

export default function AdminPlanningPage() {
    const { user } = useAuth();
    const [notes, setNotes] = useState<PlanningNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Note Form
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<PlanningNote['category']>('idea');

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchNotes();
        }
    }, [user]);

    const fetchNotes = async () => {
        try {
            const data = await getPlanningNotes();
            setNotes(data || []);
        } catch (error) {
            toast.error('Failed to load planning notes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNote = async () => {
        if (!title) {
            toast.error('Title is required');
            return;
        }

        try {
            await createPlanningNote({
                title,
                content,
                category,
                created_by: user!.id
            });
            toast.success('Note added');
            setIsDialogOpen(false);
            setTitle('');
            setContent('');
            fetchNotes();
        } catch (error) {
            toast.error('Failed to create note');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this note?')) {
            try {
                await deletePlanningNote(id);
                setNotes(notes.filter(n => n.id !== id));
                toast.success('Note deleted');
            } catch (error) {
                toast.error('Failed to delete note');
            }
        }
    };

    const Categories = {
        idea: { label: 'Ideas', icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        strategy: { label: 'Strategy', icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        todo: { label: 'To-Do', icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-500/10' },
        other: { label: 'General', icon: StickyNote, color: 'text-gray-500', bg: 'bg-gray-500/10' },
    };

    return (
        <DashboardShell requireAdmin>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Strategic Planning</h1>
                        <p className="text-muted-foreground">Internal roadmap, ideas, and strategies</p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Note
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {(Object.keys(Categories) as Array<keyof typeof Categories>).map((catKey) => {
                        const cat = Categories[catKey];
                        const catNotes = notes.filter(n => n.category === catKey);

                        return (
                            <div key={catKey} className="space-y-4">
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${cat.bg} ${cat.color} font-bold`}>
                                    <cat.icon className="h-4 w-4" />
                                    {cat.label}
                                    <span className="ml-auto text-xs opacity-70 bg-background/50 px-2 py-0.5 rounded-full text-foreground">
                                        {catNotes.length}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {catNotes.map(note => (
                                        <Card key={note.id} className="group relative hover:shadow-md transition-shadow">
                                            <button
                                                onClick={(e) => handleDelete(note.id, e)}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                            <CardHeader className="p-4 pb-2">
                                                <CardTitle className="text-base font-semibold pr-4 leading-tight">{note.title}</CardTitle>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {new Date(note.created_at).toLocaleDateString()}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                                                {note.content}
                                            </CardContent>
                                        </Card>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        className="w-full text-muted-foreground text-xs hover:text-foreground border border-dashed border-muted-foreground/20 hover:border-primary/50"
                                        onClick={() => {
                                            setCategory(catKey);
                                            setIsDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="mr-2 h-3 w-3" /> Add {cat.label}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Planning Note</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                    value={category}
                                    onValueChange={(val: any) => setCategory(val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="idea">Idea</SelectItem>
                                        <SelectItem value="strategy">Strategy</SelectItem>
                                        <SelectItem value="todo">To-Do</SelectItem>
                                        <SelectItem value="other">General</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Q4 Marketing Plan"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Content</Label>
                                <Textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Details..."
                                    rows={5}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateNote}>Save Note</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell>
    );
}

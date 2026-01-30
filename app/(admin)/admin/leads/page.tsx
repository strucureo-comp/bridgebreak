'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getLeads, updateLead, createLead } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Plus, DollarSign, TrendingUp, MoreHorizontal, Pencil, Phone, Mail, Globe, Search, Calendar } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Lead } from '@/lib/db/types';

export default function AdminLeadsPage() {
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Lead>>({
        status: 'new',
        probability: 20
    });

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchLeads();
        }
    }, [user]);

    const fetchLeads = async () => {
        try {
            const data = await getLeads();
            setLeads(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!formData.name || !formData.email) {
                toast.error('Name and Email are required');
                return;
            }

            if (editingLead) {
                await updateLead(editingLead.id, formData);
                toast.success('Lead updated');
            } else {
                await createLead(formData as any);
                toast.success('Lead created');
            }

            setIsDialogOpen(false);
            setEditingLead(null);
            setFormData({ status: 'new', probability: 20 });
            fetchLeads();
        } catch (error) {
            toast.error('Failed to save lead');
        }
    };

    const PIPELINE_STAGES = [
        { id: 'new', label: 'New Lead', color: 'bg-blue-500/10 text-blue-500' },
        { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500/10 text-yellow-500' },
        { id: 'qualified', label: 'Qualified', color: 'bg-purple-500/10 text-purple-500' },
        { id: 'proposal', label: 'Proposal', color: 'bg-indigo-500/10 text-indigo-500' },
        { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500/10 text-orange-500' },
        { id: 'won', label: 'Closed Won', color: 'bg-green-500/10 text-green-500' },
        { id: 'lost', label: 'Closed Lost', color: 'bg-red-500/10 text-red-500' },
    ];

    const getStageLeads = (stageId: string) => leads.filter(l => l.status === stageId);

    return (
        <DashboardShell requireAdmin>
            <div className="flex flex-col h-[calc(100vh-100px)] space-y-6">
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Leads Pipeline</h1>
                        <p className="text-muted-foreground">Manage deal flow and conversion</p>
                    </div>
                    <Button onClick={() => {
                        setEditingLead(null);
                        setFormData({ status: 'new', probability: 20 });
                        setIsDialogOpen(true);
                    }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Lead
                    </Button>
                </div>

                {loading ? (
                    <div className="flex gap-4 overflow-auto pb-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="min-w-[300px] h-[500px] bg-muted/20 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : leads.length === 0 ? (
                    <EmptyState
                        icon={Target}
                        title="No leads yet"
                        description="Start filling your pipeline by adding a new lead"
                    />
                ) : (
                    <ScrollArea className="flex-1 -mx-6 px-6">
                        <div className="flex gap-4 pb-6 min-w-max">
                            {PIPELINE_STAGES.map(stage => {
                                const stageLeads = getStageLeads(stage.id);
                                const totalValue = stageLeads.reduce((acc, curr) => acc + (curr.potential_value || 0), 0);

                                return (
                                    <div key={stage.id} className="w-[320px] shrink-0 flex flex-col gap-4">
                                        <div className={`p-3 rounded-lg ${stage.color} font-bold flex items-center justify-between`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{stage.label}</span>
                                                <span className="bg-background/80 px-2 py-0.5 rounded-full text-xs text-foreground font-medium">
                                                    {stageLeads.length}
                                                </span>
                                            </div>
                                            {totalValue > 0 && (
                                                <span className="text-[10px] opacity-80 font-mono">
                                                    ${totalValue.toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {stageLeads.map(lead => (
                                                <Card key={lead.id} className="group hover:border-primary/50 transition-all hover:shadow-md cursor-pointer border-l-4" style={{ borderLeftColor: stage.id === 'won' ? '#22c55e' : 'transparent' }}>
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div className="space-y-1">
                                                                <h3 className="font-bold text-sm line-clamp-1">{lead.name}</h3>
                                                                <p className="text-xs text-muted-foreground line-clamp-1">{lead.company || 'No Company'}</p>
                                                            </div>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <MoreHorizontal className="h-3 w-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setEditingLead(lead);
                                                                        setFormData(lead);
                                                                        setIsDialogOpen(true);
                                                                    }}>
                                                                        <Pencil className="mr-2 h-3 w-3" /> Edit
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>

                                                        {lead.notes && (
                                                            <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
                                                                "{lead.notes}"
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between text-xs">
                                                            {lead.potential_value ? (
                                                                <div className="font-semibold text-foreground flex items-center gap-1">
                                                                    <DollarSign className="h-3 w-3 text-emerald-500" />
                                                                    {lead.potential_value.toLocaleString()}
                                                                </div>
                                                            ) : <span />}

                                                            {lead.probability !== undefined && (
                                                                <div className={`flex items-center gap-1 font-medium ${lead.probability > 70 ? 'text-green-600' :
                                                                    lead.probability > 40 ? 'text-yellow-600' : 'text-red-600'
                                                                    }`}>
                                                                    <TrendingUp className="h-3 w-3" />
                                                                    {lead.probability}%
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="pt-2 border-t flex items-center gap-3 mt-1">
                                                            {lead.email && <Mail className="h-3 w-3 text-muted-foreground/70" />}
                                                            {lead.phone && <Phone className="h-3 w-3 text-muted-foreground/70" />}
                                                            {lead.source && (
                                                                <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                                                                    <Globe className="h-2.5 w-2.5" />
                                                                    {lead.source}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {lead.next_follow_up && (
                                                            <div className={`mt-2 flex items-center gap-2 text-xs p-1.5 rounded-md border ${new Date(lead.next_follow_up) < new Date() ? 'bg-red-500/10 border-red-200 text-red-600' : 'bg-blue-500/5 border-blue-100 text-blue-600'
                                                                }`}>
                                                                <Calendar className="h-3 w-3" />
                                                                <span>Follow up: {new Date(lead.next_follow_up).toLocaleDateString()}</span>
                                                                {lead.follow_up_notes && <span className="opacity-70 truncate max-w-[120px]">- {lead.follow_up_notes}</span>}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                            {stageLeads.length === 0 && (
                                                <div className="h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground/50">
                                                    Empty
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>{editingLead ? 'Edit Visual Lead' : 'Create New Lead'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Name *</Label>
                                    <Input
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email *</Label>
                                    <Input
                                        value={formData.email || ''}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@company.com"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Company Name</Label>
                                    <Input
                                        value={formData.company || ''}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Source</Label>
                                    <Select
                                        value={formData.source}
                                        onValueChange={(val) => setFormData({ ...formData, source: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select source" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Website Enquiry">Website Enquiry</SelectItem>
                                            <SelectItem value="Referral">Referral</SelectItem>
                                            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                            <SelectItem value="Cold Outreach">Cold Outreach</SelectItem>
                                            <SelectItem value="Ads">Ads</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Pipeline Stage</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PIPELINE_STAGES.map(stage => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    {stage.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <DollarSign className="h-3.5 w-3.5" /> Potential Value
                                    </Label>
                                    <Input
                                        type="number"
                                        value={formData.potential_value || ''}
                                        onChange={e => setFormData({ ...formData, potential_value: parseInt(e.target.value) })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <TrendingUp className="h-3.5 w-3.5" /> Probability (%)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min="0" max="100"
                                            value={formData.probability || ''}
                                            onChange={e => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                                        />
                                        <span className="text-sm text-muted-foreground">%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes / Activity Log</Label>
                                <Textarea
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Enter meeting notes, requirements, or next steps..."
                                    className="min-h-[100px]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-primary/5 p-4 rounded-lg border border-primary/10">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-primary font-medium">
                                        <Calendar className="h-3.5 w-3.5" /> Next Follow-up
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.next_follow_up || ''}
                                        onChange={e => setFormData({ ...formData, next_follow_up: e.target.value })}
                                        className="bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-primary font-medium">Follow-up Note</Label>
                                    <Input
                                        value={formData.follow_up_notes || ''}
                                        onChange={e => setFormData({ ...formData, follow_up_notes: e.target.value })}
                                        placeholder="e.g. Call to discuss pricing"
                                        className="bg-background"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit}>{editingLead ? 'Update Lead' : 'Create Lead'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell>
    );
}

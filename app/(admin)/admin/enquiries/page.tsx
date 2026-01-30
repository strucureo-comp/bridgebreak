'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { getEnquiries, updateEnquiry, createLead } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Inbox, Mail, CheckCircle, ArrowRight, Trash2, Phone, User as UserIcon, LayoutGrid, List as ListIcon, MessageSquare } from 'lucide-react';
import { StatsCard } from '@/components/common/stats-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/empty-state';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { Enquiry } from '@/lib/db/types';

export default function AdminEnquiriesPage() {
    const { user } = useAuth();
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
    const [view, setView] = useState<'table' | 'grid'>('grid');

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchEnquiries();
        }
    }, [user]);

    const fetchEnquiries = async () => {
        try {
            const data = await getEnquiries();
            setEnquiries(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load enquiries');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: Enquiry['status']) => {
        try {
            await updateEnquiry(id, { status });
            setEnquiries(enquiries.map(e => e.id === id ? { ...e, status } : e));
            toast.success(`Enquiry marked as ${status}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleConvertToLead = async (enquiry: Enquiry) => {
        try {
            const leadId = await createLead({
                name: enquiry.name,
                email: enquiry.email,
                phone: enquiry.phone,
                status: 'new',
                source: 'Website Enquiry',
                notes: `Original Message: ${enquiry.message}`,
                potential_value: 0,
                probability: 0
            });

            if (leadId) {
                await updateEnquiry(enquiry.id, { status: 'converted' });
                setEnquiries(enquiries.map(e => e.id === enquiry.id ? { ...e, status: 'converted' } : e));
                toast.success('Converted to Lead successfully');
                setSelectedEnquiry(null);
            }
        } catch (error) {
            toast.error('Failed to convert to lead');
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
            new: 'default',
            read: 'secondary',
            replied: 'outline',
            converted: 'secondary',
        };
        return <Badge variant={variants[status] || 'default'} className="uppercase text-[10px]">{status}</Badge>;
    };

    const stats = {
        total: enquiries.length,
        new: enquiries.filter(e => e.status === 'new').length,
        converted: enquiries.filter(e => e.status === 'converted').length,
        responseRate: enquiries.length ? Math.round((enquiries.filter(e => e.status !== 'new').length / enquiries.length) * 100) : 0
    };

    return (
        <DashboardShell requireAdmin>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Enquiries</h1>
                        <p className="text-muted-foreground">Manage incoming messages from your website</p>
                    </div>
                    <div className="flex bg-muted p-1 rounded-lg">
                        <Button
                            variant={view === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => setView('grid')}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Grid
                        </Button>
                        <Button
                            variant={view === 'table' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => setView('table')}
                        >
                            <ListIcon className="h-4 w-4 mr-2" />
                            List
                        </Button>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="Total Enquiries"
                        value={stats.total}
                        icon={Inbox}
                        iconColor="text-blue-500"
                        iconBgColor="bg-blue-100 dark:bg-blue-900/20"
                    />
                    <StatsCard
                        title="New Messages"
                        value={stats.new}
                        description="Requires attention"
                        icon={MessageSquare}
                        iconColor="text-orange-500"
                        iconBgColor="bg-orange-100 dark:bg-orange-900/20"
                    />
                    <StatsCard
                        title="Converted"
                        value={stats.converted}
                        description="Leads generated"
                        icon={CheckCircle}
                        iconColor="text-green-500"
                        iconBgColor="bg-green-100 dark:bg-green-900/20"
                    />
                    <StatsCard
                        title="Response Rate"
                        value={`${stats.responseRate}%`}
                        description="Messages handled"
                        icon={Mail}
                        iconColor="text-purple-500"
                        iconBgColor="bg-purple-100 dark:bg-purple-900/20"
                    />
                </div>

                {view === 'grid' ? (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <Card key={i} className="h-48 animate-pulse bg-muted" />
                            ))
                        ) : enquiries.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                No enquiries found
                            </div>
                        ) : (
                            enquiries.map((enquiry) => (
                                <Card
                                    key={enquiry.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden"
                                    onClick={() => {
                                        setSelectedEnquiry(enquiry);
                                        if (enquiry.status === 'new') handleStatusUpdate(enquiry.id, 'read');
                                    }}
                                >
                                    {enquiry.status === 'new' && (
                                        <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full m-3" />
                                    )}
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start mb-2">
                                            {getStatusBadge(enquiry.status)}
                                            <span className="text-xs text-muted-foreground">{new Date(enquiry.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <CardTitle className="line-clamp-1 text-base">{enquiry.subject}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
                                                {enquiry.name.substring(0, 2)}
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="font-medium text-sm truncate">{enquiry.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">{enquiry.email}</div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                            {enquiry.message}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                ) : (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <TableRow key={i}>
                                            <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-6 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-6 w-48 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-6 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell />
                                        </TableRow>
                                    ))
                                ) : enquiries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No enquiries found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    enquiries.map((enquiry) => (
                                        <TableRow
                                            key={enquiry.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => {
                                                setSelectedEnquiry(enquiry);
                                                if (enquiry.status === 'new') handleStatusUpdate(enquiry.id, 'read');
                                            }}
                                        >
                                            <TableCell>{getStatusBadge(enquiry.status)}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{enquiry.name}</div>
                                                <div className="text-xs text-muted-foreground">{enquiry.email}</div>
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate">
                                                <span className="font-medium">{enquiry.subject}</span>
                                                <div className="text-xs text-muted-foreground truncate">{enquiry.message}</div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(enquiry.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon">
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                    </Card>
                )}

                <Dialog open={!!selectedEnquiry} onOpenChange={(open) => !open && setSelectedEnquiry(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <DialogTitle>Enquiry Details</DialogTitle>
                                {selectedEnquiry && getStatusBadge(selectedEnquiry.status)}
                            </div>
                            <DialogDescription>
                                Received on {selectedEnquiry && new Date(selectedEnquiry.created_at).toLocaleString()}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedEnquiry && (
                            <div className="grid gap-6 py-4">
                                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                                    <div className="bg-background p-2 rounded-full border">
                                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-semibold">{selectedEnquiry.name}</h4>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-3 w-3" /> {selectedEnquiry.email}
                                        </div>
                                        {selectedEnquiry.phone && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-3 w-3" /> {selectedEnquiry.phone}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Message</h4>
                                    <div className="p-4 rounded-lg border bg-background">
                                        <h3 className="font-semibold mb-2">{selectedEnquiry.subject}</h3>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedEnquiry.message}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            {selectedEnquiry && (
                                <>
                                    <Button variant="outline" asChild>
                                        <a href={`mailto:${selectedEnquiry.email}?subject=Re: ${selectedEnquiry.subject}`}>
                                            <Mail className="mr-2 h-4 w-4" />
                                            Reply via Email
                                        </a>
                                    </Button>
                                    {selectedEnquiry.status !== 'converted' && (
                                        <Button onClick={() => handleConvertToLead(selectedEnquiry)}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Convert to Lead
                                        </Button>
                                    )}
                                </>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardShell >
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { Trash2, Plus, FileText } from 'lucide-react';
import { getQuotations, deleteQuotation, getUsers } from '@/lib/firebase/database';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import type { Quotation, User } from '@/lib/db/types';

export default function AdminQuotationsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user === null) {
            // User is not logged in, redirect handled by DashboardShell
            setLoading(false);
            return;
        }
        if (user?.role === 'admin') {
            fetchQuotations();
        } else if (user) {
            // User exists but is not admin
            setLoading(false);
        }
    }, [user]);

    const fetchQuotations = async () => {
        try {
            const [quotationsData, usersData] = await Promise.all([
                getQuotations(),
                getUsers()
            ]);
            setQuotations(quotationsData);
            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this quotation?')) {
            const success = await deleteQuotation(id);
            if (success) {
                setQuotations((prev) => prev.filter((q) => q.id !== id));
                toast.success('Quotation deleted');
            } else {
                toast.error('Failed to delete quotation');
            }
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            draft: 'secondary',
            sent: 'default',
            accepted: 'default', // maybe success green if available
            rejected: 'destructive',
            expired: 'outline',
        };

        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    return (
        <DashboardShell requireAdmin>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
                        <p className="text-muted-foreground">Manage client quotations</p>
                    </div>
                    <Button onClick={() => router.push('/admin/quotations/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Quotation
                    </Button>
                </div>

                {loading ? (
                    <div className="grid gap-4">
                        {[1, 2, 3].map((i) => (
                            <Card key={i}>
                                <CardContent className="p-6">
                                    <div className="animate-pulse space-y-3">
                                        <div className="h-4 bg-muted rounded w-1/4"></div>
                                        <div className="h-3 bg-muted rounded w-3/4"></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : quotations.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="No quotations yet"
                        description="Create your first quotation"
                        action={{
                            label: 'Create Quotation',
                            onClick: () => router.push('/admin/quotations/new'),
                        }}
                    />
                ) : (
                    <div className="grid gap-4">
                        {quotations.map((quotation) => (
                            <Card
                                key={quotation.id}
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => router.push(`/admin/quotations/${quotation.id}`)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-xl">{quotation.quotation_number}</CardTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={(e) => handleDelete(e, quotation.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <p className="font-medium">
                                                    {quotation.client_is_company
                                                        ? (quotation.client_company || 'Company Client')
                                                        : (quotation.client_name || users.find(u => u.id === quotation.client_id)?.full_name || 'Client')
                                                    }
                                                </p>
                                                {quotation.client_is_company && quotation.client_name && (
                                                    <p className="text-xs text-muted-foreground">Attn: {quotation.client_name}</p>
                                                )}
                                                <p className="text-sm text-muted-foreground">
                                                    Valid Until: {new Date(quotation.valid_until).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(quotation.status)}
                                            <span className="text-2xl font-bold">
                                                {new Intl.NumberFormat('en-US', {
                                                    style: 'currency',
                                                    currency: quotation.currency || 'USD',
                                                }).format(quotation.amount)}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground">
                                        Created: {new Date(quotation.created_at).toLocaleDateString()}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}

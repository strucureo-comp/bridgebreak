'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { getProjects, getInvoices } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { StatsCard } from '@/components/common/stats-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, FileText, MessageSquare, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Project, Invoice } from '@/lib/db/types';

export default function ClientDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    const projectsData = await getProjects(user?.id);
    const invoicesData = await getInvoices(user?.id);

    const filteredProjects = projectsData.slice(0, 5);
    const pendingInvoices = invoicesData.filter(inv => inv.status === 'pending');

    setProjects(filteredProjects);
    setInvoices(pendingInvoices);
    setLoading(false);
  };

  const activeProjects = projects.filter(p =>
    ['accepted', 'in_progress', 'testing'].includes(p.status)
  ).length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      under_review: 'outline',
      accepted: 'default',
      in_progress: 'default',
      testing: 'outline',
      completed: 'secondary',
      cancelled: 'destructive',
    };

    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.full_name}</p>
          </div>
          <Button onClick={() => router.push('/projects/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Total Projects"
            value={projects.length}
            description="All time"
            icon={FolderKanban}
          />
          <StatsCard
            title="Active Projects"
            value={activeProjects}
            description="In progress"
            icon={FolderKanban}
          />
          <StatsCard
            title="Pending Payments"
            value={invoices.length}
            description="Awaiting payment"
            icon={FileText}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your latest project submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No projects yet</p>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.description}
                        </p>
                      </div>
                      <div className="ml-4">{getStatusBadge(project.status)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Invoices</CardTitle>
              <CardDescription>Invoices awaiting payment</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No pending invoices</p>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">${invoice.amount.toFixed(2)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Button variant="outline" className="h-24 flex-col" asChild>
            <Link href="/support/new">
              <MessageSquare className="h-6 w-6 mb-2" />
              <span>Request Support</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-24 flex-col" asChild>
            <Link href="/meetings/new">
              <MessageSquare className="h-6 w-6 mb-2" />
              <span>Schedule Meeting</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-24 flex-col" asChild>
            <Link href="/projects">
              <FolderKanban className="h-6 w-6 mb-2" />
              <span>View All Projects</span>
            </Link>
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}

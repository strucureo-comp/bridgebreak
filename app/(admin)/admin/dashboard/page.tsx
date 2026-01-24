'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getProjects, getSupportRequests, getUsers } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { StatsCard } from '@/components/common/stats-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, Users, DollarSign, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { Project, SupportRequest } from '@/lib/db/types';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    const projectsData = await getProjects();
    const supportData = await getSupportRequests();
    const usersData = await getUsers();

    const recentProjects = projectsData.slice(0, 5);
    const pendingProjectsData = projectsData.filter(p => ['pending', 'under_review'].includes(p.status));
    const activeSupportRequests = supportData.filter(s => ['open', 'in_progress'].includes(s.status)).slice(0, 5);
    const clientCount = usersData.filter(u => u.role === 'client').length;

    setProjects(recentProjects);
    setPendingProjects(pendingProjectsData);
    setSupportRequests(activeSupportRequests);
    setTotalClients(clientCount);
    setTotalProjects(projectsData.length);
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
      open: 'default',
      resolved: 'secondary',
      closed: 'outline',
    };

    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Overview of all projects and activities</p>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Clients"
            value={totalClients}
            icon={Users}
            description="Registered users"
          />
          <StatsCard
            title="All Projects"
            value={totalProjects}
            icon={FolderKanban}
            description="Total submissions"
          />
          <StatsCard
            title="Pending Review"
            value={pendingProjects.length}
            icon={FolderKanban}
            description="Awaiting approval"
          />
          <StatsCard
            title="Open Support"
            value={supportRequests.length}
            icon={MessageSquare}
            description="Active tickets"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Latest project submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No projects yet</p>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/admin/projects/${project.id}`}
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
              <CardTitle>Active Support Requests</CardTitle>
              <CardDescription>Recent support tickets</CardDescription>
            </CardHeader>
            <CardContent>
              {supportRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No active support requests</p>
              ) : (
                <div className="space-y-4">
                  {supportRequests.map((request) => (
                    <Link
                      key={request.id}
                      href={`/admin/support/${request.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{request.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          Priority: {request.priority}
                        </p>
                      </div>
                      <div className="ml-4">{getStatusBadge(request.status)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

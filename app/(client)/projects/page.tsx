'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { getProjects } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderKanban, ArrowRight, Calendar, DollarSign, Clock } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Separator } from '@/components/ui/separator';
import type { Project } from '@/lib/db/types';

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    const data = await getProjects(user?.id);
    setProjects(data || []);
    setLoading(false);
  };

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
            <p className="text-muted-foreground">Track your project progress and deployment status</p>
          </div>
          <Button onClick={() => router.push('/projects/new')} className="font-bold uppercase tracking-wider text-xs h-9">
            <Plus className="mr-2 h-4 w-4" />
            Launch New Project
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-48 animate-pulse bg-muted/20 border-none" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects launched"
            description="You haven't started any projects with BridgeBreak yet."
            action={{
              label: 'Launch First Project',
              onClick: () => router.push('/projects/new'),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => router.push(`/projects/${project.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
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

    return <Badge variant={variants[status] || 'default'} className="uppercase text-[10px] font-bold tracking-wider">{status.replace('_', ' ')}</Badge>;
  };

  return (
    <Card
      className="group cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full flex flex-col overflow-hidden border-muted/60"
      onClick={onClick}
    >
      <div className="h-1.5 w-full bg-muted group-hover:bg-primary/20 transition-colors" />
      <CardHeader className="pb-4 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors tracking-tight">{project.title}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-medium opacity-80">
              {project.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          {getStatusBadge(project.status)}
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Enter Cockpit <ArrowRight className="h-3 w-3" />
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
            {project.deadline && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{new Date(project.deadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

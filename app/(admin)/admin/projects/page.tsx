'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { getProjects } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FolderKanban, ArrowRight, Calendar, DollarSign } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import type { Project } from '@/lib/db/types';

export default function AdminProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    const data = await getProjects();
    setProjects(data || []);
    setLoading(false);
  };

  const filterProjects = (status: string[]) => {
    return projects.filter((p) => status.includes(p.status));
  };

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
            <p className="text-muted-foreground">Monitor and manage all client deployments</p>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="px-6">All ({projects.length})</TabsTrigger>
            <TabsTrigger value="pending" className="px-6">
              Pending ({filterProjects(['pending']).length})
            </TabsTrigger>
            <TabsTrigger value="active" className="px-6">
              Active ({filterProjects(['accepted', 'in_progress', 'testing']).length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="px-6">
              Completed ({filterProjects(['completed']).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {loading ? (
              <LoadingGrid />
            ) : projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                description="Projects will appear here once clients submit them"
              />
            ) : (
              <ProjectGrid projects={projects} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} />
            )}
          </TabsContent>

          <TabsContent value="pending">
            <ProjectGrid projects={filterProjects(['pending'])} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} />
          </TabsContent>

          <TabsContent value="active">
            <ProjectGrid projects={filterProjects(['accepted', 'in_progress', 'testing'])} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} />
          </TabsContent>

          <TabsContent value="completed">
            <ProjectGrid projects={filterProjects(['completed'])} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}

function ProjectGrid({ projects, onProjectClick }: { projects: Project[], onProjectClick: (id: string) => void }) {
  if (projects.length === 0) {
    return (
      <div className="py-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground">
        <FolderKanban className="h-8 w-8 mb-2 opacity-20" />
        <p className="text-sm font-medium">No projects in this category</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onClick={() => onProjectClick(project.id)} />
      ))}
    </div>
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
            Configure <ArrowRight className="h-3 w-3" />
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
            {project.estimated_cost && (
              <div className="flex items-center gap-0.5 text-foreground/70">
                <DollarSign className="h-3 w-3" />
                <span>{project.estimated_cost.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="h-48 animate-pulse bg-muted/20 border-none" />
      ))}
    </div>
  );
}

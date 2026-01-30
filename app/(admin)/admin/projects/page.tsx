'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { getProjects, updateProject } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FolderKanban, ArrowRight, Calendar, DollarSign, Star } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { toast } from 'sonner';
import type { Project } from '@/lib/db/types';

import { Input } from '@/components/ui/input';
import { ProjectStats } from '@/components/admin/project-stats';

export default function AdminProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    return projects.filter((p) =>
      status.includes(p.status) &&
      (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const getAllFilteredProjects = () => {
    return projects.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFeaturedFilteredProjects = () => {
    return projects.filter(p =>
      p.is_featured &&
      (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
            <p className="text-muted-foreground">Monitor and manage all client deployments</p>
          </div>
        </div>

        <ProjectStats projects={getAllFilteredProjects()} />

        <div className="flex items-center space-x-2 mb-6">
          <div className="relative flex-1 max-w-sm">
            <FolderKanban className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
            <TabsTrigger value="all" className="px-6">All ({getAllFilteredProjects().length})</TabsTrigger>
            <TabsTrigger value="featured" className="px-6 gap-1">
              <Star className="h-3.5 w-3.5 fill-current" />
              Featured ({getFeaturedFilteredProjects().length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="px-6">
              Pending ({filterProjects(['pending', 'under_review']).length})
            </TabsTrigger>
            <TabsTrigger value="active" className="px-6">
              Active ({filterProjects(['accepted', 'in_progress', 'testing']).length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="px-6">
              Completed ({filterProjects(['completed']).length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="px-6">
              Cancelled ({filterProjects(['cancelled']).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {loading ? (
              <LoadingGrid />
            ) : getAllFilteredProjects().length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects found"
                description={searchQuery ? "Try adjusting your search query" : "Projects will appear here once clients submit them"}
              />
            ) : (
              <ProjectGrid projects={getAllFilteredProjects()} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} onRefresh={fetchProjects} />
            )}
          </TabsContent>

          <TabsContent value="featured">
            <ProjectGrid projects={getFeaturedFilteredProjects()} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} onRefresh={fetchProjects} />
          </TabsContent>

          <TabsContent value="pending">
            <ProjectGrid projects={filterProjects(['pending', 'under_review'])} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} onRefresh={fetchProjects} />
          </TabsContent>

          <TabsContent value="active">
            <ProjectGrid projects={filterProjects(['accepted', 'in_progress', 'testing'])} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} onRefresh={fetchProjects} />
          </TabsContent>

          <TabsContent value="completed">
            <ProjectGrid projects={filterProjects(['completed'])} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} onRefresh={fetchProjects} />
          </TabsContent>

          <TabsContent value="cancelled">
            <ProjectGrid projects={filterProjects(['cancelled'])} onProjectClick={(id) => router.push(`/admin/projects/${id}`)} onRefresh={fetchProjects} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}

function ProjectGrid({ projects, onProjectClick, onRefresh }: { projects: Project[], onProjectClick: (id: string) => void, onRefresh: () => Promise<void> }) {
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
        <ProjectCard key={project.id} project={project} onClick={() => onProjectClick(project.id)} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

function ProjectCard({ project, onClick, onRefresh }: { project: Project; onClick: () => void; onRefresh: () => Promise<void> }) {
  const [isTogglingFeatured, setIsTogglingFeatured] = useState(false);

  const toggleFeatured = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsTogglingFeatured(true);

    try {
      const success = await updateProject(project.id, {
        is_featured: !project.is_featured
      });

      if (success) {
        toast.success(project.is_featured ? 'Removed from featured' : 'Marked as featured');
        await onRefresh();
      } else {
        toast.error('Failed to update featured status');
      }
    } catch (error) {
      toast.error('Failed to update featured status');
    } finally {
      setIsTogglingFeatured(false);
    }
  };

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
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors tracking-tight">{project.title}</CardTitle>
              {project.is_featured && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-medium opacity-80">
              {project.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
            onClick={toggleFeatured}
            disabled={isTogglingFeatured}
          >
            <Star className={`h-4 w-4 transition-all ${project.is_featured ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`} />
          </Button>
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

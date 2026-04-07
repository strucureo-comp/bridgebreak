'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { createProject, getUsers } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Paperclip, User, Building2, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { FileUploader } from '@/components/common/file-uploader';
import type { User as DBUser, ProjectStatus } from '@/lib/db/types';

export default function AdminNewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<DBUser[]>([]);
  const [fetchingClients, setFetchingClients] = useState(true);
  const [clientType, setClientType] = useState<'registered' | 'manual'>('registered');
  
  const [formData, setFormData] = useState({
    client_id: '',
    manual_client_name: '',
    manual_client_email: '',
    manual_client_company: '',
    manual_client_phone: '',
    title: '',
    description: '',
    github_link: '',
    document_url: '',
    status: 'pending' as ProjectStatus,
    estimated_cost: '',
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const allUsers = await getUsers();
        const clientUsers = allUsers.filter(u => u.role === 'client');
        setClients(clientUsers);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error('Failed to load clients');
      } finally {
        setFetchingClients(false);
      }
    };

    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setLoading(true);

    const projectData: any = {
      title: formData.title || 'Untitled Project',
      description: formData.description || '',
      github_link: formData.github_link || undefined,
      document_url: formData.document_url || undefined,
      status: formData.status,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : undefined,
    };

    if (clientType === 'registered') {
      projectData.client_id = formData.client_id || '';
    } else {
      projectData.client_id = ''; // Empty string for manual
      projectData.manual_client_name = formData.manual_client_name;
      projectData.manual_client_email = formData.manual_client_email;
      projectData.manual_client_company = formData.manual_client_company;
      projectData.manual_client_phone = formData.manual_client_phone;
    }

    const projectId = await createProject(projectData);

    if (projectId) {
      toast.success('Project created successfully!');
      router.push(`/admin/projects/${projectId}`);
    } else {
      toast.error('Failed to create project');
      setLoading(false);
    }
  };

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
            <p className="text-muted-foreground">Initialize a new project for a client</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>
                Associate this project with an existing client or enter details manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={clientType} onValueChange={(v) => setClientType(v as any)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="registered">Registered Client</TabsTrigger>
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                </TabsList>
                
                <TabsContent value="registered" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Select Client</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                      disabled={loading || fetchingClients}
                    >
                      <SelectTrigger id="client">
                        <SelectValue placeholder={fetchingClients ? "Loading clients..." : "Select a client"} />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name} ({client.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manual_name">Client Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="manual_name"
                          placeholder="Full Name"
                          className="pl-9"
                          value={formData.manual_client_name}
                          onChange={(e) => setFormData({ ...formData, manual_client_name: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual_email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="manual_email"
                          type="email"
                          placeholder="client@example.com"
                          className="pl-9"
                          value={formData.manual_client_email}
                          onChange={(e) => setFormData({ ...formData, manual_client_email: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual_company">Company</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="manual_company"
                          placeholder="Company Name"
                          className="pl-9"
                          value={formData.manual_client_company}
                          onChange={(e) => setFormData({ ...formData, manual_client_company: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual_phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="manual_phone"
                          placeholder="+1 (555) 000-0000"
                          className="pl-9"
                          value={formData.manual_client_phone}
                          onChange={(e) => setFormData({ ...formData, manual_client_phone: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Basic information about the project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    placeholder="E.g., E-commerce Website"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Initial Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as ProjectStatus })}
                    disabled={loading}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the project requirements, features, and goals..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={loading}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="github_link">GitHub Link</Label>
                  <Input
                    id="github_link"
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={formData.github_link}
                    onChange={(e) => setFormData({ ...formData, github_link: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_cost">Estimated Cost</Label>
                  <Input
                    id="estimated_cost"
                    type="number"
                    placeholder="0.00"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Project Document</Label>
                <FileUploader
                  bucket="projects"
                  path={`${formData.client_id || 'manual'}/documents`}
                  onUploadComplete={(url) => setFormData({ ...formData, document_url: url })}
                  label="Upload BRD, Wireframes, etc."
                  disabled={loading}
                />
                {formData.document_url && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    Document attached successfully
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" size="lg" className="px-8" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Project
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push('/admin/projects')}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

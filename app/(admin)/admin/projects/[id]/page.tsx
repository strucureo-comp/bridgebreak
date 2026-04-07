'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { getProject, updateProject } from '@/lib/firebase/database';
import { uploadProjectImage } from '@/lib/firebase/storage';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Server,
  Settings,
  Rocket,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Shield,
  FileText,
  Trash2,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Globe,
  Paperclip,
  DollarSign,
  ShieldAlert,
  Calendar as CalendarIcon
} from 'lucide-react';
import Link from 'next/link';
import type { Project, ProjectStatus } from '@/lib/db/types';

export default function AdminProjectCockpitPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    status: '' as ProjectStatus,
    progress_percentage: 0,
    deadline: '',
    github_link: '',
    live_preview_type: 'url' as 'url' | 'image',
    live_preview_url: '',
    estimated_cost: 0,
    maintenance_cost: 0,
    maintenance_frequency: 'monthly' as 'monthly' | 'yearly',
    internal_resource_cost: 0,
    resource_frequency: 'monthly' as 'monthly' | 'yearly',
    next_billing_date: '',
    technical_config: [] as Array<{
      id: string;
      label: string;
      value: string;
      isLink?: boolean;
      isSecret?: boolean;
      category: 'infra' | 'admin' | 'deploy';
    }>
  });

  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchProject();
    }
  }, [user, params.id]);

  const fetchProject = async () => {
    const data = await getProject(params.id);
    if (data) {
      setProject(data);
      setFormData({
        status: data.status,
        progress_percentage: data.progress_percentage || 0,
        deadline: data.deadline || '',
        github_link: data.github_link || '',
        live_preview_type: data.live_preview_type || 'url',
        live_preview_url: data.live_preview_url || '',
        estimated_cost: data.estimated_cost || 0,
        maintenance_cost: data.maintenance_cost || 0,
        maintenance_frequency: data.maintenance_frequency || 'monthly',
        internal_resource_cost: data.internal_resource_cost || 0,
        resource_frequency: data.resource_frequency || 'monthly',
        next_billing_date: data.next_billing_date || '',
        technical_config: data.technical_config || []
      });
    }
    setLoading(false);
  };

  const handleUpdate = async (updates: Partial<Project>) => {
    setSaving(true);
    const success = await updateProject(params.id, updates);
    if (success) {
      setProject(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Successfully updated');
    } else {
      toast.error('Update failed');
    }
    setSaving(false);
  };

  const addConfigField = (category: 'infra' | 'admin' | 'deploy') => {
    const newField = {
      id: Date.now().toString(),
      label: '',
      value: '',
      category,
      isLink: false,
      isSecret: false
    };
    setFormData(prev => ({
      ...prev,
      technical_config: [...prev.technical_config, newField]
    }));
  };

  const removeConfigField = (id: string) => {
    setFormData(prev => ({
      ...prev,
      technical_config: prev.technical_config.filter(f => f.id !== id)
    }));
  };

  const updateConfigField = (id: string, updates: any) => {
    setFormData(prev => ({
      ...prev,
      technical_config: prev.technical_config.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const addNote = () => {
    if (!newNote.trim() || !project) return;
    const notes = [...(project.notes || []), newNote];
    handleUpdate({ notes });
    setNewNote('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setUploadingImage(true);
    const downloadURL = await uploadProjectImage(project.id, file);
    if (downloadURL) {
      setFormData(prev => ({ ...prev, live_preview_url: downloadURL }));
      toast.success('Image uploaded successfully');
    } else {
      toast.error('Image upload failed');
    }
    setUploadingImage(false);
  };

  if (loading) {
    return (
      <DashboardShell requireAdmin>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  if (!project) return null;

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/projects">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Project Cockpit</h1>
              <p className="text-muted-foreground">Manage infrastructure and project technicals</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => handleUpdate(formData)}
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
              Save All Changes
            </Button>
          </div>
        </div>

        {/* Top Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-2xl">{project.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Project Description</Label>
                <p className="text-sm leading-relaxed">{project.description}</p>
              </div>
              <div className="flex flex-wrap gap-8 pt-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Registered</Label>
                  <p className="text-sm font-medium">{new Date(project.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Project Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as ProjectStatus })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs font-bold uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px] space-y-1">
                  <Label className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">GitHub Repository</Label>
                  <Input
                    value={formData.github_link}
                    placeholder="https://github.com/..."
                    onChange={(e) => setFormData({ ...formData, github_link: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Project Health</CardTitle>
                <span className="text-2xl font-bold text-primary">{formData.progress_percentage}%</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Progress value={formData.progress_percentage || 0} className="h-2" />
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress_percentage}
                  onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) })}
                  className="w-full h-2 accent-primary"
                />
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider leading-none">Target Deadline</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="border-none p-0 h-auto bg-transparent font-bold text-lg shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financials & Recurring Costs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-blue-100 dark:border-blue-900/30">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 rounded-t-xl py-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <DollarSign className="h-5 w-5" />
                <CardTitle className="text-base uppercase tracking-wider font-bold">Client Financials</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Setup / One-time Fee</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                      className="pl-9 font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Next Billing Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={formData.next_billing_date}
                      onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Recurring Maintenance</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground">Charge Amount</Label>
                    <Input
                      type="number"
                      value={formData.maintenance_cost}
                      onChange={(e) => setFormData({ ...formData, maintenance_cost: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground">Frequency</Label>
                    <Select
                      value={formData.maintenance_frequency}
                      onValueChange={(v: any) => setFormData({ ...formData, maintenance_frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-100 dark:border-orange-900/30">
            <CardHeader className="bg-orange-50/50 dark:bg-orange-900/10 rounded-t-xl py-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <ShieldAlert className="h-5 w-5" />
                <CardTitle className="text-base uppercase tracking-wider font-bold">Internal Resource Costs</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 uppercase font-black tracking-widest">Admin Only</Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                Track our actual expenses for hosting, APIs, and third-party services. This data is hidden from the client view.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Real Cost to Us</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-orange-400" />
                    <Input
                      type="number"
                      value={formData.internal_resource_cost}
                      onChange={(e) => setFormData({ ...formData, internal_resource_cost: parseFloat(e.target.value) || 0 })}
                      className="pl-9 font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Frequency</Label>
                  <Select
                    value={formData.resource_frequency}
                    onValueChange={(v: any) => setFormData({ ...formData, resource_frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-dashed flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Project Profitability</span>
                <div className={`text-2xl font-black ${
                  (formData.maintenance_cost - formData.internal_resource_cost) >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  ${(formData.maintenance_cost - formData.internal_resource_cost).toLocaleString()}
                  <span className="text-xs font-medium text-muted-foreground ml-1">/{formData.maintenance_frequency === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Configuration */}
        <Card>
          <CardHeader className="py-3 px-6 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase">Deployment Environment Preview</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider">Preview Method</Label>
                  <Select
                    value={formData.live_preview_type}
                    onValueChange={(v) => setFormData({ ...formData, live_preview_type: v as 'url' | 'image' })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">External Live URL (Iframe)</SelectItem>
                      <SelectItem value="image">Static Screenshot / Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider">
                    {formData.live_preview_type === 'url' ? 'Site URL' : 'Project Screenshot'}
                  </Label>
                  {formData.live_preview_type === 'url' ? (
                    <div className="flex gap-2">
                      <Input
                        value={formData.live_preview_url}
                        placeholder="https://example.com"
                        onChange={(e) => setFormData({ ...formData, live_preview_url: e.target.value })}
                      />
                      {formData.live_preview_url && (
                        <Button variant="outline" size="icon" asChild>
                          <a href={formData.live_preview_url} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={formData.live_preview_url}
                          placeholder="Image URL (or upload below)"
                          onChange={(e) => setFormData({ ...formData, live_preview_url: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="h-10 cursor-pointer pt-2"
                        />
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                            <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                            <span className="text-[10px] font-bold uppercase">Uploading...</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground italic uppercase">Max size 5MB. Recommended ratio 16:9</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden bg-neutral-950 aspect-video flex items-center justify-center relative">
                {formData.live_preview_url ? (
                  formData.live_preview_type === 'url' ? (
                    <iframe
                      src={formData.live_preview_url}
                      className="w-full h-full border-none opacity-50 pointer-events-none"
                    />
                  ) : (
                    <img src={formData.live_preview_url} className="w-full h-full object-cover opacity-50" />
                  )
                ) : (
                  <div className="text-center text-neutral-700">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] font-bold uppercase">Preview Component</p>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">LIVE EDITOR PREVIEW</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Technical Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-bold tracking-tight">Technical Infrastructure & Credentials</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border rounded-xl overflow-hidden shadow-sm bg-card">
            {/* Infrastructure Column */}
            <ConfigCategoryColumn
              title="Infrastructure"
              icon={Server}
              category="infra"
              fields={formData.technical_config.filter(f => f.category === 'infra')}
              onAdd={() => addConfigField('infra')}
              onUpdate={updateConfigField}
              onRemove={removeConfigField}
            />

            {/* Administration Column */}
            <ConfigCategoryColumn
              title="Administration"
              icon={Shield}
              category="admin"
              fields={formData.technical_config.filter(f => f.category === 'admin')}
              onAdd={() => addConfigField('admin')}
              onUpdate={updateConfigField}
              onRemove={removeConfigField}
            />

            {/* Deployment Column */}
            <ConfigCategoryColumn
              title="Deployment"
              icon={Rocket}
              category="deploy"
              fields={formData.technical_config.filter(f => f.category === 'deploy')}
              onAdd={() => addConfigField('deploy')}
              onUpdate={updateConfigField}
              onRemove={removeConfigField}
            />
          </div>
        </div>

        {/* Bottom Row: Tickets & Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets Section */}
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  PROJECT SUPPORT TICKETS
                  <Badge variant="secondary" className="font-mono text-[10px] h-4 px-1.5">{project.tickets?.length || 0}</Badge>
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-semibold text-primary">Client Created / Admin Resolved</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {!project.tickets || project.tickets.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm text-muted-foreground italic">No tickets reported by client.</p>
                  </div>
                ) : (
                  project.tickets.map(ticket => (
                    <div key={ticket.id} className="group flex flex-col p-4 hover:bg-muted/30 transition-colors border-l-4 border-l-transparent hover:border-l-primary/50">
                      <div className="flex items-start gap-4">
                        <button onClick={() => {
                          const tickets = project.tickets?.map(t => t.id === ticket.id ? { ...t, completed: !t.completed } : t);
                          handleUpdate({ tickets });
                        }} className="mt-1 transition-transform active:scale-90 flex items-center">
                          {ticket.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/30" />
                          )}
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-bold ${ticket.completed ? 'line-through text-muted-foreground opacity-50' : 'text-foreground'}`}>
                              {ticket.title}
                            </span>
                            {ticket.created_at && (
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                {new Date(ticket.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {ticket.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed italic">
                              {ticket.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-3">
                              {ticket.attachment_url && (
                                <a
                                  href={ticket.attachment_url}
                                  target="_blank"
                                  className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline uppercase tracking-wider"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  View Attachment
                                </a>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold"
                              onClick={() => {
                                const tickets = project.tickets?.filter(t => t.id !== ticket.id);
                                handleUpdate({ tickets });
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card className="flex-1">
            <CardHeader className="py-4 border-b">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  DEVELOPMENT LOGS
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-semibold">Official updates for the client</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {!project.notes || project.notes.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground italic">No logs recorded.</div>
                ) : (
                  <div className="space-y-4">
                    {project.notes.map((note, i) => (
                      <div key={i} className="flex gap-4 group items-start border-l-2 border-primary/20 pl-4 py-1 hover:border-primary transition-colors">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground leading-relaxed italic">"{note}"</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const notes = project.notes?.filter((_, index) => index !== i);
                            handleUpdate({ notes });
                          }}
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="New development log entry..."
                  className="h-9 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                />
                <Button size="icon" className="h-9 w-9" onClick={addNote}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

function ConfigCategoryColumn({ title, icon: Icon, category, fields, onAdd, onUpdate, onRemove }: any) {
  return (
    <div className={`p-6 ${category !== 'deploy' ? 'border-r' : ''} ${category === 'infra' || category === 'deploy' ? 'bg-muted/5' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-xs uppercase tracking-widest">{title}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-6">
        {fields.length === 0 && (
          <div className="py-8 border border-dashed rounded-lg flex items-center justify-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground/30">No parameters</p>
          </div>
        )}
        {fields.map((field: any) => (
          <div key={field.id} className="group space-y-2 relative">
            <div className="flex items-center justify-between gap-2">
              <Input
                value={field.label}
                placeholder="Label (e.g. Host)"
                onChange={e => onUpdate(field.id, { label: e.target.value })}
                className="h-6 border-none p-0 text-[10px] font-black uppercase tracking-wider bg-transparent shadow-none focus-visible:ring-0 text-muted-foreground"
              />
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-5 w-5 ${field.isLink ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={() => onUpdate(field.id, { isLink: !field.isLink })}
                >
                  <LinkIcon className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-5 w-5 ${field.isSecret ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={() => onUpdate(field.id, { isSecret: !field.isSecret })}
                >
                  {field.isSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(field.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Input
                type={field.isSecret ? "password" : "text"}
                value={field.value}
                placeholder="Value..."
                onChange={e => onUpdate(field.id, { value: e.target.value })}
                className="h-8 text-xs font-mono bg-background"
              />
              {field.isLink && field.value && (
                <LinkIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

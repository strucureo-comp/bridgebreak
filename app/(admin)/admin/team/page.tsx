'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import { getUsers, createInvitation, getInvitations } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCog, ShieldCheck, Mail, Briefcase, Code, Plus, Send, Loader2, Clock } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import type { TeamMember, User, UserRole } from '@/lib/db/types';

export default function AdminTeamPage() {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [devs, setDevs] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invite state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'dev' as UserRole
  });

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchTeamData();
    }
  }, [currentUser]);

  const fetchTeamData = async () => {
    try {
      const [membersRef, usersData, invitationsData] = await Promise.all([
        get(ref(database, 'team_members')),
        getUsers(),
        getInvitations()
      ]);

      if (membersRef.exists()) {
        const data: TeamMember[] = [];
        membersRef.forEach((childSnapshot) => {
          data.push({ id: childSnapshot.key, ...childSnapshot.val() } as TeamMember);
        });
        setMembers(data);
      }

      setAdmins(usersData.filter(u => u.role === 'admin'));
      setDevs(usersData.filter(u => u.role === 'dev'));
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setInviteLoading(true);
    try {
      const success = await createInvitation({
        email: inviteData.email,
        role: inviteData.role,
        invited_by: currentUser.id
      });

      if (success) {
        toast.success('Invitation sent successfully');
        setIsInviteOpen(false);
        setInviteData({ email: '', role: 'dev' });
        fetchTeamData(); // Refresh list
      } else {
        toast.error('Failed to send invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setInviteLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary'> = {
      active: 'default',
      inactive: 'secondary',
    };

    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground">Manage your administrators, developers, and operations team</p>
          </div>
          
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="font-bold uppercase tracking-wider text-xs">
                <Plus className="mr-2 h-4 w-4" />
                Invite Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Send Invitation</DialogTitle>
                <DialogDescription>
                  Invite a new member to join your workspace. They will receive an email to register.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="teammate@example.com"
                    required
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Assign Role</Label>
                  <Select
                    value={inviteData.role}
                    onValueChange={(v) => setInviteData({ ...inviteData, role: v as UserRole })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dev">Developer (Access to Projects)</SelectItem>
                      <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={inviteLoading}>
                    {inviteLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
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
        ) : (members.length === 0 && admins.length === 0 && devs.length === 0) ? (
          <EmptyState
            icon={UserCog}
            title="No team members"
            description="Add team members/admins to track your team"
          />
        ) : (
          <div className="space-y-12">
            {/* Administrators Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold uppercase tracking-tight">Project Administrators</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {admins.map((admin) => (
                  <Card key={admin.id} className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{admin.full_name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {admin.email}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-primary text-primary-foreground">Admin</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground italic">
                        Full system administration, finance, and management control.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Developers Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-indigo-500" />
                <h2 className="text-xl font-semibold uppercase tracking-tight">Development Team</h2>
              </div>
              {devs.length === 0 ? (
                <div className="p-8 border-2 border-dashed rounded-xl text-center text-muted-foreground bg-muted/30">
                  <p className="text-sm">No developers assigned yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {devs.map((dev) => (
                    <Card key={dev.id} className="border-indigo-100 dark:border-indigo-900/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{dev.full_name}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {dev.email}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-indigo-600 border-indigo-200">Dev</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground italic">
                          Project deployment, technical infrastructure, and bug tracking.
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* General Team Members Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold uppercase tracking-tight">Operations Team (Internal)</h2>
              </div>
              {members.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    No general team members listed yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {members.map((member) => (
                    <Card key={member.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{member.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{member.email}</p>
                            <p className="text-sm text-muted-foreground font-medium">{member.role}</p>
                          </div>
                          {getStatusBadge(member.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Monthly Salary:</span>
                            <span className="font-medium font-mono">${member.monthly_salary.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Joined:</span>
                            <span>{new Date(member.joined_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Invitations Section */}
            {invitations.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-400" />
                  <h2 className="text-xl font-semibold uppercase tracking-tight">Pending Invitations</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {invitations.filter(i => i.status === 'pending').map((invite) => (
                    <Card key={invite.id} className="border-orange-100 bg-orange-50/20">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-bold truncate max-w-[150px]">{invite.email}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">{invite.role}</Badge>
                            <span className="text-[10px] text-muted-foreground uppercase">{new Date(invite.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">Waiting...</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

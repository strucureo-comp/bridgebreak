'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import { getUsers } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCog, ShieldCheck, Mail, Briefcase } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Separator } from '@/components/ui/separator';
import type { TeamMember, User } from '@/lib/db/types';

export default function AdminTeamPage() {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchTeamData();
    }
  }, [currentUser]);

  const fetchTeamData = async () => {
    try {
      const [membersRef, usersData] = await Promise.all([
        get(ref(database, 'team_members')),
        getUsers()
      ]);

      if (membersRef.exists()) {
        const data: TeamMember[] = [];
        membersRef.forEach((childSnapshot) => {
          data.push({ id: childSnapshot.key, ...childSnapshot.val() } as TeamMember);
        });
        setMembers(data);
      }

      setAdmins(usersData.filter(u => u.role === 'admin'));
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">Manage your team and salaries</p>
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
        ) : (members.length === 0 && admins.length === 0) ? (
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
                <h2 className="text-xl font-semibold">Project Administrators</h2>
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
                        <Badge variant="default" className="bg-primary text-primary-foreground">Admin Account</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground italic">
                        Access: Full system administration, project management, and finance control.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* General Team Members Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Operations Team</h2>
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
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

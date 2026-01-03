'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import { getUsers } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User as UserIcon, Mail, Clock, Video, ArrowRight, ExternalLink } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Separator } from '@/components/ui/separator';
import type { MeetingRequest, User } from '@/lib/db/types';

export default function AdminMeetingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchMeetings();
    }
  }, [user]);

  const fetchMeetings = async () => {
    try {
      const [meetingsSnapshot, usersData] = await Promise.all([
        get(ref(database, 'meeting_requests')),
        getUsers()
      ]);

      if (meetingsSnapshot.exists()) {
        const data: MeetingRequest[] = [];
        meetingsSnapshot.forEach((childSnapshot) => {
          data.push({ id: childSnapshot.key, ...childSnapshot.val() } as MeetingRequest);
        });
        setMeetings(data.sort((a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()));
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching meetings data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meeting Schedule</h1>
          <p className="text-muted-foreground">Coordinate and manage upcoming client consultations</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-48 animate-pulse bg-muted/20 border-none" />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No meeting requests"
            description="Client meeting requests will appear here"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                client={users.find(u => u.id === meeting.client_id)}
                onClick={() => router.push(`/admin/meetings/${meeting.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function MeetingCard({ meeting, client, onClick }: { meeting: MeetingRequest, client?: User, onClick: () => void }) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      accepted: 'default',
      declined: 'destructive',
      completed: 'outline',
    };

    return <Badge variant={variants[status] || 'default'} className="uppercase text-[10px] font-bold tracking-wider">{status}</Badge>;
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
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                {client?.full_name || 'Unknown Client'}
              </span>
            </div>
            <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors tracking-tight line-clamp-1">{meeting.purpose}</CardTitle>
          </div>
          {getStatusBadge(meeting.status)}
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-6 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Calendar className="h-4 w-4 text-primary" />
            {new Date(meeting.requested_date).toLocaleDateString()}
            <span className="mx-1 text-muted-foreground opacity-30">•</span>
            <Clock className="h-4 w-4 text-primary" />
            {new Date(meeting.requested_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
            <div className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              <span>{meeting.duration_minutes}m Session</span>
            </div>
            {meeting.meeting_link && (
              <div className="flex items-center gap-1 text-primary/70">
                <ExternalLink className="h-3 w-3" />
                <span>Link Provided</span>
              </div>
            )}
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground lowercase truncate max-w-[150px]">{client?.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Manage Request <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

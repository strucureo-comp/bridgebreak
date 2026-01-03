'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import type { MeetingRequest } from '@/lib/db/types';

export default function MeetingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMeetings();
    }
  }, [user]);

  const fetchMeetings = async () => {
    const meetingsRef = ref(database, 'meeting_requests');
    const snapshot = await get(meetingsRef);

    if (snapshot.exists()) {
      const data: MeetingRequest[] = [];
      snapshot.forEach((childSnapshot) => {
        const meeting = { id: childSnapshot.key, ...childSnapshot.val() } as MeetingRequest;
        if (meeting.client_id === user?.id) {
          data.push(meeting);
        }
      });
      setMeetings(data.sort((a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()));
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      accepted: 'default',
      declined: 'destructive',
      completed: 'outline',
    };

    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
            <p className="text-muted-foreground">Manage your meeting requests</p>
          </div>
          <Button onClick={() => router.push('/meetings/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Request Meeting
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4">
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
        ) : meetings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No meeting requests"
            description="Request a meeting with our team"
            action={{
              label: 'Request Meeting',
              onClick: () => router.push('/meetings/new'),
            }}
          />
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{meeting.purpose}</CardTitle>
                      <CardDescription className="mt-2">
                        Requested: {new Date(meeting.requested_date).toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(meeting.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{meeting.duration_minutes} minutes</span>
                    </div>
                    {meeting.meeting_link && meeting.status === 'accepted' && (
                      <Button asChild size="sm" className="mt-2">
                        <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                          Join Meeting
                        </a>
                      </Button>
                    )}
                    {meeting.admin_notes && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Admin Notes:</p>
                        <p className="text-sm text-muted-foreground">{meeting.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

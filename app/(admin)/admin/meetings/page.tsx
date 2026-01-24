'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import { getUsers, createMeetingRequest } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User as UserIcon, Mail, Clock, Video, ArrowRight, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import type { MeetingRequest, User } from '@/lib/db/types';

const GOOGLE_CLIENT_ID = '492318876063-omg7187m95qusefkiaih7jvqu5tp8mnc.apps.googleusercontent.com';

function Scheduler({ users, onSuccess }: { users: User[], onSuccess: () => void }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<{
    clientId: string;
    date: string;
    time: string;
    duration: string;
    purpose: string;
    selectedAdmins: string[];
  }>({
    clientId: '',
    date: '',
    time: '',
    duration: '30',
    purpose: '',
    selectedAdmins: [],
  });

  const admins = users.filter(u => u.role === 'admin' && u.id !== user?.id);

  const createCalendarEvent = async (accessToken: string) => {
    try {
      const startTime = new Date(`${formData.date}T${formData.time}`);
      const endTime = new Date(startTime.getTime() + parseInt(formData.duration) * 60000);
      const client = users.find(u => u.id === formData.clientId);

      const event = {
        summary: `BridgeBreak Meeting: ${formData.purpose}`,
        description: `Meeting with BridgeBreak Team.\nPurpose: ${formData.purpose}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: [
          ...(client?.email ? [{ email: client.email }] : []),
          ...formData.selectedAdmins.map(id => {
            const admin = users.find(u => u.id === id);
            return admin?.email ? { email: admin.email } : null;
          }).filter((a): a is { email: string } => a !== null)
        ],
        conferenceData: {
          createRequest: {
            requestId: Math.random().toString(36).substring(7),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error('Failed to create Google Calendar event');
      }

      const data = await response.json();
      return data.hangoutLink || data.htmlLink;
    } catch (error) {
      console.error('Calendar API Error:', error);
      throw error;
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const meetingLink = await createCalendarEvent(tokenResponse.access_token);

        await createMeetingRequest({
          client_id: formData.clientId,
          project_id: '', // Optional
          requested_date: `${formData.date}T${formData.time}`,
          duration_minutes: parseInt(formData.duration),
          purpose: formData.purpose,
          meeting_link: meetingLink,
          admin_notes: 'Scheduled via Admin Dashboard with Google Calendar',
        });

        toast.success('Meeting scheduled and calendar invite sent!');
        setIsOpen(false);
        setFormData({ clientId: '', date: '', time: '', duration: '30', purpose: '', selectedAdmins: [] });
        onSuccess();
      } catch (error) {
        toast.error('Failed to schedule meeting');
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar.events',
  });

  const handleSchedule = () => {
    if (!formData.clientId || !formData.date || !formData.time || !formData.purpose) {
      toast.error('Please fill in all fields');
      return;
    }
    login();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule New Meeting</DialogTitle>
          <DialogDescription>
            This will create a Google Calendar event and notify the client.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Client</Label>
            <Select
              value={formData.clientId}
              onValueChange={(val) => setFormData({ ...formData, clientId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => u.role === 'client').map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="mb-1">CC Admins (Attendees)</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto bg-muted/20">
              {admins.length === 0 ? (
                <p className="text-xs text-muted-foreground">No other admins found.</p>
              ) : (
                admins.map(admin => (
                  <div key={admin.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`admin-${admin.id}`}
                      checked={formData.selectedAdmins.includes(admin.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, selectedAdmins: [...formData.selectedAdmins, admin.id] });
                        } else {
                          setFormData({ ...formData, selectedAdmins: formData.selectedAdmins.filter(id => id !== admin.id) });
                        }
                      }}
                    />
                    <label
                      htmlFor={`admin-${admin.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {admin.full_name} ({admin.email})
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Duration (minutes)</Label>
            <Select
              value={formData.duration}
              onValueChange={(val) => setFormData({ ...formData, duration: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Purpose</Label>
            <Input
              placeholder="e.g. Project Review"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule with Google
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <DashboardShell requireAdmin>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Meeting Schedule</h1>
              <p className="text-muted-foreground">Coordinate and manage upcoming client consultations</p>
            </div>
            <Scheduler users={users} onSuccess={fetchMeetings} />
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
    </GoogleOAuthProvider>
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

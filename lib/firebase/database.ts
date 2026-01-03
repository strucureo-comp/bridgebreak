import { ref, get, set, update, push, remove, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { database } from './config';
import {
  sendWelcomeEmail,
  sendProjectUpdateEmail,
  sendSupportTicketEmail,
  sendInvoiceEmail,
  sendMeetingStatusEmail,
  sendNotificationEmail
} from '../services/email';
import type {
  Project,
  Invoice,
  SupportRequest,
  User,
  ProjectFile,
  ProjectUpdate,
  SupportMessage,
  MeetingRequest,
  PriorityLevel,
  Payment,
  TeamMember,
  SalaryPayment,
  Notification,
} from '@/lib/db/types';

function cleanData(data: any) {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
}

export async function getProjects(clientId?: string): Promise<Project[]> {
  try {
    const projectsRef = ref(database, 'projects');
    const snapshot = await get(projectsRef);

    if (!snapshot.exists()) return [];

    const projects: Project[] = [];
    snapshot.forEach((childSnapshot) => {
      const project = { id: childSnapshot.key, ...childSnapshot.val() } as Project;
      if (!clientId || project.client_id === clientId) {
        projects.push(project);
      }
    });

    return projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const projectRef = ref(database, `projects/${projectId}`);
    const snapshot = await get(projectRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as Project;
  } catch (error) {
    console.error('Error getting project:', error);
    return null;
  }
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const projectsRef = ref(database, 'projects');
    const newProjectRef = push(projectsRef);

    const projectData = cleanData({
      ...project,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newProjectRef, projectData);

    // Notify Client
    await createNotification({
      user_id: project.client_id,
      title: 'New Project Created',
      message: `Your project "${project.title}" has been created and is now active.`,
      type: 'project',
      link: `/projects/${newProjectRef.key}`,
      read: false
    });

    return newProjectRef.key;
  } catch (error) {
    console.error('Error creating project:', error);
    return null;
  }
}

export async function updateProject(projectId: string, updates: Partial<Project>, updatedBy?: string): Promise<boolean> {
  try {
    const projectRef = ref(database, `projects/${projectId}`);
    const snapshot = await get(projectRef);
    const oldProject = snapshot.val() as Project;

    await update(projectRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    // Notify client and admin of the update
    if (oldProject) {
      // Notify Client
      await createNotification({
        user_id: oldProject.client_id,
        title: 'Project Updated',
        message: `Your project "${oldProject.title}" has been updated.`,
        type: 'project',
        link: `/projects/${projectId}`,
        read: false
      });

      // Notify Admins (except if updated by admin, but for now broad casting is safer for "every update")
      const admins = await getAdmins();
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: 'Project Updated',
          message: `Project "${oldProject.title}" has been updated.`,
          type: 'project',
          link: `/admin/projects/${projectId}`,
          read: false
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating project:', error);
    return false;
  }
}

export async function getInvoices(clientId?: string): Promise<Invoice[]> {
  try {
    const invoicesRef = ref(database, 'invoices');
    const snapshot = await get(invoicesRef);

    if (!snapshot.exists()) return [];

    const invoices: Invoice[] = [];
    snapshot.forEach((childSnapshot) => {
      const invoice = { id: childSnapshot.key, ...childSnapshot.val() } as Invoice;
      if (!clientId || invoice.client_id === clientId) {
        invoices.push(invoice);
      }
    });

    return invoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting invoices:', error);
    return [];
  }
}
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  try {
    const invoiceRef = ref(database, `invoices/${invoiceId}`);
    const snapshot = await get(invoiceRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as Invoice;
  } catch (error) {
    console.error('Error getting invoice:', error);
    return null;
  }
}

export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<boolean> {
  try {
    const invoiceRef = ref(database, `invoices/${invoiceId}`);
    const snapshot = await get(invoiceRef);
    const invoice = snapshot.val() as Invoice;

    await update(invoiceRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    if (invoice && updates.status && updates.status === 'paid') {
      // Notify Admin that client paid
      const admins = await getAdmins();
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: 'Invoice Paid',
          message: `Invoice ${invoice.invoice_number} has been marked as paid.`,
          type: 'payment',
          link: `/admin/invoices`,
          read: false
        });
      }

      // Also notify client that payment was received
      await createNotification({
        user_id: invoice.client_id,
        title: 'Payment Received',
        message: `We have received your payment for Invoice ${invoice.invoice_number}. Thank you!`,
        type: 'payment',
        link: `/invoices/${invoiceId}`,
        read: false
      });
    } else if (invoice) {
      // For any other update (like status change to pending/overdue or amount update), notify client
      await createNotification({
        user_id: invoice.client_id,
        title: 'Invoice Updated',
        message: `Invoice ${invoice.invoice_number} has been updated.`,
        type: 'payment',
        link: `/invoices/${invoiceId}`,
        read: false
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating invoice:', error);
    return false;
  }
}

export async function createInvoice(invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const invoicesRef = ref(database, 'invoices');
    const newInvoiceRef = push(invoicesRef);

    const invoiceData = cleanData({
      ...invoice,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newInvoiceRef, invoiceData);

    // Notify Client
    await createNotification({
      user_id: invoice.client_id,
      title: 'New Invoice Issued',
      message: `A new invoice ${invoice.invoice_number} for $${invoice.amount} has been issued.`,
      type: 'payment',
      link: `/invoices`,
      read: false
    });

    return newInvoiceRef.key;
  } catch (error) {
    console.error('Error creating invoice:', error);
    return null;
  }
}

export async function getSupportRequests(clientId?: string): Promise<SupportRequest[]> {
  try {
    const supportRef = ref(database, 'support_requests');
    const snapshot = await get(supportRef);

    if (!snapshot.exists()) return [];

    const requests: SupportRequest[] = [];
    snapshot.forEach((childSnapshot) => {
      const request = { id: childSnapshot.key, ...childSnapshot.val() } as SupportRequest;
      if (!clientId || request.client_id === clientId) {
        requests.push(request);
      }
    });

    return requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting support requests:', error);
    return [];
  }
}

export async function getSupportRequest(requestId: string): Promise<SupportRequest | null> {
  try {
    const supportRef = ref(database, `support_requests/${requestId}`);
    const snapshot = await get(supportRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as SupportRequest;
  } catch (error) {
    console.error('Error getting support request:', error);
    return null;
  }
}

export async function updateSupportRequest(requestId: string, updates: Partial<SupportRequest>): Promise<boolean> {
  try {
    const supportRef = ref(database, `support_requests/${requestId}`);
    const snapshot = await get(supportRef);
    const request = snapshot.val() as SupportRequest;

    await update(supportRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    if (request && updates.status && updates.status !== request.status) {
      await createNotification({
        user_id: request.client_id,
        title: 'Support Ticket Updated',
        message: `Your ticket "${request.subject}" has been marked as ${updates.status.replace('_', ' ')}.`,
        type: 'support',
        link: `/support/${requestId}`,
        read: false
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating support request:', error);
    return false;
  }
}

export async function createSupportRequest(request: Omit<SupportRequest, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const supportRef = ref(database, 'support_requests');
    const newRequestRef = push(supportRef);

    const requestData = cleanData({
      ...request,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newRequestRef, requestData);

    // Notify Admin
    const admins = await getAdmins();
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        title: 'New Support Ticket',
        message: `A new ticket "${request.subject}" has been submitted.`,
        type: 'support',
        link: `/admin/support/${newRequestRef.key}`,
        read: false
      });
    }

    return newRequestRef.key;
  } catch (error) {
    console.error('Error creating support request:', error);
    return null;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return [];

    const users: User[] = [];
    snapshot.forEach((childSnapshot) => {
      users.push({ id: childSnapshot.key, ...childSnapshot.val() } as User);
    });

    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as User;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function createUser(userId: string, userData: Omit<User, 'id'>): Promise<boolean> {
  try {
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, cleanData(userData));

    // Notify Admin of new user
    const admins = await getAdmins();
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        title: 'New User Registered',
        message: `${userData.full_name} has registered as a ${userData.role}.`,
        type: 'system',
        link: `/admin/users`, // Assuming there is a users list
        read: false
      });
    }

    // Send Welcome Email
    await sendWelcomeEmail(userData.email, userData.full_name);

    return true;
  } catch (error) {
    console.error('Error creating user:', error);
    return false;
  }
}

async function getAdmins(): Promise<User[]> {
  const allUsers = await getUsers();
  return allUsers.filter(u => u.role === 'admin');
}

export async function createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const notificationsRef = ref(database, 'notifications');
    const newNotificationRef = push(notificationsRef);

    const notificationData = cleanData({
      ...notification,
      created_at: new Date().toISOString(),
    });

    await set(newNotificationRef, notificationData);

    // Trigger Email
    const user = await getUser(notification.user_id);
    if (user) {
      switch (notification.type) {
        case 'project':
          await sendProjectUpdateEmail(user.email, notification.title, notification.message, 'BridgeBreak Team');
          break;
        case 'support':
          await sendSupportTicketEmail(user.email, notification.title, notification.message, user.full_name, user.role === 'admin');
          break;
        case 'payment':
          await sendNotificationEmail(user.email, notification.title, notification.title, notification.message, notification.link);
          break;
        case 'meeting':
          await sendNotificationEmail(user.email, notification.title, notification.title, notification.message, notification.link);
          break;
        case 'system':
          await sendNotificationEmail(user.email, notification.title, notification.title, notification.message, notification.link);
          break;
      }
    }

    return newNotificationRef.key;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const notificationsRef = ref(database, 'notifications');
    const snapshot = await get(notificationsRef);

    if (!snapshot.exists()) return [];

    const notifications: Notification[] = [];
    snapshot.forEach((childSnapshot) => {
      const notification = { id: childSnapshot.key, ...childSnapshot.val() } as Notification;
      if (notification.user_id === userId) {
        notifications.push(notification);
      }
    });

    return notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const notificationRef = ref(database, `notifications/${notificationId}`);
    await update(notificationRef, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function createMeetingRequest(meeting: Omit<MeetingRequest, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<string | null> {
  try {
    const meetingsRef = ref(database, 'meeting_requests');
    const newMeetingRef = push(meetingsRef);

    const meetingData = cleanData({
      ...meeting,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newMeetingRef, meetingData);

    // Notify Admin
    const admins = await getAdmins();
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        title: 'New Meeting Request',
        message: `A new meeting for "${meeting.purpose}" has been requested.`,
        type: 'meeting',
        link: `/admin/meetings`,
        read: false
      });
    }

    return newMeetingRef.key;
  } catch (error) {
    console.error('Error creating meeting request:', error);
    return null;
  }
}

export async function getMeeting(meetingId: string): Promise<MeetingRequest | null> {
  try {
    const meetingRef = ref(database, `meeting_requests/${meetingId}`);
    const snapshot = await get(meetingRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as MeetingRequest;
  } catch (error) {
    console.error('Error getting meeting:', error);
    return null;
  }
}

export async function updateMeeting(meetingId: string, updates: Partial<MeetingRequest>): Promise<boolean> {
  try {
    const meetingRef = ref(database, `meeting_requests/${meetingId}`);
    const snapshot = await get(meetingRef);
    const meeting = snapshot.val() as MeetingRequest;

    await update(meetingRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    if (meeting && updates.status && updates.status !== meeting.status) {
      // Notify Client
      await createNotification({
        user_id: meeting.client_id,
        title: 'Meeting Updated',
        message: `Your meeting request for "${meeting.purpose}" has been ${updates.status}.`,
        type: 'meeting',
        link: `/meetings`,
        read: false
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating meeting:', error);
    return false;
  }
}


import { NextResponse } from 'next/server';
import { getProjects, createInvoice, updateProject } from '@/lib/firebase/database';
import { Project } from '@/lib/db/types';

export async function GET(req: Request) {
  // Security check: only allow authorized calls (e.g., from Vercel Cron or a secret header)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const projects = await getProjects();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const billingResults = [];

    for (const project of projects) {
      // Check if project has recurring billing set up
      if (project.maintenance_cost && project.next_billing_date) {
        const billingDate = new Date(project.next_billing_date);
        billingDate.setHours(0, 0, 0, 0);

        // If today is on or after the next billing date
        if (today >= billingDate) {
          console.log(`Processing billing for project: ${project.title} (${project.id})`);

          // 1. Generate Invoice Number
          const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${project.title.slice(0, 3).toUpperCase()}`;

          // 2. Create Invoice
          const invoiceId = await createInvoice({
            project_id: project.id,
            client_id: project.client_id,
            invoice_number: invoiceNumber,
            amount: project.maintenance_cost,
            due_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
            status: 'pending',
            description: `Recurring maintenance fee for project: ${project.title} (${project.maintenance_frequency})`,
          });

          if (invoiceId) {
            // 3. Calculate next billing date
            const nextDate = new Date(billingDate);
            if (project.maintenance_frequency === 'yearly') {
              nextDate.setFullYear(nextDate.getFullYear() + 1);
            } else {
              nextDate.setMonth(nextDate.getMonth() + 1);
            }

            // 4. Update project's next billing date
            await updateProject(project.id, {
              next_billing_date: nextDate.toISOString()
            });

            billingResults.push({
              project: project.title,
              invoice: invoiceNumber,
              status: 'success'
            });
          } else {
            billingResults.push({
              project: project.title,
              status: 'failed',
              error: 'Failed to create invoice'
            });
          }
        }
      }
    }

    return NextResponse.json({
      processed: true,
      timestamp: new Date().toISOString(),
      results: billingResults
    });

  } catch (error) {
    console.error('Cron Billing Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

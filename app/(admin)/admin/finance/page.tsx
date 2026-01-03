'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getInvoices } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/common/stats-card';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import type { Invoice } from '@/lib/db/types';

export default function AdminFinancePage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const invoicesData = await getInvoices();
    setInvoices(invoicesData);
    setLoading(false);
  };

  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const pendingRevenue = invoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;

  return (
    <DashboardShell requireAdmin>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">Track revenue and expenses</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Total Revenue"
            value={`$${totalRevenue.toFixed(2)}`}
            description="Paid invoices"
            icon={DollarSign}
          />
          <StatsCard
            title="Pending Revenue"
            value={`$${pendingRevenue.toFixed(2)}`}
            description="Unpaid invoices"
            icon={TrendingUp}
          />
          <StatsCard
            title="Paid Invoices"
            value={paidInvoices}
            description="Total completed"
            icon={Users}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.filter((inv) => inv.status === 'paid').length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No paid invoices yet</p>
            ) : (
              <div className="space-y-3">
                {invoices
                  .filter((inv) => inv.status === 'paid')
                  .slice(0, 10)
                  .map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.paid_at || invoice.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-semibold text-green-600">
                        +${invoice.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

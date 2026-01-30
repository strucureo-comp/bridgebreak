'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getProjects, getSupportRequests, getUsers, getInvoices, getTransactions } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FinanceCharts } from '@/components/admin/finance-charts';
import { ProjectStats } from '@/components/admin/project-stats';
import type { Project, SupportRequest, Invoice, Transaction } from '@/lib/db/types';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Suppress Recharts defaultProps warning
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (typeof args[0] === 'string' && /defaultProps/.test(args[0])) return;
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [projectsData, invoicesData, transactionsData] = await Promise.all([
        getProjects(),
        getInvoices(),
        getTransactions(),
      ]);

      setProjects(projectsData);
      setInvoices(invoicesData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };



  return (
    <DashboardShell requireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Business Overview</p>
        </div>

        {/* Top Section: High-level Project Stats */}
        <ProjectStats projects={projects} />

        {/* Middle Section: Financial Visuals */}
        <FinanceCharts invoices={invoices} transactions={transactions} />

        {/* We can leave the detailed list for sub-pages or a simplified "Recent Activity" here if needed, 
            but for "static/visual" emphasis, charts are primary. 
            The FinanceCharts already has two major charts. 
            ProjectStats has 4 mini-cards + a small pie chart.
        */}
      </div>
    </DashboardShell>
  );
}

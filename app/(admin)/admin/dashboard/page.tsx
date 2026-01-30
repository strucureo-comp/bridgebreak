'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getProjects, getSupportRequests, getUsers, getInvoices, getTransactions } from '@/lib/firebase/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FinanceCharts } from '@/components/admin/finance-charts';
import { ProjectStats } from '@/components/admin/project-stats';
import type { Project, SupportRequest, Invoice, Transaction } from '@/lib/db/types';

import Link from 'next/link';
import { adminNavItems } from '@/components/layout/dashboard-nav';
import { cn } from '@/lib/utils';
import { Monitor, Smartphone, Globe, Cloud } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep existing loading
  const [loading, setLoading] = useState(true);

  // ... (useEffects for time and data fetching remain same)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      <div
        className="relative min-h-[calc(100vh-6rem)] overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm"
      >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-multiply" />

        <div className="relative z-10 flex h-full flex-col p-6 text-slate-900 md:p-8">

          {/* Top Bar - Weather & Date */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 bg-slate-100/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              <Cloud className="h-5 w-5 text-blue-500" />
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold text-slate-700">24°</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Sunny</span>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-5xl font-extralight tracking-tight text-slate-900 drop-shadow-sm">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </h2>
              <p className="text-sm font-medium text-slate-500 tracking-wide uppercase mt-1">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

            {/* Left: Desktop Icons (Apps) */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 content-start">
              {adminNavItems.filter(item => item.title !== 'Dashboard').map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl hover:bg-slate-100/50 transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-xl shadow-blue-500/10 ring-1 ring-black/5 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-600 text-center group-hover:text-slate-900 transition-colors">
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Right: Clean Glass Widgets Panel */}
            <div className="lg:col-span-4 space-y-6">

              {/* Simplified Stats Widget */}
              <div className="group rounded-3xl p-6 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 transition-all duration-300 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  System Status
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="text-2xl font-light text-slate-900 mb-1">{projects.length}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Projects</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="text-2xl font-light text-blue-600 mb-1">
                      {projects.filter(p => ['accepted', 'in_progress'].includes(p.status)).length}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="text-2xl font-light text-emerald-600 mb-1">
                      {projects.filter(p => p.status === 'completed').length}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Completed</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="text-2xl font-light text-amber-600 mb-1">
                      {projects.filter(p => ['pending', 'under_review'].includes(p.status)).length}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pending</div>
                  </div>
                </div>
              </div>

              {/* Simplified Finance Widget */}
              <div className="group rounded-3xl p-6 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 transition-all duration-300 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  Finance Snapshot
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end pb-3 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-600">Revenue (Paid)</span>
                    <span className="text-xl font-light text-emerald-600">
                      ${invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-end pb-3 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-600">Pending</span>
                    <span className="text-xl font-light text-amber-600">
                      ${invoices.filter(i => i.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-end pb-1">
                    <span className="text-sm font-medium text-slate-600">Expenses</span>
                    <span className="text-xl font-light text-red-600">
                      ${transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

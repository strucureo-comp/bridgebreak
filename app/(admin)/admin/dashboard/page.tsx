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
import { Monitor, Smartphone, Globe, Cloud, Sun, Maximize2, Minimize2, Image as ImageIcon, Plus } from 'lucide-react';

const BACKGROUNDS = [
  // High-quality Nature Images (Mountains, Forests, Oceans, Sky)
  // Optimized: Lower resolution (w=1280), quality (q=60) for performance
  "url('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1280&q=60')",
  "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1280&q=60')",
  "url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1280&q=60')",
  "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&q=60')",
  "url('https://images.unsplash.com/photo-1519681393798-3828fb4090bb?auto=format&fit=crop&w=1280&q=60')",
  "url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1280&q=60')",
  "url('https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1280&q=60')",
  "url('https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1280&q=60')",
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  // Keep existing loading
  const [loading, setLoading] = useState(true);

  // Auto-switch background every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUNDS.length);
    }, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(interval);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Listen for fullscreen change events (ESC key etc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
        className="relative min-h-[calc(100vh-6rem)] overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm transition-all duration-500"
      >
        {/* Dynamic Background Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[3000ms] ease-in-out opacity-20 will-change-[opacity,background-image]"
          style={{ backgroundImage: BACKGROUNDS[bgIndex] }}
        />
        
        {/* Optimized Noise: Lower opacity, pointer-events-none */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-multiply pointer-events-none" />

        <div className="relative z-10 flex h-full flex-col p-6 text-slate-900 md:p-8">

          {/* Top Bar - Weather, Time & Controls */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/50 shadow-sm transition-all hover:shadow-md hover:bg-white/80 group">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <Sun className="absolute h-8 w-8 text-amber-400 animate-pulse-glow" strokeWidth={1.5} />
                  <Cloud className="absolute h-8 w-8 text-blue-400/90 fill-white animate-float translate-x-2 translate-y-1" strokeWidth={1.5} />
                  <Cloud className="absolute h-5 w-5 text-blue-300/80 fill-white animate-float-delayed -translate-x-2 translate-y-2 opacity-80" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col leading-none">
                  <div className="flex items-start gap-1">
                    <span className="text-2xl font-light text-slate-800 tracking-tight">24</span>
                    <span className="text-sm text-slate-500 font-normal mt-1">°C</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest pt-1">Partly Cloudy</span>
                </div>
              </div>

              <Link
                href="/admin/projects/new"
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95 font-semibold text-sm"
              >
                <Plus className="h-4 w-4" />
                New Project
              </Link>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <h2 className="text-5xl font-extralight tracking-tight text-slate-900 drop-shadow-sm">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h2>
                <p className="text-sm font-medium text-slate-500 tracking-wide uppercase mt-1">
                  {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-3 space-x-2 border-l border-slate-200/30 pl-6">
                <button
                  onClick={() => setBgIndex((prev) => (prev + 1) % BACKGROUNDS.length)}
                  className="p-3 rounded-full bg-white/40 hover:bg-white border border-white/50 shadow-sm backdrop-blur-sm transition-all hover:scale-105 active:scale-95 text-slate-600 hover:text-slate-900 hover:shadow-md"
                  title="Switch Background"
                >
                  <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <button 
                  onClick={toggleFullScreen}
                  className="p-3 rounded-full bg-white/40 hover:bg-white border border-white/50 shadow-sm backdrop-blur-sm transition-all hover:scale-105 active:scale-95 text-slate-600 hover:text-slate-900 hover:shadow-md"
                  title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                >
                  {isFullscreen ? <Minimize2 className="h-5 w-5" strokeWidth={1.5} /> : <Maximize2 className="h-5 w-5" strokeWidth={1.5} />}
                </button>
              </div>
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

'use client';

import { DashboardNav } from './dashboard-nav';

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 border-r bg-background md:block">
      <DashboardNav />
    </aside>
  );
}

'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function DashboardShell({ user, children }) {
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const collapsed = true;

  return (
    <div className={`shell${collapsed ? ' sidebar-collapsed' : ''}${collapsed && sidebarHovered ? ' sidebar-hovered' : ''}`}>
      <Sidebar
        user={user}
        collapsed={collapsed}
        expandedOnHover={sidebarHovered}
        onSidebarHover={setSidebarHovered}
      />
      <main className="content">{children}</main>
    </div>
  );
}

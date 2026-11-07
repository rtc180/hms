'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { organization } from '@/config/organization';
import { apiFetch } from '@/lib/clientApi';

const NAV_ICONS = {
  '/dashboard': <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  '/dashboard/patients': <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  '/dashboard/admissions': <><path d="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16" /><path d="M9 21v-6h6v6M12 7v5m-2.5-2.5h5" /></>,
  '/dashboard/reports': <><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v6h6M9 14h6m-6 4h6" /></>,
  '/dashboard/users': <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0m2-9a3 3 0 1 0 0-6m1 9a5 5 0 0 1 3 5" /></>,
  '/dashboard/settings': <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7 15a8 8 0 0 1 0-2l-1.4-1.1L7 9.5l1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4L19.4 13a8 8 0 0 1 0 2Z" /></>,
  '/dashboard/audit-logs': <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  '/dashboard/pharmacy': <><path d="m10 3 4 0M12 3v6m-5 0h10a3 3 0 0 1 3 3v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5a3 3 0 0 1 3-3Z" /><path d="M8 14h8m-4-4v8" /></>,
  '/dashboard/billing': <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18m-13 5h4" /></>,
};

function Icon({ href }) {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {NAV_ICONS[href]}
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function Sidebar({ user, collapsed, expandedOnHover, onSidebarHover }) {
  const pathname = usePathname();              // Current page address
  const router = useRouter();
  const [open, setOpen] = useState(false);     // Is the mobile menu open?

  // Menu items. "roles" lists who can see each link.
  const links = [
    { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'doctor', 'nurse'] },
    { href: '/dashboard/patients', label: 'Patients', roles: ['admin', 'doctor', 'nurse'] },
    { href: '/dashboard/admissions', label: 'Inpatient admissions', roles: ['admin', 'doctor', 'nurse'] },
    { href: '/dashboard/reports', label: 'Reports', roles: ['admin', 'doctor', 'nurse'] },
    { href: '/dashboard/users', label: 'Staff accounts', roles: ['admin'] },
    { href: '/dashboard/settings', label: 'Settings', roles: ['admin', 'doctor', 'nurse'] },
    { href: '/dashboard/audit-logs', label: 'Audit log', roles: ['admin'] },
    { href: '/dashboard/pharmacy', label: 'Pharmacy', roles: ['admin', 'nurse'] },
    { href: '/dashboard/billing', label: 'Billing', roles: ['admin', 'nurse'] },
  ];

  // Keep only the links this user is allowed to see
  const visibleLinks = links.filter((link) => link.roles.includes(user.role));
  const primaryLinks = visibleLinks.filter((link) => !['/dashboard/settings', '/dashboard/audit-logs'].includes(link.href));
  const bottomLinks = visibleLinks.filter((link) => ['/dashboard/settings', '/dashboard/audit-logs'].includes(link.href));

  // Is this link the current page? Dashboard must match exactly; others match their sub-pages too.
  function isCurrent(href) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  // Log out then go to the login page
  async function handleLogout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Top bar: only visible on phones and tablets */}
      <div className="topbar">
        <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <MenuIcon />
        </button>
        <strong>{organization.shortName}</strong>
      </div>

      {/* Dark layer behind the open menu; tapping it closes the menu */}
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <aside
        className={`sidebar${open ? ' open' : ''}${collapsed ? ' collapsed' : ''}${expandedOnHover ? ' hover-expanded' : ''}`}
        onPointerEnter={() => onSidebarHover(true)}
        onPointerLeave={() => onSidebarHover(false)}
        onFocusCapture={() => onSidebarHover(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) onSidebarHover(false);
        }}
      >
        <div className="brand">
          <Image src={organization.logo} alt={`${organization.name} logo`} width={120} height={120} priority />
        </div>

        <nav className="nav" aria-label="Main">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              title={link.label}
              aria-current={isCurrent(link.href) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon href={link.href} />
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </nav>

        <nav className="nav nav-bottom" aria-label="Settings and audit">
          {bottomLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              title={link.label}
              aria-current={isCurrent(link.href) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon href={link.href} />
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="who">
          <strong>{user.name}</strong>
          <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
            </svg>
            <span className="sign-out-label">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// Layout for every page under /dashboard: sidebar + content area.
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import DashboardShell from '@/components/DashboardShell';
import { UserProvider } from '@/components/UserContext';

// Private pages must never appear in search results
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({ children }) {
  // Second line of defence (middleware is the first): no session means back to login
  const session = await getSession();
  if (!session) redirect('/login');

  // Only pass the safe details to the browser
  const user = { id: session.id, name: session.name, role: session.role };

  return (
    <UserProvider user={user}>
      <DashboardShell user={user}>{children}</DashboardShell>
    </UserProvider>
  );
}

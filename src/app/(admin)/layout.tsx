import { redirect } from 'next/navigation';
import { getValidatedSessionUser } from '@/server/session-validation';
import { DashboardShell } from '@/components/modules/dashboard/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getValidatedSessionUser();
  if (!user) {
    redirect('/api/auth/clear-session?then=/login');
  }

  return (
    <main className='min-h-screen flex flex-col fixed inset-0 w-full'>
      <DashboardShell userEmail={user.email}>
        {children}
      </DashboardShell>
    </main>
  );
}

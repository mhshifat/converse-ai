import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { DashboardShell } from '@/components/modules/dashboard/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.user) {
    redirect('/login');
  }

  return (
    <main className='min-h-screen flex flex-col fixed inset-0 w-full'>
      <DashboardShell userEmail={session.user.email}>
        {children}
      </DashboardShell>
    </main>
  );
}

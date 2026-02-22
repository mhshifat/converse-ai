'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';

export function LogoutButton({
  className,
  children = 'Log out',
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      router.push('/login');
    },
  });

  return (
    <Button
      type="button"
      variant="ghost"
      className={className}
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
    >
      {logout.isPending ? 'Logging out…' : children}
    </Button>
  );
}

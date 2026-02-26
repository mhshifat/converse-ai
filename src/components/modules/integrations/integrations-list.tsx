'use client';

import React from 'react';
import { trpc } from '@/utils/trpc';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Plug, Mail, MessageCircle, Phone } from 'lucide-react';

const typeLabel: Record<string, string> = {
  email: 'Email',
  discord: 'Discord',
  sms: 'SMS',
};

const typeIcon: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  discord: <MessageCircle className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
};

export function IntegrationsList() {
  const { data, isLoading, isError, error } = trpc.integrations.list.useQuery();

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full mt-2" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        {error.message}
      </div>
    );
  }

  const isEmpty = !data?.length;

  return (
    <div className="rounded-lg border bg-card">
      {isEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Plug className="h-12 w-12 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No integrations yet</EmptyTitle>
            <EmptyDescription>
              Add email, Discord, or SMS from a project: open a project → Integrations → Delivery
              integrations.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Config</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="flex items-center gap-2">
                  {typeIcon[i.type]}
                  {typeLabel[i.type] ?? i.type}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                  {i.type === 'discord' && 'webhookUrl' in i.config
                    ? String(i.config.webhookUrl).slice(0, 40) + '…'
                    : i.type === 'email'
                      ? (i.config.to as string) ?? (i.config.from as string) ?? 'System default'
                      : i.type === 'sms'
                        ? (i.config.to as string) ?? (i.config.from as string) ?? 'System default'
                        : '—'}
                </TableCell>
                <TableCell>
                  <Link href={`/integrations/${i.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

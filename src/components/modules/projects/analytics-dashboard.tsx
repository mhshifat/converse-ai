'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BarChart3, MessageSquare, Clock, CheckCircle, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';

interface AnalyticsDashboardProps {
  projectId: string;
}

export function AnalyticsDashboard({ projectId }: AnalyticsDashboardProps) {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString().slice(0, 10);
  });

  const dateFromObj = new Date(dateFrom);
  dateFromObj.setHours(0, 0, 0, 0);
  const dateToObj = new Date(dateTo);
  dateToObj.setHours(23, 59, 59, 999);

  const { data, isLoading } = trpc.analytics.getDashboard.useQuery(
    {
      projectId,
      dateFrom: dateFromObj,
      dateTo: dateToObj,
    },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-32 w-48" />
          <Skeleton className="h-32 w-48" />
          <Skeleton className="h-32 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const d = data ?? {
    volume: { total: 0, active: 0, closed: 0 },
    replyTime: { avgMinutes: 0, p95Minutes: 0, sampleCount: 0 },
    resolutionRate: 0,
    csat: { thumbsUp: 0, thumbsDown: 0, total: 0, rate: null },
    nps: { score: null, promoters: 0, passives: 0, detractors: 0, total: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateFrom">From</Label>
          <Input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateTo">To</Label>
          <Input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.volume.total}</div>
            <p className="text-xs text-muted-foreground">
              {d.volume.active} active, {d.volume.closed} closed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg reply time</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {d.replyTime.sampleCount === 0
                ? '—'
                : `${d.replyTime.avgMinutes.toFixed(1)} min`}
            </div>
            <p className="text-xs text-muted-foreground">
              p95: {d.replyTime.sampleCount === 0 ? '—' : `${d.replyTime.p95Minutes.toFixed(1)} min`} ({d.replyTime.sampleCount} samples)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution rate</CardTitle>
            <CheckCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {d.volume.closed === 0 ? '—' : `${(d.resolutionRate * 100).toFixed(0)}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Closed with resolution
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CSAT (thumbs)</CardTitle>
            <div className="flex gap-1">
              <ThumbsUp className="size-4 text-emerald-600" />
              <ThumbsDown className="size-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {d.csat.rate != null ? `${(d.csat.rate * 100).toFixed(0)}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {d.csat.thumbsUp} up / {d.csat.thumbsDown} down (n={d.csat.total})
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">NPS</CardTitle>
          <TrendingUp className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {d.nps.score != null ? d.nps.score : '—'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Promoters {d.nps.promoters} · Passives {d.nps.passives} · Detractors {d.nps.detractors} (n={d.nps.total})
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

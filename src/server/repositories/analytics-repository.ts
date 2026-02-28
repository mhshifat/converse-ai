import { prisma } from '@/lib/prisma';

export interface AnalyticsDashboardInput {
  projectId: string;
  tenantId: string;
  dateFrom: Date;
  dateTo: Date;
}

export interface AnalyticsDashboardResult {
  volume: { total: number; active: number; closed: number };
  replyTime: { avgMinutes: number; p95Minutes: number; sampleCount: number };
  resolutionRate: number; // closed with ended_at / total closed
  csat: { thumbsUp: number; thumbsDown: number; total: number; rate: number | null };
  nps: { score: number | null; promoters: number; passives: number; detractors: number; total: number };
}

export async function getAnalyticsDashboard(
  input: AnalyticsDashboardInput
): Promise<AnalyticsDashboardResult> {
  const { projectId, tenantId, dateFrom, dateTo } = input;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
    select: { id: true },
  });
  if (!project) {
    return {
      volume: { total: 0, active: 0, closed: 0 },
      replyTime: { avgMinutes: 0, p95Minutes: 0, sampleCount: 0 },
      resolutionRate: 0,
      csat: { thumbsUp: 0, thumbsDown: 0, total: 0, rate: null },
      nps: { score: null, promoters: 0, passives: 0, detractors: 0, total: 0 },
    };
  }

  const where = {
    chatbot: { project_id: projectId },
    started_at: { gte: dateFrom, lte: dateTo },
  };

  const [conversations, replyTimeRows, ratingRows] = await Promise.all([
    prisma.conversation.findMany({
      where,
      select: {
        status: true,
        ended_at: true,
        first_response_at: true,
        started_at: true,
        rating_type: true,
        rating_value: true,
      },
    }),
    prisma.conversation.findMany({
      where: { ...where, first_response_at: { not: null } },
      select: {
        started_at: true,
        first_response_at: true,
      },
    }),
    prisma.conversation.findMany({
      where: { ...where, rating_type: { not: null }, rating_value: { not: null } },
      select: { rating_type: true, rating_value: true },
    }),
  ]);

  const total = conversations.length;
  const active = conversations.filter((c) => c.status === 'active').length;
  const closed = conversations.filter((c) => c.status === 'closed').length;
  const withEndedAt = conversations.filter((c) => c.ended_at != null).length;
  const resolutionRate = closed > 0 ? withEndedAt / closed : 0;

  const replyMinutes = replyTimeRows
    .map((c) => {
      const start = c.started_at.getTime();
      const first = (c.first_response_at as Date).getTime();
      return (first - start) / (60 * 1000);
    })
    .filter((m) => m >= 0);
  const avgMinutes =
    replyMinutes.length > 0
      ? replyMinutes.reduce((a, b) => a + b, 0) / replyMinutes.length
      : 0;
  const sorted = [...replyMinutes].sort((a, b) => a - b);
  const p95Idx = Math.floor(sorted.length * 0.95);
  const p95Minutes = sorted.length > 0 ? sorted[p95Idx] ?? sorted[sorted.length - 1]! : 0;

  const thumbs = ratingRows.filter((r) => r.rating_type === 'thumbs');
  const thumbsUp = thumbs.filter((r) => (r.rating_value ?? 0) > 0).length;
  const thumbsDown = thumbs.filter((r) => (r.rating_value ?? 0) < 0).length;
  const csatTotal = thumbs.length;
  const csatRate = csatTotal > 0 ? thumbsUp / csatTotal : null;

  const npsRows = ratingRows.filter((r) => r.rating_type === 'nps');
  const promoters = npsRows.filter((r) => (r.rating_value ?? 0) >= 9).length;
  const passives = npsRows.filter((r) => {
    const v = r.rating_value ?? 0;
    return v >= 7 && v <= 8;
  }).length;
  const detractors = npsRows.filter((r) => (r.rating_value ?? 0) <= 6).length;
  const npsTotal = npsRows.length;
  const npsScore =
    npsTotal > 0
      ? Math.round(((promoters - detractors) / npsTotal) * 100)
      : null;

  return {
    volume: { total, active, closed },
    replyTime: { avgMinutes, p95Minutes, sampleCount: replyMinutes.length },
    resolutionRate,
    csat: {
      thumbsUp,
      thumbsDown,
      total: csatTotal,
      rate: csatRate,
    },
    nps: {
      score: npsScore,
      promoters,
      passives,
      detractors,
      total: npsTotal,
    },
  };
}

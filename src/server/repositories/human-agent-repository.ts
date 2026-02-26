import { prisma } from '@/lib/prisma';

export interface HumanAgentItem {
  id: string;
  tenantId: string;
  userId: string;
  displayName: string | null;
  isAvailable: boolean;
  userEmail: string;
  userName: string;
}

export async function listByTenant(tenantId: string): Promise<HumanAgentItem[]> {
  const rows = await prisma.human_agent.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'asc' },
  });
  if (rows.length === 0) return [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => {
    const u = userMap.get(r.user_id);
    return {
      id: r.id,
      tenantId: r.tenant_id,
      userId: r.user_id,
      displayName: r.display_name,
      isAvailable: r.is_available,
      userEmail: u?.email ?? '',
      userName: u?.name ?? '',
    };
  });
}

export async function add(
  tenantId: string,
  userId: string,
  displayName?: string | null
): Promise<HumanAgentItem | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenant_id: tenantId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;
  const existing = await prisma.human_agent.findUnique({
    where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } },
  });
  if (existing) return listByTenant(tenantId).then((list) => list.find((a) => a.id === existing.id) ?? null);
  const row = await prisma.human_agent.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      display_name: displayName ?? null,
      is_available: false,
    },
  });
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    displayName: row.display_name,
    isAvailable: row.is_available,
    userEmail: user.email,
    userName: user.name,
  };
}

export async function remove(id: string, tenantId: string): Promise<boolean> {
  const deleted = await prisma.human_agent.deleteMany({
    where: { id, tenant_id: tenantId },
  });
  return deleted.count > 0;
}

export async function setAvailability(
  userId: string,
  tenantId: string,
  isAvailable: boolean
): Promise<boolean> {
  const updated = await prisma.human_agent.updateMany({
    where: { user_id: userId, tenant_id: tenantId },
    data: { is_available: isAvailable },
  });
  return updated.count > 0;
}

export async function isHumanAgent(userId: string, tenantId: string): Promise<boolean> {
  const r = await prisma.human_agent.findUnique({
    where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } },
  });
  return !!r;
}

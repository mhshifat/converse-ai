import React from 'react';
import {
  FolderKanban,
  Bot,
  LayoutDashboard,
  MessageSquare,
  Box,
  Sparkles,
  Zap,
  BookOpen,
  Briefcase,
  Code2,
  Globe,
  Heart,
  Home,
  Mail,
  Settings,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Allowed project icon keys (Lucide icon names). */
export const PROJECT_ICON_KEYS = [
  'FolderKanban',
  'Bot',
  'LayoutDashboard',
  'MessageSquare',
  'Box',
  'Sparkles',
  'Zap',
  'BookOpen',
  'Briefcase',
  'Code2',
  'Globe',
  'Heart',
  'Home',
  'Mail',
  'Settings',
  'Star',
] as const;

export type ProjectIconKey = (typeof PROJECT_ICON_KEYS)[number];

const ICON_MAP: Record<ProjectIconKey, LucideIcon> = {
  FolderKanban,
  Bot,
  LayoutDashboard,
  MessageSquare,
  Box,
  Sparkles,
  Zap,
  BookOpen,
  Briefcase,
  Code2,
  Globe,
  Heart,
  Home,
  Mail,
  Settings,
  Star,
};

export function getProjectIcon(iconKey: string | null | undefined): LucideIcon {
  if (iconKey && PROJECT_ICON_KEYS.includes(iconKey as ProjectIconKey)) {
    return ICON_MAP[iconKey as ProjectIconKey];
  }
  return FolderKanban;
}

export function ProjectIcon({
  iconKey,
  logoUrl,
  className,
  size = 20,
}: {
  iconKey: string | null | undefined;
  /** When set, shown instead of the Lucide preset icon. */
  logoUrl?: string | null;
  className?: string;
  size?: number;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote user-uploaded logo URLs
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className={cn('rounded-md object-cover shrink-0', className)}
      />
    );
  }
  const Icon = getProjectIcon(iconKey);
  return <Icon className={className} size={size} />;
}

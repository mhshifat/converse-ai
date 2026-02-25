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
  className,
  size = 20,
}: {
  iconKey: string | null | undefined;
  className?: string;
  size?: number;
}) {
  const Icon = getProjectIcon(iconKey);
  return <Icon className={className} size={size} />;
}

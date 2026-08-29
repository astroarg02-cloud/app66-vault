import React from 'react';
import { 
  Smartphone, Sliders, Folder, Flame, Star, Code, Video,
  Sparkles, Shield, Package, Zap, BookOpen, LucideIcon
} from 'lucide-react';

export const LIST_ICONS_MAP: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  sliders: Sliders,
  folder: Folder,
  flame: Flame,
  star: Star,
  code: Code,
  video: Video,
  sparkles: Sparkles,
  shield: Shield,
  package: Package,
  zap: Zap,
  book: BookOpen,
};

export function getListIcon(iconName?: string): LucideIcon {
  if (!iconName) return Folder;
  return LIST_ICONS_MAP[iconName.toLowerCase()] || Folder;
}

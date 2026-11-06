import React from 'react';
import { Braces, GitCompare, QrCode, ImageIcon, Wrench, Sparkles, Files, type LucideProps } from 'lucide-react';

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  FileCode2: Braces,
  GitCompare,
  QrCode,
  ImageIcon,
  Wrench,
  Sparkles,
  Files,
};

export default function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon aria-hidden="true" {...props} />;
}

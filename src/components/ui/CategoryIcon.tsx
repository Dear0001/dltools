import React from 'react';
import { Braces, Database, GitCompare, QrCode, ImageIcon, Wrench, Sparkles, Files, ShieldCheck, type LucideProps } from 'lucide-react';

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  FileCode2: Braces,
  Database,
  GitCompare,
  QrCode,
  ImageIcon,
  Wrench,
  Sparkles,
  ShieldCheck,
  Files,
};

export default function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon aria-hidden="true" {...props} />;
}

import React from 'react';
import {
  AlignLeft, ArrowLeftRight, BadgeCheck, Binary, Braces, CalendarClock, Clock, Code, Code2, Database,
  FileCode, FileCode2, FileDiff, FileText, Files, Fingerprint, GitCompare, Hash, Image, ImageIcon, Key,
  Link2, LockKeyhole, Minimize2, Network, Palette, PenTool, QrCode, ScanLine, SearchCode, ShieldCheck,
  Sparkles, TableProperties, Terminal, TextCursorInput, Wrench, type LucideProps,
} from 'lucide-react';
import type { Tool } from '@/data/tools';

/**
 * Every icon name used in data/tools.ts. Keep this map complete: a missing
 * entry silently falls back to the generic icon.
 */
const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  AlignLeft, ArrowLeftRight, BadgeCheck, Binary, Braces, CalendarClock, Clock, Code, Code2, Database,
  FileCode, FileCode2, FileDiff, FileText, Files, Fingerprint, GitCompare, Hash, Image, ImageIcon, Key,
  Link2, LockKeyhole, Minimize2, Network, Palette, PenTool, QrCode, ScanLine, SearchCode, ShieldCheck,
  Sparkles, TableProperties, Terminal, TextCursorInput, Wrench,
  FileXml: FileCode2,
};

export function ToolGlyph({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon aria-hidden="true" {...props} />;
}

const SIZES = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 15 },
  md: { box: 'h-10 w-10 rounded-xl', icon: 18 },
  lg: { box: 'h-12 w-12 rounded-xl', icon: 22 },
} as const;

/** Tool icon in its tinted tile. Used by cards, search results, menus and the tool header. */
export default function ToolIcon({ tool, size = 'md', className = '' }: { tool: Pick<Tool, 'icon'>; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center border border-primary/15 bg-primary/10 text-primary ${s.box} ${className}`}>
      <ToolGlyph name={tool.icon} size={s.icon} strokeWidth={1.9} />
    </span>
  );
}

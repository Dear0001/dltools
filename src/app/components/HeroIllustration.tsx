import React from 'react';

/**
 * Animated landing illustration: a JSON hub converting to and from other formats.
 * Pure SVG + CSS (see `.hero-illo-*` in tailwind.css). Loops forever and stops
 * under prefers-reduced-motion. Decorative, so it is hidden from screen readers.
 */

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  glyph: 'pdf' | 'word' | 'doc' | 'sheet' | 'code' | 'image';
};

const CX = 300;
const CY = 220;

const NODES: Node[] = [
  { id: 'pdf', label: 'PDF', x: 105, y: 82, color: '#e5322d', glyph: 'pdf' },
  { id: 'word', label: 'WORD', x: 495, y: 82, color: '#2b5fd9', glyph: 'word' },
  { id: 'docx', label: '.docx', x: 62, y: 220, color: '#3b82f6', glyph: 'doc' },
  { id: 'excel', label: 'EXCEL', x: 538, y: 220, color: '#1f9d55', glyph: 'sheet' },
  { id: 'xml', label: 'XML/CSV', x: 105, y: 358, color: '#0f9f95', glyph: 'code' },
  { id: 'img', label: 'PNG/JPG', x: 495, y: 358, color: '#d9467a', glyph: 'image' },
];

function Glyph({ type }: { type: Node['glyph'] }) {
  const s = { stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round' as const, fill: 'none' };
  switch (type) {
    case 'pdf':
      return <path {...s} d="M-9 6c4-3 8-10 9-16 1 6 5 13 9 16-5-1-13-1-18 0z" />;
    case 'word':
      return <path {...s} d="M-10 -8l4 16 6-12 6 12 4-16" />;
    case 'doc':
      return <path {...s} d="M-9 -8h18M-9 -2h18M-9 4h18M-9 10h11" />;
    case 'sheet':
      return (
        <g {...s} strokeWidth={1.8}>
          <rect x={-10} y={-9} width={20} height={18} rx={1.5} />
          <path d="M-10 -3h20M-10 3h20M-3 -9v18M4 -9v18" />
        </g>
      );
    case 'code':
      return <path {...s} d="M-5 -7l-6 7 6 7M5 -7l6 7-6 7M2 -9l-4 18" />;
    case 'image':
      return (
        <g {...s}>
          <circle cx={5} cy={-5} r={3} fill="#fff" stroke="none" />
          <path d="M-11 9l7-9 5 6 3-3 7 6z" fill="#fff" stroke="none" />
        </g>
      );
  }
}

function FileNode({ node, index }: { node: Node; index: number }) {
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <g className="hero-illo-float" style={{ animationDelay: `${index * -0.9}s` }}>
        {/* soft glow */}
        <rect x={-36} y={-42} width={72} height={84} rx={14} fill={node.color} opacity={0.14} className="hero-illo-glow" style={{ animationDelay: `${index * 0.5}s` }} />
        {/* page with folded corner */}
        <path
          d="M-26 -36h36l16 16v52a6 6 0 0 1-6 6h-46a6 6 0 0 1-6-6v-62a6 6 0 0 1 6-6z"
          fill="var(--surface)"
          stroke={node.color}
          strokeWidth={2}
        />
        <path d="M10 -36v12a4 4 0 0 0 4 4h12" fill="none" stroke={node.color} strokeWidth={2} />
        <rect x={-22} y={-26} width={30} height={28} rx={5} fill={node.color} transform="translate(-1 2)" />
        <g transform="translate(-8 -10)">
          <Glyph type={node.glyph} />
        </g>
        <rect x={-30} y={14} width={60} height={18} rx={5} fill={node.color} />
        <text x={0} y={27} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff" fontFamily="var(--font-sans)" letterSpacing={0.4}>
          {node.label}
        </text>
      </g>
    </g>
  );
}

export default function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg viewBox="0 0 600 440" className="h-auto w-full overflow-visible" role="presentation">
        <defs>
          <radialGradient id="hero-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="hero-json" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
          {NODES.map((n) => (
            <linearGradient key={n.id} id={`hero-line-${n.id}`} gradientUnits="userSpaceOnUse" x1={CX} y1={CY} x2={n.x} y2={n.y}>
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor={n.color} />
            </linearGradient>
          ))}
        </defs>

        {/* connection spokes: faint rail + travelling packets (alternate directions = two-way conversion) */}
        {NODES.map((n, i) => {
          const d = i % 2 === 0 ? `M${CX} ${CY}L${n.x} ${n.y}` : `M${n.x} ${n.y}L${CX} ${CY}`;
          return (
            <g key={`spoke-${n.id}`}>
              <path d={d} stroke={`url(#hero-line-${n.id})`} strokeWidth={3} strokeOpacity={0.22} fill="none" />
              <path d={d} stroke={`url(#hero-line-${n.id})`} strokeWidth={3} strokeDasharray="4 14" fill="none" className="hero-illo-dash" />
              <path
                d={d}
                stroke={n.color}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray="1 400"
                fill="none"
                className="hero-illo-packet"
                style={{ animationDelay: `${i * -0.45}s` }}
              />
            </g>
          );
        })}

        {/* core glow + rotating rings */}
        <circle cx={CX} cy={CY} r={130} fill="url(#hero-core)" className="hero-illo-pulse" />
        <circle cx={CX} cy={CY} r={104} fill="none" stroke="var(--primary)" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="2 10" className="hero-illo-spin" />
        <circle cx={CX} cy={CY} r={88} fill="none" stroke="var(--accent)" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="60 30 10 30" className="hero-illo-spin-rev" />
        <g className="hero-illo-spin-slow">
          <circle cx={CX} cy={CY - 104} r={4} fill="var(--primary)" />
          <circle cx={CX + 104} cy={CY} r={3} fill="var(--accent)" />
          <circle cx={CX - 74} cy={CY + 74} r={3} fill="var(--primary)" opacity={0.7} />
        </g>

        {/* central JSON document */}
        <g className="hero-illo-core">
          <circle cx={CX} cy={CY} r={70} fill="var(--surface)" stroke="url(#hero-json)" strokeWidth={3} />
          <path
            d={`M${CX - 26} ${CY - 40}h34l18 18v56a6 6 0 0 1-6 6h-46a6 6 0 0 1-6-6v-68a6 6 0 0 1 6-6z`}
            fill="none"
            stroke="url(#hero-json)"
            strokeWidth={2.5}
          />
          <path d={`M${CX + 8} ${CY - 40}v12a6 6 0 0 0 6 6h12`} fill="none" stroke="url(#hero-json)" strokeWidth={2.5} />
          <rect x={CX - 46} y={CY - 13} width={92} height={30} rx={8} fill="url(#hero-json)" />
          <text x={CX} y={CY + 8} textAnchor="middle" fontSize={20} fontWeight={800} fill="#fff" fontFamily="var(--font-mono)" letterSpacing={1}>
            JSON
          </text>
        </g>

        {/* sparkles + bits */}
        {[
          [220, 78, 0],
          [380, 70, 0.6],
          [215, 372, 1.2],
          [392, 368, 1.8],
          [300, 40, 2.4],
          [300, 404, 0.3],
        ].map(([x, y, delay]) => (
          <path
            key={`spark-${x}-${y}`}
            d={`M${x} ${y - 6}l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z`}
            fill="var(--accent)"
            className="hero-illo-twinkle"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <text x={190} y={150} fontSize={10} fontFamily="var(--font-mono)" fill="var(--muted-foreground)" className="hero-illo-bits">01101</text>
        <text x={372} y={300} fontSize={10} fontFamily="var(--font-mono)" fill="var(--muted-foreground)" className="hero-illo-bits" style={{ animationDelay: '-1.5s' }}>{'{ }'}</text>
        <text x={385} y={152} fontSize={10} fontFamily="var(--font-mono)" fill="var(--muted-foreground)" className="hero-illo-bits" style={{ animationDelay: '-3s' }}>.xlsx</text>

        {NODES.map((n, i) => (
          <FileNode key={n.id} node={n} index={i} />
        ))}
      </svg>
    </div>
  );
}

import Link from 'next/link';
import React from 'react';
import { PieLogo } from '@/components/Logo';

/* Shared UI primitives for CivicPie.
   Visual output matches the pre-existing one-off styles 1:1 —
   these are extractions, not redesigns. Brand: navy #001B3D,
   red #C41230, gold #E8A030 (see globals.css --cp-* tokens). */

// ─── Card ─────────────────────────────────────────────────────
export function Card({
  children,
  dark = false,
  hover = false,
  accent = false,
  className = '',
  ...rest
}: {
  children: React.ReactNode;
  dark?: boolean;
  hover?: boolean;
  accent?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const cls = [
    dark ? 'card-dark' : 'card',
    hover ? 'card-hover' : '',
    accent ? 'card-accent' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────
const BADGE_CLASSES: Record<string, string> = {
  navy: 'badge-navy',
  red: 'badge-red',
  gold: 'badge-gold',
  green: 'badge-green',
  cream: 'badge-cream',
  blue: 'badge-blue',
  purple: 'badge-purple',
  dem: 'badge-dem',
  rep: 'badge-rep',
  ind: 'badge-ind',
};

export function Badge({
  children,
  variant = 'navy',
  className = '',
}: {
  children: React.ReactNode;
  variant?: keyof typeof BADGE_CLASSES;
  className?: string;
}) {
  return <span className={`badge ${BADGE_CLASSES[variant]} ${className}`}>{children}</span>;
}

export function partyBadgeVariant(party?: string | null): keyof typeof BADGE_CLASSES {
  const p = (party || '').toLowerCase();
  if (p.startsWith('dem')) return 'dem';
  if (p.startsWith('rep')) return 'rep';
  if (p) return 'ind';
  return 'navy';
}

// ─── Stat ─────────────────────────────────────────────────────
export function Stat({
  value,
  label,
  color,
  size = 32,
  card = false,
  dark = false,
  labelFirst = false,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  color?: string;
  size?: number;
  card?: boolean;
  dark?: boolean;
  labelFirst?: boolean;
}) {
  const valueEl = (
    <div className="stat-value" style={{ color, fontSize: size }}>
      {value}
    </div>
  );
  const labelEl = (
    <div className="stat-label" style={dark ? { color: 'rgba(255,255,255,0.65)' } : undefined}>
      {label}
    </div>
  );
  const inner = labelFirst ? (
    <>
      {labelEl}
      {valueEl}
    </>
  ) : (
    <>
      {valueEl}
      {labelEl}
    </>
  );
  if (card) return <div className="stat-card">{inner}</div>;
  return <div className="stat">{inner}</div>;
}

// ─── Alert / Notice ───────────────────────────────────────────
export function Alert({
  title,
  children,
  variant = 'navy',
  dark = false,
  icon,
  className = '',
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'navy' | 'red' | 'gold' | 'green';
  dark?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`alert alert-${variant}${dark ? ' alert-dark' : ''} ${className}`}>
      {icon && <div className="flex-shrink-0 text-xl leading-none mt-0.5">{icon}</div>}
      <div className="min-w-0">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-body">{children}</div>
      </div>
    </div>
  );
}

// ─── TextInput / Select / Label ───────────────────────────────
export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { dark?: boolean }
) {
  const { dark, className = '', ...rest } = props;
  return <input className={`input${dark ? ' input-dark' : ''} ${className}`} {...rest} />;
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { dark?: boolean }
) {
  const { dark, className = '', children, ...rest } = props;
  return (
    <select className={`input select${dark ? ' input-dark' : ''} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="label">{children}</label>;
}

// ─── DataTable ────────────────────────────────────────────────
export function DataTable({
  columns,
  rows,
  dark = false,
  className = '',
}: {
  columns: React.ReactNode[];
  rows: React.ReactNode[][];
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={className} style={{ overflowX: 'auto' }}>
      <table className={`data-table${dark ? ' data-table-dark' : ''}`}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────
export function EmptyState({
  icon = '🔍',
  title,
  body,
  action,
  dark = false,
  titleClassName = '',
  bodyClassName = '',
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  dark?: boolean;
  titleClassName?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`empty-state${dark ? ' empty-state-dark' : ''}`}>
      <div className="empty-state-icon">{icon}</div>
      <h3 className={`font-display text-xl font-bold mb-2 text-navy ${titleClassName}`} style={dark ? { color: '#fff' } : undefined}>
        {title}
      </h3>
      {body && (
        <p className={`font-body text-[15px] leading-relaxed mb-6 text-stone ${bodyClassName}`} style={dark ? { color: 'rgba(255,255,255,0.5)' } : undefined}>
          {body}
        </p>
      )}
      {action}
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────
export function Breadcrumb({
  items,
}: {
  items: { label: React.ReactNode; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb mb-6">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
export function Skeleton({
  width = '100%',
  height = 16,
  dark = false,
  className = '',
  style,
}: {
  width?: string | number;
  height?: string | number;
  dark?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton${dark ? ' skeleton-dark' : ''} ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

// ─── SearchRow (content-page search form) ─────────────────────
export function SearchRow({
  value,
  onChange,
  onSubmit,
  placeholder,
  buttonLabel,
  loading,
  loadingLabel,
  dark = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  buttonLabel: string;
  loading?: boolean;
  loadingLabel?: string;
  dark?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="search-row"
    >
      <TextInput
        dark={dark}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-primary flex-shrink-0 disabled:opacity-50 whitespace-nowrap"
        style={{ padding: '12px 24px' }}
      >
        {loading ? loadingLabel || 'Searching…' : buttonLabel}
      </button>
    </form>
  );
}

// ─── SearchPill (hero-style pill search) ──────────────────────
export function SearchPill({
  value,
  onChange,
  onSubmit,
  placeholder,
  buttonLabel,
  loading,
  loadingLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  buttonLabel: string;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="search-pill"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-red text-white font-display text-[13px] font-bold py-3 px-[22px] rounded-full tracking-[0.3px] hover:bg-red-hover transition-all flex-shrink-0 disabled:opacity-70"
        style={{ boxShadow: 'var(--cp-shadow-red)' }}
      >
        {loading ? loadingLabel || 'Looking up…' : buttonLabel}
      </button>
    </form>
  );
}

// ─── OfficialRow (directory pattern) ─────────────────────────
export function OfficialRow({
  name,
  meta,
  light = false,
  avatar,
}: {
  name: React.ReactNode;
  meta?: React.ReactNode;
  light?: boolean;
  avatar?: React.ReactNode;
}) {
  return (
    <div className={`official-row${light ? ' official-row-light' : ''}`}>
      <div className="official-avatar">{avatar || '👤'}</div>
      <div className="min-w-0">
        <div
          className="font-display text-[14px] font-bold truncate"
          style={{ color: light ? 'var(--cp-navy)' : '#fff' }}
        >
          {name}
        </div>
        {meta && (
          <div
            className="font-body text-[12px] truncate"
            style={{ color: light ? 'var(--cp-stone)' : 'rgba(255,255,255,0.45)' }}
          >
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SectionHeader (eyebrow + heading + body) ─────────────────
export function SectionHeader({
  eyebrow,
  heading,
  body,
  dark = false,
  align = 'left',
  eyebrowColor,
}: {
  eyebrow?: React.ReactNode;
  heading: React.ReactNode;
  body?: React.ReactNode;
  dark?: boolean;
  align?: 'left' | 'center';
  eyebrowColor?: string;
}) {
  return (
    <div className={align === 'center' ? 'text-center' : ''} style={align === 'center' ? { margin: '0 auto' } : undefined}>
      {eyebrow && (
        <p className="section-eyebrow" style={{ color: eyebrowColor, textAlign: align }}>
          {eyebrow}
        </p>
      )}
      <h2
        className="section-heading"
        style={dark ? { color: '#fff' } : undefined}
      >
        {heading}
      </h2>
      {body && (
        <p className="section-body" style={dark ? { color: 'rgba(255,255,255,0.5)' } : undefined}>
          {body}
        </p>
      )}
    </div>
  );
}

// ─── AuthCard (signin/signup shell) ───────────────────────────
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[20px] border border-gray-200 p-10 shadow-sm max-sm:p-6">
      <div className="flex items-center gap-3 mb-8">
        <BrandLockup size={28} />
      </div>
      {children}
    </div>
  );
}

export function BrandLockup({ size = 26, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <>
      <PieLogo size={size} />
      <div>
        <div
          className="font-display text-2xl font-black tracking-[-0.5px] leading-none"
          style={{ color: dark ? '#fff' : 'var(--cp-navy)' }}
        >
          Civic<span style={{ color: 'var(--cp-red)' }}>Pie</span>
        </div>
        <div
          className="font-display text-[7px] font-bold tracking-[2px] uppercase mt-0.5"
          style={{ color: dark ? 'rgba(255,255,255,0.55)' : 'var(--cp-stone)' }}
        >
          Hyperlocal Civic Engagement
        </div>
      </div>
    </>
  );
}

// ─── InfoCard (eyebrow + title + body, dark) ────────────────────
export function InfoCard({
  eyebrow,
  title,
  children,
  className = '',
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 ${className}`}>
      <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-gold mb-2">
        {eyebrow}
      </div>
      <h3 className="font-display text-lg font-bold text-white mb-2">{title}</h3>
      {children}
    </div>
  );
}

// ─── ErrorNotice (form error box) ─────────────────────────────
export function ErrorNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-3 mb-6 text-sm font-medium"
      style={{
        background: 'rgba(196,18,48,0.06)',
        border: '1px solid rgba(196,18,48,0.2)',
        color: 'var(--cp-red)',
      }}
    >
      {children}
    </div>
  );
}

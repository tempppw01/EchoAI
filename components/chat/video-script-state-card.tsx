'use client';

import { AlertCircle, Inbox, LoaderCircle, Sparkles } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type VideoScriptStateCardProps = {
  variant: 'empty' | 'loading' | 'error';
  title: string;
  description: string;
  tips?: string[];
  action?: ReactNode;
  compact?: boolean;
};

const variantConfig = {
  empty: {
    icon: Inbox,
    wrapper: 'border-border bg-surface-soft',
    iconWrap: 'border-border bg-muted text-muted-foreground',
  },
  loading: {
    icon: LoaderCircle,
    wrapper: 'border-primary/20 bg-primary/5',
    iconWrap: 'border-primary/20 bg-primary/10 text-primary',
  },
  error: {
    icon: AlertCircle,
    wrapper: 'border-danger/30 bg-danger/5',
    iconWrap: 'border-danger/30 bg-danger/10 text-danger',
  },
} as const;

export function VideoScriptStateCard({ variant, title, description, tips = [], action, compact = false }: VideoScriptStateCardProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-xl border p-4 md:p-5', config.wrapper, compact && 'p-3 md:p-4')}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', config.iconWrap, compact && 'h-9 w-9')}>
          <Icon size={18} className={variant === 'loading' ? 'animate-spin' : ''} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
            {variant === 'loading' && <Sparkles size={14} className="text-primary animate-pulse" />}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          {tips.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-[2px] text-primary">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
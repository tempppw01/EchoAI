import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 空状态组件。
 * 主内容区在没有任何数据时不应是一片空白 —— 它应当告诉用户这里能做什么。
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-soft/40 text-center',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12',
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs">
        <Icon size={18} />
      </span>
      <div className="max-w-md">
        <p className={cn('font-medium text-foreground', compact ? 'text-sm' : 'text-base')}>{title}</p>
        {description ? (
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 统一的卡片语言。
 * 全项目只允许使用这一套圆角 / 描边 / 阴影，避免同屏出现多种卡片风格。
 */

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** 卡片内边距，默认 md */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** 是否使用悬浮高亮 */
  interactive?: boolean;
};

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-2.5',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ className, padding = 'md', interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-xs',
        interactive && 'cursor-pointer transition-colors hover:border-primary/30 hover:bg-surface-soft',
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-border px-4 py-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-sm font-semibold tracking-tight text-foreground', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs leading-5 text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-border px-4 py-3', className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

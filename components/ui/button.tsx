import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'tint';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'pill';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border border-primary bg-primary text-white shadow-sm hover:brightness-[1.03]',
  secondary: 'border border-border bg-background/82 text-foreground shadow-sm hover:bg-muted/60',
  ghost: 'border border-transparent bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground',
  subtle: 'border border-transparent bg-muted/60 text-foreground hover:bg-muted',
  danger: 'border border-red-500/70 bg-red-500 text-white shadow-sm hover:brightness-[1.03]',
  tint: 'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-lg px-3 text-xs',
  md: 'h-9 rounded-xl px-3.5 text-sm',
  lg: 'h-11 rounded-2xl px-4.5 text-sm',
  icon: 'h-9 w-9 rounded-xl p-0',
  'icon-sm': 'h-8 w-8 rounded-lg p-0',
  pill: 'h-8 rounded-full px-3 text-xs',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({ className, size = 'md', variant = 'primary', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
}

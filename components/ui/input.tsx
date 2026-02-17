import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return <input ref={ref} {...props} className={cn('w-full rounded-md border bg-card px-3 py-2 text-sm', props.className)} />;
});

import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../lib/utils';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white border border-vimeo-border rounded-2xl p-5 shadow-sm', className)} {...props} />
);

export const Button = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      'rounded-xl bg-vimeo-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50',
      className
    )}
    {...props}
  />
);

export const PageShell = ({ children }: PropsWithChildren) => (
  <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">{children}</main>
);

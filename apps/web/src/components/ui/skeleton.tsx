import type { HTMLAttributes } from 'react';

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

type SkeletonTextProps = {
  lines?: number;
  className?: string;
};

type SkeletonCardProps = {
  className?: string;
};

type SkeletonListProps = {
  items?: number;
  className?: string;
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={joinClasses('animate-pulse rounded-md bg-zinc-800/70', className)} {...props} />;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={joinClasses('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className={joinClasses('h-3', index === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={joinClasses('rounded-xl border border-zinc-800 bg-zinc-950/70 p-4', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

export function SkeletonList({ items = 4, className }: SkeletonListProps) {
  return (
    <div className={joinClasses('space-y-2', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

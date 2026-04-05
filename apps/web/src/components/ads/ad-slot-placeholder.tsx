'use client';

import { useEffect, useRef, useState } from 'react';

type AdSlotPlaceholderProps = {
  slotId: string;
  label?: string;
  minHeight?: number;
  className?: string;
};

const adPlaceholdersEnabled = process.env.NEXT_PUBLIC_ENABLE_AD_PLACEHOLDERS === 'true';

export function AdSlotPlaceholder({ slotId, label = 'Reklam alanı (yakında)', minHeight = 140, className = '' }: AdSlotPlaceholderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!adPlaceholdersEnabled) {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!adPlaceholdersEnabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-label={label}
      data-ad-slot={slotId}
      className={`rounded-xl border border-zinc-800/80 bg-zinc-900/40 ${className}`}
      style={{ minHeight }}
    >
      {isVisible ? (
        <div className="flex h-full min-h-[inherit] items-center justify-center rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-center text-xs uppercase tracking-wide text-zinc-500">
          {label}
        </div>
      ) : (
        <div className="h-full min-h-[inherit]" aria-hidden="true" />
      )}
    </div>
  );
}

type MobileAnchorAdPlaceholderProps = {
  slotId: string;
};

export function MobileAnchorAdPlaceholder({ slotId }: MobileAnchorAdPlaceholderProps) {
  if (!adPlaceholdersEnabled) {
    return null;
  }

  return (
    <>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-5xl border-t border-zinc-800 bg-zinc-950/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        <AdSlotPlaceholder slotId={slotId} label="Mobil anchor reklam alanı (yakında)" minHeight={56} />
      </div>
    </>
  );
}
